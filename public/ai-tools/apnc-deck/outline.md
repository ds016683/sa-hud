# Outline schema, and the first speech

A deck starts from an outline in this shape. Titles, descriptions and learning objectives are verbatim from the conference submission; the slide list is the plan.

```yaml
slug: apnc-fall-2026-not-scared-prepared
event: APNC Fall Conference
date: 2026-10-20
time: 4:00 to 5:15pm Eastern
venue: Wrightsville Beach, NC
speaker: David Smith, Third Horizon
title: "Not Scared, Prepared: Data, AI, and the Future of the Addiction Field"
description: >
  (verbatim, below)
objectives:
  - (verbatim, below)
slides:
  - { kind: title }
  - { kind: statement, eyebrow: "...", headline: "... <red>...</red>", lead: "..." }
  - { kind: section, eyebrow, headline, lead, cards: [{ title, body }] }
  - { kind: quote, quote, attribution }
  - { kind: list, eyebrow, headline, items: [] }
  - { kind: flow, eyebrow, headline, chain: [{ k, v }], accentLast: true }
  - { kind: closer, headline, contact }
```

## Speech 1: APNC Fall Conference, October 20, 2026

**Title:** Not Scared, Prepared: Data, AI, and the Future of the Addiction Field

**Description:** Artificial intelligence has arrived in behavioral health, and the conversation about it swings between hype and fear. Neither serves the field. This session takes a clear-eyed look at what AI is, what it is not, and what it cannot do without the expertise of addiction professionals. We will examine the preconceptions that keep the field on the sidelines, what gets missed when fear drives the conversation, and why the real story is bigger than any single tool: connected platforms built on the field's own data, turning workforce, funding, policy, and community information into insight professionals can act on. Attendees will get a first look at the data tools coming to North Carolina's addiction field, built on North Carolina's own data, and leave with a practical frame for engaging AI on the profession's terms.

**Learning Objectives:**
1. Describe how connected, real-time data on the workforce, funding, policy, and community conditions can inform daily practice, program decisions, and advocacy.
2. Identify common misconceptions about artificial intelligence in behavioral health and distinguish what AI tools can and cannot do without professional expertise.
3. Distinguish single-tool AI solutions, such as chatbots, from integrated data platforms, and describe what platform-based approaches mean for North Carolina's addiction workforce.

### A slide plan drawn from the description (the session's own sentences, in order)

1. Title. Logos: APNC. Headline: "Not Scared, <red>Prepared.</red>" Sub: "Data, AI, and the Future of the Addiction Field". Well: the description's first two sentences.
2. Statement. "Artificial intelligence has arrived in behavioral health." Lead: "the conversation about it swings between hype and fear. Neither serves the field."
3. Section, three cards: What AI is · What it is not · What it cannot do without the expertise of addiction professionals.
4. Section: "The preconceptions that keep the field on the sidelines." Cards from the talk.
5. Statement: "What gets missed when fear drives the conversation."
6. Statement (the turn): "The real story is bigger than any single tool." Lead: "connected platforms built on the field's own data".
7. Flow: Workforce → Funding → Policy → Community → "insight professionals can act on" (red).
8. Section: single-tool AI (chatbots) versus integrated data platforms. Two cards side by side.
9. Section: "A first look at the data tools coming to North Carolina's addiction field, built on North Carolina's own data." Cards for the tools (the Field Hub's sandboxes: NC Explorer, Workforce Intelligence, Survey Data, Addiction Recovery Funding, Bill Tracker, Academy, Rate Book, Rising Risk).
10. List: the three learning objectives, as the takeaways.
11. Closer: "a practical frame for engaging AI on the profession's terms." Contact line.

Put the spoken beats in each slide's `data-notes`.
