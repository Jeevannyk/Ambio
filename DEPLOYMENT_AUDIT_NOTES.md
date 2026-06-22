# Deployment Audit Notes

Date: 2026-06-15

Overall rating from audit: 6.5 / 10
Deployment readiness: staging-ready, not fully production-ready yet

## Critical / Must Fix

1. Tests are broken and stale

- Command: `npm test -- --watchAll=false`
- Result: failed.
- Error: test runner could not resolve `react-router-dom` from `src/App.jsx` when run through `react-scripts`.
- The current test file also expects the old Todo UI, including "Todo List", "Enter a task", and "No tasks to show", but the current app now uses the Ambio welcome/tasks interface.
- Files:
  - `package.json`
  - `src/App.test.js`
- Fix:
  - Replace `react-scripts test` with a Vite-compatible test setup such as Vitest.
  - Rewrite tests around the current routes: welcome page, task add/edit, rooms page, and room gate.

2. Mobile/tablet task details are hidden

- On screens below 900px, the app hides the entire task detail pane.
- This means phone/tablet users can add and select tasks, but cannot access notes, subtasks, tags, reminders, or list moving.
- Files:
  - `src/pages/TasksPage.css`
  - `src/pages/TasksPage.jsx`
- Relevant CSS:
  - `@media (max-width: 900px) { .tasks2-detail { display: none; } }`
- Fix:
  - Add a mobile detail view, drawer, route, or slide-over panel instead of hiding the detail pane completely.

3. Rooms page has horizontal overflow on phone

- Playwright smoke test showed horizontal overflow at 390px width on `/rooms`.
- This makes phone compatibility incomplete.
- Likely causes:
  - Fixed left rail/content offsets.
  - Rooms header/form/grid controls not fully wrapping.
- Files:
  - `src/App.css`
  - `src/pages/RoomsPage.jsx`
- Fix:
  - Add phone-specific CSS for the rail/content layout.
  - Ensure room header, join-code row, form rows, and room cards wrap within the viewport.

## Major / Should Fix Before Production

4. LiveKit room features are not fully verified

- The architecture is good: the browser fetches a token from `/api/token`, and the LiveKit secret stays on the server.
- But actual camera/mic/chat/screen-share behavior was not fully verified because production LiveKit env vars are required.
- Required env vars:
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
  - `LIVEKIT_URL`
- Files:
  - `server/index.js`
  - `render.yaml`
  - `.env.example`
- Fix:
  - Deploy to staging with real LiveKit credentials.
  - Test two users joining the same room from separate devices/networks.
  - Verify mic, camera, screen share, chat, reactions, host controls, room full state, and leave/rejoin.

5. Production bundle is large

- `npm run build` passed.
- Vite warning: main JS chunk is larger than 500 kB.
- Observed build output:
  - JS: about 770 kB minified, about 216 kB gzip.
  - CSS: about 67.77 kB minified, about 13.66 kB gzip.
- Fix:
  - Code-split heavy routes/features.
  - Lazy-load room/video-call code.
  - Lazy-load music/player/media features.

6. Media-heavy page does not reach Playwright `networkidle`

- The app kept network/media work alive during browser smoke testing.
- This is not automatically a bug, but it affects automated test reliability.
- Fix:
  - In tests, use `domcontentloaded` or targeted UI waits instead of `networkidle`.
  - Consider pausing background media during automated tests.

7. Environment docs have minor inconsistency

- `src/components/SpotifyPlayer.jsx` comment says `REACT_APP_SPOTIFY_CLIENT_ID`, but the actual Vite env var is `VITE_SPOTIFY_CLIENT_ID`.
- The visible setup UI and `.env.example` use `VITE_SPOTIFY_CLIENT_ID`, so this is mostly a comment/docs issue.
- Files:
  - `src/components/SpotifyPlayer.jsx`
  - `.env.example`
- Fix:
  - Update the stale comment to `VITE_SPOTIFY_CLIENT_ID`.

## Minor / Polish

8. Some visible strings appear to have encoding damage

- Several strings/comments show mojibake characters such as `â€¦`, `Ã—`, and broken emoji sequences.
- Some appear in user-facing UI text, not only comments.
- Examples seen in:
  - `src/pages/RoomsPage.jsx`
  - `src/pages/RoomCall.jsx`
  - `src/pages/TasksPage.jsx`
  - `.env.example`
- Fix:
  - Search for mojibake characters and replace them with either proper UTF-8 or plain ASCII.
  - Prefer ASCII if avoiding encoding issues.

9. Mobile fixed-position controls may collide

- The app uses several fixed panels/pills:
  - left rail
  - theme panel
  - music player
  - Pomodoro widget
  - full-screen task and room screens
- Basic smoke tests passed for some routes, but the layout is fragile on small screens.
- Files:
  - `src/App.css`
  - `src/components/YouTubePlayer.css`
  - `src/pages/RoomCall.css`
  - `src/pages/TasksPage.css`
- Fix:
  - Add a consistent mobile shell layout.
  - Collapse the rail into a bottom nav or compact top bar on phones.

10. Attachments UI is placeholder-only

- The task detail pane has an "Attachments" drop area, but no upload/drop behavior was verified in code.
- File:
  - `src/pages/TasksPage.jsx`
- Fix:
  - Either implement file attachment behavior or label it as coming soon.

## Verified Working During Audit

- `npm run build` passed.
- Built app loaded in Playwright.
- Home route loaded.
- Tasks route loaded.
- Rooms route loaded.
- Adding a task worked on desktop, tablet, and phone widths.
- Desktop tasks detail pane was visible.
- No basic page errors were observed in the browser smoke test.
- `.env` is ignored by git.
- `.env.example` is tracked.
- Render config exists for a single web service.
- Express token server serves `/api/token` and static `dist`.

## Recommended Next Fix Order

1. Fix mobile task detail access.
2. Fix `/rooms` phone overflow.
3. Replace stale CRA tests with Vite/Vitest tests.
4. Deploy to Render staging with LiveKit env vars.
5. Test real video-room behavior on two devices.
6. Split the production bundle.
7. Clean encoding-damaged strings.
