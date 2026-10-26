import { Target, Zap } from 'lucide-react'
// The HUD's shared design canon (CIP treatment): navy stage, Lora headings at
// deck weight and tracking, mono eyebrows, hairline panels, gold as the single
// warm accent and periwinkle/blue as the cool one. Every River page imports
// from here so the surfaces read as one system.
export const INK = 'var(--hud-ink)'
export const INK2 = 'var(--hud-ink-2)'
export const GRAY = 'var(--hud-ink-3)'      // off, closed, disabled, placeholder: never a live label
export const LABEL = 'var(--hud-accent)'                      // eyebrows and field labels (David, 10/17): distinct, not loud
export const MUTED = 'var(--hud-ink-2)'      // live secondary text (timestamps, captions, meta)
export const NAVY_DEEP = 'var(--hud-on-accent)'
export const PANEL_BORDER = 'var(--hud-border)'
export const PANEL_BG = 'var(--hud-fill)'
export const GOLD = 'var(--hud-gold)'
export const GOLD_BRIGHT = 'var(--hud-gold)'
export const BLUE = 'var(--hud-accent)'
export const PERIWINKLE = 'var(--hud-accent)'
export const PURPLE = 'var(--hud-accent)'
export const GREEN = 'var(--hud-pos)'
export const SUCCESS = 'var(--hud-success)'  // done, closed, delivered, approved, achieved: the medallion purple (David, 10/25). GREEN stays for running clocks, live pulses, money up and utility buttons
export const RED = 'var(--hud-neg)'
export const MONO = 'var(--font-label, sans-serif)'   // CIP labels: Instrument Sans uppercase (10/24); true mono is MONO_CODE
export const MONO_CODE = 'var(--font-mono, monospace)'
export const CAUTION = 'var(--hud-warn)'
// Alpha on a token (10/24): tokens are CSS variables now, so hex suffixes cannot be
// appended. alpha(BLUE, 40) is the old `${alpha(BLUE, 40)}`.
export const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
export const SERIF = "'Lora', Georgia, serif"

export const S = {
  page: { maxWidth: 1180, margin: '0 auto', padding: '4px 0 80px', color: INK },
  h1: { fontSize: 28, fontWeight: 500, margin: 0, color: INK, fontFamily: SERIF, letterSpacing: '-0.01em' },
  sub: { fontSize: 10.5, color: LABEL, margin: '6px 0 0', fontFamily: MONO, letterSpacing: '1.4px', textTransform: 'uppercase' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16, marginBottom: 12 },
  panelTitle: { fontSize: 16, fontWeight: 600, color: LABEL, letterSpacing: '0.1px', marginBottom: 10 },
  chip: (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }),
  source: { fontSize: 10, color: GRAY, marginTop: 10, fontFamily: MONO, letterSpacing: '0.4px' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 8, border: `1px solid ${GOLD}`, background: GOLD, color: NAVY_DEEP, cursor: 'pointer' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer' },
}

