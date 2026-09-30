// Artifacts on a project: structured work products the HUD renders and David
// edits in place. Lumen drafts into them, David finishes them here, Lumen
// ports them out as a Word file. First kind: the interview scorecard.
import { useCallback, useEffect, useState } from 'react'
import { Save, RefreshCw, User, Eye, X as XIcon } from 'lucide-react'
import { listArtifacts, readArtifact, writeArtifact } from '../../lib/artifacts'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label } from './canon'

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
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY, textTransform: 'uppercase' }}>{q.id} rating<Req done={has(q.rating)} /></span>
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
              <button key={a.slug} onClick={() => { if (dirty && !window.confirm('Unsaved edits. Switch anyway?')) return; setSlug(a.slug) }} style={pill(slug === a.slug, GOLD)}>
                <User size={10} style={{ verticalAlign: '-1px', marginRight: 5 }} />{a.slug.replace(/^scorecard-/, '').replace(/-/g, ' ')}
              </button>
            ))}
            {others.map(a => <button key={a.slug} onClick={() => setSlug(a.slug)} style={pill(slug === a.slug)}>{a.slug}</button>)}
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
                : <pre style={{ fontSize: 12, color: INK2, whiteSpace: 'pre-wrap' }}>{JSON.stringify(doc, null, 2)}</pre>}
            </>
          )}
          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, marginTop: 12, textTransform: 'uppercase' }}>{msg}</div>}
          <div style={{ fontSize: 11, color: GRAY, marginTop: 14 }}>Lumen drafts the proposed answers from the interview notes. You edit and rate here, save, then tell Lumen it's final and he ports it to Stephanie's Word template.</div>
        </>
      )}
    </div>
  )
}
