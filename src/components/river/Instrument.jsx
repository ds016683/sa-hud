// Console instruments (David, 10/7: "actual buttons with the label
// underneath, leaning into the dashboard aesthetic"). One square button per
// timer or protocol, its reading or icon inside, the light at its corner, the
// name under it. Groups sit side by side on the Console row.
import { PANEL_BORDER, GREEN, INK, INK2, GRAY, MONO, SERIF, Label } from './canon'

export const LEVEL_COLOR = { green: GREEN, gold: '#E6B54F', red: '#E8836F', gray: 'rgba(234,241,248,0.25)' }

export function Instrument({ label, sub, reading, unit, icon, light, running, clock, tone = INK2, onClick, onLightClick, disabled, title, extra, width = 96 }) {
  const lc = light ? (LEVEL_COLOR[light.level] || LEVEL_COLOR.gray) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width, gap: 7, opacity: disabled ? 0.5 : 1 }}>
      <button onClick={disabled ? undefined : onClick} title={title || label} style={{
        position: 'relative', width: 76, height: 76, borderRadius: 18, cursor: disabled ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 0,
        border: `1px solid ${running ? GREEN : PANEL_BORDER}`, background: running ? 'rgba(67,211,146,0.10)' : 'rgba(255,255,255,0.035)', color: INK,
        boxShadow: running ? `0 0 0 3px ${GREEN}22` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {light && <span onClick={onLightClick ? (e) => { e.stopPropagation(); onLightClick() } : undefined} title={light.text} className={light.blink ? 'rc-blink' : ''} style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 99, background: lc, boxShadow: light.level === 'gray' ? 'none' : `0 0 0 3px ${lc}33, 0 0 8px ${lc}66`, cursor: onLightClick ? 'pointer' : 'default' }} />}
        {reading != null
          ? <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, color: reading === '—' ? GRAY : '#fff' }}>{reading}</span>
          : <span style={{ color: running ? GREEN : tone, display: 'inline-flex' }}>{icon}</span>}
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.8px', textTransform: 'uppercase', color: running ? GREEN : GRAY }}>{running ? clock : unit || ''}</span>
      </button>
      <div style={{ fontSize: 12, color: INK, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
      {sub != null && <div title={typeof sub === 'string' ? sub : undefined} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.6px', color: GRAY, textAlign: 'center', maxWidth: width + 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: -3 }}>{sub}</div>}
      {extra}
    </div>
  )
}

export function InstrumentGroup({ label, children, divider = false, footer }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: divider ? 22 : 0, borderLeft: divider ? `1px solid ${PANEL_BORDER}` : 'none' }}>
      <Label style={{ marginBottom: 0 }}>{label}</Label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>{children}</div>
      {footer}
    </div>
  )
}

export const groupMsg = (msg, bad) => msg ? <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: bad ? '#E8836F' : '#F8C761', textTransform: 'uppercase', maxWidth: 420, lineHeight: 1.5 }}>{msg}</div> : null
