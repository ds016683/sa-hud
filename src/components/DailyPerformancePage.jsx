import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, Circle, Flag, Inbox, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SECTION_BLUE = '#1F4060'

// Ledger sources feeding the composer. key must match source_counts keys.
const SOURCES = [
  { key: 'meetings', label: 'Granola' },
  { key: 'sessions', label: 'Session Boards' },
  { key: 'emails', label: 'Email' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'time', label: 'Time Tracking' },
  { key: 'todos', label: 'To Dos' },
]

function fmtTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDay(day) {
  if (!day) return ''
  const d = new Date(day + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function SectionHeader({ children }) {
  return (
    <div style={{
      color: SECTION_BLUE, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', fontSize: '12.5px', marginBottom: '14px',
    }}>{children}</div>
  )
}

function SourceChips({ counts }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {SOURCES.map(({ key, label }) => {
        const v = counts ? counts[key] : undefined
        const piped = v !== undefined && v !== null
        return (
          <span key={key} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
            letterSpacing: '0.04em',
            border: `1px solid ${piped ? 'var(--sa-accent-line)' : 'var(--sa-border)'}`,
            background: piped ? 'var(--sa-accent-soft)' : 'transparent',
            color: piped ? 'var(--sa-ink)' : 'var(--sa-ink-3)',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: piped ? 'var(--sa-accent-deep)' : 'var(--sa-border-2)',
            }} />
            {label}{piped ? ` · ${v}` : ' · not piped'}
          </span>
        )
      })}
    </div>
  )
}

