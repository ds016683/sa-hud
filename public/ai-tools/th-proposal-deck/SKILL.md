---
name: th-proposal-deck
description: Build a gated, interactive client proposal on the Third Horizon proposals surface (proposals.thirdhorizon.com) in the universal Third Horizon proposal structure: Background, Objective, a client-specific section, Proposed Scope of Work, Timeline and Economics, How We'll Work Together. Use when a Third Horizon proposal, pitch, or scope-of-work should ship as a link and an access code rather than a file, or when someone says "proposal deck", "proposal surface", "the proposal skill", "like the AMA proposal", or "like the Sus proposal". Born on the AMA Independent Practice Data Workshop build, 10/22 to 10/23; made universal on the APF Sus pilot, 11/18.
---

# Third Horizon Proposal Deck

A proposal ships as a URL and an access code. The reader gets a 16:9 interactive
deck in the CIP canon with a contents rail, slide addressing (`?s=N`), and
click-to-open detail wherever money or time appears. The repo is
`Third-Horizon-Strategies/th-proposals`, local clone `~/builds/th-proposals`,
Vercel project `th-proposals` on the team scope. Production is git-connected:
push to main deploys proposals.thirdhorizon.com.

## The universal structure (David 11/18, non-negotiable)

Every proposal has these sections in this order. Start by copying
`content/_starter.ts`, which is this skeleton with prompts where the copy goes.

| # | Section | Slides | Slide kinds |
|---|---|---|---|
| | Title | the client's mark leads, Third Horizon at the foot | `title` |
| 1 | Background | What We Heard · What You Invited Us To Do | `snapshot` with a `rail`, `partner` |
| 2 | Objective | The Thesis · What We Are Proposing | `snapshot` with a `rail`, `partner` |
| 3 | The client-specific section | whatever fits this client | see below |
| 4 | Proposed Scope Of Work | What Will Be True · Scope Of Work · Deliverables | `trail`, `scope`, `deliverables` |
| 5 | Timeline and Economics | Timeline · Economics · Next Steps | `timeline`, `economics`, `phases` |
| 6 | How We'll Work Together | a picture of the shared client platform | `picture` |
| | Close | | `closing` |

Rules that go with it:

- **Section 3 is a natural placeholder, never a fixed title.** Name it for what
  it holds and give it the tool that fits the client. AMA: "ROI Calculator"
  (`econ-read` then `roi-calc`). APF Sus: "What's Been Done So Far" (`usage`, a
  live utilization feed). A wireframe door (`partner` with a `cta`) also
  belongs here. It sits before the scope of work.
- **The Timeline is always a gantt** (`timeline` with `months` and one bar per
  gate; the step detail lives on the Scope Of Work slide). Pricing does not ride beside it; Economics is
  its own slide (`economics`), each line opening what is delivered.
- **Four cards read as a 2x2**, never three and one (the viewer does this for a `phases` slide with four items).
- **Proposed Scope Of Work is four slides** (David 11/18, the shape of his
  proposals since 2020: Domains with Phases under them):
  1. **What Will Be True** (`trail`): the statement of what will be true at
     the end of the engagement, and above it what must be true along the way,
     drawn as the vertical drop from the HUD's mission cards and ending at a
     gold star. Each of those is a **Gate** when the work is sequenced and a
     **Domain** when it is concurrent (`unit`). A high-level snapshot. David's
     own overview paragraph leads the slide.
  2. **Scope Of Work** (`scope`): one detailed gantt by week. Gates as rows,
     their Steps indented under them, who on the team does each step, and a
     price on every step and gate, summed at the foot. No lead paragraph: the
     gantt needs the whole slide to read at full size. Price with the
     `th-proposal-pricing` skill; until David rules on it, every price is a
     draft and the reply says so.
  3. **Deliverables** (`deliverables`): one card per deliverable with
     "Expected Delivery On <date>". A click flips the card to a picture of
     what it will be; the arrows open the picture larger. Pictures are
     stylized, marked "Illustration", and live in `media/<slug>/`.
  The team has no slide of its own (David 11/18). It sits on Scope Of Work:
  `team` on the `scope` slide draws a row of circle headshots above the gantt,
  the lead (`lead: true`, the Chief Architect) larger and far left, the rest
  to the right, each with name and role. Small copies of the same circles
  stamp the Who column of each step (steps name people by first name).
  Hovering any circle, large or small, grays everyone else out and lifts that
  person; a click opens the full bio. Bios are verbatim from the roster in
  `content/team.ts` (source `~/builds/th-cim/components/sections/team.tsx`,
  `bioFull`); never reword one. Headshots are in `~/builds/th-cim/public/team/`;
  copy them into `media/<slug>/` so they sit behind the gate.
