# Galaan

**Make the gala happen.** Galaan is a shared hangout planner for barkadas. It brings plans, RSVPs, and ambagan into one place, so the group chat can stay the group chat.

> A responsive frontend MVP with realistic sample data. Circle, RSVP, signature, and expense changes are stored in this browser only; accounts, a shared backend, and cross-device real-time sync are not connected yet.

## What you can do

- Switch between **College Tropa**, **Cousins**, and **SHS Barkada**, each with its own sample calendar and plans.
- Browse a monthly calendar and a chronological list of this month's and upcoming galas.
- See plans move from **Drawing** to **May Kulay Na** when the RSVP quorum is reached.
- RSVP with a finger-drawn or mouse-drawn **pirma**.
- View event details, call time and GC time, venue links, and notes.
- Track shared expenses and mark attendees as paid or unpaid.
- Create a gala with a date, vibe, venue, quorum, and starting expenses.

## Run locally

**Requirements:** Node.js and npm.

```bash
git clone https://github.com/Fruizer/Galaan.git
cd Galaan
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Check the code with Oxlint |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |

## Built with

React, TypeScript, Vite, Tailwind CSS v4, Framer Motion, and Lucide icons.

## Project status

Galaan is currently a frontend prototype. It uses local browser storage to make interactions feel persistent on one device. Authentication, database-backed circle isolation, invite links, and live syncing will require a backend before multiple people can use it together.

## About

Galaan helps barkadas turn tentative plans into confirmed hangouts—with shared calendars, playful pirma RSVPs, and simple ambagan tracking.
