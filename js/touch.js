/* Rough Cut — touch gestures.
   A hold that stays still for 400ms changes what the press means: on a take it
   lifts the take into retime, on the ruler or the empty lanes it drops a cue —
   the touch twin of the double-click, which no phone can reach. Nothing is
   prevented before the hold fires, so a press that moves past the slop is
   simply handed back to the browser as an ordinary pan. */

import { $, fmtTime } from "./helpers.js"
import { state } from "./state.js"
import { barXform2 } from "./drag.js"
import { idbPutTake } from "./storage.js"
import { refresh, updateTimeReadout } from "./timeline.js"

export const HOLDDELAY = 400, HOLDSLOP = 8
let hold = null, pick = null
export const hasPick = () => !!pick

export function endHold(){
  if (!hold) return
  clearTimeout(hold.timer)
  hold = null
}
export function holdStart(e, fire){
  endHold()
  const h = { x: e.clientX, y: e.clientY, fired: false }
  h.timer = setTimeout(() => { hold = null; h.fired = true; fire() }, HOLDDELAY)
  hold = h
  return h
}
// the slop check is global so it covers bars, cues and the background alike
window.addEventListener("pointermove", e => {
  if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > HOLDSLOP) endHold()
})
// Once the finger has been still, the retime is driven from raw touch coordinates rather than
// pointer events. That is deliberate: the first cancelled touchmove is what stops the scroller
// from ever taking the gesture, and a gesture that never used pointers cannot be pointercancel'd.
function beginPick(b, t, e){
  endPick()
  const p = { el: b, t, x0: e.clientX, s0: t.start, dx: 0 }
  p.move = ev => {
    const ft = ev.touches[0]
    if (!ft) return
    ev.preventDefault()
    p.dx = ft.clientX - p.x0
    t.start = Math.max(0, p.s0 + p.dx / state.zoom)
    b.setAttribute("transform", barXform2(t))
    $("#time").textContent = "@ " + fmtTime(t.start)
  }
  // silent = a blur or a second finger, which commits the retime but never opens a panel
  p.end = silent => {
    const moved = Math.abs(p.dx) > 3
    endPick()
    if (moved){ idbPutTake(t); refresh(); updateTimeReadout() }
    else if (!silent) select(t.id)      // held still, then let go: still a tap
  }
  p.onEnd = () => p.end(false)
  pick = p
  b.classList.add("picked")
  navigator.vibrate?.(10)               // a no-op on iOS — there the lift is the whole affordance
  window.addEventListener("touchmove", p.move, { passive: false })
  window.addEventListener("touchend", p.onEnd)
  window.addEventListener("touchcancel", p.onEnd)
}
function endPick(){
  if (!pick) return
  const p = pick
  pick = null
  window.removeEventListener("touchmove", p.move)
  window.removeEventListener("touchend", p.onEnd)
  window.removeEventListener("touchcancel", p.onEnd)
  p.el.classList.remove("picked")
}
// every way a gesture can end, so nothing outlives the finger
export function endGesture(){
  endHold()
  if (pick) pick.end(true)
}
// A tap on a take or a cue selects it, and the browser then synthesises a click at the same
// point — which lands on whatever the tap just opened, i.e. the detail panel's scrim, and
// closes it again. Cancelling touchend is the spec'd way to stop that click existing at all.
window.addEventListener("touchend", e => {
  if (e.target.closest && e.target.closest(".bar, .cue")) e.preventDefault()
}, { passive: false })
window.addEventListener("blur", endGesture)
document.addEventListener("visibilitychange", endGesture)
window.addEventListener("pointerdown", e => { if (e.pointerType === "touch" && pick) endGesture() })

export { beginPick }
