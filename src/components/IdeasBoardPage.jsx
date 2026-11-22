// The Ideas Board (David 11/21): "a place to capture what comes out. ... this is not a board we will ever take action
// from." No clock, no miles, no Load. Intake: the box here (telling Lumen directly), Lumen's park_idea hand when he is
// told one, and Send To The Ideas Board on the Catches list (reconciliation). Shelves By Concept or By Project, and a
// hub and spoke Map ("like you can do in obsidian"): shelves are hubs, ideas orbit them, each layer is a spoke.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Gamepad2, Smartphone, Rocket, Sparkles, PenLine, Music, Users, Mic, Send, Inbox, Keyboard, FolderInput, X, Layers, Lightbulb, Mountain, Film, Landmark, Briefcase, Loader2, Archive } from 'lucide-react'
import { loadIdeas, parkIdea, updateIdea, removeLayer } from '../lib/ideas'
import { hudPrompt, hudConfirm } from '../lib/dialog'

const SRC = { told: [Keyboard, 'Told Lumen'], voice: [Mic, 'Told Lumen Aloud'], recon: [Inbox, 'Sent From Reconciliation'], import: [Archive, 'From The Old Ideas Board'] }
const srcOf = (k) => SRC[k] || SRC.told
const ICONS = [[/book|novel|writ/i, BookOpen], [/game/i, Gamepad2], [/tik ?tok|video|social|short/i, Smartphone], [/film|movie|show|tv/i, Film], [/venture|business|product|startup/i, Rocket], [/essay|article|op.?ed/i, PenLine], [/music|song|playlist/i, Music], [/family|kid|home/i, Users], [/hud|lumen|platform/i, Sparkles], [/polic|politic|govern/i, Landmark], [/third horizon|client|firm/i, Briefcase]]
const iconFor = (name) => (ICONS.find(([re]) => re.test(name || '')) || [null, Lightbulb])[1]
const chiDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
const short = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })
const lastAt = (i) => (i.layers || []).slice(-1)[0]?.at || i.created_at

