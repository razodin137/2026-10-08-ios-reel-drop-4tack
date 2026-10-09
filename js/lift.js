/* Rough Cut — lift: ctrl/cmd-drag a take out as a real file.
   Blink will not start a native drag from an SVG element: `draggable` on the
   <g> is inert (mousedown fires, dragstart never does). So the drag source
   has to stay an HTML element — #content takes the attribute while ctrl/cmd
   is held, and the take is worked out from the pointer at dragstart. Blink
   walks up from the rect under the cursor to the nearest draggable ancestor,
   which is what lets this reach through the SVG layers. */

import { $, el } from "./helpers.js"
import { ROWH, state } from "./state.js"
import { rulerH } from "./timeline.js"
import { deliveredExt, deliveredMedia, takeBaseName, takeIndex } from "./exportSession.js"

let dragUrl = null, liftGhost = null
function armLift(on){
  document.body.classList.toggle("lift-armed", on)
  $("#content").draggable = on
}
// hold ctrl/cmd anywhere and bars switch to lift mode (cursor + ghost affordance)
document.addEventListener("keydown", e => {
  if (e.key === "Control" || e.key === "Meta") armLift(true)
})
document.addEventListener("keyup", e => {
  if (e.key === "Control" || e.key === "Meta") armLift(false)
})
window.addEventListener("blur", () => armLift(false))
// which take sits under a client point — read in #tl's own scrolled coordinates
function takeAt(clientX, clientY){
  const tl = $("#tl"), r = tl.getBoundingClientRect()
  const sec = (clientX - r.left + tl.scrollLeft) / state.zoom
  const lane = Math.floor((clientY - r.top + tl.scrollTop - rulerH()) / ROWH)
  if (lane < 0) return null
  return state.takes.find(t => t.lane === lane && sec >= t.start && sec <= t.start + t.duration) || null
}
export function attachLiftDrag(){
  const c = $("#content")
  c.addEventListener("dragstart", e => {
    const t = takeAt(e.clientX, e.clientY)
    if (!t){ e.preventDefault(); return }    // nothing under the press — leave it a scrub
    const name = takeBaseName(t, takeIndex(t), new Set())
    const ext = deliveredExt(t)
    const media = deliveredMedia(t)
    if (dragUrl) URL.revokeObjectURL(dragUrl)
    dragUrl = URL.createObjectURL(media)
    e.dataTransfer.effectAllowed = "copy"
    // DownloadURL is "mime:filename:url" — chromium is picky about the mime, so strip codec params (";codecs=…") to a clean type/subtype
    e.dataTransfer.setData("DownloadURL", ((media.type || "").split(";")[0] || "application/octet-stream") + ":" + name + "." + ext + ":" + dragUrl)
    e.dataTransfer.setData("text/plain", name + "." + ext)
    const ghost = el("div", "lift-ghost")
    ghost.textContent = name + "." + ext
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 12, 12)
    liftGhost = ghost
  })
  c.addEventListener("dragend", () => {
    if (liftGhost){ liftGhost.remove(); liftGhost = null }
    if (dragUrl){ const u = dragUrl; dragUrl = null; setTimeout(() => URL.revokeObjectURL(u), 60000) }
  })
}
