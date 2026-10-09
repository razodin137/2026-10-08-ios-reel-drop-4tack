/* Rough Cut — cues: ruler-anchored markers with their own drag & panel. */

import { $, svgEl, fmtClock, uid } from "./helpers.js"
import { state, minTap, barPos } from "./state.js"
import { saveCues } from "./storage.js"
import { rulerH } from "./timeline.js"
import { openView, closeView } from "./panels.js"

export function cueById(id){ return state.cues.find(c => c.id === id) }
const cueX = c => "translate(" + (c.pos * state.zoom) + ",0)"
// a cue was a 16px div with ::before/::after pseudo-elements — a stem and a rotated square.
// SVG has no pseudo-elements, so both become real children, and the stem/diamond are the
// same 16px wide as before while the .hit rect underneath can be 44px on a phone.
export function renderCues(){
  const wrap = $("#cueSvg")
  wrap.innerHTML = ""
  for (const c of state.cues){
    const d = svgEl("g", "cue")
    d.dataset.id = c.id
    d.setAttribute("transform", cueX(c))
    if (state.selectedCueId === c.id) d.classList.add("selected")
    const ti = svgEl("title")
    ti.textContent = cueTitle(c)
    const pad = Math.max(0, (minTap() - 16) / 2)
    const hit = svgEl("rect", "hit")
    hit.setAttribute("x", -(8 + pad)); hit.setAttribute("y", 0)
    hit.setAttribute("width", 16 + pad * 2); hit.setAttribute("height", rulerH())
    const stem = svgEl("path", "stem")
    stem.setAttribute("d", "M0 18V" + rulerH())
    const dia = svgEl("rect", "dia")
    dia.setAttribute("x", -6); dia.setAttribute("y", 3)
    dia.setAttribute("width", 12); dia.setAttribute("height", 12)
    dia.setAttribute("transform", "rotate(45 0 9)")
    d.appendChild(ti); d.appendChild(hit); d.appendChild(stem); d.appendChild(dia)
    attachCueEvents(d, c)
    wrap.appendChild(d)
  }
}
function cueTitle(c){
  const bits = [ fmtClock(c.pos) ]
  const bp = barPos(c.pos)
  if (bp) bits.push("bar " + bp)
  if (c.name) bits.push(c.name)
  return bits.join(" · ")
}
export function syncCueDom(c){
  const d = $('#cueSvg .cue[data-id="' + c.id + '"]')
  if (d) d.querySelector("title").textContent = cueTitle(c)
}
function attachCueEvents(d, c){
  let px0 = 0, p0 = 0, moved = false, dragging = false
  d.addEventListener("pointerdown", e => {
    if (e.button !== 0) return
    e.stopPropagation()
    px0 = e.clientX; p0 = c.pos; moved = false; dragging = true
    try { d.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  })
  d.addEventListener("pointermove", e => {
    if (!dragging) return
    const dx = e.clientX - px0
    if (Math.abs(dx) > 3) moved = true
    if (moved){
      c.pos = Math.max(0, p0 + dx / state.zoom)
      d.setAttribute("transform", cueX(c))
    }
  })
  d.addEventListener("pointerup", () => {
    dragging = false
    if (moved){ saveCues(); renderCues(); refreshViewIfCue() }
    else selectCue(c.id)
  })
  d.addEventListener("pointercancel", () => { dragging = false })
}
export function selectCue(id){
  state.selectedId = null
  document.querySelectorAll(".bar.selected").forEach(b => b.classList.remove("selected"))
  state.selectedCueId = id
  renderCues()
  openView()
}
export function refreshViewIfCue(){
  const c = cueById(state.selectedCueId)
  if (!c || !$("#viewOvl").classList.contains("open")) return
  const pos = $("#vPos")
  if (pos) pos.value = c.pos.toFixed(2)
  const meta = $("#vMeta")
  if (meta) meta.textContent = fmtClock(c.pos) + (barPos(c.pos) ? " · bar " + barPos(c.pos) : "")
}

export function addCue(pos){
  const c = { id: uid(), pos: Math.max(0, pos), name: "", notes: "" }
  state.cues.push(c)
  state.cues.sort((a, b) => a.pos - b.pos)
  saveCues()
  renderCues()
  selectCue(c.id)
  return c
}
export function deleteCue(id){
  const i = state.cues.findIndex(c => c.id === id)
  if (i < 0) return
  state.cues.splice(i, 1)
  if (state.selectedCueId === id) state.selectedCueId = null
  saveCues()
  renderCues()
  closeView()
}
