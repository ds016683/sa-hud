// Dev mock-up: the Ideas Board (David 11/21). A place to park what comes out, organized by concept or by project.
// Nothing here is ever actioned: no clock, no miles, no Load. An idea that keeps coming out gains a layer each time,
// so the ripest ones rise. Lumen reconciles the day's stray ideas (from notes, calls, catches ruled out of context)
// onto the shelves. A picture to rule on: sample data only, nothing is read or written.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, BookOpen, Activity, Award, FileText, Mountain, Briefcase, Target, Archive, Lightbulb,
  Gamepad2, Smartphone, Rocket, Sparkles, PenLine, Music, Users, Mic, Send, NotebookPen, PhoneCall, Inbox, Keyboard, ArrowDownToLine, FolderInput, X, Layers } from 'lucide-react'

const NAV = [
  ['Landing', [[Waves, 'The River'], [Footprints, 'Journey']]],
  ['Monitor', [[CalendarDays, 'Board'], [BookOpen, 'Narrative And Analytics'], [Activity, 'Activity'], [Award, 'Accomplishments'], [FileText, 'Notes']]],
  ['Mission Board', [[Mountain, 'Main Missions'], [Briefcase, 'Clients'], [Target, 'Side Missions'], [Archive, 'Archive']]],
  ['Ideas', [[Lightbulb, 'Ideas Board', true]]],
]

const SRC = { typed: [Keyboard, 'Told Lumen'], voice: [Mic, 'Told Lumen Aloud'], recon: [Inbox, 'Sent From Reconciliation'] }
const L = (day, src, words) => ({ day, src, words })

const SHELVES = [
  { k: 'Books', icon: BookOpen, ideas: [
    { t: 'Ten Hospitals, One Safety Net', layers: [L('Sep 14', 'voice', 'a book that walks ten hospitals and lets the money tell the story'), L('Oct 2', 'recon', 'every chapter is one building and one balance sheet'), L('Oct 30', 'recon', 'the hospital as the main character, not the policy'), L('Nov 12', 'typed', 'open with the night shift'), L('Nov 21', 'recon', 'title idea: The Last Door That Stays Open')] },
    { t: 'A Field Manual For First-Time CEOs', layers: [L('Oct 8', 'typed', 'what nobody told me about payroll weeks'), L('Nov 19', 'voice', 'short chapters, one rule each')] },
    { t: 'Kids Book About A Dog Who Runs A Board', layers: [L('Nov 20', 'voice', 'the dog checks off the gates')] },
  ] },
  { k: 'Video Games', icon: Gamepad2, ideas: [
    { t: 'Mileage As A Game Loop For Real Work', layers: [L('Sep 30', 'recon', 'miles, badges, the yay page as a real loop'), L('Oct 21', 'typed', 'could be its own product'), L('Nov 21', 'voice', 'extractions feel like the end of a raid')] },
    { t: 'A City Builder Where You Run The Hospital', layers: [L('Nov 3', 'recon', 'sim game, payer mix is the hard mode')] },
  ] },
  { k: 'Political TikToks', icon: Smartphone, ideas: [
    { t: 'Sixty Seconds On Where Medicaid Money Goes', layers: [L('Oct 12', 'voice', 'one dollar, follow it'), L('Nov 4', 'typed', 'whiteboard, no face'), L('Nov 18', 'recon', 'series, not a one-off')] },
    { t: 'Myth Or Math', layers: [L('Nov 15', 'voice', 'take a claim, run the number on camera')] },
  ] },
  { k: 'Ventures', icon: Rocket, ideas: [
    { t: 'The HUD For Other Operators', layers: [L('Oct 1', 'typed', 'is this a product'), L('Oct 27', 'recon', 'two people asked to see it'), L('Nov 21', 'recon', 'Lumen is the product, the HUD is the room')] },
    { t: 'Rate Data As A Subscription For Small Plans', layers: [L('Nov 6', 'recon', 'small plans cannot afford the big shops')] },
  ] },
  { k: 'Essays', icon: PenLine, ideas: [
    { t: 'The Case For Boring Infrastructure', layers: [L('Oct 19', 'typed', 'nobody funds the pipes'), L('Nov 10', 'voice', 'boring is the moat')] },
  ] },
  { k: 'Music', icon: Music, ideas: [
    { t: 'A Playlist For Each Main Mission', layers: [L('Nov 9', 'voice', 'the extract gets its own song')] },
  ] },
  { k: 'Family', icon: Users, ideas: [
    { t: 'A Yearly Family Field Guide', layers: [L('Oct 25', 'typed', 'photos, places, one page per month'), L('Nov 16', 'voice', 'the kids write a page')] },
  ] },
  { k: 'HUD And Lumen', icon: Sparkles, ideas: [
    { t: 'Lumen Reads The Week Back To Me On Sunday', layers: [L('Oct 30', 'voice', 'like a radio show'), L('Nov 14', 'recon', 'five minutes, my voice clone off'), L('Nov 21', 'typed', 'with the miles at the end')] },
  ] },
]

