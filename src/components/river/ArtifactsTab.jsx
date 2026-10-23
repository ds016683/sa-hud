// Artifacts on a project: structured work products the HUD renders and David
// edits in place. Lumen drafts into them, David finishes them here, Lumen
// ports them out as a Word file. First kind: the interview scorecard.
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Save, RefreshCw, User, Eye, X as XIcon } from 'lucide-react'
import { listArtifacts, readArtifact, writeArtifact } from '../../lib/artifacts'
import { renderMarkdown } from './MeetingCloseout'
import { INK, INK2, GRAY, MUTED, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label, LABEL } from './canon'
import { hudConfirm } from '../../lib/dialog'
import PlanningCanvas from './PlanningCanvas'
const field = { width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '9px 11px', fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
const pill = (active, color = BLUE) => ({
  fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 9999, cursor: 'pointer',
  border: `1px solid ${active ? color : 'rgba(255,255,255,0.16)'}`, background: active ? `${color}22` : 'transparent', color: active ? color : 'rgba(234,241,248,0.7)',
})
const RATING_COLOR = { 'Exceeds': GREEN, 'Meets': BLUE, 'Below': GOLD, 'Does Not Meet': RED }
const Req = ({ done }) => <span style={{ ...S.chip('transparent', done ? GREEN : RED), border: `1px solid ${done ? GREEN : RED}55`, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px', padding: '1px 6px', marginLeft: 8 }}>{done ? 'yours · done' : 'your language · required'}</span>
const Opt = () => <span style={{ ...S.chip('transparent', GRAY), border: `1px solid ${GRAY}55`, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px', padding: '1px 6px', marginLeft: 8 }}>optional</span>
const Lum = () => <span style={{ ...S.chip('transparent', GOLD), border: `1px solid ${GOLD}55`, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px', padding: '1px 6px', marginLeft: 8 }}>Lumen's draft</span>

// Lumen's read: his interpretation of how the answer lines up with what is
// being assessed. A side drawer, read-only, clearly his and not David's.
function ReadDrawer({ title, sub, read, quote, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8,20,32,0.6)', display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px, 92vw)', height: '100%', overflowY: 'auto', background: '#10273B', borderLeft: `1px solid ${PANEL_BORDER}`, padding: '24px 26px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Lumen's read</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{title}</div>
            {sub && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY, marginTop: 6 }}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
        </div>
        <div style={{ marginTop: 18 }}>
          <Label>How the answer lines up with the competency</Label>
          {read ? <div style={{ fontSize: 13.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{read}</div> : <div style={{ fontSize: 12.5, color: GRAY }}>Not written yet. Ask Lumen for his read on this one.</div>}
        </div>
        {quote && (
          <div style={{ marginTop: 18 }}>
            <Label>What she said, as drafted</Label>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: INK2, whiteSpace: 'pre-wrap', borderLeft: `2px solid ${GOLD}55`, paddingLeft: 12 }}>{quote}</div>
          </div>
        )}
        <div style={{ fontSize: 11, color: GRAY, marginTop: 20 }}>This is Lumen's interpretation. The rating and the notes on the card are yours to write.</div>
      </div>
    </div>
  )
}

function RatingPills({ scale, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {scale.map(r => (
        <button key={r} onClick={() => onChange(value === r ? null : r)} style={pill(value === r, RATING_COLOR[r] || BLUE)}>{r}</button>
      ))}
    </div>
  )
}


// A decision worked with Lumen: the question, the options and their numbers,
// an economics table, Lumen's read (his, labelled), and David's notes and
// verdict (his, required). Lumen writes the analysis; David decides here.
// A brief: Lumen's design or work brief, read by David, built by Claude.
function Brief({ doc }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {doc.summary && <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, lineHeight: 1.6, color: INK }}>{doc.summary}</div>}
      {(doc.sections || []).map((sec, i) => (
        <div key={i}><Label>{sec.heading}</Label><div style={{ fontSize: 13.5, lineHeight: 1.65, color: INK2 }}>{renderMarkdown(String(sec.body || ''))}</div></div>
      ))}
      {(doc.open_questions || []).length > 0 && <div><Label>Open questions for David</Label>{doc.open_questions.map((q, i) => <div key={i} style={{ fontSize: 13.5, color: INK, padding: '3px 0' }}>· {q}</div>)}</div>}
      {(doc.for_claude || []).length > 0 && <div><Label>For Claude · build notes</Label>{doc.for_claude.map((q, i) => <div key={i} style={{ fontSize: 13, color: INK2, padding: '3px 0', fontFamily: MONO }}>· {q}</div>)}</div>}
    </div>
  )
}

function Decision({ doc, onChange }) {
  const set = (fn) => onChange(fn(structuredClone(doc)))
  const has = (v) => v != null && String(v).trim() !== ''
  const options = doc.options || []
  const econ = doc.economics || []
  const optNames = options.map(o => o.name)
  const cell = { padding: '8px 10px', borderTop: `1px solid ${PANEL_BORDER}`, fontSize: 13, color: INK, verticalAlign: 'top' }
  return (
    <div>
      {doc.question && <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: '#fff', lineHeight: 1.4, marginBottom: 8 }}>{doc.question}</div>}
      {doc.context && <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{doc.context}</div>}

      {options.length > 0 && (
        <>
          <Eyebrow style={{ marginBottom: 8 }}>Options</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${options.length > 2 ? 220 : 280}px, 1fr))`, gap: 12, marginBottom: 16 }}>
            {options.map((o, i) => (
              <div key={o.name || i} style={{ ...S.panel, padding: '14px 16px', marginBottom: 0, border: `1px solid ${doc.verdict === o.name ? GOLD : PANEL_BORDER}` }}>
                <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: doc.verdict === o.name ? GOLD_BRIGHT : '#fff' }}>{o.name}</div>
                {o.summary && <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.55, marginTop: 4 }}>{o.summary}</div>}
                {(o.numbers || []).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 4, marginTop: 10 }}>
                    {o.numbers.map((n, j) => (
                      <div key={j} style={{ display: 'contents' }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: GRAY, paddingTop: 2 }}>{n.label}</span>
                        <span style={{ fontSize: 13, color: INK }}>{n.value}{n.note ? <span style={{ color: GRAY, fontSize: 11.5 }}> · {n.note}</span> : null}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(o.pros || []).length > 0 && <div style={{ marginTop: 10 }}><Label>For</Label>{o.pros.map((x, j) => <div key={j} style={{ fontSize: 12.5, color: GREEN, lineHeight: 1.5 }}>+ {x}</div>)}</div>}
                {(o.cons || []).length > 0 && <div style={{ marginTop: 8 }}><Label>Against</Label>{o.cons.map((x, j) => <div key={j} style={{ fontSize: 12.5, color: RED, lineHeight: 1.5 }}>− {x}</div>)}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {econ.length > 0 && (
        <>
          <Eyebrow style={{ marginBottom: 8 }}>Economics</Eyebrow>
          <div style={{ ...S.panel, padding: '6px 6px 2px', marginBottom: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ ...cell, borderTop: 'none', fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: LABEL, textAlign: 'left', textTransform: 'uppercase' }}>Line</th>{optNames.map(n => <th key={n} style={{ ...cell, borderTop: 'none', fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: LABEL, textAlign: 'right', textTransform: 'uppercase' }}>{n}</th>)}</tr></thead>
              <tbody>{econ.map((r, i) => (
                <tr key={i}><td style={{ ...cell, color: INK2 }}>{r.label}</td>{optNames.map(n => <td key={n} style={{ ...cell, textAlign: 'right', fontFamily: MONO, fontSize: 12.5 }}>{(r.values || {})[n] ?? ''}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {(doc.assumptions || []).length > 0 && <div style={{ marginBottom: 16 }}><Label>Assumptions</Label>{doc.assumptions.map((x, i) => <div key={i} style={{ fontSize: 12.5, color: INK2, lineHeight: 1.55 }}>· {x}</div>)}</div>}

      <Eyebrow style={{ marginBottom: 8 }}>Lumen's read<Lum /></Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16, borderLeft: `2px solid ${GOLD}66` }}>
        {doc.lumen_read ? <div style={{ fontSize: 13.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{doc.lumen_read}</div> : <div style={{ fontSize: 12.5, color: GRAY }}>Not written yet.</div>}
        {(doc.risks || []).length > 0 && <div style={{ marginTop: 12 }}><Label>Risks</Label>{doc.risks.map((x, i) => <div key={i} style={{ fontSize: 12.5, color: RED, lineHeight: 1.5 }}>· {x}</div>)}</div>}
        {(doc.questions_for_david || []).length > 0 && <div style={{ marginTop: 12 }}><Label>Questions for you</Label>{doc.questions_for_david.map((x, i) => <div key={i} style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>{i + 1}. {x}</div>)}</div>}
        {doc.recommendation && <div style={{ marginTop: 12 }}><Label>Lumen's recommendation</Label><div style={{ fontSize: 13.5, color: GOLD_BRIGHT, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{doc.recommendation}</div></div>}
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Your call</Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px' }}>
        <Label>Your notes<Req done={has(doc.david_notes)} /></Label>
        <textarea rows={5} value={doc.david_notes || ''} onChange={e => set(d => { d.david_notes = e.target.value; return d })} placeholder="What you see, what you want to push on, what you need before deciding." style={field} />
        <Label style={{ marginTop: 12 }}>Verdict<Req done={has(doc.verdict)} /></Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[...optNames, 'Not yet', 'Walk away'].map(v => <button key={v} onClick={() => set(d => { d.verdict = d.verdict === v ? null : v; d.decided_at = d.verdict ? new Date().toISOString() : null; return d })} style={pill(doc.verdict === v, v === 'Walk away' ? RED : v === 'Not yet' ? GRAY : GOLD)}>{v}</button>)}
        </div>
      </div>
    </div>
  )
}

// An inventory: what survives of a body of work, where each copy lives, and
// which copy stands for each checkpoint. Claude assembles the files and the
// version timelines; David picks the copy that stands for each slot and writes
// his notes. First case: the fall forecasting seasons, what the pro forma and
// the cash forecast said each October about year-end and the year after.
const STORE_COLOR = { sharepoint: BLUE, dropbox: GOLD, mail: PERIWINKLE, local: GREEN }
const STORE_LABEL = { sharepoint: 'SharePoint', dropbox: 'Dropbox', mail: 'Mailbox', local: 'This Mac' }
const COVERAGE = { good: [GREEN, 'Good'], live: [GREEN, 'Live'], partial: [GOLD, 'Partial'], thin: [GOLD, 'Thin'], gap: [RED, 'Gap'] }
const fmtSize = (n) => n == null ? '' : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n} B`
const fmtDate = (d) => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const byDate = (a, b) => String(a.date || '').localeCompare(String(b.date || ''))
const monthsBetween = (a, b) => { const out = []; if (!a || !b) return out; let [y, m] = String(a).slice(0, 7).split('-').map(Number); const end = String(b).slice(0, 7); for (let i = 0; i < 240; i++) { const k = `${y}-${String(m).padStart(2, '0')}`; out.push(k); if (k >= end) break; m += 1; if (m > 12) { m = 1; y += 1 } } return out }
const th = { padding: '6px 10px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: LABEL, textAlign: 'left', textTransform: 'uppercase', borderBottom: `1px solid ${PANEL_BORDER}` }
const td = { padding: '8px 10px', borderTop: `1px solid ${PANEL_BORDER}`, fontSize: 13, color: INK, verticalAlign: 'top' }
const miniChip = (c) => ({ ...S.chip('transparent', c), border: `1px solid ${c}55`, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px', padding: '1px 6px' })
const Cla = () => <span style={{ ...miniChip(GOLD), marginLeft: 8 }}>Claude's draft</span>
const Pick = ({ done }) => <span style={{ ...miniChip(done ? GREEN : RED), marginLeft: 8 }}>{done ? 'picked' : 'your pick'}</span>

// One file's save history: a bar per month of its life, dashed where
// SharePoint has already trimmed the versions (it keeps the last 500).
function Timeline({ t }) {
  const months = monthsBetween(t.created, t.modified)
  const byMonth = t.by_month || {}
  const max = Math.max(1, ...Object.values(byMonth))
  const kept = String(t.earliest || '').slice(0, 7)
  return (
    <div style={{ ...S.panel, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: '#fff' }}>{t.file}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: MUTED }}>created {fmtDate(t.created)} · {t.versions} versions kept · history {fmtDate(t.earliest)} to {fmtDate(t.latest)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 44, marginTop: 10 }}>
        {months.map(m => {
          const n = byMonth[m] || 0
          const trimmed = kept && m < kept
          const h = n ? Math.max(4, Math.round(40 * n / max)) : trimmed ? 10 : 2
          return <div key={m} title={`${m} · ${n} saves${trimmed ? ' · trimmed from the history' : ''}`} style={{ flex: 1, minWidth: 3, height: h, borderRadius: 2, background: trimmed ? 'transparent' : n ? BLUE : 'rgba(255,255,255,0.18)', border: trimmed ? `1px dashed ${RED}88` : 'none', boxSizing: 'border-box' }} />
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontFamily: MONO, fontSize: 9, letterSpacing: '0.6px', color: MUTED, marginTop: 4 }}><span>{months[0]}</span><span><span style={{ color: RED }}>dashed</span> = saves SharePoint no longer keeps</span><span>{months[months.length - 1]}</span></div>
      {t.by_editor && <div style={{ fontSize: 11.5, color: INK2, marginTop: 8 }}>{Object.entries(t.by_editor).map(([who, n]) => `${who || 'unknown'} ${n}`).join(' · ')}</div>}
      {(t.sheets || []).length > 0 && <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 4 }}>Sheets · {t.sheets.join(' · ')}</div>}
    </div>
  )
}

function Inventory({ doc, onChange }) {
  const set = (fn) => onChange(fn(structuredClone(doc)))
  const groups = doc.groups || []
  const [gi, setGi] = useState(() => Math.max(0, groups.findIndex(g => g.key === doc.default_group)))
  const [store, setStore] = useState('all')
  const [earlier, setEarlier] = useState(false)
  const [open, setOpen] = useState(null)
  const g = groups[gi]
  const slots = doc.slots || []
  const all = (g?.files || []).slice().sort(byDate)
  const byId = new Map(all.map(f => [f.id, f]))
  const picked = new Set(Object.values(g?.picks || {}).filter(Boolean))
  const storesHere = [...new Set(all.map(f => f.store))]
  const files = all.filter(f => (store === 'all' || f.store === store) && (earlier || f.window !== 'earlier'))
  const earlierCount = all.filter(f => f.window === 'earlier').length
  const has = (v) => v != null && String(v).trim() !== ''
  const cov = COVERAGE[g?.coverage] || [GRAY, g?.coverage || '']
  return (
    <div>
      {doc.question && <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: '#fff', lineHeight: 1.4, marginBottom: 8 }}>{doc.question}</div>}
      {doc.summary && <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{doc.summary}</div>}

      {(doc.stores || []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
          {doc.stores.map(s => (
            <div key={s.key} style={{ ...S.panel, padding: '10px 12px', marginBottom: 0, borderLeft: `2px solid ${STORE_COLOR[s.key] || PANEL_BORDER}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span style={miniChip(STORE_COLOR[s.key] || INK2)}>{STORE_LABEL[s.key] || s.key}</span><span style={{ fontSize: 13, color: '#fff' }}>{s.label}</span></div>
              {s.reach && <div style={{ fontSize: 12, color: INK2, marginTop: 6, lineHeight: 1.5 }}>{s.reach}</div>}
            </div>
          ))}
        </div>
      )}

      {(doc.timelines || []).length > 0 && (
        <>
          <Eyebrow style={{ marginBottom: 8 }}>Version history · what SharePoint still keeps</Eyebrow>
          {doc.timelines.map(t => <Timeline key={t.file} t={t} />)}
        </>
      )}

      <Eyebrow style={{ marginBottom: 8, marginTop: 6 }}>Seasons</Eyebrow>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {groups.map((x, i) => {
          const c = (COVERAGE[x.coverage] || [GRAY])[0]
          return <button key={x.key} onClick={() => { setGi(i); setOpen(null); setStore('all') }} style={pill(i === gi, c)}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 9999, background: c, marginRight: 7 }} />{x.label}</button>
        })}
      </div>

      {g && (
        <div style={{ ...S.panel, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{g.label}</span>
            {g.sub && <span style={{ fontSize: 12.5, color: MUTED }}>{g.sub}</span>}
            <span style={{ ...miniChip(cov[0]), fontSize: 9, padding: '2px 8px' }}>{cov[1]}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: MUTED }}>{all.length} files</span>
          </div>
          {g.note && <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, marginTop: 8 }}>{g.note}</div>}

          {slots.length > 0 && (
            <>
              <Label style={{ marginTop: 16 }}>Which Copy Stands for Each Checkpoint</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                {slots.map(s => {
                  const pick = g.picks?.[s.key] || ''
                  const sug = g.suggested?.[s.key] || ''
                  return (
                    <div key={s.key} style={{ border: `1px solid ${pick ? GOLD : PANEL_BORDER}`, borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.025)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: LABEL, marginBottom: 6 }}>{s.label}<Pick done={!!pick} /></div>
                      <select value={pick} onChange={e => set(d => { const gg = d.groups[gi]; gg.picks = gg.picks || {}; gg.picks[s.key] = e.target.value || null; return d })} style={{ ...field, resize: 'none', padding: '7px 9px', fontSize: 12.5, colorScheme: 'dark' }}>
                        <option value="">No pick yet</option>
                        {all.map(f => <option key={f.id} value={f.id}>{fmtDate(f.date)} · {f.name}</option>)}
                      </select>
                      {sug
                        ? <div style={{ fontSize: 11.5, color: GOLD, marginTop: 8, lineHeight: 1.5 }}>Claude suggests: {byId.get(sug)?.name || sug}{pick !== sug ? <button onClick={() => set(d => { const gg = d.groups[gi]; gg.picks = gg.picks || {}; gg.picks[s.key] = sug; return d })} style={{ ...pill(false, GOLD), marginLeft: 8, padding: '2px 8px' }}>Use It</button> : null}</div>
                        : <div style={{ fontSize: 11.5, color: GRAY, marginTop: 8 }}>{s.empty || 'Nothing survives for this checkpoint.'}</div>}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
            <Label style={{ marginBottom: 0, marginRight: 4 }}>Files</Label>
            <button onClick={() => setStore('all')} style={pill(store === 'all')}>All</button>
            {storesHere.map(s => <button key={s} onClick={() => setStore(s)} style={pill(store === s, STORE_COLOR[s])}>{STORE_LABEL[s] || s}</button>)}
            <span style={{ flex: 1 }} />
            {earlierCount > 0 ? <button onClick={() => setEarlier(v => !v)} style={pill(earlier, GRAY)}>{earlier ? 'Hide' : 'Show'} {earlierCount} earlier in the year</button> : null}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Date</th><th style={th}>File</th><th style={th}>Where</th><th style={{ ...th, textAlign: 'right' }}>Size</th></tr></thead>
              <tbody>
                {files.map(f => (
                  <Fragment key={f.id}>
                    <tr onClick={() => setOpen(open === f.id ? null : f.id)} style={{ cursor: 'pointer', background: picked.has(f.id) ? 'rgba(230,181,79,0.07)' : 'transparent' }}>
                      <td style={{ ...td, fontFamily: MONO, fontSize: 11.5, whiteSpace: 'nowrap', color: MUTED }}>{fmtDate(f.date)}</td>
                      <td style={td}>{f.name}{f.kind ? <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.8px', color: MUTED, marginLeft: 8, textTransform: 'uppercase' }}>{f.kind}</span> : null}{picked.has(f.id) ? <span style={{ ...miniChip(GOLD), marginLeft: 8 }}>pick</span> : null}{f.unverified ? <span style={{ ...miniChip(RED), marginLeft: 8 }}>unverified</span> : null}</td>
                      <td style={{ ...td, color: INK2, fontSize: 12, maxWidth: 380 }}><span style={miniChip(STORE_COLOR[f.store] || INK2)}>{STORE_LABEL[f.store] || f.store}</span><span style={{ marginLeft: 8 }}>{f.where}</span></td>
                      <td style={{ ...td, fontFamily: MONO, fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap', color: MUTED }}>{fmtSize(f.size)}</td>
                    </tr>
                    {open === f.id ? (
                      <tr><td colSpan={4} style={{ padding: '0 10px 12px', fontSize: 12.5, lineHeight: 1.6, color: INK2 }}>
                        {f.where_full ? <div style={{ fontFamily: MONO, fontSize: 11, wordBreak: 'break-all' }}>{f.where_full}</div> : null}
                        {(f.sender || f.subject) ? <div>{f.sender ? `From ${f.sender}` : ''}{f.subject ? ` · "${f.subject}"` : ''}</div> : null}
                        {f.note ? <div style={{ color: INK, marginTop: 4 }}>{f.note}</div> : null}
                        {(f.sheets || []).length > 0 ? <div style={{ fontFamily: MONO, fontSize: 10.5, marginTop: 4, color: MUTED }}>Sheets · {f.sheets.join(' · ')}</div> : null}
                        {(f.numbers || []).length > 0 ? <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 2, marginTop: 6 }}>{f.numbers.map((n, j) => <div key={j} style={{ display: 'contents' }}><span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: LABEL, paddingTop: 2 }}>{n.label}</span><span style={{ fontSize: 13, color: INK }}>{n.value}{n.note ? <span style={{ color: MUTED, fontSize: 11.5 }}> · {n.note}</span> : null}</span></div>)}</div> : null}
                      </td></tr>
                    ) : null}
                  </Fragment>
                ))}
                {files.length === 0 ? <tr><td colSpan={4} style={{ ...td, color: GRAY }}>Nothing in this store for this season.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <Label style={{ marginTop: 16 }}>Your Notes on This Season<Opt /></Label>
          <textarea rows={3} value={g.david_notes || ''} onChange={e => set(d => { d.groups[gi].david_notes = e.target.value; return d })} placeholder="What you remember seeing that fall, what the picture turned out to be, what to pull first." style={field} />
        </div>
      )}

      {(doc.gaps || []).length > 0 && (
        <>
          <Eyebrow style={{ marginBottom: 8 }}>Gaps</Eyebrow>
          <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16 }}>
            {doc.gaps.map((x, i) => (
              <div key={i} style={{ marginBottom: i < doc.gaps.length - 1 ? 12 : 0 }}>
                <div style={{ fontSize: 13.5, color: RED, lineHeight: 1.5 }}>{x.what}</div>
                {(x.candidates || []).length > 0 ? <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.55, marginTop: 3 }}>Where it might still be: {x.candidates.join('; ')}</div> : null}
              </div>
            ))}
          </div>
        </>
      )}

      {(doc.proof || []).length > 0 && (
        <>
          <Eyebrow style={{ marginBottom: 8 }}>Proof the old reads work</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
            {doc.proof.map((p, i) => (
              <div key={i} style={{ ...S.panel, padding: '12px 14px', marginBottom: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>{p.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 4 }}>{(p.rows || []).map((r, j) => <div key={j} style={{ display: 'contents' }}><span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: LABEL, paddingTop: 2 }}>{r.label}</span><span style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{r.value}</span></div>)}</div>
                {p.note ? <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>{p.note}</div> : null}
              </div>
            ))}
          </div>
        </>
      )}

      {doc.read && (
        <>
          <Eyebrow style={{ marginBottom: 8 }}>Claude's read<Cla /></Eyebrow>
          <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16, borderLeft: `2px solid ${GOLD}66` }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{doc.read}</div>
            {(doc.next_steps || []).length > 0 ? <div style={{ marginTop: 12 }}><Label>What the Frame Would Pull</Label>{doc.next_steps.map((x, i) => <div key={i} style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>{i + 1}. {x}</div>)}</div> : null}
          </div>
        </>
      )}

      <Eyebrow style={{ marginBottom: 8 }}>Your call</Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px' }}>
        <Label>Your Notes<Req done={has(doc.david_notes)} /></Label>
        <textarea rows={4} value={doc.david_notes || ''} onChange={e => set(d => { d.david_notes = e.target.value; return d })} placeholder="What you want pulled, what to leave, what the picture should answer." style={field} />
        <Label style={{ marginTop: 12 }}>Verdict<Req done={has(doc.verdict)} /></Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(doc.verdict_options || ['Build the frame', 'Not yet', 'Change the frame']).map(v => <button key={v} onClick={() => set(d => { d.verdict = d.verdict === v ? null : v; d.decided_at = d.verdict ? new Date().toISOString() : null; return d })} style={pill(doc.verdict === v, v === 'Not yet' ? GRAY : v.startsWith('Change') ? RED : GOLD)}>{v}</button>)}
        </div>
      </div>
    </div>
  )
}

export { Inventory }

function requiredFields(doc) {
  const req = []
  const has = (v) => v != null && String(v).trim() !== ''
  for (const k of Object.keys(doc.presentation?.ratings || {})) req.push([`Presentation · ${k}`, has(doc.presentation.ratings[k])])
  req.push(['Presentation · overall', has(doc.presentation?.overall)])
  req.push(['Presentation · notes', has(doc.presentation?.notes)])
  for (const q of doc.questions || []) {
    req.push([`${q.id} · rating`, has(q.rating)])
    if (q.mine) req.push([`${q.id} · your notes`, has(q.notes)])
  }
  for (const c of doc.competencies || []) req.push([`Competency · ${c.name}`, has(c.rating)])
  req.push(['Overall · rating', has(doc.overall?.rating)])
  req.push(['Overall · key strengths', has(doc.overall?.strengths)])
  req.push(['Overall · key concerns', has(doc.overall?.concerns)])
  req.push(['Recommendation', has(doc.overall?.recommendation)])
  return req
}

function Scorecard({ doc, onChange }) {
  const set = (fn) => onChange(fn(structuredClone(doc)))
  const scale = doc.scale || ['Exceeds', 'Meets', 'Below', 'Does Not Meet']
  const mine = (doc.questions || []).filter(q => q.mine)
  const [drawer, setDrawer] = useState(null)
  const req = requiredFields(doc)
  const done = req.filter(([, ok]) => ok).length
  const has = (v) => v != null && String(v).trim() !== ''
  return (
    <div>
      {drawer && <ReadDrawer {...drawer} onClose={() => setDrawer(null)} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
        <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: done === req.length ? GREEN : '#fff' }}>{done} / {req.length}</span>
        <span style={{ fontSize: 12, color: INK2 }}>required fields in your language</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: GRAY }}><span style={{ color: RED }}>red</span> = yours, required · <span style={{ color: GOLD }}>gold</span> = Lumen's draft, edit freely · <span style={{ color: GRAY }}>gray</span> = optional</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
        {[['Candidate', 'candidate'], ['Interview date', 'interview_date'], ['Interviewer', 'interviewer'], ['Title', 'interviewer_title']].map(([l, k]) => (
          <div key={k}>
            <Label>{l}</Label>
            <input value={doc[k] || ''} onChange={e => set(d => { d[k] = e.target.value; return d })} style={{ ...field, resize: 'none' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <Eyebrow style={{ marginBottom: 0 }}>Presentation · {doc.presentation?.topic}</Eyebrow>
        <button onClick={() => setDrawer({ title: 'Presentation', sub: doc.presentation?.topic, read: doc.presentation?.lumen_read, quote: doc.presentation?.notes })} style={pill(false, GOLD)}><Eye size={10} style={{ verticalAlign: '-1px', marginRight: 5 }} />Lumen's read</button>
      </div>
      <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {Object.keys(doc.presentation?.ratings || {}).map(k => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: INK }}>{k}</span>
              <RatingPills scale={scale} value={doc.presentation.ratings[k]} onChange={v => set(d => { d.presentation.ratings[k] = v; return d })} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: 12, alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${PANEL_BORDER}` }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Overall presentation<Req done={has(doc.presentation.overall)} /></span>
            <RatingPills scale={scale} value={doc.presentation.overall} onChange={v => set(d => { d.presentation.overall = v; return d })} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div><Label>Presentation notes<Lum /><Req done={has(doc.presentation?.notes)} /></Label><textarea rows={5} value={doc.presentation?.notes || ''} onChange={e => set(d => { d.presentation.notes = e.target.value; return d })} placeholder="structure, clarity, strategic thinking, NACDD-specific insight, command of the room" style={field} /></div>
          <div><Label>Q&amp;A notes<Opt /></Label><textarea rows={5} value={doc.presentation?.qa_notes || ''} onChange={e => set(d => { d.presentation.qa_notes = e.target.value; return d })} placeholder="how the candidate responded to probing questions, depth of thinking, composure under pressure" style={field} /></div>
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Interview questions · yours are {mine.map(q => q.id).join(' and ') || 'none'}</Eyebrow>
      {(doc.questions || []).map((q, i) => (
        <div key={q.id} style={{ ...S.panel, padding: '14px 16px', marginBottom: 12, border: `1px solid ${q.mine ? `${GOLD}66` : PANEL_BORDER}`, background: q.mine ? 'rgba(230,181,79,0.05)' : undefined }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: q.mine ? GOLD_BRIGHT : '#fff' }}>{q.id}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.2px', color: q.mine ? GOLD : GRAY, textTransform: 'uppercase' }}>{q.panelist}{q.mine ? ' · yours' : ''}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.8px', color: GRAY }}>{q.competency}</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => setDrawer({ title: `${q.id} · ${q.competency}`, sub: q.text, read: q.lumen_read, quote: q.proposed })} style={pill(!!q.lumen_read, GOLD)}><Eye size={10} style={{ verticalAlign: '-1px', marginRight: 5 }} />Lumen's read{q.lumen_read ? '' : ' · pending'}</button>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: INK, marginTop: 8 }}>{q.text}</div>
          <div style={{ display: 'grid', gridTemplateColumns: q.mine ? '1fr 1fr' : '1fr', gap: 12, marginTop: 12 }}>
            {q.mine && (
              <div>
                <Label>Proposed answer<Lum /></Label>
                <textarea rows={7} value={q.proposed || ''} onChange={e => set(d => { d.questions[i].proposed = e.target.value; return d })} placeholder="Lumen drafts this from what the candidate said. Edit freely." style={{ ...field, borderColor: `${GOLD}55` }} />
              </div>
            )}
            <div>
              <Label>{q.mine ? 'Your notes' : 'Notes'}{q.mine ? <Req done={has(q.notes)} /> : <Opt />}</Label>
              <textarea rows={q.mine ? 7 : 3} value={q.notes || ''} onChange={e => set(d => { d.questions[i].notes = e.target.value; return d })} style={field} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: LABEL, textTransform: 'uppercase' }}>{q.id} rating<Req done={has(q.rating)} /></span>
            <RatingPills scale={scale} value={q.rating} onChange={v => set(d => { d.questions[i].rating = v; return d })} />
          </div>
        </div>
      ))}

      <Eyebrow style={{ marginBottom: 8 }}>Competency summary · holistic, not an average</Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {(doc.competencies || []).map((c, i) => (
            <div key={c.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto auto', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: INK }}>{c.name}<Req done={has(c.rating)} /></span>
              <button onClick={() => setDrawer({ title: c.name, sub: 'competency summary', read: c.lumen_read, quote: null })} style={pill(!!c.lumen_read, GOLD)}><Eye size={10} style={{ verticalAlign: '-1px', marginRight: 5 }} />read</button>
              <RatingPills scale={[...scale.slice(0, 3), 'N/A']} value={c.rating} onChange={v => set(d => { d.competencies[i].rating = v; return d })} />
            </div>
          ))}
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Overall evaluation</Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Overall rating<Req done={has(doc.overall?.rating)} /></span>
          <RatingPills scale={scale} value={doc.overall?.rating} onChange={v => set(d => { d.overall = d.overall || {}; d.overall.rating = v; return d })} />
        </div>
        <div style={{ fontSize: 11.5, color: GRAY, fontStyle: 'italic', marginBottom: 12 }}>Template note to panelists: subject-matter expertise is developable after hire; organizational leadership, clear prioritization, and a functioning executive structure are not. Weigh that heavily here.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label>Key strengths observed<Req done={has(doc.overall?.strengths)} /></Label><textarea rows={4} value={doc.overall?.strengths || ''} onChange={e => set(d => { d.overall = d.overall || {}; d.overall.strengths = e.target.value; return d })} style={field} /></div>
          <div><Label>Key concerns or gaps<Req done={has(doc.overall?.concerns)} /></Label><textarea rows={4} value={doc.overall?.concerns || ''} onChange={e => set(d => { d.overall = d.overall || {}; d.overall.concerns = e.target.value; return d })} style={field} /></div>
          <div><Label>Questions or topics to probe in the next round<Opt /></Label><textarea rows={3} value={doc.overall?.probe || ''} onChange={e => set(d => { d.overall = d.overall || {}; d.overall.probe = e.target.value; return d })} style={field} /></div>
          <div><Label>Additional comments<Opt /></Label><textarea rows={3} value={doc.overall?.comments || ''} onChange={e => set(d => { d.overall = d.overall || {}; d.overall.comments = e.target.value; return d })} style={field} /></div>
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Recommendation<Req done={has(doc.overall?.recommendation)} /></Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(doc.recommendation_options || ['Strong Yes', 'Yes', 'No', 'Strong No']).map(r => (
            <button key={r} onClick={() => set(d => { d.overall = d.overall || {}; d.overall.recommendation = d.overall.recommendation === r ? null : r; return d })} style={pill(doc.overall?.recommendation === r, r.includes('Yes') ? GREEN : RED)}>
              {r}{r.includes('Yes') ? ' · advance to meet & greets' : ' · do not advance'}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, marginTop: 12, alignItems: 'end' }}>
          <div><Label>Date completed<Opt /></Label><input value={doc.overall?.date_completed || ''} onChange={e => set(d => { d.overall = d.overall || {}; d.overall.date_completed = e.target.value; return d })} placeholder="today if blank" style={{ ...field, resize: 'none' }} /></div>
          <div style={{ fontSize: 11.5, color: GRAY, paddingBottom: 10 }}>When every red chip is green, tell Lumen it's final. He fills Stephanie's Word template from this page and sends it to you.</div>
        </div>
      </div>
    </div>
  )
}

