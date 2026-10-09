/* Rough Cut — IndexedDB persistence (blobs included, reload-safe).
   db is module-local and REBOUND on open; the rest of the app never reads it. */

import { debounce } from "./helpers.js"
import { state } from "./state.js"

let db = null

export function idbOpen(){
  return new Promise((res, rej) => {
    const rq = indexedDB.open("rough-cut", 1)
    rq.onupgradeneeded = () => { rq.result.createObjectStore("takes", { keyPath: "id" }); rq.result.createObjectStore("meta") }
    rq.onsuccess = () => { db = rq.result; res() }
    rq.onerror = () => rej(rq.error)
  })
}
export function idbPutTake(t){
  if (!db) return
  const record = { ...t }   // copy without runtime fields
  for (const k of [ "buffer", "peaks", "el", "_decoding" ]) delete record[k]
  try { db.transaction("takes", "readwrite").objectStore("takes").put(record) } catch (e) { /* ignore */ }
}
export function idbDelTake(id){ if (!db) return; try { db.transaction("takes", "readwrite").objectStore("takes").delete(id) } catch (e) { /* ignore */ } }
export function idbAllTakes(){
  return new Promise((res, rej) => {
    if (!db) return res([])
    const rq = db.transaction("takes").objectStore("takes").getAll()
    rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error)
  })
}
export function idbSetMeta(k, v){ if (!db) return; try { db.transaction("meta", "readwrite").objectStore("meta").put(v, k) } catch (e) { /* ignore */ } }
export function idbGetMeta(k){
  return new Promise(res => {
    if (!db) return res(null)
    const rq = db.transaction("meta").objectStore("meta").get(k)
    rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null)
  })
}
export const saveCues = debounce(() => { if (db) try { db.transaction("meta", "readwrite").objectStore("meta").put(state.cues, "cues") } catch (e) { /* ignore */ } }, 300)
