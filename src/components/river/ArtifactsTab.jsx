// Artifacts on a project: structured work products the HUD renders and David
// edits in place. Lumen drafts into them, David finishes them here, Lumen
// ports them out as a Word file. First kind: the interview scorecard.
import { useCallback, useEffect, useState } from 'react'
import { Save, RefreshCw, User } from 'lucide-react'
import { listArtifacts, readArtifact, writeArtifact } from '../../lib/artifacts'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label } from './canon'

const field = { width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '9px 11px', fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
const pill = (active, color = BLUE) => ({
  fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 9999, cursor: 'pointer',
  border: `1px solid ${active ? color : 'rgba(255,255,255,0.16)'}`, background: active ? `${color}22` : 'transparent', color: active ? color : 'rgba(234,241,248,0.7)',
})
const RATING_COLOR = { 'Exceeds': GREEN, 'Meets': BLUE, 'Below': GOLD, 'Does Not Meet': RED }

function RatingPills({ scale, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {scale.map(r => (
        <button key={r} onClick={() => onChange(value === r ? null : r)} style={pill(value === r, RATING_COLOR[r] || BLUE)}>{r}</button>
      ))}
    </div>
  )
}

function Scorecard({ doc, onChange }) {
  const set = (fn) => onChange(fn(structuredClone(doc)))
  const scale = doc.scale || ['Exceeds', 'Meets', 'Below', 'Does Not Meet']
  const mine = (doc.questions || []).filter(q => q.mine)
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
        {[['Candidate', 'candidate'], ['Interview date', 'interview_date'], ['Interviewer', 'interviewer'], ['Title', 'interviewer_title']].map(([l, k]) => (
          <div key={k}>
            <Label>{l}</Label>
            <input value={doc[k] || ''} onChange={e => set(d => { d[k] = e.target.value; return d })} style={{ ...field, resize: 'none' }} />
          </div>
        ))}
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Presentation · {doc.presentation?.topic}</Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {Object.keys(doc.presentation?.ratings || {}).map(k => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: INK }}>{k}</span>
              <RatingPills scale={scale} value={doc.presentation.ratings[k]} onChange={v => set(d => { d.presentation.ratings[k] = v; return d })} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: 12, alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${PANEL_BORDER}` }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Overall presentation</span>
            <RatingPills scale={scale} value={doc.presentation.overall} onChange={v => set(d => { d.presentation.overall = v; return d })} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div><Label>Presentation notes</Label><textarea rows={5} value={doc.presentation?.notes || ''} onChange={e => set(d => { d.presentation.notes = e.target.value; return d })} placeholder="structure, clarity, strategic thinking, NACDD-specific insight, command of the room" style={field} /></div>
          <div><Label>Q&amp;A notes</Label><textarea rows={5} value={doc.presentation?.qa_notes || ''} onChange={e => set(d => { d.presentation.qa_notes = e.target.value; return d })} placeholder="how the candidate responded to probing questions, depth of thinking, composure under pressure" style={field} /></div>
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Interview questions · yours are {mine.map(q => q.id).join(' and ') || 'none'}</Eyebrow>
      {(doc.questions || []).map((q, i) => (
        <div key={q.id} style={{ ...S.panel, padding: '14px 16px', marginBottom: 12, border: `1px solid ${q.mine ? `${GOLD}66` : PANEL_BORDER}`, background: q.mine ? 'rgba(230,181,79,0.05)' : undefined }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: q.mine ? GOLD_BRIGHT : '#fff' }}>{q.id}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.2px', color: q.mine ? GOLD : GRAY, textTransform: 'uppercase' }}>{q.panelist}{q.mine ? ' · yours' : ''}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.8px', color: GRAY }}>{q.competency}</span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: INK, marginTop: 8 }}>{q.text}</div>
          <div style={{ display: 'grid', gridTemplateColumns: q.mine ? '1fr 1fr' : '1fr', gap: 12, marginTop: 12 }}>
            {q.mine && (
              <div>
                <Label>Proposed answer · Lumen's draft from the interview notes</Label>
                <textarea rows={7} value={q.proposed || ''} onChange={e => set(d => { d.questions[i].proposed = e.target.value; return d })} placeholder="Lumen drafts this from what the candidate said. Edit freely." style={{ ...field, borderColor: `${GOLD}55` }} />
              </div>
            )}
            <div>
              <Label>{q.mine ? 'Your notes' : 'Notes'}</Label>
              <textarea rows={q.mine ? 7 : 3} value={q.notes || ''} onChange={e => set(d => { d.questions[i].notes = e.target.value; return d })} style={field} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY, textTransform: 'uppercase' }}>{q.id} rating</span>
            <RatingPills scale={scale} value={q.rating} onChange={v => set(d => { d.questions[i].rating = v; return d })} />
          </div>
        </div>
      ))}

      <Eyebrow style={{ marginBottom: 8 }}>Competency summary · holistic, not an average</Eyebrow>
      <div style={{ ...S.panel, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {(doc.competencies || []).map((c, i) => (
            <div key={c.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: INK }}>{c.name}</span>
              <RatingPills scale={[...scale.slice(0, 3), 'N/A']} value={c.rating} onChange={v => set(d => { d.competencies[i].rating = v; return d })} />
            </div>
          ))}
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>Overall</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><Label>Recommendation</Label><textarea rows={4} value={doc.overall?.recommendation || ''} onChange={e => set(d => { d.overall = d.overall || {}; d.overall.recommendation = e.target.value; return d })} style={field} /></div>
        <div><Label>Closing notes</Label><textarea rows={4} value={doc.overall?.notes || ''} onChange={e => set(d => { d.overall = d.overall || {}; d.overall.notes = e.target.value; return d })} style={field} /></div>
      </div>
    </div>
  )
}

export default function ArtifactsTab({ project }) {
  const [list, setList] = useState(undefined)
  const [slug, setSlug] = useState(null)
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
