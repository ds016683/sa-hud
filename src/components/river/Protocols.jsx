// Live Protocols (David, 10/23): one pill on every item for whatever protocol
// is running on it. One table (edit_punchlist) carries every protocol's rows,
// named by `protocol`; each protocol has its own row shape and the same loop:
// the session writes rows, David inspects and approves, or rules.
//   editing  · the Editing Protocol's punchlist (10/22): entry, Inspect fields, Approve.
//   briefing · the Briefing Protocol's gap map (10/23): need, why, who supplies it;
//              open, asked, done (his answer), ruled (his ruling).
// LiveProtocolsModal (the Board window) lists every item with a protocol on.
import { useCallback, useEffect, useState } from 'react'
import { Check, ExternalLink, AlertTriangle, Eye, X as XIcon, ListChecks } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hudPrompt } from '../../lib/dialog'
import { INK, INK2, GRAY, PANEL_BORDER, BLUE, GREEN, RED, GOLD, MONO, SERIF, LABEL, Label } from './canon'

const NAVY_DEEP = '#0A1B2B'
const fmtWhen = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''
import { PROTOCOLS, protocolOf, isOpenRow } from '../../lib/protocols'
const btn = (color = INK2, filled = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 11px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? NAVY_DEEP : color, cursor: 'pointer', flexShrink: 0 })

function Mark({ status }) {
  const base = { width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  if (status === 'approved') return <span style={{ ...base, background: GREEN, color: NAVY_DEEP }}><Check size={11} strokeWidth={3} /></span>
  if (status === 'done') return <span style={{ ...base, border: `1.5px solid ${GREEN}`, color: GREEN }}><Check size={10} strokeWidth={3} /></span>
  if (status === 'flagged') return <span style={{ ...base, border: `1.5px solid ${RED}`, color: RED }}><AlertTriangle size={9} /></span>
  if (status === 'asked') return <span style={{ ...base, border: `1.5px solid ${BLUE}`, color: BLUE, fontFamily: MONO, fontSize: 10, fontWeight: 700 }}>?</span>
  if (status === 'ruled') return <span style={{ ...base, border: `1.5px solid ${GRAY}`, color: GRAY, fontFamily: MONO, fontSize: 11 }}>⊘</span>
  return <span style={{ ...base, border: `1.5px solid ${PANEL_BORDER}`, color: GRAY, fontFamily: MONO, fontSize: 10 }}>…</span>
}

// ---- editing rows: the punchlist as built 10/22
function EditingRow({ r, onInspect }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, width: 18, textAlign: 'right', paddingTop: 3 }}>{r.seq}</span>
      <Mark status={r.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.45, color: r.status === 'flagged' ? RED : INK2, textDecoration: r.status === 'approved' ? 'line-through' : 'none', textDecorationColor: 'rgba(234,241,248,0.3)' }}>{r.entry}</div>
        {r.status === 'flagged' && r.flag_reason && <div style={{ fontSize: 12, color: RED, opacity: 0.85, marginTop: 3, lineHeight: 1.5 }}>{r.flag_reason}</div>}
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, marginTop: 3 }}>{fmtWhen(r.created_at)}{r.approved_at ? ` · approved ${fmtWhen(r.approved_at)}` : ''}</div>
      </div>
      {(r.status === 'done' || r.status === 'approved') && <button onClick={() => onInspect(r)} style={btn(BLUE)}><Eye size={11} /> Inspect</button>}
    </div>
  )
}

