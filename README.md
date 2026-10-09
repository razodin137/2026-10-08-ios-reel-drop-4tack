# Rough Cut

A rough-timeline idea recorder. The anti-DAW: press record first, name things whenever you feel like it.

**[Open the app](https://razodin137.github.io/2026-10-08-ios-reel-drop-4tack/)**

## What it is

A single HTML file for capturing musical ideas the moment they happen. No project setup, no metronome, no track arming — hit record, play, hit record again. Each take lands on a drag-to-retime timeline. Metadata is optional and can wait: name, bpm, key, tags, notes, and a keep star, editable any time by clicking a take.

## Features

- **One-press recording** — audio or audio+video, straight from the mic/camera
- **Record page** — a second view with the timeline out of the way, all in red and white. The audio view is a dead-centre stack — session title, the big record button, the timer under it — with the *timeline* toggle and video tickbox in the bottom corner. Tick video and a locked 1:1 camera stage takes the middle: record dead-centre in a bottom bar, timer at its left in line with the timeline's readout, same corner pair. The camera opens as soon as the view is up so you can frame before recording
- **Rough timeline** — takes stack into lanes, drag horizontally to retime
- **Lift into your DAW** — ctrl-drag (cmd-drag on mac) a take off the timeline and drop it anywhere files go: desktop, folder, or straight onto a DAW's timeline. Audio lands as the same DAW-ready 16-bit WAV the exports write, under the same export name. Chrome/Edge only — the file drag-out API is a chromium thing; elsewhere the drag fizzles and the exports still cover you
- **Optional, deferred metadata** — name / bpm / key / tags / notes / keep per take, plus session-level bpm + key + tags
- **Playback** — takes play back together from the playhead; scrub on the ruler
- **Waveforms** — decoded and drawn per take
- **Persistence** — everything (including media) is stored locally in IndexedDB; reload-safe
- **Export** — one `.zip`: markdown with YAML front matter per take, session index, cues, and media files. Tick *keeps only* in the menu to export just the takes marked keep
- **Take download** — "download" in a take's detail panel asks *Download with notes?* and zips that take's markdown + media under the same name the full export would use
- **Format labels** — each take's bar and detail panel show what it delivers on export or drag-out (`audio.wav` once decoded, `video.webm` etc.), not just audio/video
- **Render** — bounce the whole session to a single mixdown WAV

## Export naming

Exports are prefixed so they sort and never collide:

```
YYYY-MM-DD-[(X)bpm]-[(X)key]-title
```

- Unspecified segments are skipped (`2026-10-08-my-song.wav`, `2026-10-08-128bpm-Am-my-song.wav`)
- Zip names carry a seconds stamp (`-HHMMSS`) to avoid same-day duplicates
- Each take file uses the take's own bpm/key and recording date
- Every take's markdown embeds its media with `![]()` alongside the YAML `media:` reference

One export path: a single `.zip` (stored, no compression). WAV export for audio (16-bit, DAW-ready) when the browser decodes it.

## Keyboard

| key | action |
| --- | --- |
| `R` | record / stop |
| `Space` | play / pause |

## Storage & privacy

No server, no account, no upload. Takes live in this browser's IndexedDB. "new" clears the session.

## Tech

One `index.html`. No build step, no runtime dependencies. Works in any modern browser with `MediaRecorder`.

## House style

The code follows the [37signals house style](https://github.com/basecamp/house-style) — enforced, not aspirational:

- **JS** — `@37signals/eslint-config` (double quotes, no semicolons, 2-space indent, spaced array brackets)
- **CSS** — `@37signals/stylelint-config-scss`
- **HTML** — `html-validate` with the standard preset

`npm run lint` checks everything: the inline `<style>`/`<script>` blocks are extracted into `build/`, linted under the house rules, and `npm run lint:fix` splices the fixes straight back into `index.html`. Dev tooling only — the app still ships as a single dependency-free file.