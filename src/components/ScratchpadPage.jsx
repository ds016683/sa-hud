// Scratchpad (David, 10/19): a general drawing surface in the left nav. Draw
// with the Apple Pencil (pressure through Pointer Events) on a blank sheet or
// over a dropped screenshot, then Save: the sketch goes into Live Files as a
// PNG, tied to a Loadout or Stash item if you pick one, and announces itself
// to the next Claude session. The current sheet autosaves in this browser so
// a reload does not lose it. Milestone 16 on Lumen Production.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, Undo2, Trash2, Save, Image as ImageIcon, Pen } from 'lucide-react'
import { putLiveFile, listLiveFiles, openLiveFile, fmtStamp } from '../lib/livefiles'
import { fetchLoadout, fetchStash } from '../lib/loadout'
import { S, Eyebrow, Serif, Label, INK, INK2, GRAY, GOLD, BLUE, GREEN, RED, PURPLE, MONO, PANEL_BORDER, LABEL } from './river/canon'

const COLORS = [['Ink', '#EAF1F8'], ['Gold', GOLD], ['Blue', BLUE], ['Green', GREEN], ['Red', RED], ['Purple', PURPLE]]
const WIDTHS = [2, 4, 7, 12]
const PAPER = '#132B42'
const LS = 'hud-scratchpad-v1'
const btn = (color = INK2, on = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', padding: '7px 10px', borderRadius: 8, border: `1px solid ${on ? color : `${color}55`}`, background: on ? `${color}22` : 'transparent', color, cursor: 'pointer' })

export default function ScratchpadPage() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  // A document is pages; each page is strokes [{ color, width, eraser, pts: [{x,y,p}] }] in CSS pixels plus an optional background image.
  const pages = useRef([{ strokes: [], bg: null, bgSrc: null }])
  const pageIx = useRef(0)
  const strokes = { get current() { return pages.current[pageIx.current].strokes }, set current(v) { pages.current[pageIx.current].strokes = v } }
  const bg = { get current() { return pages.current[pageIx.current].bg }, set current(v) { pages.current[pageIx.current].bg = v; pages.current[pageIx.current].bgSrc = v ? v.src : null } }
  const live = useRef(null)
  const [pageNo, setPageNo] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [color, setColor] = useState(COLORS[0][1])
  const [width, setWidth] = useState(4)
  const [eraser, setEraser] = useState(false)
  const [items, setItems] = useState([])
  const [tie, setTie] = useState('')
  const [msg, setMsg] = useState(null)
  const [recent, setRecent] = useState([])
  const [count, setCount] = useState(0)   // strokes on the sheet, for the toolbar (refs are not read in render)

  function redraw() {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cw = c.width / dpr, ch = c.height / dpr
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, cw, ch)
    if (bg.current) { const im = bg.current; const s = Math.min(cw / im.width, ch / im.height, 1); const w = im.width * s, h = im.height * s; ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h) }
    for (const st of strokes.current) drawStroke(ctx, st)
    if (live.current) drawStroke(ctx, live.current)
  }
  function drawStroke(ctx, st) {
    const pts = st.pts; if (!pts.length) return
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = st.eraser ? 'destination-out' : 'source-over'
    ctx.strokeStyle = st.eraser ? 'rgba(0,0,0,1)' : st.color
    if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, (st.width * (0.5 + pts[0].p)) / 2, 0, Math.PI * 2); ctx.fillStyle = st.eraser ? 'rgba(0,0,0,1)' : st.color; ctx.fill(); ctx.restore(); return }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]
      ctx.lineWidth = st.eraser ? st.width * 3 : st.width * (0.5 + (a.p + b.p) / 2)
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    }
    ctx.restore()
  }

  const size = useCallback(() => {
    const c = canvasRef.current, w = wrapRef.current; if (!c || !w) return
    const dpr = window.devicePixelRatio || 1
    const cw = w.clientWidth, ch = Math.max(520, Math.round(window.innerHeight * 0.68))
    c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); c.style.width = `${cw}px`; c.style.height = `${ch}px`
    redraw()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // iPad Safari treats an Apple Pencil drag on a web page as a text-selection gesture
  // unless the touch is swallowed at the native layer. React's touch listeners are
  // passive, so the sheet gets native non-passive listeners, and while this page is
  // open nothing in the document is selectable at all (the "19" in the top bar was the
  // nearest selectable text once the description stopped being one).
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const swallow = (e) => { e.preventDefault() }
    el.addEventListener('touchstart', swallow, { passive: false }); el.addEventListener('touchmove', swallow, { passive: false }); el.addEventListener('touchend', swallow, { passive: false })
    document.documentElement.classList.add('pad-mode')
    return () => { el.removeEventListener('touchstart', swallow); el.removeEventListener('touchmove', swallow); el.removeEventListener('touchend', swallow); document.documentElement.classList.remove('pad-mode') }
  }, [])
  useEffect(() => {
    size(); window.addEventListener('resize', size)
    try {
      const saved = JSON.parse(localStorage.getItem(LS) || 'null')
      const src = saved?.pages ? saved.pages : saved?.strokes ? [{ strokes: saved.strokes, bg: saved.bg || null }] : null
      if (src) {
        pages.current = src.map(pg => ({ strokes: pg.strokes || [], bg: null, bgSrc: pg.bg || null }))
        pageIx.current = Math.min(saved.page || 0, pages.current.length - 1); setPageNo(pageIx.current); setPageCount(pages.current.length); setCount(strokes.current.length)
        pages.current.forEach(pg => { if (pg.bgSrc) { const im = new Image(); im.onload = () => { pg.bg = im; redraw() }; im.src = pg.bgSrc } })
        redraw()
      }
    } catch { /* fresh sheet */ }
    return () => window.removeEventListener('resize', size)
  }, [size]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let on = true
    Promise.all([fetchLoadout().catch(() => null), fetchStash().catch(() => [])]).then(([L, held]) => { if (!on) return; setItems([...(L?.items || []).filter(x => !x.meeting).map(x => ({ id: x.id, label: x.kind === 'Main Mission' ? `${x.project || 'Main Mission'}: ${(x.task_text || x.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '')}` : x.title })), ...(held || []).map(x => ({ id: x.id, label: `${x.kind === 'Main Mission' ? `${x.project || 'Main Mission'}: ` : ''}${(x.task_text || x.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '')} (Stash)` }))]) })
    listLiveFiles({}).then(r => { if (on) setRecent((r.rows || []).filter(f => /^sketch/i.test(f.note || '') || /^sketch-/.test(f.name)).slice(0, 8)) }).catch(() => {})
    return () => { on = false }
  }, [])

  const persist = () => { try { localStorage.setItem(LS, JSON.stringify({ v: 2, page: pageIx.current, pages: pages.current.map(pg => ({ strokes: pg.strokes, bg: pg.bgSrc })) })) } catch { /* quota */ } }
  const pos = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pointerType === 'pen' ? Math.max(0.15, e.pressure || 0.5) : 0.5 } }
  const down = (e) => { if (e.pointerType === 'touch' && e.isPrimary === false) return; e.preventDefault(); try { window.getSelection()?.removeAllRanges() } catch { /* none */ } canvasRef.current.setPointerCapture(e.pointerId); live.current = { color, width, eraser, pts: [pos(e)] }; redraw() }
  const move = (e) => {
    if (!live.current) return; e.preventDefault()
    const evs = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [e]
    for (const ev of evs) live.current.pts.push(pos(ev))
    redraw()
  }
  const up = (e) => { if (!live.current) return; e.preventDefault(); strokes.current.push(live.current); live.current = null; redraw(); persist(); setCount(strokes.current.length) }
  const goPage = (i) => { if (i < 0 || i >= pages.current.length) return; pageIx.current = i; setPageNo(i); setCount(strokes.current.length); redraw(); persist() }
  const addPage = () => { pages.current.push({ strokes: [], bg: null, bgSrc: null }); setPageCount(pages.current.length); goPage(pages.current.length - 1) }
  const deletePage = () => { if (pages.current.length === 1) { clear(); return } if (!window.confirm(`Delete page ${pageIx.current + 1}?`)) return; pages.current.splice(pageIx.current, 1); setPageCount(pages.current.length); goPage(Math.min(pageIx.current, pages.current.length - 1)) }
  const undo = () => { strokes.current.pop(); redraw(); persist(); setCount(strokes.current.length) }
  const clear = () => { if (!strokes.current.length && !bg.current) return; if (!window.confirm('Clear this page?')) return; strokes.current = []; bg.current = null; redraw(); persist(); setCount(strokes.current.length) }
  const loadImage = (file) => { if (!file || !file.type.startsWith('image/')) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { bg.current = im; redraw(); persist(); setCount(strokes.current.length) }; im.src = rd.result }; rd.readAsDataURL(file) }
  useEffect(() => { const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/')); if (f) loadImage(f) }; window.addEventListener('paste', onPaste); return () => window.removeEventListener('paste', onPaste) }, [])

  // Render any page to an offscreen canvas at the sheet's size.
  const renderPage = (pg) => {
    const c = canvasRef.current; const dpr = window.devicePixelRatio || 1
    const off = document.createElement('canvas'); off.width = c.width; off.height = c.height
    const ctx = off.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cw = c.width / dpr, ch = c.height / dpr
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, cw, ch)
    if (pg.bg) { const im = pg.bg; const sc = Math.min(cw / im.width, ch / im.height, 1); const w = im.width * sc, h = im.height * sc; ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h) }
    for (const st of pg.strokes) drawStroke(ctx, st)
    return off
  }
  // A one-file PDF of every page: JPEG images, one per page, no library.
  const buildPdf = (jpegs, w, h) => {
    const enc = new TextEncoder(); const parts = []; const offsets = []; let len = 0
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length }
    push('%PDF-1.4\n')
    const n = jpegs.length; const ids = { catalog: 1, pages: 2 }
    const objs = []
    objs.push(`<< /Type /Catalog /Pages 2 0 R >>`)
    objs.push(`<< /Type /Pages /Kids [${jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>`)
    const pw = 612, ph = Math.round(612 * h / w)
    for (let i = 0; i < n; i++) {
      const pageId = 3 + i * 3, imgId = pageId + 1, contentId = pageId + 2
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`)
      objs.push({ dict: `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegs[i].length} >>`, stream: jpegs[i] })
      const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im${i} Do Q`
      objs.push({ dict: `<< /Length ${content.length} >>`, stream: enc.encode(content) })
    }
    objs.forEach((o, i) => {
      offsets.push(len); push(`${i + 1} 0 obj\n`)
      if (typeof o === 'string') { push(o + '\n') } else { push(o.dict + '\nstream\n'); push(o.stream); push('\nendstream\n') }
      push('endobj\n')
    })
    const xref = len
    push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''))
    push(`trailer\n<< /Size ${objs.length + 1} /Root ${ids.catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
    void ids.pages
    return new Blob(parts, { type: 'application/pdf' })
  }
  const save = async () => {
    const c = canvasRef.current; if (!c) return
    const used = pages.current.filter(pg => pg.strokes.length || pg.bg)
    if (!used.length) { setMsg('Nothing on the sheet yet.'); return }
    setMsg('Saving')
    const stamp = new Date().toLocaleString('en-CA', { timeZone: 'America/Chicago', hour12: false }).replace(/[^0-9]/g, '').slice(0, 12)
    try {
      const jpegs = []
      for (const pg of used) { const off = renderPage(pg); const blob = await new Promise(res => off.toBlob(res, 'image/jpeg', 0.92)); jpegs.push(new Uint8Array(await blob.arrayBuffer())) }
      const pdf = buildPdf(jpegs, c.width, c.height)
      const file = new File([pdf], `sketch-${stamp}.pdf`, { type: 'application/pdf' })
      const row = await putLiveFile(file, { objectiveId: tie || null, note: `sketch, ${used.length} page${used.length === 1 ? '' : 's'}${tie ? '' : ', untied'} from the iPad Scratchpad`, source: 'david' })
      setMsg(`Saved ${row.name} (${used.length} page${used.length === 1 ? '' : 's'})${tie ? ', tied to the item' : ', in Live Files (tied to nothing yet)'}. The next Claude session sees it.`)
      setRecent(r => [row, ...r].slice(0, 8))
    } catch (e) { setMsg(`Could not save: ${e.message}`) }
  }

  const noSelect = { WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }
  return (
    <div style={{ ...S.page, ...noSelect }} onContextMenu={e => e.preventDefault()}>
      <style>{`html.pad-mode, html.pad-mode * { -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; -webkit-tap-highlight-color: transparent !important } html.pad-mode select, html.pad-mode input { -webkit-user-select: auto !important; user-select: auto !important } .pad-sheet canvas { touch-action: none }`}</style>
      <Eyebrow>Scratchpad</Eyebrow>
      <Serif size={28}>Draw it</Serif>
      <div style={{ fontSize: 13.5, color: INK2, margin: '6px 0 14px', maxWidth: '72ch' }}>Pencil on the iPad, mouse on the Mac. Drop or paste a screenshot to mark it up. Save collates every page into one PDF in Live Files, tied to an item if you pick one, and the next Claude session is told a sketch is waiting.</div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        {COLORS.map(([n, c]) => <button key={n} onClick={() => { setColor(c); setEraser(false) }} title={n} style={{ width: 26, height: 26, borderRadius: 99, background: c, border: `2px solid ${color === c && !eraser ? '#fff' : 'transparent'}`, cursor: 'pointer', boxShadow: color === c && !eraser ? `0 0 0 2px ${c}66` : 'none' }} />)}
        <span style={{ width: 1, height: 22, background: PANEL_BORDER, margin: '0 4px' }} />
        {WIDTHS.map(w => <button key={w} onClick={() => setWidth(w)} title={`${w}px`} style={{ ...btn(width === w ? BLUE : INK2, width === w), padding: '4px 8px' }}><span style={{ display: 'inline-block', width: Math.min(18, w * 2 + 4), height: Math.min(18, w * 2 + 4), borderRadius: 99, background: width === w ? BLUE : INK2 }} /></button>)}
        <span style={{ width: 1, height: 22, background: PANEL_BORDER, margin: '0 4px' }} />
        <button onClick={() => setEraser(e => !e)} style={btn(eraser ? GOLD : INK2, eraser)}><Eraser size={12} /> Eraser</button>
        <button onClick={() => setEraser(false)} style={btn(!eraser ? GREEN : INK2, false)}><Pen size={12} /> Pen</button>
        <button onClick={undo} disabled={!count} style={{ ...btn(INK2), opacity: count ? 1 : 0.4 }}><Undo2 size={12} /> Undo</button>
        <label style={btn(BLUE)}><ImageIcon size={12} /> Screenshot<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { loadImage(e.target.files?.[0]); e.target.value = '' }} /></label>
        <button onClick={clear} style={btn(RED)}><Trash2 size={12} /> Clear</button>
        <span style={{ flex: 1 }} />
        <select value={tie} onChange={e => setTie(e.target.value)} style={{ background: '#0A1B2B', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 8px', fontSize: 12.5, maxWidth: 300 }}>
          <option value="">Tied to nothing yet</option>
          {items.map(it => <option key={it.id} value={it.id}>{it.label}</option>)}
        </select>
        <button onClick={save} style={btn(GOLD, true)}><Save size={12} /> Save to Live Files</button>
      </div>

      <div ref={wrapRef} className="pad-sheet" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); loadImage(e.dataTransfer?.files?.[0]) }} onPointerDown={e => { if (e.pointerType !== 'mouse') e.preventDefault() }} style={{ border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, overflow: 'hidden', background: PAPER, touchAction: 'none' }}>
        <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ display: 'block', touchAction: 'none', cursor: eraser ? 'cell' : 'crosshair' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: LABEL, marginRight: 4 }}>Pages</span>
        {Array.from({ length: pageCount }, (_, i) => <button key={i} onClick={() => goPage(i)} style={{ ...btn(pageNo === i ? GOLD : INK2, pageNo === i), padding: '5px 10px' }}>{i + 1}</button>)}
        <button onClick={addPage} style={btn(GREEN)}>+ Page</button>
        <button onClick={deletePage} style={btn(RED)}>Delete page</button>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY, marginLeft: 6 }}>Save collates every page into one PDF</span>
      </div>
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD, marginTop: 10 }}>{msg}</div>}

      {recent.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <Label>Recent Sketches</Label>
          <div style={{ display: 'grid', gap: 4 }}>
            {recent.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                <span style={{ fontSize: 13.5, color: INK, flex: 1 }}>{r.name}{r.item ? <span style={{ fontSize: 12.5, color: LABEL, marginLeft: 10 }}>{r.item.title}</span> : <span style={{ fontSize: 12, color: GRAY, marginLeft: 10 }}>tied to nothing yet</span>}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{fmtStamp(r.created_at)}</span>
                <button onClick={async () => { try { window.open(await openLiveFile(r), '_blank', 'noopener') } catch (e) { setMsg(`Could not open: ${e.message}`) } }} style={btn(BLUE)}>Open</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
