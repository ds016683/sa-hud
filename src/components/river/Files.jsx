// Files (David, 10/23): the one place an item's files live. Workbench, Production
// and Artifacts folded together: what is in play on top (drop zone, one current
// version each, older versions tucked), the artifacts Lumen or a session wrote,
// then what sits on the mission and in the file store. A working file and an
// evidence file are the same file at different moments: pinning one to Polaris
// is the only thing that moves it onto the Briefing.
import { useCallback, useEffect, useState } from 'react'
import { FileText, ExternalLink, Mail, Check, Star, FolderOpen } from 'lucide-react'
import { listLiveFiles, putLiveFile, requestLiveFile, openLiveFile, draftMail, markFiled, groupVersions, fmtStamp, fmtSize, isRequest, urlOf, isLink, addLiveLink, pinEvidence } from '../../lib/livefiles'
import { DropZone, LinkForm } from './LiveFiles'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, Label, PURPLE, alpha } from './canon'
import { hudConfirm } from '../../lib/dialog'
const btn = (color = INK2, filled = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${alpha(color, 40)}`}`, background: filled ? color : 'transparent', color: filled ? 'var(--hud-on-accent)' : color, cursor: 'pointer', flexShrink: 0 })
const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}` }
const isSessionLink = (r) => isLink(r) && /^claude:\/\//.test(String(r.path || ''))

export default function FilesTab({ objectiveId, rel, what, open, onRead, onGo, onAttach, taskId, onChanged }) {
  const [rows, setRows] = useState(null)
  const [filed, setFiled] = useState([])
  const [msg, setMsg] = useState(null)
  const [olderOpen, setOlderOpen] = useState({})
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (!objectiveId) { setRows([]); setFiled([]); return }
    const [live, all] = await Promise.all([listLiveFiles({ objectiveId }), listLiveFiles({ objectiveId }, { includeFiled: true })])
    setRows(live.rows.filter(r => !isSessionLink(r)))
    setFiled(all.rows.filter(r => r.filed_at && !isSessionLink(r)))
  }, [objectiveId])
  useEffect(() => { load().catch(e => { console.warn('files', e.message); setRows([]) }) }, [load])
  const act = async (fn, ok) => { setBusy(true); try { await fn(); setMsg(ok); await load(); onChanged && onChanged() } catch (e) { setMsg(`Could not: ${e.message}`) } finally { setBusy(false) } }
  const pin = (r) => act(() => pinEvidence(r.id, !r.evidence), r.evidence ? `Unpinned ${r.name}` : `Pinned as evidence: ${r.name}`)
  const livePaths = new Set((rows || []).map(r => r.path).concat(filed.map(r => r.path)))
  const loose = (rel?.objFiles || []).filter(f => !livePaths.has(f.path))
  const linkedArtifacts = [...(rel?.objArtifacts || []).map(a => ({ ...a, obj: true })), ...(rel?.artifacts || []).filter(a => a.decision || (taskId && a.task_id === taskId))]
  const otherArtifacts = (rel?.artifacts || []).filter(a => !a.decision && !(taskId && a.task_id === taskId))

  const FileRow = ({ r, dim = false }) => isLink(r) ? (
    <div style={{ ...rowStyle, border: `1px solid ${alpha(PURPLE, 40)}`, borderRadius: 10, padding: '10px 12px', margin: '6px 0', background: 'rgba(180,163,232,0.07)' }}>
      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', textTransform: 'uppercase', color: PURPLE }}>app</span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{r.name}</span>{r.note && <span style={{ display: 'block', fontSize: 12.5, color: INK2, marginTop: 2 }}>{r.note}</span>}<span style={{ display: 'block', fontFamily: MONO, fontSize: 9.5, color: GRAY, marginTop: 3 }}>{r.path}</span></span>
      <button onClick={() => pin(r)} title={r.evidence ? 'Pinned as evidence under Polaris' : 'Pin as evidence under Polaris'} style={btn(r.evidence ? GOLD_BRIGHT : INK2, !!r.evidence)}><Star size={11} fill={r.evidence ? 'var(--hud-on-accent)' : 'none'} /></button>
      <button onClick={() => window.open(r.path, '_blank', 'noopener')} style={btn(PURPLE, true)}><ExternalLink size={11} /> Launch</button>
      <button onClick={async () => { if (await hudConfirm(`Done with ${r.name}? The link leaves the Board.`)) act(() => markFiled(r.id), `Out of play: ${r.name}`) }} style={btn(INK2)}><Check size={11} /> Done</button>
    </div>
  ) : (
    <div style={{ ...rowStyle, opacity: dim ? 0.6 : 1, paddingLeft: dim ? 24 : 0 }}>
      <FileText size={14} color={isRequest(r) ? GOLD : r.evidence ? GOLD_BRIGHT : dim ? GRAY : BLUE} />
      <span title={r.path} style={{ flex: 1, fontSize: dim ? 12.5 : 13.5, color: dim ? INK2 : INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.version > 1 && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GOLD, marginLeft: 8 }}>v{r.version}</span>}{r.evidence && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD_BRIGHT, marginLeft: 8 }}>evidence</span>}{r.note && <span style={{ fontSize: 12, color: INK2, marginLeft: 10 }}>{r.note}</span>}</span>
      {isRequest(r) && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD }}>waiting for a session on the Mac</span>}
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, whiteSpace: 'nowrap' }}>{fmtStamp(r.created_at)}{r.size ? ` · ${fmtSize(r.size)}` : ''}</span>
      {!dim && !isRequest(r) && <button onClick={() => pin(r)} title={r.evidence ? 'Pinned as evidence under Polaris. Click to unpin.' : 'Pin as evidence under Polaris'} style={btn(r.evidence ? GOLD_BRIGHT : INK2, !!r.evidence)}><Star size={11} fill={r.evidence ? 'var(--hud-on-accent)' : 'none'} /></button>}
      {urlOf(r) && <button onClick={() => window.open(urlOf(r), '_blank', 'noopener')} title={urlOf(r)} style={btn(GREEN)}><ExternalLink size={11} /> Visit</button>}
      {!isRequest(r) && <button onClick={() => act(async () => { window.open(await openLiveFile(r), '_blank', 'noopener') }, `Opened ${r.name}`)} style={btn(BLUE)}><ExternalLink size={11} /> {String(r.name).toLowerCase().endsWith('.html') ? 'Source' : 'Open'}</button>}
      {!isRequest(r) && !dim && <button onClick={() => act(async () => { const d = await draftMail(r); if (d.webLink) window.open(d.webLink, '_blank', 'noopener') }, `Draft open in Outlook: ${r.name}`)} title="Open a new Outlook draft with this file attached" style={btn(GOLD)}><Mail size={11} /> Mail</button>}
      {!dim && !r.filed_at && <button onClick={async () => { if (await hudConfirm(`Done with ${r.name}? It leaves the Board and stays here under Filed.`)) act(() => markFiled(r.id), `Out of play: ${r.name}`) }} title="Done: out of play" style={btn(GREEN)}><Check size={11} /> Done</button>}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {objectiveId && (
        <div>
          <Label>In Play</Label>
          <div style={{ fontSize: 13, color: INK2, marginBottom: 12, lineHeight: 1.5 }}>The files on this {what.item} right now, one current version each. Sessions and Lumen put files here as they produce them; drop one in, or point at a path on the Mac. The star pins a file under Polaris as the evidence the objective was met.</div>
          <div style={{ marginBottom: 14 }}>
            <DropZone busy={busy} onFiles={(fs) => fs.forEach(f => act(() => putLiveFile(f, { objectiveId }), `In play: ${f.name}`))} onPath={(pth) => act(() => requestLiveFile(pth, { objectiveId }), 'Requested; the next Claude session on the Mac puts it in play')} />
            <LinkForm onAdd={(u, t, n) => act(() => addLiveLink(u, { title: t, note: n, objectiveId }), 'Launch link added')} />
          </div>
          {rows === null && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading the Ledger</div>}
          {rows && !rows.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>Nothing in play on this {what.item} yet.</div>}
          {groupVersions(rows || [], { timeKey: 'created_at', rootKey: 'path' }).map(fam => (
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
      )}

      {(linkedArtifacts.length > 0 || otherArtifacts.length > 0) && (
        <div>
          <Label>Artifacts</Label>
          {linkedArtifacts.map(a => (
            <div key={a.slug} style={rowStyle}>
              <FileText size={14} color={GOLD_BRIGHT} /><span style={{ flex: 1, fontSize: 13.5, color: INK }}>{a.title}{a.decision ? <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GOLD, marginLeft: 8, textTransform: 'uppercase' }}>decision</span> : null}</span>
              {a.obj ? <button onClick={() => onRead(a)} style={btn(GOLD, true)}>Read</button> : <button onClick={() => onGo([a.project_id || rel.project.id, 'artifacts', a.slug])} style={btn(GOLD, true)}>Open</button>}
            </div>
          ))}
          {otherArtifacts.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, marginBottom: 2 }}>On the mission, not attached to this {what.item}</div>
              {otherArtifacts.map(a => (
                <div key={a.slug} style={rowStyle}>
                  <FileText size={14} color={GRAY} /><span style={{ flex: 1, fontSize: 13, color: INK2 }}>{a.title}</span>
                  <button onClick={() => onGo([rel.project.id, 'artifacts', a.slug])} style={btn(INK2)}>Open</button>
                  {taskId && onAttach && <button onClick={() => onAttach(a.slug)} style={btn(GOLD)}>Attach</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(filed.length > 0 || loose.length > 0 || (rel?.projectFiles || []).length > 0 || (rel?.storeFiles || []).length > 0) && (
        <div>
          <Label>Filed</Label>
          {groupVersions(filed, { timeKey: 'created_at', rootKey: 'path' }).map(fam => <FileRow key={fam.key} r={fam.current} dim />)}
          {loose.map(f => (
            <div key={f.path} style={{ ...rowStyle, opacity: 0.75 }}><FileText size={14} color={GRAY} /><span style={{ flex: 1, fontSize: 13, color: INK2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span><span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{fmtStamp(f.updated_at)}</span><button onClick={() => open(f.bucket, f.path)} style={btn(INK2)}>Open</button></div>
          ))}
          {(rel?.projectFiles || []).length > 0 && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, margin: '10px 0 2px' }}>On the mission · {rel.project?.name}</div>}
          {(rel?.projectFiles || []).map(f => (
            <div key={f.path} style={rowStyle}><ExternalLink size={14} color={BLUE} /><span style={{ flex: 1, fontSize: 13, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span><button onClick={() => open(f.bucket, f.path)} style={btn(INK2)}>Open</button></div>
          ))}
          {(rel?.storeFiles || []).length > 0 && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, margin: '10px 0 2px' }}>Lumen's file store · {rel.project?.name}</div>}
          {(rel?.storeFiles || []).map(f => (
            <div key={f.path} style={rowStyle}>{f.folder ? <FolderOpen size={14} color={GRAY} /> : <ExternalLink size={14} color={BLUE} />}<span style={{ flex: 1, fontSize: 13, color: f.folder ? INK2 : INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}{f.folder ? '/' : ''}</span>{!f.folder && <button onClick={() => open(f.bucket, f.path)} style={btn(INK2)}>Open</button>}</div>
          ))}
          {rel?.project && <div style={{ marginTop: 12 }}><button onClick={() => onGo([rel.project.id, 'files'])} style={btn(INK2)}><FolderOpen size={12} /> All mission files</button></div>}
        </div>
      )}
      {!objectiveId && !(rel?.projectFiles || []).length && !(rel?.storeFiles || []).length && !linkedArtifacts.length && <div style={{ fontSize: 13, color: GRAY, padding: '14px 0' }}>This {what.item} doesn't carry files. Load it on the Board and they can be put in play on it.</div>}
      {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD }}>{msg}</div>}
    </div>
  )
}
