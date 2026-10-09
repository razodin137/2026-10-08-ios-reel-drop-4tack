/* Rough Cut — bar drag & select (mouse), and shared bar geometry.
   touch.js owns the touch path; this owns the pointer path. */

import { $, fmtTime } from "./helpers.js"
import { ROWH, state } from "./state.js"
import { rulerH, barTop } from "./timeline.js"
import { idbPutTake } from "./storage.js"
import { refresh, updateTimeReadout } from "./timeline.js"
import { select } from "./panels.js"
import { endHold, holdStart, beginPick, hasPick } from "./touch.js"

export const barXform2 = t => "translate(" + (t.start * state.zoom) + "," + barTop(t) + ")"

export function attachBarEvents(b, t){
  let px0 = 0, s0 = 0, moved = false, dragging = false, liftPress = false
  b.addEventListener("pointerdown", e => {
    if (e.button !== 0) return
    if (e.ctrlKey || e.metaKey){                                  // the lift owns this press:
      liftPress = true; e.stopPropagation(); return               // no retime, no select
    }
    liftPress = false
    moved = false; dragging = false
    if (e.pointerType === "touch"){
      // no pointer capture and no preventDefault: the finger has to stay free to pan, since a
      // quick drag on a take is the phone's way of moving the timeline
      e.stopPropagation()
      holdStart(e, () => beginPick(b, t, e))
      return
    }
    px0 = e.clientX; s0 = t.start; dragging = true
    try { b.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    e.stopPropagation()
  })
  b.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return       // the hold owns the touch move, or the browser does
    if (!dragging) return
    const dx = e.clientX - px0
    if (Math.abs(dx) > 3) moved = true
    if (moved){
      t.start = Math.max(0, s0 + dx / state.zoom)
      b.setAttribute("transform", barXform2(t))
      $("#time").textContent = "@ " + fmtTime(t.start)
    }
  })
  b.addEventListener("pointerup", e => {
    if (e.pointerType === "touch"){
      endHold()
      if (hasPick()) return          // the pickup owns this release
      if (!moved) select(t.id)                  // a tap on a take opens its details
      return
    }
    dragging = false
    if (liftPress){ liftPress = false; return }   // ctrl-click that never lifted — deliberate no-op
    if (moved){ idbPutTake(t); refresh(); updateTimeReadout() }
    else select(t.id)
  })
  b.addEventListener("pointercancel", () => { dragging = false; liftPress = false; endHold() })
}

/* ---------- select & metadata panel ---------- */
// scrollIntoView is unreliable on SVG geometry, so reveal by arithmetic instead — same
// margin rule followPlayhead uses, applied on both axes
export function revealTake(t){
  const tl = $("#tl"), pad = 60
  const x = t.start * state.zoom, y = barTop(t)
  if (x < tl.scrollLeft) tl.scrollLeft = Math.max(0, x - pad)
  else if (x > tl.scrollLeft + tl.clientWidth - pad) tl.scrollLeft = x - tl.clientWidth + pad
  if (y < tl.scrollTop + rulerH()) tl.scrollTop = Math.max(0, y - rulerH())
  else if (y + BARH > tl.scrollTop + tl.clientHeight) tl.scrollTop = y + BARH - tl.clientHeight
}