const PROJECTS = { 'Ten Hospitals, One Safety Net': 'Writing', 'A Field Manual For First-Time CEOs': 'Writing', 'Kids Book About A Dog Who Runs A Board': 'Family', 'Mileage As A Game Loop For Real Work': 'Platform.Lumen', 'A City Builder Where You Run The Hospital': 'Unfiled', 'Sixty Seconds On Where Medicaid Money Goes': 'Public Voice', 'Myth Or Math': 'Public Voice', 'The HUD For Other Operators': 'Platform.Lumen', 'Rate Data As A Subscription For Small Plans': 'Third Horizon', 'The Case For Boring Infrastructure': 'Public Voice', 'A Playlist For Each Main Mission': 'Platform.Lumen', 'A Yearly Family Field Guide': 'Family', 'Lumen Reads The Week Back To Me On Sunday': 'Platform.Lumen' }

const TODAY = [
  { t: 'Title idea: The Last Door That Stays Open', to: 'Ten Hospitals, One Safety Net', src: 'recon', layer: true },
  { t: 'Extractions feel like the end of a raid', to: 'Mileage As A Game Loop For Real Work', src: 'voice', layer: true },
  { t: 'Lumen is the product, the HUD is the room', to: 'The HUD For Other Operators', src: 'recon', layer: true },
  { t: 'With the miles at the end', to: 'Lumen Reads The Week Back To Me On Sunday', src: 'typed', layer: true },
]

