---
name: run-react-todo-app
description: Build, launch, screenshot, and drive the react-todo-app — a Create React App todo list. Use when asked to run, start, build, test, smoke-test, or screenshot the todo app, or to verify a change works in the running app.
---

# Run: react-todo-app

A Create React App (react-scripts 5) single-page todo app. There is no
backend — state lives in `localStorage`. The agent path builds the
static bundle and drives it in headless Chromium via **Playwright**
([driver.mjs](driver.mjs)), which boots its own zero-dependency static
server, runs a full user flow (add / toggle / filter / search / edit /
delete+undo / dark mode), asserts on the DOM, and writes a screenshot.

**All paths below are relative to the app root** (`react-todo-app/`).

## Prerequisites

Node is already present (tested on v24.14.0). Install Playwright +
the Chromium binary once (saved as a devDependency in `package.json`):

```
npm install
npx playwright install chromium
```

If `node_modules` is missing entirely, `npm install` also pulls
react-scripts and the rest.

## Build

The driver serves `./build` — it does **not** build for you. Build first:

```
npm run build
```

Expected tail: `Compiled successfully.` Output lands in `./build`.

## Run (agent path) — the driver

```
node .claude/skills/run-react-todo-app/driver.mjs
```

What it does:
- Starts an in-process static server on a random localhost port serving `./build`.
- Launches headless Chromium, clears `localStorage` for a deterministic run.
- Exercises: add two tasks, reject whitespace-only input, toggle done,
  check the counter, Active filter, text search, double-click edit-in-place,
  delete + Undo, dark-mode toggle, and the VIBES scene selector (asserts the
  background gradient changes on click).
- Prints `ok:` per assertion, writes
  `.claude/skills/run-react-todo-app/screenshot.png`, and exits **0** on
  success / **non-zero** on the first failed assertion.

Expected final lines:

```
  ok: dark mode applied
screenshot written to ...screenshot.png

ALL CHECKS PASSED
```

Look at `screenshot.png` after running — a blank page or a page with no
`.todo-item` rows means the build is stale; re-run `npm run build`.

## Run (human path)

```
npm start
```

Opens `http://localhost:3000` in a browser and watches for edits. Useless
headless (it waits forever for a browser and never exits), so it is **not**
the agent path — use the driver instead. Ctrl-C to stop.

## Test

The project ships the default CRA test runner (Jest + Testing Library):

```
npm test -- --watchAll=false
```

This is a sanity check only; the driver above is the real end-to-end smoke.

## Gotchas

- **Playwright is not pre-wired.** `require('playwright')` fails until
  `npm install` + `npx playwright install chromium` have both run — the
  second step downloads the actual browser binary, separate from the npm
  package.
- **The driver does not build.** It serves whatever is in `./build`. Edit
  source, forget to rebuild, and the driver silently tests the old bundle.
  Always `npm run build` first.
- **CRA needs an SPA fallback.** The driver's static server returns
  `index.html` for any unknown path; a naive file server would 404 and the
  app would never mount.
- **Dark mode is applied asynchronously.** The theme toggle uses the View
  Transitions API (`document.startViewTransition`), so `data-theme` flips a
  tick *after* the click — read it with `waitForFunction`, not immediately.
- **VIBES videos are hotlinked from the Pexels CDN.** Each scene's `src`
  (in `SCENES`, `src/App.js`) points at `videos.pexels.com`, which serves
  the MP4s with HTTP 200 and allows hotlinking — unlike `assets.mixkit.co`,
  which returns **HTTP 403** and was the reason the buttons originally
  looked dead. If you swap sources, verify the new host returns 200 to an
  un-refer'd `curl`. Each scene also defines a CSS `gradient` that
  `BackgroundVideo` paints underneath as an instant poster/fallback, so the
  background changes the moment you click even before the video buffers;
  the `<video>` fades in on `onCanPlay`. The driver asserts on that
  gradient (deterministic offline), not on video playback (network-dependent).

## Troubleshooting

- `Cannot find module 'playwright'` → run `npm install` (it's a
  devDependency) then `npx playwright install chromium`.
- `browserType.launch: Executable doesn't exist` → the npm package is
  present but the browser isn't: `npx playwright install chromium`.
- Driver exits non-zero on an `ASSERT FAILED` line → the named step
  regressed; open `screenshot.png` and re-check that feature in source.
- `ENOENT ... build/index.html` from the driver → you skipped
  `npm run build`.
