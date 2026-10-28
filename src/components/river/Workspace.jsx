// Workspace (David, 10/28): "when i say that I want to create a workspace on the
// Mission card's work bench, i want to start building blank pages where we can
// draw, type, design, formulate, analyze, etc." A page is a blank surface on
// the Workbench pill: type on it (Lora, autosaved) and draw over it (pen or
// mouse, pressure through Pointer Events). Pages live in storage as JSON under
// the mission or item (src/lib/workspace.js); a session or Lumen opens one with
// ~/.claude/hud-board/workspace.py. Nothing here earns miles.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pen, Type, Eraser, Undo2, Trash2, X, ChevronsDown } from 'lucide-react'
import { listPages, readPage, writePage, removePage, blankPage, slugify } from '../../lib/workspace'
import { INK, INK2, GRAY, GOLD, BLUE, GREEN, RED, PURPLE, MONO, SERIF, PANEL_BORDER, PANEL_BG, LABEL, S, alpha } from './canon'
import { hudPrompt, hudConfirm } from '../../lib/dialog'

const COLORS = [['Ink', INK], ['Gold', GOLD], ['Blue', BLUE], ['Green', GREEN], ['Red', RED], ['Purple', PURPLE]]
const WIDTHS = [2, 3, 5, 9]
const btn = (color = INK2, on = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${on ? color : alpha(color, 40)}`, background: on ? alpha(color, 13) : 'transparent', color, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' })
const mono = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }
const fmt = (iso) => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
// A stroke keeps its resolved color, so a theme change later never recolors ink already on the page.
const css = (c) => { const m = /^var\((--[^)]+)\)/.exec(String(c)); if (!m) return c; const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim(); return v || '#F3F1EA' }

function drawStroke(ctx, st) {
  const pts = st.pts || []; if (!pts.length) return
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = st.eraser ? 'destination-out' : 'source-over'
  ctx.strokeStyle = st.eraser ? 'rgba(0,0,0,1)' : st.color
  if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, (st.width * (0.5 + (pts[0].p || 0.5))) / 2, 0, Math.PI * 2); ctx.fillStyle = st.eraser ? 'rgba(0,0,0,1)' : st.color; ctx.fill(); ctx.restore(); return }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    ctx.lineWidth = st.eraser ? st.width * 3 : st.width * (0.5 + ((a.p || 0.5) + (b.p || 0.5)) / 2)
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  ctx.restore()
}
function paint(canvas, strokes, live) {
  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  for (const st of strokes) drawStroke(ctx, st)
  if (live) drawStroke(ctx, live)
}

// One open page: the text layer beneath, the ink layer on top. Type and Draw
// decide which layer the pointer reaches; both always show.
function Page({ root, slug, doc: initial, onClose, onRemoved }) {
  const [doc, setDoc] = useState(initial)
  const [mode, setMode] = useState('type')
  const [color, setColor] = useState(INK)
  const [width, setWidth] = useState(3)
  const [eraser, setEraser] = useState(false)
  const [status, setStatus] = useState('saved')
  const docRef = useRef(initial), statusRef = useRef('saved'), timer = useRef(null)
  const canvasRef = useRef(null), wrapRef = useRef(null), live = useRef(null)
  const setSt = (s) => { statusRef.current = s; setStatus(s) }
  const save = useCallback(async () => {
    clearTimeout(timer.current); setSt('saving')
    try { const out = await writePage(root, slug, docRef.current); docRef.current = { ...docRef.current, updated_at: out.updated_at }; setDoc(docRef.current); setSt('saved') } catch (e) { setSt(`could not save: ${e.message}`) }
  }, [root, slug])
  const touch = (patch) => { docRef.current = { ...docRef.current, ...patch }; setDoc(docRef.current); setSt('unsaved'); clearTimeout(timer.current); timer.current = setTimeout(save, 900) }
  const repaint = () => { const c = canvasRef.current; if (c) paint(c, docRef.current.strokes, live.current) }
  const size = useCallback(() => {
    const c = canvasRef.current, w = wrapRef.current; if (!c || !w) return
    const dpr = window.devicePixelRatio || 1, cw = w.clientWidth, ch = docRef.current.height || 720
    c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); c.style.width = `${cw}px`; c.style.height = `${ch}px`
    paint(c, docRef.current.strokes, live.current)
  }, [])
  useEffect(() => { size(); const ro = new ResizeObserver(size); if (wrapRef.current) ro.observe(wrapRef.current); return () => ro.disconnect() }, [size, doc.height])
  useEffect(() => () => { clearTimeout(timer.current); if (statusRef.current === 'unsaved') writePage(root, slug, docRef.current).catch(() => {}) }, [root, slug])

  const pos = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left) * 10) / 10, y: Math.round((e.clientY - r.top) * 10) / 10, p: e.pointerType === 'pen' ? Math.max(0.15, e.pressure || 0.5) : 0.5 } }
  const down = (e) => { if (e.pointerType === 'touch' && e.isPrimary === false) return; e.preventDefault(); canvasRef.current.setPointerCapture(e.pointerId); live.current = { color: css(color), width, eraser, pts: [pos(e)] }; repaint() }
  const move = (e) => { if (!live.current) return; e.preventDefault(); const evs = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [e]; for (const ev of evs) live.current.pts.push(pos(ev)); repaint() }
  const up = (e) => { if (!live.current) return; e.preventDefault(); const st = live.current; live.current = null; touch({ strokes: [...docRef.current.strokes, st] }); repaint() }
  const undo = () => { if (!docRef.current.strokes.length) return; touch({ strokes: docRef.current.strokes.slice(0, -1) }); repaint() }
  const clearInk = async () => { if (!docRef.current.strokes.length) return; if (!await hudConfirm('Clear the ink on this page? The text stays.')) return; touch({ strokes: [] }); repaint() }
  const rename = async () => { const t = await hudPrompt('Name the page', docRef.current.title); if (t?.trim() && t.trim() !== docRef.current.title) touch({ title: t.trim() }) }
  const taller = () => touch({ height: (docRef.current.height || 720) + 360 })
  const remove = async () => { if (!await hudConfirm(`Delete the page "${docRef.current.title}"? It leaves the Ledger.`)) return; clearTimeout(timer.current); statusRef.current = 'saved'; try { await removePage(root, slug); onRemoved() } catch (e) { setSt(`could not delete: ${e.message}`) } }
  const close = async () => { if (statusRef.current === 'unsaved' || statusRef.current === 'saving') await save(); onClose() }

  const statusColor = status === 'saved' ? GRAY : status === 'saving' || status === 'unsaved' ? GOLD : RED
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <button onClick={rename} title="Rename" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'text', fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: INK, textAlign: 'left', minWidth: 0, flex: '1 1 240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</button>
        <span style={{ ...mono, color: statusColor }}>{status === 'saved' ? `Saved ${fmt(doc.updated_at)}` : status}</span>
        <button onClick={() => setMode('type')} style={btn(BLUE, mode === 'type')}><Type size={11} /> Type</button>
        <button onClick={() => setMode('draw')} style={btn(BLUE, mode === 'draw')}><Pen size={11} /> Draw</button>
        <button onClick={close} style={btn(INK2)}><X size={11} /> Close</button>
      </div>
      {mode === 'draw' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {COLORS.map(([n, c]) => <button key={n} onClick={() => { setColor(c); setEraser(false) }} title={n} style={{ width: 22, height: 22, borderRadius: 99, background: c, border: `2px solid ${color === c && !eraser ? '#fff' : 'transparent'}`, cursor: 'pointer', padding: 0, boxShadow: color === c && !eraser ? `0 0 0 2px ${alpha(c, 40)}` : 'none' }} />)}
          <span style={{ width: 8 }} />
          {WIDTHS.map(w => <button key={w} onClick={() => { setWidth(w); setEraser(false) }} title={`${w}px`} style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${width === w && !eraser ? BLUE : alpha(INK2, 30)}`, background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><span style={{ width: w + 2, height: w + 2, borderRadius: 99, background: INK }} /></button>)}
          <span style={{ width: 8 }} />
          <button onClick={() => setEraser(v => !v)} style={btn(GOLD, eraser)}><Eraser size={11} /> Eraser</button>
          <button onClick={undo} style={btn(INK2)}><Undo2 size={11} /> Undo</button>
          <button onClick={clearInk} style={btn(RED)}><Trash2 size={11} /> Clear Ink</button>
        </div>
      )}
      <div ref={wrapRef} style={{ position: 'relative', height: doc.height || 720, background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        <textarea
          value={doc.text}
          onChange={e => touch({ text: e.target.value })}
          placeholder={mode === 'type' ? 'A blank page. Type here; switch to Draw to ink over it.' : ''}
          spellCheck={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', boxSizing: 'border-box', padding: '22px 26px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: INK, fontFamily: SERIF, fontSize: 15.5, lineHeight: 1.65, pointerEvents: mode === 'type' ? 'auto' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
          style={{ position: 'absolute', inset: 0, touchAction: 'none', pointerEvents: mode === 'draw' ? 'auto' : 'none', cursor: eraser ? 'cell' : 'crosshair' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ ...mono, flex: 1 }}>{doc.strokes.length} strokes · {String(doc.text || '').trim() ? String(doc.text).trim().split(/\s+/).length : 0} words</span>
        <button onClick={taller} style={btn(INK2)}><ChevronsDown size={11} /> Taller</button>
        <button onClick={remove} style={btn(RED)}><Trash2 size={11} /> Delete Page</button>
      </div>
    </div>
  )
}

export default function WorkspacePages({ root, what = 'item' }) {
  const [pages, setPages] = useState(null)
  const [open, setOpen] = useState(null)
  const [msg, setMsg] = useState(null)
  const load = useCallback(async () => { try { setPages(await listPages(root)) } catch (e) { setPages([]); setMsg(`Could not read: ${e.message}`) } }, [root])
  useEffect(() => { load() }, [load])
  const create = async () => {
    const t = await hudPrompt('Name the page', '')
    if (!t?.trim()) return
    const slug = `${slugify(t)}-${Date.now().toString(36).slice(-4)}`, doc = blankPage(t)
    try { await writePage(root, slug, doc); setOpen({ slug, doc }); load() } catch (e) { setMsg(`Could not create: ${e.message}`) }
  }
  const openPage = async (slug) => { try { setOpen({ slug, doc: await readPage(root, slug) }) } catch (e) { setMsg(`Could not open: ${e.message}`) } }
  if (open) return <Page root={root} slug={open.slug} doc={open.doc} onClose={() => { setOpen(null); load() }} onRemoved={() => { setOpen(null); load() }} />
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: INK2, lineHeight: 1.5, flex: 1 }}>Blank pages on this {what}: draw, type, design, formulate, analyze. A page keeps what you put on it. A session or Lumen can open one here too.</div>
        <button onClick={create} style={{ ...S.btnPrimary, flexShrink: 0 }}><Plus size={12} /> New Page</button>
      </div>
      {pages === null && <div style={{ ...mono, padding: '6px 0' }}>Reading the Ledger</div>}
      {pages && !pages.length && <div style={{ fontSize: 13, color: GRAY, padding: '4px 0' }}>No pages yet.</div>}
      {pages && pages.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {pages.map(p => (
            <button key={p.slug} onClick={() => openPage(p.slug)} style={{ textAlign: 'left', background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
              <div style={{ ...mono, marginTop: 6 }}>{fmt(p.updated_at)} · {p.words} words · {p.strokes} strokes</div>
              {p.updated_by && !/hud/.test(p.updated_by) && <div style={{ ...mono, color: LABEL, marginTop: 3 }}>{p.updated_by}</div>}
            </button>
          ))}
        </div>
      )}
      {msg && <div style={{ ...mono, color: msg.startsWith('Could') ? RED : GOLD, marginTop: 10 }}>{msg}</div>}
    </div>
  )
}
