---
name: th-longform
description: Build a gated, interactive long-form document on Third Horizon's own long-form surface (longform.thirdhorizon.com, repo th-longform) in the CIP executive canon: a standing contents rail on the left, scrolling prose-anchored pages, tables that open to their lines and their reasoning, charts with hover readouts, embedded documents, live workbook data, and a Next at the very foot of every page. A long-form document is not a proposal; it shares the proposals surface's canon and gate but lives on its own repo, registry and domain. Use when a Third Horizon review, memo, working paper, brief, analysis or report should read like a document rather than flip like a deck, or when someone says "long-form", "like the finance review", "a reader", or "pages with next buttons". Born on the Company Finance Review, 10/25; named th-longform by David the same night; cut loose from the proposals surface 10/26 on his word.
---

# Third Horizon Long-Form Document

A long-form document ships as a URL and an access code on the long-form
surface. The reader gets the CIP executive canon (the bar, the standing
contents rail on the left, the tokens) and a page per entry in the rail: prose
anchored, scrolled, with tables, charts, documents and live figures set inline,
and a Next button at the very bottom.

**It is not a proposal.** The proposals surface (`th-proposals`,
proposals.thirdhorizon.com, the `th-proposal-deck` skill) holds decks and
pitches that are sent to a client to win work. The long-form surface holds
documents: reviews, memos, working papers, briefs, analyses, reports, for
David, the team, a board or a client. Same canon, same gate, separate home.
A document that becomes a proposal moves to the proposals surface by copying
its content file across; the block types are the same by design.

Never build a document on the proposals repo, on a proposals branch, or under
a proposals alias. If a session finds itself there, stop and move.

## The surface

- **Repo** `Third-Horizon-Strategies/th-longform`, clone `~/builds/th-longform`.
  Vercel project `th-longform` on the team scope (`third-horizon-58c0ce68`),
  git-connected, production branch `main`. Domain `longform.thirdhorizon.com`.
  Each document gets a standing domain of its own, `<slug>.thirdhorizon.com`,
  added as a project domain (`vercel domains add <slug>.thirdhorizon.com` from
  the linked clone), so it follows production.
- **First use, if the repo does not exist yet**: bootstrap it from the
  proposals canon, lifting only the chassis, never the content: the Next app
  shell, `globals.css` tokens, the bar and rail components, the gate
  (`proxy.ts`, `api/unlock`, `requireDocument` as the server-side check), the
  tests in `tests/access-control.mjs`, and the reader from `references/chassis/`.
  Rename every `proposal` identifier to `document` (`lib/documents.ts`,
  `requireDocument`, cookie prefix `thl_<slug>`). No deck type, no slides, no
  AMA. Then `vercel link`, set the domain, deploy, and run the gate checks
  before the first share. Done 10/26. Two project settings the CLI leaves
  unset: `framework` must be `nextjs` (a project from `vercel project add` has
  none and deploys as static files, every route 404), and Vercel
  Authentication off (`ssoProtection` null, as on th-proposals; the document
  carries its own gate). Both are a PATCH on the project through the API.
- **Registry**: `lib/documents.ts`, one entry per document: `slug`, `label`,
  `preparedFor`, `code`, `pages` (the `DocPage[]` build). No `layout` field; every
  entry is a document.
- **Content**: `content/<slug>.ts` exports the pages, typed by `content/doc.ts`.
  All copy lives there, nothing in components. Figures that come from a
  workbook live in a generated sibling, `content/<slug>-data.ts`, written by a
  script and never hand-edited (regenerate, then rebuild).
- **Route**: the shared dynamic route `app/[slug]/page.tsx` and
  `app/[slug]/unlock/page.tsx` serve every document from the registry. There is
  no locked deck to protect here, so no per-document route folders.
