/* Rough Cut — timeline layout, bars, gutter and ruler.
   RULERH is module-local and REBOUND by applyMetrics(): the ruler doubles as
   the seek surface, so its height is the one metric that follows the pointer
   (34px fine / 48px coarse) and is republished as --rulerh. */

import { $, el, svgEl, fmtClock } from "./helpers.js"
import { ROWH, BARH, LANES, state, coarse, minTap, barPos } from "./state.js"
import { scheduleRefresh } from "./waveforms.js"
import { deliveredExt } from "./exportSession.js"
import { attachBarEvents } from "./drag.js"
import { renderCues } from "./cues.js"
import { syncMenu } from "./menu.js"
import { renderSave } from "./saveFolder.js"

let RULERH = 34
export const rulerH = () => RULERH

function applyMetrics(){
  RULERH = coarse() ? 48 : 34
  document.documentElement.style.setProperty("--rulerh", RULERH + "px")
}
export function syncMetrics(){ applyMetrics(); refresh() }

function layout(){
  // greedy lane packing: each take lands in the first lane with no overlap
  const sorted = [ ...state.takes ].sort((a, b) => a.start - b.start)
  const ends = []
  for (const t of sorted){
    let l = 0
    while (l < ends.length && t.start < ends[l]) l++
    t.lane = l; ends[l] = t.start + t.duration
  }
  state.lanes = Math.max(6, ends.length)
  const tl = $("#tl")
  const minSec = tl ? tl.clientWidth / state.zoom : 30
  state.contentSec = Math.max(contentEnd() + 30, minSec)
  state.contentPx = Math.ceil(state.contentSec * state.zoom)
}
const contentH = () => RULERH + state.lanes * ROWH + 20
function renderAll(){
  const c = $("#content")
  c.style.width = state.contentPx + "px"
  c.style.height = contentH() + "px"
  const lanes = $("#laneSvg")
  for (const t of state.takes) lanes.appendChild(barEl(t))
  $("#empty").style.display = state.takes.length ? "none" : "flex"
  renderCues()
  renderGutter()
  syncMenu()
  renderSave()
  sizeRuler(); drawRuler(); syncPlayheadUI(state.playhead)
}
export function refresh(){ layout(); renderAll() }

/* ---------- gutter & metrics ---------- */
// the frozen gutter: one cell per lane at barEl's exact pitch (ROWH tall, 7px inset), so
// each swatch lands on its lane's bar band whatever the zoom
function renderGutter(){
  const inner = $("#gutterLanesInner")
  inner.innerHTML = ""
  for (let i = 0; i < state.lanes; i++){
    const cell = el("li", "g-cell")
    const sw = el("span", "g-sw")
    sw.setAttribute("aria-hidden", "true")
    sw.style.setProperty("--lane", LANES[i % LANES.length].c)
    const lab = el("span", "g-lab")
    lab.textContent = String(i + 1)
    cell.appendChild(sw); cell.appendChild(lab)
    inner.appendChild(cell)
  }
  syncGutter()
}
// #tl is the only scroll container; the gutter's lane rows ride its vertical scroll
export function syncGutter(){ $("#gutterLanesInner").style.transform = "translateY(" + -$("#tl").scrollTop + "px)" }

