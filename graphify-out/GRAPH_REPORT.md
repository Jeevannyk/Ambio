# Graph Report - C:/Users/jeeva/git-workshop-24/my workspace/react/react-todo-app  (2026-06-14)

## Corpus Check
- 70 files · ~71,841 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 330 nodes · 392 edges · 35 communities (29 shown, 6 thin omitted)
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.84)
- Token cost: 224,355 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Room Flow & App Shell|Room Flow & App Shell]]
- [[_COMMUNITY_Audio Reactor & Visualizer|Audio Reactor & Visualizer]]
- [[_COMMUNITY_App Root & Theming|App Root & Theming]]
- [[_COMMUNITY_Build Config & Scripts|Build Config & Scripts]]
- [[_COMMUNITY_Spotify Integration|Spotify Integration]]
- [[_COMMUNITY_WebRTC Room Calls|WebRTC Room Calls]]
- [[_COMMUNITY_shadcnui Config|shadcn/ui Config]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Audio-Reactive Media & Video|Audio-Reactive Media & Video]]
- [[_COMMUNITY_Todo  Tasks UI|Todo / Tasks UI]]
- [[_COMMUNITY_Persistence & Dev Tooling|Persistence & Dev Tooling]]
- [[_COMMUNITY_UI Primitives (ButtonCalendar)|UI Primitives (Button/Calendar)]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_Playwright Driver Internals|Playwright Driver Internals]]
- [[_COMMUNITY_Simulated Video Room|Simulated Video Room]]
- [[_COMMUNITY_App UI Screenshots|App UI Screenshots]]
- [[_COMMUNITY_App Entry & Bootstrap|App Entry & Bootstrap]]
- [[_COMMUNITY_Audio Bridge & Spotify Auth|Audio Bridge & Spotify Auth]]
- [[_COMMUNITY_Task Data Model|Task Data Model]]
- [[_COMMUNITY_JS Path Aliases|JS Path Aliases]]
- [[_COMMUNITY_VS Code Settings|VS Code Settings]]
- [[_COMMUNITY_shadcn Components|shadcn Components]]
- [[_COMMUNITY_React Logo Assets|React Logo Assets]]
- [[_COMMUNITY_Room Code Gating|Room Code Gating]]
- [[_COMMUNITY_Auto-Hide Controls|Auto-Hide Controls]]
- [[_COMMUNITY_PWA Manifest Node|PWA Manifest Node]]
- [[_COMMUNITY_Classnames Util|Classnames Util]]
- [[_COMMUNITY_Web Vitals|Web Vitals]]
- [[_COMMUNITY_Jest-DOM Setup|Jest-DOM Setup]]

## God Nodes (most connected - your core abstractions)
1. `AudioReactor` - 12 edges
2. `SpotifyPlayer()` - 11 edges
3. `App root component` - 10 edges
4. `getToken()` - 8 edges
5. `run-react-todo-app Playwright Driver` - 8 edges
6. `formatTime()` - 7 edges
7. `YouTubePlayer` - 7 edges
8. `tailwind` - 6 edges
9. `aliases` - 6 edges
10. `scripts` - 6 edges

## Surprising Connections (you probably didn't know these)
- `SPA rewrite-to-index routing` --conceptually_related_to--> `RoomCall (gate)`  [INFERRED]
  render.yaml → src/pages/RoomCall.jsx
- `index.jsx entry point` --references--> `index.html (Vite root)`  [INFERRED]
  src/index.jsx → index.html
- `run-react-todo-app skill` --references--> `TasksPage`  [INFERRED]
  .claude/skills/run-react-todo-app/SKILL.md → src/pages/TasksPage.jsx
- `public/index.html (CRA template)` --semantically_similar_to--> `index.html (Vite root)`  [INFERRED] [semantically similar]
  public/index.html → index.html
- `Music Player Spotify Setup Card (Close-up)` --semantically_similar_to--> `Music Player Spotify Setup Card`  [INFERRED] [semantically similar]
  Screenshot 2026-06-10 162320.png → .claude/skills/run-react-todo-app/screenshot.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Wallpaper scene selection flow** — app_scenes, backgroundvideo_component, sceneselector_component, app_component [EXTRACTED 1.00]
- **Pomodoro shared timer state across views** — usepomodoro_hook, app_component, pomodorowidget_component [EXTRACTED 1.00]
- **Audio-reactive ambient effect pipeline** — audioreactor_class, audioreactor_css_var_bridge, audioreactor_simulation_fallback [INFERRED 0.85]
- **Shared audio-reactor visual system** — audioreactor_shared, useaudioanalyzer_useaudioreactive, audiovisualizer_component, audioreactiveglow_component, audioreactiveborder_component [INFERRED 0.85]
- **Room join flow (gate, prejoin, live tiles)** — codegate_component, prejoin_component, videotile_component [INFERRED 0.75]
- **Todo render pipeline (list, item, toolbar, undo)** — todolist_component, todoitem_component, toolbar_component, undotoast_component [INFERRED 0.75]
- **Backend-less localStorage persistence** — tasks_storage_key, rooms_storage_key, spotify_token_store [INFERRED 0.85]
- **Room create-to-live join pipeline** — roomspage_component, roomcall_component, roomcall_roomlive, useroomcall_hook [INFERRED 0.85]
- **Shared Pomodoro timer across pages and room** — usepomodoro_hook, myroompage_component, roomcall_roomlive, usepomodoro_formattime [INFERRED 0.75]
- **Welcome Screen Composite Layout** — screenshot_sidebar_nav, screenshot_wallpaper_background, screenshot_task_cards, screenshot_floating_toolbar, screenshot_music_player_card [EXTRACTED 1.00]
- **React Brand Logo Asset Set** — logo192_react_icon, logo512_react_icon, logo_react_svg [INFERRED 0.95]