- **How We'll Work Together shows the client platform** as a picture for now
  (see The Client Platform below), so the reader knows it is coming.
- The AMA deck (`content/ama.ts`) predates this structure and stays as it is.
  Do not restructure it unless David asks.

## The surface

- **Registry**: `lib/proposals.ts`. One entry per proposal: slug, label,
  preparedFor, slides, access code (override per deploy with
  `PROPOSAL_CODE_<SLUG>`), and an optional `hydrate` that fills live data into
  slides at request time. This module is `server-only`; never import it, or
  any content file, into a client component.
- **Content**: `content/<slug>.ts` exporting `ExecSlide[]`. All copy lives
  here, nothing in components. Types are in `content/slides.ts`.
- **Viewer**: `components/executive/exec-deck.tsx` plus
  `exec-slides.module.css`. One navy surface, Lora serif story beats,
  Instrument Sans for everything else, gold for wayfinding only, the
  confidentiality line. The left spine opens collapsed: a section shows its
  slides when the reader is in it or clicks its header. Phones get a Contents dropdown and single-column
  slides; never hand a client a link that only works on a laptop.
- **Pictures**: put them in `media/<slug>/` and reference them as
  `/<slug>/media/<file>`. That route sits behind the proposal's gate. Nothing
  proposal-specific goes in `public/`; only brand marks do.

## The client-specific tools

- **ROI calculator** (`roi-calc`, with `econ-read` ahead of it): one source of
  truth, a `ROI_KNOBS` array in the content file. Each knob carries `low`,
  `high`, optional `start`, a `group` (How Many · At What Price · To Cover What
  Cost), and three explainer texts: `define`, `whyRange`, `whyMid`. The same
  knobs feed the thesis slide's question cards through `knobRange()`. Two
  pills: Third Horizon Believes (locked) and Your Scenario (sliders). Capital
  is fully expensed at time zero; acquisition pays on new buyers only; state
  the conservative choices on the slide and mean them.
- **Utilization feed** (`usage`): use only. An exhibit of runs per day that
  fills the lower half of the slide, one `note` set on the chart as the
  annotation, and up to three figures that draw themselves (`viz: "dots"` for
  a count, `viz: "bar"` for lengths on one shared scale). Look at it at full
  size before calling it done. No names, no questions, no
  text from users. The slide's `days` and `stats` are empty in the content
  file and filled by the registry entry's `hydrate` on the server.
  `lib/lab-usage.ts` is the pattern: it reads a source with a server-side key
  (`LAB_ADMIN_KEY`), keeps counts and durations, drops everything else, and
  revalidates every five minutes.
- **Wireframe door**: a `partner` slide with a `cta` to a page under the slug
  (`app/<slug>/prototype`), which must call `requireProposal` like the deck.

## The client platform

Engagements get a shared platform at `clients.thirdhorizon.com/<client>` (repo
`Third-Horizon-Strategies/th-clients`, `~/builds/th-clients`): a left spine
with the statement of work, the analytics, and the links. It deploys by
command only (`vercel --prod --yes --scope third-horizon-58c0ce68`). For a
proposal, take a picture of it for the How We'll Work Together slide: run its
local production build, capture the page with headless Chrome at 1440 by 900
and scale factor 2, and save it to `media/<slug>/platform.jpg`.

## Less is more (David 11/18, the universal maxim on words)

- **Never add text whose job is to describe.** No caption under a figure, no
  label naming a block ("The Frame You Shared"), no sub-line explaining a
  row, no qualifier under an exhibit, no picture caption. David reads that
  text as clutter the model drops everywhere. He will say what to bring in.
  The optional fields exist (`sub`, `shape`, `qualifier`, `caption`); leave
  them empty unless he asks.
