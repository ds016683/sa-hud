// ACCOMPLISHMENTS. Badges only. Every badge carries miles; miles are the only
// thing that moves David down the river. Awards are struck server-side into
// miles_ledger; this page reads the ledger and presents the catalogue.
import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BADGES, RIVER_TOTAL_MILES, RIVER_START_DAY } from '../constants/collection'
import BadgeMedallion from './BadgeArt'
import {
  INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, MONO, SERIF,
  S, Eyebrow, Label, Stat, Panel, chiToday, fmtDay,
} from './river/canon'

// ---- Day helpers (Chicago day strings, YYYY-MM-DD)
const shiftDay = (day, n) => {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const weekBounds = (day) => {
  const dow = new Date(day + 'T12:00:00').getDay() // 0 = Sunday
  const mon = shiftDay(day, -((dow + 6) % 7))
  return { mon, sun: shiftDay(mon, 6) }
}
const fmtMiles = (m) => {
  const n = Number(m) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 1 ? 2 : 1).replace(/\.?0+$/, '')
}
const shortDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

const CATALOGUE = Object.entries(BADGES).filter(([, b]) => !b.legacy).map(([id, b]) => ({ id, ...b }))

// ---- Small pieces
const MilesChip = ({ miles, bright = false }) => (
  <span style={{ ...S.chip('rgba(248,199,97,0.10)', bright ? GOLD_BRIGHT : GOLD), border: `1px solid ${GOLD}55`, fontFamily: MONO, fontWeight: 600, fontSize: 9.5, letterSpacing: '1px', padding: '2px 8px' }}>
    {fmtMiles(miles)} MI
  </span>
)
const RepeatChip = () => (
  <span style={{ ...S.chip('transparent', BLUE), border: `1px solid ${BLUE}55`, fontFamily: MONO, fontWeight: 600, fontSize: 8.5, letterSpacing: '1px', padding: '1px 7px' }}>repeatable</span>
)

function DayControl({ day, onPrev, onNext, canNext }) {
  const btn = (disabled) => ({
    width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent',
    color: disabled ? GRAY : INK, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1,
  })
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button onClick={onPrev} style={btn(false)} aria-label="Previous day"><ChevronLeft size={14} /></button>
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', color: INK2, minWidth: 220, textAlign: 'center' }}>{fmtDay(day)}</span>
      <button onClick={canNext ? onNext : undefined} style={btn(!canNext)} aria-label="Next day" disabled={!canNext}><ChevronRight size={14} /></button>
    </div>
  )
}

function StruckRow({ row }) {
  const b = BADGES[row.badge]
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
      <BadgeMedallion id={row.badge} size={54} glow />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{b?.label || row.badge}</span>
          <MilesChip miles={row.miles} bright />
        </div>
        {row.evidence && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: INK2, marginTop: 5 }}>{row.evidence}</div>}
        {b?.lore && <div style={{ fontSize: 11.5, color: GRAY, fontStyle: 'italic', marginTop: 4 }}>{b.lore}</div>}
      </div>
    </div>
  )
}

