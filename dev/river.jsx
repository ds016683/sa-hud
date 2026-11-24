// Dev mock-up: The River, in the refresh's language (David 11/24: "how about an aesthetic reboot on this one?").
// Step 7 of the refresh. The same facts the landing page shows today (miles banked, today, yesterday, days on the river,
// the next city, the day's ledger, what is loaded) with no kicker, no tracked uppercase, no boxed panels, no gold and no
// status sentences: a state is drawn. A picture to rule on: sample data, nothing is read or written.
// ?day=empty stages a morning with nothing minted; ?run=1 stages a clock running.
import { StrictMode, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, LayoutGrid, BookOpen, Activity, Award, FileText, PenTool, Mic, PenLine, BookMarked, Mountain, Briefcase, Target, Wrench, Archive,
  DoorOpen, Timer, Sunrise, Dumbbell, Mail, Flag, Moon, Sparkles } from 'lucide-react'

const NAV = [
  ['Landing', [[Waves, 'The River', true], [Footprints, 'Journey']]],
  ['Monitor', [[CalendarDays, 'Board'], [LayoutGrid, 'Dashboard'], [BookOpen, 'Narrative And Analytics'], [Activity, 'Activity'], [Award, 'Accomplishments'], [FileText, 'Notes'], [PenTool, 'Scratchpad'], [Mic, 'Speeches'], [PenLine, 'Writings'], [BookMarked, 'Reading']]],
  ['Mission Board', [[Mountain, 'Main Missions'], [Briefcase, 'Clients'], [Target, 'Side Missions'], [Wrench, 'Maintenance'], [Archive, 'Archive']]],
]

const PURPLE = '#B4A3E8', BLUE = '#8ACAFF', GREEN = '#57BE97'
const TOTAL = 10535
const WAY = [[0, 'Provo'], [1650, 'Dayton'], [3320, 'Sandy'], [4405, 'Overland Park'], [6205, 'Pleasanton'], [8005, 'Lenexa'], [9095, 'Orem'], [9135, 'Salt Lake City'], [10535, 'Western Springs']]
const q = new URLSearchParams(window.location.search)
const EMPTY_DAY = q.get('day') === 'empty', RUNNING = q.get('run') === '1'

const MILES = 3655 + (EMPTY_DAY ? 0 : 52)
const TODAY = EMPTY_DAY ? [] : [
  { at: '11:53 AM', icon: DoorOpen, what: 'Gate Extracted', on: 'A Side Mission · Gate 4', miles: 7 },
  { at: '11:53 AM', icon: DoorOpen, what: 'Gate Extracted', on: 'A Side Mission · Gate 3', miles: 7 },
  { at: '11:53 AM', icon: DoorOpen, what: 'Gate Extracted', on: 'A Side Mission · Gate 2', miles: 7 },
  { at: '10:40 AM', icon: Timer, what: 'Run Extracted', on: 'Run 1 · 45 Minutes · 1 Mission Hit', miles: 10 },
  { at: '8:12 AM', icon: Mail, what: 'Inbox Cleared', on: 'E-mail Refresh · 34 Minutes', miles: 4 },
  { at: '6:45 AM', icon: Dumbbell, what: 'Workout', on: '40 Minutes', miles: 7 },
  { at: '5:58 AM', icon: Sunrise, what: 'Morning Protocol', on: 'Done By 6:00', miles: 10 },
]
const YESTERDAY = [
  { at: '11:05 PM', icon: Moon, what: 'Day Closed', on: 'Daily Report', miles: 4 },
  { at: '6:24 PM', icon: Timer, what: 'Run Extracted', on: 'Run 2 · 45 Minutes · 1 Mission Hit', miles: 10 },
  { at: '5:50 PM', icon: DoorOpen, what: 'Gate Extracted', on: 'A Main Mission · Gate 3', miles: 7 },
  { at: '5:44 PM', icon: DoorOpen, what: 'Gate Extracted', on: 'A Main Mission · Gate 2', miles: 7 },
  { at: '5:41 PM', icon: DoorOpen, what: 'Gate Extracted', on: 'A Main Mission · Gate 1', miles: 7 },
  { at: '5:38 PM', icon: Timer, what: 'Run Extracted', on: 'Run 1 · 45 Minutes · 1 Mission Hit', miles: 10 },
  { at: '4:53 PM', icon: Flag, what: 'Full Day', on: '17.8 Hours In Harvest', miles: 4 },
  { at: '4:53 PM', icon: Award, what: 'Work Horse', on: 'Past Ten Hours', miles: 10 },
]
const SLOTS = [
  { name: 'Primary', c: PURPLE, title: 'Payment Emails', gate: 'Gate 5', clock: RUNNING ? '0h 22m' : '0h 14m', running: RUNNING },
  { name: 'Secondary', c: BLUE, title: 'Company Plan', gate: 'Gate 4', clock: '1h 05m', running: false },
  { name: 'Utility', c: GREEN, title: null },
]

