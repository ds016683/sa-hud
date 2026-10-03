// One detail view for every discrete thing on the Board: a Main Mission task,
// a Side Mission, an impromptu, a Claude session, a calendar event. Laid out
// like the mission page: title, a line under it, pills across the right
// (Overview · Artifacts · Sessions · Files · Notes). Every pill either opens
// what is linked or says plainly that the item doesn't call for it, and
// offers to attach one from the mission.
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Play, Pause, Archive, ExternalLink, FolderOpen, FileText, ListChecks, Mic, Map as MapIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listArtifacts, readArtifact, writeArtifact } from '../../lib/artifacts'
import { fetchLoadout, equip, holster, stash, equipObjective, equipTask, fmtClock, SIZES } from '../../lib/loadout'
import { renderMarkdown } from './MeetingCloseout'
import SessionBoard from './SessionBoard'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Label } from './canon'

const NAVY_DEEP = '#0A1B2B'
const TABS = ['overview', 'artifacts', 'sessions', 'files', 'notes']
const TAB_LABEL = { overview: 'Overview', artifacts: 'Artifacts', sessions: 'Sessions', files: 'Files', notes: 'Notes' }
const KIND_COLOR = { 'Main Mission': GOLD_BRIGHT, 'Side Mission': GREEN, 'Impromptu': INK2, 'Session': BLUE, 'Event': BLUE }
const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'about', 'notes', 'upload', 'interview', 'call', 'meeting', 'review', 'investigate', 'weekly', 'monthly', 'david', 'smith'])
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
const chiTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

function Pill({ active, children, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
      background: active ? BLUE : 'transparent', color: active ? NAVY_DEEP : 'rgba(234,241,248,0.66)', border: active ? `1px solid ${BLUE}` : `1px solid ${PANEL_BORDER}`,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>{children}{count > 0 && <span style={{ fontSize: 9, opacity: 0.8 }}>· {count}</span>}</button>
  )
}
const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '6px 11px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? NAVY_DEEP : color, cursor: 'pointer',
})
const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}` }
const None = ({ what }) => <div style={{ fontSize: 13, color: GRAY, padding: '14px 0' }}>This {what.item} doesn't call for {what.thing}.</div>

// Everything the item connects to, loaded once.
async function loadRelated(item) {
  const out = { project: null, task: null, artifacts: [], boards: [], projectFiles: [], storeFiles: [], meetings: [], loadout: null }
  let task = null
  if (item.task_id) { const { data } = await supabase.from('project_tasks').select('id,text,notes,status,due_date,project_id,session_ref,objective_id').eq('id', item.task_id).limit(1); task = data?.[0] || null }
  else if (item.objective_id) { const { data } = await supabase.from('project_tasks').select('id,text,notes,status,due_date,project_id,session_ref,objective_id').eq('objective_id', item.objective_id).limit(1); task = data?.[0] || null }
  out.task = task
  let pid = item.project_id || task?.project_id || null
  if (!pid && item.kind === 'Session') {
    const key = String(item.title || '').split('·').pop().trim()
    if (key) { const { data } = await supabase.from('projects').select('id').or(`key.eq.${key},name.eq.${key}`).limit(1); pid = data?.[0]?.id || null }
  }
  if (pid) {
    const { data: p } = await supabase.from('projects').select('id,name,key,description').eq('id', pid).single()
    out.project = p || null
    try {
      const list = await listArtifacts(pid)
      out.artifacts = await Promise.all(list.map(async a => { try { const d = await readArtifact(pid, a.slug); return { slug: a.slug, title: d.title || a.slug, task_id: d.task_id || null, updated_at: d.updated_at } } catch { return { slug: a.slug, title: a.slug, task_id: null } } }))
    } catch { out.artifacts = [] }
    if (p) {
      const { data: sb } = await supabase.from('session_boards').select('id,project,title,updated_at,phases').or(`project.eq.${p.key || p.name},project.eq.${p.name}`).order('updated_at', { ascending: false }).limit(8)
      out.boards = (sb || []).map(b => { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); return { id: b.id, project: b.project, title: b.title, updated_at: b.updated_at, phases: b.phases || [], linked: !!task && (ts.some(t => t.task_id === task.id) || task.session_ref === b.id || task.session_ref === b.title), done: ts.filter(t => t.status === 'done').length, total: ts.length } })
      const { data: pf } = await supabase.storage.from('project-files').list(pid, { limit: 100 })
      out.projectFiles = (pf || []).filter(f => f.id !== null && !f.name.endsWith('.json')).map(f => ({ name: f.name, path: `${pid}/${f.name}`, bucket: 'project-files' }))
      const { data: sf } = await supabase.storage.from('files').list(p.name, { limit: 100 })
      out.storeFiles = (sf || []).map(f => ({ name: f.name, folder: f.id === null, path: `${p.name}/${f.name}`, bucket: 'files' }))
    }
  }
  // Decisions live on the standing mission "Decisions" and point at the board item they serve.
  try {
    const { data: dp } = await supabase.from('projects').select('id,name').eq('key', 'Decisions').limit(1)
    const dproj = dp?.[0]
    if (dproj && dproj.id !== pid) {
      const list = await listArtifacts(dproj.id)
      const docs = await Promise.all(list.map(async a => { try { const d = await readArtifact(dproj.id, a.slug); return { slug: a.slug, title: d.title || a.slug, task_id: d.task_id || null, objective_id: d.objective_id || null, project_id: dproj.id, decision: true } } catch { return null } }))
      const mine = docs.filter(d => d && ((item.objective_id && d.objective_id === item.objective_id) || (item.task_id && d.task_id === item.task_id) || d.objective_id === item.id))
      out.artifacts = [...out.artifacts, ...mine]
      out.decisionsProject = dproj
    }
  } catch { /* no decisions */ }
  const ws = [...new Set([...words(item.title), ...words(out.project?.name)])].slice(0, 6)
  if (ws.length) {
    const since = new Date(Date.now() - 60 * 86400e3).toISOString().slice(0, 10)
    const { data: gm } = await supabase.from('granola_meetings').select('id,title,meeting_date,summary').gte('meeting_date', since).or(ws.map(w => `title.ilike.%${w}%`).join(',')).order('meeting_date', { ascending: false }).limit(8)
    out.meetings = gm || []
  }
  if (item.event?.notes) out.meetings = [item.event.notes, ...out.meetings.filter(m => m.id !== item.event.notes.id)]
  try { out.loadout = await fetchLoadout() } catch { out.loadout = null }
  return out
}

export default function ItemDetail({ item, onClose, onNavigate, onChange, initialTab = 'overview' }) {
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : 'overview')
  const [rel, setRel] = useState(null)
  const [msg, setMsg] = useState(null)
  const [openNote, setOpenNote] = useState(null)
  const [boardId, setBoardId] = useState(null)
  const load = useCallback(() => loadRelated(item).then(setRel).catch(e => { console.warn('item detail', e.message); setRel({ project: null, task: null, artifacts: [], boards: [], projectFiles: [], storeFiles: [], meetings: [], loadout: null }) }), [item])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const task = rel?.task
  const taskId = item.task_id || task?.id || null
  const linkedArtifacts = (rel?.artifacts || []).filter(a => a.decision || (taskId && a.task_id === taskId))
  const otherArtifacts = (rel?.artifacts || []).filter(a => !a.decision && !(taskId && a.task_id === taskId))
  const linkedBoards = (rel?.boards || []).filter(b => b.linked)
  const otherBoards = (rel?.boards || []).filter(b => !b.linked)
  const loaded = rel?.loadout?.items.find(i => i.id === (item.objective_id || item.id)) || null
  const what = { item: item.kind === 'Event' ? 'meeting' : item.kind === 'Main Mission' ? 'task' : item.kind === 'Session' ? 'session' : 'mission' }

  const act = async (fn, after) => { try { await fn(); setMsg(after); await load(); onChange && onChange() } catch (e) { setMsg(`Could not do that: ${e.message}`) } }
  const open = async (bucket, path) => { const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener') }
  const go = (segs) => { onClose(); onNavigate && onNavigate('main-missions', segs) }
  const attachArtifact = async (slug) => { if (!rel?.project || !taskId) return; const doc = await readArtifact(rel.project.id, slug); await writeArtifact(rel.project.id, slug, { ...doc, task_id: taskId }); setMsg(`Attached ${doc.title || slug}`); load() }
  const attachBoard = async (b) => { if (!taskId) return; await supabase.from('project_tasks').update({ session_ref: b.id }).eq('id', taskId); setMsg(`Attached ${b.title}`); load() }
  const startTimer = () => act(async () => {
    if (loaded) return equip(loaded.id)
    if (item.objective_id) { const r = await equipObjective(item.objective_id); if (!r.ok) throw new Error(r.reasons.join('; ')) ; return }
    if (task) { const r = await equipTask(task, rel?.project?.name); if (!r.ok) throw new Error(r.reasons.join('; ')); return }
    throw new Error('nothing to load')
  }, 'Timer on')

  const counts = { artifacts: linkedArtifacts.length, sessions: linkedBoards.length, files: (rel?.projectFiles.length || 0) + (rel?.storeFiles.filter(f => !f.folder).length || 0), notes: rel?.meetings.length || 0 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 240, overflowY: 'auto', background: 'linear-gradient(180deg, #0F2A40 0%, #0A1B2B 100%)' }}>
      <div style={{ ...S.page, maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={onClose} style={btn(INK2)}><ArrowLeft size={13} /> Back</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {item.kind !== 'Event' && item.kind !== 'Session' && (loaded
              ? (loaded.equipped
                ? <button onClick={() => act(() => holster(loaded.id), 'Timer off')} style={btn(GREEN, true)}><Pause size={12} /> Timer on · {fmtClock(loaded.minutes_today)}</button>
                : <button onClick={() => act(() => equip(loaded.id), 'Timer on')} style={btn(GREEN)}><Play size={12} /> Timer off · {fmtClock(loaded.minutes_today)}</button>)
              : <button onClick={startTimer} style={btn(GREEN)}><Play size={12} /> Load and start timer</button>)}
            {loaded && <button onClick={() => act(() => stash(loaded.id), 'Stashed')} style={btn(INK2)}><Archive size={12} /> Stash</button>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 22 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ ...S.h1, marginBottom: 6 }}>{item.title}</h1>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.6px', textTransform: 'uppercase', color: KIND_COLOR[item.kind] || INK2 }}>
              {item.kind}{rel?.project ? ` · ${rel.project.name}` : item.project ? ` · ${item.project}` : ''}{item.size ? ` · ${SIZES[item.size]?.label || item.size}` : ''}{item.event ? ` · ${chiTime(item.event.start_at)} to ${chiTime(item.event.end_at)}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 4, flexWrap: 'wrap' }}>
            {TABS.map(t => <Pill key={t} active={tab === t} onClick={() => setTab(t)} count={counts[t]}>{TAB_LABEL[t]}</Pill>)}
          </div>
        </div>

        <div style={{ ...S.panel, marginTop: 20 }}>
          {!rel && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading the Ledger</div>}

          {rel && tab === 'overview' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {(item.description || task?.notes) && <div><Label>Back story</Label><div style={{ fontSize: 13.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{item.description || task.notes}</div></div>}
              {item.event && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <div><Label>When</Label><div style={{ fontSize: 13, color: INK }}>{chiTime(item.event.start_at)} to {chiTime(item.event.end_at)} CT</div></div>
                  <div><Label>Organizer</Label><div style={{ fontSize: 13, color: INK }}>{item.event.organizer || 'unknown'}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><Label>Attendees</Label><div style={{ fontSize: 13, color: INK2, lineHeight: 1.6 }}>{(item.event.attendees || []).map(a => a?.name || a?.email || a).filter(Boolean).join(', ') || 'none listed'}</div></div>
                </div>
              )}
              {rel.project && (
                <div>
                  <Label>Mission</Label>
                  <button onClick={() => go([rel.project.id])} style={btn(GOLD)}><MapIcon size={12} /> {rel.project.name}</button>
                </div>
              )}
              {task && (
                <div>
                  <Label>Task</Label>
                  <div style={{ fontSize: 13, color: INK }}>{task.text}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY, textTransform: 'uppercase', marginTop: 4 }}>{task.status}{task.due_date ? ` · due ${task.due_date}` : ''}</div>
                </div>
              )}
              {loaded && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                  <div><Label>Clock today</Label><div style={{ fontFamily: SERIF, fontSize: 22, color: loaded.equipped ? GREEN : INK }}>{fmtClock(loaded.minutes_today)}</div></div>
                  <div><Label>Size</Label><div style={{ fontFamily: SERIF, fontSize: 22, color: INK }}>{SIZES[loaded.size]?.label} · {loaded.hours}h</div></div>
                  <div><Label>State</Label><div style={{ fontFamily: SERIF, fontSize: 22, color: INK }}>{loaded.equipped ? 'Equipped' : 'Holstered'}</div></div>
                </div>
              )}
              {!item.description && !task?.notes && !rel.project && !item.event && !loaded && <div style={{ fontSize: 13, color: GRAY }}>No back story on this one yet.</div>}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>
                <span>{counts.artifacts} artifact{counts.artifacts === 1 ? '' : 's'}</span><span>{counts.sessions} session{counts.sessions === 1 ? '' : 's'}</span><span>{counts.files} file{counts.files === 1 ? '' : 's'}</span><span>{counts.notes} note{counts.notes === 1 ? '' : 's'}</span>
              </div>
            </div>
          )}

          {rel && tab === 'artifacts' && (
            <div>
              {linkedArtifacts.map(a => (
                <div key={a.slug} style={rowStyle}>
                  <FileText size={14} color={GOLD_BRIGHT} /><span style={{ flex: 1, fontSize: 13.5, color: INK }}>{a.title}{a.decision ? <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GOLD, marginLeft: 8, textTransform: 'uppercase' }}>decision</span> : null}</span>
                  <button onClick={() => go([a.project_id || rel.project.id, 'artifacts', a.slug])} style={btn(GOLD, true)}>Open</button>
                </div>
              ))}
              {!linkedArtifacts.length && <None what={{ ...what, thing: 'an artifact' }} />}
              {otherArtifacts.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <Label>On the mission, not attached to this {what.item}</Label>
                  {otherArtifacts.map(a => (
                    <div key={a.slug} style={rowStyle}>
                      <FileText size={14} color={GRAY} /><span style={{ flex: 1, fontSize: 13, color: INK2 }}>{a.title}</span>
                      <button onClick={() => go([rel.project.id, 'artifacts', a.slug])} style={btn(INK2)}>Open</button>
                      {taskId && <button onClick={() => attachArtifact(a.slug)} style={btn(GOLD)}>Attach</button>}
                    </div>
                  ))}
                </div>
              )}
              {!rel.project && !linkedArtifacts.length && <div style={{ fontSize: 12, color: GRAY }}>Artifacts live on a mission. Ask Lumen to work a decision on this and it shows here, or promote it to a Main Mission task for the mission's artifacts.</div>}
            </div>
          )}

          {rel && tab === 'sessions' && (() => {
            const boards = [...linkedBoards, ...otherBoards]
            const shown = boards.find(b => b.id === boardId) || linkedBoards[0] || boards[0] || null
            return (
              <div>
                {!shown && <None what={{ ...what, thing: 'a session' }} />}
                {!shown && !rel.project && <div style={{ fontSize: 12, color: GRAY }}>Sessions attach through a mission. Promote this to a Main Mission task and Claude's boards on that mission show here.</div>}
                {shown && (
                  <>
                    {boards.length > 1 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                        {boards.map(b => <button key={b.id} onClick={() => setBoardId(b.id)} style={btn(b.linked ? BLUE : INK2, shown.id === b.id)}>{b.title} · {b.done}/{b.total}</button>)}
                      </div>
                    )}
                    {!shown.linked && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14, fontSize: 12.5, color: GRAY }}>
                        <span>This {what.item} doesn't call for a session of its own. Showing Claude's latest board on the mission.</span>
                        {taskId && <button onClick={() => attachBoard(shown)} style={btn(BLUE)}>Attach to this {what.item}</button>}
                      </div>
                    )}
                    <SessionBoard key={shown.id} board={shown} onChange={() => onChange && onChange()} />
                  </>
                )}
              </div>
            )
          })()}

          {rel && tab === 'files' && (
            <div>
              {rel.projectFiles.map(f => (
                <div key={f.path} style={rowStyle}><ExternalLink size={14} color={BLUE} /><span style={{ flex: 1, fontSize: 13, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span><button onClick={() => open(f.bucket, f.path)} style={btn(INK2)}>Open</button></div>
              ))}
              {rel.storeFiles.length > 0 && <Label style={{ marginTop: 12 }}>Lumen's file store · {rel.project?.name}</Label>}
              {rel.storeFiles.map(f => (
                <div key={f.path} style={rowStyle}>{f.folder ? <FolderOpen size={14} color={GRAY} /> : <ExternalLink size={14} color={BLUE} />}<span style={{ flex: 1, fontSize: 13, color: f.folder ? INK2 : INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}{f.folder ? '/' : ''}</span>{!f.folder && <button onClick={() => open(f.bucket, f.path)} style={btn(INK2)}>Open</button>}</div>
              ))}
              {!rel.projectFiles.length && !rel.storeFiles.length && <None what={{ ...what, thing: 'files' }} />}
              {rel.project && <div style={{ marginTop: 12 }}><button onClick={() => go([rel.project.id, 'files'])} style={btn(INK2)}><FolderOpen size={12} /> All mission files</button></div>}
            </div>
          )}

          {rel && tab === 'notes' && (
            <div>
              {rel.meetings.map(m => (
                <div key={m.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setOpenNote(openNote === m.id ? null : m.id)}>
                    <Mic size={14} color={INK2} /><span style={{ flex: 1, fontSize: 13.5, color: INK }}>{m.title}</span><span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{m.meeting_date}</span>
                  </div>
                  {openNote === m.id && <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.65, color: INK2 }}>{m.summary ? renderMarkdown(m.summary) : <span style={{ color: GRAY }}>No summary stored.</span>}</div>}
                </div>
              ))}
              {!rel.meetings.length && <None what={{ ...what, thing: 'notes' }} />}
            </div>
          )}

          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, marginTop: 14 }}>{msg}</div>}
        </div>
      </div>
    </div>
  )
}
