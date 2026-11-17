// The three places a card can be, as glyphs in the Marathon map idiom (David 11/7: a reticle ring, an arrow,
// ticks). They are the Board's own marks, shared with the card (David 11/17: "icons here instead of prose").
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