export const Eyebrow = ({ children, style }) => (
  <div style={{ color: GOLD_BRIGHT, fontFamily: MONO, fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7, ...style }}>
    <span style={{ fontSize: 8, transform: 'translateY(-0.5px)' }}>▲</span>{children}
  </div>
)
export const Serif = ({ children, size = 20, style }) => (
  <div style={{ fontFamily: SERIF, fontSize: size, fontWeight: 500, color: INK, letterSpacing: '-0.01em', lineHeight: 1.25, ...style }}>{children}</div>
)
export const Body = ({ children, style }) => <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, ...style }}>{children}</div>
// Headers are never smaller than the content under them (David, 10/17): a
// field or section label reads in Title Case at 14px, LABEL color, body face.
export const titleCase = (t) => typeof t === 'string' ? t.replace(/(^|\s)([a-z])(?=[a-z']*)/g, (m, sp, c, i) => sp + ((i === 0 || !/^(a|an|and|at|by|for|in|of|on|or|the|to|vs|with)\b/.test(t.slice(i + sp.length))) ? c.toUpperCase() : c)) : t
// Type scale (David, 10/18): header 16/600 > sub-head 14.5/600 > body 13.5 > meta 10.5 mono. A header is always a clear step above the text under it.
export const TYPE = { header: 16, subhead: 14.5, body: 13.5, meta: 10.5 }
export const Label = ({ children, style }) => <div style={{ fontSize: TYPE.header, fontWeight: 600, color: LABEL, letterSpacing: '0.1px', marginBottom: 8, lineHeight: 1.3, ...style }}>{titleCase(children)}</div>
export const SubLabel = ({ children, color = LABEL, style }) => <div style={{ fontSize: TYPE.subhead, fontWeight: 600, color, marginBottom: 5, ...style }}>{titleCase(children)}</div>
export const Stat = ({ v, l, color = INK }) => (
  <div style={{ borderLeft: `2px solid ${alpha(BLUE, 33)}`, paddingLeft: 12 }}>
    <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{v}</div>
    <div style={{ fontSize: 11, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>{l}</div>
  </div>
)
// A section labelled in a rail to the left of its box: the name in serif, a
// short line under it. The box itself carries only controls. Collapses to
// label-above on narrow screens (see .rail-section in the page CSS).
export const RailSection = ({ title, children, style }) => (
  <div className="rail-section" style={{ display: 'grid', gridTemplateColumns: '172px minmax(0, 1fr)', gap: 20, alignItems: 'center', marginBottom: 14, ...style }}>
    <div className="rail-label" style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: INK, letterSpacing: '-0.01em', lineHeight: 1.15 }}>{title}</div>
    <div style={{ minWidth: 0 }}>{children}</div>
  </div>
)
// Panel headings on the Board page (David, 10/7): the serif, baby blue,
// bigger than the mono eyebrow. heading="..." renders that; title keeps the
// old mono label for pages not yet moved over.
export const PanelHeading = ({ children, style }) => (
  <div style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 500, color: BLUE, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 14, ...style }}>{children}</div>
)
export const Panel = ({ title, heading, children, style }) => (
  <div style={{ ...S.panel, ...style }}>
    {heading && <PanelHeading>{heading}</PanelHeading>}
    {title && !heading && <div style={S.panelTitle}>{title}</div>}
    {children}
  </div>
)

export const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const chiDayOf = (iso) => iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : null
export const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''
export const fmtDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''
export const weekday = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : ''

// The kinds and their colors (the cannon): Main Mission purple, Side Mission
// gold, Ad Hoc green. Every chip, label and icon that names a kind reads here.
export const KIND_COLOR = { 'Main Mission': PURPLE, 'Side Mission': GOLD, 'Ad Hoc': GREEN, 'Session': BLUE, 'Event': BLUE }
// The Main Mission mark: the flag planted on the peak, drawn like the badge.
export function MissionMark({ size = 14, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="9 7 32 32" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path d="M12 36 L21 22 L26 28 L31 19 L36 36 Z" fill={color} fillOpacity="0.14" />
      <path d="M31 19 V10.5" />
      <path d="M31 10.5 h7 l-2 2.5 l2 2.5 h-7 Z" fill={color} fillOpacity="0.4" />
    </svg>
  )
}
export const KindIcon = ({ kind, size = 11, color }) => kind === 'Main Mission' ? <MissionMark size={size} color={color} /> : kind === 'Side Mission' ? <Target size={size} color={color} /> : kind === 'Ad Hoc' ? <Zap size={size} color={color} /> : null
export const KindChip = ({ kind }) => {
  const c = KIND_COLOR[kind] || INK2
  return <span style={{ ...S.chip('transparent', c), border: `1px solid ${alpha(c, 33)}`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 5 }}><KindIcon kind={kind} color={c} />{kind}</span>
}

// The Polaris Objective (David, 10/12): one line on every mission, written at
// capture, carried on the card, first in the brain, top of the yay page, and
// answered by Achieved at close. Labels like this one read in Title Case
// (the first letter of each word capitalized), David's cannon 10/13.
export const NORTH_STAR_LABEL = "Polaris Objective"   // David, 10/18: the one line every mission steers by (was "What Will Be True, That Wasn't True Before")
export const NORTH_STAR_ASK = "Polaris Objective: what will be true when this is done? One sentence."
