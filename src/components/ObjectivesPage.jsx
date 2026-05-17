import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Play, Pause, Star, Flame, ChevronDown, ChevronUp, X, Trash2, ArrowUpRight, Check, Send, Anchor, Calendar, Edit3, Table as TableIcon, List as ListIcon, AlertTriangle, AlertCircle } from 'lucide-react'
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

const S = {
  page: { maxWidth: 760, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Arial, Helvetica, sans-serif', color: NAVY },
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

function SovereigntyGate({ sov, history, onRate }) {
  const score = sov?.score ?? null
  const zone = score ? sovZone(score) : null
  const [open, setOpen] = useState(score == null)
  const [pick, setPick] = useState(score || 5)

  return (
    <div style={S.panel}>
      <div style={S.panelTitle}>Sovereignty</div>

      {score == null && !open && (
        <button style={{ ...S.btnPrimary, width: '100%' }} onClick={() => setOpen(true)}>Rate now</button>
      )}

      {score != null && (
        <>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={S.chip(zone.bg, zone.color)}>{zone.label}</span>
            <button style={{ ...S.btnGhost, fontSize: 11, padding: '4px 8px' }} onClick={() => setOpen(o => !o)}>{open ? 'close' : 'update'}</button>
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 6, fontStyle: 'italic' }}>{zone.desc}</div>
        </>
      )}

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
          <div style={{ fontSize: 11, color: GRAY, marginBottom: 6 }}>How sovereign do I feel right now? (1–10)</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {Array.from({ length: 10 }).map((_, i) => {
              const v = i + 1
              const z = sovZone(v)
              return (
                <button key={v} onClick={() => setPick(v)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 6, border: pick === v ? `2px solid ${z.color}` : `1px solid ${PANEL_BORDER}`,
                    background: pick === v ? z.bg : 'white', color: pick === v ? z.color : NAVY,
                    fontWeight: pick === v ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                  }}>{v}</button>
              )
            })}
          </div>
          <button style={{ ...S.btnPrimary, width: '100%' }} onClick={async () => { await onRate(pick); setOpen(false) }}>
            {score == null ? 'Save rating' : 'Update rating'}
          </button>
        </div>
      )}

      {/* Mini trend */}
      {history.length > 1 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${PANEL_BORDER}` }}>
          <div style={{ fontSize: 10, color: GRAY, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>30-day trend (Future David)</div>
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
// RAMMeter
// =============================================================================

function RAMMeter({ used, capacity, zone }) {
  const pct = Math.min(100, (used / capacity) * 100)
  const over = used > capacity
  const remaining = capacity - used
  return (
    <div style={S.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={S.panelTitle}>RAM</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: over ? '#DC2626' : NAVY }}>{used} / {capacity}</div>
      </div>
      <div style={{ height: 12, background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: over ? '#DC2626' : zone?.color || NAVY,
          transition: 'width 0.3s'
        }} />
      </div>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8 }}>
        {over ? `⚠ Over capacity by ${used - capacity}. Park or release something.`
          : remaining >= 9 ? 'Capacity for a Boulder.'
          : remaining >= 4 ? `Capacity for ${remaining >= 9 ? 'a Boulder' : 'a Stone'}.`
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
        <button onClick={() => onEdit(o)} title="Edit" style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><Edit3 size={13} /></button>
        <button onClick={() => setMenuOpen(m => !m)} style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2, fontSize: 18, lineHeight: 1 }}>⋯</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        <span style={S.chip(sColor + '20', sColor)}>{size}</span>
        <span style={S.chip('#F1F5F9', NAVY)}>E{o.effort}</span>
        <span style={S.chip('#F1F5F9', NAVY)}>I{o.importance}</span>
        <span style={S.chip(o.kind === 'design' ? '#FEF3C7' : '#E0F2FE', o.kind === 'design' ? '#B45309' : '#0369A1')}>{o.kind}</span>
        {o.due_date && (
          <span style={S.chip(dueC.bg, dueC.fg)}>
            {o.hard_deadline ? '🔒 ' : ''}📅 {fmtDue(o.due_date)}
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

function EditObjectiveModal({ o, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(o.title || '')
  const [effort, setEffort] = useState(o.effort ?? 2)
  const [importance, setImportance] = useState(o.importance ?? 2)
  const [kind, setKind] = useState(o.kind || 'execution')
  const [who, setWho] = useState(o.who || '')
  const [dueDate, setDueDate] = useState(o.due_date || '')
  const [hardDeadline, setHardDeadline] = useState(!!o.hard_deadline)

  const save = async () => {
    if (!title.trim()) return
    await onSave(o.id, {
      title: title.trim(),
      effort, importance, kind,
      who: who.trim() || null,
      due_date: dueDate || null,
      hard_deadline: hardDeadline,
      needs_sizing: false, // editing implies user has sized it
    })
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,26,65,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, maxWidth: 460, width: '100%', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Edit objective</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY }}><X size={18} /></button>
        </div>

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Title</div>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} style={{ ...S.input, marginBottom: 12 }} />

        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Who (optional)</div>
        <input value={who} onChange={e => setWho(e.target.value)} placeholder="Greg, Cheryl, Avery..." style={{ ...S.input, marginBottom: 12 }} />

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

        <div style={{ fontSize: 11, color: GRAY, marginBottom: 14 }}>
          Weight: <strong style={{ color: NAVY }}>{effort * importance}</strong> ({sizeFor(effort * importance)})
        </div>

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
        {o.due_date && (
          <span style={{ ...S.chip(dueC.bg, dueC.fg), fontSize: 9 }}>{o.hard_deadline ? '🔒' : '📅'}{fmtDue(o.due_date)}</span>
        )}
        {o.needs_sizing && <span style={{ ...S.chip('#FEF3C7', '#92400E'), fontSize: 9 }}>⚠</span>}
        {o.who && <span style={{ fontSize: 10, color: GRAY }}>w/ {o.who}</span>}
        <button onClick={() => onEdit(o)} title="Edit" style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><Edit3 size={11} /></button>
        <button onClick={() => onRelease(o.id)} title="Done" style={{ background: '#0F766E', color: 'white', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Check size={10} /></button>
        <button onClick={() => onForeman(o.id)} title="Foreman" style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><ArrowUpRight size={10} /></button>
        <button onClick={() => onPark(o.id)} title="Park" style={{ background: 'transparent', color: GRAY, border: `1px solid ${PANEL_BORDER}`, borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>P</button>
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

function AddObjective({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [effort, setEffort] = useState(null)        // null = not sized → triage
  const [importance, setImportance] = useState(null)
  const [kind, setKind] = useState('execution')
  const [emergency, setEmergency] = useState(false)
  const [who, setWho] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [hardDeadline, setHardDeadline] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    const unsized = effort === null || importance === null
    await onAdd({
      title: title.trim(),
      effort: effort ?? 2,
      importance: importance ?? 2,
      kind, is_emergency: emergency,
      who: who.trim() || null,
      due_date: dueDate || null,
      hard_deadline: hardDeadline,
      needs_sizing: unsized,
    })
    setTitle(''); setEffort(null); setImportance(null); setKind('execution'); setEmergency(false); setWho(''); setDueDate(''); setHardDeadline(false)
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
      <input placeholder="Who? (optional — Greg, Cheryl, Avery...)" value={who} onChange={e => setWho(e.target.value)} style={{ ...S.input, marginBottom: 12 }} />

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

      <div style={{ fontSize: 11, color: GRAY, marginBottom: 12 }}>
        {unsized
          ? <>Unsized — will land in <strong style={{ color: '#92400E' }}>Triage Queue</strong> for later rating.</>
          : <>Weight: <strong style={{ color: NAVY }}>{effort * importance}</strong> ({sizeFor(effort * importance)})</>}
      </div>

      <button style={{ ...S.btnPrimary, width: '100%' }} onClick={submit}>Capture</button>
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

function ReleasedToday({ items }) {
  if (!items.length) return null
  return (
    <div style={S.panel}>
      <div style={S.panelTitle}>Released today · {items.length}</div>
      {items.map(o => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${PANEL_BORDER}`, fontSize: 13 }}>
          {o.released_kind === 'foreman' ? <ArrowUpRight size={14} color="#7C3AED" /> : <Check size={14} color="#0F766E" />}
          <span style={{ flex: 1, color: NAVY }}>{o.title}</span>
          <span style={{ fontSize: 11, color: GRAY }}>{new Date(o.released_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ObjectivesPage() {
  const {
    loading, objectives, sov, sovHistory, habit, habitGrid, meditation,
    addObjective, releaseObjective, parkObjective, reactivateObjective, deleteObjective,
    setAnchor, updateObjective, rateSovereignty, upsertHabit, saveMeditationAnswer
  } = useObjectives()

  const [coax, setCoax] = useState(false)
  const [coaxIdx, setCoaxIdx] = useState(0)
  const [parkedOpen, setParkedOpen] = useState(false)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('objectives-view') || 'cards') // 'cards' | 'table'
  const [editing, setEditing] = useState(null) // objective being edited

  useEffect(() => { localStorage.setItem('objectives-view', viewMode) }, [viewMode])

  const score = sov?.score ?? 5
  const zone = sovZone(score)

  // Partition objectives
  const triage = objectives.filter(o => o.state === 'active' && o.needs_sizing && !o.is_emergency)
  const active = objectives.filter(o => o.state === 'active' && !o.is_emergency && !o.needs_sizing)
  const emergencies = objectives.filter(o => o.state === 'active' && o.is_emergency)
  const parked = objectives.filter(o => o.state === 'parked')
  const releasedToday = objectives
    .filter(o => (o.state === 'released' || o.state === 'foreman') && o.released_at && new Date(o.released_at).toDateString() === new Date().toDateString())
    .sort((a,b) => new Date(b.released_at) - new Date(a.released_at))

  const ramUsed = active.reduce((a, o) => a + (o.weight || 0), 0)

  // RAM cap by zone: triage forces 3, operating 7, caught up 10, open water 12
  const ramCap = score <= 3 ? 3 : score <= 6 ? 7 : score <= 8 ? 10 : 12

  // Sort active: anchor first, then by weight desc
  const sortedActive = [...active].sort((a,b) => {
    if (a.is_anchor !== b.is_anchor) return a.is_anchor ? -1 : 1
    return b.weight - a.weight
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
        <div style={S.sub}>The infinite game · weighted by RAM · gated by Sovereignty</div>
      </div>

      <MorningArrival meditation={meditation} onSubmit={saveMeditationAnswer} />

      <SovereigntyGate sov={sov} history={sovHistory} onRate={rateSovereignty} />

      <RAMMeter used={ramUsed} capacity={ramCap} zone={zone} />

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

      <div style={{ ...S.panel }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
          <div style={S.panelTitle}>Active · {sortedActive.length}</div>
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

        <AddObjective onAdd={addObjective} />
      </div>

      {parked.length > 0 && (
        <div style={S.panel}>
          <button onClick={() => setParkedOpen(o => !o)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ ...S.panelTitle, marginBottom: 0 }}>Parked · {parked.length}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: GRAY, fontSize: 11 }}>
              {score < 7 && '🔒 unlocks at Sov 7'}
              {parkedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>
          {parkedOpen && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
              {parked.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${PANEL_BORDER}` }}>
                  <span style={{ flex: 1, fontSize: 13, color: TEXT_DIM }}>{o.title}</span>
                  <span style={S.chip('#F1F5F9', GRAY)}>{sizeFor(o.weight)}</span>
                  {score >= 7 ? (
                    <button style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px' }} onClick={() => reactivateObjective(o.id)}>activate</button>
                  ) : (
                    <button disabled style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', opacity: 0.5 }}>locked</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <HabitGrid
        habit={habit}
        grid={habitGrid}
        onToggle={(k, v) => upsertHabit({ [k]: v })}
        onWeed={(n) => upsertHabit({ weed_count: n })}
      />

      <ReleasedToday items={releasedToday} />

      {editing && (
        <EditObjectiveModal
          o={editing}
          onClose={() => setEditing(null)}
          onSave={updateObjective}
          onDelete={deleteObjective}
        />
      )}
    </div>
  )
}