// one bar, as a <g> in #laneSvg. The visual width and the waveform width are the same
// variable now, so they can no longer disagree; the padded .hit rect is the only target,
// which is what lets a 16px bar still be tappable.
const barW = t => Math.max(16, t.duration * state.zoom)
export const barTop = t => RULERH + t.lane * ROWH + 7
const barXform = t => "translate(" + (t.start * state.zoom) + "," + barTop(t) + ")"
export function barEl(t){
  const lane = LANES[t.lane % LANES.length], w = barW(t)
  const b = svgEl("g", "bar")
  b.dataset.id = t.id
  b.setAttribute("transform", barXform(t))
  b.style.setProperty("--lane", lane.c)
  b.style.setProperty("--lane-h", lane.h)
  if (t.kind === "video") b.classList.add("video")
  if (state.selectedId === t.id) b.classList.add("selected")
  if (w < 72) b.classList.add("tiny")
  const ti = svgEl("title")
  ti.textContent = t.name + " · " + barMeta(t)
  b.appendChild(ti)
  const pad = Math.max(0, (minTap() - w) / 2)          // grow the target, not the bar
  const hit = svgEl("rect", "hit")
  hit.setAttribute("x", -pad); hit.setAttribute("y", -7)
  hit.setAttribute("width", w + pad * 2); hit.setAttribute("height", ROWH)
  b.appendChild(hit)
  const sh = svgEl("rect", "sh")                       // the hard shadow, drawn only when selected
  sh.setAttribute("x", 4); sh.setAttribute("y", 4)
  sh.setAttribute("width", w); sh.setAttribute("height", BARH)
  b.appendChild(sh)
  const body = svgEl("rect", "body")
  body.setAttribute("width", w); body.setAttribute("height", BARH)
  b.appendChild(body)
  const wave = svgEl("path", "wave")
  b.appendChild(wave); drawWave(t, wave)
  // text can't ellipsize in SVG, so it's clipped to the box — the clip stops short of the
  // duration column, which is what used to let .tdur paint straight over the name
  const clip = svgEl("clipPath"); clip.id = clipId(t)
  const cr = svgEl("rect")
  cr.setAttribute("x", 8); cr.setAttribute("y", 0)
  cr.setAttribute("width", Math.max(0, w - 16 - (w < 72 ? 0 : 44))); cr.setAttribute("height", BARH)
  clip.appendChild(cr); b.appendChild(clip)
  const txt = svgEl("g"); txt.setAttribute("clip-path", "url(#" + clipId(t) + ")")
  const nm = svgEl("text", "tname"); nm.setAttribute("x", 8); nm.setAttribute("y", 14)
  const me = svgEl("text", "tmeta"); me.setAttribute("x", 8); me.setAttribute("y", BARH - 6)
  txt.appendChild(nm); txt.appendChild(me); b.appendChild(txt)
  const du = svgEl("text", "tdur")
  du.setAttribute("x", w - 8); du.setAttribute("y", 14); du.setAttribute("text-anchor", "end")
  b.appendChild(du)
  attachBarEvents(b, t)
  t.el = b
  updateBarText(t)
  return b
}
const clipId = t => "barclip-" + t.id
function barMeta(t){
  const bits = []
  if (t.bpm) bits.push(t.bpm + " bpm")
  if (t.key) bits.push(t.key)
  const bp = barPos(t.start)
  if (bp) bits.push("bar " + bp)
  if (t.tags && t.tags.length) bits.push(t.tags.map(x => "#" + x).join(" "))
  if (t.keep) bits.push("keep")
  bits.push(t.kind + "." + deliveredExt(t))
  return bits.join(" · ")
}
// the one place a bar re-reads its take: geometry first (a decode refines duration, and the
// bar's width follows it), then text. Everything that used to be a style.left/width pair is
// an attribute now, so the box and the waveform can't disagree about how wide they are.
export function updateBarText(t){
  const b = t.el
  if (!b) return
  const w = barW(t), tiny = w < 72, pad = Math.max(0, (minTap() - w) / 2)
  b.setAttribute("transform", barXform(t))
  b.classList.toggle("tiny", tiny)
  const hit = b.querySelector(".hit")
  hit.setAttribute("x", -pad)
  hit.setAttribute("width", w + pad * 2)
  hit.setAttribute("height", ROWH)
  b.querySelectorAll(".sh, .body").forEach(r => r.setAttribute("width", w))
  b.querySelector("clipPath rect").setAttribute("width", Math.max(0, w - 16 - (tiny ? 0 : 44)))
  const du = b.querySelector(".tdur")
  du.setAttribute("x", w - 8)
  du.textContent = fmtClock(t.duration)
  b.querySelector(".tname").textContent = t.name
  b.querySelector(".tmeta").textContent = barMeta(t)
  b.querySelector("title").textContent = t.name + " · " + barMeta(t)
  const wave = b.querySelector(".wave"), sig = w + ":" + (t.peaks ? t.peaks.length : 0)
  if (wave.dataset.sig !== sig){ wave.dataset.sig = sig; drawWave(t, wave) }
}
// the waveform is one filled envelope, not a run of 1.4px bars: peaks are per-bucket maxima
// at ~60/s, so a column every 2px already out-resolves the source. The 800-column cap is a
// budget on the path string — at zoom 200 a long take would otherwise emit tens of
// thousands of nodes into one `d` attribute.
function drawWave(t, path){
  const w = barW(t), mid = BARH / 2
  if (!t.peaks){
    path.classList.add("flat")
    path.setAttribute("d", "M0 " + (mid - 1) + "H" + w.toFixed(1) + "V" + (mid + 1) + "H0Z")
    return
  }
  path.classList.remove("flat")
  const n = t.peaks.length, cols = Math.max(8, Math.min(800, Math.round(w / 2)))
  const top = [], bot = []
  for (let i = 0; i < cols; i++){
    const p = t.peaks[Math.min(n - 1, Math.floor(i / cols * n))]
    const bh = Math.max(1, p * (BARH - 10)) / 2, x = +(i / (cols - 1) * w).toFixed(1)
    top.push(x + " " + (mid - bh).toFixed(1))
    bot.push(x + " " + (mid + bh).toFixed(1))
  }
  path.setAttribute("d", "M" + top.join("L") + "L" + bot.reverse().join("L") + "Z")
}

