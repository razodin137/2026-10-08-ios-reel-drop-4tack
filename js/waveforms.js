/* Rough Cut — decoding & waveforms. ensurePeaks() decodes a take's blob and
   computes per-second peak maxima; decoded duration refines the take. */

import { debounce } from "./helpers.js"
import { ensureCtx, audioCtx } from "./audio.js"
import { idbPutTake } from "./storage.js"

export async function ensurePeaks(t){
  if (t.peaks || t._decoding) return
  t._decoding = true
  try {
    ensureCtx()
    const ab = await t.blob.arrayBuffer()
    const buf = await audioCtx.decodeAudioData(ab)
    t.buffer = buf; t.duration = buf.duration
    const per = 60, n = Math.max(1, Math.ceil(buf.duration * per)), spc = Math.max(1, Math.floor(buf.sampleRate / per))
    const peaks = new Float32Array(n), chs = []
    for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c))
    for (let i = 0; i < n; i++){
      let m = 0; const s0 = i * spc, s1 = Math.min(buf.length, s0 + spc)
      for (const d of chs) for (let s = s0; s < s1; s += 4){ const v = Math.abs(d[s]); if (v > m) m = v }
      peaks[i] = m
    }
    t.peaks = peaks
  } catch (e){ t.decodeFailed = true }
  t._decoding = false
  idbPutTake(t)          // duration may have been refined
}
export const scheduleRefresh = debounce(() => { layout(); renderAll() }, 60)
