/* Rough Cut — recording: the live device cache and the take lifecycle. */

import { $, fmtTime, isoNow, uid } from "./helpers.js"
import { state, rec, play } from "./state.js"
import { ensureCtx, audioCtx } from "./audio.js"
import { idbPutTake } from "./storage.js"
import { refresh } from "./timeline.js"
import { toast } from "./toast.js"
import { ensurePeaks } from "./waveforms.js"
import { select } from "./panels.js"
import { COVER_PAGES, setRecLabels, setWantVideoEnabled, syncVideoPreview, writeElapsed } from "./recordPage.js"

export let rec = null         // active recording session

export function toggleRecord(){ rec ? stopRecording() : startRecording() }
async function startRecording(){
  if (rec) return
  const wantVideo = $("#videoChk").checked
  let stream
  try { stream = await getMedia(wantVideo) }
  catch (err){ toast("mic/camera unavailable: " + (err.name || err.message)); return }
  ensureCtx(); try { await audioCtx.resume() } catch (e) { /* ignore */ }
  const kind = stream.getVideoTracks().length ? "video" : "audio"
  const mime = pickMime(kind)
  let recorder
  try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined) }
  catch (e){
    try { recorder = new MediaRecorder(stream) }
    catch (e2){ toast("MediaRecorder unavailable in this browser"); stream.getTracks().forEach(t => t.stop()); return }
  }
  const chunks = []
  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
  recorder.onerror = () => toast("recorder error")
  recorder.onstop = () => {
    const r = rec; if (!r) return
    const blob = new Blob(r.chunks, { type: r.recorder.mimeType || "audio/webm" })
    const dur = (performance.now() - r.startWall) / 1000
    cleanupRecUI(r)
    rec = null
    document.body.classList.remove("recording")
    setRecLabels(false)
    setWantVideoEnabled(true)
    syncVideoPreview()      // put the idle self-view back up if the record page is showing
    commitTake({ blob, kind: r.kind, start: r.startPos, duration: dur, mime: blob.type })
  }
  recorder.start(1000)
  rec = {
    recorder, stream, chunks, kind,
    startPos: state.playhead,
    startWall: performance.now()
  }
  document.body.classList.add("recording")
  setRecLabels(true)
  setWantVideoEnabled(false)          // switching device mode mid-take would stop the tracks
  startRecUI()
  toast(kind === "video" ? "recording video — press again to stop" : "recording — press again to stop")
}
function stopRecording(){ if (rec){ try { rec.recorder.stop() } catch (e) { /* ignore */ } } }

/* live-device cache: keep the granted stream around between takes so the browser
   doesn't re-prompt for mic/camera on every take. Released when the video mode
   changes, the session resets, or the user revokes the device mid-session. */
let media = null
export function releaseMedia(){
  if (!media) return
  media.stream.getTracks().forEach(tr => tr.stop())
  media = null
}
export async function getMedia(wantVideo){
  if (media){
    const allLive = media.stream.getTracks().every(tr => tr.readyState === "live")
    if (media.hasVideo === wantVideo && allLive) return media.stream
    releaseMedia()                    // mode switched or a track died — request fresh
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
  })
  media = { stream, hasVideo: !!stream.getVideoTracks().length }
  stream.getTracks().forEach(tr => tr.addEventListener("ended", () => {
    if (media && media.stream === stream) media = null   // revoked / unplugged
  }))
  return stream
}
function pickMime(kind){
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return ""
  const list = kind === "video"
    ? [ "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4" ]
    : [ "audio/webm;codecs=opus", "audio/webm", "audio/mp4" ]
  for (const m of list){ try { if (MediaRecorder.isTypeSupported(m)) return m } catch (e) { /* ignore */ } }
  return ""
}
export function extFor(mime, kind){
  if (kind === "video") return mime.includes("mp4") ? "mp4" : "webm"
  return mime.includes("mp4") ? "m4a" : "webm"
}
function startRecUI(){
  const r = rec
  if (r.kind === "video"){
    const v = $("#camPreview"); v.srcObject = r.stream; v.classList.remove("hidden"); v.play().catch(() => {})
    const rc = $("#recCam"); rc.srcObject = r.stream; rc.play().catch(() => {})
  }
  try {
    r.srcNode = audioCtx.createMediaStreamSource(r.stream)
    r.analyser = audioCtx.createAnalyser(); r.analyser.fftSize = 512
    r.srcNode.connect(r.analyser)   // never to destination — no feedback
  } catch (e) { /* ignore */ }
  const buf = new Uint8Array(256)
  const tick = () => {
    if (!rec) return
    writeElapsed((performance.now() - rec.startWall) / 1000)
    if (rec.analyser){
      rec.analyser.getByteTimeDomainData(buf)
      let pk = 0
      for (let i = 0; i < buf.length; i++){ const d = Math.abs(buf[i] - 128) / 128; if (d > pk) pk = d }
      $("#meterFill").style.setProperty("--lvl", Math.min(1, pk * 1.4).toFixed(3))
    }
    rec.raf = requestAnimationFrame(tick)
  }
  tick()
}
function cleanupRecUI(r){
  if (r && r.raf) cancelAnimationFrame(r.raf)
  for (const v of [ $("#camPreview"), $("#recCam") ]) v.srcObject = null
  $("#camPreview").classList.add("hidden")
  $("#recTime").textContent = fmtTime(0)
  $("#meterFill").style.setProperty("--lvl", 0)
  updateTimeReadout()
}
function commitTake({ blob, kind, start, duration, mime, recordedAt }){
  const t = {
    id: uid(),
    name: "Take " + (state.takes.length + 1),
    kind: kind || "audio",
    start: Math.max(0, start || 0),
    duration: duration || 0,
    recordedAt: recordedAt || isoNow(),
    bpm: null, key: "", tags: [], notes: "", keep: false,
    mime: mime || blob.type || "audio/webm",
    blob, buffer: null, peaks: null, lane: 0
  }
  t.ext = extFor(t.mime, t.kind)
  state.takes.push(t)
  refresh()
  ensurePeaks(t)
  // select() opens the detail panel, which would land on top of a cover page after every
  // take; there, confirm the save and leave the user where they are
  if (COVER_PAGES.has(state.page)) toast(t.name + " saved")
  else select(t.id)
  idbPutTake(t)
  return t
}
import { updateTimeReadout } from "./timeline.js"