function InspectModal({ row, onClose, onApprove }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,10,20,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(540px, 94vw)', maxHeight: '84vh', overflowY: 'auto', background: NAVY_DEEP, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: '24px 28px 20px', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ fontFamily: SERIF, fontSize: 17, color: INK2, lineHeight: 1.35 }}>{row.entry}</div>
          <button onClick={onClose} style={{ flexShrink: 0, background: 'none', border: `1px solid ${PANEL_BORDER}`, borderRadius: '50%', width: 28, height: 28, color: GRAY, fontSize: 15, cursor: 'pointer' }}>×</button>
        </div>
        {[['Here Is What Happened', row.what_happened], ['Here Is What Page', row.where_page], ['Here Is What to Look For', row.look_for]].map(([k, v]) => v && (
          <div key={k}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.6px', textTransform: 'uppercase', color: BLUE, margin: '16px 0 4px' }}>{k}</div>
            <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.6 }}>{v}</div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}` }}>
          {row.link && <a href={row.link} target="_blank" rel="noopener noreferrer" style={{ ...btn(BLUE), textDecoration: 'none', padding: '7px 13px' }}><ExternalLink size={11} /> Open the Preview</a>}
          <span style={{ flex: 1 }} />
          {row.status !== 'approved'
            ? <button onClick={() => onApprove(row)} style={{ ...btn(GREEN, true), padding: '8px 16px', fontWeight: 700 }}><Check size={12} strokeWidth={3} /> Approve</button>
            : <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: GREEN }}>Approved {fmtWhen(row.approved_at)}</span>}
        </div>
      </div>
    </div>
  )
}

// ---- briefing rows: the gap map. David answers or rules right here.
function BriefingRow({ r, onAnswer, onRule }) {
  const [answering, setAnswering] = useState(false)
  const [text, setText] = useState('')
  const open = isOpenRow(r) && r.status !== 'done'
  const srcColor = { david: GOLD, file: BLUE, tool: INK2 }[r.source] || GRAY
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, width: 18, textAlign: 'right', paddingTop: 3 }}>{r.seq}</span>
      <Mark status={r.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.45, color: r.status === 'asked' ? INK : r.status === 'ruled' ? GRAY : INK2 }}>
          {r.entry}
          {r.source && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: srcColor, marginLeft: 10 }}>{r.source === 'david' ? 'from David' : r.source === 'file' ? 'a file' : 'a tool'}</span>}
          {r.status === 'asked' && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: BLUE, marginLeft: 10 }}>the current ask</span>}
        </div>
        {r.why && <div style={{ fontSize: 12, color: GRAY, marginTop: 3, lineHeight: 1.5 }}>{r.why}</div>}
        {r.status === 'done' && r.what_happened && <div style={{ fontSize: 13, color: INK2, marginTop: 5, lineHeight: 1.55, borderLeft: `2px solid ${GREEN}`, paddingLeft: 10 }}>{r.what_happened}</div>}
        {r.status === 'ruled' && r.ruling && <div style={{ fontSize: 12.5, color: GRAY, marginTop: 5, lineHeight: 1.5, fontStyle: 'italic' }}>Ruled: {r.ruling}</div>}
        {r.status === 'flagged' && r.flag_reason && <div style={{ fontSize: 12, color: RED, opacity: 0.85, marginTop: 3, lineHeight: 1.5 }}>{r.flag_reason}</div>}
        {answering && (
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Your answer, in your words. The session records it as the fill." style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BLUE}66`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}><button onClick={() => { if (text.trim()) { onAnswer(r, text.trim()); setAnswering(false); setText('') } }} style={btn(GREEN, true)}><Check size={11} /> Save Answer</button><button onClick={() => setAnswering(false)} style={btn(INK2)}>Cancel</button></div>
          </div>
        )}
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, marginTop: 3 }}>{fmtWhen(r.created_at)}{r.updated_at && r.updated_at !== r.created_at ? ` · ${r.status} ${fmtWhen(r.updated_at)}` : ''}</div>
      </div>
      {open && !answering && <button onClick={() => setAnswering(true)} style={btn(BLUE)}>Answer</button>}
      {open && !answering && <button onClick={() => onRule(r)} title="Close the gap without a fill: leave it, defer it, not needed" style={btn(INK2)}>Rule</button>}
    </div>
  )
}

export default function ProtocolsTab({ objectiveId }) {
  const [rows, setRows] = useState(null) // null loading · 'missing' table absent · []
  const [inspect, setInspect] = useState(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('edit_punchlist').select('*').eq('objective_id', objectiveId).order('seq')
    if (error) { setRows('missing'); return }
    setRows(data || [])
  }, [objectiveId])
  useEffect(() => { load() }, [load])
  const patch = async (r, body) => { await supabase.from('edit_punchlist').update({ ...body, updated_at: new Date().toISOString() }).eq('id', r.id); setInspect(null); load() }
  const approve = (r) => patch(r, { status: 'approved', approved_at: new Date().toISOString() })
  const answer = (r, text) => patch(r, { status: 'done', what_happened: text })
  const rule = async (r) => { const why = await hudPrompt({ title: 'Rule on this item', message: r.entry, placeholder: 'leave it · defer to November 10 · not needed', multiline: true }); if (why === null) return; patch(r, { status: 'ruled', ruling: (why || '').trim() || 'ruled' }) }

  if (rows === null) return <div style={{ fontSize: 12, color: GRAY, padding: '14px 0', fontFamily: MONO }}>reading the protocols…</div>
  if (rows === 'missing') return <div style={{ fontSize: 13, color: GRAY, padding: '14px 0' }}>Protocol rows are not in the Ledger yet. Run <span style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>sql/2026-10-22-editing-protocol.sql</span> and <span style={{ fontFamily: MONO, fontSize: 12, color: INK2 }}>sql/2026-10-23-live-protocols.sql</span> once in the Supabase SQL editor.</div>
  if (rows.length === 0) return <div style={{ fontSize: 13, color: GRAY, padding: '14px 0' }}>No protocol is live on this item. A session in the Editing Protocol or the Briefing Protocol writes its rows here as it runs.</div>

  const groups = []
  for (const r of rows) { const k = protocolOf(r); let g = groups.find(x => x.key === k); if (!g) { g = { key: k, rows: [] }; groups.push(g) } g.rows.push(r) }
  groups.sort((a, b) => (b.rows.filter(isOpenRow).length - a.rows.filter(isOpenRow).length))
  return (
    <div style={{ display: 'grid', gap: 26 }}>
      {groups.map(g => {
        const def = PROTOCOLS[g.key] || { label: `${g.key} protocol`, sub: '' }
        const open = g.rows.filter(isOpenRow).length
        const asked = g.rows.find(r => r.status === 'asked')
        return (
          <div key={g.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontFamily: SERIF, fontSize: 18, color: open ? INK : GRAY }}>{def.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: open ? LABEL : GRAY }}>{g.rows.length} rows · {open} open{g.key === 'editing' ? ` · ${g.rows.filter(r => r.status === 'flagged').length} flagged` : ` · ${g.rows.filter(r => r.status === 'ruled').length} ruled`}{open ? '' : ' · complete'}</span>
            </div>
            {def.sub && <div style={{ fontSize: 12.5, color: GRAY, marginBottom: 8 }}>{def.sub}</div>}
            {g.key === 'briefing' && asked && <div style={{ fontSize: 13, color: INK, marginBottom: 8, padding: '8px 12px', border: `1px solid ${BLUE}55`, borderRadius: 8, background: 'rgba(169,201,232,0.07)' }}><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: BLUE, marginRight: 10 }}>The ask</span>{asked.entry}</div>}
            {g.rows.map(r => g.key === 'briefing'
              ? <BriefingRow key={r.id} r={r} onAnswer={answer} onRule={rule} />
              : <EditingRow key={r.id} r={r} onInspect={setInspect} />)}
          </div>
        )
      })}
      {inspect && <InspectModal row={inspect} onClose={() => setInspect(null)} onApprove={approve} />}
    </div>
  )
}

