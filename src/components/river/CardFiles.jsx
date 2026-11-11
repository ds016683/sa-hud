// The Files pill on a card (David 11/10): "a list of actual files. only the ones i've
// authorized be brought in. discreet attachment modal. if nothing, a decent sized icon
// indicating no files for this card at this time. otherwise, the files should be visible
// and i should be able to preview them, filter, sort, etc. even have folders if needed."
//
// One list. A row is a file (or a launch link) attached to this card: by David through
// Add, or by Lumen or a session at his word. Nothing else rides here: no intake box, no
// In Play and Filed sections, no mission files, no file store, no session links.
//
// 11/10, second pass ("not sure i'm tracking the 'on the board.' didn't come from lumen.
// have 'source' so it can say email and date. i should be able to click it and a quick
// synopsis of the document and come up in an overlay"): the Source column says where the
// file came from (an email and its date, you, Lumen, a Claude session); nothing here says
// On The Board; a click opens an overlay that leads with a quick synopsis of the document,
// with the document itself and every action one button away.
// Folders are an index beside the card's files (lib/livefiles readFileIndex), no schema.
// Canon: labels in the body face, Title Case, nothing in small tracked capitals.
import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, FileSpreadsheet, FileImage, Link2, Folder, FolderOpen, FolderPlus, Paperclip, Star, X as XIcon, ExternalLink, Download, Mail, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Search, Hourglass, Presentation, Eye, EyeOff } from 'lucide-react'
import { listLiveFiles, putLiveFile, requestLiveFile, addLiveLink, openLiveFile, downloadLiveFile, draftMail, pinEvidence, removeLiveRow, readFileIndex, writeFileIndex, fileSynopsis, sourceOf, isRequest, isLink, fmtSize, extOf } from '../../lib/livefiles'
import { pdfUrl } from '../../lib/cabinet'
import { LEDGER_EVENT } from '../../lib/lumenPanel'
import { hudConfirm, hudPrompt } from '../../lib/dialog'
import { renderMarkdown } from './MeetingCloseout'
import { INK, INK2, GRAY, MUTED, LABEL, BLUE, GOLD, RED, NAVY_DEEP, PANEL_BORDER, PANEL_BG, SERIF, alpha } from './canon'

// The pill's hands on the Ledger, in one object so dev/files.html can swap in sample data.
const LEDGER = { listLiveFiles, readFileIndex, writeFileIndex, putLiveFile, requestLiveFile, addLiveLink, openLiveFile, downloadLiveFile, draftMail, pinEvidence, removeLiveRow, fileSynopsis, pdfUrl }

const isSessionLink = (r) => isLink(r) && /^claude:\/\//.test(String(r.path || ''))
const IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
const TEXT = ['txt', 'md', 'csv', 'json', 'log', 'tsv', 'yml', 'yaml']
const OFFICE = ['docx', 'doc', 'xlsx', 'xls', 'pptx']
const kindOf = (r) => isLink(r) ? 'Link' : isRequest(r) ? 'Waiting' : IMG.includes(extOf(r.name)) ? 'Image' : ['xlsx', 'xls', 'csv', 'tsv'].includes(extOf(r.name)) ? 'Sheet' : ['pptx', 'key'].includes(extOf(r.name)) ? 'Deck' : extOf(r.name) === 'pdf' ? 'PDF' : ['docx', 'doc', 'md', 'txt'].includes(extOf(r.name)) ? 'Document' : extOf(r.name) === 'html' ? 'Page' : 'File'
// The glyph for a row, chosen by kind.
function FileGlyph({ row, size = 17, color = LABEL, style }) {
  const p = { size, color, style }
  if (isLink(row)) return <Link2 {...p} />
  if (isRequest(row)) return <Hourglass {...p} />
  const k = kindOf(row)
  if (k === 'Image') return <FileImage {...p} />
  if (k === 'Sheet') return <FileSpreadsheet {...p} />
  if (k === 'Deck') return <Presentation {...p} />
  return <FileText {...p} />
}
// What the model at the door can read (api/live-files synopsis); anything else opens on the document itself.
const READABLE = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'docx', 'xlsx', 'xls', 'csv', 'tsv', 'pptx', 'txt', 'md', 'html', 'htm', 'json', 'log', 'yml', 'yaml']
const canSynopsize = (r) => !isLink(r) && !isRequest(r) && READABLE.includes(extOf(r.name))
const day = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }) : ''
const stamp = (iso) => iso ? new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

