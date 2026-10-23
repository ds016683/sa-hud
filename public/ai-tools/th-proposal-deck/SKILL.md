---
name: th-proposal-deck
description: Build a gated, interactive client proposal on the Third Horizon proposals surface (proposals.thirdhorizon.com), in the CIP executive-deck canon, with an ROI calculator, a simplified economics read, a month-scale plan with discrete pricing, and an optional working wireframe. Use when a Third Horizon proposal, pitch, or scope-of-work should ship as a link and an access code rather than a file, or when someone says "proposal deck", "proposal surface", or "like the AMA proposal". Born on the AMA Independent Practice Data Workshop build, 10/22 to 10/23.
---

# Third Horizon Proposal Deck

A proposal ships as a URL and an access code. The reader gets a 16:9 interactive
deck in the CIP canon with a contents rail, slide addressing (`?s=N`), click-to-open
detail everywhere money or time appears, and, when the work includes software, a
live wireframe behind the same gate. The repo is
`Third-Horizon-Strategies/th-proposals`, local clone `~/builds/th-proposals`,
Vercel project `th-proposals` on the team scope. Production is git-connected:
push to main deploys proposals.thirdhorizon.com.

## The surface

- **Registry**: `lib/proposals.ts`. One entry per proposal: slug, label, slides,
  access code (override per deploy with `PROPOSAL_CODE_<SLUG>`). This module is
  `server-only`; never import it, or any content file, into a client component.
- **Content**: `content/<slug>.ts` exporting `ExecSlide[]`. All copy lives here,
  nothing in components. The slide kinds that carry a proposal: `title` (guest
  logo up top, TH brand subdued), `divider`, `snapshot` (prose, bullet list, a
  quad of question cards with range bars, a gold ask box), `partner` (three
  roled cards; `skin: "ama"`-style reskins and a `cta` door to a live surface),
  `phases` (numbered moves with Deliverables tags), `roi-calc`, `econ-read`
  (the simplified best-guess economics: big tiles, favorable ones in the
  positive green, the five-year chart beneath), `timeline` (month gantt M1..Mn,
  pricing table with per-line delivery detail, a project-plan modal), `closing`.
- **Viewer**: `components/executive/exec-deck.tsx` plus
  `exec-slides.module.css`. CIP canon: one navy surface, Lora serif story
  beats, Instrument Sans chrome, mono uppercase eyebrows, gold for wayfinding
  only, the confidentiality footer. Phones get a Contents dropdown and
  single-column slides; never hand a client a link that only works on a laptop.

## The ROI calculator

One source of truth: a `ROI_KNOBS` array in the content file. Each knob carries
`low`, `high`, optional `start`, a mad-lib `group` (How Many · At What Price ·
To Cover What Cost), and three explainer texts: `define` (what it is),
`whyRange` (why the endpoints sit where they do), `whyMid` (why it starts
there). The same knobs feed the thesis slide's question cards through
`knobRange()`, so a range never drifts between slides. Two pills: Third
Horizon Believes (locked, stated figures) and Your Scenario (sliders, deltas
against our read, dashed baseline on the chart). Model rules that held up in
review: capital is fully expensed at time zero, never amortized, so breakeven
clears the true all-in number; acquisition pays on new buyers only; state the
conservative choices on the slide and mean them.

## House style, non-negotiable

- Qualified declaratives: nothing stated as known unless both sides know it.
  "We believe", "our starting read", "a draft for discussion".
- No em dashes, anywhere. Title Case labels, mono eyebrows uppercase.
- Month-scale language for month-scale work: M1 through Mn, never day counts.
- Second person to the named readers; their verbatim language where they gave it.
- Every figure the reader can click opens its reasoning.

## Security canon (post 10/23, non-negotiable)

The 10/22 build shipped content into public static bundles behind a page-level
gate; the 10/23 lockdown is now the floor for every proposal:

- Proposal pages are `dynamic = "force-dynamic"` and call `requireProposal(slug)`
  server-side. Any page under the slug (a wireframe included) does the same.
- Sessions are expiring signed tokens (`lib/gate.ts`), verified on every
  request; the proxy covers page, RSC, segment and data paths and sets
  no-store caching on everything.
- Before any share link goes out: `npm run build`, then
  `node --experimental-strip-types tests/access-control.mjs`. Every check
  passes or nothing ships. The suite proves the build emits no public
  proposal payload.

## Workflow

1. Stand up content and registry entry; dev server via the `th-proposals`
   launch entry; verify at 1512x945 and at the mobile preset.
2. Edit under the Editing Protocol: every input a punchlist row, batches
   commit separately, preview per batch.
3. Standing draft alias for reviewers: `vercel deploy`, then
   `vercel alias set <deploy> <slug>-draft.thirdhorizon.com`. Reviewers get
   the draft link and the code; production stays held.
4. Ship only on David's word: push main. Record the ship on a Production
   Summary (the Third Horizon form: Business Development · Proposal), including
   the retire date, and put it in Live Files.
5. Inline prose passes: the deck's dev-only Edit Text mode autosaves each
   slide's text to `.edits/<slug>/`; fold autosaves into the content file
   verbatim, then clear them.