function BadgeCard({ badge, history, onOpen }) {
  const n = history.length
  const last = n ? history[0].day : null
  return (
    <div onClick={() => onOpen(badge.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(badge.id) }} style={{
      ...S.panel, marginBottom: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
      opacity: n > 0 ? 1 : 0.85, transition: 'border-color 160ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}66` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = PANEL_BORDER }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <BadgeMedallion id={badge.id} size={48} earned={n > 0} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{badge.label}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <MilesChip miles={badge.miles} />
            {badge.repeatable && <RepeatChip />}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: INK2 }}>{badge.desc}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: GRAY, fontStyle: 'italic' }}>{badge.lore}</div>
      <div>
        <Label>How it is earned</Label>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: INK2 }}>{badge.desc}</div>
      </div>
      <div style={{ ...S.source, marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${PANEL_BORDER}`, color: n > 0 ? GOLD : GRAY }}>
        {n > 0 ? `struck ${n} time${n === 1 ? '' : 's'} · last ${shortDay(last)}` : 'never struck yet'}
      </div>
    </div>
  )
}

// The days since the river started, one cell each: gold when the badge
// struck (brighter with more strikes), hairline when it did not, blank ahead.
function DayGrid({ history }) {
  const today = chiToday()
  const byDay = {}
  for (const r of history) byDay[r.day] = (byDay[r.day] || 0) + 1
  const start = new Date(RIVER_START_DAY + 'T12:00:00')
  const end = new Date(today + 'T12:00:00')
  const days = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10))
  const lead = (start.getDay() + 6) % 7   // Monday-first
  const cells = [...Array(lead).fill(null), ...days]
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const struck = Object.keys(byDay).length
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Label style={{ marginBottom: 0 }}>Days on the river</Label>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GRAY }}>STRUCK {struck} OF {days.length} DAYS</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(7, 1fr)', gap: 4, alignItems: 'center' }}>
        <span />
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} style={{ fontFamily: MONO, fontSize: 9, color: GRAY, textAlign: 'center' }}>{d}</span>)}
        {weeks.map((w, wi) => (
          <Fragment key={wi}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: GRAY }}>{(w.find(Boolean) || '').slice(5).replace('-', '/')}</span>
            {w.map((d, di) => {
              if (!d) return <span key={di} />
              const n = byDay[d] || 0
              return (
                <div key={d} title={`${shortDay(d)}: ${n ? `struck ${n}x` : 'not struck'}`} style={{
                  height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: MONO, fontSize: 9.5, color: n ? '#16324A' : GRAY,
                  background: n ? (n > 1 ? GOLD_BRIGHT : GOLD) : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${n ? 'transparent' : PANEL_BORDER}`, opacity: n ? 1 : 0.8,
                }}>{n > 1 ? n : d.slice(8).replace(/^0/, '')}</div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function HistoryModal({ badgeId, history, onClose }) {
  const b = BADGES[badgeId]
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!b) return null
  const total = history.reduce((s, r) => s + (Number(r.miles) || 0), 0)
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 250, cursor: 'pointer',
      background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', cursor: 'default',
        background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <BadgeMedallion id={badgeId} size={64} earned={history.length > 0} glow={history.length > 0} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Award history</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{b.label}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <MilesChip miles={b.miles} />
              {b.repeatable && <RepeatChip />}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XIcon size={14} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: GRAY, fontStyle: 'italic', marginTop: 12 }}>{b.lore}</div>

        <DayGrid history={history} />

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <Label style={{ marginBottom: 0 }}>{history.length} award{history.length === 1 ? '' : 's'}</Label>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GOLD }}>{fmtMiles(total)} MI BANKED</span>
          </div>
          {history.length === 0 ? (
            <div style={{ fontSize: 12.5, color: GRAY, padding: '10px 0' }}>Never struck yet.</div>
          ) : (
            history.map((r, i) => (
              <div key={r.id || i} style={{ display: 'grid', gridTemplateColumns: '92px 56px 1fr', gap: 10, alignItems: 'start', padding: '9px 0', borderTop: i ? `1px solid ${PANEL_BORDER}` : 'none' }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.6px', color: INK2, paddingTop: 2 }}>{shortDay(r.day)}{r.day ? `, ${r.day.slice(0, 4)}` : ''}</div>
                <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: GOLD }}>{fmtMiles(r.miles)}<span style={{ fontSize: 9.5, fontFamily: MONO, color: GRAY, marginLeft: 3 }}>MI</span></div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: INK2 }}>{r.evidence || <span style={{ color: GRAY }}>no citation recorded</span>}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccomplishmentsPage() {
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState(chiToday)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data, error } = await supabase
        .from('miles_ledger')
        .select('id,day,badge,key,miles,evidence,awarded_at')
        .order('awarded_at', { ascending: false })
        .limit(5000)
      if (error) console.warn('miles_ledger fetch', error.message)
      if (alive) { setLedger(Array.isArray(data) ? data : []); setLoading(false) }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const today = chiToday()
  const { mon, sun } = weekBounds(today)

  const totals = useMemo(() => {
    const sum = (rows) => rows.reduce((s, r) => s + (Number(r.miles) || 0), 0)
    return {
      all: sum(ledger),
      week: sum(ledger.filter(r => r.day >= mon && r.day <= sun)),
      today: sum(ledger.filter(r => r.day === today)),
      struck: ledger.length,
    }
  }, [ledger, mon, sun, today])

  const byBadge = useMemo(() => {
    const m = {}
    for (const r of ledger) (m[r.badge] ||= []).push(r)
    for (const k in m) m[k].sort((a, b) => (b.awarded_at || b.day || '').localeCompare(a.awarded_at || a.day || ''))
    return m
  }, [ledger])

  const struckOnDay = useMemo(() => ledger.filter(r => r.day === day).sort((a, b) => (a.awarded_at || '').localeCompare(b.awarded_at || '')), [ledger, day])

  const pct = RIVER_TOTAL_MILES ? Math.min(100, (totals.all / RIVER_TOTAL_MILES) * 100) : 0

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Accomplishments</Eyebrow>
        <h1 style={S.h1}>Badges</h1>
        <p style={S.sub}>each badge carries miles · miles move you down the river</p>
      </div>

      <Panel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <Stat v={loading ? '·' : fmtMiles(totals.all)} l={`Miles banked · of ${RIVER_TOTAL_MILES.toLocaleString()} to Calm Water`} color={GOLD} />
          <Stat v={loading ? '·' : fmtMiles(totals.week)} l="This week · Monday to Sunday" />
          <Stat v={loading ? '·' : fmtMiles(totals.today)} l="Today" color={totals.today > 0 ? GOLD_BRIGHT : '#fff'} />
          <Stat v={loading ? '·' : totals.struck} l="Badges struck" />
        </div>
        <div style={{ marginTop: 14, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: GOLD, transition: 'width 400ms' }} />
        </div>
        <div style={S.source}>RIVER · {pct.toFixed(pct < 1 ? 2 : 1)}% of the way</div>
      </Panel>

      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={S.panelTitle}>Struck on {fmtDay(day)}</div>
          <DayControl day={day} onPrev={() => setDay(d => shiftDay(d, -1))} onNext={() => setDay(d => shiftDay(d, 1))} canNext={day < today} />
        </div>
        {struckOnDay.length === 0 ? (
          <div style={{ padding: '14px 0 6px' }}>
            <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{day === today ? 'Nothing struck yet today.' : 'Nothing struck that day.'}</div>
            <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>The ledger strikes on the rules below.</div>
          </div>
        ) : (
          <div>
            {struckOnDay.map((r, i) => <StruckRow key={r.id || i} row={r} />)}
            <div style={{ ...S.source, color: GOLD }}>{fmtMiles(struckOnDay.reduce((s, r) => s + (Number(r.miles) || 0), 0))} MI struck · {struckOnDay.length} badge{struckOnDay.length === 1 ? '' : 's'}</div>
          </div>
        )}
      </Panel>

      <div style={{ ...S.panelTitle, marginTop: 24 }}>The catalogue</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {CATALOGUE.map(b => <BadgeCard key={b.id} badge={b} history={byBadge[b.id] || []} onOpen={setOpen} />)}
      </div>
      <div style={S.source}>SOURCE · miles_ledger · struck by deterministic rules at close</div>

      {open && <HistoryModal badgeId={open} history={byBadge[open] || []} onClose={() => setOpen(null)} />}
    </div>
  )
}
