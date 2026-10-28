// Workbench (David, 10/18): the fifth pill on a Main Mission. Everything live
// that is being developed or parsed through on this mission: the files in play
// tied to the mission itself and to its milestones' board items, one current
// version each, the drop-or-path container on top. It gets more canonical as
// we go; for now it is the mission's Live Files, nothing more.
import { useCallback, useEffect, useState } from 'react'
import { FileText, ExternalLink, Mail, Check, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listLiveFiles, putLiveFile, requestLiveFile, openLiveFile, draftMail, markFiled, groupVersions, fmtStamp, fmtSize, isRequest, urlOf, isLink, addLiveLink, pinEvidence } from '../../lib/livefiles'
import { DropZone, LinkForm } from './LiveFiles'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, BLUE, GREEN, RED, MONO, Label, KIND_COLOR, PURPLE, alpha, GOLD_BRIGHT } from './canon'
import { hudConfirm } from '../../lib/dialog'
const btn = (color = INK2, filled = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${alpha(color, 40)}`}`, background: filled ? color : 'transparent', color: filled ? 'var(--hud-on-accent)' : color, cursor: 'pointer' })
const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}`, minWidth: 0 }
// Session reopen links (claude://, left by focus.py) belong to the Briefing's Sessions strip, never to the Workbench (David 10/26: "the page went a bit crazy").
const isSessionLink = (r) => isLink(r) && /^claude:\/\//.test(String(r.path || ''))

// The intake (drop a file, point at a path, add a launch link) lives on the Files
// pill (David 10/26); what comes in lands in play, on the Workbench's foot.
export function WorkbenchIntake({ project = null, objectiveId = null, onDone }) {
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const act = async (fn, ok) => { setBusy(true); try { await fn(); setMsg(ok); onDone && onDone() } catch (e) { setMsg(`Could not: ${e.message}`) } finally { setBusy(false) } }
  const owner = objectiveId ? { objectiveId } : { projectId: project.id }
  return (
    <div>
      <div style={{ fontSize: 13, color: INK2, marginBottom: 12, lineHeight: 1.5 }}>Bring a file in: drop one, point at a path on the Mac, or add a launch link. It lands in play on the Workbench until you mark it Done, then it files here.</div>
      <DropZone busy={busy} onFiles={(fs) => fs.forEach(f => act(() => putLiveFile(f, owner), `In play on the Workbench: ${f.name}`))} onPath={(pth) => act(() => requestLiveFile(pth, owner), 'Requested; the next Claude session on the Mac puts it in play')} />
      <LinkForm onAdd={(u, t, n) => act(() => addLiveLink(u, { title: t, note: n, ...owner }), 'Launch link added to the Workbench')} />
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD, marginTop: 8 }}>{msg}</div>}
    </div>
  )
}

export default function WorkbenchTab({ project = null, objectiveId = null, intake = true }) {
  const [rows, setRows] = useState(null)
  const [msg, setMsg] = useState(null)
  const [olderOpen, setOlderOpen] = useState({})
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (objectiveId) { const r = await listLiveFiles({ objectiveId }); setRows(r.rows.filter(r => !isSessionLink(r))); return }
    const mine = await listLiveFiles({ projectId: project.id })
    const { data: tasks } = await supabase.from('project_tasks').select('id,text,objective_id,status').eq('project_id', project.id)
    const oids = (tasks || []).map(t => t.objective_id).filter(Boolean)
    const onItems = oids.length ? await Promise.all(oids.map(oid => listLiveFiles({ objectiveId: oid }))) : []
    const all = [...mine.rows, ...onItems.flatMap(r => r.rows)].filter(r => !isSessionLink(r))
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
  const FileRow = ({ r, dim = false }) => isLink(r) ? (
    <div style={{ ...rowStyle, border: `1px solid ${alpha(PURPLE, 40)}`, borderRadius: 10, padding: '10px 12px', margin: '6px 0', background: 'rgba(180,163,232,0.07)' }}>
      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', textTransform: 'uppercase', color: PURPLE }}>app</span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{r.name}</span>{r.note && <span style={{ display: 'block', fontSize: 12.5, color: INK2, marginTop: 2 }}>{r.note}</span>}<span style={{ display: 'block', fontFamily: MONO, fontSize: 9.5, color: GRAY, marginTop: 3 }}>{r.path}</span></span>
      <button onClick={() => window.open(r.path, '_blank', 'noopener')} style={{ ...btn(PURPLE, true) }}><ExternalLink size={11} /> Launch</button>
      <button onClick={async () => { if (await hudConfirm(`Done with ${r.name}? The link leaves the Workbench.`)) act(() => markFiled(r.id), `Out of play: ${r.name}`) }} style={btn(INK2)}><Check size={11} /> Done</button>
    </div>
  ) : (
    <div style={{ ...rowStyle, opacity: dim ? 0.6 : 1, paddingLeft: dim ? 24 : 0 }}>
      <FileText size={14} color={isRequest(r) ? GOLD : dim ? GRAY : BLUE} />
      <span title={r.path} style={{ flex: 1, fontSize: dim ? 12.5 : 13.5, color: dim ? INK2 : INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.version > 1 && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GOLD, marginLeft: 8 }}>v{r.version}</span>}{r.note && <span style={{ fontSize: 12, color: INK2, marginLeft: 10 }}>{r.note}</span>}</span>
      {isRequest(r) && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD }}>waiting for a session on the Mac</span>}
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, whiteSpace: 'nowrap' }}>{fmtStamp(r.created_at)}{r.size ? ` · ${fmtSize(r.size)}` : ''}</span>
      {!dim && !isRequest(r) && <button onClick={() => act(() => pinEvidence(r.id, !r.evidence), r.evidence ? `Unpinned ${r.name}` : `Pinned to Polaris: ${r.name}`)} title={r.evidence ? 'Pinned to Polaris as evidence. Click to unpin.' : 'Pin to Polaris as evidence'} style={btn(r.evidence ? GOLD_BRIGHT : INK2, !!r.evidence)}><Star size={11} fill={r.evidence ? '#0A1B2B' : 'none'} /></button>}
      {urlOf(r) && <button onClick={() => window.open(urlOf(r), '_blank', 'noopener')} title={urlOf(r)} style={btn(GREEN)}><ExternalLink size={11} /> Visit</button>}
      {!isRequest(r) && <button onClick={() => act(async () => { window.open(await openLiveFile(r), '_blank', 'noopener') }, `Opened ${r.name}`)} style={btn(BLUE)}><ExternalLink size={11} /> {String(r.name).toLowerCase().endsWith('.html') ? 'Source' : 'Open'}</button>}
      {!isRequest(r) && <button onClick={() => act(async () => { const d = await draftMail(r); if (d.webLink) window.open(d.webLink, '_blank', 'noopener') }, `Draft open in Outlook: ${r.name}`)} title="Open a new Outlook draft with this file attached" style={btn(GOLD)}><Mail size={11} /> Mail</button>}
      {!dim && <button onClick={async () => { if (await hudConfirm(`Done with ${r.name}? It leaves the Workbench.`)) act(() => markFiled(r.id), `Out of play: ${r.name}`) }} title="Done: out of play" style={btn(GREEN)}><Check size={11} /> Done</button>}
    </div>
  )
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, color: INK2, marginBottom: 12, lineHeight: 1.5 }}>{objectiveId ? 'The files in play on this item, one current version each. Sessions and Lumen put files here as they produce them; bring one in under Files.' : 'The files in play on this mission and its milestones, one current version each. Sessions and Lumen put files here as they produce them; bring one in under Files.'}</div>
      {intake && <div style={{ marginBottom: 14 }}>
        <DropZone busy={busy} onFiles={(fs) => fs.forEach(f => act(() => putLiveFile(f, objectiveId ? { objectiveId } : { projectId: project.id }), `In play: ${f.name}`))} onPath={(pth) => act(() => requestLiveFile(pth, objectiveId ? { objectiveId } : { projectId: project.id }), 'Requested; the next Claude session on the Mac puts it in play')} />
        <LinkForm onAdd={(u, t, n) => act(() => addLiveLink(u, objectiveId ? { title: t, note: n, objectiveId } : { title: t, note: n, projectId: project.id }), 'Launch link added')} />
      </div>}
      {rows === null && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading the Ledger</div>}
      {rows && !rows.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>Nothing in play {objectiveId ? 'on this item' : 'on this mission'} yet.</div>}
      {groups.map(g => (
        <div key={g.key} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            {g.item
              ? <><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: KIND_COLOR[g.item.kind] || INK2 }}>Milestone</span><span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{g.item.title}</span>{g.item.state === 'active' && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GREEN }}>on the board</span>}{g.item.stashed && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>in the stash</span>}</>
              : <span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{objectiveId ? 'In play' : 'On the mission'}</span>}
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