// One button shape for the pill: body face, Title Case, ink outline; the accent when on; gold for the one primary action.
const btn = (kind = 'plain') => ({
  display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, lineHeight: 1.2, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
  border: `1px solid ${kind === 'primary' ? GOLD : kind === 'on' ? BLUE : alpha(INK2, 55)}`, background: kind === 'primary' ? GOLD : kind === 'on' ? BLUE : 'transparent', color: kind === 'primary' || kind === 'on' ? NAVY_DEEP : INK2,
})
const field = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 9, color: INK, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit' }
const fieldLabel = { display: 'block', fontSize: 13.5, fontWeight: 600, color: LABEL, marginBottom: 6 }
const veil = { position: 'fixed', inset: 0, zIndex: 260, background: 'rgba(5,16,28,0.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }
const sheet = (w) => ({ width: `min(${w}px, 100%)`, maxHeight: '92vh', overflowY: 'auto', background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '22px 24px' })
const modalTitle = { fontFamily: SERIF, fontWeight: 500, fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1.25, color: INK }

// ---- the discreet attachment modal -------------------------------------------------------
function AddModal({ api, owner, folders, onClose, onAdded }) {
  const [mode, setMode] = useState('file')
  const [picked, setPicked] = useState([])
  const [path, setPath] = useState('')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [folder, setFolder] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const input = useRef(null)
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const ready = mode === 'file' ? picked.length > 0 : mode === 'path' ? path.trim().length > 1 : /^https?:\/\//.test(url.trim())
  const go = async () => {
    if (!ready || busy) return
    setBusy(true); setErr(null)
    try {
      const made = []
      if (mode === 'file') for (const f of picked) made.push(await api.putLiveFile(f, owner))
      else if (mode === 'path') made.push(await api.requestLiveFile(path, { ...owner, note: note.trim() || null }))
      else made.push(await api.addLiveLink(url, { ...owner, title: title.trim() || null, note: note.trim() || null }))
      onAdded(made.filter(Boolean), folder || null)
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <div style={veil} onClick={onClose}>
      <div style={sheet(520)} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ ...modalTitle, flex: 1 }}>Add To This Card</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: INK2, cursor: 'pointer', padding: 2 }}><XIcon size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0 18px' }}>
          {[['file', 'A File'], ['path', 'From This Mac'], ['link', 'A Link']].map(([k, l]) => <button key={k} onClick={() => { setMode(k); setErr(null) }} style={btn(mode === k ? 'on' : 'plain')}>{l}</button>)}
        </div>
        {mode === 'file' && (
          <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); setPicked(Array.from(e.dataTransfer.files || [])) }} onClick={() => input.current?.click()}
            style={{ border: `1px dashed ${drag ? BLUE : alpha(INK2, 55)}`, borderRadius: 12, padding: '26px 16px', textAlign: 'center', cursor: 'pointer', background: drag ? alpha(BLUE, 8) : 'transparent' }}>
            <input ref={input} type="file" multiple hidden onChange={e => setPicked(Array.from(e.target.files || []))} />
            <Paperclip size={22} color={LABEL} style={{ display: 'block', margin: '0 auto' }} />
            <div style={{ fontSize: 14.5, color: INK, marginTop: 8 }}>{picked.length ? picked.map(f => f.name).join(', ') : 'Drop a file here, or click to choose one'}</div>
            {picked.length > 0 && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{picked.length === 1 ? fmtSize(picked[0].size) : `${picked.length} files`}</div>}
          </div>
        )}
        {mode === 'path' && (
          <div>
            <label style={fieldLabel}>Path On This Mac</label>
            <input autoFocus value={path} onChange={e => setPath(e.target.value)} placeholder="~/Documents/.../file.pdf" style={field} />
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>The browser cannot read your disk. The next Claude session on this Mac brings the file in; until then it shows as waiting.</div>
          </div>
        )}
        {mode === 'link' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div><label style={fieldLabel}>Web Address</label><input autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" style={field} /></div>
            <div><label style={fieldLabel}>Name</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="What it is" style={field} /></div>
          </div>
        )}
        {mode !== 'file' && <div style={{ marginTop: 12 }}><label style={fieldLabel}>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional, one line" style={field} /></div>}
        {folders.length > 0 && (
          <div style={{ marginTop: 12 }}><label style={fieldLabel}>Folder</label>
            <select value={folder} onChange={e => setFolder(e.target.value)} style={field}><option value="" style={{ color: '#0F2334' }}>No Folder</option>{folders.map(f => <option key={f} value={f} style={{ color: '#0F2334' }}>{f}</option>)}</select>
          </div>
        )}
        {err && <div style={{ fontSize: 13, color: RED, marginTop: 12 }}>Could not add it: {err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btn()}>Cancel</button>
          <button onClick={go} disabled={!ready || busy} style={{ ...btn('primary'), opacity: ready && !busy ? 1 : 0.5 }}>{busy ? 'Adding' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}

// ---- the overlay: a quick synopsis first, the document and every action behind it ------------
const SANS_FACE = /calibri|aptos|arial|helvetica|segoe|tahoma|verdana|gill|century gothic|trebuchet|franklin|avenir/i
const SERIF_FACE = /cambria|times|georgia|garamond|palatino|book antiqua|baskerville|constantia/i
const faceStack = (name) => SERIF_FACE.test(name) ? `${name}, Caladea, Georgia, 'Times New Roman', serif` : SANS_FACE.test(name) ? `${name}, Carlito, 'Helvetica Neue', Arial, sans-serif` : name

// A Word file as its pages (David 11/10: "yes, render the actual page in the overlay"). The file
// is drawn in the browser by docx-preview: the letterhead, the logo, the header and footer, the
// tables and the styles, on white pages that scroll inside the overlay and shrink to fit its width.
// The library is loaded only when a Word file is shown.
function WordPages({ blob, box }) {
  const host = useRef(null)
  const [state, setState] = useState({ phase: 'loading' })
  useEffect(() => {
    let on = true
    const el = host.current
    const fit = () => {
      const wrap = el?.querySelector('.hud-docx-wrapper'), page = wrap?.querySelector('section')
      if (!wrap || !page) return
      wrap.style.zoom = 1
      const room = el.clientWidth - 32
      wrap.style.zoom = Math.min(1, room / page.offsetWidth)
    }
    const draw = async () => {
      const { renderAsync } = await import('docx-preview')
      if (!on || !el) return
      el.innerHTML = ''
      await renderAsync(blob, el, null, { className: 'hud-docx', inWrapper: true, breakPages: true, renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true, useBase64URL: true })
      if (!on) return
      const wrap = el.querySelector('.hud-docx-wrapper')
      if (wrap) { wrap.style.background = 'transparent'; wrap.style.padding = '16px 0 0' }
      // Office's own faces are not on every machine (Calibri ships inside Word, not in the browser), and a
      // missing one falls to Times. Each face gets a stand-in of the same widths: Carlito for Calibri and
      // the other sans faces, Caladea for Cambria and the serifs.
      if (!document.getElementById('hud-docx-fonts')) {
        const link = document.createElement('link')
        link.id = 'hud-docx-fonts'; link.rel = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&family=Caladea:ital,wght@0,400;0,700;1,400;1,700&display=swap'
        document.head.appendChild(link)
      }
      // Word's bullets are private glyphs in Symbol and Wingdings, which a browser draws as empty boxes: use the plain marks.
      const MARKS = { '\uF0B7': '\u2022', '\uF0A7': '\u25AA', '\uF0D8': '\u27A2', '\uF0FC': '\u2713', '\uF076': '\u2756' }
      for (const st of el.querySelectorAll('style')) st.textContent = st.textContent.replace(/[\uE000-\uF8FF]/g, (c) => MARKS[c] || '\u2022').replace(/font-family:\s*(Symbol|Wingdings ?\d?|Webdings);/g, "font-family: Arial, sans-serif;")
      // One long page: give the footer room under the last line.
      const air = document.createElement('style')
      air.textContent = '.hud-docx-wrapper footer { margin-top: 28px; }'
      el.appendChild(air)
      for (const st of el.querySelectorAll('style')) st.textContent = st.textContent.replace(/(--docx-\w+-font:\s*)([^;]+);/g, (_, a, n) => `${a}${faceStack(n.trim())};`).replace(/(font-family:\s*)((?!var\()[^;]+);/g, (_, a, n) => `${a}${faceStack(n.trim())};`)
      for (const node of el.querySelectorAll('[style*="font-family"]')) if (!/var\(/.test(node.style.fontFamily)) node.style.fontFamily = faceStack(node.style.fontFamily)
      fit()
      setState({ phase: 'ready' })
    }
    draw().catch(e => { if (on) setState({ phase: 'error', message: e.message }) })
    window.addEventListener('resize', fit)
    return () => { on = false; window.removeEventListener('resize', fit); if (el) el.innerHTML = '' }
  }, [blob])
  return (
    <div style={{ ...box, position: 'relative' }}>
      {state.phase === 'loading' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK2, fontSize: 14 }}>Drawing The Pages</div>}
      {state.phase === 'error' && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: INK2, fontSize: 14, textAlign: 'center', padding: 24 }}><div style={{ color: INK, fontSize: 15 }}>The pages would not draw here.</div><div>{state.message}</div><div>Open it below to see it in Word.</div></div>}
      <div ref={host} style={{ color: '#000' }} />
    </div>
  )
}

