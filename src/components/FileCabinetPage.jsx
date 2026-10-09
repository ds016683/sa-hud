// The File Cabinet: a dedicated page for David's documents in the files
// bucket, with a personal structure (Personal, Third Horizon, and Lumen's
// inbox) he and Lumen amend together: browse, open, upload, new folder, move,
// rename, remove, search. Lumen has the same hands (list_folder, move_file,
// make_folder, delete_file) so "file the Porsche documents under Personal /
// Vehicles" works from WhatsApp.
import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, Folder, FileText, Upload, FolderPlus, ArrowRight, Pencil, Trash2, Search, ChevronRight, Inbox, Sparkles, ExternalLink } from 'lucide-react'
import { list, openUrl, upload, makeFolder, move, remove, walk, seedStructure, REALMS, fmtSize } from '../lib/cabinet'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, RED, PURPLE, MONO, SERIF, S, Panel, Label } from './river/canon'

const btn = (color = INK2, filled = false, extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra })
const field = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
const fmtWhen = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const realmColor = (path) => path.startsWith('Personal') ? GOLD : path.startsWith('Third Horizon') ? PURPLE : path.startsWith('inbox') ? BLUE : INK2

export default function FileCabinetPage() {
  const [path, setPath] = useState(() => { try { return localStorage.getItem('cabinet-path') || '' } catch { return '' } })
  const [root, setRoot] = useState({ folders: [], files: [] })
  const [cur, setCur] = useState(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const go = (p) => { setPath(p); setHits(null); try { localStorage.setItem('cabinet-path', p) } catch { /* no-op */ } }
  const refresh = useCallback(async () => {
    try { const [r, c] = await Promise.all([list(''), list(path)]); setRoot(r); setCur(c) } catch (e) { setMsg(`Could not read: ${e.message}`) }
  }, [path])
  useEffect(() => { Promise.resolve().then(refresh) }, [refresh])
  const act = async (fn, after) => { setBusy(true); try { await fn(); if (after) setMsg(after); await refresh() } catch (e) { setMsg(`Could not do that: ${e.message}`) } finally { setBusy(false) } }
  const open = async (p) => { try { window.open(await openUrl(p), '_blank', 'noopener') } catch (e) { setMsg(`Could not open: ${e.message}`) } }
  const newFolder = () => { const name = window.prompt('New folder name', ''); if (!name?.trim()) return; act(() => makeFolder(`${path ? path + '/' : ''}${name.trim()}`), `Folder ${name.trim()} made`) }
  const rename = (f) => { const name = window.prompt('New name', f.name); if (!name?.trim() || name.trim() === f.name) return; act(() => move(f.path, `${path ? path + '/' : ''}${name.trim()}`), `Renamed to ${name.trim()}`) }
  const moveTo = (f) => { const to = window.prompt('Move to folder (e.g. Personal/Vehicles)', path); if (to === null) return; act(() => move(f.path, `${to.trim().replace(/\/+$/, '')}/${f.name}`), `Moved ${f.name} to ${to.trim() || 'the root'}`) }
  const del = (f) => { if (!window.confirm(`Remove ${f.name}? This cannot be undone.`)) return; act(() => remove(f.path), `Removed ${f.name}`) }
  const onUpload = (e) => { const files = [...(e.target.files || [])]; e.target.value = ''; if (!files.length) return; act(async () => { for (const f of files) await upload(path, f) }, `${files.length} file${files.length === 1 ? '' : 's'} filed in ${path || 'the root'}`) }
  const search = async () => { const t = q.trim().toLowerCase(); if (!t) { setHits(null); return } setBusy(true); try { const all = await walk('', 5); setHits(all.filter(f => f.path.toLowerCase().includes(t))) } catch (e) { setMsg(`Search failed: ${e.message}`) } finally { setBusy(false) } }
  const crumbs = path ? path.split('/') : []
  const seeded = root.folders.some(f => REALMS.includes(f.name))

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={S.h1}><FolderOpen size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />File Cabinet</h1>
        <div style={S.sub}>personal · third horizon · inbox · Lumen files here too</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 12 }} className="cab-grid">
        <style>{`@media (max-width: 900px) { .cab-grid { grid-template-columns: 1fr !important } }`}</style>
        <Panel heading="Drawers" style={{ marginBottom: 0, alignSelf: 'start' }}>
          {!seeded && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6 }}>No structure yet. Seed the two realms with their starter folders; rename or add as you go.</div><button onClick={() => act(seedStructure, 'Structure seeded')} disabled={busy} style={{ ...btn(GOLD, true), marginTop: 8 }}><Sparkles size={11} /> Seed the structure</button></div>}
          <button onClick={() => go('')} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 4px', background: 'transparent', border: 'none', color: path === '' ? GOLD_BRIGHT : INK, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}><Folder size={13} /> Everything</button>
          {root.folders.map(f => (
            <button key={f.path} onClick={() => go(f.path)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 4px', background: 'transparent', border: 'none', color: path === f.path || path.startsWith(f.path + '/') ? GOLD_BRIGHT : INK, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
              {f.name === 'inbox' ? <Inbox size={13} color={BLUE} /> : <Folder size={13} color={realmColor(f.path)} />}{f.name}
            </button>
          ))}
        </Panel>
        <Panel style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={() => go('')} style={{ ...btn(INK2), padding: '4px 8px' }}>Everything</button>
            {crumbs.map((c, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ChevronRight size={12} color={GRAY} /><button onClick={() => go(crumbs.slice(0, i + 1).join('/'))} style={{ ...btn(i === crumbs.length - 1 ? GOLD : INK2, i === crumbs.length - 1), padding: '4px 8px' }}>{c}</button></span>)}
            <span style={{ flex: 1 }} />
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search() }} placeholder="search every drawer" style={{ ...field, width: 200, padding: '5px 9px', fontSize: 12 }} />
            <button onClick={search} disabled={busy} style={btn(INK2)}><Search size={11} /></button>
            <button onClick={newFolder} disabled={busy} style={btn(INK2)}><FolderPlus size={11} /> Folder</button>
            <label style={{ ...btn(BLUE, true), cursor: busy ? 'wait' : 'pointer' }}><Upload size={11} /> Upload<input type="file" multiple style={{ display: 'none' }} onChange={onUpload} /></label>
          </div>
          {hits && (
            <div style={{ marginBottom: 14 }}>
              <Label>{hits.length} match{hits.length === 1 ? '' : 'es'} for “{q}”</Label>
              {hits.map(f => <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: `1px solid ${PANEL_BORDER}` }}><FileText size={13} color={realmColor(f.path)} /><button onClick={() => go(f.path.split('/').slice(0, -1).join('/'))} style={{ background: 'transparent', border: 'none', color: INK, cursor: 'pointer', textAlign: 'left', fontSize: 13, flex: 1, padding: 0 }}>{f.path}</button><button onClick={() => open(f.path)} style={btn(INK2)}><ExternalLink size={10} /> Open</button></div>)}
              <button onClick={() => setHits(null)} style={{ ...btn(INK2), marginTop: 8 }}>Clear search</button>
            </div>
          )}
          {!cur && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY }}>Opening the drawer</div>}
          {cur && cur.folders.length === 0 && cur.files.length === 0 && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>Empty drawer. Upload something, make a folder, or ask Lumen to file here.</div>}
          {cur && cur.folders.map(f => (
            <div key={f.path} onClick={() => go(f.path)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${PANEL_BORDER}`, cursor: 'pointer' }}>
              <Folder size={14} color={realmColor(f.path)} /><span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 15, color: INK, flex: 1 }}>{f.name}</span><ChevronRight size={12} color={GRAY} />
            </div>
          ))}
          {cur && cur.files.map(f => (
            <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${PANEL_BORDER}`, flexWrap: 'wrap' }}>
              <FileText size={14} color={realmColor(f.path)} />
              <button onClick={() => open(f.path)} style={{ background: 'transparent', border: 'none', color: INK, cursor: 'pointer', textAlign: 'left', fontSize: 13.5, flex: 1, minWidth: 220, padding: 0 }}>{f.name}</button>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: GRAY }}>{fmtSize(f.size)}{f.updated_at ? ` · ${fmtWhen(f.updated_at)}` : ''}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => moveTo(f)} title="Move to another folder" style={btn(INK2)}><ArrowRight size={10} /> Move</button>
                <button onClick={() => rename(f)} title="Rename" style={{ ...btn(INK2), padding: '5px 7px' }}><Pencil size={10} /></button>
                <button onClick={() => del(f)} title="Remove" style={{ ...btn(RED), padding: '5px 7px' }}><Trash2 size={10} /></button>
              </div>
            </div>
          ))}
          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') || msg.startsWith('Search failed') ? RED : GOLD_BRIGHT, textTransform: 'uppercase', marginTop: 12 }}>{msg}</div>}
          <div style={{ fontSize: 11.5, color: GRAY, marginTop: 14, lineHeight: 1.6 }}>Lumen's intake lands in <span style={{ fontFamily: MONO }}>inbox/&lt;day&gt;</span>. Tell him where a thing belongs ("file the Porsche documents under Personal / Vehicles") and he moves it; he can make, rename, and move folders, and never removes anything without your word.</div>
        </Panel>
      </div>
      <div style={S.source}>SOURCES · storage bucket files</div>
    </div>
  )
}