const CSS = `
:root { --ink:#F3F1EA; --ink2:rgba(243,241,234,.70); --ink3:rgba(243,241,234,.44); --line:rgba(255,255,255,.12); --navy:#0F2334; --deep:#0D1D2C; --accent:#8ACAFF; --serif:'Lora',Georgia,serif; --sans:'Instrument Sans',system-ui,sans-serif; }
* { box-sizing:border-box; }
body { margin:0; background:var(--navy); color:var(--ink); font-family:var(--sans); }
button { font-family:inherit; cursor:pointer; color:inherit; }
.rv-shell { display:grid; grid-template-columns:248px 1fr; min-height:100vh; }
.rv-side { background:var(--deep); border-right:1px solid var(--line); padding:26px 18px; }
.rv-brand { font:500 19px var(--serif); padding-left:10px; }
.rv-grp { font-size:12.5px; color:var(--ink3); margin:24px 0 8px 10px; }
.rv-nav { display:flex; align-items:center; gap:12px; padding:7px 10px; border-radius:8px; font-size:14.5px; color:var(--ink2); }
.rv-nav.on { color:var(--ink); background:rgba(255,255,255,.06); box-shadow:inset 2px 0 0 var(--accent); }
.rv-page { padding:44px 48px 80px; max-width:1280px; width:100%; margin:0 auto; }

/* the head: the greeting, the day, and one light for the last update */
.rv-head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; }
h1 { font:500 40px/1.1 var(--serif); letter-spacing:-.008em; margin:0; }
.rv-day { font-size:15.5px; color:var(--ink2); margin-top:9px; }
.rv-upd { display:inline-flex; align-items:center; gap:10px; font-size:14px; color:var(--ink2); border:1px solid var(--line); border-radius:99px; padding:8px 16px 8px 12px; background:none; }
.rv-upd i { width:9px; height:9px; border-radius:99px; background:var(--c); box-shadow:0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent); }

/* the count: one number that matters, the rest beside it on one line */
.rv-count { display:grid; grid-template-columns:auto 1fr; gap:56px; align-items:end; margin-top:40px; }
.rv-big { font:500 104px/.9 var(--serif); letter-spacing:-.03em; background:linear-gradient(100deg, #B4A3E8, #8ACAFF); -webkit-background-clip:text; background-clip:text; color:transparent; }
.rv-bigl { font-size:15.5px; color:var(--ink2); margin-top:14px; }
.rv-bigl b { color:var(--ink); font-weight:600; }
.rv-facts { display:grid; grid-template-columns:repeat(4, 1fr); border-top:1px solid var(--line); }
.rv-fact { padding:16px 0 4px 20px; border-left:1px solid var(--line); }
.rv-fact:first-child { border-left:0; padding-left:0; }
.rv-fact b { display:block; font:500 34px/1.05 var(--serif); letter-spacing:-.012em; }
.rv-fact span { display:block; font-size:13.5px; color:var(--ink2); margin-top:6px; }
.rv-fact.next b { color:#8ACAFF; }

/* the river */
.rv-river { margin-top:34px; }
.rv-river svg { display:block; width:100%; height:auto; overflow:visible; }
.rv-flow { transition:stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1); }
@keyframes rv-ring { 0% { r:9; opacity:.7 } 100% { r:30; opacity:0 } }
.rv-ring { animation:rv-ring 2.4s ease-out infinite; }
@keyframes rv-drift { to { stroke-dashoffset:-40; } }
.rv-current { animation:rv-drift 2.6s linear infinite; }

/* the section tag (canon) */
.rv-tag { display:flex; align-items:center; gap:14px; margin:0 0 18px; }
.rv-tag i { width:26px; height:2px; border-radius:2px; background:var(--accent); flex:none; }
.rv-tag b { font:500 19px/1 var(--serif); white-space:nowrap; }
.rv-tag u { flex:1; height:1px; background:var(--line); }
.rv-tag span { font-size:13.5px; color:var(--ink2); white-space:nowrap; display:inline-flex; align-items:center; gap:8px; }
.rv-cols { display:grid; grid-template-columns:minmax(0, 1.55fr) minmax(0, 1fr); gap:56px; margin-top:46px; align-items:start; }

/* the day's miles */
.rv-seg { display:inline-flex; border:1px solid var(--line); border-radius:999px; padding:3px; }
.rv-seg button { border:0; background:transparent; color:var(--ink2); font-size:13.5px; padding:6px 14px; border-radius:999px; }
.rv-seg button.on { background:rgba(138,202,255,.14); color:var(--accent); }
.rv-row { display:grid; grid-template-columns:40px 1fr auto; gap:16px; align-items:center; padding:12px 0; border-top:1px solid rgba(255,255,255,.07); }
.rv-row:first-of-type { border-top:0; }
.rv-ic { width:40px; height:40px; border-radius:99px; border:1.4px solid color-mix(in srgb, #B4A3E8 60%, transparent); color:#B4A3E8; display:grid; place-items:center; }
.rv-what { font:500 17px/1.25 var(--serif); }
.rv-on { font-size:13.5px; color:var(--ink2); margin-top:3px; }
.rv-mi { font:500 22px/1 var(--serif); color:#B4A3E8; letter-spacing:-.01em; }
.rv-none { display:grid; gap:0; }
.rv-none div { height:64px; border-top:1px dashed rgba(255,255,255,.12); display:grid; grid-template-columns:40px 1fr; gap:16px; align-items:center; }
.rv-none div:first-child { border-top:0; }
.rv-none i { width:40px; height:40px; border-radius:99px; border:1.4px dashed rgba(255,255,255,.2); }
.rv-none u { height:9px; width:38%; border-radius:6px; background:rgba(255,255,255,.06); }

/* now: the three slots */
.rv-slot { display:grid; grid-template-columns:14px 1fr auto; gap:14px; align-items:center; padding:15px 18px; border:1px solid color-mix(in srgb, var(--c) 42%, transparent); border-radius:14px; margin-bottom:12px; background:color-mix(in srgb, var(--c) 5%, transparent); }
.rv-slot.empty { border-style:dashed; border-color:rgba(255,255,255,.16); background:none; }
.rv-pip { width:12px; height:12px; transform:rotate(45deg); border:1.6px solid var(--c); border-radius:2px; }
.rv-slot.loaded .rv-pip { background:var(--c); }
.rv-slot.running .rv-pip { box-shadow:0 0 0 5px color-mix(in srgb, var(--c) 22%, transparent); animation:rv-breathe 2s ease-in-out infinite; }
@keyframes rv-breathe { 50% { box-shadow:0 0 0 9px color-mix(in srgb, var(--c) 6%, transparent); } }
.rv-sn { font-size:13px; color:var(--c); font-weight:600; }
.rv-st { font:500 17px/1.25 var(--serif); margin-top:2px; }
.rv-sg { font-size:13.5px; color:var(--ink2); margin-top:2px; }
.rv-clock { font:500 19px var(--serif); color:var(--c); white-space:nowrap; }
.rv-slot.empty .rv-sn { color:var(--ink3); font-weight:500; }
.rv-go { display:flex; gap:26px; margin-top:22px; }
.rv-gob { display:grid; justify-items:center; gap:8px; background:none; border:none; padding:0; font-size:13.5px; color:var(--ink2); }
.rv-gob span { width:50px; height:50px; border-radius:99px; border:1.5px solid var(--c); color:var(--c); display:grid; place-items:center; }
.rv-gob:hover span { background:color-mix(in srgb, var(--c) 16%, transparent); }
`

