// The mark for each kind of mission, always to the left of its title (David 11/20: "can we take our iconography for
// a main mission, mythic, contract, and bounty. The icon should sit to the left of the title"). Main Mission is the
// HUD's own flag on the peak; Mythic a coat of arms; Contract a signed page; Bounty the target.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ART = {
  'Main Mission': <svg viewBox="9 7 32 32" {...P} strokeWidth={2.2}><path d="M12 36 L21 22 L26 28 L31 19 L36 36 Z" fill="currentColor" fillOpacity=".14" /><path d="M31 19 V10.5" /><path d="M31 10.5 h7 l-2 2.5 l2 2.5 h-7 Z" fill="currentColor" fillOpacity=".4" /></svg>,
  Mythic: <svg viewBox="0 0 24 24" {...P}><path d="M12 2.5 4.5 5.5v6c0 4.800 3.200 8.200 7.500 10 4.300-1.800 7.500-5.200 7.500-10v-6z" fill="currentColor" fillOpacity=".12" /><path d="M12 6.500v9.500M9.300 14h5.400M12 16v2" /><path d="M10.900 8.300 12 6.500l1.100 1.800" /></svg>,
  Contract: <svg viewBox="0 0 24 24" {...P}><path d="M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 14.500h4" /><circle cx="15.5" cy="17.5" r="1.8" fill="currentColor" fillOpacity=".4" /></svg>,
  Bounty: <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>,
}
// kind: 'Main Mission' | 'Mythic' | 'Contract' | 'Bounty'. size is the circle; the art is half of it.
export default function KindMark({ kind, size = 36, color = 'currentColor', ring = true }) {
  const art = ART[kind] || ART.Bounty
  return (
    <span title={kind} aria-label={kind} style={{ width: size, height: size, borderRadius: 99, flexShrink: 0, display: 'inline-grid', placeItems: 'center', color, border: ring ? `1.5px solid ${color}` : 'none', background: ring ? `color-mix(in srgb, ${color} 10%, transparent)` : 'transparent' }}>
      <span style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5), display: 'grid' }}>{art}</span>
    </span>
  )
}
