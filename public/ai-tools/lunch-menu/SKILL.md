---
name: lunch-menu
description: Stand up a gated lunch order page for a meeting with guests, at lunch.thirdhorizon.com/<client>. Each guest enters an access code, taps their name, and picks from the restaurant's menu, transcribed verbatim in the house canon; the organizer gets an order sheet with the tally to read to the restaurant, the session produces the final order and the email for whoever places it, and the page is scuttled 24 hours after the lunch. Use when someone says "lunch menu", "lunch order", "build the lunch app", "order page for the lunch", or sends a menu photo and a list of people for a meeting. Born on the MMA lunch, 11/10/2026.
---

# Lunch Menu

A lunch with guests gets a small private order page instead of a paper menu going around the table. The organizer sends a photo of the menu and the names. Ten minutes later every guest has a link and a code, and the organizer has one clean order.

Nothing is built per lunch. One function (the lunch door, repo `Third-Horizon-Strategies/th-lunch`) serves every event from a config in that project's private store. This skill writes the config, watches the orders, and produces the final list.

## What The Organizer Gets

- A link: `https://lunch.thirdhorizon.com/<client>`, a guest code, and an organizer code.
- Guests: enter the code, tap their name, pick items (with choices where the menu offers them), add a note, send. They can change the order until it is placed.
- An order sheet in the page itself, opened with the organizer code: the tally to read to the restaurant, each guest's order, who has not ordered.
- The final order by menu section and a copy-and-paste email for whoever places it.
- The page and every order deleted 24 hours after the lunch, on their own.

## Setup, Once Per Machine

```bash
git clone https://github.com/Third-Horizon-Strategies/th-lunch ~/builds/th-lunch
cd ~/builds/th-lunch && npm install
vercel link --yes --project th-lunch --scope third-horizon-58c0ce68
vercel env pull .env.local --yes
```

The skill's tool reads the project's store token from that `.env.local`. It is the only credential, and it opens nothing but lunch events. Never paste it anywhere.

## The Run

All commands are `python3 ~/.claude/skills/lunch-menu/scripts/lunch.py <command>`. Run it with no arguments for the full list.

1. **Scope.** In David's HUD the lunch belongs to a Side Mission. Create one only at his word (he names it, usually "<Client> Lunch", a Contract); otherwise attach to the one he names, and put the session clock on it. Outside the HUD, skip this step.
2. **Gather.** The menu photo, the guests, the client name (the address), the date and time of the lunch. If the photo did not arrive, say so first and build nothing that depends on it. Check the calendar for the meeting to confirm the spelling of names the organizer flags and to pick up the place. Use their spellings on the name tiles; fix only what they ask about.
3. **Transcribe the menu** into a JSON file in the scratchpad (shape in `references/menu-example.json`). Rules in the next section.
4. **Create the event.**
   ```bash
   python3 ~/.claude/skills/lunch-menu/scripts/lunch.py new mma --title "MMA Lunch" --lunch-at "2026-11-12 12:00" --guests "Carrie, Kate, John" --menu menu.json --place "<restaurant>"
   ```
   Times are Chicago unless they carry an offset. The guest code defaults to the client name and four random digits ("mma-4821"; guests may type it with or without the hyphen); `--code` sets another. Never use a code someone could guess from the address. The command prints the link, both codes and the scuttle time.
5. **Check it.** `lunch.py check <client>` runs the live gate checks on the public address. Read the transcription against the photo once more, item by item.
6. **Hand it over.** Tell the organizer the link and the guest code in a code block each, the organizer code for the order sheet, what you assumed, and what you could not verify. In David's HUD, also put the launch link in Live Files on the mission (`livefile.py link "https://lunch.thirdhorizon.com/<client>" --title "<Client> Lunch Order Page" --note "Guest code <code>" --item "<mission>"`).
7. **During the lunch.** `lunch.py status <client>` answers "who has ordered". Add a late guest with `guests --add`. When the organizer orders for someone in words ("Carrie and I will split the Margherita"), enter it with `record` and a note saying so; never overwrite an order a guest placed themselves. If several people are refused at once, the room shares one network address and five wrong codes locked it: `lunch.py unblock <client>`.
8. **Final order.** `lunch.py final <client> --extra "3 Bread Service (for the table)" --to Erica` prints the order by section with names, notes, the menu-price total, and the email. Items added for the table go in `--extra`; they are not on the sheet.
9. **After.** Nothing to do. The event is scuttled 24 hours after `--lunch-at`. To scrub it sooner, `lunch.py scuttle <client>`. In the HUD, extracting the Side Mission is David's.