// The course: three long runs and two wide bends, viewBox 1000 x 380.
const COURSE = 'M 50 64 H 880 A 66 66 0 0 1 880 196 H 120 A 66 66 0 0 0 120 328 H 950'

function River({ miles, todayMiles }) {
  const ref = useRef(null)
  const [g, setG] = useState(null)
  const [drawn, setDrawn] = useState(false)
  useLayoutEffect(() => {
    const p = ref.current, len = p.getTotalLength()
    const at = (m) => { const pt = p.getPointAtLength(Math.min(1, Math.max(0, m / TOTAL)) * len); return { x: pt.x, y: pt.y } }
    setG({ len, way: WAY.map(([m, name]) => ({ m, name, ...at(m) })), me: at(miles) })
    const id = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(id)
  }, [miles])
  const len = g?.len || 0, frac = miles / TOTAL
  const next = WAY.find(([m]) => m > miles)
  return (
    <svg viewBox="0 0 1000 380" role="img" aria-label={`${miles.toLocaleString()} of ${TOTAL.toLocaleString()} miles`}>
      <defs><linearGradient id="rv-water" gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="950" y2="0"><stop offset="0" stopColor="#B4A3E8" /><stop offset="1" stopColor="#8ACAFF" /></linearGradient></defs>
      {/* the banks, then the bed */}
      <path d={COURSE} fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="34" strokeLinecap="round" />
      <path ref={ref} d={COURSE} fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="12" strokeLinecap="round" />
      {/* the water behind him, and the current still moving in it */}
      {len > 0 && <path className="rv-flow" d={COURSE} fill="none" stroke="url(#rv-water)" strokeWidth="12" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={drawn ? len * (1 - frac) : len} />}
      {len > 0 && todayMiles > 0 && <path className="rv-flow" d={COURSE} fill="none" stroke="#F3F1EA" strokeWidth="12" strokeLinecap="butt" opacity=".9" strokeDasharray={`0 ${len * (frac - todayMiles / TOTAL)} ${len * todayMiles / TOTAL} ${len}`} />}
      {/* the cities */}
      {g && g.way.map((w, i) => {
        const passed = miles >= w.m, isNext = next && w.m === next[0], last = i === g.way.length - 1
        const prev = g.way[i - 1], crowded = prev && Math.hypot(w.x - prev.x, w.y - prev.y) < 70
        const bend = !last && i > 0 && (w.x > 900 ? 'right' : w.x < 100 ? 'left' : null)   // on a bend the name sits inside the curve
        const anchor = bend === 'right' ? 'end' : bend === 'left' ? 'start' : i === 0 ? 'start' : last ? 'end' : 'middle'
        return (
          <g key={w.name}>
            <circle cx={w.x} cy={w.y} r={isNext || last ? 8 : 6} fill={passed ? '#0F2334' : '#0F2334'} stroke={passed ? '#B4A3E8' : isNext ? '#8ACAFF' : 'rgba(243,241,234,.4)'} strokeWidth="2.2" />
            {passed && <circle cx={w.x} cy={w.y} r="2.6" fill="#B4A3E8" />}
            <text x={bend === 'right' ? w.x - 20 : bend === 'left' ? w.x + 20 : w.x} y={bend ? w.y + 5 : crowded ? w.y - 20 : w.y + 32} textAnchor={anchor} fill={passed ? '#F3F1EA' : isNext ? '#8ACAFF' : 'rgba(243,241,234,.5)'} fontFamily="Instrument Sans, sans-serif" fontSize="14" fontWeight={isNext ? 600 : 500}>{w.name}</text>
            {isNext && !bend && <text x={w.x} y={w.y + 50} textAnchor="middle" fill="rgba(243,241,234,.7)" fontFamily="Instrument Sans, sans-serif" fontSize="12.5">{(w.m - miles).toLocaleString()} Miles Ahead</text>}
          </g>
        )
      })}
      {/* where he is */}
      {g && (
        <g>
          <circle className="rv-ring" cx={g.me.x} cy={g.me.y} r="9" fill="none" stroke="#F3F1EA" strokeWidth="1.6" />
          <circle cx={g.me.x} cy={g.me.y} r="9" fill="#F3F1EA" stroke="#0F2334" strokeWidth="3" />
          <g transform={`translate(${g.me.x}, ${g.me.y - 40})`}>
            <rect x="-46" y="-17" width="92" height="30" rx="15" fill="#F3F1EA" />
            <path d="M -6 12 L 0 20 L 6 12 Z" fill="#F3F1EA" />
            <text x="0" y="4" textAnchor="middle" fill="#0F2334" fontFamily="Lora, Georgia, serif" fontSize="16" fontWeight="600">{miles.toLocaleString()}</text>
          </g>
        </g>
      )}
    </svg>
  )
}

