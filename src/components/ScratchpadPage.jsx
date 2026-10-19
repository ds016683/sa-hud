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
  const strokes = useRef([])          // [{ color, width, eraser, pts: [{x,y,p}] }], in CSS pixels
  const live = useRef(null)
  const bg = useRef(null)             // HTMLImageElement or null
  const [color, setColor] = useState(COLORS[0][1])
  const [width, setWidth] = useState(4)
  const [eraser, setEraser] = useState(false)
  const [items, setItems] = useState([])
  const [tie, setTie] = useState('')
  const [msg, setMsg] = useState(null)
  const [recent, setRecent] = useState([])
  const [, force] = useState(0)

  const size = useCallback(() => {
    const c = canvasRef.current, w = wrapRef.current; if (!c || !w) return
    const dpr = window.devicePixelRatio || 1
    const cw = w.clientWidth, ch = Math.max(520, Math.round(window.innerHeight * 0.68))
    c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); c.style.width = `${cw}px`; c.style.height = `${ch}px`
    redraw()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    size(); window.addEventListener('resize', size)
    try { const saved = JSON.parse(localStorage.getItem(LS) || 'null'); if (saved?.strokes) { strokes.current = saved.strokes; if (saved.bg) { const im = new Image(); im.onload = () => { bg.current = im; redraw() }; im.src = saved.bg } else redraw() } } catch { /* fresh sheet */ }
    return () => window.removeEventListener('resize', size)
  }, [size]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let on = true
    Promise.all([fetchLoadout().catch(() => null), fetchStash().catch(() => [])]).then(([L, held]) => { if (!on) return; setItems([...(L?.items || []).filter(x => !x.meeting).map(x => ({ id: x.id, label: x.kind === 'Main Mission' ? `${x.project || 'Main Mission'}: ${(x.task_text || x.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '')}` : x.title })), ...(held || []).map(x => ({ id: x.id, label: `${x.kind === 'Main Mission' ? `${x.project || 'Main Mission'}: ` : ''}${(x.task_text || x.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '')} (Stash)` }))]) })
    listLiveFiles({}).then(r => { if (on) setRecent((r.rows || []).filter(f => /^sketch/i.test(f.note || '') || /^sketch-/.test(f.name)).slice(0, 8)) }).catch(() => {})
    return () => { on = false }
  }, [])

  const persist = () => { try { localStorage.setItem(LS, JSON.stringify({ strokes: strokes.current, bg: bg.current ? bg.current.src : null })) } catch { /* quota */ } }
  const pos = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pointerType === 'pen' ? Math.max(0.15, e.pressure || 0.5) : 0.5 } }
  const down = (e) => { if (e.pointerType === 'touch' && e.isPrimary === false) return; e.preventDefault(); canvasRef.current.setPointerCapture(e.pointerId); live.current = { color, width, eraser, pts: [pos(e)] }; redraw() }
  const move = (e) => {
    if (!live.current) return; e.preventDefault()
    const evs = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [e]
    for (const ev of evs) live.current.pts.push(pos(ev))
    redraw()
  }
  const up = (e) => { if (!live.current) return; e.preventDefault(); strokes.current.push(live.current); live.current = null; redraw(); persist(); force(x => x + 1) }
  const undo = () => { strokes.current.pop(); redraw(); persist(); force(x => x + 1) }
  const clear = () => { if (!strokes.current.length && !bg.current) return; if (!window.confirm('Clear the sheet?')) return; strokes.current = []; bg.current = null; redraw(); persist(); force(x => x + 1) }
  const loadImage = (file) => { if (!file || !file.type.startsWith('image/')) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { bg.current = im; redraw(); persist(); force(x => x + 1) }; im.src = rd.result }; rd.readAsDataURL(file) }
  useEffect(() => { const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/')); if (f) loadImage(f) }; window.addEventListener('paste', onPaste); return () => window.removeEventListener('paste', onPaste) }, [])

  const save = async () => {
    const c = canvasRef.current; if (!c) return
    if (!strokes.current.length && !bg.current) { setMsg('Nothing on the sheet yet.'); return }
    setMsg('Saving')
    const blob = await new Promise(res => c.toBlob(res, 'image/png'))
    const stamp = new Date().toLocaleString('en-CA', { timeZone: 'America/Chicago', hour12: false }).replace(/[^0-9]/g, '').slice(0, 12)
    const file = new File([blob], `sketch-${stamp}.png`, { type: 'image/png' })
    try {
      const row = await putLiveFile(file, { objectiveId: tie || null, note: `sketch${tie ? '' : ', untied'} from the iPad Scratchpad`, source: 'david' })
      setMsg(`Saved ${row.name}${tie ? ', tied to the item' : ', in Live Files (tied to nothing yet)'}. The next Claude session sees it.`)
      setRecent(r => [row, ...r].slice(0, 8))
    } catch (e) { setMsg(`Could not save: ${e.message}`) }
  }

  return (
    <div style={S.page}>
      <Eyebrow>Scratchpad</Eyebrow>
      <Serif size={28}>Draw it</Serif>
      <div style={{ fontSize: 13.5, color: INK2, margin: '6px 0 14px', maxWidth: '72ch' }}>Pencil on the iPad, mouse on the Mac. Drop or paste a screenshot to mark it up. Save puts the sheet into Live Files as a PNG, tied to an item if you pick one, and the next Claude session is told a sketch is waiting.</div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        {COLORS.map(([n, c]) => <button key={n} onClick={() => { setColor(c); setEraser(false) }} title={n} style={{ width: 26, height: 26, borderRadius: 99, background: c, border: `2px solid ${color === c && !eraser ? '#fff' : 'transparent'}`, cursor: 'pointer', boxShadow: color === c && !eraser ? `0 0 0 2px ${c}66` : 'none' }} />)}
        <span style={{ width: 1, height: 22, background: PANEL_BORDER, margin: '0 4px' }} />
        {WIDTHS.map(w => <button key={w} onClick={() => setWidth(w)} title={`${w}px`} style={{ ...btn(width === w ? BLUE : INK2, width === w), padding: '4px 8px' }}><span style={{ display: 'inline-block', width: Math.min(18, w * 2 + 4), height: Math.min(18, w * 2 + 4), borderRadius: 99, background: width === w ? BLUE : INK2 }} /></button>)}
        <span style={{ width: 1, height: 22, background: PANEL_BORDER, margin: '0 4px' }} />
        <button onClick={() => setEraser(e => !e)} style={btn(eraser ? GOLD : INK2, eraser)}><Eraser size={12} /> Eraser</button>
        <button onClick={() => setEraser(false)} style={btn(!eraser ? GREEN : INK2, false)}><Pen size={12} /> Pen</button>
        <button onClick={undo} disabled={!strokes.current.length} style={{ ...btn(INK2), opacity: strokes.current.length ? 1 : 0.4 }}><Undo2 size={12} /> Undo</button>
        <label style={btn(BLUE)}><ImageIcon size={12} /> Screenshot<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { loadImage(e.target.files?.[0]); e.target.value = '' }} /></label>
        <button onClick={clear} style={btn(RED)}><Trash2 size={12} /> Clear</button>
        <span style={{ flex: 1 }} />
        <select value={tie} onChange={e => setTie(e.target.value)} style={{ background: '#0A1B2B', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 8px', fontSize: 12.5, maxWidth: 300 }}>
          <option value="">Tied to nothing yet</option>
          {items.map(it => <option key={it.id} value={it.id}>{it.label}</option>)}
        </select>
        <button onClick={save} style={btn(GOLD, true)}><Save size={12} /> Save to Live Files</button>
      </div>

      <div ref={wrapRef} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); loadImage(e.dataTransfer?.files?.[0]) }} style={{ border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, overflow: 'hidden', background: PAPER }}>
        <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} style={{ display: 'block', touchAction: 'none', cursor: eraser ? 'cell' : 'crosshair' }} />
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
