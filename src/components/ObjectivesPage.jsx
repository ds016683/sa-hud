import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Play, Pause, Star, Flame, ChevronDown, ChevronUp, X, Trash2, ArrowUpRight, Check, Send, Anchor, Calendar, Edit3, Table as TableIcon, List as ListIcon, AlertTriangle, AlertCircle, BarChart3, Lock, Zap, RotateCcw, Archive } from 'lucide-react'
import useObjectives from '../hooks/useObjectives'

// =============================================================================
// CONSTANTS
// =============================================================================

const RAM_CAP = 10

const SOV_ZONES = [
  { min: 1, max: 3,  label: 'Triage',      color: '#DC2626', bg: '#FEE2E2', desc: 'Execution only. Design parked.' },
  { min: 4, max: 6,  label: 'Operating',   color: '#D97706', bg: '#FEF3C7', desc: 'Normal mix. Working through.' },
  { min: 7, max: 8,  label: 'Caught Up',   color: '#0F766E', bg: '#CCFBF1', desc: 'Design work unlocked.' },
  { min: 9, max: 10, label: 'Open Water',  color: '#B45309', bg: '#FEF3C7', desc: 'Generative. Build what only you can build.' },
]
const sovZone = (s) => SOV_ZONES.find(z => s >= z.min && s <= z.max) || SOV_ZONES[1]

const sizeFor = (w) => w >= 9 ? 'Boulder' : w >= 4 ? 'Stone' : 'Pebble'
const sizeColor = (w) => w >= 9 ? '#7C2D12' : w >= 4 ? '#1E3A8A' : '#155E75'

// Default min_sov by kind × size (David's pick — "as is" lean)
// Anchor + emergency always unlock at 1.
const DEFAULT_MIN_SOV = {
  execution: { Pebble: 1, Stone: 3, Boulder: 5 },
  design:    { Pebble: 4, Stone: 6, Boulder: 7 },
}
const getMinSov = (o) => {
  if (o.min_sov != null) return o.min_sov
  if (o.is_anchor || o.is_emergency) return 1
  const kind = (o.kind === 'design') ? 'design' : 'execution'
  return DEFAULT_MIN_SOV[kind][sizeFor(o.weight)] || 1
}

// Effort→hours estimate for dashboard budget
const EFFORT_HOURS = { 1: 0.5, 2: 2, 3: 4, 4: 8, 5: 20 }
const hoursFor = (o) => EFFORT_HOURS[o.effort] ?? 2

// =============================================================================
// SOVEREIGNTY MATH — computed, not felt
// =============================================================================
// Capacity meter = sum(weight) of active items, capped at 10
// Sovereignty   = 10 − Pressure, clamped 1..10
// Pressure      = sum(weight × stakes × urgency) of active items
//
// stakes:   emergency 2.0 · hard_deadline 1.5 · anchor 1.3 · normal 1.0
// urgency:  overdue 2.0 · ≤3d 1.5 · ≤7d 1.2 · dated 1.0 · undated 0.9

const CAPACITY_CAP = 10

const stakesMult = (o) => {
  if (o.is_emergency) return 2.0
  if (o.hard_deadline) return 1.5
  if (o.is_anchor) return 1.3
  return 1.0
}

const urgencyMult = (o) => {
  if (!o.due_date) return 0.9
  const d = daysFromToday(o.due_date)
  if (d < 0) return 2.0
  if (d <= 3) return 1.5
  if (d <= 7) return 1.2
  return 1.0
}

const itemPressure = (o) => (o.weight || 0) * stakesMult(o) * urgencyMult(o)

const computeSovereignty = (activeItems) => {
  const pressure = activeItems.reduce((a, o) => a + itemPressure(o), 0)
  const score = Math.round(Math.max(1, Math.min(10, CAPACITY_CAP - pressure)))
  return { score, pressure: Math.round(pressure * 10) / 10 }
}