const CSS = `
.ib { --ink:#F3F1EA; --ink2:rgba(243,241,234,.70); --ink3:rgba(243,241,234,.44); --line:rgba(255,255,255,.12); --deep:#0D1D2C; --acc:#8ACAFF; --serif:'Lora',Georgia,serif; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:0; color:var(--ink); min-height:calc(100vh - 80px); }
.ib-page { padding:36px 40px 60px; max-width:1180px; width:100%; margin:0 auto; }
.ib-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; flex-wrap:wrap; }
.ib h1 { font:500 40px/1.1 var(--serif); letter-spacing:-.008em; margin:0; color:var(--ink); }
.ib-sub { font-size:15px; color:var(--ink2); margin-top:8px; }
.ib-seg { display:flex; border:1px solid var(--line); border-radius:999px; padding:3px; }
.ib-seg button { border:0; background:transparent; color:var(--ink2); font:inherit; font-size:13.5px; padding:7px 15px; border-radius:999px; cursor:pointer; }
.ib-seg button.on { background:rgba(138,202,255,.14); color:var(--acc); }
.ib-park { display:flex; align-items:center; gap:12px; border:1px solid var(--line); border-radius:16px; padding:10px 10px 10px 20px; background:rgba(255,255,255,.035); }
.ib-park:focus-within { border-color:var(--acc); box-shadow:0 0 0 3px rgba(138,202,255,.14); }
.ib-park textarea { flex:1; background:transparent; border:0; outline:none; color:var(--ink); font:400 19px/1.45 var(--serif); padding:10px 0; resize:none; height:48px; }
.ib-park textarea::placeholder { color:var(--ink3); font-style:italic; }
.ib-ic { width:42px; height:42px; border-radius:99px; display:inline-grid; place-items:center; border:1.5px solid rgba(243,241,234,.3); color:var(--ink2); background:transparent; cursor:pointer; flex-shrink:0; padding:0; }
.ib-ic.go { border-color:var(--acc); color:var(--acc); }
.ib-ic:disabled { opacity:.45; cursor:default; }
.ib-said { margin-top:10px; font-size:14px; color:var(--acc); display:flex; align-items:center; gap:8px; }
.ib-err { margin-top:10px; font-size:14px; color:#DE7E6E; }
.ib-sec { margin-top:30px; border-top:1px solid var(--line); padding-top:22px; }
.ib-ex { font:500 20px/1.25 var(--serif); }
.ib-chips { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:10px; margin-top:14px; }
.ib-chip { display:grid; grid-template-columns:22px 1fr; gap:10px; border:1px solid var(--line); border-radius:12px; padding:12px 14px; cursor:pointer; }
.ib-chip:hover { border-color:rgba(138,202,255,.45); }
.ib-chip .w { font:italic 400 15.5px/1.45 var(--serif); }
.ib-chip .to { font-size:13px; color:var(--ink2); margin-top:4px; }
.ib-chip .to svg { vertical-align:-2px; margin-right:4px; }
.ib-chip > svg { color:var(--acc); margin-top:3px; }
.ib-grid { columns:3 300px; column-gap:16px; margin-top:16px; }
.ib-shelf { break-inside:avoid; border:1px solid var(--line); border-radius:14px; padding:16px 18px 8px; margin-bottom:16px; }
.ib-sh { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
.ib-sh .t { font:500 19px var(--serif); flex:1; }
.ib-sh .n { font-size:13px; color:var(--ink2); }
.ib-sh svg { color:var(--acc); }
.ib-idea { display:grid; grid-template-columns:20px 1fr; gap:10px; padding:11px 0; border-top:1px solid rgba(255,255,255,.07); cursor:pointer; }
.ib-idea:first-of-type { border-top:0; }
.ib-idea:hover .it, .ib-idea.on .it { color:var(--acc); }
.ib-idea .it { font:500 15.5px/1.4 var(--serif); }
.ib-idea .im { font-size:12.5px; color:var(--ink2); margin-top:3px; }
.ib-stack { display:flex; flex-direction:column-reverse; justify-content:flex-end; gap:2px; padding-top:6px; }
.ib-stack i { display:block; width:16px; height:3px; border-radius:2px; background:var(--acc); }
.ib-idea.ripe .it::after { content:''; display:inline-block; width:7px; height:7px; border-radius:99px; background:var(--acc); margin-left:8px; box-shadow:0 0 0 4px rgba(138,202,255,.18); vertical-align:middle; }
.ib-empty { margin-top:18px; color:var(--ink3); font:italic 400 16px var(--serif); }
.ib-drawer { width:400px; border-left:1px solid var(--line); background:var(--deep); padding:30px 28px; position:sticky; top:0; height:calc(100vh - 60px); overflow:auto; }
.ib-dtop { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.ib-dt { font:500 26px/1.2 var(--serif); }
.ib-dm { font-size:13.5px; color:var(--ink2); margin-top:8px; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
.ib-lay { margin-top:20px; position:relative; }
.ib-lay::before { content:''; position:absolute; left:10px; top:8px; bottom:8px; width:1px; background:var(--line); }
.ib-ly { display:grid; grid-template-columns:22px 1fr auto; gap:14px; padding-bottom:20px; position:relative; }
.ib-ly .b { width:21px; height:21px; border-radius:99px; background:var(--deep); border:1.5px solid var(--acc); display:grid; place-items:center; color:var(--acc); font-size:11px; font-weight:600; }
.ib-ly .q { font:italic 400 16px/1.5 var(--serif); }
.ib-ly .m { font-size:12.5px; color:var(--ink2); margin-top:4px; display:flex; align-items:center; gap:6px; }
.ib-ly .x { opacity:0; border:0; background:transparent; color:var(--ink3); cursor:pointer; padding:2px; height:22px; }
.ib-ly:hover .x { opacity:1; }
.ib-dact { display:flex; gap:10px; margin-top:8px; border-top:1px solid var(--line); padding-top:18px; flex-wrap:wrap; }
.ib-quiet { display:inline-flex; align-items:center; gap:8px; font:500 13.5px inherit; color:var(--ink); background:transparent; border:1px solid rgba(255,255,255,.22); border-radius:999px; padding:8px 15px; cursor:pointer; }
.ib-spin { animation:ibspin 1s linear infinite; } @keyframes ibspin { to { transform:rotate(360deg) } }
@media (max-width: 1100px) { .ib { grid-template-columns:1fr; } .ib-drawer { width:auto; position:static; height:auto; border-left:0; border-top:1px solid var(--line); } }
`

