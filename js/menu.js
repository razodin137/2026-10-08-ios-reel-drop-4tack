/* Rough Cut — overlays: the session menu and its widgets. */

import { $, el, clamp } from "./helpers.js"
import { state } from "./state.js"
import { saveSessionMeta } from "./session.js"
import { renderMasthead, onBpmChange } from "./session.js"
import { canSaveToFolder } from "./saveFolder.js"

export const ovlIsOpen = s => $(s).classList.contains("open")
export function openOvl(s){
  const o = $(s)
  clearTimeout(o._t)
  o.classList.remove("closing")
  o.classList.add("open")
  o.setAttribute("aria-hidden", "false")
  $(s + " .panel").focus({ preventScroll: true })
}
export function closeOvl(s, after){
  const o = $(s)
  if (!ovlIsOpen(s)) return
  o.classList.add("closing")
  clearTimeout(o._t)
  o._t = setTimeout(() => {
    o.classList.remove("open", "closing")
    o.setAttribute("aria-hidden", "true")
    if (after) after()
  }, 170)
}
export function openMenu(){
  syncMenu()
  openOvl("#menuOvl")
  document.body.classList.add("menu-open")
  $("#burger").setAttribute("aria-expanded", "true")
}
// `after` runs once the close has settled, for actions that move to another page: the menu
// scrim must be gone before the target page takes focus, or it steals it back
export function closeMenu(after){
  closeOvl("#menuOvl", () => {
    document.body.classList.remove("menu-open")
    $("#burger").setAttribute("aria-expanded", "false")
    if (after) after()
    else $("#burger").focus({ preventScroll: true })
  })
}
// open the menu already scrolled to bpm or key — shared by the masthead chips and the
// gutter corner chips, which is why both carry data-sec rather than ids
export function openMetaSec(sec){
  openMenu()
  const anchor = sec === "bpm" ? $("#bpmVal") : $("#keyMajor")
  anchor.closest(".m-sec").scrollIntoView({ block: "nearest" })
}
export function syncMenu(){
  const s = state.session
  $("#bpmVal").textContent = s.bpm ? String(s.bpm) : "\u2014"
  $("#mTags").value = (s.tags || []).join(", ")
  $("#mNotes").value = s.notes || ""
  const has = state.takes.length > 0
  for (const b of [ $("#mExport"), $("#mRender") ]){
    b.disabled = !has
    b.title = has ? "" : "record something first"
  }
  // stay enabled without the folder API, so the page can explain itself rather than the
  // feature vanishing unexplained
  $("#mSave").disabled = !has
  $("#mSave").title = !has ? "record something first"
    : canSaveToFolder() ? "" : "this browser can't write into a folder"
  document.querySelectorAll(".keygrid button").forEach(b => {
    b.classList.toggle("on", !!s.key && b.dataset.key === s.key)
  })
}
export function bpmStep(d){
  state.session.bpm = clamp((state.session.bpm ?? 120) + d, 20, 300)
  saveSessionMeta(); syncMenu(); renderMasthead(); onBpmChange()
}
export function setKey(k){
  state.session.key = state.session.key === k ? "" : k
  saveSessionMeta(); syncMenu(); renderMasthead()
}
const ROOTS = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ]
export function buildKeyGrids(){
  for (const [ wrap, suffix ] of [ [ $("#keyMajor"), "" ], [ $("#keyMinor"), "m" ] ]){
    for (const r of ROOTS){
      const b = el("button")
      b.type = "button"
      b.dataset.key = r + suffix
      b.textContent = r + suffix
      b.addEventListener("click", () => setKey(b.dataset.key))
      wrap.appendChild(b)
    }
  }
}
// press-and-hold repeat for the bpm stepper
export function holdable(btn, fn){
  let t = 0, iv = 0
  const stop = () => { clearTimeout(t); clearInterval(iv); t = iv = 0 }
  btn.addEventListener("pointerdown", e => {
    if (e.button !== 0 || btn.disabled) return
    fn()
    t = setTimeout(() => { iv = setInterval(fn, 70) }, 420)
  })
  for (const ev of [ "pointerup", "pointerleave", "pointercancel" ]) btn.addEventListener(ev, stop)
}
// keep keyboard focus inside an open overlay panel
export function trapFocus(panel){
  panel.addEventListener("keydown", e => {
    if (e.key !== "Tab") return
    const f = [ ...panel.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])') ]
      .filter(x => !x.disabled && x.offsetParent !== null)
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
  })
}