// --- due date helpers ---
const todayISO = () => new Date().toISOString().slice(0,10)
const daysFromToday = (iso) => {
  if (!iso) return null
  const a = new Date(todayISO()); const b = new Date(iso)
  return Math.round((b - a) / 86400000)
}
const fmtDue = (iso) => {
  if (!iso) return ''
  const d = daysFromToday(iso)
  const dt = new Date(iso + 'T00:00:00')
  const mo = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (d === 0) return `Today · ${mo}`
  if (d === 1) return `Tomorrow · ${mo}`
  if (d > 0 && d <= 6) return `${dt.toLocaleDateString('en-US', { weekday: 'short' })} · ${mo}`
  return mo
}
const fmtShort = (iso) => {
  if (!iso) return ''
  const dt = new Date(iso + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const dueColor = (iso, hard) => {
  const d = daysFromToday(iso)
  if (d === null) return { bg: '#F1F5F9', fg: '#565656' }
  if (d < 0) return { bg: '#FEE2E2', fg: '#991B1B' }     // overdue
  if (d === 0) return { bg: hard ? '#FEE2E2' : '#FEF3C7', fg: hard ? '#991B1B' : '#92400E' }
  if (d <= 2) return { bg: '#FEF3C7', fg: '#92400E' }
  if (d <= 7) return { bg: '#DBEAFE', fg: '#1E40AF' }
  return { bg: '#F1F5F9', fg: '#475569' }
}

const VARIANT_LABEL = {
  'sonia-stream': 'Sonia · British · Stream',
  'libby-stream': 'Libby · British · Stream',
  'emily-stream': 'Emily · Irish · Stream',
}

const BASE_URL = import.meta.env.BASE_URL || '/'

// =============================================================================
// STYLE TOKENS
// =============================================================================
const NAVY = '#002C77'
const NAVY_DEEP = '#001A41'
const BLUE = '#009DE0'
const GRAY = '#8096B2'
const TEXT_DIM = '#565656'
const PANEL_BORDER = '#E2E8F0'
const PANEL_BG = '#FFFFFF'
const PAGE_BG = '#F7F9FC'
const GOLD = '#B45309'

// =============================================================================
// Tag system (v1.10 — May 19, 2026)
// Two groups, both multi-select. Stored flat in objectives.tags text[].
// =============================================================================
const TAG_GROUPS = [
  {
    id: 'scope',
    label: 'Scope',
    tags: [
      { id: 'personal',       label: 'Personal',       bg: '#F1F5F9', fg: '#334155', border: '#CBD5E1' },
      { id: 'third-horizon',  label: 'Third Horizon',  bg: '#E0E7FF', fg: '#3730A3', border: '#A5B4FC' },
    ],
  },
  {
    id: 'domain',
    label: 'Domain',
    tags: [
      { id: 'client',         label: 'Client',         bg: '#F0FDF4', fg: '#15803D', border: '#86EFAC' },
      { id: 'biz-dev',        label: 'Business Dev',   bg: '#FFFBEB', fg: '#B45309', border: '#FCD34D' },
      { id: 'finance',        label: 'Finance',        bg: '#ECFDF5', fg: '#047857', border: '#6EE7B7' },
      { id: 'administrative', label: 'Administrative', bg: '#F1F5F9', fg: '#475569', border: '#CBD5E1' },
      { id: 'content',        label: 'Content',        bg: '#FAF5FF', fg: '#6D28D9', border: '#C4B5FD' },
      { id: 'tooling',        label: 'Tooling',        bg: '#E0F2FE', fg: '#075985', border: '#7DD3FC' },
    ],
  },
]
const TAG_BY_ID = Object.fromEntries(TAG_GROUPS.flatMap(g => g.tags.map(t => [t.id, t])))
const tagStyle = (id) => {
  const t = TAG_BY_ID[id]
  if (!t) return null
  return {
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999,
    fontSize: 10, fontWeight: 600, background: t.bg, color: t.fg,
    border: `1px solid ${t.border}`, whiteSpace: 'nowrap', lineHeight: 1.4,
  }
}
function TagPills({ tags, max = 4 }) {
  if (!tags || !tags.length) return null
  const shown = tags.slice(0, max)
  const overflow = tags.length - shown.length
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {shown.map(id => {
        const t = TAG_BY_ID[id]; if (!t) return null
        return <span key={id} style={tagStyle(id)}>{t.label}</span>
      })}
      {overflow > 0 && <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:600, background:'#F1F5F9', color: GRAY, border: `1px solid ${PANEL_BORDER}` }}>+{overflow}</span>}
    </div>
  )
}
function TagPicker({ value, onChange }) {
  const selected = new Set(value || [])
  const toggle = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onChange(Array.from(next))
  }
  return (
    <div style={{ marginBottom: 12 }}>
      {TAG_GROUPS.map(group => (
        <div key={group.id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{group.label} (optional)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {group.tags.map(t => {
              const on = selected.has(t.id)
              return (
                <button key={t.id} type="button" onClick={() => toggle(t.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 11, fontWeight: on ? 700 : 500, fontFamily: 'inherit',
                    background: on ? t.bg : 'white',
                    color: on ? t.fg : GRAY,
                    border: on ? `1.5px solid ${t.border}` : `1px solid ${PANEL_BORDER}`,
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}


const S = {
  page: { maxWidth: 880, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Arial, Helvetica, sans-serif', color: NAVY },
  h1: { fontSize: 22, fontWeight: 700, margin: 0, color: NAVY },
  sub: { fontSize: 12, color: GRAY, margin: '2px 0 0' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  panelTitle: { fontSize: 10, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 },
  btnPrimary: { background: NAVY, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { background: 'white', color: NAVY, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  btnDone: { background: '#0F766E', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnForeman: { background: '#7C3AED', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnPark: { background: 'transparent', color: GRAY, border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, padding: '6px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 },
  chip: (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.05em' }),
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
}

// =============================================================================
// MorningArrival — audio + Rock answer capture
// =============================================================================

function MorningArrival({ meditation, onSubmit }) {
  const [variant, setVariant] = useState('sonia-stream')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [answerOpen, setAnswerOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const audioRef = useRef(null)

  const hh = new Date().getHours()
  const greeting = hh < 12 ? 'Morning Arrival' : hh < 17 ? 'Midday Check' : 'Evening Arrival'
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setProgress(a.currentTime / (a.duration || 1))
    const onEnd = () => { setPlaying(false); setAnswerOpen(true) }
    a.addEventListener('timeupdate', onTime); a.addEventListener('ended', onEnd)
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd) }
  }, [variant])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play(); setPlaying(true) }
  }

  const submit = async () => {
    if (!answer.trim()) return
    await onSubmit(answer.trim(), variant)
    setAnswer('')
    setAnswerOpen(false)
  }

  const dotCount = 24
  const filledDots = Math.round(progress * dotCount)

  if (meditation && !answerOpen && !playing && progress === 0) {
    // Already done today — collapsed pill
    return (
      <div style={{ ...S.panel, background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)', borderColor: '#BAE6FD' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: GRAY, marginBottom: 2 }}>{dateStr} · Already arrived today</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, lineHeight: 1.4 }}>
              <Star size={13} style={{ display: 'inline', marginRight: 6, color: GOLD, marginBottom: -2 }} />
              {meditation.rock_answer}
            </div>
          </div>
          <button style={S.btnGhost} onClick={() => { setProgress(0); setPlaying(false); setAnswerOpen(false); audioRef.current.currentTime = 0 }}>Play again</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...S.panel, background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)', borderColor: '#BAE6FD' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em' }}>☀ {greeting}</div>
          <div style={S.sub}>{dateStr}</div>
        </div>
        <select value={variant} onChange={e => setVariant(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, background: 'white', color: NAVY, fontFamily: 'inherit' }}>
          {Object.entries(VARIANT_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <audio ref={audioRef} src={`${BASE_URL}audio/morning-arrival/${variant}.mp3`} preload="metadata" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
          style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: NAVY, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,44,119,0.3)' }}>
          {playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < filledDots ? NAVY : '#CBD8E8',
              transition: 'background 0.2s'
            }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: GRAY, minWidth: 36, textAlign: 'right' }}>5:15</div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginTop: 8, marginBottom: 6, lineHeight: 1.4 }}>
        "What is one thing today that the Rock would do?"
      </div>

      {!answerOpen ? (
        <button style={{ ...S.btnGhost, width: '100%' }} onClick={() => setAnswerOpen(true)}>
          {meditation ? '✓ Answered — tap to revise' : 'Tap to capture answer →'}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <input autoFocus value={answer} onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={meditation?.rock_answer || "Anchor for today..."}
            style={S.input} />
          <button onClick={submit} style={{ ...S.btnPrimary, padding: '0 14px' }}><Send size={14} /></button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// EmergencyBanner
// =============================================================================

function EmergencyBanner({ items, onDone, onForeman }) {
  if (!items.length) return null
  return (
    <div style={{ ...S.panel, background: '#FEF2F2', border: `2px solid #DC2626`, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Flame size={16} color="#DC2626" />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7F1D1D', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Emergency Mission · {items.length} active
        </div>
      </div>
      {items.map(o => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px dashed #FCA5A5` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#7F1D1D', flex: 1, paddingRight: 8 }}>{o.title}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ ...S.btnDone, background: '#DC2626' }} onClick={() => onDone(o.id)}><Check size={12} /> on it</button>
            <button style={S.btnForeman} onClick={() => onForeman(o.id)}><ArrowUpRight size={12} /> delegate</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// SovereigntyGate
// =============================================================================

function SovereigntyReading({ score, pressure, breakdown, history }) {
  const zone = sovZone(score)
  const [open, setOpen] = useState(false)
  return (
    <div style={S.panel}>
      <div style={{ ...S.panelTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Sovereignty</span>
        <span style={{ fontSize: 10, color: GRAY, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          computed from active load
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 10, background: '#E2E8F0', borderRadius: 9999, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${score * 10}%`,
            background: `linear-gradient(90deg, #DC2626 0%, #D97706 30%, #0F766E 60%, #B45309 100%)`,
            transition: 'width 0.4s'
          }} />
          <div style={{ position: 'absolute', top: -2, left: `calc(${score * 10}% - 7px)`, width: 14, height: 14, borderRadius: '50%', background: 'white', border: `2px solid ${zone.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: zone.color, minWidth: 30, textAlign: 'right' }}>{score}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
        <span style={S.chip(zone.bg, zone.color)}>{zone.label}</span>
        <span style={{ fontSize: 11, color: GRAY }}>pressure {pressure} · 10 − pressure = sov</span>
        <button style={{ ...S.btnGhost, fontSize: 11, padding: '4px 8px' }} onClick={() => setOpen(o => !o)}>
          {open ? 'hide' : `what's eating it (${breakdown.length})`}
        </button>
      </div>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 6, fontStyle: 'italic' }}>{zone.desc}</div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
          {breakdown.length === 0 ? (
            <div style={{ fontSize: 12, color: GRAY, fontStyle: 'italic' }}>Board is empty. Sovereignty is at ceiling.</div>
          ) : breakdown.slice(0, 8).map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12, borderBottom: `1px solid ${PANEL_BORDER}` }}>
              <span style={{ flex: 1, color: NAVY }}>{b.title}</span>
              <span style={{ fontSize: 10, color: GRAY }}>w{b.weight}</span>
              {b.stakes > 1 && <span style={S.chip('#FEF2F2', '#B91C1C')}>×{b.stakes}</span>}
              {b.urgency > 1 && <span style={S.chip('#FEF3C7', '#92400E')}>×{b.urgency}</span>}
              {b.urgency < 1 && <span style={S.chip('#F1F5F9', GRAY)}>×{b.urgency}</span>}
              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, minWidth: 28, textAlign: 'right' }}>−{b.pressure}</span>
            </div>
          ))}
          {breakdown.length > 8 && (
            <div style={{ fontSize: 11, color: GRAY, padding: '4px 0', textAlign: 'center' }}>
              + {breakdown.length - 8} more
            </div>
          )}
        </div>
      )}

      {history.length > 1 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${PANEL_BORDER}` }}>
          <div style={{ fontSize: 10, color: GRAY, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>30-day trend</div>
          <SparkLine data={history.map(h => h.score)} />
        </div>
      )}
    </div>
  )
}

function SparkLine({ data }) {
  if (!data.length) return null
  const w = 320, h = 32, pad = 2
  const max = 10, min = 1
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1)
  const yOf = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2)
  const pts = data.map((v, i) => `${pad + i * stepX},${yOf(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
      <polyline points={pts} fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={pad + i * stepX} cy={yOf(v)} r={2} fill={sovZone(v).color} />
      ))}
    </svg>
  )
}

// =============================================================================
// CapacityMeter (RAM)
// =============================================================================

function CapacityMeter({ used, capacity }) {
  const pct = Math.min(100, (used / capacity) * 100)
  const over = used > capacity
  const remaining = Math.max(0, capacity - used)
  const fillColor = over ? '#DC2626' : pct >= 80 ? '#D97706' : pct >= 50 ? NAVY : '#0F766E'
  return (
    <div style={S.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={S.panelTitle}>Capacity</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: over ? '#DC2626' : NAVY }}>{used} / {capacity}</div>
      </div>
      <div style={{ height: 12, background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: fillColor,
          transition: 'width 0.3s'
        }} />
      </div>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8 }}>
        {over ? `⚠ Over capacity by ${used - capacity}. Park or release something.`
          : remaining >= 9 ? 'Capacity for a Boulder.'
          : remaining >= 4 ? 'Capacity for a Stone.'
          : remaining > 0 ? 'Pebbles only — keep it light.'
          : 'Full. Finish before adding.'}
      </div>
    </div>
  )
}

// =============================================================================
// ObjectiveCard
// =============================================================================

function ObjectiveCard({ o, onRelease, onForeman, onPark, onToggleAnchor, onDelete, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const size = sizeFor(o.weight)
  const sColor = sizeColor(o.weight)
  const dueC = dueColor(o.due_date, o.hard_deadline)
  return (
    <div style={{
      background: o.is_anchor ? 'linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)' : (o.needs_sizing ? '#FFFBF5' : 'white'),
      border: o.is_anchor ? `2px solid ${GOLD}` : (o.needs_sizing ? `1px dashed #F59E0B` : `1px solid ${PANEL_BORDER}`),
      borderRadius: 10, padding: 12, marginBottom: 8, position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        {o.is_anchor && <Star size={14} fill={GOLD} color={GOLD} style={{ marginTop: 2, flexShrink: 0 }} />}
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: NAVY, lineHeight: 1.4 }}>{o.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {o.tags && o.tags.length > 0 && <TagPills tags={o.tags} />}
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => onEdit(o)} title="Edit" style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><Edit3 size={13} /></button>
            <button onClick={() => setMenuOpen(m => !m)} style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2, fontSize: 18, lineHeight: 1 }}>⋯</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10, alignItems: 'center' }}>
        <span style={S.chip(sColor + '20', sColor)}>{size}</span>
        <span style={S.chip('#F1F5F9', NAVY)}>E{o.effort}</span>
        <span style={S.chip('#F1F5F9', NAVY)}>I{o.importance}</span>
        <span style={S.chip(o.kind === 'design' ? '#FEF3C7' : '#E0F2FE', o.kind === 'design' ? '#B45309' : '#0369A1')}>{o.kind}</span>
        {(o.start_date || o.due_date) && (
          <span style={S.chip(dueC.bg, dueC.fg)}>
            {o.hard_deadline ? '🔒 ' : ''}📅 {o.start_date ? fmtShort(o.start_date) : '—'} → {o.due_date ? fmtDue(o.due_date) : 'no target'}
          </span>
        )}
        {o.needs_sizing && <span style={S.chip('#FEF3C7', '#92400E')}>⚠ size me</span>}
        {o.who && <span style={S.chip('#F1F5F9', TEXT_DIM)}>w/ {o.who}</span>}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button style={S.btnDone} onClick={() => onRelease(o.id)}><Check size={12} /> done</button>
        <button style={S.btnForeman} onClick={() => onForeman(o.id)}><ArrowUpRight size={12} /> foreman</button>
        <button style={S.btnPark} onClick={() => onPark(o.id)}>park</button>
      </div>

      {menuOpen && (
        <div style={{ position: 'absolute', top: 32, right: 8, background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 6, zIndex: 10, minWidth: 160 }}>
          <button style={{ ...S.btnGhost, width: '100%', textAlign: 'left', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { onToggleAnchor(o.id, !o.is_anchor); setMenuOpen(false) }}>
            <Star size={12} /> {o.is_anchor ? 'Remove anchor ★' : 'Make anchor ★'}
          </button>
          <button style={{ ...S.btnGhost, width: '100%', textAlign: 'left', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { if (confirm('Delete this objective?')) onDelete(o.id); setMenuOpen(false) }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// EditObjectiveModal — inline edit for any field
// =============================================================================

function EditObjectiveModal({ o, onClose, onSave, onDelete, onForeman, onPark }) {
  const [title, setTitle] = useState(o.title || '')
  const [description, setDescription] = useState(o.description || '')
  const [notes, setNotes] = useState(o.notes || '')
  const [stakeholder, setStakeholder] = useState(o.stakeholder || '')
  const [effort, setEffort] = useState(o.effort ?? 2)
  const [importance, setImportance] = useState(o.importance ?? 2)
  const [kind, setKind] = useState(o.kind || 'execution')
  const [who, setWho] = useState(o.who || '')
  const [followUpDate, setFollowUpDate] = useState(o.follow_up_date || '')
  const [dueDate, setDueDate] = useState(o.due_date || '')
  const [startDate, setStartDate] = useState(o.start_date || '')
  const [hardDeadline, setHardDeadline] = useState(!!o.hard_deadline)
  const [tags, setTags] = useState(o.tags || [])
  const [delegating, setDelegating] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    await onSave(o.id, {
      title: title.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      stakeholder: stakeholder.trim() || null,
      effort, importance, kind,
      who: who.trim() || null,
      follow_up_date: followUpDate || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      hard_deadline: hardDeadline,
      tags,
      needs_sizing: false,
    })
    onClose()
  }

  const confirmDelegate = async () => {
    if (!who.trim()) { alert('Who are you delegating to?'); return }
    // save fields first, then route to foreman
    await onSave(o.id, {
      title: title.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      stakeholder: stakeholder.trim() || null,
      effort, importance, kind,
      who: who.trim(),
      follow_up_date: followUpDate || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      hard_deadline: hardDeadline,
      tags,
      needs_sizing: false,
    })
    if (onForeman) onForeman(o.id)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,26,65,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, maxWidth: 480, width: '100%', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Objective Card</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY }}><X size={18} /></button>
        </div>

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Title</div>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} style={{ ...S.input, marginBottom: 10 }} />

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Waiting on me (optional)</div>
        <input value={stakeholder} onChange={e => setStakeholder(e.target.value)} placeholder="ACHP, Jordana, MHPI board..." style={{ ...S.input, marginBottom: 10 }} />

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description (optional)</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A line or two — only if title isn't enough" rows={2}
          style={{ ...S.input, marginBottom: 10, resize: 'vertical', fontFamily: 'inherit' }} />

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes — links, prompts, attachments (optional)</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Drop links here, anything you'll want at hand when you start" rows={3}
          style={{ ...S.input, marginBottom: 12, resize: 'vertical', fontFamily: 'inherit' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Effort</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setEffort(n)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: effort === n ? `2px solid ${NAVY}` : `1px solid ${PANEL_BORDER}`, background: effort === n ? '#EEF2F7' : 'white', color: NAVY, fontWeight: effort === n ? 700 : 500, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Importance</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3].map(n => (
                <button key={n} onClick={() => setImportance(n)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: importance === n ? `2px solid ${NAVY}` : `1px solid ${PANEL_BORDER}`, background: importance === n ? '#EEF2F7' : 'white', color: NAVY, fontWeight: importance === n ? 700 : 500, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Kind</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['execution','design'].map(k => (
            <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: kind === k ? `2px solid ${NAVY}` : `1px solid ${PANEL_BORDER}`, background: kind === k ? '#EEF2F7' : 'white', color: NAVY, fontWeight: kind === k ? 700 : 500, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{k}</button>
          ))}
        </div>

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Start date</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...S.input, flex: '1 1 160px', padding: '8px 10px' }} />
          <button onClick={() => setStartDate('')} style={{ ...S.btnGhost, fontSize: 11 }}>clear</button>
          <button onClick={() => { const d = new Date(); setStartDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>today</button>
        </div>

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Target date</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...S.input, flex: '1 1 160px', padding: '8px 10px' }} />
          <button onClick={() => setDueDate('')} style={{ ...S.btnGhost, fontSize: 11 }}>clear</button>
          <button onClick={() => { const d = new Date(); setDueDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>today</button>
          <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); setDueDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>tomorrow</button>
          <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setDueDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>+1wk</button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: NAVY, cursor: 'pointer', marginBottom: 16 }}>
          <input type="checkbox" checked={hardDeadline} onChange={e => setHardDeadline(e.target.checked)} disabled={!dueDate} />
          🔒 Hard deadline (external, non-negotiable)
        </label>

        <TagPicker value={tags} onChange={setTags} />

        <div style={{ fontSize: 11, color: GRAY, marginBottom: 14 }}>
          Weight: <strong style={{ color: NAVY }}>{effort * importance}</strong> ({sizeFor(effort * importance)})
        </div>

        {/* Delegate sub-panel */}
        {delegating ? (
          <div style={{ background: '#FAF5FF', border: `2px solid #C4B5FD`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowUpRight size={12} /> Delegate to foreman
            </div>
            <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Delegated to *</div>
            <input value={who} onChange={e => setWho(e.target.value)} placeholder="Name of person taking it on" style={{ ...S.input, marginBottom: 10 }} />
            <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Follow up when?</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} style={{ ...S.input, flex: '1 1 160px', padding: '8px 10px' }} />
              <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+3); setFollowUpDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>+3d</button>
              <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setFollowUpDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>+1wk</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDelegating(false)} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
              <button onClick={confirmDelegate} style={{ ...S.btnPrimary, flex: 1, background: '#7C3AED' }}>Release to foreman</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Route</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {onForeman && (
                <button onClick={() => setDelegating(true)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: `1px solid #C4B5FD`, background: '#FAF5FF', color: '#6D28D9', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ArrowUpRight size={12} /> Delegate
                </button>
              )}
              {onPark && (
                <button onClick={() => { onPark(o.id); onClose() }} style={{ flex: 1, padding: '8px', borderRadius: 6, border: `1px solid ${PANEL_BORDER}`, background: 'white', color: GRAY, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                  Park
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button onClick={() => { if (confirm('Delete this objective?')) { onDelete(o.id); onClose() } }} style={{ ...S.btnGhost, color: '#DC2626', borderColor: '#FCA5A5' }}><Trash2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Delete</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={S.btnGhost}>Cancel</button>
            <button onClick={save} style={S.btnPrimary}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// TriageQueue — surfaces unsized objectives for quick rating
// =============================================================================

function TriageQueue({ items, onSize, onEdit }) {
  if (!items.length) return null
  return (
    <div style={{ ...S.panel, background: '#FFFBF5', borderColor: '#FCD34D' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <AlertTriangle size={14} color="#B45309" />
        <div style={{ ...S.panelTitle, marginBottom: 0, color: '#92400E' }}>Triage · {items.length} need sizing</div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 10, lineHeight: 1.5 }}>
        Rate these to clear the queue. Tap E/I or open to edit fully.
      </div>
      {items.map(o => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid #FDE68A` }}>
          <div style={{ flex: 1, fontSize: 13, color: NAVY, fontWeight: 500, lineHeight: 1.3 }}>{o.title}</div>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1,2,3].map(i => (
              <button key={i} title={`Importance ${i}`} onClick={() => onSize(o.id, { importance: i })}
                style={{ width: 24, height: 24, borderRadius: 4, border: o.importance === i ? `2px solid ${NAVY}` : `1px solid ${PANEL_BORDER}`, background: o.importance === i ? '#EEF2F7' : 'white', color: NAVY, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>I{i}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1,2,3,4,5].map(e => (
              <button key={e} title={`Effort ${e}`} onClick={() => onSize(o.id, { effort: e })}
                style={{ width: 22, height: 24, borderRadius: 4, border: o.effort === e ? `2px solid ${NAVY}` : `1px solid ${PANEL_BORDER}`, background: o.effort === e ? '#EEF2F7' : 'white', color: NAVY, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{e}</button>
            ))}
          </div>
          <button onClick={() => onSize(o.id, { needs_sizing: false })} title="Looks right" style={{ ...S.btnGhost, fontSize: 10, padding: '4px 8px' }}>✓</button>
          <button onClick={() => onEdit(o)} title="Open" style={{ ...S.btnGhost, fontSize: 10, padding: '4px 6px' }}><Edit3 size={11} /></button>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// TableView — flat sortable list grouped by size bucket
// =============================================================================

function TableView({ items, onRelease, onForeman, onPark, onEdit }) {
  const buckets = useMemo(() => {
    const b = { Boulder: [], Stone: [], Pebble: [] }
    for (const o of items) b[sizeFor(o.weight)].push(o)
    for (const k of Object.keys(b)) {
      b[k].sort((a, c) => {
        if (a.is_anchor !== c.is_anchor) return a.is_anchor ? -1 : 1
        if (!!a.due_date !== !!c.due_date) return a.due_date ? -1 : 1
        if (a.due_date && c.due_date && a.due_date !== c.due_date) return a.due_date.localeCompare(c.due_date)
        return c.weight - a.weight
      })
    }
    return b
  }, [items])

  const Row = ({ o }) => {
    const dueC = dueColor(o.due_date, o.hard_deadline)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', borderTop: `1px solid ${PANEL_BORDER}`, fontSize: 12 }}>
        {o.is_anchor && <Star size={11} fill={GOLD} color={GOLD} />}
        <div style={{ flex: 1, color: NAVY, fontWeight: 500, lineHeight: 1.3 }}>{o.title}</div>
        <span style={{ ...S.chip('#F1F5F9', NAVY), fontSize: 9 }}>E{o.effort}·I{o.importance}</span>
        {o.kind === 'design' && <span style={{ ...S.chip('#FEF3C7', '#B45309'), fontSize: 9 }}>D</span>}
        {o.needs_sizing && <span style={{ ...S.chip('#FEF3C7', '#92400E'), fontSize: 9 }}>⚠</span>}
        {o.stakeholder && <span style={{ ...S.chip('#E0F2FE', '#075985'), fontSize: 9 }} title={`Waiting on me: ${o.stakeholder}`}>← {o.stakeholder}</span>}
        {o.notes && <span title="Has notes/links" style={{ fontSize: 11 }}>📝</span>}
        {o.who && <span style={{ fontSize: 10, color: GRAY }}>w/ {o.who}</span>}
        {o.tags && o.tags.length > 0 && <TagPills tags={o.tags} max={2} />}
        <button onClick={() => onEdit(o)} title="Edit" style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><Edit3 size={11} /></button>
        <button onClick={() => onRelease(o.id)} title="Done" style={{ background: '#0F766E', color: 'white', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Check size={10} /></button>
        <button onClick={() => onForeman(o.id)} title="Foreman" style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><ArrowUpRight size={10} /></button>
        <button onClick={() => onPark(o.id)} title="Park" style={{ background: 'transparent', color: GRAY, border: `1px solid ${PANEL_BORDER}`, borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>P</button>
        <span title={`${o.start_date ? `Start ${o.start_date}` : 'no start'} → ${o.due_date ? `Target ${o.due_date}` : 'no target'}`}
          style={{ ...S.chip(dueC.bg, dueC.fg), fontSize: 9, marginLeft: 2, whiteSpace: 'nowrap' }}>
          {o.hard_deadline ? '🔒' : '📅'} {o.start_date ? fmtShort(o.start_date) : '—'} → {o.due_date ? fmtShort(o.due_date) : '—'}
        </span>
      </div>
    )
  }

  return (
    <div>
      {['Boulder','Stone','Pebble'].map(b => buckets[b].length > 0 && (
        <div key={b} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: sizeColor(b === 'Boulder' ? 12 : b === 'Stone' ? 6 : 2), textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 4px', background: '#F8FAFC', borderRadius: 4 }}>
            ─ {b}s · {buckets[b].length} ─
          </div>
          {buckets[b].map(o => <Row key={o.id} o={o} />)}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// AddObjective
// =============================================================================

function AddObjective({ onAdd, onPark, onForeman }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [stakeholder, setStakeholder] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [effort, setEffort] = useState(null)
  const [importance, setImportance] = useState(null)
  const [kind, setKind] = useState('execution')
  const [emergency, setEmergency] = useState(false)
  const [who, setWho] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0,10))
  const [hardDeadline, setHardDeadline] = useState(false)
  const [tags, setTags] = useState([])
  const [route, setRoute] = useState('active') // active | park | delegate

  const reset = () => {
    setTitle(''); setStakeholder(''); setDescription(''); setNotes('')
    setEffort(null); setImportance(null); setKind('execution'); setEmergency(false)
    setWho(''); setFollowUpDate(''); setDueDate('')
    setStartDate(new Date().toISOString().slice(0,10)); setHardDeadline(false)
    setTags([])
    setRoute('active')
  }

  const submit = async () => {
    if (!title.trim()) return
    if (route === 'delegate' && !who.trim()) { alert('Who are you delegating to?'); return }
    const unsized = effort === null || importance === null
    const payload = {
      title: title.trim(),
      stakeholder: stakeholder.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      effort: effort ?? 2,
      importance: importance ?? 2,
      kind, is_emergency: emergency,
      who: who.trim() || null,
      follow_up_date: followUpDate || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      hard_deadline: hardDeadline,
      tags,
      needs_sizing: unsized,
    }
    const created = await onAdd(payload)
    // Route to park or delegate if requested. onAdd should return the new id.
    const newId = created?.id || created
    if (newId) {
      if (route === 'park' && onPark) await onPark(newId)
      else if (route === 'delegate' && onForeman) await onForeman(newId)
    }
    reset()
    setOpen(false)
  }

  if (!open) return (
    <button style={{ ...S.btnPrimary, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px' }} onClick={() => setOpen(true)}>
      <Plus size={16} /> Add objective
    </button>
  )

  const unsized = effort === null || importance === null

  return (
    <div style={{ ...S.panel, border: `2px solid ${NAVY}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={S.panelTitle}>New objective</div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer' }}><X size={16} /></button>
      </div>

      <input autoFocus placeholder="What's the objective?" value={title} onChange={e => setTitle(e.target.value)} style={{ ...S.input, marginBottom: 10 }} />

      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Waiting on me (optional)</div>
      <input value={stakeholder} onChange={e => setStakeholder(e.target.value)} placeholder="ACHP, Jordana, MHPI board..." style={{ ...S.input, marginBottom: 10 }} />

      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description (optional)</div>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A line or two — only if title isn't enough" rows={2}
        style={{ ...S.input, marginBottom: 10, resize: 'vertical', fontFamily: 'inherit' }} />

      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes — links, prompts (optional)</div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Drop links here for when you start" rows={2}
        style={{ ...S.input, marginBottom: 12, resize: 'vertical', fontFamily: 'inherit' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Effort (optional)</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setEffort(effort === n ? null : n)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: effort === n ? `2px solid ${NAVY}` : `1px solid ${PANEL_BORDER}`, background: effort === n ? '#EEF2F7' : 'white', color: NAVY, fontWeight: effort === n ? 700 : 500, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{n}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Importance (optional)</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3].map(n => (
              <button key={n} onClick={() => setImportance(importance === n ? null : n)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: importance === n ? `2px solid ${NAVY}` : `1px solid ${PANEL_BORDER}`, background: importance === n ? '#EEF2F7' : 'white', color: NAVY, fontWeight: importance === n ? 700 : 500, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Start date</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...S.input, flex: '1 1 160px', padding: '8px 10px' }} />
        <button onClick={() => setStartDate('')} style={{ ...S.btnGhost, fontSize: 11 }}>clear</button>
        <button onClick={() => { const d = new Date(); setStartDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>today</button>
      </div>

      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Target date (optional)</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...S.input, flex: '1 1 160px', padding: '8px 10px' }} />
        <button onClick={() => setDueDate('')} style={{ ...S.btnGhost, fontSize: 11 }}>clear</button>
        <button onClick={() => { const d = new Date(); setDueDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>today</button>
        <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); setDueDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>tomorrow</button>
        <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setDueDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>+1wk</button>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: NAVY, cursor: 'pointer', marginBottom: 12 }}>
        <input type="checkbox" checked={hardDeadline} onChange={e => setHardDeadline(e.target.checked)} disabled={!dueDate} />
        🔒 Hard deadline
      </label>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: NAVY, cursor: 'pointer' }}>
          <input type="checkbox" checked={kind === 'design'} onChange={e => setKind(e.target.checked ? 'design' : 'execution')} />
          Design work (not execution)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#DC2626', cursor: 'pointer', fontWeight: emergency ? 700 : 400 }}>
          <input type="checkbox" checked={emergency} onChange={e => setEmergency(e.target.checked)} />
          🔥 Emergency
        </label>
      </div>

      <div style={{ fontSize: 11, color: GRAY, marginBottom: 10 }}>
        {unsized
          ? <>Unsized — will land in <strong style={{ color: '#92400E' }}>Triage Queue</strong> for later rating.</>
          : <>Weight: <strong style={{ color: NAVY }}>{effort * importance}</strong> ({sizeFor(effort * importance)})</>}
      </div>

      <TagPicker value={tags} onChange={setTags} />

      {/* Routing */}
      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Initial home</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: route === 'delegate' ? 10 : 14 }}>
        {[
          { id: 'active', label: 'Active', color: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
          { id: 'park', label: 'Park', color: GRAY, bg: '#F8FAFC', border: PANEL_BORDER },
          { id: 'delegate', label: 'Delegate', color: '#6D28D9', bg: '#FAF5FF', border: '#C4B5FD' },
        ].map(r => (
          <button key={r.id} onClick={() => setRoute(r.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 6,
              border: route === r.id ? `2px solid ${r.color}` : `1px solid ${r.border}`,
              background: route === r.id ? r.bg : 'white',
              color: r.color, fontSize: 12, fontWeight: route === r.id ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit' }}>{r.label}</button>
        ))}
      </div>

      {route === 'delegate' && (
        <div style={{ background: '#FAF5FF', border: `1px solid #C4B5FD`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Delegated to *</div>
          <input value={who} onChange={e => setWho(e.target.value)} placeholder="Name of person taking it on" style={{ ...S.input, marginBottom: 10 }} />
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Follow up when?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} style={{ ...S.input, flex: '1 1 160px', padding: '8px 10px' }} />
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+3); setFollowUpDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>+3d</button>
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setFollowUpDate(d.toISOString().slice(0,10)) }} style={{ ...S.btnGhost, fontSize: 11 }}>+1wk</button>
          </div>
        </div>
      )}

      <button style={{ ...S.btnPrimary, width: '100%' }} onClick={submit}>
        {route === 'active' ? 'Capture' : route === 'park' ? 'Capture → Park' : 'Capture → Delegate'}
      </button>
    </div>
  )
}

// =============================================================================
// CoaxMode — overrides everything
// =============================================================================

function CoaxMode({ objective, onRelease, onSkip, onExit }) {
  if (!objective) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 13, color: GRAY, marginBottom: 16 }}>No active objectives. Take a breath.</div>
        <button style={S.btnPrimary} onClick={onExit}>Back</button>
      </div>
    )
  }
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24 }}>start here →</div>
      <div style={{
        background: 'white', border: `2px solid ${NAVY}`, borderRadius: 16,
        padding: '32px 24px', maxWidth: 380, width: '100%', boxShadow: '0 4px 24px rgba(0,44,119,0.15)'
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: NAVY, lineHeight: 1.4, marginBottom: 24 }}>{objective.title}</div>
        <button onClick={() => onRelease(objective.id)} style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 15 }}>
          done
        </button>
      </div>
      <div style={{ fontSize: 12, color: GRAY, marginTop: 16 }}>easy win</div>
      <div style={{ marginTop: 32, display: 'flex', gap: 8 }}>
        <button style={S.btnGhost} onClick={onSkip}>show me a different one</button>
        <button style={S.btnGhost} onClick={onExit}>back to list</button>
      </div>
    </div>
  )
}

// =============================================================================
// HabitGrid
// =============================================================================

function HabitGrid({ habit, grid, onToggle, onWeed }) {
  const days = useMemo(() => {
    const arr = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0,10)
      const row = grid.find(g => g.day === key)
      const score = row ? [row.sleep_ok, row.gym, row.meditation, row.devotional].filter(Boolean).length : 0
      arr.push({ day: key, label: d.getDate(), score })
    }
    return arr
  }, [grid])

  const cellColor = (s) => s === 0 ? '#E2E8F0' : s === 1 ? '#BAE6FD' : s === 2 ? '#7DD3FC' : s === 3 ? '#38BDF8' : '#0284C7'

  return (
    <div style={S.panel}>
      <div style={S.panelTitle}>Habits · today</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { k: 'sleep_ok', icon: '💤', label: 'Sleep' },
          { k: 'gym', icon: '🏋', label: 'Gym' },
          { k: 'meditation', icon: '🧘', label: 'Meditate' },
          { k: 'devotional', icon: '📖', label: 'Devotional' },
        ].map(({ k, icon, label }) => {
          const on = habit?.[k]
          return (
            <button key={k} onClick={() => onToggle(k, !on)}
              style={{
                flex: '1 1 calc(50% - 4px)', padding: '10px 8px',
                borderRadius: 8, border: on ? `2px solid #0284C7` : `1px solid ${PANEL_BORDER}`,
                background: on ? '#E0F2FE' : 'white',
                color: NAVY, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
              <span style={{ fontSize: 14 }}>{icon}</span> {label} {on && <Check size={12} />}
            </button>
          )
        })}
        <div style={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
          <span style={{ fontSize: 14 }}>🌿</span>
          <span style={{ fontSize: 12, color: NAVY }}>Weed:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0,1,2,3].map(n => (
              <button key={n} onClick={() => onWeed(n)}
                style={{
                  width: 32, height: 28, borderRadius: 6,
                  border: (habit?.weed_count ?? 0) === n ? `2px solid #0284C7` : `1px solid ${PANEL_BORDER}`,
                  background: (habit?.weed_count ?? 0) === n ? '#E0F2FE' : 'white',
                  color: NAVY, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>{n === 3 ? '3+' : n}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>14-day strip</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {days.map(d => (
          <div key={d.day} title={`${d.day}: ${d.score}/4`} style={{ flex: 1, aspectRatio: '1', borderRadius: 3, background: cellColor(d.score) }} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// ReleasedToday
// =============================================================================

function ReleasedToday({ items, onReopen }) {
  if (!items.length) return null
  return (
    <div style={S.panel}>
      <div style={S.panelTitle}>Released today · {items.length}</div>
      {items.map(o => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${PANEL_BORDER}`, fontSize: 13 }}>
          {o.released_kind === 'foreman' ? <ArrowUpRight size={14} color="#7C3AED" /> : <Check size={14} color="#0F766E" />}
          <span style={{ flex: 1, color: NAVY }}>{o.title}</span>
          <span style={{ fontSize: 11, color: GRAY }}>{new Date(o.released_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button
            onClick={() => onReopen(o.id)}
            title="Pull back to the board"
            style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <RotateCcw size={11} /> reopen
          </button>
        </div>
      ))}
    </div>
  )
}

// Delegated ledger — all foreman-released items, with reopen for today's only
function DelegatedContainer({ items, onReopen, onEdit }) {
  const todayStr = new Date().toDateString()
  return (
    <div style={S.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0 }}>
        <div style={{ ...S.panelTitle, marginBottom: 0 }}>Delegated · {items.length}</div>
        <div style={{ fontSize: 10, color: GRAY }}>foreman ledger</div>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '14px 0', color: GRAY, fontSize: 12, textAlign: 'center' }}>
          Nothing delegated yet. Foreman-released items live here.
        </div>
      ) : items.map(o => {
        const isToday = o.released_at && new Date(o.released_at).toDateString() === todayStr
        const when = o.released_at ? new Date(o.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
        const eff = o.effort || 2
        const imp = o.importance || 2
        return (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}`, fontSize: 13 }}>
            <ArrowUpRight size={14} color="#7C3AED" />
            <span style={{ flex: 1, color: NAVY, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => onEdit(o)}>
              {o.title}
              {o.who && <span style={{ fontSize: 11, color: GRAY, marginLeft: 6 }}>→ {o.who}</span>}
            </span>
            <span style={S.chip('#F1F5F9', GRAY)}>E{eff}·I{imp}</span>
            <span style={S.chip('#FEF3C7', '#92400E')} title={`Weight ${o.weight} — ${sizeFor(o.weight)}`}>{sizeFor(o.weight)[0]}</span>
            {o.tags && o.tags.length > 0 && <TagPills tags={o.tags} max={2} />}
            <button onClick={() => onEdit(o)} title="Edit" style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><Edit3 size={12} /></button>
            {isToday ? (
              <button
                onClick={() => onReopen(o.id)}
                title="Pull back to the board"
                style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <RotateCcw size={11} /> reopen
              </button>
            ) : (
              <span style={{ fontSize: 11, color: GRAY }}>released {when}</span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: dueColor(o.due_date, o.hard_deadline).bg, color: dueColor(o.due_date, o.hard_deadline).fg }}>
              <Calendar size={10} />
              {o.start_date ? fmtShort(o.start_date) : '—'} → {o.due_date ? fmtShort(o.due_date) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// V1.2 — pill tabs, eligible/locked, dashboard, bin
// =============================================================================

function PillTabs({ tab, setTab, binCount }) {
  const tabs = [
    { id: 'list', label: 'List', icon: ListIcon },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'habits', label: 'Habits', icon: Calendar },
    { id: 'bin', label: `Bin${binCount ? ` · ${binCount}` : ''}`, icon: Archive },
  ]
  return (
    <div style={{ display: 'inline-flex', background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 999, padding: 3, marginBottom: 16, gap: 2 }}>
      {tabs.map(t => {
        const active = tab === t.id
        const Icon = t.icon
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999, border: 'none',
              background: active ? NAVY : 'transparent',
              color: active ? 'white' : NAVY,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <Icon size={13} /> {t.label}
          </button>
        )
      })}
    </div>
  )
}

function EligibleLockedSection({ parked, score, onActivate, onEdit }) {
  const [open, setOpen] = useState(true)
  if (!parked.length) {
    return (
      <div style={S.panel}>
        <div style={{ ...S.panelTitle, marginBottom: 0 }}>Objectives in Queue · 0</div>
        <div style={{ padding: '14px 0 4px', color: GRAY, fontSize: 12, textAlign: 'center' }}>
          Nothing parked. Park = not now, not giving up.
        </div>
      </div>
    )
  }

  const annotated = parked.map(o => ({ ...o, _minSov: getMinSov(o) }))
  const eligible = annotated.filter(o => score >= o._minSov).sort((a,b) => b._minSov - a._minSov)
  const locked = annotated.filter(o => score < o._minSov).sort((a,b) => a._minSov - b._minSov)

  // Group locked by threshold
  const lockedByThreshold = locked.reduce((acc, o) => {
    (acc[o._minSov] = acc[o._minSov] || []).push(o)
    return acc
  }, {})
  const thresholds = Object.keys(lockedByThreshold).map(Number).sort((a,b) => a - b)

  return (
    <div style={S.panel}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ ...S.panelTitle, marginBottom: 0 }}>Objectives in Queue · {parked.length}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GRAY, fontSize: 11 }}>
          {eligible.length > 0 && <span style={{ color: '#0F766E', fontWeight: 600 }}>⚡ {eligible.length} eligible</span>}
          {locked.length > 0 && <span><Lock size={10} style={{ verticalAlign: 'middle' }} /> {locked.length} locked</span>}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
          {eligible.length > 0 && (
            <div style={{ marginBottom: locked.length ? 16 : 0 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0F766E', fontWeight: 700, marginBottom: 6 }}>
                ⚡ Eligible at your current Sovereignty ({score})
              </div>
              {eligible.map(o => (
                <ParkedRibbonRow key={o.id} o={o} variant="eligible" onActivate={onActivate} onEdit={onEdit} />
              ))}
            </div>
          )}
          {thresholds.map(t => (
            <div key={t} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: GRAY, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={10} /> Unlocks at Sovereignty {t}
              </div>
              {lockedByThreshold[t].map(o => (
                <ParkedRibbonRow key={o.id} o={o} variant="locked" score={score} onEdit={onEdit} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Ribbon-style row for parked queue — matches the table row visual language
function ParkedRibbonRow({ o, variant, score, onActivate, onEdit }) {
  const eff = o.effort || 2
  const imp = o.importance || 2
  const need = variant === 'locked' && score != null ? Math.max(0, o._minSov - score) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}`, fontSize: 13, opacity: variant === 'locked' ? 0.7 : 1 }}>
      <span style={{ flex: 1, color: variant === 'locked' ? TEXT_DIM : NAVY, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => onEdit(o)}>{o.title}</span>
      <span style={S.chip('#F1F5F9', GRAY)}>E{eff}·I{imp}</span>
      <span style={S.chip('#FEF3C7', '#92400E')} title={`Weight ${o.weight} — ${sizeFor(o.weight)}`}>{sizeFor(o.weight)[0]}</span>
      {o.tags && o.tags.length > 0 && <TagPills tags={o.tags} max={2} />}
      <button onClick={() => onEdit(o)} title="Edit" style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><Edit3 size={12} /></button>
      {variant === 'eligible' ? (
        <button onClick={() => onActivate(o.id)} title="Activate"
          style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0F766E', borderColor: '#0F766E' }}>
          <Zap size={11} /> activate
        </button>
      ) : (
        <span style={{ fontSize: 11, color: GRAY, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Lock size={10} /> need +{need}
        </span>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: dueColor(o.due_date, o.hard_deadline).bg, color: dueColor(o.due_date, o.hard_deadline).fg }}>
        <Calendar size={10} />
        {o.start_date ? fmtShort(o.start_date) : '—'} → {o.due_date ? fmtShort(o.due_date) : '—'}
      </span>
    </div>
  )
}

function StatCard({ title, value, sub, accent = NAVY }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: 14, minWidth: 0 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: GRAY, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 24, color: accent, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function DashboardView({ objectives, sov, sovHistory, liveScore, livePressure }) {
  const live = objectives.filter(o => !o.deleted_at)
  const active = live.filter(o => o.state === 'active' && !o.needs_sizing && !o.is_emergency)
  const triage = live.filter(o => o.state === 'active' && o.needs_sizing)
  const parked = live.filter(o => o.state === 'parked')
  const emergency = live.filter(o => o.state === 'active' && o.is_emergency)
  const releasedAll = live.filter(o => o.state === 'released' || o.state === 'foreman')

  // Hours budget across active
  const totalHours = active.reduce((a, o) => a + hoursFor(o), 0)

  // Size mix
  const byBySize = active.reduce((acc, o) => {
    const s = sizeFor(o.weight)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, { Pebble: 0, Stone: 0, Boulder: 0 })

  // Date pressure
  const now = new Date()
  const overdue = active.filter(o => o.due_date && new Date(o.due_date) < new Date(now.toDateString())).length
  const dueWeek = active.filter(o => {
    if (!o.due_date) return false
    const d = daysFromToday(o.due_date)
    return d >= 0 && d <= 7
  }).length
  const dated = active.filter(o => o.due_date).length
  const hardDeadlines = active.filter(o => o.hard_deadline).length

  // Release pace: this week vs prior week
  const startOfThisWeek = (() => {
    const d = new Date(); d.setHours(0,0,0,0)
    d.setDate(d.getDate() - d.getDay()) // Sunday
    return d
  })()
  const startOfLastWeek = new Date(startOfThisWeek); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
  const thisWeekReleased = releasedAll.filter(o => o.released_at && new Date(o.released_at) >= startOfThisWeek).length
  const lastWeekReleased = releasedAll.filter(o => {
    if (!o.released_at) return false
    const t = new Date(o.released_at)
    return t >= startOfLastWeek && t < startOfThisWeek
  }).length
  const paceDelta = thisWeekReleased - lastWeekReleased

  // Released kind breakdown
  const doneCount = releasedAll.filter(o => o.released_kind === 'done').length
  const foremanCount = releasedAll.filter(o => o.released_kind === 'foreman').length
  const foremanPct = releasedAll.length ? Math.round((foremanCount / releasedAll.length) * 100) : 0

  // Avg sov last 14 days
  const last14 = sovHistory.slice(-14)
  const avgSov = last14.length ? (last14.reduce((a, s) => a + s.score, 0) / last14.length).toFixed(1) : '—'

  // Anchor presence
  const anchor = active.find(o => o.is_anchor)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard
          title="State counts"
          value={active.length}
          sub={`active · ${triage.length} triage · ${parked.length} parked${emergency.length ? ` · ${emergency.length} 🚨` : ''}`}
        />
        <StatCard
          title="Hours on the table"
          value={`${totalHours}h`}
          sub={`${byBySize.Pebble}P · ${byBySize.Stone}S · ${byBySize.Boulder}B (est)`}
          accent={BLUE}
        />
        <StatCard
          title="Date pressure"
          value={overdue || dueWeek}
          sub={overdue
            ? `${overdue} overdue · ${dueWeek} due this week`
            : `${dueWeek} due this week · ${dated}/${active.length} dated · ${hardDeadlines} hard 🔒`}
          accent={overdue ? '#B91C1C' : NAVY}
        />
        <StatCard
          title="Release pace"
          value={thisWeekReleased}
          sub={`this week · ${lastWeekReleased} prior · ${paceDelta >= 0 ? '+' : ''}${paceDelta}`}
          accent={paceDelta >= 0 ? '#0F766E' : '#B45309'}
        />
        <StatCard
          title="Released all-time"
          value={releasedAll.length}
          sub={`${doneCount} done · ${foremanCount} foreman (${foremanPct}%)`}
        />
        <StatCard
          title="Sovereignty"
          value={liveScore ?? '—'}
          sub={`pressure ${livePressure ?? 0} · 14-day avg ${avgSov}`}
          accent={BLUE}
        />
      </div>
      <div style={S.panel}>
        <div style={S.panelTitle}>Sovereignty · last 14 days</div>
        <SparkLine data={last14.map(s => s.score)} />
      </div>
      {anchor && (
        <div style={S.panel}>
          <div style={S.panelTitle}>Anchor</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: NAVY }}>
            <Anchor size={16} color={GOLD} />
            <span style={{ flex: 1 }}>{anchor.title}</span>
            <span style={S.chip('#FEF3C7', GOLD)}>{sizeFor(anchor.weight)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BinView({ items, onRestore, onPurge }) {
  if (!items.length) {
    return (
      <div style={{ ...S.panel, textAlign: 'center', padding: 40, color: GRAY, fontSize: 13 }}>
        <Archive size={24} style={{ opacity: 0.4 }} />
        <div style={{ marginTop: 8 }}>Bin is empty.</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Deleted objectives stay here for 30 days before auto-purge.</div>
      </div>
    )
  }
  return (
    <div style={S.panel}>
      <div style={{ ...S.panelTitle, display: 'flex', justifyContent: 'space-between' }}>
        <span>Bin · {items.length}</span>
        <span style={{ fontSize: 10, color: GRAY, fontWeight: 400 }}>Auto-purge after 30 days</span>
      </div>
      {items.map(o => {
        const deletedDate = new Date(o.deleted_at)
        const daysSince = Math.floor((Date.now() - deletedDate) / 86400000)
        const daysLeft = Math.max(0, 30 - daysSince)
        return (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}` }}>
            <span style={{ flex: 1, fontSize: 13, color: TEXT_DIM, textDecoration: 'line-through' }}>{o.title}</span>
            <span style={S.chip('#F1F5F9', GRAY)}>{sizeFor(o.weight)}</span>
            <span style={{ fontSize: 11, color: daysLeft <= 7 ? '#B91C1C' : GRAY }}>
              {daysLeft === 0 ? 'purges today' : `${daysLeft}d left`}
            </span>
            <button style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => onRestore(o.id)}>
              <RotateCcw size={11} /> restore
            </button>
            <button
              style={{ background: 'white', border: `1px solid #FCA5A5`, color: '#B91C1C', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => { if (confirm('Permanently delete? This cannot be undone.')) onPurge(o.id) }}>
              <Trash2 size={11} /> purge
            </button>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ObjectivesPage() {
  const {
    loading, objectives, sov, sovHistory, habit, habitGrid, meditation,
    addObjective, releaseObjective, reopenObjective, parkObjective, reactivateObjective, activateObjective,
    deleteObjective, restoreObjective, purgeObjective,
    setAnchor, updateObjective, rateSovereignty, upsertHabit, saveMeditationAnswer
  } = useObjectives()

  const [coax, setCoax] = useState(false)
  const [coaxIdx, setCoaxIdx] = useState(0)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('objectives-view') || 'cards') // 'cards' | 'table'
  const [tab, setTab] = useState(() => localStorage.getItem('objectives-tab') || 'list') // 'list' | 'dashboard' | 'bin'
  const [editing, setEditing] = useState(null) // objective being edited

  useEffect(() => { localStorage.setItem('objectives-view', viewMode) }, [viewMode])
  useEffect(() => { localStorage.setItem('objectives-tab', tab) }, [tab])

  // Partition objectives — exclude soft-deleted from all live views
  const live = objectives.filter(o => !o.deleted_at)
  const binItems = objectives.filter(o => o.deleted_at).sort((a,b) => new Date(b.deleted_at) - new Date(a.deleted_at))

  const triage = live.filter(o => o.state === 'active' && o.needs_sizing && !o.is_emergency && !o.is_anchor)
  const active = live.filter(o => o.state === 'active' && !o.is_emergency && !o.needs_sizing && !o.is_anchor)
  const emergencies = live.filter(o => o.state === 'active' && o.is_emergency)
  const anchorActive = live.find(o => o.state === 'active' && o.is_anchor) || null
  const parked = live.filter(o => o.state === 'parked')
  const delegatedAll = live
    .filter(o => o.state === 'foreman')
    .sort((a,b) => new Date(b.released_at || 0) - new Date(a.released_at || 0))
  const releasedToday = live
    .filter(o => (o.state === 'released' || o.state === 'foreman') && o.released_at && new Date(o.released_at).toDateString() === new Date().toDateString())
    .sort((a,b) => new Date(b.released_at) - new Date(a.released_at))

  // --- v1.3 computed sovereignty ---
  // All active items count toward capacity + pressure (emergencies + anchor too — they DO eat your day)
  const loadItems = [...active, ...emergencies, ...(anchorActive ? [anchorActive] : [])]
  const ramUsed = loadItems.reduce((a, o) => a + (o.weight || 0), 0)
  const ramCap = CAPACITY_CAP

  const { score: computedScore, pressure } = useMemo(
    () => computeSovereignty(loadItems),
    [loadItems]
  )
  const score = computedScore
  const zone = sovZone(score)

  // Breakdown for the "what's eating it" disclosure
  const pressureBreakdown = useMemo(() => loadItems.map(o => ({
    id: o.id,
    title: o.title,
    weight: o.weight || 0,
    stakes: stakesMult(o),
    urgency: urgencyMult(o),
    pressure: Math.round(itemPressure(o) * 10) / 10
  })).sort((a, b) => b.pressure - a.pressure), [loadItems])

  // Daily snapshot — writes the computed score to sov_ratings once per day
  // so the 30-day trend remains a meaningful diagnostic record.
  useEffect(() => {
    if (loading) return
    const todayKey = todayISO()
    const lastSnap = localStorage.getItem('sov-snapshot-date')
    if (lastSnap === todayKey) return
    if (rateSovereignty) {
      rateSovereignty(score).then(() => {
        localStorage.setItem('sov-snapshot-date', todayKey)
      }).catch(() => {})
    }
  }, [loading, score, rateSovereignty])

  // Sort active: anchor first, then by due_date asc (nulls last), importance desc, weight desc
  const sortedActive = [...active].sort((a,b) => {
    if (a.is_anchor !== b.is_anchor) return a.is_anchor ? -1 : 1
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity
    if (ad !== bd) return ad - bd
    if ((b.importance || 0) !== (a.importance || 0)) return (b.importance || 0) - (a.importance || 0)
    return (b.weight || 0) - (a.weight || 0)
  })

  // Coax mode auto-trigger conditions
  const coaxAutoTrigger = (score <= 4 && active.length > 5) || (active.length > 7)

  // For coax, pick the lowest-weight active objective as easy win
  const easyWin = useMemo(() => {
    const pebbles = [...active].sort((a,b) => a.weight - b.weight)
    return pebbles[coaxIdx % Math.max(1, pebbles.length)]
  }, [active, coaxIdx])

  if (loading) return <div style={{ ...S.page, color: GRAY, fontSize: 13 }}>Loading...</div>

  if (coax) {
    return (
      <div style={{ ...S.page, paddingTop: 60 }}>
        <CoaxMode
          objective={easyWin}
          onRelease={async (id) => { await releaseObjective(id, 'done'); setCoaxIdx(i => i + 1) }}
          onSkip={() => setCoaxIdx(i => i + 1)}
          onExit={() => setCoax(false)}
        />
      </div>
    )
  }

  return (
    <div style={{ ...S.page, background: PAGE_BG }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={S.h1}>Objectives</h1>
        <div style={S.sub}>The infinite game · capacity 10 · sovereignty is what's left after pressure</div>
      </div>

      <PillTabs tab={tab} setTab={setTab} binCount={binItems.length} />

      {tab === 'list' && (
        <>
          <AddObjective
            onAdd={addObjective}
            onPark={parkObjective}
            onForeman={(id) => releaseObjective(id, 'foreman')}
          />

          <MorningArrival meditation={meditation} onSubmit={saveMeditationAnswer} />

          <SovereigntyReading score={score} pressure={pressure} breakdown={pressureBreakdown} history={sovHistory} />

          <CapacityMeter used={ramUsed} capacity={ramCap} />

          {anchorActive && (
            <div style={S.panel}>
              <div style={{ ...S.panelTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Anchor</span>
                <span style={{ fontSize: 10, color: GRAY, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  today's keystone · counts toward pressure, not the active list
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <Anchor size={16} color={GOLD} />
                <span style={{ flex: 1, fontSize: 14, color: NAVY, fontWeight: 600 }}>{anchorActive.title}</span>
                <span style={S.chip('#FEF3C7', GOLD)}>{sizeFor(anchorActive.weight)}</span>
                <button style={S.btnDone} onClick={() => releaseObjective(anchorActive.id, 'done')}>
                  <Check size={12} /> done
                </button>
              </div>
            </div>
          )}

          <EmergencyBanner
            items={emergencies}
            onDone={(id) => releaseObjective(id, 'done')}
            onForeman={(id) => releaseObjective(id, 'foreman')}
          />

          <TriageQueue
            items={triage}
            onSize={(id, patch) => updateObjective(id, patch)}
            onEdit={setEditing}
          />

          <div style={{ ...S.panel, background: '#F0FDF4', border: `2px solid #86EFAC`, boxShadow: '0 2px 12px rgba(34, 197, 94, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
              <div style={{ ...S.panelTitle, fontSize: 16, color: '#065F46', marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: '#22C55E', display: 'inline-block' }} />
                Active · {sortedActive.length}
                <span style={{ fontSize: 10, fontWeight: 500, color: '#15803D', textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>← work this. nothing else.</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setViewMode('cards')} title="Card view"
                  style={{ background: viewMode === 'cards' ? '#EEF2F7' : 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: NAVY, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}>
                  <ListIcon size={11} /> cards
                </button>
                <button onClick={() => setViewMode('table')} title="Table view"
                  style={{ background: viewMode === 'table' ? '#EEF2F7' : 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: NAVY, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}>
                  <TableIcon size={11} /> table
                </button>
                <button style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', marginLeft: 4 }} onClick={() => setCoax(true)}>stuck?</button>
              </div>
            </div>

            {coaxAutoTrigger && !coax && (
              <div style={{ background: '#FEF3C7', border: `1px solid #FCD34D`, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, color: '#92400E' }}>
                Queue is heavy and Sovereignty is low. Try <button style={{ ...S.btnGhost, fontSize: 11, padding: '2px 8px', marginLeft: 4 }} onClick={() => setCoax(true)}>Coax Mode →</button>
              </div>
            )}

            {sortedActive.length === 0 ? (
              <div style={{ padding: '20px 0', color: GRAY, fontSize: 13, textAlign: 'center' }}>
                Nothing active. {meditation ? 'The Rock answer became your anchor — start there.' : 'Tap "Add objective" to begin.'}
              </div>
            ) : viewMode === 'table' ? (
              <TableView
                items={sortedActive}
                onRelease={(id) => releaseObjective(id, 'done')}
                onForeman={(id) => releaseObjective(id, 'foreman')}
                onPark={parkObjective}
                onEdit={setEditing}
              />
            ) : sortedActive.map(o => (
              <ObjectiveCard key={o.id} o={o}
                onRelease={(id) => releaseObjective(id, 'done')}
                onForeman={(id) => releaseObjective(id, 'foreman')}
                onPark={parkObjective}
                onToggleAnchor={(id, val) => val ? setAnchor(id) : updateObjective(id, { is_anchor: false })}
                onDelete={deleteObjective}
                onEdit={setEditing}
              />
            ))}
          </div>

          <EligibleLockedSection
            parked={parked}
            score={score}
            onActivate={activateObjective}
            onEdit={setEditing}
          />

          <DelegatedContainer
            items={delegatedAll}
            onReopen={reopenObjective}
            onEdit={setEditing}
          />

          <ReleasedToday items={releasedToday} onReopen={reopenObjective} />
        </>
      )}

      {tab === 'habits' && (
        <HabitGrid
          habit={habit}
          grid={habitGrid}
          onToggle={(k, v) => upsertHabit({ [k]: v })}
          onWeed={(n) => upsertHabit({ weed_count: n })}
        />
      )}

      {tab === 'dashboard' && (
        <DashboardView objectives={objectives} sov={sov} sovHistory={sovHistory} liveScore={score} livePressure={pressure} />
      )}

      {tab === 'bin' && (
        <BinView items={binItems} onRestore={restoreObjective} onPurge={purgeObjective} />
      )}

      {editing && (
        <EditObjectiveModal
          o={editing}
          onClose={() => setEditing(null)}
          onSave={updateObjective}
          onDelete={deleteObjective}
          onForeman={(id) => releaseObjective(id, 'foreman')}
          onPark={parkObjective}
        />
      )}
    </div>
  )
}