const Tag = ({ name, children }) => <div className="rv-tag"><i /><b>{name}</b><u />{children && <span>{children}</span>}</div>

function App() {
  const [which, setWhich] = useState(TODAY.length ? 'today' : 'yesterday')
  const rows = which === 'today' ? TODAY : YESTERDAY
  const sum = (rs) => rs.reduce((s, r) => s + r.miles, 0)
  const todayMiles = sum(TODAY), next = WAY.find(([m]) => m > MILES), last = [...WAY].reverse().find(([m]) => m <= MILES)
  return (
    <div className="rv-shell"><style>{CSS}</style>
      <aside className="rv-side">
        <div className="rv-brand">Lumen</div>
        {NAV.map(([g, items]) => <div key={g}><div className="rv-grp">{g}</div>{items.map(([I, l, here]) => <div key={l} className={`rv-nav${here ? ' on' : ''}`}><I size={17} strokeWidth={1.7} />{l}</div>)}</div>)}
      </aside>
      <main className="rv-page">
        <div className="rv-head">
          <div><h1>Good Afternoon, David.</h1><div className="rv-day">Tuesday, November 24 · Day 63 On The River</div></div>
          <button className="rv-upd" style={{ '--c': PURPLE }} title="Run The Update" aria-label="Last update 11:06 PM, the day closed. Run the update."><i /><Sparkles size={15} color={PURPLE} />Last Update 11:06 PM</button>
        </div>

        <div className="rv-count">
          <div><div className="rv-big">{MILES.toLocaleString()}</div><div className="rv-bigl">Miles Banked · Past <b>{last[1]}</b></div></div>
          <div className="rv-facts">
            <div className="rv-fact"><b>{todayMiles}</b><span>Today</span></div>
            <div className="rv-fact"><b>{sum(YESTERDAY) - 4}</b><span>Yesterday</span></div>
            <div className="rv-fact next"><b>{(next[0] - MILES).toLocaleString()}</b><span>To {next[1]}</span></div>
            <div className="rv-fact"><b>{(TOTAL - MILES).toLocaleString()}</b><span>To Western Springs</span></div>
          </div>
        </div>

        <div className="rv-river"><River miles={MILES} todayMiles={todayMiles} /></div>

        <div className="rv-cols">
          <section>
            <Tag name="Miles">
              <span className="rv-seg">
                <button className={which === 'today' ? 'on' : ''} onClick={() => setWhich('today')}>Today · {todayMiles}</button>
                <button className={which === 'yesterday' ? 'on' : ''} onClick={() => setWhich('yesterday')}>Yesterday · {sum(YESTERDAY) - 4}</button>
              </span>
            </Tag>
            {rows.length ? rows.map((r, i) => { const I = r.icon; return (
              <div key={i} className="rv-row"><span className="rv-ic"><I size={18} strokeWidth={1.7} /></span><div><div className="rv-what">{r.what}</div><div className="rv-on">{r.at} · {r.on}</div></div><span className="rv-mi">+{r.miles}</span></div>) })
              : <div className="rv-none" aria-label="Nothing minted yet today"><div><i /><u /></div><div><i /><u style={{ width: '52%' }} /></div><div><i /><u style={{ width: '30%' }} /></div></div>}
          </section>

          <section>
            <Tag name="Now" />
            {SLOTS.map(s => s.title ? (
              <div key={s.name} className={`rv-slot loaded${s.running ? ' running' : ''}`} style={{ '--c': s.c }}>
                <i className="rv-pip" /><div><div className="rv-sn">{s.name}{s.running ? ' · Running' : ''}</div><div className="rv-st">{s.title}</div><div className="rv-sg">{s.gate}</div></div><span className="rv-clock">{s.clock}</span>
              </div>) : (
              <div key={s.name} className="rv-slot empty" style={{ '--c': 'rgba(243,241,234,.35)' }}><i className="rv-pip" /><div><div className="rv-sn">{s.name}</div></div><span /></div>))}
            <div className="rv-go">
              <button className="rv-gob" style={{ '--c': BLUE }}><span><CalendarDays size={21} /></span>The Board</button>
              <button className="rv-gob" style={{ '--c': PURPLE }}><span><Target size={21} /></span>Side Missions</button>
              <button className="rv-gob" style={{ '--c': GREEN }}><span><Footprints size={21} /></span>Journey</button>
            </div>
          </section>
        </div>
      </main>
    </div>)
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
