import { useState, useEffect, useCallback } from 'react'
import { Brain, RefreshCw, Clock, Flag, ListOrdered, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SECTION_BLUE = '#1F4060'

function SectionHeader({ children }) {
  return (
    <div style={{
      color: SECTION_BLUE, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', fontSize: '12.5px', marginBottom: '14px',
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>{children}</div>
  )
}

function fmtDay(day) {
  if (!day) return ''
  return new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function BrainPage() {
  const [b, setB] = useState(undefined) // undefined loading, null none

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_briefings')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1)
      if (!error && data && data.length) setB(data[0])
      else setB(null)
    } catch { setB(null) }
  }, [])

  useEffect(() => { load() }, [load])

  if (b === undefined) {
    return <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', padding: '40px' }}>LOADING…</div>
  }

  if (b === null) {
    return (
      <div className="sa-grid">
        <div className="col-12 sa-card" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="sa-card-icon" style={{ margin: '0 auto 18px', width: '52px', height: '52px' }}>
            <Brain size={26} />
          </div>
          <div className="sa-serif" style={{ fontSize: '30px', color: 'var(--sa-ink)' }}>The Brain</div>
          <p style={{ maxWidth: '48ch', margin: '12px auto 0', fontSize: '14px', lineHeight: 1.6, color: 'var(--sa-ink-2)' }}>
            The evening briefing for the day ahead lands here at 10:20 every night: your schedule
            with prep context, suggested priorities, carryover, and watch-outs.
          </p>
          <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '22px' }}>NO BRIEFING YET · FIRST FIRE TONIGHT 10:20 PM</div>
        </div>
      </div>
    )
  }

  return (
    <div className="sa-grid">
      {/* Header */}
      <div className="col-12 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div className="sa-tele" style={{ color: 'var(--sa-ink-3)' }}>BRIEFING FOR</div>
            <div className="sa-serif" style={{ fontSize: '28px', color: 'var(--sa-ink)', marginTop: '4px' }}>{fmtDay(b.briefing_for)}</div>
            {b.headline && (
              <div style={{ fontSize: '15px', color: 'var(--sa-ink-2)', marginTop: '8px', fontStyle: 'italic' }}>{b.headline}</div>
            )}
          </div>
          <button onClick={load} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px',
            padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--sa-border-2)',
            background: 'var(--sa-surface)', color: 'var(--sa-ink-2)', cursor: 'pointer',
          }}><RefreshCw size={13} /> Refresh</button>
        </div>
        {b.summary && (
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--sa-ink)', margin: '16px 0 0', maxWidth: '80ch' }}>{b.summary}</p>
        )}
      </div>

      {/* Schedule with prep */}
      <div className="col-12 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader><Clock size={14} /> The Day, Hour by Hour</SectionHeader>
        {!(b.schedule || []).length && <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>Open calendar.</div>}
        {(b.schedule || []).map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', padding: '11px 0', borderTop: i ? '1px solid var(--sa-border)' : 'none' }}>
            <div className="sa-tele" style={{ flex: '0 0 76px', color: 'var(--sa-accent-deep)', paddingTop: '2px' }}>{s.time}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--sa-ink)' }}>
                {s.title}{s.with ? <span style={{ fontWeight: 400, color: 'var(--sa-ink-2)' }}> · {s.with}</span> : null}
              </div>
              {s.prep && <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--sa-ink-2)', marginTop: '3px' }}>{s.prep}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Priorities */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader><ListOrdered size={14} /> Suggested Priorities</SectionHeader>
        {!(b.priorities || []).length && <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>None suggested.</div>}
        {(b.priorities || []).map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', padding: '7px 0', alignItems: 'flex-start' }}>
            <span className="sa-tele" style={{ color: 'var(--sa-accent-deep)', paddingTop: '2px' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--sa-ink)' }}>{p}</span>
          </div>
        ))}
      </div>

      {/* Carryover */}
      <div className="col-6 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader><Flag size={14} /> Carrying Into the Day</SectionHeader>
        {!(b.carryover || []).length && <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>Clean slate.</div>}
        {(b.carryover || []).map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', alignItems: 'flex-start' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: SECTION_BLUE, opacity: 0.55, marginTop: '7px' }} />
            <span style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--sa-ink)' }}>{c}</span>
          </div>
        ))}
      </div>

      {/* Watchouts */}
      <div className="col-12 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <SectionHeader><Eye size={14} /> Watch-Outs</SectionHeader>
        {!(b.watchouts || []).length && <div style={{ fontSize: '13.5px', color: 'var(--sa-ink-3)' }}>Nothing flagged.</div>}
        {(b.watchouts || []).map((w, i) => (
          <div key={i} style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--sa-ink)', padding: '5px 0' }}>· {w}</div>
        ))}
        <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '18px' }}>
          COMPOSED {new Date(b.generated_at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).toUpperCase()} · EVENING BRIEFING FIRES NIGHTLY 10:20 PM
        </div>
      </div>
    </div>
  )
}
