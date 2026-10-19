// Live Files (David, 10/16): the window on the Board for the files in play.
// Newest first, each tied to a Loadout or Stash item (or to nothing yet). Drop
// a file on the window to put it in play; tie it to an item from the select;
// Open reads it; Done takes it out of view (the filing system comes later).
import { useEffect, useRef, useState, useCallback } from 'react'
import { Paperclip, X as XIcon, ExternalLink, Check, Trash2, Upload, Mail } from 'lucide-react'
import { listLiveFiles, putLiveFile, linkLiveFile, openLiveFile, markFiled, removeLiveFile, noteLiveFile, draftMail, groupVersions, fmtStamp, fmtSize, extOf, requestLiveFile, isRequest, urlOf } from '../../lib/livefiles'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, BLUE, GREEN, RED, MONO, SERIF, Label, KIND_COLOR, LABEL } from './canon'

const EXT_COLOR = { xlsx: GREEN, xls: GREEN, csv: GREEN, pptx: GOLD, ppt: GOLD, key: GOLD, docx: BLUE, doc: BLUE, pdf: RED, md: INK2, txt: INK2, html: BLUE, png: INK2, jpg: INK2, jpeg: INK2 }
const sbtn = (color = INK2) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 7, border: `1px solid ${color}66`, background: 'transparent', color, cursor: 'pointer' })

// The container (David, 10/17): big enough to drop on, with the two ways in.
// Drop or choose a file (goes up now), or type a path on the Mac (a session
// picks it up). `children` is the tie-to select when the host has one.
export function DropZone({ onFiles, onPath, children, busy = false }) {
  const [drag, setDrag] = useState(false)
  const [path, setPath] = useState('')
  const ref = useRef(null)
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files?.length) onFiles([...e.dataTransfer.files]) }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, padding: '18px 18px', minHeight: 96, border: `1px dashed ${drag ? BLUE : `${BLUE}66`}`, borderRadius: 12, background: drag ? 'rgba(169,201,232,0.10)' : 'rgba(169,201,232,0.03)', transition: 'all .15s' }}>
      <div onClick={() => ref.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <Upload size={22} color={BLUE} />
        <div>
          <div style={{ fontSize: 14, color: INK }}>Drop a file here, or click to choose one</div>
          <div style={{ fontSize: 12, color: INK2, marginTop: 2 }}>It goes up now and lands in play{children ? ', tied to the item picked' : ''}.</div>
        </div>
        <input ref={ref} type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) onFiles([...e.target.files]); e.target.value = '' }} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 12, color: INK2 }}>Or a path on this Mac; the next Claude session puts it in play.</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={path} onChange={e => setPath(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && path.trim()) { onPath(path.trim()); setPath('') } }} placeholder="~/Desktop/…/file.pdf" style={{ flex: 1, minWidth: 180, background: '#0A1B2B', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '7px 10px', fontSize: 12.5, fontFamily: MONO }} />
          <button disabled={busy || !path.trim()} onClick={() => { onPath(path.trim()); setPath('') }} style={{ ...sbtn(BLUE), opacity: path.trim() ? 1 : 0.5 }}>Request</button>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ClipButton({ count, onClick, color = BLUE, title = 'Live Files on this item' }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'transparent', border: `1px solid ${count ? `${color}66` : PANEL_BORDER}`, borderRadius: 7, padding: '3px 7px', color: count ? color : GRAY, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px' }}>
      <Paperclip size={11} />{count ? count : ''}
    </button>
  )
}


