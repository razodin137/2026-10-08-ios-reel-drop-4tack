/* Rough Cut — the one AudioContext, created lazily and shared by every
   audio read/write. Callers resume it themselves: ensureCtx() only builds. */

export let audioCtx = null

export function ensureCtx(){ if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx }
