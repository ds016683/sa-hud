// Related: everything a loaded item connects to, one click from the Board.
// The mission it belongs to, the artifacts on that mission, the mission's
// files, Lumen's file store folder for it, and recent meeting notes that
// match its title. Every line is a door.
import { useEffect, useState } from 'react'
import { FileText, FolderOpen, Map as MapIcon, Mic, ExternalLink, ListChecks, X as XIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listArtifacts } from '../../lib/artifacts'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, MONO, SERIF, S, Eyebrow, Label } from './canon'

const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', margin: '0 -10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: INK }
const hover = (e, on) => { e.currentTarget.style.background = on ? 'rgba(255,255,255,0.05)' : 'transparent' }
const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'about', 'notes', 'upload', 'interview', 'call', 'meeting', 'review', 'investigate'])
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))

async function signed(bucket, path) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600)
  return data?.signedUrl || null
}

export default function RelatedDrawer({ item, onClose, onNavigate }) {
  const [rel, setRel] = useState(null)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const out = { project: null, task: null, artifacts: [], projectFiles: [], storeFiles: [], meetings: [], sessions: [] }
      // The mission and the linked task
      const { data: links } = await supabase.from('project_tasks').select('id,text,notes,status,due_date,project_id').eq('objective_id', item.id).limit(1)
      const task = links && links[0]
      const pid = item.project_id || task?.project_id || null
      if (task) out.task = task
      if (pid) {
        const { data: p } = await supabase.from('projects').select('id,name,key,description').eq('id', pid).single()
        out.project = p || null
        try { out.artifacts = await listArtifacts(pid) } catch { out.artifacts = [] }
        const { data: pf } = await supabase.storage.from('project-files').list(pid, { limit: 100 })
        out.projectFiles = (pf || []).filter(f => f.id !== null).map(f => ({ name: f.name, path: `${pid}/${f.name}` }))
        // Claude session boards for this mission (the Work Board), newest first
        if (p?.key || p?.name) {
          const { data: sb } = await supabase.from('session_boards').select('id,project,title,updated_at,phases').or(`project.eq.${p.key || p.name},project.eq.${p.name}`).order('updated_at', { ascending: false }).limit(6)
          out.sessions = (sb || []).map(b => { const tasks = (b.phases || []).flatMap(ph => ph.tasks || []); return { id: b.id, project: b.project, title: b.title, updated_at: b.updated_at, done: tasks.filter(t => t.status === 'done').length, total: tasks.length } })
        }
        // Lumen's file store: a folder named like the mission, if the signed-in user can see it
        if (p?.name) {
          const { data: sf } = await supabase.storage.from('files').list(p.name, { limit: 100 })
          out.storeFiles = (sf || []).map(f => ({ name: f.name, folder: f.id === null, path: `${p.name}/${f.name}` }))
        }
      }
      // Meeting notes whose title shares words with the item (or the mission)
      const ws = [...new Set([...words(item.title), ...words(out.project?.name)])].slice(0, 6)
      if (ws.length) {
        const since = new Date(Date.now() - 45 * 86400e3).toISOString().slice(0, 10)
        const { data: gm } = await supabase.from('granola_meetings').select('id,title,meeting_date').gte('meeting_date', since).or(ws.map(w => `title.ilike.%${w}%`).join(',')).order('meeting_date', { ascending: false }).limit(8)
        out.meetings = gm || []
      }
      if (alive) setRel(out)
    })().catch(() => alive && setRel({ project: null, task: null, artifacts: [], projectFiles: [], storeFiles: [], meetings: [], sessions: [] }))
    return () => { alive = false }
  }, [item])

  const go = (segs) => { onClose(); onNavigate && onNavigate('main-missions', segs) }
  const goBoard = (projectKey) => { onClose(); onNavigate && onNavigate('session-boards', [projectKey]) }
  const open = async (bucket, path) => { const u = await signed(bucket, path); if (u) window.open(u, '_blank', 'noopener') }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8,20,32,0.6)', display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px, 92vw)', height: '100%', overflowY: 'auto', background: '#10273B', borderLeft: `1px solid ${PANEL_BORDER}`, padding: '24px 26px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Related</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{item.title}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={S.chip('transparent', item.kind === 'Main Mission' ? GOLD_BRIGHT : GREEN)}>{item.kind}</span>
              {item.project && <span style={S.chip(`${BLUE}22`, BLUE)}>{item.project}</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
        </div>

        {(item.description || rel?.task?.notes) && (
          <div style={{ marginTop: 18 }}>
            <Label>Back story</Label>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, whiteSpace: 'pre-wrap' }}>{item.description || rel.task.notes}</div>
          </div>
        )}

        {!rel && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, marginTop: 18 }}>Finding what this connects to</div>}

        {rel?.project && (
          <div style={{ marginTop: 18 }}>
            <Label>Mission</Label>
            <div style={row} onClick={() => go([rel.project.id])} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
              <MapIcon size={13} color={GOLD} /> <span style={{ flex: 1 }}>{rel.project.name}</span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY }}>TASKS</span>
            </div>
          </div>
        )}

        {rel && rel.artifacts.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Label>Artifacts</Label>
            {rel.artifacts.map(a => (
              <div key={a.slug} style={row} onClick={() => go([rel.project.id, 'artifacts', a.slug])} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
                <FileText size={13} color={GOLD_BRIGHT} /> <span style={{ flex: 1 }}>{a.slug.replace(/-/g, ' ')}</span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY }}>OPEN</span>
              </div>
            ))}
          </div>
        )}

        {rel && rel.sessions.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Label>Sessions · Claude's boards on this mission</Label>
            {rel.sessions.map(b => (
              <div key={b.id} style={row} onClick={() => goBoard(b.project)} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
                <ListChecks size={13} color={BLUE} /> <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: GRAY }}>{b.done}/{b.total} · {String(b.updated_at).slice(5, 10)}</span>
              </div>
            ))}
          </div>
        )}

        {rel && rel.projectFiles.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Label>Mission files</Label>
            {rel.projectFiles.map(f => (
              <div key={f.path} style={row} onClick={() => open('project-files', f.path)} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
                <ExternalLink size={13} color={BLUE} /> <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              </div>
            ))}
            <div style={row} onClick={() => go([rel.project.id, 'files'])} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
              <FolderOpen size={13} color={INK2} /> <span style={{ flex: 1, color: INK2 }}>All mission files</span>
            </div>
          </div>
        )}

        {rel && rel.storeFiles.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Label>Lumen's file store · {rel.project?.name}</Label>
            {rel.storeFiles.map(f => (
              <div key={f.path} style={{ ...row, cursor: f.folder ? 'default' : 'pointer' }} onClick={() => !f.folder && open('files', f.path)} onMouseEnter={e => !f.folder && hover(e, true)} onMouseLeave={e => hover(e, false)}>
                {f.folder ? <FolderOpen size={13} color={GRAY} /> : <ExternalLink size={13} color={BLUE} />}
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: f.folder ? INK2 : INK }}>{f.name}{f.folder ? '/' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {rel && rel.meetings.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Label>Meeting notes</Label>
            {rel.meetings.map(m => (
              <div key={m.id} style={{ ...row, cursor: 'default' }}>
                <Mic size={13} color={INK2} /> <span style={{ flex: 1 }}>{m.title}</span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: GRAY }}>{m.meeting_date}</span>
              </div>
            ))}
          </div>
        )}

        {rel && rel.project && rel.artifacts.length === 0 && rel.sessions.length === 0 && (
          <div style={{ fontSize: 12.5, color: GRAY, marginTop: 18 }}>This task doesn't call for an artifact or a session yet. When Lumen drafts one or Claude opens a board on {rel.project.name}, it shows here.</div>
        )}
        {rel && !rel.project && rel.artifacts.length === 0 && rel.meetings.length === 0 && (
          <div style={{ fontSize: 12.5, color: GRAY, marginTop: 18 }}>This Side Mission doesn't call for an artifact or a session. Documents attach through a mission; promote it to a Main Mission task and the mission's artifacts, sessions, and files show here.</div>
        )}
      </div>
    </div>
  )
}
