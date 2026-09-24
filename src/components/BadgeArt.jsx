// Badge medallions: each badge is a struck coin with its own emblem, not an
// icon in a circle. Gold line art on navy, double-ring frame, CIP canon.
// Sizes: 20 (inline chip), 34 (scorecard), 72 (ceremony/library detail).

const GOLD = '#F8C761'
const GOLD_DEEP = '#E6B54F'

// Emblems are drawn in a 48x48 space, centered around (24, 26) under the frame.
const EMBLEMS = {
  // Master Architect · a compass rose: the one who charts, then hands the map on
  'cartographer': (
    <g>
      <circle cx="24" cy="25" r="9.5" fill="none" />
      <path d="M24 13.5 L26.4 22.6 L35.5 25 L26.4 27.4 L24 36.5 L21.6 27.4 L12.5 25 L21.6 22.6 Z" fill="rgba(248,199,97,0.16)" />
      <circle cx="24" cy="25" r="1.6" fill={GOLD} stroke="none" />
    </g>
  ),
  // Master Architect · the lever: small force, moved world
  'leverage': (
    <g>
      <path d="M11 33 L37 20" />
      <path d="M20 36 L28 36 L24 29.5 Z" fill="rgba(248,199,97,0.16)" />
      <circle cx="35" cy="19" r="3.4" fill="rgba(248,199,97,0.16)" />
      <circle cx="13.5" cy="31.5" r="1.7" fill={GOLD} stroke="none" />
    </g>
  ),
  // Master Architect · the sealed check: finished, judged, banked
  'closer': (
    <g>
      <path d="M24 12.5 L34.5 18.5 V31.5 L24 37.5 L13.5 31.5 V18.5 Z" fill="rgba(248,199,97,0.10)" />
      <path d="M18.5 25.5 L22.5 29.5 L30 20.5" strokeWidth="2.4" />
    </g>
  ),
  // Integrated Sovereign · the rampart: what is not yours stays outside
  'walling': (
    <g>
      <path d="M14 34 V20 h4 v-3.5 h4 V20 h4 v-3.5 h4 V20 h4 v14 Z" fill="rgba(248,199,97,0.10)" />
      <path d="M22 34 v-6.5 h4 V34" />
    </g>
  ),
  // Integrated Sovereign · still water under a small sun: meaning without crisis
  'calm-water': (
    <g>
      <circle cx="30.5" cy="17.5" r="3" fill="rgba(248,199,97,0.2)" />
      <path d="M13 26.5 q5.5 -3.4 11 0 t11 0" />
      <path d="M13 32 q5.5 -3.4 11 0 t11 0" />
    </g>
  ),
  // Integrated Sovereign · the pan: every discovery sifted, nothing left raw
  'prospector': (
    <g>
      <path d="M13.5 24 A 10.5 10.5 0 0 0 34.5 24 Z" fill="rgba(248,199,97,0.10)" />
      <circle cx="20.5" cy="27.5" r="1.4" fill={GOLD} stroke="none" />
      <circle cx="25.5" cy="29.5" r="1.7" fill={GOLD} stroke="none" />
      <circle cx="29" cy="26.5" r="1.1" fill={GOLD} stroke="none" />
      <path d="M15 19.5 L20 16" />
    </g>
  ),
  // Playbound Creator · the hourglass: hours truly in the seat
  'deep-work': (
    <g>
      <path d="M17 14.5 h14 M17 35.5 h14" strokeWidth="2.2" />
      <path d="M18.5 14.5 c0 6 4 7.5 5.5 10.5 c1.5 -3 5.5 -4.5 5.5 -10.5 M18.5 35.5 c0 -6 4 -7.5 5.5 -10.5 c1.5 3 5.5 4.5 5.5 10.5" fill="rgba(248,199,97,0.10)" />
      <path d="M21.5 32.5 c0.8 -1.6 4.2 -1.6 5 0 Z" fill={GOLD} stroke="none" />
    </g>
  ),
  // Playbound Creator · the sealed letter: the correspondence held, not hoarded
  'correspondent': (
    <g>
      <rect x="13.5" y="17.5" width="21" height="15" rx="1.5" fill="rgba(248,199,97,0.08)" />
      <path d="M13.5 19 L24 27 L34.5 19" />
      <circle cx="30.5" cy="30" r="3.6" fill="rgba(248,199,97,0.35)" />
    </g>
  ),
  // Playbound Creator · the open tome: the day written down as knowledge
  'chronicler': (
    <g>
      <path d="M24 16.5 c-3.5 -2.2 -8 -2.2 -10.5 -1 V33 c2.5 -1.2 7 -1.2 10.5 1 c3.5 -2.2 8 -2.2 10.5 -1 V15.5 c-2.5 -1.2 -7 -1.2 -10.5 1 Z" fill="rgba(248,199,97,0.08)" />
      <path d="M24 16.5 V34" />
      <path d="M17 21.5 h4.5 M17 25.5 h4.5 M26.5 21.5 h4.5 M26.5 25.5 h4.5" strokeWidth="1.2" opacity="0.8" />
    </g>
  ),
  // Perception · the beacon tower: the whole day visible to the watcher
  'clear-signal': (
    <g>
      <path d="M24 20 L19 35 h10 Z" fill="rgba(248,199,97,0.10)" />
      <circle cx="24" cy="17.5" r="2" fill={GOLD} stroke="none" />
      <path d="M17.5 13.5 a 9 9 0 0 1 13 0 M20 16.5 a 5.5 5.5 0 0 1 8 0" fill="none" opacity="0.85" />
    </g>
  ),
  // ---- River badges (miles_ledger). Same grammar: gold line art, faint fill.
  // Main Mission Complete · a flag planted on the peak
  'main-mission': (
    <g>
      <path d="M12 36 L21 22 L26 28 L31 19 L36 36 Z" fill="rgba(248,199,97,0.10)" />
      <path d="M31 19 V10.5" />
      <path d="M31 10.5 h7 l-2 2.5 l2 2.5 h-7 Z" fill="rgba(248,199,97,0.35)" />
    </g>
  ),
  // Side Mission Complete · a small target, the arrow home
  'side-mission': (
    <g>
      <circle cx="24" cy="25" r="10" fill="none" />
      <circle cx="24" cy="25" r="5.5" fill="rgba(248,199,97,0.12)" />
      <circle cx="24" cy="25" r="1.6" fill={GOLD} stroke="none" />
      <path d="M24 25 L34 15" />
      <path d="M31 15 h3.5 v3.5" />
    </g>
  ),
  // Maintenance Bundle · the wrench, five turns
  'maintenance-bundle': (
    <g>
      <path d="M29 13.5 a6 6 0 0 0 -7 8.2 L13.5 30.2 a2.4 2.4 0 0 0 3.4 3.4 L25.4 25 a6 6 0 0 0 8.2 -7 l-3.6 3.6 l-3.4 -0.8 l-0.8 -3.4 Z" fill="rgba(248,199,97,0.12)" />
      <circle cx="15.5" cy="32" r="0.9" fill={GOLD} stroke="none" />
    </g>
  ),
  // Exercise · the kettlebell
  'exercise': (
    <g>
      <path d="M18.5 21 c-1.5 -7 3 -9 5.5 -9 s7 2 5.5 9" fill="none" />
      <circle cx="24" cy="27.5" r="8" fill="rgba(248,199,97,0.12)" />
      <path d="M20.5 27 q3.5 -2.5 7 0" strokeWidth="1.2" opacity="0.8" />
    </g>
  ),
  // Sleep · the crescent moon over still water
  'sleep': (
    <g>
      <path d="M27.5 13 a10 10 0 1 0 6.5 16.5 a8 8 0 0 1 -6.5 -16.5 Z" fill="rgba(248,199,97,0.12)" />
      <circle cx="15" cy="17" r="1" fill={GOLD} stroke="none" />
      <circle cx="19.5" cy="12.5" r="0.8" fill={GOLD} stroke="none" />
      <path d="M13 35 q5.5 -3 11 0 t11 0" opacity="0.8" />
    </g>
  ),
  // Toastmaster General · the microphone at the lectern
  'toastmaster': (
    <g>
      <rect x="20" y="11.5" width="8" height="13" rx="4" fill="rgba(248,199,97,0.14)" />
      <path d="M16.5 20.5 a7.5 7.5 0 0 0 15 0" fill="none" />
      <path d="M24 28 V33" />
      <path d="M17 36 h14" />
      <path d="M22 16 h4 M22 19 h4" strokeWidth="1.1" opacity="0.7" />
    </g>
  ),
  // Work Horse · the plow, furrow behind it
  'work-horse': (
    <g>
      <path d="M13 34 q11 -2.5 22 0" opacity="0.7" />
      <path d="M13 30 q11 -2.5 22 0" opacity="0.45" />
      <path d="M31 13.5 L24 21 L20 25.5 L25 29.5" />
      <path d="M31 13.5 L35 16.5" />
      <path d="M17 25.5 h9" />
      <path d="M22 21.5 L17 28 h5 Z" fill="rgba(248,199,97,0.18)" />
    </g>
  ),
  // Clean Close · the door shut for the night
  'clean-close': (
    <g>
      <rect x="15.5" y="12.5" width="17" height="24" rx="1.5" fill="rgba(248,199,97,0.10)" />
      <rect x="19" y="16" width="10" height="7" rx="0.8" fill="none" strokeWidth="1.1" opacity="0.8" />
      <circle cx="28.5" cy="27.5" r="1.4" fill={GOLD} stroke="none" />
      <path d="M12.5 36.5 h23" />
    </g>
  ),
  // Discomforter · a flame over cold water, on purpose
  'discomforter': (
    <g>
      <path d="M24 11.5 c-1 4 -6 6 -6 11.5 a6 6 0 0 0 12 0 c0 -3.5 -2 -5 -2.5 -7.5 c-1 1.5 -2 2.5 -3.5 -4 Z" fill="rgba(248,199,97,0.14)" />
      <path d="M22 26 a2.2 2.2 0 0 0 4 0 c0 -1.5 -1.2 -2.2 -2 -3.8 c-0.8 1.6 -2 2.3 -2 3.8 Z" fill={GOLD} stroke="none" opacity="0.7" />
      <path d="M13 33 q5.5 -3.2 11 0 t11 0" />
      <path d="M13 37 q5.5 -3.2 11 0 t11 0" opacity="0.6" />
    </g>
  ),
  // Hygiene · the droplet with a spark
  'hygiene': (
    <g>
      <path d="M24 12.5 c-4 6 -8 10 -8 15.5 a8 8 0 0 0 16 0 c0 -5.5 -4 -9.5 -8 -15.5 Z" fill="rgba(248,199,97,0.12)" />
      <path d="M19.5 28.5 a4.5 4.5 0 0 0 3 4" strokeWidth="1.2" opacity="0.8" />
      <path d="M34 15 v5 M31.5 17.5 h5" strokeWidth="1.3" />
      <path d="M13.5 22 v3 M12 23.5 h3" strokeWidth="1.1" opacity="0.7" />
    </g>
  ),
}