- **Text is readable, not shouting** (David 11/18, tuned by eye on the Sus
  deck): body copy on a slide reads at about 20.5 to 23.5 px at the deck's
  design size, supporting text no smaller than 15 px, and the body reads marginally
  bigger than the left spine (spine section names about 16.5 px, never under 13). If a slide needs smaller type to
  fit, it has too many words.
- **No quadrants.** When a slide needs "here is what we have got", use the
  hanging line: `rail: { title, items }` on a `snapshot` slide, a serif title
  over numbered points down one line. When four points feed each other, add
  `shape: "loop"` and they draw as a ring with an arrow from each to the
  next. The quad and its ask box remain only for the AMA deck.
- **One header per thing.** A card, a block or a slide gets one header that carries the substance, in the accent blue. Never a small label above it naming the kind of thing it is ("The Ask", "The Frame"); the viewer no longer shows a card's `role` (David 11/18: "why do llms like giving everything two headers?").
- **Never a graphic on a surface on a surface.** A chart, a figure or a diagram sits straight on the slide. No panel, card or filled box behind it, and no cards behind the numbers beside it, unless David says so (11/18: "shouldn't have a graphic on a surface on a surface, ever, ever, ever unless i say").
- **Size a new element by hand to the deck's cadence.** Card body text is about 17 px and exhibit headers about 19 px. Do not let a new block ride a global percentage pass; that is how the usage exhibit ended up far too big.
- **Cards and closing lines stay quiet.** The three cards on a `partner` slide are compact, and its closing line reads as a modest serif line, not a banner (David 11/18: "taking up too much space on the slide for the minimal impact they have").
- Fewer slides, fewer words on each, one idea per slide.

## House style, non-negotiable

- Qualified declaratives: nothing stated as known unless both sides know it.
  "We believe", "our starting read", "a draft for discussion".
- No em dashes, anywhere.
- Title Case for every title, subtitle, header, and label, with the first letter of every word capitalized, small words included (David 11/18: "A Pilot Built On The Basic Science Test For Public Discourse"). Body sentences stay sentences.
- No small tracked uppercase labels and no kicker stacked above a title
  (David 11/7 and 11/9). Labels read in the body face at 12 px or larger with
  normal tracking. A chart or table gets an exhibit header in the serif:
  "Exhibit 1 · Runs Per Day", its qualifier in the body face under it. The
  brand wordmark is the one exception. The draft line on the title slide
  reads under the heading, never above it.
- Month-scale language for month-scale work: M1 through Mn, never day counts.
- Second person to the named readers; their verbatim language where they gave it.
- Every figure the reader can click opens its reasoning.
- A price that is not settled reads "To Be Confirmed". Never invent a number.

## Security canon (post 10/23, non-negotiable)

- Proposal pages are `dynamic = "force-dynamic"` and call
  `requireProposal(slug)` server-side. Any page or route under the slug (a
  wireframe, the media route) does the same.
- Sessions are expiring signed tokens (`lib/gate.ts`), verified on every
  request; the proxy covers page, RSC, segment and data paths and sets
  no-store caching on everything.
- Live data is read on the server with a server-side key and reaches the
  browser only as rendered figures.
- Before any share link goes out: `npm run build`, then
  `node --experimental-strip-types tests/access-control.mjs`. Every check
  passes or nothing ships.

## Workflow

1. Copy `content/_starter.ts` to `content/<slug>.ts`, fill it, add the
   registry entry. Dev server via the `th-proposals` launch entry (port 3016);
   verify at 1512x945 and at the mobile preset.
2. David edits in the deck's dev-only Edit Text mode, which autosaves each
   slide to `.edits/<slug>/`. On "fold", put the autosaves into the content
   file verbatim, then clear them. Other input runs under the Editing
   Protocol when David starts it.
3. Standing draft alias for reviewers when production must hold:
   `vercel deploy`, then `vercel alias set <deploy> <slug>-draft.thirdhorizon.com`.
4. Ship on David's word: push main. Put the launch link in Live Files with
   the access code in its note. Nothing goes to the client until David sends it.
