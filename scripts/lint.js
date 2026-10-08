// House-style gate for the single-file app.
//
// The runtime stays one dependency-free index.html: this script extracts the
// inline <style> and <script> blocks into build/, runs the 37signals house
// linters (ESLint for JS, Stylelint for CSS, html-validate for the markup),
// and with --fix splices the fixed sources straight back into the HTML.

const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const root = path.join(__dirname, "..")
const htmlPath = path.join(root, "index.html")
const buildDir = path.join(root, "build")
const bin = name => path.join(root, "node_modules", ".bin", name)
const fix = process.argv.includes("--fix")

const blocks = [
  { tag: "style", out: path.join(buildDir, "app.css") },
  { tag: "script", out: path.join(buildDir, "app.js") }
]

function extract(html, tag) {
  const pattern = new RegExp(`<${tag}>\n([\\s\\S]*?)</${tag}>`)
  const match = html.match(pattern)
  if (!match) throw new Error(`no <${tag}> block found in index.html`)
  return { pattern, body: match[1] }
}

function run(name, args) {
  const result = spawnSync(bin(name), args, { cwd: root, encoding: "utf8" })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  return result.status
}

let html = fs.readFileSync(htmlPath, "utf8")
const readAt = fs.statSync(htmlPath).mtimeMs
fs.mkdirSync(buildDir, { recursive: true })
for (const b of blocks) {
  const extracted = extract(html, b.tag)
  b.pattern = extracted.pattern
  b.original = extracted.body
  fs.writeFileSync(b.out, extracted.body)
}
if (fix) {
  run("eslint", [ "--fix", "." ])
  run("stylelint", [ "--fix", "build/app.css" ])
  if (fs.statSync(htmlPath).mtimeMs !== readAt) {
    console.error("index.html changed while linting — not splicing fixes back")
    process.exit(2)
  }
  let spliced = html
  for (const b of blocks) {
    const body = fs.readFileSync(b.out, "utf8")
    if (body !== b.original) spliced = spliced.replace(b.pattern, () => `<${b.tag}>\n${body}</${b.tag}>`)
  }
  if (spliced !== html) fs.writeFileSync(htmlPath, spliced)
  html = spliced
  for (const b of blocks) fs.writeFileSync(b.out, extract(html, b.tag).body)
}

const failed = [
  run("eslint", [ "." ]),
  run("stylelint", [ "build/app.css" ]),
  run("html-validate", [ "index.html" ])
].some(status => status !== 0)

process.exit(failed ? 1 : 0)
