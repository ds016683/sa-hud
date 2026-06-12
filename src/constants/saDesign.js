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
