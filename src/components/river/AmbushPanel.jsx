// Ambush: the surprise attack. Something unplanned lands on David (a thing to
// do right now, an unexpected call) and the move is stop, focus, dispatch,
// move on. Starting puts it on the board with the timer running; Dispatch
// closes it out: what to log, and whether anything left becomes a Main
// Mission task, a Side Mission, or a whole new Main Mission. One mile each,
// started and dispatched. Calls ask who.
import { useCallback, useEffect, useState } from 'react'
import { Zap, Phone, Play, Swords, X as XIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fetchLoadout, addImpromptu, extract, fmtClock, DAVID } from '../../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label, Panel } from './canon'

const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent',
  color: filled ? '#0A1B2B' : color, cursor: 'pointer',
})
const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
const RED_ORANGE = '#E8836F'

function DispatchModal({ item, projects, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [minutes, setMinutes] = useState(Math.round(item.minutes_today) || '')
  const [left, setLeft] = useState('none') // none | task | side | mission
  const [text, setText] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [missionName, setMissionName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = async () => {
    setBusy(true); setErr(null)
    try {
      const ported = []
      const now = new Date().toISOString()
      if (left === 'side' && text.trim()) {
        const { error } = await supabase.from('objectives').insert({ user_id: DAVID, title: text.trim().slice(0, 160), state: 'parked', kind: 'execution', effort: 1, importance: 2, needs_sizing: false, tags: [], captured_at: now, description: `From ambush: ${item.title}${note ? ` · ${note.slice(0, 200)}` : ''}` })
        if (error) throw new Error(error.message)
        ported.push(`Side Mission: ${text.trim()}`)
      }
      if (left === 'task' && text.trim() && projectId) {
        const { error } = await supabase.from('project_tasks').insert({ project_id: projectId, text: text.trim(), status: 'open', done: false, source: 'ambush', notes: `From ambush: ${item.title}${note ? ` · ${note.slice(0, 300)}` : ''}` })
        if (error) throw new Error(error.message)
        ported.push(`Main Mission task on ${projects.find(p => p.id === projectId)?.name || 'project'}: ${text.trim()}`)
      }
      if (left === 'mission' && missionName.trim()) {
        const { data: { session } } = await supabase.auth.getSession()
        const { data: p, error } = await supabase.from('projects').insert({ user_id: session?.user?.id || DAVID, name: missionName.trim(), category: 'client', kind: 'standing', status: 'active', priority: 'medium', pinned: false, last_activity_at: now, description: `Opened from ambush: ${item.title}` }).select().single()
        if (error) throw new Error(error.message)
        if (text.trim()) await supabase.from('project_tasks').insert({ project_id: p.id, text: text.trim(), status: 'open', done: false, source: 'ambush' })
        ported.push(`New Main Mission: ${missionName.trim()}${text.trim() ? ` · first task: ${text.trim()}` : ''}`)
      }
      const r = await extract(item, { minutes: Number(minutes) || 0, note: [note.trim() || null, ported.length ? `ported: ${ported.join(' | ')}` : 'nothing left'].filter(Boolean).join(' · ') })
      onDone({ ...r, ported })
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '100%', maxHeight: '86vh', overflowY: 'auto', background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Dispatch</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{item.title}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: GRAY, marginTop: 6 }}>{fmtClock(item.minutes_today)} on the clock · 1 mile on dispatch</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'start' }}>
          <div>
            <Label>Minutes</Label>
            <input type="number" min="0" value={minutes} onChange={e => setMinutes(e.target.value)} style={field} />
          </div>
          <div>
            <Label>What to log</Label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={item.call ? 'Who it was, what it was about, what was decided.' : 'What happened, what got done.'} style={{ ...field, resize: 'vertical' }} />
          </div>
        </div>

        <Label style={{ marginTop: 14 }}>Anything left?</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['none', 'Nothing left'], ['task', 'Main Mission task'], ['side', 'Side Mission'], ['mission', 'New Main Mission']].map(([k, l]) => (
            <button key={k} onClick={() => setLeft(k)} style={btn(left === k ? GOLD : INK2, left === k)}>{l}</button>
          ))}
        </div>
        {left === 'task' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div><Label>Main Mission</Label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} style={field}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><Label>The task</Label><input value={text} onChange={e => setText(e.target.value)} placeholder="what has to happen next" style={field} /></div>
          </div>
        )}
        {left === 'side' && (
          <div style={{ marginTop: 10 }}><Label>Side Mission (parked, planned for later)</Label><input value={text} onChange={e => setText(e.target.value)} placeholder="what has to happen next" style={field} /></div>
        )}
        {left === 'mission' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div><Label>New Main Mission</Label><input value={missionName} onChange={e => setMissionName(e.target.value)} placeholder="name it" style={field} /></div>
            <div><Label>First task (optional)</Label><input value={text} onChange={e => setText(e.target.value)} style={field} /></div>
          </div>
        )}
        {err && <div style={{ fontSize: 12, color: RED, marginTop: 10 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btn(INK2)}>Cancel</button>
          <button onClick={go} disabled={busy} style={btn(GOLD, true)}><Swords size={12} /> {busy ? 'Dispatching' : 'Dispatch'}</button>
        </div>
      </div>
    </div>
  )
}

