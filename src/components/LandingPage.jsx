// THE RIVER. The HUD's landing page. David is moving 10,535 miles down a river,
// from The Rock he was chained to, to Calm Water. Miles are the only currency:
// every row in miles_ledger is a badge that struck, and its miles move him.
// Each login shows (a) the odometer: miles banked, today, yesterday, days on
// the river, remaining, and (b) the river itself: a snaking progress bar drawn
// as SVG, waypoints at their mile markers, badge points along the travelled
// stretch, and a glowing marker at the current position. The right column is
// the Activity Monitor: everything on the board (active objectives) with live
// elapsed clocks. Data comes from Supabase (miles_ledger, objectives,
// project_tasks, projects) and refreshes every 60s.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Award, CalendarDays, DoorOpen, Dumbbell, Flag, Footprints, Mail, Moon, Mountain, Sparkles, Sunrise, Target, Timer, Wrench, Zap } from 'lucide-react'
import { buildHaulItems } from '../lib/haul'
import { fetchLoadout, fmtClock } from '../lib/loadout'
import { HaulOverlay, MintingOverlay } from './river/RiverOverlays'
import { supabase } from '../lib/supabase'
import { BADGES, RIVER_TOTAL_MILES, RIVER_START_DAY, WAYPOINTS, whereOnRiver } from '../constants/collection'
import { S, SectionTag, chiToday } from './river/canon'

