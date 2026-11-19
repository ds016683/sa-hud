// The three places a card can be, as glyphs in the Marathon map idiom (David 11/7: a reticle ring, an arrow,
// ticks). They are the Board's own marks, shared with the card (David 11/17: "icons here instead of prose").
import { useState } from 'react'
import { GOLD, alpha } from './canon'

const GLYPH = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

// Loadout: up into the slot.
export const GlyphLoadout = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...GLYPH}>
    <path d="M4.5 9.5v-5h15v5" />
    <path d="M12 20V9M8.2 12.8 12 9l3.8 3.8" />
    <path d="M7.5 19.5h-2M18.5 19.5h-2" />
  </svg>
)
// Holster: back out to its repository.
export const GlyphHolster = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...GLYPH}>
    <path d="M9.5 4.5H4.5v15h5" />
    <path d="M20 12H9M12.8 8.2 9 12l3.8 3.8" />
    <path d="M19.5 7.5v-2M19.5 18.5v-2" />
  </svg>
)
// Stash: down onto the stack.
export const GlyphStash = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...GLYPH}>
    <path d="M4 14.5l8 4 8-4M4 18l8 4 8-4" />
    <path d="M12 2.5V13M8.3 9.3 12 13l3.7-3.7" />
  </svg>
)

// Extract is the Marathon exfil marker (David 11/7, from his frame): a peaked badge with a bold up-arrow. The marker is the
// button's own shape, gold outline and arrow at rest, gold fill with the arrow in navy on hover, so it keeps the house palette.
export function ExtractMarker({ title, onClick, size = 34, color = GOLD }) {
  const [hot, setHot] = useState(false)
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{ width: size, height: size, padding: 0, border: 'none', background: 'transparent', color, display: 'inline-grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', transition: 'filter 0.15s', filter: hot ? `drop-shadow(0 0 4px ${alpha(color, 55)})` : 'none' }}>
        <path d="M12 1.6 22 9.3v11.1a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 20.4V9.3Z" fill={hot ? color : alpha(color, 8)} stroke={color} strokeWidth={1.5} strokeLinejoin="round" style={{ transition: 'fill 0.15s' }} />
        <path d="M12 18.2V8.4M7.9 12.2 12 8.1l4.1 4.1" fill="none" stroke={hot ? 'var(--hud-on-accent)' : color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.15s' }} />
      </svg>
    </button>
  )
}
