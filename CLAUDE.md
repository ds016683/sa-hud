# CLAUDE.md

## Project Overview

Sovereign Architect HUD — a personal operating system disguised as a game. Browser-based dashboard for tracking personal sovereignty (energy), managing activity through an 8-phase Identity Loop, and monitoring psychological shadow patterns. Dark fantasy RPG aesthetic.

**Live site:** https://ds016683.github.io/sa-hud/
**Repo:** https://github.com/ds016683/sa-hud.git
**GitHub account:** ds016683 (`david@thirdhorizon.com`)

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS 3 with custom dark fantasy theme
- Lucide React icons
- Three.js + React Three Fiber (included but currently unused)
- ESLint for linting
- No TypeScript — plain JSX

## Commands

```bash
npm run dev       # Dev server at localhost:5173 (base path: /sa-hud/)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run deploy    # Build + deploy to GitHub Pages via gh-pages
```

## Deployment

- GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- Base path: `/sa-hud/` (set in `vite.config.js`)
- Push to `main` triggers auto-deploy

## Architecture

15 components in `src/components/`, orchestrated by `HUD.jsx` (main state manager):

| Component | Purpose |
|-----------|---------|
| `HUD.jsx` | Root orchestrator — all state, logging, modals, time context |
| `ResourceMeter.jsx` | Sovereignty level gauge (0-100%) |
| `StickyResourceBar.jsx` | Fixed header showing current sovereignty |
| `LoopStatus.jsx` | Current phase of 8-phase Identity Loop |
| `ActiveSkills.jsx` | 5 skills with Low/Medium/High intensity |
| `HorizontalSkills.jsx` | Mobile-friendly horizontal skill layout |
| `ShadowMonitor.jsx` | 4 shadow mechanics with antidotes |
| `DailyPrompts.jsx` | Time-aware rotating check-in questions |
| `ActivityLog.jsx` | Persistent log of all actions |
| `OnboardingFlow.jsx` | First-load setup modals |
| `FirstTimeNudges.jsx` | Contextual guidance for new users |
| `NotePrompt.jsx` | Modal for optional notes on actions |

Custom hook: `useActivityLog` — manages all logging and localStorage persistence.

## Game Systems

**Identity Loop (8 phases):** Intake, Reconnaissance, Analysis, Design, Execution, Holding, Release, Recovery — each with energy cost (Low/Medium/High/Restoration).

**5 Active Skills:** Sovereign Yield, Walling, Gordian Cut, Decisive Intervention, Galvanic Surge.

**4 Shadow Mechanics:** Over-Control, Isolation Spiral, Intensity Addiction, False Responsibility — each with specific antidotes.

**Activity Log:** Persistent localStorage storage with exportable readings and arc-based pattern analysis (Recovery, Crisis, Decline, Stability arcs).

## Design System

Dark fantasy / RPG theme (Diablo-inspired):
- Custom Tailwind colors: `game-dark`, `game-darker`, `game-panel`, `game-border`, `game-gold`, `game-red`, `game-green`, `game-blue`, `game-purple`
- Fonts: Cinzel (serif headings), Courier New (mono body)
- Custom animations: `pulse-slow`, `glow`
- Gold gradient borders with drop shadows and inset glows

## Data Storage

Client-only — no backend. All state in `localStorage`:
- Key: `sovereign-architect-activity-log`
