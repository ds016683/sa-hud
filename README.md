# Sovereign Architect HUD

A personal operating system disguised as a game. Browser-based HUD for tracking sovereignty, managing energy expenditure, and maintaining psychological stability through the chaos. Built with React + Tailwind CSS.

## Live Demo

https://ds016683.github.io/sa-hud/

## Core Systems

### Sovereignty Tracking
- Real-time sovereignty meter (0-100%)
- Manual adjustment with note capture
- Automatic tracking of gains/losses from skill use
- Visual status indicators (Critical → Depleted → Strained → Healthy)

### Identity Loop (8 Phases)
| Phase | Cost | Purpose |
|-------|------|---------|
| Intake | Low | Strategic learning, absorbing information |
| Reconnaissance | Low | Watching, noticing patterns, gathering intel |
| Analysis | Medium | Making sense of it, strategic thinking |
| Design | Medium | Solo creation work, building, writing |
| Execution | High | Shipping, decisions, external output |
| Holding | Highest | Being present for others, meetings, leadership |
| Release | Restoration | Letting go, surrendering outcomes |
| Recovery | Restoration | Rest, solitude, integration |

Each phase has detailed cards explaining signals, notes, and transition guidance.

### Active Skills
Five skills with intensity levels (Low/Med/High):

- **Sovereign Yield** — Restore through chosen surrender
- **Walling** — Set boundaries, name what isn't yours
- **Gordian Cut** — Cut through complexity to the real problem
- **Decisive Intervention** — Force movement when systems stall
- **Galvanic Surge** — Rally others (high personal cost)

### Shadow Mechanics
Four failure modes to track:

- **Over-Control State** — The Protector gripping tight
- **Isolation Spiral** — Withdrawal from connection
- **Intensity Addiction** — Seeking chaos over calm
- **False Responsibility** — Carrying what isn't yours

Each shadow has intensity tracking and specific antidotes.

### Activity Log & Readings
- Persistent activity log (localStorage)
- Every action logged with optional notes
- Exportable log with interpretive reading
- Arc-based analysis (not just pattern matching)
- Recognizes recovery, crisis, decline, and stability patterns

### Onboarding Flow
Stacked modal sequence on first load:
1. **Sovereignty Check** — Where are your resources?
2. **Phase Selection** — What are you doing?
3. **Shadow Scan** — Any patterns active?

Session start is logged for reading context.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173/sa-hud/

## Design Philosophy

> "You are specialized, not broken."

The HUD makes invisible patterns visible:
- Energy expenditure has real costs — track them
- "Holding" for others is the highest drain but rarely named
- The loop cannot complete without Release
- Awareness without action is just spectatorship

## Tech Stack

- React 18
- Tailwind CSS
- Vite
- localStorage for persistence

---

**Version 1.2** | Meaning Under Chaos
