// 37signals house style
import houseStyle from "@37signals/eslint-config"
import globals from "globals"

export default [
  houseStyle,
  {
    // the app itself is browser JS; the lint pipeline is node
    files: [ "scripts/**", "*.config.js" ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
]