- **Reader**: `components/document/doc-reader.tsx` + `doc.module.css`. Addressing
  is `?s=N`, 1-based. Arrow keys turn pages; the page scrolls on its own. Under
  1024px the rail folds into a Contents dropdown and the page runs full width.

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
bar at the top of the column with the switch, off on every page open unless
the page sets `defaultOn` (the cash worksheet's purple items open on), and
swaps the whole block run when it is on, so every figure, table and chart on
the page moves together. Build both runs from one function of a boolean in
the content file (the finance review's `page2Blocks(on)`); never hand-maintain
two copies.

## Live data from a workbook

A page can read a SharePoint workbook at request time instead of a committed
data file. The pattern (references/live/): `sharepoint.ts` (Graph app-only
token, the item's eTag and bytes; ids and the client secret from the
environment, SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID,
SHAREPOINT_CLIENT_SECRET, SHAREPOINT_SITE_ID, SHAREPOINT_PROFORMA_ITEM, set on
the Vercel project with `vercel env add`, the secret piped from the vault,
never written to the repo; for Preview on all branches the CLI demands
  `--value`, so pipe the value into a POST to the project's env API instead), `finance-live.ts` (one exceljs parser that turns
the sheet into DocRow shapes, with the sheet's bold, font and fill read for
sections and flags; purple is read by hue, any shade, font or fill, direct, theme
or indexed, so the purple rule lives in the refresh and not in the content),
`finance-source.ts` (an eTag check at most once a minute,
the workbook re-read only when it changed, the result held in memory per
server instance, a committed snapshot as the fallback), `route.ts` (the
refresh route the cron calls; it answers with the source stamp, never the
  figures, and logs one line per call so `vercel logs` shows the cron; a
  silent log stream proves nothing, it carries console output only) and `vercel.json` (the every-minute cron). Vercel runs crons on the
production deployment only, which on this surface is `main`: a document on a
preview alias relies on the request-time check until it is on main. The
content file exports a builder of the live data (`buildPages(live)`) and the
route calls it after the live read; the registry keeps the snapshot build for
its type. Each live page carries a source line: version, saved when and by
whom, read when. The snapshot script (`scripts/<slug>-snapshot.ts`, run with
`node --experimental-strip-types`) writes the fallback from a local copy with
the same parser, so the two can never drift.

## Block kinds (content/doc.ts)

| kind | what it is |
|---|---|
| `lead` | the page's first paragraph: `bold` first sentence, then `text` |
| `para` | a paragraph, 72ch measure, `*italics*` allowed |
| `h2` | a section head inside the page |
| `list` | accent-dotted bullets |
| `callout` | an accent-ruled aside with a mono eyebrow (For the Review, Open Question) |
| `stats` | a row of four tiles: mono label, serif figure, one-line qualifier; `tone` pos or neg |
| `table` | columns, an optional second header line (Actual, Projected), rows with `style` indent / total / net / final; a row's `children` expand beneath it on click; a row's `note` opens its reasoning beneath it; a row's `flag` draws a small chip beside the label; a row's `sub` is its code and draws its own column when any row carries one (`codeLabel` names the column); every table carries a Full Screen button that opens it in a portal overlay with Minimize and Escape to return; `totalLabel` adds a trailing summary column; `source` and `expandHint` sit under the table |
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
- Workbook figures come through a generator (see `references/tools/`): the
  script reads the sheet and writes `content/<slug>-data.ts` with the read date
  stamped in the file. The content file imports the data and derives its
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
- One accent surface-wide; gold is wayfinding (the Next button, the rail nodes),
  never data. Favorable figures read in the positive green, unfavorable in
  coral.

## Security canon (the floor, from the 10/23 lockdown)

- The route is `dynamic = "force-dynamic"` and calls `requireDocument(slug)`
  server-side; the unlock page echoes nothing about the code.
- Before any share link: `rm -rf .next && npx next build`, then
  `node --experimental-strip-types tests/access-control.mjs` (all green), then
  `references/tools/check_gate.sh <port>` edited to the slug (anonymous denied,
  RSC denied, wrong code bounces, right code grants `thl_<slug>`, tampered
  cookie denied, no static payload in the build). After a deploy,
  `references/tools/check_prod.sh <host>` runs the same denials against the
  live host without sending the code.

## Workflow

1. Registry entry (slug, label, preparedFor, code), content file, data file
   if there is a workbook.
2. Dev server via the `th-longform` launch entry; verify at desktop width and
   the mobile preset; click every expanding row and every note; hover the chart.
3. Build and the checks above.
4. Deploy: `vercel deploy --yes --scope third-horizon-58c0ce68` for a preview,
   `--prod` for production. The document's standing domain follows production;
   for a preview David should read first, `vercel alias set <url>
   <slug>.thirdhorizon.com --scope third-horizon-58c0ce68` moves it there until
   main catches up. The reader gets the domain and the code.
5. Production is `main`. Merge and push on David's word; crons run only there.
   Re-run the checks against production. Record the ship on a Production
   Summary and put the launch link in Live Files on the item it serves.
6. Pages arrive one at a time. Each new page is a content edit, a rebuild and a
   re-deploy; the rail grows by one node and the previous last page's foot turns
   from "End of the document, for now" into Next.

## What is in references

- `chassis/`: `doc.ts` (the types), `doc-reader.tsx`, `doc.module.css` and
  `shell.module.css` (the reader, the bar and the rail), `route-page.tsx` and
  `route-unlock-page.tsx` (the shared `app/[slug]` pair), and `gate/` (the
  registry, `requireDocument`, `documentPath`, the token code, `proxy.ts` and
  the unlock route).
- `example/`: the Company Finance Review's content and generated data files.
- `live/`: the SharePoint live-read pattern and `finance-review-snapshot.ts`.
- `tools/`: the workbook and NetSuite generators, `check_gate.sh` (local build)
  and `check_prod.sh` (deployed host).

## Standing notes

- The Company Finance Review was born on a branch of the proposals repo
  (`feat/finance-review`, previewed at finance-review.thirdhorizon.com). Its
  home is this surface since the move of 10/26: repo, Vercel project, both
  domains, the cron on main. The proposals branch and its SharePoint keys were
  deleted; `th-proposals` main was never touched (the AMA proposal stays
  exactly as shipped 10/23).
- The HUD card lives under Resources > AI Tools > Skills Files with this zip;
  refresh the zip when the skill changes.
- The deck skill (`th-proposal-deck`) and this one share the canon and the gate;
  a change to the bar, the rail, the gate or the tokens is carried to both.
