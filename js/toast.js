/* Rough Cut — the transient status toast. */

import { $ } from "./helpers.js"

let toastT

export function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("show")
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200)
}