export default function AmbushPanel({ onChange, refreshKey = 0 }) {
  const [L, setL] = useState(null)
  const [projects, setProjects] = useState([])
  const [imp, setImp] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(null)
  const [msg, setMsg] = useState(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => fetchLoadout().then(setL).catch(e => console.warn('ambush', e.message)), [])
  useEffect(() => { refresh() }, [refresh, tick, refreshKey])
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30_000); return () => clearInterval(t) }, [])
  useEffect(() => { supabase.from('projects').select('id,name').eq('status', 'active').order('name').then(({ data }) => setProjects(Array.isArray(data) ? data : [])) }, [])

  const ambushes = (L?.items || []).filter(i => i.tags.includes('impromptu')).map(i => ({ ...i, call: i.tags.includes('call') }))

  const start = async (title, extraTags = []) => {
    setBusy(true)
    try {
      const r = await addImpromptu(title, { tags: extraTags })
      if (r.ok) { setMsg(`Ambush on the board, timer on: ${r.title}`); setImp(''); setTick(x => x + 1); onChange && onChange() }
      else setMsg(`No room on the loadout: ${r.reasons.join('; ')}`)
    } catch (e) { setMsg(`Could not add it: ${e.message}`) }
    setBusy(false)
  }
  const startCall = () => {
    const who = window.prompt('Who is calling?', '')
    if (who === null) return
    start(`Call: ${who.trim() || 'unknown'}`, ['call'])
  }

  return (
    <Panel style={{ marginBottom: 0 }}>
      {open && <DispatchModal item={open} projects={projects} onClose={() => setOpen(null)} onDone={(r) => { setOpen(null); setMsg(`Dispatched: ${open.title} · ${fmtClock(r.minutes)}${r.ported.length ? ` · ported ${r.ported.length}` : ' · nothing left'} · 1 mile on the next update`); setTick(x => x + 1); onChange && onChange() }} />}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Zap size={13} color={RED_ORANGE} style={{ flexShrink: 0 }} />
        <input value={imp} onChange={e => setImp(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && imp.trim()) start(imp) }} placeholder="Impromptu: what just landed on you? Enter starts the timer." disabled={busy}
          style={{ ...field, flex: 1, minWidth: 220, width: 'auto' }} />
        <button onClick={() => imp.trim() && start(imp)} disabled={busy || !imp.trim()} style={{ ...btn(RED_ORANGE, !!imp.trim()), opacity: imp.trim() ? 1 : 0.5 }}><Play size={11} /> Start</button>
        <button onClick={startCall} disabled={busy} style={btn(BLUE)}><Phone size={11} /> Call</button>
      </div>

      {ambushes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {ambushes.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? `1px solid ${PANEL_BORDER}` : `1px solid ${PANEL_BORDER}` }}>
              {a.call ? <Phone size={12} color={BLUE} /> : <Zap size={12} color={RED_ORANGE} />}
              <span style={{ fontSize: 13.5, color: INK, flex: 1, minWidth: 0 }}>{a.title}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: a.equipped ? GREEN : GRAY, letterSpacing: '0.6px' }}>{a.equipped ? 'running · ' : 'holstered · '}{fmtClock(a.minutes_today)}</span>
              <button onClick={() => setOpen(a)} style={btn(GOLD)}><Swords size={11} /> Dispatch</button>
            </div>
          ))}
        </div>
      )}
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could') || msg.startsWith('No room') ? RED : GOLD_BRIGHT, textTransform: 'uppercase', marginTop: 10 }}>{msg}</div>}
    </Panel>
  )
}
