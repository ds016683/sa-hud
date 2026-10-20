// Speeches: the talks David gives, one entry each. The deck for a speech is
// a self-contained HTML mini-app built with the apnc-deck (or th-deck) skill
// and served from public/speeches/<slug>/ on this site, so the HUD lists it
// here and launches it from the same place. Verbatim submission language for
// title, description and objectives.
export const SPEECHES = [
  {
    slug: 'apnc-fall-2026-not-scared-prepared',
    title: 'Not Scared, Prepared: Data, AI, and the Future of the Addiction Field',
    event: 'APNC Fall Conference',
    org: 'Addiction Professionals of North Carolina',
    date: '2026-10-20',
    time: '4:00 to 5:15pm Eastern',
    venue: 'Wrightsville Beach, NC',
    skin: 'apnc-deck',
    status: 'deck',   // outline · deck · delivered
    description: "Artificial intelligence has arrived in behavioral health, and the conversation about it swings between hype and fear. Neither serves the field. This session takes a clear-eyed look at what AI is, what it is not, and what it cannot do without the expertise of addiction professionals. We will examine the preconceptions that keep the field on the sidelines, what gets missed when fear drives the conversation, and why the real story is bigger than any single tool: connected platforms built on the field's own data, turning workforce, funding, policy, and community information into insight professionals can act on. Attendees will get a first look at the data tools coming to North Carolina's addiction field, built on North Carolina's own data, and leave with a practical frame for engaging AI on the profession's terms.",
    objectives: [
      'Describe how connected, real-time data on the workforce, funding, policy, and community conditions can inform daily practice, program decisions, and advocacy.',
      'Identify common misconceptions about artificial intelligence in behavioral health and distinguish what AI tools can and cannot do without professional expertise.',
      "Distinguish single-tool AI solutions, such as chatbots, from integrated data platforms, and describe what platform-based approaches mean for North Carolina's addiction workforce.",
    ],
  },
]

export const deckUrl = (s) => `/speeches/${s.slug}/`
export const STATUS_LABEL = { outline: 'Outline', deck: 'Deck Built', delivered: 'Delivered' }
