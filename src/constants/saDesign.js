// Presentational constants for the TH reskin (from design handoff sa-data.js).
// Display-only — no data logic lives here.

export const SOV_THRESHOLDS = [
  { min: 80, status: 'PEAK OPERATING CAPACITY', color: '#2F7A4F' },
  { min: 60, status: 'EFFECTIVE — REST SOON', color: '#F8C761' },
  { min: 40, status: 'WARNING — SHADOWS ACTIVATING', color: '#B8822E' },
  { min: 20, status: 'CRITICAL — DYSFUNCTION IMMINENT', color: '#C2603F' },
  { min: 0, status: 'COLLAPSE — ALL SHADOWS ACTIVE', color: '#A8382F' },
]

export function statusFor(v) {
  return SOV_THRESHOLDS.find(t => v >= t.min) || SOV_THRESHOLDS[SOV_THRESHOLDS.length - 1]
}

export function greetingFor(h) {
  if (h >= 5 && h < 12) return { g: 'Morning Orientation', p: 'morning', short: 'Morning' }
  if (h >= 12 && h < 17) return { g: 'Mid-Day Recalibration', p: 'afternoon', short: 'Mid-day' }
  if (h >= 17 && h < 21) return { g: 'Evening Integration', p: 'evening', short: 'Evening' }
  return { g: 'Night Watch', p: 'night', short: 'Night watch' }
}

export const TIER_COLORS = ['var(--tier-sp)', 'var(--tier-s)', 'var(--tier-ap)', 'var(--tier-ap)', 'var(--tier-a)', 'var(--tier-c)']

export const THESIS = 'A high-capacity system optimized for meaning under chaos.'
export const SOV_DEF = 'Self-authored agency + the capacity for chosen surrender.'
export const PASSIVE = {
  quote: 'Power seeks structure and finds the Sovereign Architect.',
  src: 'Instinctive Authority — passive trait, always running.',
}

export const ATTRIBUTES = [
  { name: 'Perception', sub: 'Pattern Recognition', tier: 'S+', value: 95, color: 'var(--tier-sp)', desc: 'Detects structure, motive, and trajectory in real time.' },
  { name: 'Will', sub: 'Autonomy + Drive', tier: 'S', value: 90, color: 'var(--tier-s)', desc: 'Pushes through resistance; refuses submission when values are at stake.' },
  { name: 'Agency', sub: 'Decisive Force', tier: 'A+', value: 85, color: 'var(--tier-ap)', desc: 'Converts insight into movement under uncertainty.' },
  { name: 'Creative Entropy', sub: 'Generative Chaos', tier: 'A+', value: 85, color: 'var(--tier-ap)', desc: 'Generates new forms, frames, and narratives from ambiguity.' },
  { name: 'Relational Sensitivity', sub: 'Human Attunement', tier: 'A', value: 75, color: 'var(--tier-a)', desc: 'Reads emotional currents and power dynamics accurately.' },
  { name: 'Endurance', sub: 'Sustainment & Completion', tier: 'C', value: 30, color: 'var(--tier-c)', desc: 'Lowest native stat. Designed around, never fought.' },
]

export const PROTOCOLS = {
  morning: { title: 'Morning Orientation', steps: [
    { label: 'Resource check — where is Sovereignty?', time: '2 MIN' },
    { label: 'Loop status — which phase am I in?', time: '1 MIN' },
    { label: 'Priority setting — the one thing today', time: '2 MIN' },
    { label: 'Shadow scan — anything active?', time: '1 MIN' },
  ] },
  afternoon: { title: 'Mid-Day Recalibration', steps: [
    { label: 'Resource update — drained or holding?', time: '1 MIN' },
    { label: 'False-responsibility check', time: '1 MIN' },
    { label: 'Intensity check — heat vs. meaning', time: '1 MIN' },
  ] },
  evening: { title: 'Evening Integration', steps: [
    { label: 'Completion inventory — what shipped?', time: '2 MIN' },
    { label: 'Unfinished business assessment', time: '2 MIN' },
    { label: 'Recovery planning for tomorrow', time: '1 MIN' },
    { label: 'Loop completion — did Release happen?', time: '1 MIN' },
  ] },
  night: { title: 'Night Watch', steps: [
    { label: 'Lower the stakes. Nothing is decided now.', time: '—' },
    { label: 'Recovery is the work tonight.', time: '—' },
  ] },
}
