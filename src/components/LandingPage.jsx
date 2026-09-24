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
import { AlertTriangle, Compass, Map as MapIcon, RefreshCw, BookmarkCheck } from 'lucide-react'
import { buildHaulItems } from '../lib/haul'
import { HaulOverlay, MintingOverlay } from './river/RiverOverlays'
import { supabase } from '../lib/supabase'
import { BADGES, RIVER_TOTAL_MILES, RIVER_START_DAY, WAYPOINTS } from '../constants/collection'
import {
  INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF,
  S, Eyebrow, Label, Stat, Panel, chiToday,
} from './river/canon'

// ---- Helpers ----------------------------------------------------------------
const DAY_MS = 86400000
const EMPTY = []
const fmtMiles = (m) => (Math.round(m * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })
const chiDayString = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const chiHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date()))
const greeting = () => { const h = chiHour(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const longDate = () => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
const shortDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const elapsed = (iso, now) => {
  if (!iso) return null
  const ms = Math.max(0, now - new Date(iso).getTime())
  const d = Math.floor(ms / DAY_MS), h = Math.floor((ms % DAY_MS) / 3600000), m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
const badgeLabel = (id) => (BADGES[id] && !BADGES[id].legacy ? BADGES[id].label : id)

// The serpentine: five horizontal runs joined by half-circle turns, viewBox 1000 x 420.
const RIVER_PATH = 'M 80 50 H 900 A 40 40 0 0 1 900 130 H 100 A 40 40 0 0 0 100 210 H 900 A 40 40 0 0 1 900 290 H 100 A 40 40 0 0 0 100 370 H 920'

const css = `
.river-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; align-items: start; }
@media (max-width: 900px) { .river-grid { grid-template-columns: 1fr; } }
.river-odometer { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 14px; }
@keyframes river-pulse { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.6); } }
.river-glow { transform-box: fill-box; transform-origin: center; animation: river-pulse 2.4s ease-in-out infinite; }
.river-travelled { transition: stroke-dashoffset 1.2s ease-out; }
.river-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.16); background: transparent; color: rgba(234,241,248,0.7); font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; font-family: inherit; }
.river-btn:hover { border-color: ${BLUE}; color: ${INK}; }
`

// ---- The river graphic --------------------------------------------------------
function RiverGraphic({ miles, awards }) {
  const pathRef = useRef(null)
  const [geom, setGeom] = useState(null)   // { len, way: [{x,y,...}], marker: {x,y}, dots: [{x,y}] }
  const [drawn, setDrawn] = useState(false)
  const frac = Math.min(1, miles / RIVER_TOTAL_MILES)

  useLayoutEffect(() => {
    const p = pathRef.current
    if (!p) return
    const len = p.getTotalLength()
    const at = (f) => { const pt = p.getPointAtLength(Math.min(1, Math.max(0, f)) * len); return { x: pt.x, y: pt.y } }
    setGeom({
      len,
      way: WAYPOINTS.map(w => ({ ...w, ...at(w.at / RIVER_TOTAL_MILES) })),
      marker: at(frac),
      dots: awards.map(a => at(a.cum / RIVER_TOTAL_MILES)),
    })
    const id = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(id)
  }, [frac, awards])

  const len = geom?.len ?? 0
  const offset = drawn ? len * (1 - frac) : len

  return (
    <svg viewBox="0 0 1000 420" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`${fmtMiles(miles)} of ${RIVER_TOTAL_MILES.toLocaleString()} miles`}>
      <defs>
        <linearGradient id="river-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={GOLD} /><stop offset="1" stopColor={GOLD_BRIGHT} />
        </linearGradient>
        <radialGradient id="river-glow-grad"><stop offset="0" stopColor={GOLD_BRIGHT} stopOpacity="0.9" /><stop offset="1" stopColor={GOLD_BRIGHT} stopOpacity="0" /></radialGradient>
      </defs>
      {/* Full course, faint */}
      <path ref={pathRef} d={RIVER_PATH} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      {/* Travelled stretch, gold */}
      {len > 0 ? (
        <path className="river-travelled" d={RIVER_PATH} fill="none" stroke="url(#river-gold)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={len} strokeDashoffset={offset} />
      ) : null}
      {/* Badge points along the travelled stretch */}
      {geom ? geom.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="3" fill={BLUE} opacity="0.6" />) : null}
      {/* Waypoints */}
      {geom ? geom.way.map((w, i) => {
        const passed = miles >= w.at
        const end = i === 0 || i === geom.way.length - 1
        const anchor = i === 0 ? 'start' : i === geom.way.length - 1 ? 'end' : 'middle'
        return (
          <g key={w.label}>
            <circle cx={w.x} cy={w.y} r={end ? 5 : 3.5} fill={passed ? GOLD : '#0E2336'} stroke={passed ? GOLD_BRIGHT : 'rgba(255,255,255,0.35)'} strokeWidth="1.5" />
            <text x={w.x} y={w.y + 22} textAnchor={anchor} fill={end ? INK2 : GRAY} fontFamily={MONO} fontSize={end ? 11 : 9} letterSpacing="1">{w.label.toUpperCase()}</text>
          </g>
        )
      }) : null}
      {/* Current position */}
      {geom ? (
        <g>
          <circle className="river-glow" cx={geom.marker.x} cy={geom.marker.y} r="18" fill="url(#river-glow-grad)" />
          <circle cx={geom.marker.x} cy={geom.marker.y} r="6.5" fill={GOLD_BRIGHT} stroke="#0E2336" strokeWidth="2" />
          <text x={geom.marker.x} y={geom.marker.y - 16} textAnchor="middle" fill={GOLD_BRIGHT} fontFamily={MONO} fontSize="10" letterSpacing="1">{fmtMiles(miles)} MI</text>
        </g>
      ) : null}
    </svg>
  )
}

// ---- Page -------------------------------------------------------------------------
export default function LandingPage({ onNavigate }) {
  const [ledger, setLedger] = useState(null)       // ascending by awarded_at
  const [board, setBoard] = useState([])           // active objectives
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
    load().catch(e => console.error('[River]', e))
    const id = setInterval(() => load().catch(e => console.error('[River]', e)), 60000)
    return () => { aliveRef.current = false; clearInterval(id) }
  }, [load])

  // Run Update and Close the Day live here: the Ledger is read, the narrative
  // composed, the River struck, and the result shown as a ceremony.
  const [running, setRunning] = useState(false)
  const [closing, setClosing] = useState(false)
  const [haul, setHaul] = useState(null)
  const [mint, setMint] = useState(null)
  const [runError, setRunError] = useState(null)
  const sumMiles = (rows, day) => rows.filter(r => !day || r.day === day).reduce((a, r) => a + (Number(r.miles) || 0), 0)
  const runUpdate = useCallback(async () => {
    if (running || closing) return
    setRunning(true); setRunError(null)
    const t0 = chiToday()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const before = ledger || []
      const beforeIds = new Set(before.map(r => r.id))
      const { data: prevRows } = await supabase.from('daily_performance').select('*').eq('day', t0).order('generated_at', { ascending: false })
      const res = await fetch('/api/refresh', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`)
      const after = (await load()) || []
      const { data: rowsNow } = await supabase.from('daily_performance').select('*').eq('day', t0).order('generated_at', { ascending: false })
      const nowRow = rowsNow && rowsNow[0]
      const items = nowRow ? buildHaulItems(nowRow, rowsNow) : []
      const fresh = after.filter(r => !beforeIds.has(r.id) && r.day === t0)
      const evidence = {}
      for (const r of fresh) evidence[r.badge] = evidence[r.badge] ? `${evidence[r.badge]} · ${r.evidence}` : r.evidence
      const prev = prevRows && prevRows[0]
      setHaul({
        items, badges: [...new Set(fresh.map(r => r.badge))], badge_evidence: evidence,
        milesDelta: sumMiles(fresh), milesToday: sumMiles(after, t0), total: sumMiles(after),
        sinceLabel: prev && prev.generated_at ? new Date(prev.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : 'this morning',
      })
    } catch (e) {
      setRunError(String(e.message || e))
    } finally {
      setRunning(false)
    }
  }, [running, closing, ledger, load])
  const closeDay = useCallback(async () => {
    if (running || closing) return
    if (!window.confirm('Close the day now? This mints today, strikes the River, and writes the Daily Report.')) return
    setClosing(true); setRunError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const res = await fetch('/api/close', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`)
      const after = (await load()) || []
      const day = out.day || chiToday()
      const dayRows = after.filter(r => r.day === day)
      const evidence = {}
      for (const r of dayRows) evidence[r.badge] = evidence[r.badge] ? `${evidence[r.badge]} · ${r.evidence}` : r.evidence
      setMint({ day, badges: [...new Set(dayRows.map(r => r.badge))], badge_evidence: evidence, miles: sumMiles(dayRows), total: sumMiles(after) })
    } catch (e) {
      setRunError(String(e.message || e))
    } finally {
      setClosing(false)
    }
  }, [running, closing, load])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // Odometer math, all in Chicago days.
  const today = chiToday()
  const yesterday = chiDayString(new Date(new Date(today + 'T12:00:00').getTime() - DAY_MS))
  const rows = ledger ?? EMPTY
  const { total, todayMiles, yMiles, awards } = useMemo(() => {
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
  const recent = rows.slice(-8).reverse()

  // Activity Monitor math.
  const oldest = board.find(o => o.activated_at)
  const emergencies = board.filter(o => o.is_emergency).length

  return (
    <div style={S.page}>
      <style>{css}</style>
      {haul && <HaulOverlay haul={haul} onClose={() => setHaul(null)} />}
      {mint && <MintingOverlay mint={mint} onDone={() => setMint(null)} />}
      <Eyebrow>The River</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={S.h1}>{greeting()}, David. {longDate()}.</h1>
          <p style={S.sub}>{RIVER_TOTAL_MILES.toLocaleString()} miles to Calm Water</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
          <button onClick={runUpdate} disabled={running || closing} title="Read the Ledger, compose the narrative, strike the River" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, padding: '9px 14px', borderRadius: 10, cursor: running ? 'default' : 'pointer', border: 'none',
            background: running ? 'rgba(230,181,79,0.35)' : GOLD_BRIGHT, color: '#16324A',
          }}>
            <RefreshCw size={13} style={running ? { animation: 'spin 1.2s linear infinite' } : undefined} /> {running ? 'Composing…' : 'Run Update'}
          </button>
          <button onClick={closeDay} disabled={running || closing} title="Mint the day: final sweep, Daily Report, River struck" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, padding: '9px 14px', borderRadius: 10, cursor: closing ? 'default' : 'pointer',
            border: `1px solid ${GOLD_BRIGHT}`, background: 'transparent', color: GOLD_BRIGHT,
          }}>
            <BookmarkCheck size={13} /> {closing ? 'Minting…' : 'Close the Day'}
          </button>
        </div>
      </div>
      {runError && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: '#E8836F', marginTop: 8 }}>UPDATE FAILED · {runError.toUpperCase()}</div>}

      {ledger === null ? (
        <div style={{ ...S.sub, marginTop: 24, textTransform: 'none', letterSpacing: '0.6px' }}>Loading the river…</div>
      ) : (
      <div className="river-odometer" style={{ marginTop: 24 }}>
        <Stat v={fmtMiles(total)} l="Miles banked" color={GOLD_BRIGHT} />
        <Stat v={fmtMiles(todayMiles)} l="Today" />
        <Stat v={fmtMiles(yMiles)} l="Yesterday" />
        <Stat v={daysOn} l={daysOn === 1 ? 'Day on the river' : 'Days on the river'} />
        <Stat v={fmtMiles(remaining)} l="Remaining to Calm Water" />
      </div>
      )}

      <div className="river-grid" style={{ marginTop: 24 }}>
        {/* LEFT: river, recent miles */}
        <div>
          {ledger !== null && (
            <>
              <Panel style={{ marginTop: 24, padding: '12px 8px 4px' }}>
                <RiverGraphic miles={total} awards={awards} />
              </Panel>

              <Panel title="Recent miles">
                {recent.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: INK2 }}>No miles on the board yet. The river starts today.</div>
                ) : recent.map((r, i) => (
                  <div key={r.key || `${r.awarded_at}-${i}`} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 12, alignItems: 'baseline', padding: '6px 0', borderTop: i === 0 ? 'none' : `1px solid ${PANEL_BORDER}` }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{shortDay(r.day)}</span>
                    <span style={{ fontSize: 12.5, color: INK, minWidth: 0 }}>
                      {badgeLabel(r.badge)}
                      {r.evidence ? <span style={{ color: GRAY, marginLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '60%', verticalAlign: 'bottom' }}>{r.evidence}</span> : null}
                    </span>
                    <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: GOLD_BRIGHT, letterSpacing: '-0.01em' }}>+{fmtMiles(Number(r.miles) || 0)}</span>
                  </div>
                ))}
              </Panel>
            </>
          )}
        </div>

        {/* RIGHT: Activity Monitor */}
        <Panel title="Activity Monitor" style={{ marginTop: 0 }}>
          {board.length === 0 ? (
            <div style={{ fontSize: 12.5, color: INK2 }}>Nothing on the board. Put something on it from Side Missions.</div>
          ) : board.map((o, i) => {
            const clock = elapsed(o.activated_at, now)
            const proj = projectByObj[o.id]
            return (
              <div key={o.id} style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${PANEL_BORDER}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {o.is_emergency ? <AlertTriangle size={13} color={RED} style={{ flexShrink: 0, marginTop: 2 }} /> : null}
                  <div style={{ fontSize: 13, color: INK, lineHeight: 1.4, flex: 1, minWidth: 0 }}>{o.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                  {clock ? <span style={{ ...S.chip('rgba(255,255,255,0.06)', GREEN), textTransform: 'none', fontFamily: MONO }}>{clock}</span> : null}
                  {proj ? <span style={S.chip(`${BLUE}22`, BLUE)}>{proj}</span> : null}
                  {o.is_emergency ? <span style={S.chip(`${RED}22`, RED)}>Emergency</span> : null}
                </div>
              </div>
            )
          })}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}` }}>
            <Stat v={board.length} l="On the board" />
            <Stat v={oldest ? elapsed(oldest.activated_at, now) : '0m'} l="Longest running" />
            <Stat v={emergencies} l="Emergencies" color={emergencies > 0 ? RED : '#fff'} />
          </div>

          <Label style={{ marginTop: 18 }}>Go to</Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="river-btn" onClick={() => nav('side-missions')}><Compass size={12} /> Open Side Missions</button>
            <button className="river-btn" onClick={() => nav('main-missions')}><MapIcon size={12} /> Main Missions</button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
