# Rough Cut

A rough-timeline idea recorder. The anti-DAW: press record first, name things whenever you feel like it.

**[Open the app](https://razodin137.github.io/2026-10-08-ios-reel-drop-4tack/)**

## What it is

A single HTML file for capturing musical ideas the moment they happen. No project setup, no metronome, no track arming — hit record, play, hit record again. Each take lands on a drag-to-retime timeline. Metadata is optional and can wait: name, bpm, key, tags, notes, and a keep star, editable any time by clicking a take.

## Features

- **One-press recording** — audio or audio+video, straight from the mic/camera
- **Record page** — a second view with the timeline out of the way. Just the session title, a timer, the video tickbox and one big record button, all in red and white. Tick video and the page reshapes: the camera takes a locked 1:1 stage with the controls pushed to the top and bottom, and the camera opens as soon as the view is up so you can frame before recording
- **Rough timeline** — takes stack into lanes, drag horizontally to retime
- **Optional, deferred metadata** — name / bpm / key / tags / notes / keep per take, plus session-level bpm + key + tags
- **Playback** — takes play back together from the playhead; scrub on the ruler
- **Waveforms** — decoded and drawn per take
- **Persistence** — everything (including media) is stored locally in IndexedDB; reload-safe
- **Export** — markdown with YAML front matter per take, session index, and media files
- **Take download** — "download" in a take's detail panel asks *Download with notes?* and zips that take's markdown + media under the same name the full export would use
- **Render** — bounce the whole session to a single mixdown WAV

## Export naming

Exports are prefixed so they sort and never collide:

```
YYYY-MM-DD-[(X)bpm]-[(X)key]-title
```

- Unspecified segments are skipped (`2026-10-08-my-song.wav`, `2026-10-08-128bpm-Am-my-song.wav`)
- Zip/folder names carry a seconds stamp (`-HHMMSS`) to avoid same-day duplicates
- Each take file uses the take's own bpm/key and recording date
- Every take's markdown embeds its media with `![]()` alongside the YAML `media:` reference

Two export paths: a real directory via the File System Access API, or a single `.zip` fallback. WAV export for audio (16-bit, DAW-ready) when the browser decodes it.

## Keyboard

| key | action |
| --- | --- |
| `R` | record / stop |
| `Space` | play / pause |

## Storage & privacy

No server, no account, no upload. Takes live in this browser's IndexedDB. "new" clears the session.

## Tech

One `index.html`. No build step, no runtime dependencies. Works in any modern browser with `MediaRecorder` (Chrome/Edge for the directory export; the zip fallback covers the rest).

## House style

The code follows the [37signals house style](https://github.com/basecamp/house-style) — enforced, not aspirational:

- **JS** — `@37signals/eslint-config` (double quotes, no semicolons, 2-space indent, spaced array brackets)
- **CSS** — `@37signals/stylelint-config-scss`
- **HTML** — `html-validate` with the standard preset

`npm run lint` checks everything: the inline `<style>`/`<script>` blocks are extracted into `build/`, linted under the house rules, and `npm run lint:fix` splices the fixes straight back into `index.html`. Dev tooling only — the app still ships as a single dependency-free file.