const CSS = `
:root { --ink:#F3F1EA; --ink2:rgba(243,241,234,.70); --ink3:rgba(243,241,234,.44); --line:rgba(255,255,255,.12); --navy:#0F2334; --deep:#0D1D2C; --accent:#8ACAFF; --gold:#F8C761; --serif:'Lora',Georgia,serif; --sans:'Instrument Sans',system-ui,sans-serif; }
* { box-sizing:border-box; }
body { margin:0; background:var(--navy); color:var(--ink); font-family:var(--sans); }
button { font-family:inherit; cursor:pointer; }
.shell { display:grid; grid-template-columns:248px 1fr; min-height:100vh; }
.side { background:var(--deep); border-right:1px solid var(--line); padding:26px 18px; }
.brand { font:600 13px var(--sans); letter-spacing:.22em; text-transform:uppercase; line-height:1.5; }
.brand span { display:block; font-weight:500; font-size:11px; color:var(--gold); margin-top:6px; }
.grp { font-size:12.5px; color:var(--ink3); margin:26px 0 8px 10px; }
.nav { display:flex; align-items:center; gap:12px; padding:8px 10px; border-radius:8px; font-size:14.5px; color:var(--ink2); }
.nav.on { color:var(--ink); background:rgba(255,255,255,.06); box-shadow:inset 2px 0 0 var(--accent); }
.main { display:grid; grid-template-columns:1fr auto; }
.page { padding:44px 40px 60px; max-width:1180px; width:100%; margin:0 auto; }
.head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:26px; }
h1 { font:500 40px/1.1 var(--serif); letter-spacing:-.008em; margin:0; }
.sub { font-size:15px; color:var(--ink2); margin-top:8px; }
.seg { display:flex; border:1px solid var(--line); border-radius:999px; padding:3px; }
.seg button { border:0; background:transparent; color:var(--ink2); font-size:13.5px; padding:7px 15px; border-radius:999px; }
.seg button.on { background:rgba(138,202,255,.14); color:var(--accent); }
.park { display:flex; align-items:center; gap:12px; border:1px solid var(--line); border-radius:16px; padding:10px 10px 10px 20px; background:rgba(255,255,255,.035); }
.park input { flex:1; background:transparent; border:0; outline:none; color:var(--ink); font:400 19px var(--serif); padding:10px 0; }
.park input::placeholder { color:var(--ink3); font-style:italic; }
.ib { width:42px; height:42px; border-radius:99px; display:inline-grid; place-items:center; border:1.5px solid rgba(243,241,234,.3); color:var(--ink2); background:transparent; }
.ib.go { border-color:var(--accent); color:var(--accent); }
.today { margin-top:30px; border-top:1px solid var(--line); padding-top:22px; }
.ex { font:500 20px/1.25 var(--serif); }
.exq { font-size:13.5px; color:var(--ink2); margin-top:4px; }
.chips { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:14px; }
.chip { display:grid; grid-template-columns:22px 1fr; gap:10px; border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
.chip .w { font:italic 400 15.5px/1.45 var(--serif); }
.chip .to { font-size:13px; color:var(--ink2); margin-top:4px; } .chip .to svg { vertical-align:-2px; margin:0 4px 0 0; }
.chip svg { color:var(--accent); margin-top:3px; }
.shelves { margin-top:34px; border-top:1px solid var(--line); padding-top:22px; }
.grid { columns:3 300px; column-gap:16px; margin-top:16px; }
.shelf { break-inside:avoid; border:1px solid var(--line); border-radius:14px; padding:16px 18px 8px; margin-bottom:16px; }
.sh { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
.sh .t { font:500 19px var(--serif); flex:1; }
.sh .n { font-size:13px; color:var(--ink2); }
.sh svg { color:var(--accent); }
.idea { display:grid; grid-template-columns:20px 1fr; gap:10px; padding:11px 0; border-top:1px solid rgba(255,255,255,.07); cursor:pointer; }
.idea:first-of-type { border-top:0; }
.idea:hover .it { color:var(--accent); }
.it { font:500 15.5px/1.4 var(--serif); }
.im { font-size:12.5px; color:var(--ink2); margin-top:3px; }
.stack { display:flex; flex-direction:column-reverse; justify-content:flex-end; gap:2px; padding-top:6px; }
.stack i { display:block; width:16px; height:3px; border-radius:2px; background:var(--accent); }
.idea.ripe .it::after { content:''; display:inline-block; width:7px; height:7px; border-radius:99px; background:var(--accent); margin-left:8px; box-shadow:0 0 0 4px rgba(138,202,255,.18); vertical-align:middle; }
.drawer { width:400px; border-left:1px solid var(--line); background:var(--deep); padding:30px 28px; position:sticky; top:0; height:100vh; overflow:auto; }
.dtop { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.dt { font:500 26px/1.2 var(--serif); }
.dm { font-size:13.5px; color:var(--ink2); margin-top:8px; display:flex; align-items:center; gap:7px; }
.lay { margin-top:26px; position:relative; }
.lay::before { content:''; position:absolute; left:10px; top:8px; bottom:8px; width:1px; background:var(--line); }
.ly { display:grid; grid-template-columns:22px 1fr; gap:14px; padding-bottom:20px; position:relative; }
.ly .b { width:21px; height:21px; border-radius:99px; background:var(--deep); border:1.5px solid var(--accent); display:grid; place-items:center; color:var(--accent); font-size:11px; font-weight:600; }
.ly .q { font:italic 400 16px/1.5 var(--serif); }
.ly .m { font-size:12.5px; color:var(--ink2); margin-top:4px; display:flex; align-items:center; gap:6px; }
.dact { display:flex; gap:10px; margin-top:8px; border-top:1px solid var(--line); padding-top:18px; }
.quiet { display:inline-flex; align-items:center; gap:8px; font:500 13.5px var(--sans); color:var(--ink); background:transparent; border:1px solid rgba(255,255,255,.22); border-radius:999px; padding:8px 15px; }
`

