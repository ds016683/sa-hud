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
}

export default function BadgeMedallion({ id, size = 34, earned = true, glow = false }) {
  const emblem = EMBLEMS[id]
  if (!emblem) return null
  const stroke = earned ? GOLD : 'rgba(234,241,248,0.28)'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{
      display: 'block', flexShrink: 0,
      filter: glow ? 'drop-shadow(0 0 10px rgba(248,199,97,0.55))' : undefined,
      opacity: earned ? 1 : 0.45,
    }}>
      <circle cx="24" cy="24" r="22.5" fill={earned ? 'rgba(248,199,97,0.06)' : 'rgba(255,255,255,0.03)'} stroke={stroke} strokeWidth="1.6" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke={earned ? GOLD_DEEP : stroke} strokeWidth="0.8" opacity="0.65" />
      <g transform="translate(0,-1)" stroke={stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {emblem}
      </g>
    </svg>
  )
}