export default function ArtifactsTab({ project, initialSlug }) {
  const [list, setList] = useState(undefined)
  const [slug, setSlug] = useState(initialSlug || null)
  const [doc, setDoc] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { const l = await listArtifacts(project.id); setList(l); if (!slug && l.length) setSlug(l[0].slug) }
    catch (e) { setList([]); setMsg(`Could not list artifacts: ${e.message}`) }
  }, [project.id, slug])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!slug) return
    let alive = true
    readArtifact(project.id, slug).then(d => { if (alive) { setDoc(d); setDirty(false); setMsg(null) } }).catch(e => setMsg(`Could not read it: ${e.message}`))
    return () => { alive = false }
  }, [project.id, slug])

  const save = async () => {
    setBusy(true)
    try { await writeArtifact(project.id, slug, doc); setDirty(false); setMsg('Saved. Lumen sees this version.') }
    catch (e) { setMsg(`Could not save: ${e.message}`) }
    setBusy(false)
  }
  const reload = () => { setSlug(s => s); readArtifact(project.id, slug).then(d => { setDoc(d); setDirty(false); setMsg('Reloaded.') }).catch(e => setMsg(e.message)) }

  const cards = (list || []).filter(a => a.slug.startsWith('scorecard-'))
  const others = (list || []).filter(a => !a.slug.startsWith('scorecard-'))

  return (
    <div>
      {list === undefined && <div style={{ fontSize: 13, color: GRAY, padding: '18px 0' }}>Loading artifacts…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: GRAY, padding: '18px 0' }}>No artifacts on this mission yet. Ask Lumen to draft one.</div>}
      {list && list.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <Label style={{ marginBottom: 0, marginRight: 4 }}>{cards.length ? 'Interviewee' : 'Artifact'}</Label>
            {cards.map(a => (
              <button key={a.slug} onClick={async () => { if (dirty && !await hudConfirm('Unsaved edits. Switch anyway?')) return; setSlug(a.slug) }} style={pill(slug === a.slug, GOLD)}>
                <User size={10} style={{ verticalAlign: '-1px', marginRight: 5 }} />{a.slug.replace(/^scorecard-/, '').replace(/-/g, ' ')}
              </button>
            ))}
            {others.map(a => <button key={a.slug} onClick={async () => { if (dirty && !await hudConfirm('Unsaved edits. Switch anyway?')) return; setSlug(a.slug) }} style={pill(slug === a.slug)}>{a.slug.replace(/^(decision|brief|inventory)-/, '').replace(/-/g, ' ')}</button>)}
            <span style={{ flex: 1 }} />
            <button onClick={reload} title="Reload from the file store" style={pill(false)}><RefreshCw size={10} style={{ verticalAlign: '-1px', marginRight: 5 }} />Reload</button>
            <button onClick={save} disabled={!dirty || busy} style={{ ...pill(dirty, GREEN), opacity: dirty ? 1 : 0.5 }}><Save size={10} style={{ verticalAlign: '-1px', marginRight: 5 }} />{busy ? 'Saving' : dirty ? 'Save' : 'Saved'}</button>
          </div>
          {doc && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{doc.title || slug}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GRAY }}>{doc.updated_at ? `updated ${new Date(doc.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })}` : ''}{doc.updated_by ? ` · ${String(doc.updated_by).split(' ')[0]}` : ''}</div>
              </div>
              {doc.kind === 'scorecard'
                ? <Scorecard doc={doc} onChange={(d) => { setDoc(d); setDirty(true) }} />
                : doc.kind === 'decision'
                  ? <Decision doc={doc} onChange={(d) => { setDoc(d); setDirty(true) }} />
                  : doc.kind === 'brief'
                    ? <Brief doc={doc} />
                    : doc.kind === 'inventory'
                      ? <Inventory doc={doc} onChange={(d) => { setDoc(d); setDirty(true) }} />
                      : doc.kind === 'plan'
                        ? <PlanningCanvas project={project} />
                        : doc.kind === 'timeline'
                          ? <div style={{ fontSize: 13, color: INK2, lineHeight: 1.6 }}>The program timeline: {Array.isArray(doc.items) ? doc.items.length : 0} items across {doc.client_key || 'this client'}'s lanes. It is drawn as the waterfall on the Clients page, Timeline pill; edit it there.</div>
                          : <pre style={{ fontSize: 12, color: INK2, whiteSpace: 'pre-wrap' }}>{JSON.stringify(doc, null, 2)}</pre>}
            </>
          )}
          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, marginTop: 12, textTransform: 'uppercase' }}>{msg}</div>}
          <div style={{ fontSize: 11, color: GRAY, marginTop: 14 }}>{doc?.kind === 'plan' ? "The Program Plan: the same canvas as the Planning pill, saved to this artifact as you edit." : doc?.kind === 'timeline' ? "The program timeline is edited on the Clients page." : doc?.kind === 'decision' ? "Lumen writes the options, the numbers, and his read. Your notes and the verdict are yours; save, and he sees it." : doc?.kind === 'inventory' ? "Claude assembled the files and the version timelines. The picks, the notes and the verdict are yours; save, and the next build reads them." : "Lumen drafts the proposed answers from the interview notes. You edit and rate here, save, then tell Lumen it's final and he ports it to Stephanie's Word template."}</div>
        </>
      )}
    </div>
  )
}