const Stack = ({ n }) => <div className="stack">{Array.from({ length: Math.min(n, 5) }, (_, i) => <i key={i} style={{ opacity: 0.35 + i * 0.16 }} />)}</div>
const SrcMark = ({ k, size = 13 }) => { const [I] = SRC[k]; return <I size={size} strokeWidth={1.7} /> }

// Hub and spoke (David 11/21, "like you can do in obsidian"): shelves are hubs, ideas orbit them, each layer is a spoke
// on its idea. Deterministic layout so the picture holds still.
const W = 1160, H = 820
function layout() {
  const hubs = SHELVES.map((s, i) => { const a = (i / SHELVES.length) * Math.PI * 2 - Math.PI / 2; return { ...s, x: W / 2 + Math.cos(a) * 450, y: H / 2 + Math.sin(a) * 320, a } })
  const nodes = []
  hubs.forEach(h => h.ideas.forEach((idea, j) => {
    const n = h.ideas.length, a = h.a + Math.PI + (n === 1 ? 0 : (j / (n - 1) - 0.5) * 1.4)
    nodes.push({ ...idea, shelf: h.k, icon: h.icon, hub: h, x: h.x + Math.cos(a) * 130, y: h.y + Math.sin(a) * 130, a })
  }))
  // Settle: ideas (with their label boxes) push each other and the hubs away; a spring keeps each near its hub.
  for (let it = 0; it < 400; it++) {
    nodes.forEach((p, i) => {
      nodes.forEach((q, k) => { if (k <= i) return; const dx = q.x - p.x, dy = q.y - p.y, ox = 190 - Math.abs(dx), oy = 62 - Math.abs(dy)
        if (ox > 0 && oy > 0) { if (ox / 190 < oy / 62) { const m = (dx >= 0 ? 1 : -1) * ox * 0.25; p.x -= m; q.x += m } else { const m = (dy >= 0 ? 1 : -1) * oy * 0.25; p.y -= m; q.y += m } } })
      hubs.forEach(h => { const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1; if (d < 95) { p.x += dx / d * (95 - d) * 0.3; p.y += dy / d * (95 - d) * 0.3 }
        const ly = h.y + (h.y > H / 2 ? 50 : -38), lx = p.x - h.x, lyy = (p.y + 34) - ly, ox = 170 - Math.abs(lx), oy = 40 - Math.abs(lyy); if (ox > 0 && oy > 0) { p.x += (lx >= 0 ? 1 : -1) * ox * 0.3 } })
      const dx = p.x - p.hub.x, dy = p.y - p.hub.y, d = Math.hypot(dx, dy) || 1; if (d > 150) { p.x -= dx / d * (d - 150) * 0.05; p.y -= dy / d * (d - 150) * 0.05 }
      p.x = Math.max(110, Math.min(W - 110, p.x)); p.y = Math.max(40, Math.min(H - 60, p.y))
    })
  }
  nodes.forEach(p => { const a = Math.atan2(p.y - p.hub.y, p.x - p.hub.x); p.spokes = p.layers.map((l, k) => { const b = a + ((k + 0.5) / p.layers.length - 0.5) * 2.6; return { ...l, x: p.x + Math.cos(b) * 26, y: p.y + Math.sin(b) * 26 } }) })
  return { hubs, nodes }
}
// Ideas that share a word across shelves get a faint thread, the way linked notes do.
const STOP = new Set(['a', 'the', 'for', 'of', 'on', 'to', 'as', 'or', 'one', 'me', 'who', 'where', 'you', 'run', 'back', 'each', 'and', 'in', 'it', 'is'])
const words = (t) => new Set(t.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !STOP.has(w)))
function MapView({ pick, onPick }) {
  const { hubs, nodes } = layout()
  const threads = []
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach(b => { if (a.shelf === b.shelf) return; const wa = words(a.t + ' ' + a.layers.map(l => l.words).join(' ')), wb = words(b.t + ' ' + b.layers.map(l => l.words).join(' ')); const hit = [...wa].filter(w => wb.has(w)); if (hit.length) threads.push([a, b, hit]) }))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 14, border: '1px solid var(--line)', borderRadius: 16, background: 'radial-gradient(circle at 50% 50%, rgba(138,202,255,.05), transparent 70%)' }}>
      {threads.map(([a, b, hit], i) => <path key={i} d={`M${a.x},${a.y} Q${W / 2},${H / 2} ${b.x},${b.y}`} fill="none" stroke="rgba(138,202,255,.16)" strokeDasharray="3 5"><title>{hit.join(', ')}</title></path>)}
      {nodes.map(n => <line key={'l' + n.t} x1={n.hub.x} y1={n.hub.y} x2={n.x} y2={n.y} stroke="rgba(255,255,255,.14)" />)}
      {nodes.map(n => n.spokes.map((s, k) => <g key={n.t + k}><line x1={n.x} y1={n.y} x2={s.x} y2={s.y} stroke="rgba(138,202,255,.3)" /><circle cx={s.x} cy={s.y} r={2.6} fill="#8ACAFF" opacity={0.75}><title>{s.words}</title></circle></g>))}
      {hubs.map(h => { const I = h.icon; return (
        <g key={h.k}>
          <circle cx={h.x} cy={h.y} r={26} fill="#0D1D2C" stroke="rgba(255,255,255,.22)" />
          <foreignObject x={h.x - 9} y={h.y - 9} width={18} height={18}><I size={18} strokeWidth={1.7} color="#8ACAFF" /></foreignObject>
          <text x={h.x} y={h.y + (h.y > H / 2 ? 50 : -38)} textAnchor="middle" fill="#F3F1EA" style={{ font: "500 17px 'Lora', serif" }}>{h.k}</text>
        </g>) })}
      {nodes.map(n => { const on = pick && pick.t === n.t, r = 5 + n.layers.length * 1.6; return (
        <g key={'n' + n.t} style={{ cursor: 'pointer' }} onClick={() => onPick(n)}>
          {on && <circle cx={n.x} cy={n.y} r={r + 7} fill="none" stroke="#8ACAFF" strokeOpacity={0.5} />}
          <circle cx={n.x} cy={n.y} r={r} fill={on ? '#8ACAFF' : '#16314A'} stroke="#8ACAFF" strokeWidth={1.4} />
          <text x={n.x} y={n.y + r + 34} textAnchor="middle" fill={on ? '#8ACAFF' : 'rgba(243,241,234,.78)'} style={{ font: "400 13px 'Instrument Sans', sans-serif" }}>{n.t.length > 28 ? n.t.slice(0, 27) + '…' : n.t}</text>
        </g>) })}
    </svg>
  )
}
function Cluster({ idea }) {
  const n = idea.layers.length, cx = 172, cy = 120
  return (
    <svg viewBox="0 10 344 220" style={{ width: '100%', marginTop: 10 }}>
      {idea.layers.map((l, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * 82, y = cy + Math.sin(a) * 82; return (
        <g key={i}><line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(138,202,255,.35)" />
          <circle cx={x} cy={y} r={12} fill="#0D1D2C" stroke="#8ACAFF" strokeWidth={1.4} /><text x={x} y={y + 4} textAnchor="middle" fill="#8ACAFF" style={{ font: "600 11px 'Instrument Sans', sans-serif" }}>{i + 1}</text>
          <text x={x + (Math.cos(a) >= 0 ? 18 : -18)} y={y + 4} textAnchor={Math.cos(a) >= 0 ? 'start' : 'end'} fill="rgba(243,241,234,.6)" style={{ font: "12px 'Instrument Sans', sans-serif" }}>{l.day}</text></g>) })}
      <circle cx={cx} cy={cy} r={20 + n * 2} fill="rgba(138,202,255,.14)" stroke="#8ACAFF" strokeWidth={1.6} />
      <foreignObject x={cx - 9} y={cy - 9} width={18} height={18}><Lightbulb size={18} color="#8ACAFF" strokeWidth={1.7} /></foreignObject>
    </svg>
  )
}

