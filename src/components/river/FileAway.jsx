// File Away: the gate in front of closing a Side Mission that carries
// something. Lists what it holds, asks where it lands (realm), takes a one-line
// summary (Lumen can draft it), files the picks into the Archive, then closes
// the mission out through the Board. Nothing carried: the caller skips this.
import { useEffect, useState } from 'react'
import { X as XIcon, Archive as ArchiveIcon, Sparkles, FileText, ListChecks, Paperclip } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fileObjective } from '../../lib/archive'
import { closeOut, realmOf } from '../../lib/objectives'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, Eyebrow, Label } from './canon'

const btn = (color = INK2, filled = false, extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '6px 10px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra,
})
const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }

export default function FileAway({ objective: o, pockets: P, onClose, onDone }) {
  const [realm, setRealm] = useState(realmOf(o))
  const [summary, setSummary] = useState('')
  const [notes, setNotes] = useState('')
  const [picks, setPicks] = useState({ artifacts: P.artifacts.map(a => a.slug), files: P.files.map(f => f.name), boards: P.boards.map(b => b.id) })
  const [minutes, setMinutes] = useState('')
  const [busy, setBusy] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const toggle = (kind, key) => setPicks(p => ({ ...p, [kind]: p[kind].includes(key) ? p[kind].filter(x => x !== key) : [...p[kind], key] }))
  const draft = async () => {
    setDrafting(true); setErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const text = `Draft a two-sentence archive summary for the Side Mission "${o.title}"${o.description ? ` (back story: ${String(o.description).slice(0, 400)})` : ''}. It carried: ${[...P.artifacts.map(a => `artifact "${a.title}"`), ...P.files.map(f => `file ${f.name}`), ...P.boards.map(b => `session board "${b.title}"`)].join(', ')}. Steps: ${(P.steps || []).map(s => `${s.done ? '[x]' : '[ ]'} ${s.text}`).join('; ') || 'none recorded'}. Reply with the summary only, no preamble.`
      const r = await fetch('/api/lumen-hud', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, where: 'File Away' }) })
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `lumen ${r.status}`)
      setSummary(j.reply || '')
    } catch (e) { setErr(`Lumen could not draft: ${e.message}`) } finally { setDrafting(false) }
  }
  const go = async () => {
    setBusy(true); setErr(null)
    try {
      const filed = await fileObjective(o, P, { realm, summary, picks, notes })
      const r = await closeOut(o, { minutes: Number(minutes) || 0, note: `filed ${filed.length} to the Archive (${realm})` })
      onDone({ filed, released: r })
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  const count = picks.artifacts.length + picks.files.length + picks.boards.length
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 260, background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 620, width: '100%', maxHeight: '88vh', overflowY: 'auto', background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>File away · the Archive</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{o.title}</div>
            <div style={{ fontSize: 12.5, color: INK2, marginTop: 6 }}>This Side Mission is carrying content. Pick what to keep, say where it lands, and close it out.</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
        </div>

        <Label style={{ marginTop: 18 }}>What it holds · {count} to file</Label>
        {P.artifacts.map(a => <label key={a.slug} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}><input type="checkbox" checked={picks.artifacts.includes(a.slug)} onChange={() => toggle('artifacts', a.slug)} /><FileText size={13} color={GOLD_BRIGHT} /><span style={{ flex: 1, fontSize: 13.5, color: INK }}>{a.title}</span><span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GRAY, textTransform: 'uppercase' }}>{a.kind || 'artifact'}</span></label>)}
        {P.files.map(f => <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}><input type="checkbox" checked={picks.files.includes(f.name)} onChange={() => toggle('files', f.name)} /><Paperclip size={13} color={BLUE} /><span style={{ flex: 1, fontSize: 13.5, color: INK }}>{f.name}</span><span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GRAY, textTransform: 'uppercase' }}>file</span></label>)}
        {P.boards.map(b => <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}><input type="checkbox" checked={picks.boards.includes(b.id)} onChange={() => toggle('boards', b.id)} /><ListChecks size={13} color={GREEN} /><span style={{ flex: 1, fontSize: 13.5, color: INK }}>{b.title}</span><span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GRAY, textTransform: 'uppercase' }}>board · {b.done}/{b.total}</span></label>)}
        <div style={{ fontSize: 11.5, color: GRAY, marginTop: 4 }}>Unchecked items stay where they are under the mission's own folder; they are simply not indexed.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, marginTop: 16 }}>
          <div><Label>Realm</Label><div style={{ display: 'flex', gap: 6 }}>{[['third-horizon', 'Third Horizon'], ['personal', 'Personal']].map(([k, l]) => <button key={k} onClick={() => setRealm(k)} style={btn(realm === k ? (k === 'personal' ? GOLD : BLUE) : INK2, realm === k)}>{l}</button>)}</div></div>
          <div><Label>Minutes</Label><input type="number" min="0" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="clock" style={field} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Label style={{ marginBottom: 0 }}>Summary for the Archive</Label><span style={{ flex: 1 }} /><button onClick={draft} disabled={drafting} style={btn(BLUE, false, { opacity: drafting ? 0.6 : 1 })}><Sparkles size={11} /> {drafting ? 'Lumen is drafting…' : 'Ask Lumen'}</button></div>
          <textarea rows={3} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Two sentences: what this was and what came of it." style={{ ...field, marginTop: 6, resize: 'vertical' }} />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else to keep with it (optional)" style={{ ...field, marginTop: 8 }} />
        </div>
        {err && <div style={{ fontSize: 12, color: RED, marginTop: 10 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btn(INK2)}>Cancel</button>
          <button onClick={go} disabled={busy} style={btn(GOLD, true)}><ArchiveIcon size={12} /> {busy ? 'Filing' : `File ${count} and close out`}</button>
        </div>
      </div>
    </div>
  )
}
