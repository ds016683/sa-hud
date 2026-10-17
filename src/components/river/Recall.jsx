// The brain on a card (David, 10/12): what the system has on the task, two or
// three plain next steps, and the handoff to Lumen on WhatsApp.
import { useEffect, useState } from 'react'
import { Brain, MessageCircle } from 'lucide-react'
import { recall, askLumen } from '../../lib/recall'
import { INK, INK2, GRAY, PANEL_BORDER, BLUE, GOLD, GREEN, RED, MONO, SERIF, S, LABEL } from './canon'

export const BrainButton = ({ onClick, title = 'Recall: what the system knows, and a next step' }) => (
  <button onClick={onClick} title={title} style={{ width: 28, height: 28, borderRadius: 99, border: `1px solid ${BLUE}66`, background: `${BLUE}14`, color: BLUE, display: 'inline-grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}><Brain size={14} /></button>
)

export default function RecallModal({ objectiveId = null, taskId = null, title, onClose }) {
  const [r, setR] = useState(null)
  const [err, setErr] = useState(null)
  const [asking, setAsking] = useState(false)
  const [sent, setSent] = useState(null)
  useEffect(() => { let on = true; recall({ objective_id: objectiveId, task_id: taskId }).then(x => { if (on) setR(x) }).catch(e => { if (on) setErr(e.message) }); return () => { on = false } }, [objectiveId, taskId])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const ask = async () => {
    setAsking(true); setErr(null)
    try { const j = await askLumen({ objective_id: objectiveId, task_id: taskId }); setSent(j.sent ? 'Lumen is on it. Check WhatsApp.' : `Lumen wrote it but could not send: ${j.error}`) }
    catch (e) { setErr(e.message) } finally { setAsking(false) }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 290, background: 'rgba(5,16,28,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(640px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: '#0F2338', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '22px 24px', display: 'grid', gap: 16 }}>
        <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}><BrainButton onClick={() => {}} title="" />Recall · {r?.title || title}</h3>
        {!r && !err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL }}>Reading everything the system has</div>}
        {r && (
          <>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE, marginBottom: 6 }}>What the system has on it</div>
              {r.history.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Nothing recorded beyond the title.</div>}
              <div style={{ display: 'grid', gap: 6 }}>
                {r.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: INK2, lineHeight: 1.45 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, width: 52, flexShrink: 0, paddingTop: 3 }}>{h.when}</span>
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE, marginBottom: 6 }}>Next step, pick one</div>
              {r.next.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>No suggestion this time.</div>}
              <div style={{ display: 'grid', gap: 6 }}>
                {r.next.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: INK, lineHeight: 1.45 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 16, color: GOLD, width: 18, flexShrink: 0, lineHeight: 1.2 }}>{i + 1}</span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: RED }}>{err}</div>}
        {sent && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GREEN }}>{sent}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: GRAY, marginRight: 'auto', maxWidth: '34ch' }}>Nothing ring a bell? Lumen gets this same history and a brief that you want to dig into the substance.</span>
          <button onClick={onClose} style={S.btnGhost}>Close</button>
          <button onClick={ask} disabled={asking || !!sent} style={{ ...S.btnPrimary, background: BLUE, borderColor: BLUE, opacity: asking || sent ? 0.6 : 1 }}><MessageCircle size={12} /> {asking ? 'Briefing Lumen' : 'Ask Lumen on WhatsApp'}</button>
        </div>
      </div>
    </div>
  )
}
