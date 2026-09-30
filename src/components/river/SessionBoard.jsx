// A Claude session board, rendered in place: the title line with live/idle
// and progress, then phases and their items. Clicking an item toggles it
// done and saves to the Ledger, the same as the agent would.
import { useRef, useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GREEN, RED, MONO, SERIF } from './canon'

export const boardStats = (phases) => {
  const tasks = (phases || []).flatMap(p => p.tasks || [])
  return { done: tasks.filter(t => t.status === 'done').length, total: tasks.length }
}
export const isLive = (iso) => iso && (Date.now() - new Date(iso).getTime()) < 10 * 60_000
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

export default function SessionBoard({ board, onChange, compact = false }) {
  const [phases, setPhases] = useState(board.phases || [])
  const savingRef = useRef(false)
  const stats = boardStats(phases)
  const live = isLive(board.updated_at)

  const toggle = async (pi, ti) => {
    if (savingRef.current) return
    const next = phases.map((p, i) => i !== pi ? p : { ...p, tasks: (p.tasks || []).map((t, j) => j !== ti ? t : { ...t, status: t.status === 'done' ? 'open' : 'done' }) })
    savingRef.current = true
    setPhases(next)
    const { error } = await supabase.from('session_boards').update({ phases: next, updated_at: new Date().toISOString() }).eq('id', board.id)
    savingRef.current = false
    if (error) setPhases(phases)
    else onChange && onChange(next)
  }

  const Mark = ({ t }) => {
    if (t.status === 'done') return <span style={{ width: 20, height: 20, borderRadius: 99, background: GREEN, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={12} color="#0A1B2B" strokeWidth={3} /></span>
    if (t.status === 'blocked') return <AlertCircle size={20} color={RED} style={{ flexShrink: 0 }} />
    return <span style={{ width: 20, height: 20, borderRadius: 99, border: `1.5px solid ${t.status === 'inmotion' ? GOLD : 'rgba(234,241,248,0.3)'}`, display: 'inline-block', flexShrink: 0 }} />
  }

  return (
    <div>
      <style>{`@keyframes sbpulse { 0%,100% { opacity: 1 } 50% { opacity: .25 } } .sb-pulse { animation: sbpulse 1.8s ease-in-out infinite }`}</style>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', borderBottom: `1px solid ${PANEL_BORDER}`, paddingBottom: 14 }}>
        <div style={{ fontFamily: SERIF, fontSize: compact ? 20 : 26, fontWeight: 500, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{board.title || board.project}</div>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.6px', textTransform: 'uppercase', color: live ? GREEN : GRAY, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {live && <span className="sb-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} />}
          {live ? 'live' : 'idle'} · {stats.done}/{stats.total} done · updated {fmtTime(board.updated_at)}
        </span>
      </div>
      {phases.map((p, pi) => {
        const pd = (p.tasks || []).filter(t => t.status === 'done').length
        return (
          <div key={pi} style={{ marginTop: compact ? 20 : 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <div style={{ fontFamily: SERIF, fontSize: compact ? 15 : 16.5, fontWeight: 500, color: INK }}>{p.title}</div>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: pd === (p.tasks || []).length ? GOLD : GRAY }}>{pd} / {(p.tasks || []).length}</span>
            </div>
            {(p.tasks || []).map((t, ti) => (
              <button key={t.id || ti} onClick={() => toggle(pi, ti)} title={t.status === 'done' ? 'Reopen' : 'Mark done'} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '6.5px 0' }}>
                <Mark t={t} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: GOLD, letterSpacing: '0.5px', paddingTop: 2, flexShrink: 0 }}>{t.id}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: compact ? 13.5 : 15, lineHeight: 1.45, color: t.status === 'done' ? GRAY : INK, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.label}</span>
                  {t.note && <span style={{ display: 'block', fontSize: compact ? 12 : 13, lineHeight: 1.5, color: t.status === 'blocked' ? RED : GRAY, marginTop: 2 }}>{t.note}</span>}
                </span>
              </button>
            ))}
          </div>
        )
      })}
      {!phases.length && <div style={{ fontSize: 13, color: INK2, padding: '14px 0' }}>This board has no items yet.</div>}
    </div>
  )
}