// Unknown ids fall back to a plain struck coin: a single point at the center.
const GENERIC = (
  <g>
    <circle cx="24" cy="25" r="7" fill="rgba(248,199,97,0.10)" />
    <circle cx="24" cy="25" r="1.6" fill={GOLD} stroke="none" />
  </g>
)

import { BADGES, badgeTier, TIER_COLORS } from '../constants/collection'
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

export default function BadgeMedallion({ id, size = 34, earned = true, glow = false }) {
  const emblem = EMBLEMS[id] || GENERIC
  const tierColor = BADGES[id] && !BADGES[id].legacy ? TIER_COLORS[badgeTier(id)] : GOLD
  const stroke = earned ? tierColor : 'rgba(234,241,248,0.28)'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{
      display: 'block', flexShrink: 0,
      filter: glow ? `drop-shadow(0 0 10px ${earned ? hexA(tierColor, 0.55) : 'rgba(248,199,97,0.55)'})` : undefined,
      opacity: earned ? 1 : 0.45,
    }}>
      <circle cx="24" cy="24" r="22.5" fill={earned ? hexA(tierColor, 0.06) : 'rgba(255,255,255,0.03)'} stroke={stroke} strokeWidth="1.6" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.65" />
      <g transform="translate(0,-1)" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {emblem}
      </g>
    </svg>
  )
}
