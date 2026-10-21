---
name: th-deck
description: Build presentation decks in the Third Horizon executive-deck frame — the dark-navy investor aesthetic of the CIP Executive Summary (Lora serif headings, Instrument Sans labels, gold triangle nav, single periwinkle accent, confidentiality footer). Use this skill whenever a Third Horizon team member asks for a slide deck, presentation, board deck, investor materials, executive summary, PPTX/PDF deck, or asks to put existing slides "in the TH frame" or "on brand" — even if they don't name the skill. Produces a self-contained HTML deck exported to a 13.33in x 7.5in PDF that drops into PowerPoint or reads as investor print.
---

# Third Horizon Deck Frame

The house frame for Third Horizon presentation decks, extracted from the CIP
Executive Summary (investor.thirdhorizon.com/executive, July 2026). Decks built
with this skill read as part of the same document family: one navy surface, one
accent, serif story beats, disciplined whitespace.

## Workflow

1. Read `references/template.html` — a complete, self-contained starter deck
   implementing the frame (tokens, chrome, print CSS, four example slide
   archetypes). Copy it as the working file; never link external CSS.
2. Map the user's content onto the slide archetypes below. One idea per slide.
   Prose leads; numbers support.
3. Build each slide inside its own `<section class="slide">`. Keep every slide
   inside the fixed 16:9 surface — nothing scrolls, nothing overflows.
4. Export to PDF (recipe at the bottom) and deliver both the HTML and the PDF.

## Surface and geometry

- Slide surface: 16:9, designed at 1280x720 CSS px (exactly 13.333in x 7.5in
  at 96dpi, so print is 1:1 with the screen design), never 1920 (print scaling
  bites). Content slides CENTER vertically inside the stage; density should
  fill roughly the middle two-thirds of the slide, not hug the top.
- Background `#0F2334` (feature navy). Never white, never gradients.
- Slide anatomy (content slides): the slide is a flex column. The HEADLINE is
  a true header at the top (its subhead below it when present), the FOOTER strip is
  pinned to the bottom, and the BODY fills everything between, with its
  content vertically centered in that band. This keeps space above and below
  the body symmetric while the slide reads edge-to-edge rather than like a
  small slide floating inside a big one. Only title/divider/closing slides
  center the whole composition.
- Slide padding ~44px top / 66px sides / 46px bottom at 1280 scale.
- Vertical rhythm: keep blocks on a ~48px equidistant beat between selector
  rows, prose, and figures. Whitespace is material — let the page run wide
  rather than boxing content in.
- Two-column slides: grid `1.3fr / 1fr`, gap 48-110px, columns CENTER-aligned
  on each other (a short figure sits at the vertical middle of tall prose).

## Palette (exact tokens)

| Token | Value | Use |
|---|---|---|
| navy surface | `#0F2334` | every slide background |
| navy deep | `#0D1D2C` | insets, wells |
| navy 900 | `#16314A` | raised panels |
| ink 1 | `#F3F1EA` | primary text |
| ink 2 | `rgba(243,241,234,.68)` | body prose |
| ink 3 | `rgba(243,241,234,.42)` | captions, labels |
| border | `rgba(255,255,255,.12)` | hairlines, card edges |
| fill 1 / fill 2 | `rgba(255,255,255,.05)` / `.09` | tiles, cards |
| accent primary | `oklch(0.47 0.115 248)` | deep accent fills |
| accent bright | `oklch(0.82 0.109 248)` | kickers, dropcaps, emphasis numbers |
| gold | `#F8C761` | nav triangles and tiny wayfinding ONLY — never data |
| positive | `#57BE97` · negative `#DE7E6E` · caution `#B8822E` | data tones |

One accent deck-wide. Per-section accent variance reads as a canon violation
on the uniform navy (David 7/8). Gold is chrome, not content.

## Type system

Fonts: **Lora** (serif) and **Instrument Sans** (sans). In standalone HTML load
them from Google Fonts with real fallbacks (Georgia / -apple-system).

- Slide title: Lora 500, 30-40px, letter-spacing -0.008em, line-height 1.1.
  Titles may carry an italic accent phrase: `The firm, <em>modeled through 2026.</em>`
  Lora 500 at tight tracking is canon — 400/loose reads as substrate, not deck.
