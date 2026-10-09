/* Rough Cut — shared state. The one module everything reads.
   `state` and `play` are const objects mutated by property, so every module
   sees the same live object. Singletons that get REBOUND live in the module
   that owns their writes: audioCtx (audio.js), rec (recording.js),
   db (storage.js), saveDir (saveFolder.js), RULERH (timeline.js). */

import { isoNow } from "./helpers.js"

export const ROWH = 68, BARH = 54
export const coarse = () => matchMedia("(any-pointer: coarse)").matches
// hit-area floor, independent of what's drawn: SVG lets a 16px bar keep a 44px target
export const minTap = () => (coarse() ? 44 : 24)
export const LANES = [ // muted, distinguishable hues (oklch hue angles)
  { h: 230, c: "oklch(72% 0.09 230)" }, { h: 130, c: "oklch(72% 0.1 130)" }, { h: 85,  c: "oklch(76% 0.1 85)" },
  { h: 300, c: "oklch(72% 0.1 300)" }, { h: 350, c: "oklch(72% 0.09 350)" }, { h: 180, c: "oklch(72% 0.09 180)" }
]
export const state = {
  session: { name: "", bpm: null, key: "", tags: [], notes: "", created: isoNow() },
  takes: [],            // {id,name,kind,start,duration,recordedAt,bpm,key,tags,notes,keep,mime,ext,blob,buffer,peaks,lane}
  cues: [],             // {id,pos,name,notes}
  selectedId: null,
  selectedCueId: null,
  playhead: 0,
  page: "timeline",     // which full-screen page is up: "timeline" | "record" | "save" | "import"
  zoom: 40,             // px per second
  playing: false,
  lanes: 6, contentSec: 120, contentPx: 4800
}
export const play = { sources: [], startCtx: 0, startPos: 0, raf: 0, videos: new Map() }

export const takeById = id => state.takes.find(t => t.id === id)
export const contentEnd = () => state.takes.reduce((m, t) => Math.max(m, t.start + t.duration), 0)

// bar.beat.tenths position (4/4) from timeline seconds + session bpm; null if no session bpm
export const barPos = sec => {
  const bpm = state.session.bpm
  if (!bpm) return null
  const beats = Math.round(sec * bpm / 60 * 10) / 10   // nearest tenth of a beat
  return (Math.floor(beats / 4) + 1) + "." + (Math.floor(beats % 4) + 1) + "." + Math.round((beats % 1) * 10)
}
