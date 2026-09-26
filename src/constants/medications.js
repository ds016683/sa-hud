// The regimen. Every item lists every day; items not due that day render
// grayed and never count against the day. Each logged dose is 0.5 miles;
// all doses due in a day strike Regimen (2 miles). Schedules are rules the
// server (api/_river.mjs) and the page evaluate the same way via dueOn().
export const MEDICATIONS = [
  { key: 'vyvanse-am',   label: 'Vyvanse (morning)',                dose: 'per prescription', route: 'oral',   when: 'morning',         schedule: { type: 'daily' } },
  { key: 'vyvanse-pm',   label: 'Vyvanse (early afternoon)',        dose: 'per prescription', route: 'oral',   when: 'early afternoon', schedule: { type: 'daily' } },
  { key: 'testosterone', label: 'Testosterone injection (clinic)',  dose: 'weekly',           route: 'clinic', when: 'Friday',          schedule: { type: 'weekly', days: [5], movable: true } },
  { key: 'nad',          label: 'NAD+ (Nicotinamide) 25 units',     dose: '25 units sub-Q',   route: 'sub-Q',  when: 'morning',         schedule: { type: 'weekly', days: [1, 2, 4, 5] } },
  { key: 'cjc-blend',    label: 'CJC-1295 / Ipamorelin blend 10 units', dose: '10 units sub-Q', route: 'sub-Q', when: 'before bed',    schedule: { type: 'cycle', on: 2, off: 2, anchor: '2026-09-25' } },
  { key: 'selank',       label: 'Selank 8 units',                   dose: '8 units sub-Q',    route: 'sub-Q',  when: 'before bed',      schedule: { type: 'daily', asNeeded: true } },
  { key: 'biweekly-5mg', label: 'Bi-weekly 5 mg injection (name to confirm)', dose: '5 mg', route: 'sub-Q', when: 'any',             schedule: { type: 'every_n_days', n: 14, anchor: '2026-09-26' } },
]

const dayIndex = (day) => new Date(day + 'T12:00:00Z').getUTCDay()   // 0 Sun .. 6 Sat
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000)

// Is this medication due on `day` (YYYY-MM-DD)? Overrides (from the DB) win.
export function dueOn(med, day, override) {
  if (override === true || override === false) return override
  const s = med.schedule
  if (s.type === 'daily') return true
  if (s.type === 'weekly') return s.days.includes(dayIndex(day))
  if (s.type === 'cycle') { const d = daysBetween(s.anchor, day); if (d < 0) return false; return (d % (s.on + s.off)) < s.on }
  if (s.type === 'every_n_days') { const d = daysBetween(s.anchor, day); return d >= 0 && d % s.n === 0 }
  return false
}
export const MED_KEYS = MEDICATIONS.map(m => m.key)
