---
name: th-longform
description: Build a gated, interactive long-form document on the Third Horizon proposals surface (proposals.thirdhorizon.com) in the CIP executive canon, with the deck's contents rail on the left, scrolling prose-anchored pages, tables that open to their lines and their reasoning, charts with hover readouts, embedded documents, and a Next at the very foot of every page. Use when a Third Horizon review, memo, working paper, brief, or report should read like a document rather than flip like a deck, or when someone says "long-form", "like the finance review", "a reader", or "pages with next buttons". Born on the Company Finance Review, 10/25; named th-longform by David the same night.
---

# Third Horizon Long-Form Document

A long-form document ships the way a proposal does: a URL and an access code on
the proposals surface. The reader gets the AMA proposal's chassis (the bar, the
standing contents rail on the left, the CIP canon) with one difference: instead
of 16:9 slides, each entry in the rail is a page the reader scrolls, prose
anchored, with tables, charts and documents set inline and a Next button at the
very bottom. Repo `Third-Horizon-Strategies/th-proposals`, clone
`~/builds/th-proposals`, Vercel project `th-proposals` on the team scope.

The deck (`th-proposal-deck`) and the document share the registry, the gate, the
bar, the rail and every token. They differ only in the page.

## The surface

- **Layout**: `lib/proposals.ts` entries carry `layout: "document"` and `pages`
  (a `DocPage[]`) instead of slides. `slides: []` keeps the deck type honest.
- **Content**: `content/<slug>.ts` exports the pages, typed by `content/doc.ts`.
  All copy lives there, nothing in components. Figures that come from a
  workbook live in a generated sibling, `content/<slug>-data.ts`, written by a
  script and never hand-edited (regenerate, then rebuild).
- **Route**: a document gets its OWN route folder, `app/<slug>/page.tsx` and
  `app/<slug>/unlock/page.tsx`, copied from the finance review's. The shared
  `app/[slug]` route serves the shipped decks and stays untouched (David 10/25:
  the AMA proposal stays absolutely locked in place). A static segment wins over
  the dynamic one, so the gate, the registry and the unlock API need no change.
- **Reader**: `components/document/doc-reader.tsx` + `doc.module.css`. Addressing
  is `?s=N`, 1-based, the same as the deck, so the unlock redirect and deep links
  behave the same way. Arrow keys turn pages; the page scrolls on its own.
  Under 1024px the rail folds into a Contents dropdown and the page runs full
  width.

## Anatomy of a page

- **Cover** (`cover` on the first page): arches, wordmark, mono kicker, the serif
  heading, the subtitle in the owner's verbatim language (the mission's
  description, the engagement's charter), a rule, "Prepared for", the date or
  the read stamp, then the `contents` block and a Begin button into page 1.
- **Page head**: mono kicker (`1 · The Pro Forma`), then the Lora title with an
  italic accent phrase marked `*like this*`. The rail and the buttons read the
  title plain.
- **Body**: a run of blocks in reading order. The first block is a `lead` (bold
  first sentence, dropcap in the bright accent), then prose and exhibits in
  whatever order the argument needs. One idea per page; a page is as long as
  its argument, never padded.
