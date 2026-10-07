// Console instruments (David, 10/7: "actual buttons with the label
// underneath, leaning into the dashboard aesthetic"). One square button per
// timer or protocol, its reading or icon inside, the light at its corner, the
// name under it. Groups sit side by side on the Console row.
import { PANEL_BORDER, GREEN, INK, INK2, GRAY, MONO, SERIF, Label } from './canon'

export const LEVEL_COLOR = { green: GREEN, gold: '#E6B54F', red: '#E8836F', gray: 'rgba(234,241,248,0.25)' }

export function Instrument({ label, sub, reading, unit, icon, light, running, clock, tone = INK2, onClick, onLightClick, disabled, title, extra, width = 86 }) {
  const lc = light && light.level !== 'gray' ? (LEVEL_COLOR[light.level] || null) : null
  const anim = lc ? (light.blink ? 'inst-breathe-fast' : 'inst-breathe') : ''
  const border = running ? GREEN : lc ? `${lc}99` : PANEL_BORDER
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width, gap: 6, opacity: disabled ? 0.45 : 1 }}>
      <button onClick={disabled ? undefined : onClick} title={title || label} className={running ? '' : anim} style={{
        position: 'relative', width: 70, height: 70, borderRadius: 16, cursor: disabled ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 0,
        border: `1px solid ${border}`, background: running ? 'rgba(67,211,146,0.10)' : 'rgba(255,255,255,0.035)', color: INK,
        boxShadow: running ? `0 0 0 3px ${GREEN}22` : 'inset 0 1px 0 rgba(255,255,255,0.04)', '--inst-glow': lc || 'transparent',
      }}>
        {light && onLightClick && <span onClick={(e) => { e.stopPropagation(); onLightClick() }} title={light.text} style={{ position: 'absolute', inset: 0, borderRadius: 16 }} />}
        {reading != null
          ? <span style={{ fontFamily: SERIF, fontSize: 23, lineHeight: 1, color: reading === '—' ? GRAY : '#fff' }}>{reading}</span>
          : <span style={{ color: running ? GREEN : tone, display: 'inline-flex' }}>{icon}</span>}
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.8px', textTransform: 'uppercase', color: running ? GREEN : GRAY }}>{running ? clock : unit || ''}</span>
      </button>
      <div style={{ fontSize: 11.5, color: INK, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</div>
      <div title={typeof sub === 'string' ? sub : undefined} style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.6px', color: lc && !running ? lc : GRAY, textAlign: 'center', maxWidth: width + 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: -2, minHeight: 11 }}>{sub || ''}</div>
      {extra}
    </div>
  )
}

export const INSTRUMENT_CSS = `
@keyframes inst-breathe { 0%,100% { box-shadow: 0 0 0 0 transparent, inset 0 1px 0 rgba(255,255,255,0.04) } 50% { box-shadow: 0 0 12px 2px color-mix(in srgb, var(--inst-glow) 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.04) } }
@keyframes inst-breathe-fast { 0%,100% { box-shadow: 0 0 0 0 transparent } 50% { box-shadow: 0 0 14px 3px color-mix(in srgb, var(--inst-glow) 70%, transparent) } }
.inst-breathe { animation: inst-breathe 2.6s ease-in-out infinite } .inst-breathe-fast { animation: inst-breathe-fast 1.1s ease-in-out infinite }
`

export function InstrumentGroup({ label, children, divider = false, footer }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: divider ? '0 0 0 18px' : 0, borderLeft: divider ? `1px solid ${PANEL_BORDER}` : 'none' }}>
      <style>{INSTRUMENT_CSS}</style>
      <Label style={{ marginBottom: 0, textAlign: 'center' }}>{label}</Label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>{children}</div>
      {footer}
    </div>
  )
}

export const groupMsg = (msg, bad) => msg ? <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: bad ? '#E8836F' : '#F8C761', textTransform: 'uppercase', maxWidth: 420, lineHeight: 1.5 }}>{msg}</div> : null
