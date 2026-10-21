---
name: apnc-deck
description: Build an APNC-skinned HTML slide deck (speech, talk, proposal) as a self-contained mini-app in the look of the APNC Field Hub dev site (white paper, warm canvas, APNC red, Geist). Use whenever David has an APNC talk, conference session, or deck to build, or says "APNC skin" or "use the APNC template". Output is one index.html that lives in the HUD's Speeches area (sa-hud public/speeches/<slug>/) and in Live Files.
---

# apnc-deck: the APNC slide surface

The skin is the APNC Field Hub (the dev site at ~/Desktop/Archive/apnc-sandbox, and the State Proposal deck inside it at /proposal). Decks built with this skill read as pages of that site: white paper on a warm canvas, one red, Geist for everything, bold tight headlines with one red phrase, rounded cards with hairline borders, the triangle nav. Light, not dark: this is the one TH surface that is not navy.

## Workflow

1. Read `references/template.html`: a complete self-contained deck (tokens, chrome, keyboard and hash navigation, counter, presenter notes, print CSS, six slide archetypes). Copy it as the working file. Never link external CSS; Geist loads from Google Fonts with a system fallback.
2. Read `references/outline.md`: the outline schema and the first speech (APNC Fall Conference, 10/20/2026). Map the talk onto the archetypes. One idea per slide. Verbatim source language for titles, descriptions, learning objectives, quotes.
3. Build each slide inside its own `<section class="slide" data-notes="...">`. Put the speaker's notes in `data-notes` (press N in the deck to show them). Keep every slide inside the stage: nothing scrolls on a slide.
4. Copy `references/brand/` (apnc-logo.png, apnc-mark.png, ncdhhs.png) beside the HTML as `brand/`.
5. Deliver: the folder `<slug>/` with `index.html` and `brand/`. Home: the sa-hud repo at `public/speeches/<slug>/` (served at https://sa-hud.vercel.app/speeches/<slug>/ once pushed to main; the Speeches page in the HUD lists it from `src/content/speeches.js`). Put the launch link in Live Files tied to the speech's board item: `python3 ~/.claude/hud-board/livefile.py link "<url>" --title "<talk title>" --item "<item>"`. Export a PDF (recipe below) and put it in Live Files too.

## Tokens (exact, from the dev site's globals.css)

| Token | Value | Use |
|---|---|---|
| `--apnc-red` | `#e8331c` | the one accent: eyebrows, the red phrase in a headline, triangles, bullets, rules |
| `--apnc-red-dark` | `#c1281a` | card titles in red, hover |
| `--apnc-red-soft` | `#fdecea` | tinted wells (title-slide callout at 30%), Member badge |
| `--apnc-ink` | `#1a1714` | headlines, primary text |
| `--apnc-ink-soft` | `#5b5650` | body prose, captions, counters |
| `--apnc-paper` | `#ffffff` | cards, sidebar, the slide surface |
| `--apnc-canvas` | `#f7f5f2` | the page behind the slide, tinted wells |
| `--apnc-line` | `#e8e3dd` | hairlines, card borders |
| dark pill | `--apnc-ink` on white text | PROMOTE / RECRUIT style pills, letter-spacing 0.25em |

Status tones the hub uses for chips (sparingly): emerald `#059669` on `#d1fae5`, sky `#0369a1` on `#e0f2fe`, violet `#6d28d9` on `#ede9fe`.

## Type

Geist (sans) for everything; the hub sets no serif. Weights 400 / 600 / 700.

- Eyebrow above a headline: 12px, 700, uppercase, 0.1em tracking, APNC red. (This skin puts the eyebrow ABOVE the headline, unlike the TH navy decks.)
- Slide headline: 44 to 56px, 700, tracking -0.02em, line-height 1.1, ink. One phrase in red: `Meet the vision <span class="red">wherever you are.</span>`
- Lead prose: 20 to 22px, line-height 1.6, ink-soft, max-width 60ch.
- Card title: 20 to 24px, 700, ink or red-dark. Card body: 14 to 15px, 1.6, ink-soft.
- Counter and meta: 12 to 13px, mono fallback (`ui-monospace`), ink-soft at 70%.
- Quote slide: 36 to 44px, 600, line-height 1.2, ink, red left rule 4px, attribution 16px ink-soft below.

## Slide anatomy

- Stage: 16:9 at 1440 x 810 CSS px, centered, `padding: 56px 72px`, paper surface, canvas behind. Content slides are a flex column: eyebrow and headline at the top, body centered in the remaining band, footer pinned.
- Footer, every slide: APNC logo (h 28px, 80% opacity) bottom-right, then a hairline and `CONFIDENTIAL` (or the event name for a public talk) in 10px uppercase 0.2em. Counter `01 / 13` top-right in mono.
- Nav: red equilateral triangles bottom-center with `n / N` between them; hidden in print.
- Hash routing (`#3`), arrow keys and space, Home and End, N toggles notes, F fullscreen, P print.

## Archetypes (all in the template)

- **Title**: logos row (partner logo + APNC logo), 56 to 64px headline with the red phrase, a red-bordered soft well holding the one-paragraph description.
- **Section**: eyebrow, headline, lead paragraph, then a 3 or 4 column card grid (cards: paper, hairline, radius 16 to 24, p 24 to 28).
- **Statement**: eyebrow, a single big headline with the red phrase, one lead line. For the turn in the story.
- **Quote**: red left rule, large quote, attribution.
- **Flow**: boxes joined by red flow arrows, the last box filled red (the closer's chain).
- **List**: numbered or bulleted objectives; the bullet is a 6px ink dot at 30%.
- **Closer**: headline, the flow chain or three cards, contact line.

## Prose canon

- Never em dashes. Commas, periods, parentheses.
- Titles, descriptions and learning objectives verbatim from the submission.
- One idea per slide; what does not fit goes to `data-notes`.
- Title Case for slide titles and labels.

## PDF export

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer --print-to-pdf="<Talk>.pdf" index.html
```

The print CSS sets `@page` to 15in x 8.4375in landscape and one slide per page.