// The Board window: every item with a protocol on, its name, open count and
// the current ask. Where a dormant session picks up, and where David sees what
// is being iterated right now.
export function LiveProtocolsModal({ onClose, onOpen }) {
  const [list, setList] = useState(null)
  useEffect(() => {
    let on = true
    ;(async () => {
      const { data, error } = await supabase.from('edit_punchlist').select('*').not('objective_id', 'is', null).order('updated_at', { ascending: false }).limit(1500)
      if (error) { if (on) setList('missing'); return }
      const open = (data || []).filter(isOpenRow)
      const oids = [...new Set(open.map(r => r.objective_id))]
      const { data: objs } = oids.length ? await supabase.from('objectives').select('id,title,state,tags,description,north_star,effort').in('id', oids) : { data: [] }
      const O = new Map((objs || []).map(o => [o.id, o]))
      const groups = []
      for (const r of open) {
        const k = `${r.objective_id}:${protocolOf(r)}`
        let g = groups.find(x => x.key === k); if (!g) { g = { key: k, objective: O.get(r.objective_id), protocol: protocolOf(r), rows: [], last: r.updated_at }; groups.push(g) }
        g.rows.push(r); if (r.updated_at > g.last) g.last = r.updated_at
      }
      groups.sort((a, b) => String(b.last).localeCompare(String(a.last)))
      if (on) setList(groups.filter(g => g.objective))
    })()
    return () => { on = false }
  }, [])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 230, background: 'rgba(5,16,28,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '7vh 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '20px 24px 18px', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ListChecks size={16} color={BLUE} />
          <div style={{ flex: 1 }}><Label style={{ marginBottom: 2 }}>Live Protocols</Label><div style={{ fontFamily: SERIF, fontSize: 18, color: INK }}>What is being iterated right now</div></div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer' }}><XIcon size={16} /></button>
        </div>
        {list === null && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY }}>Reading the Ledger</div>}
        {list === 'missing' && <div style={{ fontSize: 13, color: GRAY }}>Protocol rows are not in the Ledger yet (sql/2026-10-22-editing-protocol.sql, then sql/2026-10-23-live-protocols.sql).</div>}
        {Array.isArray(list) && !list.length && <div style={{ fontSize: 13, color: GRAY }}>No protocol is live on any item. When a session enters the Editing Protocol or the Briefing Protocol, the item shows here with its open count and the current ask.</div>}
        {Array.isArray(list) && list.map(g => {
          const def = PROTOCOLS[g.protocol] || { label: `${g.protocol} protocol` }
          const ask = g.rows.find(r => r.status === 'asked') || g.rows.find(r => r.status === 'flagged') || g.rows.find(r => r.status === 'working')
          const o = g.objective
          return (
            <div key={g.key} style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 12, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 16, color: INK }}>{o.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: BLUE }}>{def.label} · {g.rows.length} open</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{fmtWhen(g.last)}</span>
                </div>
                {ask && <div style={{ fontSize: 13, color: INK2, marginTop: 4, lineHeight: 1.5 }}><span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: ask.status === 'flagged' ? RED : LABEL, marginRight: 8 }}>{ask.status === 'asked' ? 'the ask' : ask.status === 'flagged' ? 'flagged' : 'in motion'}</span>{ask.entry}</div>}
              </div>
              <button onClick={() => { onClose(); onOpen({ id: o.id, objective_id: o.id, kind: (o.tags || []).includes('impromptu') ? 'Ad Hoc' : 'Side Mission', title: o.title, description: o.description, tags: o.tags }) }} style={btn(BLUE, true)}>Open</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