## Communities (35 total, 6 thin omitted)

### Community 0 - "Room Flow & App Shell"
Cohesion: 0.06
Nodes (16): PomodoroWidget(), NAV, useAutoHideControls(), formatTime(), POMODORO_MODES, usePomodoro(), ICE_CONFIG, useRoomCall() (+8 more)

### Community 1 - "Audio Reactor & Visualizer"
Cohesion: 0.11
Nodes (8): AudioReactor, clamp01(), lerp(), AudioVisualizer(), formatTime(), PLAYLISTS, YouTubePlayer(), useAudioReactive()

### Community 2 - "App Root & Theming"
Cohesion: 0.12
Nodes (25): App root component, GlobalThemeToggle, SCENES wallpaper config, App.test.js suite, View-Transition circular theme reveal, BackgroundVideo, CalendarDemo, shadcn components.json config (+17 more)

### Community 3 - "Build Config & Scripts"
Cohesion: 0.09
Nodes (21): browserslist, development, production, devDependencies, autoprefixer, playwright, tailwindcss, @tailwindcss/vite (+13 more)

### Community 4 - "Spotify Integration"
Cohesion: 0.24
Nodes (19): formatMs(), SpotifyPlayer(), base64Url(), checkSaved(), getPlaybackState(), getToken(), handleCallback(), hasClientId() (+11 more)

### Community 5 - "WebRTC Room Calls"
Cohesion: 0.12
Nodes (20): SPA rewrite-to-index routing, render.yaml (Render Blueprint), RoomCall (gate), Code-gate then pre-join flow, RoomLive, rooms localStorage store, RoomsPage, genCode (room code) (+12 more)

### Community 6 - "shadcn/ui Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, class-variance-authority, clsx, date-fns, lucide-react, peerjs, @radix-ui/react-slot, react (+10 more)

### Community 8 - "Audio-Reactive Media & Video"
Cohesion: 0.16
Nodes (18): --a-volume shared CSS variable, Ref-driven per-frame DOM updates (no re-render), AudioReactiveBorder, AudioReactiveGlow, audioReactor shared singleton, AudioVisualizer, localStorage persistence pattern, PreJoin (+10 more)

### Community 9 - "Todo / Tasks UI"
Cohesion: 0.13
Nodes (3): isOverdue(), TodoItem(), FILTERS

### Community 10 - "Persistence & Dev Tooling"
Cohesion: 0.18
Nodes (11): Playwright driver.mjs, run-react-todo-app skill, VIBES scenes (Pexels CDN), getToken / refreshToken, Spotify Web API helpers, Spotify PKCE OAuth (no backend), Spotify token localStorage store, tasks localStorage store (+3 more)

### Community 11 - "UI Primitives (Button/Calendar)"
Cohesion: 0.29
Nodes (5): cn(), Button, buttonVariants, Calendar(), CalendarDayButton()

### Community 12 - "PWA Manifest"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 13 - "Playwright Driver Internals"
Cohesion: 0.25
Nodes (5): appRoot, buildDir, here, MIME, shotPath

### Community 14 - "Simulated Video Room"
Cohesion: 0.33
Nodes (5): CHAT_EMOJIS, FAKE_PARTICIPANTS, formatTimer(), REACTION_EMOJIS, VideoRoom()

### Community 15 - "App UI Screenshots"
Cohesion: 0.38
Nodes (7): Music Player Spotify Setup Card (Close-up), Right-Side Floating Icon Toolbar, Music Player Spotify Setup Card, Amble Sidebar Navigation (Welcome/Tasks/Rooms), Highlighted Task Cards (Travel/Cooking), Aerial Forest Wallpaper Background, App Welcome Back Home Screen

### Community 16 - "App Entry & Bootstrap"
Cohesion: 0.40
Nodes (5): index.jsx entry point, index.html (Vite root), public/index.html (CRA template), README (Create React App), Pinned dev port 5173 (strictPort)

### Community 17 - "Audio Bridge & Spotify Auth"
Cohesion: 0.33
Nodes (6): AudioReactor, Audio-to-CSS-custom-property bridge, Cross-origin audio simulation fallback, audioReactor singleton, spotify PKCE utils, SpotifyPlayer

### Community 18 - "Task Data Model"
Cohesion: 0.40
Nodes (6): TodoItem, isOverdue helper, Task data shape (id/text/done/priority/due), TodoList, Toolbar, UndoToast

### Community 19 - "JS Path Aliases"
Cohesion: 0.40
Nodes (4): compilerOptions, baseUrl, paths, @/*

### Community 21 - "VS Code Settings"
Cohesion: 0.50
Nodes (3): editor.tokenColorCustomizations, comments, textMateRules

### Community 22 - "shadcn Components"
Cohesion: 1.00
Nodes (3): Button (shadcn/cva), Calendar (react-day-picker), CalendarDayButton

### Community 23 - "React Logo Assets"
Cohesion: 1.00
Nodes (3): React Logo PWA Icon (192px), React Logo PWA Icon (512px), React Logo SVG (#61DAFB Atom)

## Knowledge Gaps
- **102 isolated node(s):** `here`, `appRoot`, `buildDir`, `shotPath`, `MIME` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RoomLive` connect `WebRTC Room Calls` to `App Root & Theming`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `formatTime` connect `App Root & Theming` to `WebRTC Room Calls`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App root component` (e.g. with `theme localStorage persistence` and `run-react-todo-app Playwright Driver`) actually correct?**
  _`App root component` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `here`, `appRoot`, `buildDir` to the rest of the system?**
  _115 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Room Flow & App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.06262626262626263 - nodes in this community are weakly interconnected._
- **Should `Audio Reactor & Visualizer` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Should `App Root & Theming` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._