// The yay page (David's word, 10/12): the Mission Summary shown when a mission
// closes, and again from any closed mission. Type, miles netted, dates, the
// clock, the gates, Achieved in David's words, and what it left behind.
import { useEffect, useState } from 'react'
import { X as XIcon, Check, ExternalLink } from 'lucide-react'
import BadgeMedallion from '../BadgeArt'
import { missionSummary, fmtDay } from '../../lib/summary'
import { signedUrl } from '../../lib/archive'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GREEN, BLUE, MONO, SERIF, S, KindIcon, Label, NORTH_STAR_LABEL, LABEL, alpha, RED } from './canon'
import DocView from './DocView'
import SessionBoard from './SessionBoard'

const Fact = ({ label, children }) => <div><Label>{label}</Label><div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 17, color: INK, lineHeight: 1.25 }}>{children}</div></div>

export default function YayPage({ objectiveId, onClose, fresh = false, onOpenMission = null }) {
  const [m, setM] = useState(null)
  const [err, setErr] = useState(null)
  const [reading, setReading] = useState(null)
  useEffect(() => { let on = true; missionSummary(objectiveId).then(x => { if (on) setM(x) }).catch(e => { if (on) setErr(e.message) }); return () => { on = false } }, [objectiveId])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const color = m ? m.color : GOLD
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(5,16,28,0.86)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#0F2338', border: `1px solid ${alpha(color, 33)}`, borderRadius: 16, padding: '34px 32px 26px', boxShadow: `0 0 60px -20px ${color}` }}>
        {err && <div style={{ fontFamily: MONO, fontSize: 10, color: RED, letterSpacing: '1px', textTransform: 'uppercase' }}>{err}</div>}
        {!m && !err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL }}>Reading the Ledger</div>}
        {reading && (
          <div onClick={() => setReading(null)} style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(5,16,28,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px', display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL }}>{reading.kind} · filed {fmtDay(reading.filed_at)}</div>
                  <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, color: '#fff', margin: '4px 0 0', lineHeight: 1.25 }}>{reading.title}</h3>
                </div>
                <button onClick={() => setReading(null)} style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer' }}><XIcon size={18} /></button>
              </div>
              {reading.kind === 'board' && reading.body?.phases ? <SessionBoard board={{ id: reading.id, title: reading.title, phases: reading.body.phases }} compact /> : reading.body ? <DocView doc={reading.body} /> : <div style={{ fontSize: 14, lineHeight: 1.65, color: INK2 }}>{reading.summary}</div>}
            </div>
          </div>
        )}
        {m && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              <BadgeMedallion id={m.badge} size={118} glow color={color} />
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color, display: 'inline-flex', alignItems: 'center', gap: 8 }}><KindIcon kind={m.kind} size={12} color={color} />{fresh ? 'Mission complete' : 'Mission Summary'} · {m.type}</div>
                <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 28, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1.2, margin: '8px 0 4px' }}>{m.title}</h2>
                {m.project && <div style={{ fontSize: 13.5, color: INK2 }}>{m.project}{m.projectKey ? <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, marginLeft: 8 }}>{m.projectKey}</span> : null}</div>}
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: GRAY, marginTop: 6 }}>{m.lore}</div>
              </div>
              <button onClick={onClose} title="Close" style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer', alignSelf: 'flex-start' }}><XIcon size={18} /></button>
            </div>

            <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
              <Label style={{ color: BLUE }}>{NORTH_STAR_LABEL}</Label>
              {m.north_star
                ? <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.45, color: INK }}>{m.north_star}</div>
                : <div style={{ fontSize: 13.5, color: GRAY }}>No star was written for this one.</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, borderTop: `1px solid ${PANEL_BORDER}`, borderBottom: `1px solid ${PANEL_BORDER}`, padding: '14px 0' }}>
              <Fact label="Miles netted"><span style={{ fontSize: 30, color: GOLD }}>{m.miles}</span>{m.size === 'heavy' && m.kind === 'Side Mission' && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY, marginTop: 2 }}>50 + 10 × {m.gatesPaid} gates</div>}</Fact>
              <Fact label="Opened">{fmtDay(m.opened)}</Fact>
              <Fact label="Closed">{fmtDay(m.closed)}</Fact>
              <Fact label="In flight">{m.days ? `${m.days} day${m.days === 1 ? '' : 's'}` : '—'}</Fact>
              <Fact label="On the clock">{m.minutes ? `${Math.floor(m.minutes / 60)}h ${m.minutes % 60}m` : 'no clock'}</Fact>
            </div>

            {m.gates.length > 0 && (
              <div>
                <Label>Gates · {m.gatesDone} of {m.gatesTotal}</Label>
                <div style={{ display: 'grid', gap: 5 }}>
                  {m.gates.map((g, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: g.done ? INK2 : GRAY }}>
                      <span style={{ width: 16, height: 16, borderRadius: 99, flexShrink: 0, marginTop: 2, background: g.done ? GREEN : 'transparent', border: g.done ? 'none' : '1.5px solid rgba(234,241,248,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{g.done && <Check size={10} color='var(--hud-on-accent)' />}</span>
                      <span style={{ flex: 1 }}>{g.text}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, whiteSpace: 'nowrap' }}>{g.done_at ? fmtDay(g.done_at) : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Achieved{m.north_star ? ' · What Is Different Now' : ''}</Label>
              {m.achieved
                ? <div style={{ fontSize: 15.5, lineHeight: 1.7, color: INK }}>{m.achieved}{m.achievedFrom === 'archive' && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', textTransform: 'uppercase', color: LABEL, marginTop: 6 }}>from the close-out summary, before Achieved was asked</div>}{m.achievedFrom === 'achieved' && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', textTransform: 'uppercase', color: LABEL, marginTop: 6 }}>in David's words at close</div>}</div>
                : <div style={{ fontSize: 13.5, color: GRAY }}>Nothing written at close. Tell Lumen what was achieved and it lands here.</div>}
            </div>

            {m.attachments.length > 0 && (
              <div>
                <Label>Left behind</Label>
                <div style={{ display: 'grid', gap: 5 }}>
                  {m.attachments.map(a => (
                    <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, color: INK2 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, width: 64, flexShrink: 0 }}>{a.kind}</span>
                      <span style={{ flex: 1 }}>{a.title}</span>
                      {a.kind === 'file' && a.path
                        ? <button onClick={async () => { const u = await signedUrl(a.bucket || 'project-files', a.path); if (u) window.open(u, '_blank', 'noopener') }} style={{ background: 'transparent', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK2, cursor: 'pointer', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5 }}><ExternalLink size={10} /> open</button>
                        : <button onClick={() => setReading(a)} style={{ background: 'transparent', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK2, cursor: 'pointer', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5 }}><ExternalLink size={10} /> read</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14, flexWrap: 'wrap' }}>
              {onOpenMission && <button onClick={() => onOpenMission(m.objective)} style={S.btnGhost}><ExternalLink size={11} /> Open mission page</button>}
              <button onClick={onClose} style={S.btnPrimary}>Continue</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