/* ---------- ruler ---------- */
// the ruler is the one sticky layer: rulerWrap keeps its box and stays pinned, and the svg
// inside it is sized to the scrollport — not to the content — because ticks are redrawn
// against scrollLeft on every scroll rather than scrolled.
export function sizeRuler(){
  const tl = $("#tl"), w = tl.clientWidth
  const svg = $("#rulerSvg")
  $("#rulerWrap").style.width = w + "px"
  svg.setAttribute("width", w)
  svg.setAttribute("height", RULERH)
}
const rulerLabels = []
export function drawRuler(){
  const tl = $("#tl"), w = tl.clientWidth, svg = $("#rulerSvg")
  svg.setAttribute("width", w); svg.setAttribute("height", RULERH)
  const off = tl.scrollLeft, z = state.zoom
  const steps = [ 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200 ]
  const step = steps.find(s => s * z >= 72) || 1200
  const first = Math.max(0, Math.floor(off / z / step) * step)
  const ticks = [], labels = []
  for (let s = first; s * z <= off + w; s += step){
    const x = +(s * z - off).toFixed(1)
    ticks.push("M" + (x + .5) + " " + (RULERH - 8) + "V" + (RULERH - 1))
    labels.push([ x + 4, fmtClock(s) ])
  }
  // bar ticks along the bottom edge when the session has a bpm (taller every 4 bars)
  const bars = []
  if (state.session.bpm){
    const barSec = 240 / state.session.bpm
    for (let b = Math.max(1, Math.floor(off / z / barSec)); b * barSec * z <= off + w; b++){
      const x = +(b * barSec * z - off).toFixed(1)
      bars.push("M" + (x + .5) + " " + (RULERH - ((b - 1) % 4 === 0 ? 7 : 4)) + "V" + (RULERH - 1))
    }
  }
  $("#rTicks").setAttribute("d", ticks.join("") || "M0 0")
  $("#rBars").setAttribute("d", bars.join("") || "M0 0")
  // labels are pooled: this runs on every scroll event, so node churn has to stay at zero
  const g = $("#rLabels")
  while (rulerLabels.length < labels.length){
    const t = svgEl("text", "lb")
    g.appendChild(t); rulerLabels.push(t)
  }
  rulerLabels.forEach((t, i) => {
    const l = labels[i]
    if (!l){ t.style.display = "none"; return }
    t.style.display = ""
    t.setAttribute("x", l[0]); t.setAttribute("y", 14)
    t.textContent = l[1]
  })
}