## Transcribing The Menu

The rule is verbatim. The words, the order, the prices and the marks are the restaurant's.

- Every item, in the paper's sections and the paper's order. Count them against the photo.
- Words and punctuation exactly as printed, including the restaurant's own spellings ("Brussel Sprouts", "Osso Bucco"). Where a line break hides a comma, keep what is printed and say which line you were unsure of.
- Case is the one change: an all-caps menu is set in Title Case. Small tracked capitals are banned in every build.
- Prices as printed ("21", not "$21.00"). Diet marks (V, GF) and asterisks stay where the paper has them.
- A section's subtitle ("Served With Fries Or Salad") goes in the section `note`. A printed rule between groups is `{ "divider": true }`. Footnotes go in `menu.foot`.
- A choice the menu itself offers becomes an option the guest must pick: Fries or Salad on a sandwich, Cup or Bowl on a soup (put the price in the choice, "Bowl, 8"). Do not invent choices the paper does not print (steak temperatures, dressings); the note field carries those.

## How It Is Built

- **The door:** repo `Third-Horizon-Strategies/th-lunch`, Vercel project `th-lunch` on the Third Horizon team. `api/lunch.mjs` serves the gate, then the names, then the menu, and the order sheet for an organizer session; `POST` takes `unlock`, `identify`, `switch`, `order`, `clear`, `leave`. `api/sweep.mjs` runs hourly and scuttles expired events. `api/admin.mjs` is this skill's endpoint. A push to main deploys.
- **The address:** `lunch.thirdhorizon.com` and `meetings.thirdhorizon.com` are domains on the th-proposals Vercel project. Its `next.config.ts` rewrites `/<slug>` on those hosts to th-lunch, and `proxy.ts` answers Not Found for everything else on them.
- **Storage:** the project's private Blob store `th-lunch-events`. `lunch/<slug>/config.json`, `orders/<guest>.json`, `events/` (the gate and order trail, no addresses), `throttle/` (wrong-code counts). A scuttle deletes all of it and leaves `lunch/_scuttled/<slug>-<time>.json` with counts and no names.
- **Protections, all on the server:** the code is compared in constant time, and neither the guest list nor the menu is sent before it passes; the session is a signed token in an HttpOnly, Secure cookie scoped to the event's address; five wrong codes in ten minutes locks an address out; writes must come from the page itself and are validated against the config; the page ships under a nonce-only content policy with fonts and the mark served from our own host, so it makes no third-party request.

## Rules Learned On The First Run

- **The page says nothing about its security.** David had the "Security Posture" panel and the gate's joke about itself removed. The protections stay; the copy does not come back.
- **The code is forgiving on form.** Case, spaces and punctuation are ignored.
- **Verify without typing a real code into a production browser.** `check` covers the public address; `cd ~/builds/th-lunch && npm test` drives the door through every rule on a throwaway event and proves the scuttle. Run it after any change to the door, before pushing.
- **If a guest cannot get in, read the trail before theorizing.** `status` shows refusals with their reason. No entry at all means the request never reached the door.
- **A session creates nothing the organizer did not commission.** The Side Mission, the event, an order entered for a guest: each on their word.
- **When load-testing, keep one connection open.** Hundreds of fresh connections from a laptop stall on the laptop, not the door; the door's `Server-Timing` header says how long it really took.
- **House style on the page:** Lora for titles, the body face for labels at 12 px or larger in Title Case, no small tracked capitals, nothing stacked above a title, no em dashes, the gold button for the one primary action.

## Files

- `scripts/lunch.py`: the command-line hand (new, list, show, menu, guests, status, record, final, unblock, check, scuttle).
- `references/menu-example.json`: the menu shape.
- The door's code and its regression test live in the th-lunch repo, with a copy of this skill in `skill/`.