const Stack = ({ n }) => <div className="ib-stack">{Array.from({ length: Math.min(n, 5) }, (_, i) => <i key={i} style={{ opacity: 0.35 + i * 0.16 }} />)}</div>
const SrcMark = ({ k, size = 13 }) => { const I = srcOf(k)[0]; return <I size={size} strokeWidth={1.7} /> }

// Hub and spoke layout. Deterministic, then settled so labels do not sit on each other.
const W = 1160, H = 820
const STOP = new Set(['the', 'for', 'with', 'about', 'that', 'this', 'from', 'into', 'what', 'where', 'each', 'back', 'your', 'they', 'them', 'have', 'like'])
const wordsOf = (t) => new Set(String(t).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !STOP.has(w)))
function layout(groups) {
  const hubs = groups.map((g, i) => { const a = (i / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2, rx = groups.length === 1 ? 0 : 450, ry = groups.length === 1 ? 0 : 320; return { ...g, x: W / 2 + Math.cos(a) * rx, y: H / 2 + Math.sin(a) * ry, a } })
  const nodes = []
  hubs.forEach(h => h.ideas.forEach((idea, j) => {
    const n = h.ideas.length, a = (groups.length === 1 ? (j / n) * Math.PI * 2 : h.a + Math.PI + (n === 1 ? 0 : (j / (n - 1) - 0.5) * 1.4))
    nodes.push({ idea, hub: h, x: h.x + Math.cos(a) * 130, y: h.y + Math.sin(a) * 130 })
  }))
  for (let it = 0; it < 400; it++) {
    nodes.forEach((p, i) => {
      nodes.forEach((q, k) => { if (k <= i) return; const dx = q.x - p.x, dy = q.y - p.y, ox = 190 - Math.abs(dx), oy = 62 - Math.abs(dy)
        if (ox > 0 && oy > 0) { if (ox / 190 < oy / 62) { const m = (dx >= 0 ? 1 : -1) * ox * 0.25; p.x -= m; q.x += m } else { const m = (dy >= 0 ? 1 : -1) * oy * 0.25; p.y -= m; q.y += m } } })
      hubs.forEach(h => { const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1; if (d < 95) { p.x += dx / d * (95 - d) * 0.3; p.y += dy / d * (95 - d) * 0.3 }
        const ly = h.y + (h.y > H / 2 ? 50 : -38), lx = p.x - h.x, ox = 170 - Math.abs(lx), oy = 40 - Math.abs(p.y + 34 - ly); if (ox > 0 && oy > 0) p.x += (lx >= 0 ? 1 : -1) * ox * 0.3 })
      const dx = p.x - p.hub.x, dy = p.y - p.hub.y, d = Math.hypot(dx, dy) || 1; if (d > 150) { p.x -= dx / d * (d - 150) * 0.05; p.y -= dy / d * (d - 150) * 0.05 }
      p.x = Math.max(110, Math.min(W - 110, p.x)); p.y = Math.max(40, Math.min(H - 60, p.y))
    })
  }
  nodes.forEach(p => { const a = Math.atan2(p.y - p.hub.y, p.x - p.hub.x), L = p.idea.layers || []; p.spokes = L.map((l, k) => { const b = a + ((k + 0.5) / L.length - 0.5) * 2.6; return { ...l, x: p.x + Math.cos(b) * 26, y: p.y + Math.sin(b) * 26 } }) })
  const threads = []
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach(b => { if (a.hub === b.hub) return; const wa = wordsOf(a.idea.title + ' ' + (a.idea.layers || []).map(l => l.words).join(' ')), wb = wordsOf(b.idea.title + ' ' + (b.idea.layers || []).map(l => l.words).join(' ')); const hit = [...wa].filter(w => wb.has(w)); if (hit.length) threads.push([a, b, hit]) }))
  return { hubs, nodes, threads }
}
function MapView({ groups, pick, onPick }) {
  const { hubs, nodes, threads } = useMemo(() => layout(groups), [groups])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 14, border: '1px solid var(--line)', borderRadius: 16, background: 'radial-gradient(circle at 50% 50%, rgba(138,202,255,.05), transparent 70%)' }}>
      {threads.map(([a, b, hit], i) => <path key={i} d={`M${a.x},${a.y} Q${W / 2},${H / 2} ${b.x},${b.y}`} fill="none" stroke="rgba(138,202,255,.16)" strokeDasharray="3 5"><title>{hit.join(', ')}</title></path>)}
      {nodes.map(n => <line key={'l' + n.idea.id} x1={n.hub.x} y1={n.hub.y} x2={n.x} y2={n.y} stroke="rgba(255,255,255,.14)" />)}
      {nodes.map(n => n.spokes.map((s, k) => <g key={n.idea.id + k}><line x1={n.x} y1={n.y} x2={s.x} y2={s.y} stroke="rgba(138,202,255,.3)" /><circle cx={s.x} cy={s.y} r={2.6} fill="#8ACAFF" opacity={0.75}><title>{s.words}</title></circle></g>))}
      {hubs.map(h => { const I = h.icon; return (
        <g key={h.k}>
          <circle cx={h.x} cy={h.y} r={26} fill="#0D1D2C" stroke="rgba(255,255,255,.22)" />
          <foreignObject x={h.x - 9} y={h.y - 9} width={18} height={18}><I size={18} strokeWidth={1.7} color="#8ACAFF" /></foreignObject>
          <text x={h.x} y={h.y + (h.y > H / 2 ? 50 : -38)} textAnchor="middle" fill="#F3F1EA" style={{ font: "500 17px 'Lora', serif" }}>{h.k}</text>
        </g>) })}
      {nodes.map(n => { const on = pick === n.idea.id, L = (n.idea.layers || []).length, r = 5 + L * 1.6, t = n.idea.title; return (
        <g key={'n' + n.idea.id} style={{ cursor: 'pointer' }} onClick={() => onPick(n.idea.id)}>
          {on && <circle cx={n.x} cy={n.y} r={r + 7} fill="none" stroke="#8ACAFF" strokeOpacity={0.5} />}
          <circle cx={n.x} cy={n.y} r={r} fill={on ? '#8ACAFF' : '#16314A'} stroke="#8ACAFF" strokeWidth={1.4} />
          <text x={n.x} y={n.y + r + 34} textAnchor="middle" fill={on ? '#8ACAFF' : 'rgba(243,241,234,.78)'} style={{ font: "400 13px 'Instrument Sans', sans-serif" }}>{t.length > 28 ? t.slice(0, 27) + '…' : t}<title>{t}</title></text>
        </g>) })}
    </svg>
  )
}
function Cluster({ idea }) {
  const L = idea.layers || [], n = L.length, cx = 172, cy = 120
  return (
    <svg viewBox="0 10 344 220" style={{ width: '100%', marginTop: 10 }}>
      {L.map((l, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * 82, y = cy + Math.sin(a) * 82, right = Math.cos(a) >= -0.01; return (
        <g key={l.id || i}><line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(138,202,255,.35)" />
          <circle cx={x} cy={y} r={12} fill="#0D1D2C" stroke="#8ACAFF" strokeWidth={1.4}><title>{l.words}</title></circle><text x={x} y={y + 4} textAnchor="middle" fill="#8ACAFF" style={{ font: "600 11px 'Instrument Sans', sans-serif" }}>{i + 1}</text>
          <text x={x + (right ? 18 : -18)} y={y + 4} textAnchor={right ? 'start' : 'end'} fill="rgba(243,241,234,.6)" style={{ font: "12px 'Instrument Sans', sans-serif" }}>{short(l.at)}</text></g>) })}
      <circle cx={cx} cy={cy} r={20 + Math.min(n, 8) * 2} fill="rgba(138,202,255,.14)" stroke="#8ACAFF" strokeWidth={1.6} />
      <foreignObject x={cx - 9} y={cy - 9} width={18} height={18}><Lightbulb size={18} color="#8ACAFF" strokeWidth={1.7} /></foreignObject>
    </svg>
  )
}

