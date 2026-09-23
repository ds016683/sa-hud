// The HUD's shared design canon (CIP treatment): navy stage, Lora headings at
// deck weight and tracking, mono eyebrows, hairline panels, gold as the single
// warm accent and periwinkle/blue as the cool one. Every River page imports
// from here so the surfaces read as one system.
export const INK = '#EAF1F8'
export const INK2 = 'rgba(234,241,248,0.66)'
export const GRAY = 'rgba(234,241,248,0.45)'
export const NAVY_DEEP = '#0E2336'
export const PANEL_BORDER = 'rgba(255,255,255,0.10)'
export const PANEL_BG = 'rgba(255,255,255,0.035)'
export const GOLD = '#E6B54F'
export const GOLD_BRIGHT = '#F8C761'
export const BLUE = '#A9C9E8'
export const PERIWINKLE = '#96A8F0'
export const PURPLE = '#B4A3E8'
export const GREEN = '#43D392'
export const RED = '#E8836F'
export const MONO = 'var(--font-mono, monospace)'
export const SERIF = "'Lora', Georgia, serif"

export const S = {
  page: { maxWidth: 1180, margin: '0 auto', padding: '4px 0 80px', color: INK },
  h1: { fontSize: 28, fontWeight: 500, margin: 0, color: '#FFFFFF', fontFamily: SERIF, letterSpacing: '-0.01em' },
  sub: { fontSize: 10, color: GRAY, margin: '6px 0 0', fontFamily: MONO, letterSpacing: '1.4px', textTransform: 'uppercase' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16, marginBottom: 12 },
  panelTitle: { fontSize: 10, fontWeight: 600, color: BLUE, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: 10, fontFamily: MONO },
  chip: (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }),
  source: { fontSize: 10, color: GRAY, marginTop: 10, fontFamily: MONO, letterSpacing: '0.4px' },
}

export const Eyebrow = ({ children, style }) => (
  <div style={{ color: GOLD_BRIGHT, fontFamily: MONO, fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7, ...style }}>
    <span style={{ fontSize: 8, transform: 'translateY(-0.5px)' }}>▲</span>{children}
  </div>
)
export const Serif = ({ children, size = 20, style }) => (
  <div style={{ fontFamily: SERIF, fontSize: size, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25, ...style }}>{children}</div>
)
export const Body = ({ children, style }) => <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, ...style }}>{children}</div>
export const Label = ({ children, style }) => <div style={{ fontSize: 9.5, color: GRAY, textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 5, fontFamily: MONO, ...style }}>{children}</div>
export const Stat = ({ v, l, color = '#fff' }) => (
  <div style={{ borderLeft: `2px solid ${BLUE}55`, paddingLeft: 12 }}>
    <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{v}</div>
    <div style={{ fontSize: 11, color: GRAY, marginTop: 3, lineHeight: 1.45 }}>{l}</div>
  </div>
)
export const Panel = ({ title, children, style }) => (
  <div style={{ ...S.panel, ...style }}>
    {title && <div style={S.panelTitle}>{title}</div>}
    {children}
  </div>
)

export const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const chiDayOf = (iso) => iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : null
export const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''
export const fmtDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''
export const weekday = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : ''