// ---- Helpers ----------------------------------------------------------------
const DAY_MS = 86400000
const EMPTY = []
const fmtMiles = (m) => (Math.round(m * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })
const chiDayString = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const chiHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date()))
const greeting = () => { const h = chiHour(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const longDate = () => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
const badgeLabel = (id) => (BADGES[id] && !BADGES[id].legacy ? BADGES[id].label : id)

// The refresh, step 7 (David 11/24, on the mock-up dev/river.html: "loveeeee the different format. push it and show me"):
// no kicker, no tracked uppercase, no boxed panels, no gold, no status sentences. A state is drawn.
const PURPLE = '#B4A3E8', SKY = '#8ACAFF', MINT = '#57BE97', PAPER = '#F3F1EA', NAVY = '#0F2334'
const SLOT_TONES = [PURPLE, SKY]
// The course: three long runs and two wide bends, viewBox 1000 x 380.
const COURSE = 'M 50 64 H 880 A 66 66 0 0 1 880 196 H 120 A 66 66 0 0 0 120 328 H 950'
const BADGE_ICON = { gate: DoorOpen, 'mission-task': DoorOpen, 'mythic-task': DoorOpen, run: Timer, 'main-mission': Mountain, 'side-mission': Target, bounty: Target, contract: Target, mythic: Target,
  impromptu: Zap, exercise: Dumbbell, lift: Dumbbell, sleep: Moon, 'full-day': Flag, 'work-horse': Award, 'clean-close': Moon, devotional: Sunrise, correspondent: Mail, 'clean-slack': Mail, 'maintenance-bundle': Wrench }

const css = `
.rv { --ink:${PAPER}; --ink2:rgba(243,241,234,.70); --ink3:rgba(243,241,234,.44); --line:rgba(255,255,255,.12); --serif:'Lora',Georgia,serif; color:var(--ink); }
.rv button { font-family:inherit; cursor:pointer; color:inherit; }
.rv-head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; flex-wrap:wrap; }
.rv h1 { font:500 38px/1.1 var(--serif); letter-spacing:-.008em; margin:0; }
.rv-day { font-size:15.5px; color:var(--ink2); margin-top:9px; }
.rv-upd { display:inline-flex; align-items:center; gap:10px; font-size:14px; color:var(--ink2); border:1px solid var(--line); border-radius:99px; padding:8px 16px 8px 12px; }
.rv-upd i { width:9px; height:9px; border-radius:99px; background:var(--c); box-shadow:0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent); }
.rv-count { display:grid; grid-template-columns:auto 1fr; gap:56px; align-items:end; margin-top:38px; }
@media (max-width: 900px) { .rv-count { grid-template-columns:1fr; gap:24px; } .rv-cols { grid-template-columns:1fr !important; } }
.rv-big { font:500 104px/.9 var(--serif); letter-spacing:-.03em; background:linear-gradient(100deg, ${PURPLE}, ${SKY}); -webkit-background-clip:text; background-clip:text; color:transparent; min-height:94px; }
.rv-bigl { font-size:15.5px; color:var(--ink2); margin-top:14px; }
.rv-bigl b { color:var(--ink); font-weight:600; }
.rv-facts { display:grid; grid-template-columns:repeat(4, 1fr); border-top:1px solid var(--line); }
.rv-fact { padding:16px 0 4px 20px; border-left:1px solid var(--line); }
.rv-fact:first-child { border-left:0; padding-left:0; }
.rv-fact b { display:block; font:500 34px/1.05 var(--serif); letter-spacing:-.012em; }
.rv-fact span { display:block; font-size:13.5px; color:var(--ink2); margin-top:6px; }
.rv-fact.next b { color:${SKY}; }
.rv-river { margin-top:34px; }
.rv-river svg { display:block; width:100%; height:auto; overflow:visible; }
.rv-flow { transition:stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1); }
@keyframes rv-ring { 0% { r:9; opacity:.7 } 100% { r:30; opacity:0 } }
.rv-ring { animation:rv-ring 2.4s ease-out infinite; }
.rv-cols { display:grid; grid-template-columns:minmax(0, 1.55fr) minmax(0, 1fr); gap:56px; margin-top:46px; align-items:start; }
.rv-seg { display:inline-flex; border:1px solid var(--line); border-radius:999px; padding:3px; }
.rv-seg button { border:0; background:transparent; color:var(--ink2); font-size:13.5px; padding:6px 14px; border-radius:999px; }
.rv-seg button.on { background:rgba(138,202,255,.14); color:${SKY}; }
.rv-row { display:grid; grid-template-columns:40px 1fr auto; gap:16px; align-items:center; padding:12px 0; border-top:1px solid rgba(255,255,255,.07); }
.rv-row:first-of-type { border-top:0; }
.rv-ic { width:40px; height:40px; border-radius:99px; border:1.4px solid color-mix(in srgb, ${PURPLE} 60%, transparent); color:${PURPLE}; display:grid; place-items:center; }
.rv-what { font:500 17px/1.25 var(--serif); }
.rv-on { font-size:13.5px; line-height:1.45; color:var(--ink2); margin-top:3px; }
.rv-mi { font:500 22px/1 var(--serif); color:${PURPLE}; letter-spacing:-.01em; }
.rv-none div { height:64px; border-top:1px dashed rgba(255,255,255,.12); display:grid; grid-template-columns:40px 1fr; gap:16px; align-items:center; }
.rv-none div:first-child { border-top:0; }
.rv-none i { width:40px; height:40px; border-radius:99px; border:1.4px dashed rgba(255,255,255,.2); }
.rv-none u { height:9px; width:38%; border-radius:6px; background:rgba(255,255,255,.06); }
.rv-slot { display:grid; grid-template-columns:14px 1fr auto; gap:14px; align-items:center; width:100%; text-align:left; padding:15px 18px; border:1px solid color-mix(in srgb, var(--c) 42%, transparent); border-radius:14px; margin-bottom:12px; background:color-mix(in srgb, var(--c) 5%, transparent); }
.rv-slot.empty { border-style:dashed; border-color:rgba(255,255,255,.16); background:none; }
.rv-pip { width:12px; height:12px; transform:rotate(45deg); border:1.6px solid var(--c); border-radius:2px; }
.rv-slot.loaded .rv-pip { background:var(--c); }
.rv-slot.running .rv-pip { animation:rv-breathe 2s ease-in-out infinite; }
@keyframes rv-breathe { 0%, 100% { box-shadow:0 0 0 5px color-mix(in srgb, var(--c) 22%, transparent); } 50% { box-shadow:0 0 0 9px color-mix(in srgb, var(--c) 6%, transparent); } }
.rv-sn { font-size:13px; color:var(--c); font-weight:600; }
.rv-st { font:500 17px/1.25 var(--serif); margin-top:2px; }
.rv-sg { font-size:13.5px; color:var(--ink2); margin-top:2px; }
.rv-clock { font:500 19px var(--serif); color:var(--c); white-space:nowrap; }
.rv-slot.empty .rv-sn { color:var(--ink3); font-weight:500; }
.rv-go { display:flex; gap:26px; margin-top:22px; }
.rv-gob { display:grid; justify-items:center; gap:8px; background:none; border:none; padding:0; font-size:13.5px; color:var(--ink2); }
.rv-gob span { width:50px; height:50px; border-radius:99px; border:1.5px solid var(--c); color:var(--c); display:grid; place-items:center; transition:background .15s; }
.rv-gob:hover span { background:color-mix(in srgb, var(--c) 16%, transparent); }
`

// ---- The river graphic --------------------------------------------------------
function RiverGraphic({ miles, todayMiles }) {
  const pathRef = useRef(null)
  const [geom, setGeom] = useState(null)   // { len, way: [{x,y,...}], me: {x,y} }
  const [drawn, setDrawn] = useState(false)
  const frac = Math.min(1, miles / RIVER_TOTAL_MILES)

  useLayoutEffect(() => {
    const p = pathRef.current
    if (!p) return
    const len = p.getTotalLength()
    const at = (f) => { const pt = p.getPointAtLength(Math.min(1, Math.max(0, f)) * len); return { x: pt.x, y: pt.y } }
    setGeom({ len, way: WAYPOINTS.map(w => ({ ...w, ...at(w.at / RIVER_TOTAL_MILES) })), me: at(frac) })
    const id = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(id)
  }, [frac])

  const len = geom?.len ?? 0
  const next = WAYPOINTS.find(w => w.at > miles)
  const sans = "'Instrument Sans', system-ui, sans-serif"
  return (
    <svg viewBox="0 0 1000 380" role="img" aria-label={`${fmtMiles(miles)} of ${RIVER_TOTAL_MILES.toLocaleString()} miles`}>
      <defs><linearGradient id="rv-water" gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="950" y2="0"><stop offset="0" stopColor={PURPLE} /><stop offset="1" stopColor={SKY} /></linearGradient></defs>
      {/* the banks, then the bed */}
      <path d={COURSE} fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="34" strokeLinecap="round" />
      <path ref={pathRef} d={COURSE} fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="12" strokeLinecap="round" />
      {/* the water behind him; today's stretch reads lighter */}
      {len > 0 && <path className="rv-flow" d={COURSE} fill="none" stroke="url(#rv-water)" strokeWidth="12" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={drawn ? len * (1 - frac) : len} />}
      {len > 0 && drawn && todayMiles > 0 && <path d={COURSE} fill="none" stroke={PAPER} strokeWidth="12" strokeLinecap="butt" opacity=".9" strokeDasharray={`0 ${len * Math.max(0, frac - todayMiles / RIVER_TOTAL_MILES)} ${len * todayMiles / RIVER_TOTAL_MILES} ${len}`} />}
      {/* the cities */}
      {geom ? geom.way.map((w, i) => {
        const passed = miles >= w.at, isNext = next && w.at === next.at, last = i === geom.way.length - 1
        const prev = geom.way[i - 1], crowded = prev && Math.hypot(w.x - prev.x, w.y - prev.y) < 70
        const bend = !last && i > 0 && (w.x > 900 ? 'right' : w.x < 100 ? 'left' : null)   // on a bend the name sits inside the curve
        const anchor = bend === 'right' ? 'end' : bend === 'left' ? 'start' : i === 0 ? 'start' : last ? 'end' : 'middle'
        return (
          <g key={w.label}>
            <circle cx={w.x} cy={w.y} r={isNext || last ? 8 : 6} fill={NAVY} stroke={passed ? PURPLE : isNext ? SKY : 'rgba(243,241,234,.4)'} strokeWidth="2.2" />
            {passed && <circle cx={w.x} cy={w.y} r="2.6" fill={PURPLE} />}
            <text x={bend === 'right' ? w.x - 20 : bend === 'left' ? w.x + 20 : w.x} y={bend ? w.y + 5 : crowded ? w.y - 20 : w.y + 32} textAnchor={anchor} fill={passed ? PAPER : isNext ? SKY : 'rgba(243,241,234,.5)'} fontFamily={sans} fontSize="14" fontWeight={isNext ? 600 : 500}>{w.short || w.label}</text>
            {isNext && !bend && <text x={w.x} y={w.y + 50} textAnchor="middle" fill="rgba(243,241,234,.7)" fontFamily={sans} fontSize="12.5">{fmtMiles(w.at - miles)} Miles Ahead</text>}
          </g>
        )
      }) : null}
      {/* where he is */}
      {geom ? (
        <g>
          <circle className="rv-ring" cx={geom.me.x} cy={geom.me.y} r="9" fill="none" stroke={PAPER} strokeWidth="1.6" />
          <circle cx={geom.me.x} cy={geom.me.y} r="9" fill={PAPER} stroke={NAVY} strokeWidth="3" />
          <g transform={`translate(${geom.me.x}, ${geom.me.y - 40})`}>
            <rect x="-46" y="-17" width="92" height="30" rx="15" fill={PAPER} />
            <path d="M -6 12 L 0 20 L 6 12 Z" fill={PAPER} />
            <text x="0" y="4" textAnchor="middle" fill={NAVY} fontFamily="Lora, Georgia, serif" fontSize="16" fontWeight="600">{fmtMiles(miles)}</text>
          </g>
        </g>
      ) : null}
    </svg>
  )
}

// ---- Page -------------------------------------------------------------------------
export default function LandingPage({ onNavigate }) {
  const [ledger, setLedger] = useState(null)       // ascending by awarded_at
  const [board, setBoard] = useState([])           // active objectives
  const [lo, setLo] = useState(null)               // the Loadout (equipped item, slots, hours)
  const [projectByObj, setProjectByObj] = useState({})
  const [now, setNow] = useState(() => Date.now())
  const nav = (id) => { if (typeof onNavigate === 'function') onNavigate(id) }

  const aliveRef = useRef(true)
  const load = useCallback(async () => {
    const [led, objs, tasks, projs] = await Promise.all([
      supabase.from('miles_ledger').select('id, day, badge, key, miles, evidence, awarded_at').order('awarded_at', { ascending: true }),
      supabase.from('objectives').select('id, title, state, activated_at, due_date, is_emergency, deleted_at, kind').eq('state', 'active').is('deleted_at', null).order('activated_at', { ascending: true, nullsFirst: false }),
      supabase.from('project_tasks').select('objective_id, project_id').not('objective_id', 'is', null),
      supabase.from('projects').select('id, name'),
    ])
    if (!aliveRef.current) return null
    for (const r of [led, objs, tasks, projs]) if (r.error) console.error('[River]', r.error.message)
    setLedger(led.data || [])
    setBoard(objs.data || [])
    const names = new Map((projs.data || []).map(p => [p.id, p.name]))
    const map = {}
    for (const t of tasks.data || []) if (t.objective_id) map[t.objective_id] = names.get(t.project_id) || 'Main Mission'
    setProjectByObj(map)
    return led.data || []
  }, [])
  useEffect(() => {
    aliveRef.current = true
    Promise.resolve().then(() => load()).catch(e => console.error('[River]', e))
    const id = setInterval(() => load().catch(e => console.error('[River]', e)), 60000)
    return () => { aliveRef.current = false; clearInterval(id) }
  }, [load])

  // The ceremonies. Lumen runs the update and the close on David's word; the
  // HUD greets him with whatever landed since he last looked: the Haul after an
  // update, the Minting after a close. "Last looked" lives in localStorage.
  const [haul, setHaul] = useState(null)
  const [mint, setMint] = useState(null)
  const [lastRun, setLastRun] = useState(null)   // latest daily_performance row today
  const greeted = useRef(false)
  const sumMiles = (rows, day) => rows.filter(r => !day || r.day === day).reduce((a, r) => a + (Number(r.miles) || 0), 0)
  const readSeen = () => { try { return JSON.parse(localStorage.getItem('river-seen') || 'null') } catch { return null } }
  const writeSeen = (v) => { try { localStorage.setItem('river-seen', JSON.stringify(v)) } catch { /* no-op */ } }
  useEffect(() => {
    if (ledger === null || greeted.current) return
    greeted.current = true
    let alive = true
    ;(async () => {
      const t0 = chiToday()
      const { data: runs } = await supabase.from('daily_performance').select('id, day, model, generated_at, summary, accomplishments, noteworthy, must_do, scorecard').order('generated_at', { ascending: false }).limit(12)
      if (!alive) return
      const latest = (runs || [])[0] || null
      setLastRun(latest)
      const rows = ledger
      const maxId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0)
      const closes = (runs || []).filter(r => r.model === 'Daily Report' && (r.scorecard || {}).closed_at)
      const latestClose = closes[0] || null
      const seen = readSeen()
      // The miles marker belongs to the yay (river/AwardYay.jsx) since 11/19; the River keeps only its own two stamps.
      const marker = { ledgerMaxId: seen && seen.ledgerMaxId != null ? seen.ledgerMaxId : maxId, updateAt: latest ? latest.generated_at : null, closedAt: latestClose ? latestClose.scorecard.closed_at : null }
      if (!seen) { writeSeen(marker); return }
      const OLD_CEREMONIES = false   // the Haul and the day-close screen gave way to the one yay
      const fresh = rows.filter(r => (Number(r.id) || 0) > (seen.ledgerMaxId || 0))
      const evidence = (list) => { const e = {}; for (const r of list) e[r.badge] = e[r.badge] ? `${e[r.badge]} · ${r.evidence}` : r.evidence; return e }
      if (!OLD_CEREMONIES) { /* nothing to play here */ } else if (latestClose && latestClose.scorecard.closed_at !== seen.closedAt) {
        const day = latestClose.day
        const dayRows = rows.filter(r => r.day === day)
        setMint({ day, badges: [...new Set(dayRows.map(r => r.badge))], badge_evidence: evidence(dayRows), miles: sumMiles(dayRows), total: sumMiles(rows) })
      } else if ((latest && latest.generated_at !== seen.updateAt) || fresh.length) {
        const todayRuns = (runs || []).filter(r => r.day === t0)
        const items = latest && latest.day === t0 ? buildHaulItems(latest, todayRuns) : []
        setHaul({
          items, badges: [...new Set(fresh.map(r => r.badge))], badge_evidence: evidence(fresh),
          milesDelta: sumMiles(fresh), milesToday: sumMiles(rows, t0), total: sumMiles(rows),
          sinceLabel: seen.updateAt ? new Date(seen.updateAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : 'last look',
        })
      }
      writeSeen(marker)
    })().catch(e => console.error('[River] greeting', e))
    return () => { alive = false }
  }, [ledger])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // Odometer math, all in Chicago days.
  const today = chiToday()
  const yesterday = chiDayString(new Date(new Date(today + 'T12:00:00').getTime() - DAY_MS))
  const rows = ledger ?? EMPTY
  const { total, todayMiles, yMiles } = useMemo(() => {
    const acc = { total: 0, todayMiles: 0, yMiles: 0, withCum: [] }
    for (const r of rows) {
      const m = Number(r.miles) || 0
      acc.total += m
      if (r.day === today) acc.todayMiles += m
      if (r.day === yesterday) acc.yMiles += m
      acc.withCum.push({ ...r, cum: acc.total })
    }
    return { total: acc.total, todayMiles: acc.todayMiles, yMiles: acc.yMiles, awards: acc.withCum.slice(-60) }
  }, [rows, today, yesterday])
  const daysOn = Math.max(1, Math.floor((new Date(today + 'T12:00:00') - new Date(RIVER_START_DAY + 'T12:00:00')) / DAY_MS) + 1)
  const remaining = Math.max(0, RIVER_TOTAL_MILES - total)
  // Today's miles, newest first; yesterday's shown when today has none yet.
  const todayRows = rows.filter(r => r.day === today).sort((a, b) => String(b.awarded_at).localeCompare(String(a.awarded_at)))
  const yRows = rows.filter(r => r.day === yesterday).sort((a, b) => String(b.awarded_at).localeCompare(String(a.awarded_at)))
  const [pick, setPick] = useState(null)   // 'today' | 'yesterday'; until he picks, today when it has miles
  const which = pick || (todayRows.length ? 'today' : 'yesterday')
  const milesRows = which === 'today' ? todayRows : yRows
  const fmtAt = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

  useEffect(() => {
    let alive = true
    const pull = () => fetchLoadout().then(l => { if (alive) setLo(l) }).catch(() => {})
    pull()
    const t = setInterval(pull, 30_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const where = whereOnRiver(total)
  const closed = !!lastRun && lastRun.model === 'Daily Report'
  // Now: the Loadout's two slots and the Utility slot, each in its own color.
  const slots = lo ? [
    ...[0, 1].map(i => ({ name: ['Primary', 'Secondary'][i], c: SLOT_TONES[i], it: lo.board[i] || null })),
    { name: 'Utility', c: MINT, it: (lo.adhoc || [])[0] || null },
  ] : []

  return (
    <div className="rv" style={S.page}>
      <style>{css}</style>
      {haul && <HaulOverlay haul={haul} onClose={() => setHaul(null)} />}
      {mint && <MintingOverlay mint={mint} onDone={() => setMint(null)} />}
      <div className="rv-head">
        <div><h1>{greeting().replace(/\b[a-z]/g, c => c.toUpperCase())}, David.</h1><div className="rv-day">{longDate()} · Day {daysOn} On The River</div></div>
        {lastRun && <span className="rv-upd" style={{ '--c': closed ? PURPLE : MINT }} title={closed ? 'The Day Is Closed' : 'Last Update'}><i /><Sparkles size={15} color={closed ? PURPLE : MINT} />{closed ? 'Closed' : 'Last Update'} {fmtAt(lastRun.generated_at)}</span>}
      </div>

      <div className="rv-count">
        <div><div className="rv-big">{ledger === null ? '' : fmtMiles(total)}</div><div className="rv-bigl">Miles Banked · Past <b>{where.last.short}</b></div></div>
        <div className="rv-facts">
          <div className="rv-fact"><b>{ledger === null ? '·' : fmtMiles(todayMiles)}</b><span>Today</span></div>
          <div className="rv-fact"><b>{ledger === null ? '·' : fmtMiles(yMiles)}</b><span>Yesterday</span></div>
          <div className="rv-fact next"><b>{ledger === null ? '·' : fmtMiles(where.toNext)}</b><span>To {where.next.short}</span></div>
          <div className="rv-fact"><b>{ledger === null ? '·' : fmtMiles(remaining)}</b><span>To Western Springs</span></div>
        </div>
      </div>

      <div className="rv-river">{ledger !== null && <RiverGraphic miles={total} todayMiles={todayMiles} />}</div>

      <div className="rv-cols">
        <section>
          <SectionTag name="Miles">
            <span className="rv-seg">
              <button type="button" className={which === 'today' ? 'on' : ''} aria-pressed={which === 'today'} onClick={() => setPick('today')}>Today · {fmtMiles(todayMiles)}</button>
              <button type="button" className={which === 'yesterday' ? 'on' : ''} aria-pressed={which === 'yesterday'} onClick={() => setPick('yesterday')}>Yesterday · {fmtMiles(yMiles)}</button>
            </span>
          </SectionTag>
          {milesRows.length ? milesRows.map((r, i) => { const I = BADGE_ICON[r.badge] || Award; return (
            <div key={r.id || `${r.badge}-${r.key}-${i}`} className="rv-row">
              <span className="rv-ic"><I size={18} strokeWidth={1.7} /></span>
              <div style={{ minWidth: 0 }}><div className="rv-what">{badgeLabel(r.badge)}</div><div className="rv-on">{fmtAt(r.awarded_at)}{r.evidence ? ` · ${r.evidence}` : ''}</div></div>
              <span className="rv-mi">+{fmtMiles(Number(r.miles) || 0)}</span>
            </div>) })
            : <div className="rv-none" aria-label={which === 'today' ? 'Nothing minted yet today' : 'Nothing minted yesterday'}><div><i /><u /></div><div><i /><u style={{ width: '52%' }} /></div><div><i /><u style={{ width: '30%' }} /></div></div>}
        </section>

        <section>
          <SectionTag name="Now" />
          {slots.map(s => s.it ? (
            <button type="button" key={s.name} className={`rv-slot loaded${s.it.equipped ? ' running' : ''}`} style={{ '--c': s.c }} onClick={() => nav('agenda')} aria-label={`${s.name}: ${s.it.title}. Open the Board.`}>
              <i className="rv-pip" />
              <div style={{ minWidth: 0 }}><div className="rv-sn">{s.name}{s.it.equipped ? ' · Running' : ''}</div><div className="rv-st">{s.it.title}</div><div className="rv-sg">{[s.it.kind, s.it.project].filter(Boolean).join(' · ')}</div></div>
              <span className="rv-clock">{fmtClock(s.it.minutes_gate ?? s.it.minutes_today)}</span>
            </button>) : (
            <div key={s.name} className="rv-slot empty" style={{ '--c': 'rgba(243,241,234,.35)' }}><i className="rv-pip" /><div><div className="rv-sn">{s.name}</div></div><span /></div>))}
          <div className="rv-go">
            <button type="button" className="rv-gob" style={{ '--c': SKY }} onClick={() => nav('agenda')}><span><CalendarDays size={21} /></span>The Board</button>
            <button type="button" className="rv-gob" style={{ '--c': PURPLE }} onClick={() => nav('side-missions')}><span><Target size={21} /></span>Side Missions</button>
            <button type="button" className="rv-gob" style={{ '--c': MINT }} onClick={() => nav('journey')}><span><Footprints size={21} /></span>Journey</button>
          </div>
        </section>
      </div>
    </div>
  )
}
