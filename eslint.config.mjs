// House style: the 37signals JS dialect, inlined.
//
// Copied from @37signals/eslint-config@0.0.2 (MIT) so this repo owns its
// dialect directly — no 0.0.x meta-package to pin the eslint toolchain.
// Double quotes, no semicolons, 2-space indent, spaced array brackets.

import js from "@eslint/js"
import globals from "globals"
import stylistic from "@stylistic/eslint-plugin-js"

const dialect = {
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      "global": "readonly",
      ...globals.browser
    }
  },
  plugins: {
    "@stylistic/js": stylistic
  },
  rules: Object.assign({}, js.configs.recommended.rules, {
    "@stylistic/js/array-bracket-spacing": [ "error", "always" ],
    "@stylistic/js/arrow-spacing": [ "error", { "before": true, "after": true } ],
    "@stylistic/js/block-spacing": [ "error", "always" ],
    "@stylistic/js/comma-dangle": [ "error", "never" ],
    "@stylistic/js/comma-spacing": [ "error", { "before": false, "after": true } ],
    "@stylistic/js/comma-style": [ "error", "last" ],
    "@stylistic/js/computed-property-spacing": [ "error", "never" ],
    "@stylistic/js/eol-last": "error",
    "@stylistic/js/function-call-spacing": [ "error", "never" ],
    "@stylistic/js/indent": [ "error", 2, { "SwitchCase": 1 } ],
    "@stylistic/js/no-trailing-spaces": "error",
    "@stylistic/js/quotes": [ "error", "double", { "avoidEscape": true } ],
    "@stylistic/js/semi": [ "error", "never" ],
    "@stylistic/js/space-infix-ops": [ "error" ],
    "@stylistic/js/keyword-spacing": [ "error" ],
    "curly": [ "error", "multi-line" ],
    "no-unused-vars": [ "error", { "args": "none", "caughtErrors": "none" } ],
    "no-var": "error",
    "prefer-const": [ "error", { "destructuring": "all" } ]
  })
}

export default [
  dialect,
  {
    // the app itself is browser JS; the lint pipeline is node
    files: [ "scripts/**", "*.config.js" ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
]
