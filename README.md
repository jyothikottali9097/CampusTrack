# CampusTrack — University Live Transit Network

CampusTrack is a full-stack web-based university transportation management and live GPS bus tracking platform connecting **Students**, **Bus Drivers**, and **Transportation Administrators** along the Vizianagaram → University Campus corridor.

---

## 1. Installation

Install project dependencies using npm:

```bash
npm install
```

## 2. Development

Start the full-stack development server (Express + Vite middleware on port 3000):

```bash
npm run dev
```

Open `http://localhost:3000` in a desktop or tablet web browser.

## 3. Gemini API Configuration (`GEMINI_API_KEY`)

CampusTrack AI uses **Google Gemini 3.8 Flash** (`gemini-3.8-flash`) with live function calling (`getETA`, `getBusLocation`, `getRoute`, `getBusStops`, `getBusOccupancy`, `getTripStatus`, `getAlerts`, `getSchedule`) on the server (`/api/ai/chat`).

Configure your environment variable in `.env` (refer to `.env.example`):

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

- **Automatic Offline Deterministic Fallback:** If `GEMINI_API_KEY` is not set or unavailable, CampusTrack AI automatically falls back to its built-in deterministic live telemetry engine so every question is answered accurately from real-time simulated fleet data.

## 4. Live Bus Simulation Controls

The persistent simulation control bar below the main navigation header allows you to control real-time bus movement without external GPS hardware:

- **▶ Start / ⏸ Pause / ↻ Reset:** Control continuous waypoint interpolation across all active corridor routes.
- **Speed Multipliers (`1×`, `2×`, `5×`, `10×`):** Accelerate telemetry updates, ETA countdowns, and stop boarding changes.
- **Reset Demo Data:** Available in the top-right user profile menu, Admin Portal header, and footer to restore initial seed positions and clear custom edits.

## 5. Production Build

Compile the client bundle and verify TypeScript types:

```bash
npm run lint
npm run build
```

Run the production server:

```bash
npm start
```

## 6. Vercel Deployment

This repository includes `vercel.json` for seamless SPA deployment. Even when deployed as a static frontend on Vercel without a Node backend, the client-side CampusTrack AI automatically uses the deterministic live telemetry engine so all 8 transit tools and portals work out of the box.