export default function DailyPerformancePage() {
  const [rows, setRows] = useState(null)
  const [sel, setSel] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_performance')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(30)
      if (!error) { setRows(data || []); setSel(0) }
      else setRows([])
    } catch {
      // network hiccup — show the empty state instead of hanging on LOADING
      setRows((prev) => prev || [])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const row = rows && rows[sel]

  const toggleMustDo = async (idx) => {
    if (!row || saving) return
    const next = row.must_do.map((t, i) => i === idx ? { ...t, done: !t.done } : t)
    setSaving(true)
    const { error } = await supabase
      .from('daily_performance')
      .update({ must_do: next })
      .eq('id', row.id)
    if (!error) {
      setRows(rows.map((r) => r.id === row.id ? { ...r, must_do: next } : r))
    }
    setSaving(false)
  }

  if (rows === null) {
    return <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', padding: '40px' }}>Loading…</div>
  }

  if (!rows.length) {
    return (
      <div className="sa-grid">
        <div className="col-12 sa-card" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="sa-serif" style={{ fontSize: '26px', color: 'var(--sa-ink)' }}>Daily Performance</div>
          <p style={{ maxWidth: '52ch', margin: '12px auto 0', fontSize: '14px', lineHeight: 1.6, color: 'var(--sa-ink-2)' }}>
            Every 30 minutes, the day&rsquo;s new Ledger activity is read and summarized here:
            what got done, what must still happen today, and what needs to be resourced or assigned.
          </p>
          <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '22px' }}>NO RUNS YET · AWAITING FIRST HEARTBEAT</div>
        </div>
      </div>
    )
  }

  const done = (row.must_do || []).filter((t) => t.done).length
  const total = (row.must_do || []).length

  return (
    <div className="sa-grid">
      {/* Header: which run we're looking at + source coverage */}
      <div className="col-12 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div className="sa-serif" style={{ fontSize: '26px', color: 'var(--sa-ink)' }}>{fmtDay(row.day)}</div>
            <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} /> AS OF {fmtTime(row.generated_at).toUpperCase()} · REFRESHES ON THE :15 AND :45
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {rows.length > 1 && (
              <select
                value={sel}
                onChange={(e) => setSel(Number(e.target.value))}
                style={{
                  fontSize: '12px', padding: '6px 10px', borderRadius: '8px',
                  border: '1px solid var(--sa-border-2)', background: 'var(--sa-surface)',
                  color: 'var(--sa-ink)',
                }}
              >
                {rows.map((r, i) => (
                  <option key={r.id} value={i}>
                    {fmtDay(r.day)} · {fmtTime(r.generated_at)}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={load}
              title="Reload"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', padding: '6px 12px', borderRadius: '8px',
                border: '1px solid var(--sa-border-2)', background: 'var(--sa-surface)',
                color: 'var(--sa-ink-2)', cursor: 'pointer',
              }}
            ><RefreshCw size={13} /> Refresh</button>
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <SourceChips counts={row.source_counts} />
        </div>
      </div>

      {/* The day so far */}
      <div className="col-12 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader>The Day So Far</SectionHeader>
        <p className="sa-serif" style={{ fontSize: '18px', lineHeight: 1.65, color: 'var(--sa-ink)', margin: 0, maxWidth: '78ch' }}>
          {row.summary}
        </p>
      </div>

      {/* Must be done today */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <SectionHeader>Must Be Done Today</SectionHeader>
          {total > 0 && (
            <span className="sa-tele" style={{ color: done === total ? 'var(--sa-accent-deep)' : 'var(--sa-ink-3)' }}>
              {done}/{total}
            </span>
          )}
        </div>
        {(row.must_do || []).length === 0 && (
          <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>Nothing flagged for today.</div>
        )}
        {(row.must_do || []).map((t, i) => (
          <button
            key={i}
            onClick={() => toggleMustDo(i)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
              textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
              padding: '7px 0', color: t.done ? 'var(--sa-ink-3)' : 'var(--sa-ink)',
            }}
          >
            {t.done
              ? <CheckCircle2 size={17} style={{ color: 'var(--sa-accent-deep)', flexShrink: 0, marginTop: '1px' }} />
              : <Circle size={17} style={{ color: 'var(--sa-border-2)', flexShrink: 0, marginTop: '1px' }} />}
            <span style={{
              fontSize: '14px', lineHeight: 1.5,
              textDecoration: t.done ? 'line-through' : 'none',
            }}>{t.text}</span>
          </button>
        ))}
      </div>

      {/* Primary accomplishments */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader>Primary Accomplishments</SectionHeader>
        {(row.accomplishments || []).length === 0 && (
          <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>Nothing banked yet.</div>
        )}
        {(row.accomplishments || []).map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 0' }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '2px', flexShrink: 0,
              background: 'var(--sa-accent)', marginTop: '7px',
            }} />
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--sa-ink)' }}>{a}</span>
          </div>
        ))}
      </div>

      {/* Interactions */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader>Interactions</SectionHeader>
        {!(row.interactions || []).length && (
          <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>No interactions surfaced yet.</div>
        )}
        {(row.interactions || []).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: SECTION_BLUE, opacity: 0.55, marginTop: '7px' }} />
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--sa-ink)' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Learned */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader>What You Learned</SectionHeader>
        {!(row.learned || []).length && (
          <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>Nothing banked yet.</div>
        )}
        {(row.learned || []).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '2px', flexShrink: 0, background: 'var(--sa-accent)', marginTop: '7px' }} />
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--sa-ink)' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Team allocation */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader>Team Allocation</SectionHeader>
        {!(row.team_allocation || []).length && (
          <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>No time logged yet today.</div>
        )}
        {(row.team_allocation || []).map((s, i) => (
          <div key={i} style={{
            fontSize: '13.5px', lineHeight: 1.6, padding: '4px 0',
            color: 'var(--sa-ink)', fontFamily: 'var(--font-mono, monospace)',
            borderTop: i ? '1px solid var(--sa-border)' : 'none',
          }}>{s}</div>
        ))}
      </div>

      {/* New items to resource / task / assign */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader>Needs Resourcing · Tasking · Assignment</SectionHeader>
        {(row.new_items || []).length === 0 && (
          <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>Nothing new surfaced.</div>
        )}
        {(row.new_items || []).map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 0' }}>
            <Flag size={15} style={{ color: SECTION_BLUE, flexShrink: 0, marginTop: '3px', opacity: 0.7 }} />
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--sa-ink)' }}>{n}</span>
          </div>
        ))}
      </div>

      {/* Composer's read on the day */}
      <div className="col-12 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader>The Read</SectionHeader>
        {row.notes
          ? <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--sa-ink-2)', margin: 0 }}>{row.notes}</p>
          : <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>No additional read this run.</div>}
        <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Inbox size={12} /> COMPOSED BY {(row.model || 'LUMEN').toUpperCase()}
        </div>
      </div>
    </div>
  )
}
