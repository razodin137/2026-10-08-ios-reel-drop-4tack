/* Rough Cut — the detail view: the designer panel for the selected take or cue. */

import { $, esc, fmtClock } from "./helpers.js"
import { state, play, takeById, barPos } from "./state.js"
import { saveCues, idbPutTake, idbDelTake } from "./storage.js"
import { renderCues, cueById, syncCueDom, refreshViewIfCue, deleteCue } from "./cues.js"
import { updateBarText } from "./timeline.js"
import { refresh } from "./timeline.js"
import { openOvl, closeOvl } from "./menu.js"
import { deliveredExt, downloadTake } from "./exportSession.js"
import { pausePlayback } from "./playback.js"
import { selectCue } from "./cues.js"

export function pmetaHTML(t){
  return esc(t.recordedAt.replace("T", " ").slice(0, 19)) + "<br>" +
    fmtClock(t.duration) + " · " + t.kind + "." + deliveredExt(t) + " · starts " + fmtClock(t.start) +
    (barPos(t.start) ? " · bar " + barPos(t.start) : "")
}
export function openView(){ renderViewBody(); openOvl("#viewOvl") }
export function closeView(){ closeOvl("#viewOvl") }
export function dismissView(){
  state.selectedId = null
  state.selectedCueId = null
  renderCues()
  document.querySelectorAll(".bar.selected").forEach(b => b.classList.remove("selected"))
  closeView()
}
function renderViewBody(){
  const body = $("#vBody")
  const cue = cueById(state.selectedCueId)
  if (cue){
    $("#vKicker").textContent = "cue"
    body.innerHTML =
      '<input class="v-name" id="vName" type="text" value="' + esc(cue.name) + '" placeholder="cue name">' +
      '<div class="v-meta" id="vMeta">' + fmtClock(cue.pos) + (barPos(cue.pos) ? " · bar " + barPos(cue.pos) : "") + "</div>" +
      '<label><span class="f-lab">time</span><input id="vPos" type="number" min="0" step="any" value="' + cue.pos.toFixed(2) + '"></label>' +
      '<label><span class="f-lab">notes</span><textarea id="vNotes" rows="5" placeholder="what happens here…">' + esc(cue.notes) + "</textarea></label>" +
      '<button class="v-del" id="vDel">delete cue</button>'
    $("#vName").addEventListener("input", e => { cue.name = e.target.value; saveCues(); syncCueDom(cue) })
    $("#vPos").addEventListener("input", e => {
      cue.pos = Math.max(0, parseFloat(e.target.value) || 0)
      state.cues.sort((a, b) => a.pos - b.pos)
      saveCues(); renderCues(); refreshViewIfCue()
    })
    $("#vNotes").addEventListener("input", e => { cue.notes = e.target.value; saveCues() })
    $("#vDel").addEventListener("click", () => deleteCue(cue.id))
    return
  }
  const t = takeById(state.selectedId)
  if (!t){ body.innerHTML = ""; return }
  $("#vKicker").textContent = "take"
  body.innerHTML =
    '<input class="v-name" id="vName" type="text" value="' + esc(t.name) + '" placeholder="take name">' +
    '<div class="v-meta" id="vMeta">' + pmetaHTML(t) + "</div>" +
    '<div class="v-grid">' +
      '<label><span class="f-lab">bpm</span><input id="vBpm" type="number" min="0" step="any" value="' + (t.bpm ?? "") + '" placeholder="—"></label>' +
      '<label><span class="f-lab">key</span><input id="vKey" type="text" value="' + esc(t.key) + '" placeholder="Am"></label>' +
      '<label class="v-span"><span class="f-lab">tags</span><input id="vTags" type="text" value="' + esc((t.tags || []).join(", ")) + '" placeholder="riff, dark"></label>' +
    "</div>" +
    '<label class="f-keep"><input id="vKeep" type="checkbox"' + (t.keep ? " checked" : "") + "><span>keep</span></label>" +
    '<label><span class="f-lab">notes</span><textarea id="vNotes" rows="5">' + esc(t.notes) + "</textarea></label>" +
    (t.kind === "video" ? '<video class="v-vid" id="vVid" controls playsinline></video>' : "") +
    '<div class="v-actions"><button class="v-dl" id="vDl">download</button><button class="v-del" id="vDel">delete take</button></div>'
  let panelUrl = null
  if (t.kind === "video"){ panelUrl = URL.createObjectURL(t.blob); $("#vVid").src = panelUrl }
  const save = () => { updateBarText(t); idbPutTake(t) }
  $("#vName").addEventListener("input", e => { t.name = e.target.value; save() })
  $("#vBpm").addEventListener("input", e => { t.bpm = e.target.value === "" ? null : (parseFloat(e.target.value) || null); save() })
  $("#vKey").addEventListener("input", e => { t.key = e.target.value.trim(); save() })
  $("#vTags").addEventListener("input", e => { t.tags = e.target.value.split(",").map(s => s.trim()).filter(Boolean); save() })
  $("#vKeep").addEventListener("change", e => { t.keep = e.target.checked; save() })
  $("#vNotes").addEventListener("input", e => { t.notes = e.target.value; save() })
  $("#vDl").addEventListener("click", () => downloadTake(t))
  $("#vDel").addEventListener("click", () => {
    if (confirm('Delete "' + t.name + '"?')) deleteTake(t.id)
  })
}

export function deleteTake(id){
  const i = state.takes.findIndex(t => t.id === id)
  if (i < 0) return
  pausePlayback()
  state.takes.splice(i, 1)
  if (state.selectedId === id) state.selectedId = null
  idbDelTake(id)
  const v = play.videos.get(id)
  if (v){ URL.revokeObjectURL(v.src); v.remove(); play.videos.delete(id) }
  refresh(); closeView()
}

/* ---------- select ---------- */
export function select(id){
  state.selectedId = id
  state.selectedCueId = null
  renderCues()
  document.querySelectorAll(".bar.selected").forEach(b => b.classList.remove("selected"))
  const t = takeById(id)
  if (t && t.el){
    t.el.classList.add("selected")
    revealTake(t)
  }
  if (t) openView(); else closeView()
}
import { revealTake } from "./drag.js"
