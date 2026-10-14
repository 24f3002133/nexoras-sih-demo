# Air Power Ops Console — SIH26250 prototype

**Air Power — Dynamic Air Operations & Resource Optimisation** · Smart India Hackathon 2026 · Team NEXORAS_
Problem owner: Ministry of Defence · Defence Services Staff College

This is a working prototype. It fuses aircraft, crew, weapon, airspace, weather, threat and priority feeds into one air picture. It then allocates aircraft and crews to missions under hard constraints, explains every choice, and re-plans in milliseconds when something changes. The commander approves every decision.

> All data is synthetic sample data for a fictional air base. This is not an operational system.

## Deploy on Vercel (≈ 3 minutes)

**Option A: GitHub (recommended)**
1. Create a new GitHub repo and upload the contents of this folder (`package.json` must be at the repo root).
2. On vercel.com, choose **Add New → Project**, import the repo, and click **Deploy**. Vite is detected automatically (`vercel.json` is included).
3. To match the QR on slide 6, go to **Project → Settings → General** and set the name to `nexoras-sih-demo`. The URL becomes https://nexoras-sih-demo.vercel.app.

**Option B: CLI**
```bash
npm install
npx vercel --prod      # pick the project name nexoras-sih-demo when prompted
```

## Run locally
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run test:engine    # prints the baseline plan and the 4-event ripple
```

## What's inside

| Page | What it shows |
|---|---|
| **Air picture** | KPIs, theatre map (threat shading, SAM rings, range rings, grid refs, moving aircraft with ▶ Play day), feed freshness, fleet tiles, ranked tasking with factor mix |
| **Tasking plan** | Searchable/filterable plan, CSV export, approve / approve all |
| **Sortie timeline** | Gantt of every sortie by aircraft or crew, turnaround/rest blocks, now line, play/scrub the day (map aircraft move with it) |
| **Fleet & crew** | Readiness predictor per tail, crew duty and rest (editable by Squadron Ops), weapon stock, maintenance U/S toggle |
| **Threat & airspace** | Threat by sector, 8-period trend with the EW threshold, weather/NOTAM status, exposure per sortie |
| **Retask console** | Inject 4 events (snag, pop-up SAM, weather, new target), before→after ripple, retask history, **what-if simulator** |
| **Decision log** | Commander's queue, **SHA-256 hash-chained audit log**, verify chain, tamper test |
| **Reports** | ATO tasking sheet, CSV, readiness, threat brief, debrief, audit dossier (all hash-stamped downloads) |
| **Settings** | Live optimiser weights, hard-constraint thresholds, link-loss/degraded mode, theme, density, role |

There is also a **▶ Demo tour** (13-step guided walkthrough that drives the real console), nested popups with ← Back (mission ↔ aircraft ↔ crew ↔ sector), a mission modal (score breakdown, 8 hard-constraint checks, next-best alternatives, Approve / Modify / Hold), a **Ctrl/⌘ K** command palette, an **AI Ops Copilot** (explains assignments, compares runner-ups, summarises retasks, drafts the ATO, with voice input), light/dark mode, and **role-based access** (Commander / Planner / Squadron Ops / Maintenance).

## Engine
- **Score** = Priority 30 + Readiness 20 + Crew 15 + Threat 15 + Weapon 10 + Weather 10. Weights can be tuned in Settings.
- **Hard constraints** are never traded off: role fit, crew qualification, duty limit + margin, maintenance due, weapon stock, airspace open, weather minima, and an EW pod when threat ≥ 80%.
- **Solver**: two-stage, priority-weighted Hungarian assignment (aircraft, then crew), with a minimal-disruption bonus so that unaffected sorties stay put, then a **second-sortie pass** that reuses airframes and crews when turnaround (90 min) and crew rest (60 min) allow. The production design uses Google OR-Tools CP-SAT with the same objective.
- **Readiness predictor**: P(serviceable, 6 h) = σ(3.2 − 0.25·snags − inspection penalty).
- **Worked example** (matches the deck): after the FX-08 snag, M-02 → FX-05 + ARJUN = 24 + 19.2 + 15 + 4.5 + 10 + 10 = **83**. One sortie changes; it re-solves in a few ms.

## Demo script (2 minutes)
1. Sign in as **Air Commander**. On the Air picture page you see 8/8 missions tasked.
2. Open **Retask console** and inject **Snag on M-02 strike aircraft**. Only M-02 moves (FX-08 → FX-05, score 83).
3. Click **Review M-02**. Show the score breakdown, the constraints and the alternatives, then click **Approve**.
4. Inject the other events, then try the **what-if simulator**.
5. Open **Decision log** and click **Verify chain**. Then run **Tamper test** and verify again: the chain shows as broken.
6. Switch the role to **AOC Planner**. Approve is no longer available.

## Optional: real LLM for the copilot
The copilot answers from console data offline. To let it answer free-form questions with an LLM, add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in Vercel → Project → Settings → Environment Variables and redeploy. `api/ask.js` is called only for questions the built-in explainer can't answer; the key stays on the server.

Stack: React 18 + Vite 5. State lives in the browser (saved across refresh; **Reset scenario** clears it).
