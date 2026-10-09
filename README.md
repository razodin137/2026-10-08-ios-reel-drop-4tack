# Rough Cut

A rough-timeline idea recorder. The anti-DAW: press record first, name things whenever you feel like it.

**[Open the app](https://razodin137.github.io/2026-10-08-ios-reel-drop-4tack/)**

## What it is

A single HTML file for capturing musical ideas the moment they happen. No project setup, no metronome, no track arming — hit record, play, hit record again. Each take lands on a drag-to-retime timeline. Metadata is optional and can wait: name, bpm, key, tags, notes, and a keep star, editable any time by clicking a take.

## Features

- **One-press recording** — audio or audio+video, straight from the mic/camera
- **Record page** — a second view with the timeline out of the way, all in red and white. The audio view is a dead-centre stack — session title, the big record button, the timer under it — with the *timeline* toggle and video tickbox in the bottom corner. Tick video and a locked 1:1 camera stage takes the middle: record dead-centre in a bottom bar, timer at its left in line with the timeline's readout, same corner pair. The camera opens as soon as the view is up so you can frame before recording
- **Rough timeline** — takes stack into lanes, drag horizontally to retime; a frozen left gutter labels every lane, so a take stays identifiable once you have scrolled
- **Touch model** — no two gestures fight over the same finger: drag anywhere to pan, tap a take for its details, tap empty space to seek, and hold a take for ~400ms to pick it up and retime it. Holding the ruler or empty space drops a cue — the touch stand-in for the desktop double-click. Targets grow on a phone (a 44px hit area behind even a 16px bar) and the ruler gets taller
- **Lift into your DAW** — ctrl-drag (cmd-drag on mac) a take off the timeline and drop it anywhere files go: desktop, folder, or straight onto a DAW's timeline. Audio lands as the same DAW-ready 16-bit WAV the exports write, under the same export name. Chrome/Edge only — the file drag-out API is a chromium thing; elsewhere the drag fizzles and the exports still cover you
- **Optional, deferred metadata** — name / bpm / key / tags / notes / keep per take, plus session-level bpm + key + tags
- **Playback** — takes play back together from the playhead; scrub on the ruler
- **Waveforms** — decoded and drawn per take
- **Persistence** — everything (including media) is stored locally in IndexedDB; reload-safe
- **Export** — one `.zip`: markdown with YAML front matter per take, session index, cues, and media files. Tick *keeps only* in the menu to export just the takes marked keep
- **Take download** — "download" in a take's detail panel asks *Download with notes?* and zips that take's markdown + media under the same name the full export would use
- **Save to folder** — a second cover page (menu → *save to folder*) writes that same file set **unzipped** into a folder you pick, in one subfolder per project. Chrome/Edge only (the File System Access API); the folder is remembered between saves, and the page explains itself elsewhere
- **Import** — a third cover page (menu → *import*) reads that same file set back in: drop a `.zip`, or choose a folder or a loose handful of files. It's additive and never overwrites — a take already here is skipped, and a take whose media is missing is skipped and named rather than added empty
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
- The session index's YAML lists every media file in the export under `media:`, so a tool can find them without parsing the take list in the body
- Each take's YAML carries a stable `id:` (so a re-import can match takes across renames) and `kind: audio|video` (the media's own container can't be trusted — an exported audio take is a `.wav`, but its original `.webm` reads back as video)
- Cues round-trip exactly via a `cue_list:` block of `{pos, name, notes}` in `cues.md` — the prose list below it truncates to whole seconds

*Import* reads this format back, so the front matter **is** the interface. Identity is the filename: a take whose export name is already in the session is skipped, and a re-import of the same export is a no-op. The `id:` is a second, skip-only check, so a take you retitled here still won't double up. An empty session adopts the import's title/bpm/key/tags/notes wholesale; a session with anything in it keeps what it has and only fills its blanks. A take whose `media:` file isn't in the import is skipped and named in the toast — never added without its audio. Positions and cues stay absolute, so an import lands where it was recorded, not where the playhead is.

One file set, two destinations: a single `.zip` (stored, no compression), or unzipped into a folder you pick — see *Save to folder*. The folder form lands in one stable subfolder per project, overwritten in place on re-save, and prunes only the takes you deleted (a *keeps only* save never removes files already on disk). WAV export for audio (16-bit, DAW-ready) when the browser decodes it.

## Keyboard

| key | action |
| --- | --- |
| `R` | record / stop |
| `Space` | play / pause |

## Touch

| gesture | action |
| --- | --- |
| drag anywhere | pan the timeline |
| tap a take | open its details |
| tap empty lane space | seek (or put the open details away) |
| drag the ruler | scrub |
| hold a take (~400ms) | pick it up, then drag to retime |
| hold the ruler or empty lane space | add a cue |

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