- Subhead (Instrument Sans ~10.5px, uppercase, 0.22em tracking, accent-bright):
  sits BELOW the slide headline, never above it as an eyebrow (David 8/20) —
  small, long text above the serif header reads backwards, since the serif
  line is unmistakably the slide's label. The same style still serves as a
  column/section label INSIDE the body (above a list or rail), where it labels
  the block beneath it.
- Body prose: Lora 400, 16.5-19px, line-height 1.62, ink-2, max-width 62ch.
  The FIRST SENTENCE of a slide's lead paragraph is bold (600, ink-1).
  Lead paragraphs may open with a dropcap: first letter 3.5em, accent-bright, 600.
- Labels/data chrome: Instrument Sans 11-12px, uppercase, 0.08-0.13em tracking.
- Big numbers: Lora 500 for dollar figures; sans for their labels.

## Slide chrome (every slide)

- Brand lives in the FOOTER, not a top bar (David 8/20): the three arches
  alone, no spelled-out wordmark, bottom-left at ~13px tall, followed by the
  confidentiality line. The top of the slide belongs to the headline.
- Confidentiality line, bottom-left beside the arches, every slide, verbatim:
  `Not for Distribution · Confidential & Proprietary Information · Third Horizon`
  (7.5px at 1280 scale, uppercase, 0.08em, ink at 42% opacity).
- ONE consolidated context strip, bottom-right: deck context + partners +
  page number in a single line (e.g. "MHPI Year Three · parityindex.org ·
  The Kennedy Forum · ... · 4"). Never duplicate context top-right and
  bottom-right; if a top label and a footer strip would repeat each other,
  keep only the footer.
- On-screen nav (in-app decks only): gold triangles bottom-center, hidden in
  export/print.

## Slide archetypes

Compose decks from these proven shapes (all exist in the CIP exec deck):

- **Title** — centered: arches, wordmark, serif heading with italic accent,
  audience/date meta row, hairline rule, "companion application" note.
- **Divider / Closing** — vertically centered, minimal; closing carries the
  contact line ("For access to the interactive application, reach out to ...").
- **Snapshot** — prose left (dropcap lead), "By the Numbers" 2x2 tile quad
  right. Tiles: fill-1 cards, sans label + Lora value + sub-line.
- **Stat rail** — a figure or chart with a vertical rail of 3-5 stat tiles
  beside it, plus 1-2 sentences of context per tile.
- **Vertical year stack** — historicals as a linear vertical stack of years,
  large numerals, one line each.
- **Chart + rail** — monthly/served chart left (solid revenue line, dotted
  expense line, shaded forecast region), stats right.
- **2x2 map** — quadrant map with corner labels; theses at the sides.
- **Determinants strip** — a labeled horizontal strip of drivers with a
  simple Base → Capital totals pair. Few numbers, plainly stated.
- **Doors** — 2-3 large option cards ("doors") with an emphasized ask cell,
  plus a compact "price checks" mini-tile row bottom-right.
- **Risk / believe grid** — 3x2 grid, each cell bifurcated into one-sentence
  "Risk" and "Why we believe" lifts. Equal cell heights.
- **Team / roster** — headshot grid with names and one-line roles.

## Prose canon (non-negotiable)

- First sentence of a lead paragraph: bold.
- NEVER use em dashes anywhere. Commas, periods, parentheses.
- Quote source numbers verbatim; never restate or round a stated figure
  differently on two slides.
- One idea per slide; supporting detail goes to the notes or gets cut.
- Any deck referencing CIP content cites locations as section.page (e.g.
  "full detail in Section IV.4"), with the full-detail indicators in
  accent (baby blue), not gold.

## PDF export

For the standalone HTML deck (print CSS is already in the template):

```bash
# one command; @page is preset to 13.33in x 7.5in landscape
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --no-pdf-header-footer \
  --print-to-pdf="Deck.pdf" deck.html
```

For pixel-perfect raster export (matches the CIP pipeline): screenshot each
slide headless at 1920x1080 with `--force-device-scale-factor=2` (288 DPI) and
assemble with img2pdf at 13.333x7.5in. Text fuzziness means the scale factor
was dropped.

Name deliverables plainly ("<Audience> Deck", no version soup), and when a
deck replaces an earlier cut, archive the prior PDF rather than overwriting.
