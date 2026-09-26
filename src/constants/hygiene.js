// The daily hygiene checklist. Each item is 0.25 miles when logged; all eight
// in a day strike the Hygiene badge (3 miles) on top. Peptide items count as
// done when David logs "none today".
export const HYGIENE_ITEMS = [
  { key: 'peptide-am', label: 'Morning peptide injection', prompt: 'Which peptide and dose? (or none today)', optional: true },
  { key: 'shower',     label: 'Shower within 20 minutes of waking', prompt: 'What time did you wake, and when did you shower?' },
  { key: 'brush-am',   label: 'Morning brush', prompt: 'Anything to note?' },
  { key: 'shave',      label: 'Shave beard and head', prompt: 'Anything to note?' },
  { key: 'brush-mid',  label: 'Mid-day brush', prompt: 'Anything to note?' },
  { key: 'whiten',     label: 'Teeth whitening', prompt: 'How long?' },
  { key: 'peptide-pm', label: 'Evening peptide injection', prompt: 'Which peptide and dose? (or none today)', optional: true },
  { key: 'brush-pm',   label: 'Evening brush', prompt: 'Anything to note?' },
]
export const HYGIENE_KEYS = HYGIENE_ITEMS.map(i => i.key)