function FileSheet({ api, row, folder, folders, msg, onClose, onAct, onMove }) {
  const ext = extOf(row.name)
  const id = row.id
  const readable = canSynopsize(row)
  const src = sourceOf(row)
  const [syn, setSyn] = useState(readable ? { state: 'loading' } : { state: 'none' })
  const [again, setAgain] = useState(0)
  const [showDoc, setShowDoc] = useState(!readable)
  const [view, setView] = useState({ state: 'loading' })
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  useEffect(() => {
    if (!readable) return
    let on = true
    api.fileSynopsis(id, { refresh: again > 0 })
      .then(j => { if (on) setSyn({ state: 'ready', text: j.synopsis, partial: !!j.partial }) })
      .catch(e => { if (on) setSyn({ state: 'error', message: e.message }) })
    return () => { on = false }
  }, [id, readable, again, api])
  const rewrite = () => { setSyn({ state: 'loading' }); setAgain(n => n + 1) }
  useEffect(() => {
    if (!showDoc) return
    let on = true
    const show = (v) => { if (on) setView(v) }
    const run = async () => {
      if (isLink(row)) return { state: 'link' }
      if (isRequest(row)) return { state: 'waiting' }
      if (IMG.includes(ext)) return { state: 'image', url: await api.openLiveFile(row) }
      if (ext === 'pdf') return { state: 'frame', url: await api.openLiveFile(row) }
      if (ext === 'docx') {
        // A Word file is drawn as its own pages, in place (David 11/10: "render the actual page in the overlay").
        const res = await fetch(await api.openLiveFile(row))
        if (!res.ok) throw new Error(`could not read it (${res.status})`)
        return { state: 'word', blob: await res.blob() }
      }
      if (OFFICE.includes(ext)) {
        if ((row.bucket || 'project-files') !== 'project-files') return { state: 'none' }
        return { state: 'frame', url: await api.pdfUrl(row.path, 'project-files'), plain: true }
      }
      if (ext === 'html' || TEXT.includes(ext)) {
        const res = await fetch(await api.openLiveFile(row))
        if (!res.ok) throw new Error(`could not read it (${res.status})`)
        const text = (await res.text()).slice(0, 400000)
        return ext === 'html' ? { state: 'html', text } : { state: 'text', text }
      }
      return { state: 'none' }
    }
    run().then(show).catch(e => show({ state: 'error', message: e.message }))
    return () => { on = false }
  }, [row, ext, api, showDoc])
  const box = { border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, background: 'rgba(0,0,0,0.18)', height: 'min(58vh, 620px)', overflow: 'auto' }
  const center = { ...box, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 24, color: INK2, fontSize: 14 }
  const facts = [
    ['Source', src.sender ? `Email From ${src.sender}, ${src.when}` : src.kind === 'You' ? 'Added By You' : src.kind === 'This Mac' ? 'A Path On This Mac' : src.kind],
    src.subject ? ['Subject', src.subject] : null,
    ['Added', stamp(row.created_at)],
    ['Kind', [kindOf(row), row.size ? fmtSize(row.size) : null, row.version > 1 ? `Version ${row.version}` : null].filter(Boolean).join(' · ')],
    row.note && src.kind !== 'Email' && !isLink(row) ? ['Note', row.note] : null,
  ].filter(Boolean)
  const quiet = { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: MUTED, textDecoration: 'underline', textUnderlineOffset: 3 }
  return (
    <div style={veil} onClick={onClose}>
      <div style={sheet(showDoc ? 940 : 720)} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FileGlyph row={row} size={20} style={{ flexShrink: 0, marginTop: 5 }} />
          <div style={{ ...modalTitle, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{row.name}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: INK2, cursor: 'pointer', padding: 2 }}><XIcon size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', columnGap: 18, rowGap: 5, marginTop: 14 }}>
          {facts.map(([l, v]) => [
            <span key={`${l}l`} style={{ fontSize: 13, fontWeight: 600, color: LABEL, lineHeight: 1.55 }}>{l}</span>,
            <span key={`${l}v`} style={{ fontSize: 13.5, color: INK2, lineHeight: 1.55, wordBreak: 'break-word' }}>{v}</span>,
          ])}
        </div>
        {syn.state !== 'none' && (
          <div style={{ marginTop: 18, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ flex: 1, fontSize: 15.5, fontWeight: 600, color: LABEL }}>Synopsis</div>
              {syn.state === 'ready' && <button onClick={rewrite} style={quiet}>Write It Again</button>}
            </div>
            {syn.state === 'loading' && <div style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>Reading the document</div>}
            {syn.state === 'ready' && <div style={{ marginTop: 4 }}>{renderMarkdown(syn.text, { size: 14.5 })}</div>}
            {syn.state === 'ready' && syn.partial && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>This document is long. The synopsis covers the first part of it.</div>}
            {syn.state === 'error' && <div style={{ fontSize: 13.5, color: INK2, marginTop: 8, lineHeight: 1.55 }}>The synopsis did not come back: {syn.message}. <button onClick={rewrite} style={{ ...quiet, fontSize: 13.5 }}>Try Again</button></div>}
          </div>
        )}
        {showDoc && (
          <div style={{ marginTop: 16 }}>
            {view.state === 'loading' && <div style={center}>Opening</div>}
            {view.state === 'image' && <div style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={view.url} alt={row.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>}
            {view.state === 'frame' && <iframe title={row.name} src={view.url} style={{ ...box, width: '100%', display: 'block', background: '#fff' }} />}
            {view.state === 'word' && <WordPages blob={view.blob} box={box} />}
            {view.state === 'word' && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>Drawn from the Word file itself: its header, footer, pictures, tables and styles. It runs as one long page here; Word decides where the pages break.</div>}
            {view.state === 'html' && <iframe title={row.name} srcDoc={view.text} sandbox="allow-scripts" style={{ ...box, width: '100%', display: 'block', background: '#fff' }} />}
            {view.state === 'text' && <pre style={{ ...box, margin: 0, padding: 16, fontSize: 13, lineHeight: 1.6, color: INK, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono, monospace)' }}>{view.text}</pre>}
            {view.state === 'link' && <div style={center}><Link2 size={34} color={LABEL} /><div style={{ color: INK, fontSize: 15, wordBreak: 'break-all' }}>{row.path}</div>{row.note && <div>{row.note}</div>}</div>}
            {view.state === 'waiting' && <div style={center}><Hourglass size={34} color={LABEL} /><div style={{ color: INK, fontSize: 15 }}>Waiting for a Claude session on this Mac to bring it in.</div><div style={{ wordBreak: 'break-all' }}>{row.path}</div></div>}
            {view.state === 'none' && <div style={center}><FileGlyph row={row} size={34} /><div style={{ color: INK, fontSize: 15 }}>No preview for this kind of file.</div><div>Open it or download it below.</div></div>}
            {view.state === 'error' && <div style={center}><div style={{ color: INK, fontSize: 15 }}>The document would not open here.</div><div>{view.message}</div></div>}
            {view.plain && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>A plain rendering of the words, in order. Open it for the original layout.</div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 18 }}>
          {isLink(row) && <button onClick={() => window.open(row.path, '_blank', 'noopener')} style={btn('primary')}><ExternalLink size={14} /> Launch</button>}
          {readable && <button onClick={() => setShowDoc(v => !v)} style={btn(showDoc ? 'on' : 'plain')}>{showDoc ? <EyeOff size={14} /> : <Eye size={14} />} {showDoc ? 'Hide The Document' : 'Show The Document'}</button>}
          {!isLink(row) && !isRequest(row) && <>
            <button onClick={() => onAct('open')} style={btn()}><ExternalLink size={14} /> Open</button>
            <button onClick={() => onAct('download')} style={btn()}><Download size={14} /> Download</button>
            <button onClick={() => onAct('mail')} title="A new Outlook draft with this file attached" style={btn()}><Mail size={14} /> Mail</button>
          </>}
          {!isRequest(row) && <button onClick={() => onAct('pin')} style={btn(row.evidence ? 'on' : 'plain')}><Star size={14} /> {row.evidence ? 'Pinned To Polaris' : 'Pin To Polaris'}</button>}
          {folders.length > 0 && (
            <select value={folder || ''} onChange={e => onMove(e.target.value || null)} aria-label="Folder" style={{ ...field, width: 'auto', padding: '7px 10px', fontSize: 13, borderRadius: 999 }}>
              <option value="" style={{ color: '#0F2334' }}>No Folder</option>{folders.map(f => <option key={f} value={f} style={{ color: '#0F2334' }}>{f}</option>)}
            </select>
          )}
          <span style={{ flex: 1 }} />
          <button onClick={() => onAct('remove')} style={btn()}><Trash2 size={14} /> Remove</button>
        </div>
        {msg && <div role="status" style={{ fontSize: 13, color: msg.startsWith('Could not') ? RED : MUTED, marginTop: 12 }}>{msg}</div>}
      </div>
    </div>
  )
}

// ---- the list --------------------------------------------------------------------------------
const COLS = [['name', 'Name'], ['source', 'Source'], ['added', 'Added'], ['size', 'Size']]
const GRID = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 176px 116px 80px', gap: 14, alignItems: 'center' }

export default function CardFiles({ objectiveId, onChanged, api = LEDGER }) {
  const [rows, setRows] = useState(null)
  const [index, setIndex] = useState({ v: 1, folders: [], of: {} })
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState(() => { try { const k = JSON.parse(localStorage.getItem('hud:files:sort')); return k ? { ...k, by: k.by === 'from' ? 'source' : k.by } : { by: 'added', dir: 'desc' } } catch { return { by: 'added', dir: 'desc' } } })
  const [closed, setClosed] = useState({})
  const [adding, setAdding] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let on = true
    if (!objectiveId) { Promise.resolve().then(() => { if (on) setRows([]) }); return () => { on = false } }
    Promise.all([api.listLiveFiles({ objectiveId }, { includeFiled: true }), api.readFileIndex(objectiveId)])
      .then(([r, idx]) => { if (on) { setRows(r.rows.filter(x => !isSessionLink(x))); setIndex(idx) } })
      .catch(e => { if (on) { setRows([]); setMsg(`Could not read the files: ${e.message}`) } })
    return () => { on = false }
  }, [objectiveId, tick, api])
  useEffect(() => { const h = () => setTick(t => t + 1); window.addEventListener(LEDGER_EVENT, h); return () => window.removeEventListener(LEDGER_EVENT, h) }, [])

  const reload = () => { setTick(t => t + 1); onChanged && onChanged() }
  const saveIndex = async (next) => { setIndex(next); try { await api.writeFileIndex(objectiveId, next) } catch (e) { setMsg(`Could not save the folders: ${e.message}`) } }
  const setSortBy = (by) => { const next = sort.by === by ? { by, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { by, dir: by === 'name' || by === 'source' ? 'asc' : 'desc' }; setSort(next); try { localStorage.setItem('hud:files:sort', JSON.stringify(next)) } catch { /* no-op */ } }

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = (rows || []).filter(r => !f || [r.name, r.note, sourceOf(r).label, kindOf(r), index.of[r.id]].some(v => String(v || '').toLowerCase().includes(f)))
    const key = (r) => sort.by === 'name' ? String(r.name || '').toLowerCase() : sort.by === 'source' ? sourceOf(r).label.toLowerCase() : sort.by === 'size' ? Number(r.size) || 0 : String(r.created_at || '')
    return list.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1) })
  }, [rows, filter, sort, index])
  const folders = index.folders || []
  const inFolder = (name) => shown.filter(r => index.of[r.id] === name)
  const loose = shown.filter(r => !folders.includes(index.of[r.id]))
  const preview = previewId ? (rows || []).find(r => r.id === previewId) || null : null

  const act = async (row, what) => {
    try {
      // Open and Download (David 11/10: "it won't open or download"). Neither waits on a new tab opened
      // after the link comes back, which a browser can block without a word. A file the browser can
      // show opens in a tab made inside the click; anything else is saved to Downloads, by name, in place.
      const ext = extOf(row.name)
      const save = async () => {
        const res = await fetch(await api.downloadLiveFile(row))
        if (!res.ok) throw new Error(`the file would not come down (${res.status})`)
        const a = document.createElement('a')
        a.href = URL.createObjectURL(await res.blob()); a.download = row.name
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 8000)
      }
      if (what === 'open' && (IMG.includes(ext) || ext === 'pdf' || ext === 'html' || TEXT.includes(ext))) {
        const tab = window.open('', '_blank')
        try {
          const url = await api.openLiveFile(row)
          if (tab) { tab.opener = null; tab.location.replace(url); setMsg(`Opened In A New Tab: ${row.name}`) }
          else { await save(); setMsg(`The browser blocked a new tab, so it was saved to Downloads: ${row.name}`) }
        } catch (e) { tab?.close(); throw e }
      }
      else if (what === 'open') { setMsg(`Bringing it down: ${row.name}`); await save(); setMsg(`Saved To Downloads: ${row.name}. It opens in ${ext === 'docx' || ext === 'doc' ? 'Word' : ext === 'xlsx' || ext === 'xls' ? 'Excel' : ext === 'pptx' ? 'PowerPoint' : 'its own app'} from there.`) }
      else if (what === 'download') { setMsg(`Bringing it down: ${row.name}`); await save(); setMsg(`Saved To Downloads: ${row.name}`) }
      else if (what === 'mail') {
        // The tab is made inside the click for the same reason; the draft takes a few seconds to come back.
        const tab = window.open('', '_blank')
        try {
          setMsg(`Drafting In Outlook: ${row.name}`)
          const d = await api.draftMail(row)
          if (tab && d.webLink) { tab.opener = null; tab.location.replace(d.webLink); setMsg(`Draft Open In Outlook: ${row.name}`) }
          else { tab?.close(); setMsg(`The draft is in your Outlook Drafts: ${row.name}`) }
        } catch (e) { tab?.close(); throw e }
      }
      else if (what === 'pin') { await api.pinEvidence(row.id, !row.evidence); reload() }
      else if (what === 'remove') {
        if (!await hudConfirm({ title: `Remove ${row.name}?`, message: isLink(row) || isRequest(row) ? 'It leaves this card.' : 'The file is deleted from this card and cannot be brought back.', confirm: 'Remove', danger: true })) return
        await api.removeLiveRow(row)
        if (index.of[row.id]) { const of = { ...index.of }; delete of[row.id]; await saveIndex({ ...index, of }) }
        setPreviewId(null); setMsg(`Removed: ${row.name}`); reload()
      }
    } catch (e) { setMsg(`Could not do that: ${e.message}`) }
  }
  const move = (row, name) => { const of = { ...index.of }; if (name) of[row.id] = name; else delete of[row.id]; saveIndex({ ...index, of }) }
  const newFolder = async () => {
    const name = String(await hudPrompt({ title: 'Name The Folder', placeholder: 'Drafts, Sent, Source Material' }) || '').trim().slice(0, 60)
    if (!name) return
    if (folders.some(f => f.toLowerCase() === name.toLowerCase())) { setMsg(`There is already a folder named ${name}.`); return }
    saveIndex({ ...index, folders: [...folders, name] })
  }
  const dropFolder = async (name) => {
    const n = (rows || []).filter(r => index.of[r.id] === name).length
    if (!await hudConfirm({ title: `Remove The Folder ${name}?`, message: n ? `Its ${n} ${n === 1 ? 'file stays' : 'files stay'} on the card, out of any folder.` : 'It is empty.', confirm: 'Remove The Folder' })) return
    const of = Object.fromEntries(Object.entries(index.of).filter(([, v]) => v !== name))
    saveIndex({ ...index, folders: folders.filter(f => f !== name), of })
  }
  const added = async (made, folder) => {
    setAdding(false)
    if (folder && made.length) await saveIndex({ ...index, of: { ...index.of, ...Object.fromEntries(made.filter(m => m?.id).map(m => [m.id, folder])) } })
    setMsg(made.length === 1 ? `Added: ${made[0]?.name || 'one item'}` : `Added ${made.length} files`); reload()
  }

  // A plain function, not a component: rows render inline and keep no state of their own.
  const renderRow = (r) => {
    const src = sourceOf(r)
    return (
      <button key={r.id} onClick={() => { setMsg(null); setPreviewId(r.id) }} style={{ ...GRID, width: '100%', textAlign: 'left', fontFamily: 'inherit', background: 'transparent', border: 'none', borderTop: `1px solid ${PANEL_BORDER}`, padding: '12px 4px', cursor: 'pointer', color: INK }}
        onMouseEnter={e => { e.currentTarget.style.background = PANEL_BG }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <FileGlyph row={r} style={{ flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.version > 1 && <span style={{ color: MUTED, fontSize: 12.5 }}> · Version {r.version}</span>}</span>
            {(r.evidence || isRequest(r) || (isLink(r) && r.note)) && <span style={{ display: 'block', fontSize: 12.5, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isRequest(r) ? 'Waiting for a session on this Mac' : <>{r.evidence && <span style={{ color: GOLD }}>Pinned To Polaris</span>}{isLink(r) && r.note ? `${r.evidence ? ' · ' : ''}${r.note}` : ''}</>}
            </span>}
          </span>
        </span>
        <span title={src.sender ? `Email from ${src.sender}, ${src.when}: ${src.subject}` : undefined} style={{ fontSize: 13, color: INK2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.label}</span>
        <span style={{ fontSize: 13, color: INK2 }}>{day(r.created_at)}</span>
        <span style={{ fontSize: 13, color: INK2, textAlign: 'right' }}>{r.size ? fmtSize(r.size) : ''}</span>
      </button>
    )
  }

  if (rows === null) return <div style={{ fontSize: 13.5, color: MUTED, padding: '18px 0' }}>Reading the files</div>
  const empty = rows.length === 0 && folders.length === 0
  return (
    <div style={{ minWidth: 0 }}>
      {adding && <AddModal api={api} owner={{ objectiveId }} folders={folders} onClose={() => setAdding(false)} onAdded={added} />}
      {preview && <FileSheet key={preview.id} api={api} row={preview} folder={index.of[preview.id] || null} folders={folders} msg={msg} onClose={() => { setPreviewId(null); setMsg(null) }} onAct={(w) => act(preview, w)} onMove={(name) => move(preview, name)} />}

      {empty ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '54px 16px 46px' }}>
          <FolderOpen size={72} strokeWidth={1.1} color={alpha(LABEL, 70)} />
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 21, letterSpacing: '-0.01em', color: INK }}>No Files On This Card</div>
          <div style={{ fontSize: 14, color: INK2, maxWidth: '46ch', lineHeight: 1.55 }}>{objectiveId ? 'Nothing has been brought in yet. Add a file, a path on this Mac, or a link when there is something to keep here.' : 'This card takes files once it is loaded on the Board.'}</div>
          {objectiveId && <button onClick={() => setAdding(true)} style={{ ...btn('primary'), marginTop: 6 }}><Paperclip size={14} /> Add</button>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
              <Search size={15} color={MUTED} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name, kind, or source" style={{ ...field, paddingLeft: 36, borderRadius: 999 }} />
            </span>
            <span style={{ fontSize: 13, color: MUTED }}>{shown.length === rows.length ? `${rows.length} ${rows.length === 1 ? 'file' : 'files'}` : `${shown.length} of ${rows.length}`}</span>
            <span style={{ flex: 1 }} />
            <button onClick={newFolder} style={btn()}><FolderPlus size={14} /> New Folder</button>
            <button onClick={() => setAdding(true)} style={btn('primary')}><Paperclip size={14} /> Add</button>
          </div>

          <div style={{ ...GRID, padding: '0 4px 8px' }}>
            {COLS.map(([k, l]) => (
              <button key={k} onClick={() => setSortBy(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: k === 'size' ? 'flex-end' : 'flex-start', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: sort.by === k ? INK : LABEL }}>
                {l}{sort.by === k && (sort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
              </button>
            ))}
          </div>

          {folders.map(name => {
            const list = inFolder(name); const open = !closed[name]
            return (
              <div key={name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${PANEL_BORDER}`, padding: '11px 4px' }}>
                  <button onClick={() => setClosed(c => ({ ...c, [name]: open }))} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: INK }}>
                    {open ? <ChevronDown size={15} color={INK2} /> : <ChevronRight size={15} color={INK2} />}
                    {open ? <FolderOpen size={17} color={LABEL} /> : <Folder size={17} color={LABEL} />}
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{list.length}</span>
                  </button>
                  <button onClick={() => dropFolder(name)} title="Remove this folder; its files stay on the card" aria-label={`Remove the folder ${name}`} style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><XIcon size={15} /></button>
                </div>
                {open && <div style={{ paddingLeft: 26 }}>{list.map(renderRow)}{!list.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 4px', borderTop: `1px solid ${PANEL_BORDER}` }}>{filter ? 'Nothing here matches the filter.' : 'Empty. Open a file and choose this folder to move it in.'}</div>}</div>}
              </div>
            )
          })}
          {loose.map(renderRow)}
          {!shown.length && rows.length > 0 && <div style={{ fontSize: 13.5, color: GRAY, padding: '16px 4px', borderTop: `1px solid ${PANEL_BORDER}` }}>Nothing matches the filter.</div>}
        </>
      )}
      {msg && <div style={{ fontSize: 13, color: msg.startsWith('Could not') ? RED : MUTED, marginTop: 14 }}>{msg}</div>}
    </div>
  )
}

// Documents Lumen or a session wrote on this card (a brief, a plan). They are not files David
// brought in, so they stay out of the list; one quiet line keeps them reachable.
export function WrittenOnCard({ artifacts = [], onRead }) {
  const [open, setOpen] = useState(false)
  if (!artifacts.length) return null
  return (
    <div style={{ marginTop: 26, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: MUTED }}>{artifacts.length} {artifacts.length === 1 ? 'document was' : 'documents were'} written on this card by Lumen or a session.</span>
        <button onClick={() => setOpen(o => !o)} style={{ ...btn(), padding: '5px 12px' }}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && artifacts.map(a => (
        <div key={a.slug} style={{ display: 'flex', alignItems: 'center', gap: 11, borderTop: `1px solid ${PANEL_BORDER}`, padding: '11px 4px', marginTop: 10 }}>
          <FileText size={17} color={LABEL} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.slug}</span>
          <button onClick={() => onRead(a)} style={{ ...btn(), padding: '5px 12px' }}>Read</button>
        </div>
      ))}
    </div>
  )
}
