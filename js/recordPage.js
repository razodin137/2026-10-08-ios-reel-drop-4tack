/* Rough Cut — the record page: view switching and the live self-view. */

import { $, fmtTime } from "./helpers.js"
import { state } from "./state.js"
import { idbSetMeta } from "./storage.js"
import { toast } from "./toast.js"
import { releaseMedia, getMedia, rec } from "./recording.js"
import { ovlIsOpen, closeMenu } from "./menu.js"
import { dismissView } from "./panels.js"
import { pausePlayback } from "./playback.js"
import { renderSave, refreshSavePerm } from "./saveFolder.js"
import { renderImport } from "./importPage.js"

// the elapsed clock is drawn on two pages — the transport readout and the big red one
export function writeElapsed(sec){
  $("#time").textContent = "REC " + fmtTime(sec)
  $("#recTime").textContent = fmtTime(sec)
}
export function setRecLabels(recording){
  const txt = recording ? "stop" : "rec"
  $("#recLabel").textContent = txt
  $("#recBigLabel").textContent = txt
}
// the device mode can't change mid-take: releaseMedia() would stop the tracks feeding
// the live recorder, so both video boxes go dead until the take ends
export function setWantVideoEnabled(on){
  $("#videoChk").disabled = !on
  $("#recVideoChk").disabled = !on
  const title = on ? "Record video too" : "stop recording to change"
  $("#vidChip").title = title
  $("#recVid").title = title
}
export function setWantVideo(on){
  $("#videoChk").checked = on           // assigning .checked fires no change event
  $("#recVideoChk").checked = on
  document.body.classList.toggle("has-video", state.page === "record" && on)
  if (!rec) releaseMedia()              // device mode changed — let the next take re-request
  syncVideoPreview()
  idbSetMeta("video", on)               // so the record page comes back the shape you left it
}
// the camera opens as soon as the video view is up, so you can frame before pressing record
let previewing = false
export async function syncVideoPreview(){
  if (rec) return                       // a take is rolling; the recorder already owns the stream
  const cam = $("#recCam")
  const wanted = state.page === "record" && $("#videoChk").checked
  if (!wanted){
    cam.srcObject = null
    // only drop the camera when we're actually leaving the video view — the timeline still
    // wants the stream cached between takes
    if (previewing){ previewing = false; releaseMedia() }
    return
  }
  previewing = true
  try {
    const stream = await getMedia(true)
    if (state.page === "record" && $("#videoChk").checked && !rec) cam.srcObject = stream
  } catch (err){
    cam.srcObject = null
    toast("camera unavailable: " + (err.name || err.message))
  }
}
// the DOM half of a page switch, kept separate so boot can apply a page without stealing focus
// pages that COVER #app rather than live beside it: they own the screen, the inert timeline
// and the keys — the transport never runs behind them
export const COVER_PAGES = new Set([ "record", "save", "import" ])
export function applyView(focus = true){
  const rec = state.page === "record", save = state.page === "save", imp = state.page === "import"
  document.body.classList.toggle("record-mode", rec)
  document.body.classList.toggle("save-mode", save)
  document.body.classList.toggle("import-mode", imp)
  document.body.classList.toggle("has-video", rec && $("#videoChk").checked)
  $("#app").inert = COVER_PAGES.has(state.page)   // set before focusing, or the covered page takes it back
  $("#recModeBtn").setAttribute("aria-pressed", rec ? "true" : "false")
  if (!focus) return
  if (rec) $("#recBig").focus({ preventScroll: true })
  else if (save){
    const go = $("#saveGo")
    const target = go.disabled ? $("#saveExit") : go   // never focus a disabled button
    target.focus({ preventScroll: true })
  }
  else if (imp) $("#importPickZip").focus({ preventScroll: true })
  else $("#recModeBtn").focus({ preventScroll: true })
}
export function setPage(page){
  state.page = page
  if (COVER_PAGES.has(page)){
    pausePlayback()                     // neither cover page has a transport
    if (ovlIsOpen("#menuOvl")) closeMenu()
    if (ovlIsOpen("#viewOvl")) dismissView()
  }
  applyView()
  // entering mid-take: catch the big button and the timer up to a recording already running
  setRecLabels(!!rec)
  if (rec) writeElapsed((performance.now() - rec.startWall) / 1000)
  syncVideoPreview()
  if (page === "save"){ renderSave(); refreshSavePerm() }
  else if (page === "import") renderImport()
  idbSetMeta("page", page)
}
