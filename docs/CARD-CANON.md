# The Card Canon

David, October 26, 2026: "the main mission and side mission and milestone pages are all a miss. different pills. different rules. different connections. different areas for live files. I REALLY need you to take some time and help to create, implement, and enforce a single standard."

This is the standard. Every Main Mission page, Side Mission card and Milestone card carries it. The pill set and the pill component live in `src/components/river/canon.jsx` (`CARD_PILLS`, `CardPill`); a page that invents a pill of its own is wrong.

## The five pills, in this order

| Pill | What it holds | On a Main Mission | On a Side Mission or Milestone |
|---|---|---|---|
| **Briefing** | Where it stands | The progress bar and the milestones, each with its steps, Load, Stash, Close | Where It Stands (done and still needed), Sessions, the facts row (Domain, Type, Due, Follow Up, Who), Back Story, then Marks on a Contract or Milestones on a Mythic |
| **Workbench** | The working surface: what is being built | The Pages first, as tabs (David 11/7): one tab per page built on the mission (build_page from Lumen or a session, a pipeline-fed view, a skill brought in), newest first so the page in motion is tab one; the MMA Planning canvas is a page on the MMA missions only, never on another mission. Then the Workspace pages, the files in play at the foot | The Live Protocol rows first (editing punchlists, briefing gap maps), then the Workspace pages, the files in play at the foot |
| **Files** | Bring In, then the filed and source material, one list | Bring In (drop a file, point at a path, add a launch link; it lands in play on the Workbench), then every file and folder in the mission's storage, the filed live files, the artifacts (scorecards, decisions, briefs) and the shares (published pages), each a row with a kind chip. Cabinet, Artifacts and Shares are kinds of file, never sections | Bring In, then the filed live files, the item's own folder, the mission's files and store |
| **Notes** | Your own words | The mission's notes, newest first | The item's own notes, then the meetings that match it |
| **Polaris** | The objective and the proof | The objective sentence, editable; the evidence pinned on the mission; the close-out state | The objective sentence, editable; the evidence pinned on the item; the released state |

The Polaris sentence also reads under the title on every page, in italic, as the page's subtitle. It is edited only on the Polaris pill.

## Where a file lives

One rule for every page:

- **In play** (filed_at null): the foot of the Workbench. It arrived from a session (livefile.py), from Lumen (write_file, file_attachment), from a drop on the Board, or from Bring In on Files. The Workbench itself is the working surface (David 10/26: "largely working surface where we are bringing in a skill or just doodling, creating stuff"); its head is the Planning canvas on a mission and the Live Protocol rows on an item. Versions group under one row.
- **Filed** (filed_at set): Files. Done on the Workbench moves it there. It never leaves the Ledger.
- **Pinned** (evidence true): shows on Polaris as well, wherever it lives. The star on a Workbench row pins and unpins. Pinning is the only thing that puts a file on Polaris.
- **Storage, artifacts, shares**: Files, always, as rows in the one list with a kind chip. They are not live files, and they are not sections of their own.

## The Workspace

David, October 28, 2026: "when i say that I want to create a workspace on the Mission card's work bench, i want to start building blank pages where we can draw, type, design, formulate, analyze, etc."

