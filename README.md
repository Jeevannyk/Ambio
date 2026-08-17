# Ambio

A calm place to focus. Pick a cozy background (forest, ocean, city at night, rain), play some music, start a timer, and get your work done. You can also study together with friends in shared video rooms.

## What you can do

- **Set the mood** — full-screen video wallpapers, or paste your own YouTube video as the background.
- **Play music** — a built-in music player to keep you in the zone.
- **Focus timer** — a Pomodoro timer (work / break cycles) that floats on screen.
- **To-do list** — a clean tasks page with notes, subtasks, reminders, tags, and a streak calendar.
- **Study rooms** — join a private video room with a code and focus alongside others.
- **Your own account** — sign up / log in so your stuff is saved.

## Run it on your computer

You need [Node.js](https://nodejs.org) version 20 or newer installed.

1. **Get the code and install the bits it needs**
   ```bash
   npm run install:all
   ```
   (The app lives in `frontend/`, the room-pass server in `backend/` — this installs both.)

2. **Add your keys (optional, but needed for login, music, and video rooms)**

   Make a copy of `.env.example` and name it `.env`, then fill in the values. The file explains where to get each one. You can leave them blank to just try the basic app.

3. **Start it**
   ```bash
   npm run dev
   ```
   Then open the link it prints (usually http://localhost:5173) in your browser.

4. **For video rooms** — open a second terminal and run the little server that hands out room passes:
   ```bash
   npm run server
   ```

## The commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app while you're working on it |
| `npm run server` | Runs the server that powers video rooms |
| `npm run build` | Packages the app for going live |
| `npm run preview` | Previews that packaged version (run inside `frontend/`) |
| `npm run install:all` | Installs frontend + backend dependencies |

All commands work from the repo root; `frontend/` and `backend/` each have their own `package.json` if you prefer working inside one half.

## How it's built

- **React** + **Vite** for the app
- **Tailwind CSS** for the look
- **Supabase** for accounts and login
- **LiveKit** for the video rooms
- A small **Express** server for room passes (tokens)

That's it — open it up and enjoy your focus time.
