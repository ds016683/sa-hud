# The Card Canon

David, October 26, 2026: "the main mission and side mission and milestone pages are all a miss. different pills. different rules. different connections. different areas for live files. I REALLY need you to take some time and help to create, implement, and enforce a single standard."

This is the standard. Every Main Mission page, Side Mission card and Milestone card carries it. The pill set and the pill component live in `src/components/river/canon.jsx` (`CARD_PILLS`, `CardPill`); a page that invents a pill of its own is wrong.

## The five pills, in this order

| Pill | What it holds | On a Main Mission | On a Side Mission or Milestone |
|---|---|---|---|
| **Briefing** | Where it stands | The progress bar and the milestones, each with its steps, Load, Stash, Close | Where It Stands (done and still needed), Sessions, the facts row (Domain, Type, Due, Follow Up, Who), Back Story, Marks or Gates |
| **Workbench** | What is being built | The files in play, the Planning canvas | The files in play, the Live Protocol rows (editing punchlists, briefing gap maps) |
| **Files** | The filed and source material, one list | Every file and folder in the mission's storage, the filed live files, the artifacts (scorecards, decisions, briefs) and the shares (published pages), each a row with a kind chip. Cabinet, Artifacts and Shares are kinds of file, never sections | The filed live files, the item's own folder, the mission's files and store |
| **Notes** | Your own words | The mission's notes, newest first | The item's own notes, then the meetings that match it |
| **Polaris** | The objective and the proof | The objective sentence, editable; the evidence pinned on the mission; the close-out state | The objective sentence, editable; the evidence pinned on the item; the released state |

The Polaris sentence also reads under the title on every page, in italic, as the page's subtitle. It is edited only on the Polaris pill.

## Where a file lives

One rule for every page:

- **In play** (filed_at null): the Workbench. It arrived from a session (livefile.py), from Lumen (write_file, file_attachment), or from a drop on the Board or the Workbench. Versions group under one row.
- **Filed** (filed_at set): Files. Done on the Workbench moves it there. It never leaves the Ledger.
- **Pinned** (evidence true): shows on Polaris as well, wherever it lives. The star on a Workbench row pins and unpins. Pinning is the only thing that puts a file on Polaris.
- **Storage, artifacts, shares**: Files, always, as rows in the one list with a kind chip. They are not live files, and they are not sections of their own.

## What counts on a pill

- Briefing: the number of milestones (missions only).
- Workbench: the open protocol rows.
- Polaris: the pinned evidence.
- Files and Notes carry no count.

## The trail

Every card and mission page opens with a trail: the root, the parent, where you are, with an Up button to the parent. A Milestone reads Main Missions › the mission › Milestone N. A Side Mission reads Side Missions › its type. A meeting, a session or an Ad Hoc reads Board › its kind. The mission page reads Main Missions › the mission. The component is `Trail` in canon.jsx.

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
