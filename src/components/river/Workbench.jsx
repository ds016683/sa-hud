// Workbench (David, 10/18): the fifth pill on a Main Mission. Everything live
// that is being developed or parsed through on this mission: the files in play
// tied to the mission itself and to its milestones' board items, one current
// version each, the drop-or-path container on top. It gets more canonical as
// we go; for now it is the mission's Live Files, nothing more.
import { useCallback, useEffect, useState } from 'react'
import { FileText, ExternalLink, Mail, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listLiveFiles, putLiveFile, requestLiveFile, openLiveFile, draftMail, markFiled, groupVersions, fmtStamp, fmtSize, isRequest } from '../../lib/livefiles'
import { DropZone } from './LiveFiles'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, BLUE, GREEN, RED, MONO, Label, KIND_COLOR } from './canon'

const btn = (color = INK2, filled = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? '#0A1B2B' : color, cursor: 'pointer' })
const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}` }

export default function WorkbenchTab({ project = null, objectiveId = null }) {
  const [rows, setRows] = useState(null)
  const [msg, setMsg] = useState(null)
  const [olderOpen, setOlderOpen] = useState({})
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (objectiveId) { const r = await listLiveFiles({ objectiveId }); setRows(r.rows); return }
    const mine = await listLiveFiles({ projectId: project.id })
    const { data: tasks } = await supabase.from('project_tasks').select('id,text,objective_id,status').eq('project_id', project.id)
    const oids = (tasks || []).map(t => t.objective_id).filter(Boolean)
    const onItems = oids.length ? await Promise.all(oids.map(oid => listLiveFiles({ objectiveId: oid }))) : []
    const all = [...mine.rows, ...onItems.flatMap(r => r.rows)]
    setRows(all)
  }, [project, objectiveId])
  useEffect(() => { load().catch(e => { console.warn('workbench', e.message); setRows([]) }) }, [load])
  const act = async (fn, ok) => { setBusy(true); try { await fn(); setMsg(ok); await load() } catch (e) { setMsg(`Could not: ${e.message}`) } finally { setBusy(false) } }
  const groups = []
  for (const r of rows || []) {
    const key = objectiveId ? 'item' : r.item ? `item:${r.item.title}` : 'mission'
    let g = groups.find(x => x.key === key); if (!g) { g = { key, item: r.item, rows: [] }; groups.push(g) }
    g.rows.push(r)
  }
  groups.sort((a, b) => (a.key === 'mission' ? -1 : b.key === 'mission' ? 1 : 0))
  const FileRow = ({ r, dim = false }) => (
    <div style={{ ...rowStyle, opacity: dim ? 0.6 : 1, paddingLeft: dim ? 24 : 0 }}>
      <FileText size={14} color={isRequest(r) ? GOLD : dim ? GRAY : BLUE} />
      <span title={r.path} style={{ flex: 1, fontSize: dim ? 12.5 : 13.5, color: dim ? INK2 : INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.version > 1 && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GOLD, marginLeft: 8 }}>v{r.version}</span>}{r.note && <span style={{ fontSize: 12, color: INK2, marginLeft: 10 }}>{r.note}</span>}</span>
      {isRequest(r) && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD }}>waiting for a session on the Mac</span>}
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, whiteSpace: 'nowrap' }}>{fmtStamp(r.created_at)}{r.size ? ` · ${fmtSize(r.size)}` : ''}</span>
      {!isRequest(r) && <button onClick={() => act(async () => { window.open(await openLiveFile(r), '_blank', 'noopener') }, `Opened ${r.name}`)} style={btn(BLUE)}><ExternalLink size={11} /> Open</button>}
      {!isRequest(r) && <button onClick={() => act(async () => { const d = await draftMail(r); if (d.webLink) window.open(d.webLink, '_blank', 'noopener') }, `Draft open in Outlook: ${r.name}`)} title="Open a new Outlook draft with this file attached" style={btn(GOLD)}><Mail size={11} /> Mail</button>}
      {!dim && <button onClick={() => { if (window.confirm(`Done with ${r.name}? It leaves the Workbench.`)) act(() => markFiled(r.id), `Out of play: ${r.name}`) }} title="Done: out of play" style={btn(GREEN)}><Check size={11} /> Done</button>}
    </div>
  )
  return (
    <div>
      <Label>Workbench</Label>
      <div style={{ fontSize: 13, color: INK2, marginBottom: 12, lineHeight: 1.5 }}>{objectiveId ? 'What is live on this item: the files in play, one current version each. Sessions and Lumen put files here as they produce them; drop one in, or point at a path on the Mac.' : 'What is live on this mission: files in play on the mission itself and on its milestones. Sessions and Lumen put files here as they produce them; drop one in, or point at a path on the Mac.'}</div>
      <div style={{ marginBottom: 14 }}>
        <DropZone busy={busy} onFiles={(fs) => fs.forEach(f => act(() => putLiveFile(f, objectiveId ? { objectiveId } : { projectId: project.id }), `In play: ${f.name}`))} onPath={(pth) => act(() => requestLiveFile(pth, objectiveId ? { objectiveId } : { projectId: project.id }), 'Requested; the next Claude session on the Mac puts it in play')} />
      </div>
      {rows === null && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading the Ledger</div>}
      {rows && !rows.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>Nothing in play {objectiveId ? 'on this item' : 'on this mission'} yet.</div>}
      {groups.map(g => (
        <div key={g.key} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            {g.item
              ? <><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: KIND_COLOR[g.item.kind] || INK2 }}>Milestone</span><span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{g.item.title}</span>{g.item.state === 'active' && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GREEN }}>on the board</span>}{g.item.stashed && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>in the stash</span>}</>
              : <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{objectiveId ? 'In play' : 'On the mission'}</span>}
          </div>
          {groupVersions(g.rows, { timeKey: 'created_at', rootKey: 'path' }).map(fam => (
            <div key={fam.key}>
              <FileRow r={fam.current} />
              {fam.older.length > 0 && (
                <div style={{ paddingLeft: 24 }}>
                  <button onClick={() => setOlderOpen(o => ({ ...o, [fam.key]: !o[fam.key] }))} style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 0 6px' }}>{olderOpen[fam.key] ? 'Hide' : 'Show'} {fam.older.length} older version{fam.older.length === 1 ? '' : 's'}</button>
                  {olderOpen[fam.key] && fam.older.map(r => <FileRow key={r.id} r={r} dim />)}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD, marginTop: 12 }}>{msg}</div>}
    </div>
  )
}