- A workspace is the set of pages under the Workspace label on a card's Workbench pill. A page is a blank surface: type on it (autosaved) and draw over it (pen or mouse). New Page on the card, or `~/.claude/hud-board/workspace.py new "<title>" --item "<item>"` from a session, opens one; a session can seed it with text.
- Pages live in storage as JSON under `<root>/workspace/<slug>.json` (`src/lib/workspace.js`; the root is the mission's id or `objectives/<id>`). They are not Live Files, not artifacts, not sections of Files. Delete Page removes the document.
- The Workspace sits between the head of the Workbench (the Pages tabs on a mission, Live Protocols on an item) and the files in play at the foot. It counts nothing on the pill and earns no miles.

## One chassis
David, November 4, 2026: "all pages down in a card should be matching the parent, right?" Yes. A Side Mission, Milestone or Ad Hoc card is a page inside the shell, exactly like the Main Mission page: sidebar on the left, the topbar, the content column, the browser's back. It is never an overlay drawn over another page.

- The route carries it: `#/<page>/<params>/item/<objective id>` (or `item/task:<project task id>` for a milestone not yet promoted). `openCard(id)` in `src/lib/card.js` pushes it; `closeCard()` goes back. App.jsx reads the hash, loads the item with `itemFromObjective`, and renders `ItemDetail host="page"` in place of the page, which stays mounted hidden and remounts once the card closes.
- Every opener goes through `openCard`: the Board's priorities and Loadout slots, the Stash peek, the Side Missions page, the Archive's yay page, Live Protocols, a mission's milestone rows, and a Mythic's milestones. A page that renders `<ItemDetail>` itself is wrong, with one exception: a meeting opened from the calendar, which has no objective behind it and still uses the overlay host.
- What the chassis gives every card for free: the column width, the scroll, the Lumen panel's push-aside, and whatever the shell grows next.

## The card palette
David, November 4, 2026: "we have a massive color sprawl problem on all these mission cards..... like everywhere." One rule, every card and the Lumen panel:

1. **Ink carries content.** Steel blue (`LABEL`) carries every label, eyebrow, field title, section count and file icon. Captions and attributions (a "Lumen" tag on a suggested step, a "waiting" note) are muted ink, never a color.
2. **Chrome is one color.** Every button, selector, pill and tab is an ink-2 outline at rest. Selected or active is the accent fill (`BLUE`). No gold, green, red or purple buttons at rest; a destructive action is a plain button whose confirm dialog does the warning.
3. **Identity shows once.** Bounty gold, Contract blue, Mythic purple live on the Type chip in the header. A Mythic's milestone numbers and progress bar inherit it. The Type and Domain selectors in the facts row use the accent like any selector.
4. **State colors are reserved.** `SUCCESS` (the medallion purple) for done, closed, released, complete. `GREEN` only for a running clock, an item on the Board, money. `CAUTION` for blocked, flagged and overdue, and since 11/9 `CAUTION` is the same red as `RED` (the amber is retired). `RED` otherwise only inside a destructive confirm.
5. **Gold is wayfinding.** The Polaris star and the evidence pin, the celebration, and one primary action per surface (Send on the Lumen panel, PDF on its Workbook). Nothing else.

## What counts on a pill

- Briefing: the number of milestones (missions only).
- Workbench: the open protocol rows.
- Polaris: the pinned evidence.
- Files and Notes carry no count.

## The trail

Every card and mission page opens with a trail: the root, the parent, where you are, with an Up button to the parent. A Milestone reads Main Missions › the mission › Milestone N. A Side Mission reads Side Missions › its type. A meeting, a session or an Ad Hoc reads Board › its kind. The mission page reads Main Missions › the mission. The component is `Trail` in canon.jsx.

## Mythic milestones

David, October 29, 2026: "Gateways should be called Milestones and have the same structural treatment as a Milestone card for a mission."

- A Mythic's milestones are objectives of their own with `parent_id` set to the Mythic (`fetchMilestones`, `addMilestone`, `closeMilestone` in `src/lib/objectives.js`). Five at most, 10 miles each on close (the River pays `mythic-task` for the first five), and the Mythic pays 50 at its own release. The word gate is retired.
- On the Mythic's Briefing they read like the Main Mission page's milestones (`MythicMilestones.jsx`): the progress bar, a serif number, the title, chips, the done-when, Open, Done when, Rename, Close, Delete. Open gives the milestone its own card with the five pills; its trail reads Side Missions › the Mythic › Milestone N, and its facts row says Milestone N of M in place of Type.
- A milestone never sits on the Board or in the Stash on its own: the Mythic carries it, so the milestone card shows no clock. Lists of Side Missions (the Board, the inventory, Lumen's hands) hide children; they live only on their Mythic.
- Mythic is purple: the `MYTHIC` token in canon.jsx (`--hud-purple`, the medallion purple with its own name), on the Type chip, the Loadout, the milestone label and numbers.

## Lumen on the card
David, November 4, 2026: "let's just build the same thing from scratch. call it lumen, use the hud's canon. i want the base functionality, particularly the ability to do a workbook to be the same. and arms and legs to wire up and change the card in real time and/or do some development work inside the workbench that can be ported later."

- Every Main Mission page, Side Mission card and Milestone card carries a Lumen dock, bottom right. It opens a panel from the right (`src/components/river/LumenPanel.jsx`; the page yields its width on wide screens). Three tabs, never a sixth pill: **Lumen** (the same brain as WhatsApp and the HUD strip, framed on this card: `cardFrame` in `api/_ledger.mjs` rides each turn through `/api/lumen-hud` with `item`), **Workbook** (captures of his answers and of the card, notes, a PDF in the house frame), **Build** (pages Lumen built with `build_page`, previewed in a sandboxed frame, Open, Download, Delete).
- Hands on the card: the Ledger tools he already has, plus `workspace_page` and `read_workspace_page` (the card's Workspace pages) and `build_page` (one self-contained HTML page per slug under `<root>/build/`, in the HUD's canon, portable by a Claude session later). When Lumen acts, the panel fires `hud:ledger-changed`; the card rereads itself and remounts its Workbench lists.
- Where it lives in storage: `<root>/lumen/workbook.json` (captures and notes), `<root>/build/<slug>.html` with `<slug>.json` beside it, `<root>/workspace/<slug>.json` (the Workspace pages themselves). The thread is `lumen_messages`, channel hud, `meta.item` = the card's id.

## Connections

- A Milestone card is the item card with a task behind it. It opens from the mission's Briefing (Open), from the Board, and from Live Protocols. Its breadcrumb's mission name goes up to the mission page.
- A Side Mission card is the item card with no task behind it. It opens from the Board, the Stash, the Side Missions page, and Live Files.
- The old pill names still resolve: Milestones, Artifacts, Cabinet, Shares, Planning, Live Protocols, Punchlist, Production and Overview each open the pill that now holds them.

## Close-out

The Polaris sentence, the Achieved line, the pinned evidence and the tags lead the archive record for a Side Mission, a Milestone and a Main Mission alike (`src/lib/archive.js`). The yay page follows a release on the Board and on the Side Missions page; the celebration follows a mission close.

## Enforcement

- `CARD_PILLS` is the only source of the pill set. Adding a pill means changing it there and saying why here.
- `node scripts/check-jsx-undef.mjs` runs before every deploy.
- A page section that does not fit one of the five rows above does not get a sixth pill; it goes under the pill whose row describes it, with a label.

## The quiet Briefing (David 11/4, the rebuild)

The Briefing is the page you read in ten seconds, so it carries five things and nothing else: the trail; the header (kind, chip, name, Polaris line, the five pills in one quiet row under it, left); the fence (Domain, Type, Target Completion); Done and Next; and one action row (Equip or Holster, Cold Start, Stash, with the clock as a status line). Done is history: milestones released, marks ticked, board items closed, and a file only once it is starred as evidence. Next is the open marks or milestones, the open board items, and Lumen's two or three steps.

Everything that edits or explains moves off the Briefing. Marks and Milestones are the first block on the Workbench, then the Milestone Board, then Sessions (copy a briefed start or the resume command), Live Protocols, Workspace and In Play. Back Story reads at the top of Notes. Mission and Task are the trail. Sessions as a Briefing block is retired; Cold Start is the one button that starts a fresh session on the card.

## The Workbench sheet (David 11/7)

"i want a blank canvas where i can put whatever i want. tabs at the top, with the labels for whatever i'm doing there." The Workbench pill on every card (Main Mission, Side Mission, Milestone) is one surface, `WorkbenchSheet`:

- **Live Protocols line** under the pills and over the tabs: `Live Protocols  On` in GREEN with the protocol's name and open count, or `Off` in gray.
- **The tab strip**, Excel vibe: a live protocol is listed first and always has a tab of its own (Editing Protocol, Briefing Protocol; on a Main Mission, suffixed with the milestone it runs on); then one tab per page built on the card (build_page from Lumen, a pipeline-fed view such as the BS Test Lab Usage page, a skill brought in), newest first; then one tab per Workspace page, left to right by creation; Planning only on MMA or a mission that already carries a program plan; a plus at the end opens `Tab N`. Double-click a page tab to rename it.
- **The head of a tab**, before the content: `Created <when> · Updated <when>`, then Type and Draw.
- **The sheet**: the Workspace page itself (type, draw, Taller, Delete Page). A built page's tab renders the page itself (srcDoc, as on the Lumen panel's Build tab, which still lists it too), with Created and Updated, the page's note, Refresh and Open in its head (David 11/9, when the BS Test Lab Usage page had lost its door on the card). No lists, no blocks: a new surface is a tab.

What left the Workbench that day: Marks and a Mythic's milestones (read them under Done and Next on the Briefing; Lumen or a session adds one), the Session Board tie, the Sessions strip (Cold Start on the Briefing is the hand), and In Play, which now reads under Files between Bring In and Filed. Pinning evidence happens under Files.
