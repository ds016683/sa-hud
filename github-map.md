# GitHub Repository Map
**Last updated:** 2026-04-10  
**Account:** ds016683 (david.smith@thirdhorizon.com)

---

## Active Repos — Quick Reference

| Repo | Visibility | Live URL | Hosting | Supabase | Status |
|---|---|---|---|---|---|
| sa-hud | Public | https://ds016683.github.io/sa-hud/ | GitHub Pages | ✅ Yes | Active — primary HUD/Command Center |
| project-diablo | Private | https://project-diablo.vercel.app | Vercel | ❓ Check | Active — SA commercialization |
| nacdd-knowledge-platform | Private | https://nacdd-knowledge-platform.vercel.app | Vercel | ❓ Check | Active — client demo |
| lumen-api | Private | (no public URL) | PM2 / VPS | ❌ No | Active — Vapi voice backend, runs on DavidPC or server |
| aha-cardiovascular-index | Public | https://ds016683.github.io/aha-cardiovascular-index/ | GitHub Pages | ❓ Check | Active — AHA prevention index tracker |
| apex-media-chicago | Public | https://ds016683.github.io/apex-media-chicago/ | GitHub Pages | ❓ Check | Unknown — private studio booking |
| project-dante | Public | https://ds016683.github.io/project-dante/ | GitHub Pages | ❓ Check | Active — SA book collab w/ Sabina |
| mma-tracker | Public | https://ds016683.github.io/mma-tracker/ | GitHub Pages | ❓ Check | Unknown — no description |
| bh-rate-intelligence | Private | (no public URL) | Vercel (vercel.json) | ❓ Check | Active — BH rate analytics platform |
| project-heart | Private | (no public URL) | None detected | ❓ Check | Likely deprecated — THS x AHA dashboard (noted in MEMORY.md as "premature, to delete") |
| values-deck | Public | (no public URL) | None | ❌ No | One-off — Sabina values exercise |

---

## Detailed Repo Profiles

### sa-hud
- **Description:** Sovereign Architect HUD / Command Center — daily intelligence dashboard
- **Stack:** React/Vite → GitHub Pages via `npm run deploy` (gh-pages)
- **Supabase:** ✅ `cmuvomnmaoseccxpeuxq` — `briefings` + `cost_tracking` tables
- **Key files:** `src/components/EcosystemPage.jsx`, `src/components/DailyBriefingsPage.jsx`, `src/components/HUD.jsx`
- **Crons:** 8:30 PM daily (briefings + summaries), Granola checker every 15 min M-F
- **Live:** https://ds016683.github.io/sa-hud/
- **Notes:** Primary Mr. Build target. Claude Code works via SSH to Mac (~/sa-hud clone). Last built Apr 9.

### project-diablo
- **Description:** Commercializing the Sovereign Architect framework — assessment/personality app
- **Stack:** React/Vite → Vercel
- **Live:** https://project-diablo.vercel.app
- **Notes:** Private beta May-June target. Sabina doing external user test. Gate 2 (deep follow-up questions) is next.

### nacdd-knowledge-platform
- **Description:** NACDD AI-Powered Knowledge Platform — Demo/Sandbox for client
- **Stack:** Unknown → Vercel
- **Live:** https://nacdd-knowledge-platform.vercel.app
- **Notes:** Client-facing demo. Private repo.

### lumen-api
- **Description:** Vapi webhook backend — gives Lumen voice calls access to David's context and tools
- **Stack:** Node.js/Express, PM2 process manager
- **Hosting:** Runs on VPS/DavidPC (not Vercel or Fly.io — confirmed via ecosystem.config.cjs PM2 config)
- **Notes:** Vapi assistant ID `62dd6701-f83b-4077-8805-9731186b62ce`. Phone `+16308691113`. Last pushed Apr 10.

### bh-rate-intelligence
- **Description:** Behavioral health rate analytics platform
- **Stack:** Unknown → Vercel (vercel.json present)
- **Notes:** Private. No live URL in GitHub. Likely internal THS tool.

### aha-cardiovascular-index
- **Description:** AHA Cardiovascular Prevention Index — evidence-based guideline tracker
- **Stack:** GitHub Pages
- **Live:** https://ds016683.github.io/aha-cardiovascular-index/

### project-dante
- **Description:** Sovereign Architect book + product collaboration (David Smith + Sabina Beachdell)
- **Stack:** GitHub Pages
- **Live:** https://ds016683.github.io/project-dante/

### project-heart
- **Description:** THS x AHA Cardiovascular Transparency Dashboard
- **Notes:** ⚠️ Flagged in MEMORY.md as "premature, to delete." Likely dead.

### apex-media-chicago
- **Description:** Private studio booking & management
- **Stack:** GitHub Pages

### mma-tracker
- **Notes:** No description. Public. Likely MMA (Alex Meyer's file triage work?).

---

## Hosting Summary

| Platform | Repos |
|---|---|
| GitHub Pages | sa-hud, aha-cardiovascular-index, apex-media-chicago, project-dante, mma-tracker |
| Vercel | project-diablo, nacdd-knowledge-platform, bh-rate-intelligence |
| PM2 / VPS (DavidPC) | lumen-api |
| Fly.io | None detected |

## Supabase Summary

| Project | Repo | URL |
|---|---|---|
| SA HUD | sa-hud | https://cmuvomnmaoseccxpeuxq.supabase.co |
| General/Other | (various) | https://fbqcecmwviuixohlwemi.supabase.co |

---

## Mr. Build's Operational Notes

**Claude Code access path:**
1. SSH to Mac M5 (`davidsmith@100.73.172.56`) via `C:\Users\david\.ssh\id_ed25519`
2. API key injected from `workspace/secrets.json → anthropic_api_key`
3. Claude binary at `/opt/homebrew/bin/claude`
4. sa-hud cloned at `~/sa-hud` on Mac
5. project-diablo cloned at `~/project-diablo` on Mac
6. Deploy: `npm run deploy` (gh-pages) for sa-hud; Vercel auto-deploys from git push for Diablo

**What Mr. Build can do autonomously:**
- Read/write any file in any Mac repo via SSH
- Run Claude Code (`--print --permission-mode bypassPermissions`) for heavy lifting
- `npm run deploy` to push sa-hud to GitHub Pages
- `git push` to trigger Vercel auto-deploy for project-diablo
- Query/write Supabase via API keys in secrets.json

**What requires David:**
- Fly.io (not installed/authed on Mac)
- Any Vercel dashboard config changes
- New repo creation or GitHub settings changes
