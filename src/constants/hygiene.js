// The daily hygiene checklist. Each item is 0.25 miles when logged; all six
// in a day strike the Hygiene badge (3 miles) on top. Injections live on the
// medication regimen (src/constants/medications.js), not here.
export const HYGIENE_ITEMS = [
  { key: 'shower',     label: 'Shower within 20 minutes of waking', prompt: 'What time did you wake, and when did you shower?' },
  { key: 'brush-am',   label: 'Morning brush', prompt: 'Anything to note?' },
  { key: 'shave',      label: 'Shave beard and head', prompt: 'Anything to note?' },
  { key: 'brush-mid',  label: 'Mid-day brush', prompt: 'Anything to note?' },
  { key: 'whiten',     label: 'Teeth whitening', prompt: 'How long?' },
  { key: 'brush-pm',   label: 'Evening brush', prompt: 'Anything to note?' },
]
export const HYGIENE_KEYS = HYGIENE_ITEMS.map(i => i.key)