- **Foot**: Previous (ghost) and Next (gold outline, the next page's title) on
  one line, the legal line and the page number beneath. The last page says
  "End of the document, for now" until the next page lands.

## A page switch

A page may carry a `toggle` (content/doc.ts): a label, an off note, an on note
and `blocksOn`, a second complete run of blocks. The reader draws a slim sticky
bar at the top of the column with the switch, off on every page open, and
swaps the whole block run when it is on, so every figure, table and chart on
the page moves together. Build both runs from one function of a boolean in
the content file (the finance review's `page2Blocks(on)`); never hand-maintain
two copies. Born for the purple assumptions on the finance review, 10/25.

## Block kinds (content/doc.ts)

| kind | what it is |
|---|---|
| `lead` | the page's first paragraph: `bold` first sentence, then `text` |
| `para` | a paragraph, 72ch measure, `*italics*` allowed |
| `h2` | a section head inside the page |
| `list` | accent-dotted bullets |
| `callout` | an accent-ruled aside with a mono eyebrow (For the Review, Open Question) |
| `stats` | a row of four tiles: mono label, serif figure, one-line qualifier; `tone` pos or neg |
| `table` | columns, an optional second header line (Actual, Projected), rows with `style` indent / total / net / final; a row's `children` expand beneath it on click (a practice area opening to its client lines); a row's `note` opens its reasoning beneath it; a row's `flag` draws a small chip beside the label (Assumption, Yellow in the sheet); `totalLabel` adds a trailing summary column; `source` and `expandHint` sit under the table |
| `chart` | grouped bars by category with an optional `line` read as a strip beneath the categories; hover reads every series for that category; `estimateFrom` draws the categories from that index on outlined behind a Closed / Estimate divider |
| `source` | the small source line |
| `document` | a card that opens a file or a live surface in a new tab |
| `contents` | the cover's list of pages, every row jumps |

Add a kind only when a page needs a shape none of these carry; add it to
`doc.ts`, render it in `doc-reader.tsx`, style it in `doc.module.css`, and
carry it back here.

## Data discipline

- Row labels, column labels and section names are the source's own, verbatim.
  Never reword a workbook's label; never round a stated figure differently on
  two pages.
- Workbook figures come through a generator (see `references/tools/build_pf_data.py`:
  openpyxl reads the sheet, writes `content/<slug>-data.ts` with the read date
  stamped in the file). The content file imports the data and derives its
  prose figures from it with small helpers, so a regenerate moves every number
  in the prose with the table.
- Every figure the reader can click opens its reasoning: totals carry a `note`
  that says what the row is, how the sheet computes it, and what it does not
  tie to. Derived columns (a Jan to Sep sum) say so in the source line.
- Quirks in the source (a typed total that the lines do not add to, a label
  that says Projected on a closed month) are stated plainly in the page and in
  the note, never silently fixed.

## House style, non-negotiable

- Qualified declaratives: nothing stated as known unless both sides know it.
  Internal reviews written for David may state the figures flat; anything a
  client reads says "we believe", "our read".
- No em dashes, anywhere. Title Case labels, mono eyebrows uppercase.
- Second person to the named reader; the owner's verbatim language on the cover.
- Prose leads, exhibits support. A table or chart never opens a page.
- One accent deck-wide; gold is wayfinding (the Next button, the rail nodes),
  never data. Favorable figures read in the positive green, unfavorable in
  coral, on this surface.

## Security canon (the floor, from the 10/23 lockdown)

- The route is `dynamic = "force-dynamic"` and calls `requireProposal(slug)`
  server-side; the unlock page echoes nothing about the code.
- Before any share link: `rm -rf .next && npx next build`, then
  `node --experimental-strip-types tests/access-control.mjs` (the AMA suite,
  all 19 green), then `references/tools/check_gate.sh <port>` edited to the new
  slug (anonymous denied, RSC denied, wrong code bounces, right code grants
  `thp_<slug>`, tampered cookie denied, no static payload in the build).

## Workflow

1. Registry entry (slug, label, preparedFor, code), content file, data file
   if there is a workbook, the route folder copied from the finance review's.
2. Dev server via the `th-proposals` launch entry; verify at desktop width and
   the mobile preset; click every expanding row and every note; hover the chart.
3. Build and the checks above.
4. Preview deploy and a standing alias: `vercel deploy --yes --scope
   third-horizon-58c0ce68`, then `vercel alias set <url> <slug>.thirdhorizon.com
   --scope third-horizon-58c0ce68`. The reader gets the alias and the code;
   production holds.
5. Ship only on David's word: merge to main, push, re-run the checks against
   production. Record the ship on a Production Summary and put the launch link
   in Live Files on the item it serves.
6. Pages arrive one at a time. Each new page is a content edit, a rebuild and a
   re-alias; the rail grows by one node and the previous last page's foot turns
   from "End of the document, for now" into Next.

## What is in references

- `chassis/`: `doc.ts` (the types), `doc-reader.tsx` and `doc.module.css` (the
  reader), `route-page.tsx` and `route-unlock-page.tsx` (the route folder to
  copy, change `SLUG`).
- `example/`: the Company Finance Review's `finance-review.ts` (cover, page 1 on
  the NetSuite income statement with the pro forma beside it, page 2 locking
  the closed months and estimating the rest from the sheet's elements) and its
  generated `finance-review-ns-data.ts`, `finance-review-data.ts` and
  `finance-review-q4-data.ts`.
- `tools/`: `build_pf_data.py` (a workbook to data-file generator), `ns_pl_jan_sep.py`
  (the NetSuite income statement over SuiteQL, by account and period, with a
  tie-out) and `build_ns_data.py` (the statement tree to data file), `build_pf_q4.py` (a
  forecast quarter from a pro forma sheet with color flags and top-line
  tie-outs), `ns_rev_lines.py` (NetSuite income by account, client and Project
  ID, with journal entries re-attributed by the invoice they cite and lines
  with no customer attributed by their Project ID), and `check_gate.sh` (the
  gate checks).

## Standing notes

- The document layout lives on branch `feat/finance-review` of th-proposals
  until David ships it (merge to main, push). Until then a new document is
  built on that branch, or on a branch cut from it.
- The HUD card lives under Resources > AI Tools > Skills Files with this zip.
- The deck skill (`th-proposal-deck`) and this one share everything but the
  page; a change to the bar, the rail, the gate or the tokens is carried to
  both.