function App() {
  const [view, setView] = useState(new URLSearchParams(location.search).get('v') || 'concepts')
  const all = SHELVES.flatMap(s => s.ideas.map(i => ({ ...i, shelf: s.k, icon: s.icon })))
  const [pick, setPick] = useState(all[0])
  const groups = view === 'concepts' ? SHELVES.map(s => ({ k: s.k, icon: s.icon, ideas: s.ideas }))
    : Object.entries(all.reduce((m, i) => ((m[PROJECTS[i.t]] ||= []).push(i), m), {})).map(([k, ideas]) => ({ k, icon: k === 'Unfiled' ? Inbox : Mountain, ideas }))
  const sorted = (ideas) => [...ideas].sort((a, b) => b.layers.length - a.layers.length)
  return (
    <div className="shell">
      <style>{CSS}</style>
      <aside className="side">
        <div className="brand">Sovereign Architect<span>Command Center</span></div>
        {NAV.map(([g, items]) => <div key={g}><div className="grp">{g}</div>{items.map(([Icon, label, on]) => <div key={label} className={`nav${on ? ' on' : ''}`}><Icon size={16} strokeWidth={1.6} />{label}</div>)}</div>)}
      </aside>
      <div className="main">
        <div className="page">
          <div className="head">
            <div><h1>Ideas Board</h1><div className="sub">{all.length} Ideas · {SHELVES.length} Shelves · {TODAY.length} Parked Today</div></div>
            <div className="seg"><button className={view === 'concepts' ? 'on' : ''} onClick={() => setView('concepts')}>By Concept</button><button className={view === 'projects' ? 'on' : ''} onClick={() => setView('projects')}>By Project</button><button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>Map</button></div>
          </div>

          <div className="park">
            <input placeholder="Park it here, Lumen will shelve it" />
            <button className="ib" title="Say It"><Mic size={18} /></button>
            <button className="ib go" title="Park It"><Send size={17} /></button>
          </div>

          <div className="today">
            <div className="ex">Parked Today</div>
            <div className="chips">
              {TODAY.map(c => (
                <div key={c.t} className="chip" title={SRC[c.src][1]}>
                  <SrcMark k={c.src} size={15} />
                  <div><div className="w">{c.t}</div><div className="to"><Layers size={13} /> {SRC[c.src][1]} · New Layer On {c.to}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="shelves">
            <div className="ex">{view === 'concepts' ? 'The Shelves' : view === 'map' ? 'The Map' : 'By Project'}</div>
            {view === 'map' ? <MapView pick={pick} onPick={setPick} /> : <div className="grid">
              {groups.map(g => { const I = g.icon; return (
                <div key={g.k} className="shelf">
                  <div className="sh"><I size={17} strokeWidth={1.7} /><span className="t">{g.k}</span><span className="n">{g.ideas.length}</span></div>
                  {sorted(g.ideas).map(i => (
                    <div key={i.t} className={`idea${i.layers.length >= 4 ? ' ripe' : ''}`} onClick={() => setPick({ ...i, shelf: i.shelf || g.k })}>
                      <Stack n={i.layers.length} />
                      <div><div className="it">{i.t}</div><div className="im">{i.layers.length} {i.layers.length === 1 ? 'Layer' : 'Layers'} · Last Came Out {i.layers[i.layers.length - 1].day}</div></div>
                    </div>
                  ))}
                </div>
              ) })}
            </div>}
          </div>
        </div>

        {pick && (
          <aside className="drawer">
            <div className="dtop"><div className="dt">{pick.t}</div><button className="ib" style={{ width: 34, height: 34 }} title="Close" onClick={() => setPick(null)}><X size={15} /></button></div>
            <div className="dm"><Layers size={14} /> {pick.layers.length} Layers · {pick.shelf} · {PROJECTS[pick.t]}</div>
            <Cluster idea={pick} />
            <div className="lay">
              {[...pick.layers].reverse().map((l, i) => (
                <div key={i} className="ly">
                  <div className="b">{pick.layers.length - i}</div>
                  <div><div className="q">{l.words}</div><div className="m"><SrcMark k={l.src} /> {SRC[l.src][1]} · {l.day}</div></div>
                </div>
              ))}
            </div>
            <div className="dact">
              <button className="quiet" title="Move To Another Shelf"><FolderInput size={15} /> Move</button>
              <button className="quiet" title="Make It A Mission, Only When You Say So"><ArrowDownToLine size={15} /> Pull Down</button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
