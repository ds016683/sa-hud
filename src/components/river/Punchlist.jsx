// The Editing Protocol's punchlist (David, 10/22): when a session is in the
// Editing Protocol, every edit he fires lands here as a row (punchlist.py).
// The session marks a row done with the Inspect fields; David opens Inspect
// (here's what happened, here's what page, here's what to look for), checks
// the preview, and Approves. A row the session flagged (a question, or an
// edit it could not make) renders red with the reason until it is resolved.
import { useCallback, useEffect, useState } from 'react'
import { Check, ExternalLink, AlertTriangle, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { INK2, GRAY, PANEL_BORDER, BLUE, GREEN, RED, MONO, SERIF, LABEL } from './canon'

const NAVY_DEEP = '#0A1B2B'
const fmtWhen = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

function Mark({ status }) {
  const base = { width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  if (status === 'approved') return <span style={{ ...base, background: GREEN, color: NAVY_DEEP }}><Check size={11} strokeWidth={3} /></span>
  if (status === 'done') return <span style={{ ...base, border: `1.5px solid ${GREEN}`, color: GREEN }}><Check size={10} strokeWidth={3} /></span>
  if (status === 'flagged') return <span style={{ ...base, border: `1.5px solid ${RED}`, color: RED }}><AlertTriangle size={9} /></span>
  return <span style={{ ...base, border: `1.5px solid ${PANEL_BORDER}`, color: GRAY, fontFamily: MONO, fontSize: 10 }}>…</span>
}

export default function PunchlistTab({ objectiveId }) {
  const [rows, setRows] = useState(null) // null loading · 'missing' table absent · []
  const [inspect, setInspect] = useState(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('edit_punchlist').select('*').eq('objective_id', objectiveId).order('seq')
    if (error) { setRows('missing'); return }
    setRows(data || [])
  }, [objectiveId])
  useEffect(() => { load() }, [load])

  const approve = async (r) => {
    await supabase.from('edit_punchlist').update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id)
    setInspect(null)
    load()
  }

  if (rows === null) return <div style={{ fontSize: 12, color: GRAY, padding: '14px 0', fontFamily: MONO }}>loading the punchlist…</div>
  if (rows === 'missing') return <div style={{ fontSize: 13, color: GRAY, padding: '14px 0' }}>The punchlist table is not in the Ledger yet. Run <span style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>sql/2026-10-22-editing-protocol.sql</span> once in the Supabase SQL editor.</div>
  if (rows.length === 0) return <div style={{ fontSize: 13, color: GRAY, padding: '14px 0' }}>No punchlist on this item. A session in the Editing Protocol writes one as the edits land.</div>

  const open = rows.filter(r => r.status !== 'approved').length
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: LABEL, padding: '4px 0 8px' }}>
        {rows.length} entries · {open} open · {rows.filter(r => r.status === 'flagged').length} flagged
      </div>
      {rows.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, width: 18, textAlign: 'right', paddingTop: 3 }}>{r.seq}</span>
          <Mark status={r.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.45, color: r.status === 'flagged' ? RED : INK2, textDecoration: r.status === 'approved' ? 'line-through' : 'none', textDecorationColor: 'rgba(234,241,248,0.3)' }}>
              {r.entry}
            </div>
            {r.status === 'flagged' && r.flag_reason && (
              <div style={{ fontSize: 12, color: RED, opacity: 0.85, marginTop: 3, lineHeight: 1.5 }}>{r.flag_reason}</div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, marginTop: 3 }}>
              {fmtWhen(r.created_at)}{r.approved_at ? ` · approved ${fmtWhen(r.approved_at)}` : ''}
            </div>
          </div>
          {(r.status === 'done' || r.status === 'approved') && (
            <button onClick={() => setInspect(r)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
              padding: '5px 11px', borderRadius: 8, border: `1px solid ${BLUE}66`, background: 'transparent', color: BLUE, cursor: 'pointer', flexShrink: 0,
            }}><Eye size={11} /> Inspect</button>
          )}
        </div>
      ))}

      {inspect && (
        <div onClick={() => setInspect(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,10,20,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(540px, 94vw)', maxHeight: '84vh', overflowY: 'auto', background: NAVY_DEEP, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: '24px 28px 20px', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ fontFamily: SERIF, fontSize: 17, color: INK2, lineHeight: 1.35 }}>{inspect.entry}</div>
              <button onClick={() => setInspect(null)} style={{ flexShrink: 0, background: 'none', border: `1px solid ${PANEL_BORDER}`, borderRadius: '50%', width: 28, height: 28, color: GRAY, fontSize: 15, cursor: 'pointer' }}>×</button>
            </div>
            {[['Here Is What Happened', inspect.what_happened], ['Here Is What Page', inspect.where_page], ['Here Is What to Look For', inspect.look_for]].map(([k, v]) => v && (
              <div key={k}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.6px', textTransform: 'uppercase', color: BLUE, margin: '16px 0 4px' }}>{k}</div>
                <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.6 }}>{v}</div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}` }}>
              {inspect.link && (
                <a href={inspect.link} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
                  padding: '7px 13px', borderRadius: 8, border: `1px solid ${BLUE}66`, color: BLUE, textDecoration: 'none',
                }}><ExternalLink size={11} /> Open the Preview</a>
              )}
              <span style={{ flex: 1 }} />
              {inspect.status !== 'approved' ? (
                <button onClick={() => approve(inspect)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase',
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${GREEN}`, background: GREEN, color: NAVY_DEEP, cursor: 'pointer', fontWeight: 700,
                }}><Check size={12} strokeWidth={3} /> Approve</button>
              ) : (
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: GREEN }}>Approved {fmtWhen(inspect.approved_at)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
