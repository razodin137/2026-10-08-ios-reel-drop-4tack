/* Rough Cut — tiny shared helpers. Pure: imports nothing. */

export const $ = s => document.querySelector(s)
export const el = (t, cls) => { const e = document.createElement(t); if (cls) e.className = cls; return e }

const SVGNS = "http://www.w3.org/2000/svg"
export const svgEl = (t, cls) => { const e = document.createElementNS(SVGNS, t); if (cls) e.setAttribute("class", cls); return e }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]))
export const q = s => JSON.stringify(String(s))           // JSON string = valid YAML scalar
export const isoNow = () => new Date().toISOString()
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id" + Math.random().toString(36).slice(2))
export const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "take"
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
export const fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), ss = s - m * 60
  return m + ":" + String(Math.floor(ss)).padStart(2, "0") + "." + Math.floor((ss % 1) * 10) }
export const fmtClock = s => { s = Math.max(0, s); return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") }