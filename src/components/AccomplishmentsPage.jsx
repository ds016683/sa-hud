import { useMemo } from 'react'
import { Check, X as XIcon, ArrowUpRight, Plus, Sparkles } from 'lucide-react'
import useObjectives from '../hooks/useObjectives'

const NAVY = '#002C77'
const GRAY = '#5E7187'
const TEAL = '#0F766E'
const PANEL_BORDER = '#E1E8F0'
const GOLD = '#D4A106'

const S = {
  panel: {
    background: 'white',
    border: `1px solid ${PANEL_BORDER}`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  pill: (bg, fg) => ({
    background: bg,
    color: fg,
    fontWeight: 600,
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  }),
}

// CT-local "today" — matches DB rows which are keyed on David's CT day, not UTC.
const todayStr = () => {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' })
  return fmt.format(new Date())
}
const ctDayOf = (iso) => {
  if (!iso) return null
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' })
  return fmt.format(new Date(iso))
}
const isToday = (iso) => iso && ctDayOf(iso) === todayStr()

function HabitRow({ ok, label, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      borderRadius: 8,
      background: ok ? '#F0FDF4' : '#F8FAFC',
      border: `1px solid ${ok ? '#86EFAC' : PANEL_BORDER}`,
      marginBottom: 6,
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 13, color: NAVY, fontWeight: 500 }}>{label}</div>
      {ok ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#15803D', fontWeight: 700, fontSize: 12 }}>
          <Check size={14} /> done
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: GRAY, fontSize: 12 }}>
          <XIcon size={12} /> not yet
        </div>
      )}
    </div>
  )
}

function ItemRow({ o, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      borderTop: `1px solid ${PANEL_BORDER}`,
      fontSize: 12,
    }}>
      <div style={{ flex: 1, color: NAVY, fontWeight: 500, lineHeight: 1.3 }}>
        {o.title}
        {o.stakeholder && <span style={{ marginLeft: 8, fontSize: 10, color: '#075985' }}>← {o.stakeholder}</span>}
        {o.who && <span style={{ marginLeft: 8, fontSize: 10, color: GRAY }}>→ {o.who}</span>}
      </div>
      <span style={{ ...S.pill('#F1F5F9', NAVY), fontSize: 9 }}>E{o.effort}·I{o.importance}</span>
      <span style={{ ...S.pill(accent.bg, accent.fg), fontSize: 9 }}>+{(o.effort||0) * (o.importance||0)}</span>
    </div>
  )
}

export default function AccomplishmentsPage() {
  const { loading, objectives, habit, meditation } = useObjectives()

  const { released, newToday, delegatedToday, totalScore } = useMemo(() => {
    const released = objectives.filter(o => o.released_kind === 'done' && isToday(o.released_at))
    const delegatedToday = objectives.filter(o => o.released_kind === 'foreman' && isToday(o.released_at))
    const newToday = objectives.filter(o => isToday(o.captured_at))
    const totalScore = released.reduce((sum, o) => sum + (o.effort || 0) * (o.importance || 0), 0)
    return { released, newToday, delegatedToday, totalScore }
  }, [objectives])

  const habitsCompleted = [habit?.sleep_ok, habit?.devotional, habit?.meditation, habit?.gym].filter(Boolean).length
  const meditationAnswered = !!(meditation && (meditation.rock_answer || meditation.coal_answer || meditation.gem_answer))

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: GRAY, fontFamily: 'Arial, Helvetica, sans-serif' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 880,
      margin: '0 auto',
      padding: '24px 20px 60px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: NAVY,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={20} color={GOLD} />
          Today's Accomplishments
        </div>
        <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>
          You've already arrived. Here's what that looks like today.
        </div>
      </div>

      {/* Habits — lead */}
      <div style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={S.panelTitle}>Habits · {habitsCompleted} of 4</div>
          <div style={{ fontSize: 10, color: GRAY }}>foundation</div>
        </div>
        <HabitRow ok={!!habit?.sleep_ok}   label="Sleep"      icon="💤" />
        <HabitRow ok={!!habit?.devotional} label="Devotional" icon="📖" />
        <HabitRow ok={!!habit?.meditation} label="Meditation" icon="🧘" />
        <HabitRow ok={!!habit?.gym}        label="Gym"        icon="🏋️" />

        {/* Morning meditation answers — bonus signal */}
        <div style={{
          marginTop: 10, padding: '8px 12px',
          background: meditationAnswered ? '#F0FDF4' : '#F8FAFC',
          border: `1px solid ${meditationAnswered ? '#86EFAC' : PANEL_BORDER}`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
        }}>
          <div style={{ fontSize: 16 }}>🌅</div>
          <div style={{ flex: 1, color: NAVY, fontWeight: 500 }}>Morning Arrival</div>
          {meditationAnswered
            ? <div style={{ color: '#15803D', fontWeight: 700, fontSize: 12, display:'inline-flex', alignItems:'center', gap:4 }}><Check size={14} /> answered</div>
            : <div style={{ color: GRAY, fontSize: 12 }}>not yet</div>}
        </div>
      </div>

      {/* Released today */}
      <div style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={S.panelTitle}>Released today · {released.length}</div>
          <div style={{ fontSize: 11, color: TEAL, fontWeight: 700 }}>
            Total score: {totalScore}
          </div>
        </div>
        {released.length === 0 ? (
          <div style={{ fontSize: 12, color: GRAY, fontStyle: 'italic', padding: '4px 0' }}>
            Nothing released yet today. The day's still in motion.
          </div>
        ) : (
          <div>{released.map(o => <ItemRow key={o.id} o={o} accent={{ bg: '#D1FAE5', fg: '#065F46' }} />)}</div>
        )}
      </div>

      {/* New today */}
      <div style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={S.panelTitle}>New today · {newToday.length}</div>
          <div style={{ fontSize: 10, color: GRAY, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Plus size={11} /> captured
          </div>
        </div>
        {newToday.length === 0 ? (
          <div style={{ fontSize: 12, color: GRAY, fontStyle: 'italic', padding: '4px 0' }}>
            No new captures yet today.
          </div>
        ) : (
          <div>{newToday.map(o => <ItemRow key={o.id} o={o} accent={{ bg: '#DBEAFE', fg: '#1E40AF' }} />)}</div>
        )}
      </div>

      {/* Delegated today */}
      <div style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={S.panelTitle}>Delegated today · {delegatedToday.length}</div>
          <div style={{ fontSize: 10, color: '#6D28D9', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={11} /> released to foreman
          </div>
        </div>
        {delegatedToday.length === 0 ? (
          <div style={{ fontSize: 12, color: GRAY, fontStyle: 'italic', padding: '4px 0' }}>
            Nothing handed off today.
          </div>
        ) : (
          <div>{delegatedToday.map(o => <ItemRow key={o.id} o={o} accent={{ bg: '#EDE9FE', fg: '#6D28D9' }} />)}</div>
        )}
      </div>
    </div>
  )
}