export default function IdeasBoardPage() {
  const [ideas, setIdeas] = useState(null)
  const [view, setView] = useState(() => { try { return localStorage.getItem('ideas-view') || 'concepts' } catch { return 'concepts' } })
  const [pick, setPick] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(async () => setIdeas(await loadIdeas()), [])
  useEffect(() => { load() }, [load])
  useEffect(() => { try { localStorage.setItem('ideas-view', view) } catch { /* per viewer only */ } }, [view])

  const all = useMemo(() => ideas || [], [ideas])
  const today = chiDay(new Date().toISOString())
  const parkedToday = useMemo(() => all.flatMap(i => (i.layers || []).filter(l => chiDay(l.at) === today).map(l => ({ l, i }))).sort((a, b) => b.l.at.localeCompare(a.l.at)), [all, today])
  const groups = useMemo(() => {
    const m = new Map()
    all.forEach(i => { const k = view === 'projects' ? (i.project || 'Unfiled') : (i.shelf || 'Unshelved'); if (!m.has(k)) m.set(k, []); m.get(k).push(i) })
    return [...m.entries()].map(([k, list]) => ({ k, icon: view === 'projects' ? (k === 'Unfiled' ? Inbox : Mountain) : iconFor(k), ideas: [...list].sort((a, b) => (b.layers || []).length - (a.layers || []).length || lastAt(b).localeCompare(lastAt(a))) }))
      .sort((a, b) => b.ideas.length - a.ideas.length || a.k.localeCompare(b.k))
  }, [all, view])
  const mapGroups = useMemo(() => view === 'map' ? (() => { const m = new Map(); all.forEach(i => { const k = i.shelf || 'Unshelved'; if (!m.has(k)) m.set(k, []); m.get(k).push(i) }); return [...m.entries()].map(([k, list]) => ({ k, icon: iconFor(k), ideas: list })) })() : [], [all, view])
  const shelves = useMemo(() => [...new Set(all.map(i => i.shelf).filter(Boolean))], [all])
  const picked = all.find(i => i.id === pick) || null

  const park = async () => {
    const t = text.trim(); if (!t || busy) return
    setBusy(true); setErr(null); setSaid(null)
    try {
      const out = await parkIdea({ text: t, src: 'told', where: 'The Ideas Board' })
      setText(''); setSaid(out.new_idea ? `New idea, ${out.idea.title}, on ${out.idea.shelf}` : `A new layer on ${out.idea.title}`); setPick(out.idea.id)
      await load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const move = async () => {
    if (!picked) return
    const to = await hudPrompt({ title: 'Move To Which Shelf?', message: shelves.length ? `On the board: ${shelves.join(', ')}` : '', value: picked.shelf || '' })
    if (to === null || !to.trim() || to.trim() === picked.shelf) return
    try { setIdeas(await updateIdea(picked.id, { shelf: to.trim().replace(/\b\w/g, c => c.toUpperCase()) })) } catch (e) { setErr(e.message) }
  }
  const rename = async () => {
    if (!picked) return
    const to = await hudPrompt({ title: 'Name This Idea', value: picked.title })
    if (to === null || !to.trim()) return
    try { setIdeas(await updateIdea(picked.id, { title: to.trim() })) } catch (e) { setErr(e.message) }
  }
  const dropLayer = async (l) => {
    const last = (picked.layers || []).length === 1
    if (!(await hudConfirm({ title: last ? 'Take This Idea Off The Board?' : 'Take This Layer Off?', message: `"${l.words}"\n\nA copy is kept, so it can be put back.`, confirm: 'Take It Off', danger: true }))) return
    try { setIdeas(await removeLayer(picked.id, l.id)); if (last) setPick(null) } catch (e) { setErr(e.message) }
  }

  return (
    <div className="ib">
      <style>{CSS}</style>
      <div className="ib-page">
        <div className="ib-head">
          <div><h1>Ideas Board</h1><div className="ib-sub">{all.length} {all.length === 1 ? 'Idea' : 'Ideas'} · {shelves.length} {shelves.length === 1 ? 'Shelf' : 'Shelves'} · {parkedToday.length} Parked Today</div></div>
          <div className="ib-seg">{[['concepts', 'By Concept'], ['projects', 'By Project'], ['map', 'Map']].map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
        </div>

        <div className="ib-park">
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Park it here, Lumen will shelve it" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); park() } }} aria-label="Park an idea" />
          <button className="ib-ic go" title="Park It" aria-label="Park It" onClick={park} disabled={busy || !text.trim()}>{busy ? <Loader2 size={17} className="ib-spin" /> : <Send size={17} />}</button>
        </div>
        {said && <div className="ib-said"><Layers size={14} /> {said}</div>}
        {err && <div className="ib-err">{err}</div>}

        {parkedToday.length > 0 && (
          <div className="ib-sec">
            <div className="ib-ex">Parked Today</div>
            <div className="ib-chips">
              {parkedToday.map(({ l, i }) => (
                <div key={l.id} className="ib-chip" title={srcOf(l.src)[1]} onClick={() => setPick(i.id)}>
                  <SrcMark k={l.src} size={15} />
                  <div><div className="w">{l.words}</div><div className="to"><Layers size={13} />{srcOf(l.src)[1]} · {(i.layers || []).length === 1 ? `New Idea On ${i.shelf}` : `New Layer On ${i.title}`}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="ib-sec">
          <div className="ib-ex">{view === 'concepts' ? 'The Shelves' : view === 'map' ? 'The Map' : 'By Project'}</div>
          {ideas === null ? <div className="ib-empty">Reading the board</div>
            : !all.length ? <div className="ib-empty">Nothing parked yet</div>
            : view === 'map' ? <MapView groups={mapGroups} pick={pick} onPick={setPick} />
            : <div className="ib-grid">
              {groups.map(g => { const I = g.icon; return (
                <div key={g.k} className="ib-shelf">
                  <div className="ib-sh"><I size={17} strokeWidth={1.7} /><span className="t">{g.k}</span><span className="n">{g.ideas.length}</span></div>
                  {g.ideas.map(i => { const n = (i.layers || []).length; return (
                    <div key={i.id} className={`ib-idea${n >= 4 ? ' ripe' : ''}${pick === i.id ? ' on' : ''}`} onClick={() => setPick(i.id)}>
                      <Stack n={n} />
                      <div><div className="it">{i.title}</div><div className="im">{n} {n === 1 ? 'Layer' : 'Layers'} · Last Came Out {short(lastAt(i))}</div></div>
                    </div>) })}
                </div>) })}
            </div>}
        </div>
      </div>

      {picked && (
        <aside className="ib-drawer">
          <div className="ib-dtop"><div className="ib-dt">{picked.title}</div><button className="ib-ic" style={{ width: 34, height: 34 }} title="Close" aria-label="Close" onClick={() => setPick(null)}><X size={15} /></button></div>
          <div className="ib-dm"><Layers size={14} /> {(picked.layers || []).length} {(picked.layers || []).length === 1 ? 'Layer' : 'Layers'} · {picked.shelf}{picked.project ? ` · ${picked.project}` : ''}</div>
          <Cluster idea={picked} />
          <div className="ib-lay">
            {[...(picked.layers || [])].reverse().map((l, i, arr) => (
              <div key={l.id || i} className="ib-ly">
                <div className="b">{arr.length - i}</div>
                <div><div className="q">{l.words}</div><div className="m"><SrcMark k={l.src} /> {srcOf(l.src)[1]} · {short(l.at)}{l.where && l.src === 'recon' ? ` · ${l.where}` : ''}</div></div>
                <button className="x" title="Take This Layer Off" aria-label="Take This Layer Off" onClick={() => dropLayer(l)}><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="ib-dact">
            <button className="ib-quiet" title="Move To Another Shelf" onClick={move}><FolderInput size={15} /> Move</button>
            <button className="ib-quiet" title="Name This Idea" onClick={rename}><PenLine size={15} /> Rename</button>
          </div>
        </aside>
      )}
    </div>
  )
}
