// Not Ready To Extract (David 11/16): "I shouldn't be able to extract from a Main Mission
// with something still open. Have the system post an error and show me what still needs
// to be closed with a link to go back to the Main Mission or start working through some
// of the close outs." This is that error. It stands in front of every Extract: the open
// gates listed, each one closable right here, a Mythic's open milestones linked to their
// own cards, and the way back to the mission. Extract opens only when nothing is left.
import { useEffect, useState } from 'react'
import { X as XIcon, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { stillOpen } from '../../lib/loadout'
import { toggleStep } from '../../lib/objectives'
import { openCard } from '../../lib/card'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, SUCCESS, RED, SERIF, Label, MUTED, NAVY_DEEP, alpha } from './canon'

const btn = (kind = 'ghost', off = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, whiteSpace: 'nowrap',
  cursor: off ? 'default' : 'pointer', opacity: off ? 0.45 : 1,
  border: `1px solid ${kind === 'primary' ? GOLD : PANEL_BORDER}`, background: kind === 'primary' ? GOLD : 'transparent', color: kind === 'primary' ? NAVY_DEEP : INK2,
})

// The Ledger's hands, passed in so the dev harness can run the panel on sample data.
const LEDGER = { toggleStep, stillOpen, openCard }

// mission: { id, title }. open: what stillOpen(id) returned when the Extract was refused.
// onReady: everything is closed, carry on to the Extract. onClose: step away, nothing changed.
export default function StillOpen({ mission, open, onReady, onClose, api = LEDGER }) {
  // The rows as they stood at the refusal; closing one keeps it on the list, checked, so the work shows.
  const [steps, setSteps] = useState(() => (open?.steps || []).map(s => ({ ...s, done: false })))
  const [milestones, setMilestones] = useState(open?.milestones || [])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const left = steps.filter(s => !s.done).length + milestones.length
  const total = Math.max(open?.total || 0, steps.length) + milestones.length   // gates already closed count toward the whole
  const noun = steps.length && milestones.length ? 'items' : milestones.length ? 'milestones' : 'gates'
  const flip = async (s) => {
    if (busy) return
    setBusy(s.id); setErr(null)
    try {
      const row = await api.toggleStep(s.id, !s.done)
      if (!row) throw new Error('the Ledger did not take it')
      setSteps(list => list.map(x => x.id === s.id ? { ...x, done: !s.done } : x))
    } catch (e) { setErr(`Could not ${s.done ? 'reopen' : 'close'} that gate: ${e.message}`) } finally { setBusy(null) }
  }
  // Milestones close on their own cards; coming back here, read them again.
  const recheck = async () => { try { const now = await api.stillOpen(mission.id); setMilestones(now.milestones) } catch { /* keep what is shown */ } }
  useEffect(() => { const f = () => { recheck() }; window.addEventListener('focus', f); return () => window.removeEventListener('focus', f) })
  const toMission = () => { onClose(); api.openCard(mission.id) }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(5,16,28,0.86)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} role="alertdialog" aria-labelledby="still-open-title" style={{ width: 'min(640px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#0F2338', border: `1px solid ${alpha(left ? RED : SUCCESS, 45)}`, borderRadius: 16, padding: '30px 30px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="still-open-title" style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1.2, margin: 0 }}>{left ? 'Not Ready To Extract' : 'Ready To Extract'}</h2>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, lineHeight: 1.3, color: INK, margin: '8px 0 0' }}>{mission.title}</div>
          </div>
          <button onClick={onClose} title="Close" aria-label="Close" style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer' }}><XIcon size={18} /></button>
        </div>

        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: left ? RED : INK2, margin: '14px 0 0' }}>
          {left
            ? `Extract refused. ${left} of ${total} ${noun} ${left === 1 ? 'is' : 'are'} still open on this mission, and a mission closes only when everything on it is closed.`
            : 'Everything on this mission is closed. Carry on to the Extract.'}
        </div>

        {steps.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Label>Gates · {steps.filter(s => !s.done).length} Still Open</Label>
            <div style={{ display: 'grid', gap: 8 }}>
              {steps.map(s => (
                <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 12px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 99, flexShrink: 0, background: s.done ? SUCCESS : 'transparent', border: s.done ? 'none' : '1.5px solid rgba(234,241,248,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.done && <Check size={11} color='var(--hud-on-accent)' />}</span>
                  <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.4, color: s.done ? INK2 : INK }}>{s.text}</span>
                  <button onClick={() => flip(s)} disabled={busy === s.id} style={btn('ghost', busy === s.id)}>{busy === s.id ? 'Saving' : s.done ? 'Reopen' : 'Close Gate'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {milestones.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Label>Milestones · {milestones.length} Still Open</Label>
            <div style={{ display: 'grid', gap: 8 }}>
              {milestones.map(k => (
                <div key={k.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 12px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 99, flexShrink: 0, border: '1.5px solid rgba(234,241,248,0.4)' }} />
                  <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.4, color: INK }}>{k.title}</span>
                  <button onClick={() => { onClose(); api.openCard(k.id) }} style={btn()}>Open Milestone <ArrowRight size={13} /></button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>A milestone closes on its own card.</div>
          </div>
        )}

        {err && <div style={{ fontSize: 13, color: RED, marginTop: 12 }}>{err}</div>}
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: MUTED, marginTop: 16 }}>A gate that no longer belongs on this mission is removed on the mission's own page, under End Of The Trail.</div>
        <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={toMission} style={btn()}><ArrowLeft size={13} /> Back To The Mission</button>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={btn()}>Cancel</button>
          <button onClick={() => { if (!left) onReady() }} disabled={!!left} style={btn('primary', !!left)}>Continue To Extract</button>
        </div>
      </div>
    </div>
  )
}