export default function LiveFilesModal({ onClose, filter = null, items = [], onChanged }) {
  const [rows, setRows] = useState(null)
  const [missing, setMissing] = useState(false)
  const [msg, setMsg] = useState(null)
  const [scope, setScope] = useState(filter?.objectiveId ? 'item' : 'all')
  const [dropTarget, setDropTarget] = useState(filter?.objectiveId || '')
  const [olderOpen, setOlderOpen] = useState({})
  const load = useCallback(() => listLiveFiles(scope === 'item' && filter?.objectiveId ? { objectiveId: filter.objectiveId } : {}).then(r => { setRows(r.rows); setMissing(r.missing) }), [scope, filter])
  useEffect(() => { load() }, [load])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const act = async (fn, ok) => { try { await fn(); setMsg(ok); await load(); onChanged && onChanged() } catch (e) { setMsg(`Could not: ${e.message}`) } }
  const put = async (files) => {
    for (const f of files) await act(() => putLiveFile(f, { objectiveId: dropTarget || null }), `In play: ${f.name}`)
  }
  const itemLabel = (it) => `${it.kind === 'Main Mission' ? `${it.project || 'Main Mission'}: ` : ''}${(it.task_text || it.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '')}`
  const groups = []
  for (const r of rows || []) {
    const key = r.item ? `${r.item.kind}:${r.item.title}` : 'loose'
    let g = groups.find(x => x.key === key); if (!g) { g = { key, item: r.item, rows: [] }; groups.push(g) }
    g.rows.push(r)
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 285, background: 'rgba(5,16,28,0.8)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(860px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: '#0F2338', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Label style={{ marginBottom: 2 }}>Live Files</Label>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, color: '#fff' }}>
              {scope === 'item' && filter?.title ? filter.title : 'Everything in play'}
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GRAY, marginLeft: 10 }}>{rows ? `${rows.length} file${rows.length === 1 ? '' : 's'}` : ''}</span>
            </div>
          </div>
          {filter?.objectiveId && (
            <div style={{ display: 'inline-flex', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
              {[['item', 'This item'], ['all', 'All']].map(([k, l]) => <button key={k} onClick={() => setScope(k)} style={{ ...sbtn(scope === k ? BLUE : GRAY), border: 'none', borderRadius: 0, background: scope === k ? 'rgba(169,201,232,0.12)' : 'transparent' }}>{l}</button>)}
            </div>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer' }}><XIcon size={16} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <DropZone onFiles={put} onPath={(pth) => act(() => requestLiveFile(pth, { objectiveId: dropTarget || null }), 'Requested; the next session on the Mac puts it in play')}>
            <select value={dropTarget} onChange={e => setDropTarget(e.target.value)} style={{ background: '#0A1B2B', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 7, padding: '6px 8px', fontSize: 12, maxWidth: 260 }}>
              <option value="">Tied to nothing yet</option>
              {items.map(it => <option key={it.id} value={it.id}>{itemLabel(it)}{it.stashed ? ' (Stash)' : ''}</option>)}
            </select>
          </DropZone>
        </div>
        {missing && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GOLD, textTransform: 'uppercase', marginBottom: 10 }}>The live_files table is not in the Ledger yet. Run sql/2026-10-16-live-files.sql.</div>}
        {rows && !rows.length && !missing && <div style={{ fontSize: 13, color: GRAY, padding: '8px 0 16px' }}>Nothing in play{scope === 'item' ? ' on this item' : ''}. Files a session or Lumen puts in play land here; drop one in above.</div>}

        <div style={{ display: 'grid', gap: 14 }}>
          {groups.map(g => (
            <div key={g.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {g.item
                  ? <>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: KIND_COLOR[g.item.kind] || INK2 }}>{g.item.kind}{g.item.kind === 'Main Mission' && g.item.project && g.item.id ? ` · ${g.item.project}` : ''}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{g.item.title}</span>
                    {g.item.stashed && <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL }}>in the stash</span>}
                    {g.item.state === 'active' && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GREEN }}>on the board</span>}
                  </>
                  : <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: LABEL }}>Tied to nothing yet</span>}
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {groupVersions(g.rows, { timeKey: 'created_at', rootKey: 'path' }).map(fam => [fam.current, ...(olderOpen[fam.key] ? fam.older : [])].map((r, idx) => { const isOld = idx > 0
                  const ext = extOf(r.name); const c = EXT_COLOR[ext] || INK2
                  return (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 10px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', textTransform: 'uppercase', color: isRequest(r) ? GOLD : c, border: `1px solid ${isRequest(r) ? GOLD : c}55`, borderRadius: 6, padding: '3px 0', textAlign: 'center' }}>{isRequest(r) ? 'path' : (ext || 'file')}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span onClick={() => { if (!isRequest(r)) act(async () => { window.open(await openLiveFile(r), '_blank', 'noopener') }, `Opened ${r.name}`) }} style={{ fontSize: 13.5, color: INK, cursor: isRequest(r) ? 'default' : 'pointer', wordBreak: 'break-word' }}>{r.name}</span>
                          {r.version > 1 && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GOLD }}>v{r.version}</span>}
                          {isRequest(r) && <span title={r.path} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD, border: `1px solid ${GOLD}55`, borderRadius: 999, padding: '1px 7px' }}>waiting for a session on the Mac</span>}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: GRAY, marginTop: 2 }}>
                          {fmtStamp(r.created_at)}{r.size ? ` · ${fmtSize(r.size)}` : ''} · {r.source === 'session' ? `Claude${r.session ? ` · ${r.session}` : ''}` : r.source === 'lumen' ? 'Lumen' : 'David'}{isOld ? ' · older version' : ''}
                        </div>
                        <div onClick={() => { const n = window.prompt('Note on this file', r.note || ''); if (n !== null) act(() => noteLiveFile(r.id, n.trim() || null), 'Note saved') }} style={{ fontSize: 12, color: r.note ? INK2 : GRAY, marginTop: 3, cursor: 'text', fontStyle: r.note ? 'normal' : 'italic' }}>{r.note || 'add a note'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <select value={r.objective_id || ''} onChange={e => act(() => linkLiveFile(r, { objectiveId: e.target.value || null }), e.target.value ? 'Tied to the item' : 'Untied')} title="Tie to a Loadout or Stash item" style={{ background: '#0A1B2B', color: INK2, border: `1px solid ${PANEL_BORDER}`, borderRadius: 7, padding: '3px 6px', fontSize: 11, maxWidth: 170 }}>
                          <option value="">Tie to…</option>
                          {items.map(it => <option key={it.id} value={it.id}>{itemLabel(it)}</option>)}
                          {r.objective_id && !items.some(it => it.id === r.objective_id) && <option value={r.objective_id}>{r.item?.title || 'current item'}</option>}
                        </select>
                        {urlOf(r) && <button onClick={() => window.open(urlOf(r), '_blank', 'noopener')} title={urlOf(r)} style={sbtn(GREEN)}><ExternalLink size={10} /> Visit</button>}
                        {!isRequest(r) && <button onClick={() => act(async () => { window.open(await openLiveFile(r), '_blank', 'noopener') }, `Opened ${r.name}`)} title={extOf(r.name) === 'html' ? 'The stored file (source); HTML shows as text here' : 'Open the stored file'} style={sbtn(BLUE)}><ExternalLink size={10} /> {extOf(r.name) === 'html' ? 'Source' : 'Open'}</button>}}
                        {!isRequest(r) && <button onClick={() => act(async () => { setMsg(`Drafting in Outlook: ${r.name}`); const d = await draftMail(r); if (d.webLink) window.open(d.webLink, '_blank', 'noopener') }, `Draft open in Outlook: ${r.name}`)} title="Open a new Outlook draft with this file attached" style={sbtn(GOLD)}><Mail size={10} /> Mail</button>}
                        <button onClick={() => { if (window.confirm(`Done with ${r.name}? It leaves Live Files (the bytes stay in storage until the filing system moves them).`)) act(() => markFiled(r.id), `Out of play: ${r.name}`) }} title="Done: out of Live Files" style={sbtn(GREEN)}><Check size={10} /> Done</button>
                        <button onClick={() => { if (window.confirm(`Delete ${r.name} from storage? This cannot be undone.`)) act(() => removeLiveFile(r), `Deleted ${r.name}`) }} title="Delete the file" style={{ background: 'transparent', border: 'none', color: 'rgba(234,241,248,0.25)', cursor: 'pointer', padding: 3 }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  )
                }).concat(fam.older.length ? [<div key={`${fam.key}-more`} style={{ paddingLeft: 10 }}><button onClick={() => setOlderOpen(o => ({ ...o, [fam.key]: !o[fam.key] }))} style={{ background: 'transparent', border: 'none', color: LABEL, cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '0 0 4px' }}>{olderOpen[fam.key] ? 'Hide' : 'Show'} {fam.older.length} older version{fam.older.length === 1 ? '' : 's'}</button></div>] : []))}
              </div>
            </div>
          ))}
        </div>
        {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD, marginTop: 12 }}>{msg}</div>}
        <div style={{ fontSize: 11.5, color: GRAY, marginTop: 14, lineHeight: 1.5 }}>Sessions put files in play with <span style={{ fontFamily: MONO }}>livefile.py put</span>; Lumen's write_file and file_attachment land here too. A path typed above waits until a Claude session on the Mac runs; it then goes up and the row turns into the file. A file tied to an item also shows under its Mission Briefing, Files. The final filing system comes later; Done just takes a file out of view.</div>
      </div>
    </div>
  )
}
