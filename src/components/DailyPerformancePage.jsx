import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, Circle, Flag, Inbox, Clock, X } from 'lucide-react'
import { BADGES, milesGrade } from '../constants/collection'
import { supabase } from '../lib/supabase'

const SECTION_BLUE = '#1F4060'
const GOLD = '#F8C761'
const GOLD_DEEP = '#E6B54F'
const PERIWINKLE = '#96A8F0' // CIP's single cool accent

// Ledger sources feeding the composer. key must match source_counts keys.
const SOURCES = [
  { key: 'meetings', label: 'Granola' },
  { key: 'sessions', label: 'Session Boards' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'time', label: 'Time Tracking' },
  { key: 'emails', label: 'Email' },
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

// Theme: 'light' = TH operator surface; 'cip' = the investor-deck treatment
// (navy stage, Lora at deck weight/tracking, gold triangle eyebrows, hairline panels).
function themeOf(cip) {
  return {
    ink: cip ? '#EAF1F8' : 'var(--sa-ink)',
    ink2: cip ? 'rgba(234,241,248,0.66)' : 'var(--sa-ink-2)',
    ink3: cip ? 'rgba(234,241,248,0.42)' : 'var(--sa-ink-3)',
    border: cip ? 'rgba(255,255,255,0.10)' : 'var(--sa-border)',
    border2: cip ? 'rgba(255,255,255,0.22)' : 'var(--sa-border-2)',
    cardClass: cip ? '' : 'sa-card',
    cardStyle: cip
      ? { background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 'var(--sa-pad)' }
      : { padding: 'var(--sa-pad)' },
    serifStyle: cip ? { fontWeight: 500, letterSpacing: '-0.01em', color: '#fff' } : { color: 'var(--sa-ink)' },
    controlStyle: (extra = {}) => ({
      fontSize: '12px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
      border: `1px solid ${cip ? 'rgba(255,255,255,0.22)' : 'var(--sa-border-2)'}`,
      background: cip ? 'rgba(255,255,255,0.05)' : 'var(--sa-surface)',
      color: cip ? '#EAF1F8' : 'var(--sa-ink-2)', ...extra,
    }),
  }
}

function SectionHeader({ cip, children }) {
  if (cip) {
    return (
      <div style={{
        color: GOLD, fontFamily: 'var(--font-mono, monospace)', fontSize: '10px',
        letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <span style={{ fontSize: '8px', transform: 'translateY(-0.5px)' }}>▲</span>{children}
      </div>
    )
  }
  return (
    <div style={{
      color: SECTION_BLUE, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', fontSize: '12.5px', marginBottom: '14px',
    }}>{children}</div>
  )
}

function SourceChips({ counts, cip, T }) {
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
            border: `1px solid ${piped ? (cip ? 'rgba(248,199,97,0.45)' : 'var(--sa-accent-line)') : T.border}`,
            background: piped ? (cip ? 'rgba(248,199,97,0.10)' : 'var(--sa-accent-soft)') : 'transparent',
            color: piped ? T.ink : T.ink3,
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: piped ? GOLD_DEEP : T.border2,
            }} />
            {label}{piped ? ` · ${v}` : ' · not piped'}
          </span>
        )
      })}
    </div>
  )
}

// THE HAUL — the collection moment. Everything newly banked since the last
// check-in drops in one at a time. Loot only exists for completions.
function HaulOverlay({ haul, onClose }) {
  const drops = [
    ...haul.items.map(t => ({ kind: 'item', text: t })),
    ...haul.badges.map(b => ({ kind: 'badge', id: b })),
  ]
  const empty = drops.length === 0
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, cursor: 'pointer',
      background: 'rgba(8,20,32,0.94)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ maxWidth: '620px', width: '100%', maxHeight: '84vh', overflowY: 'auto' }}>
        <div className="sa-tele" style={{ color: PERIWINKLE, letterSpacing: '2.2px', fontSize: '10px', textAlign: 'center' }}>
          SINCE {String(haul.sinceLabel).toUpperCase()}
        </div>
        <div className="sa-serif" style={{
          fontSize: '34px', fontWeight: 500, letterSpacing: '-0.01em', color: '#FFFFFF',
          textAlign: 'center', margin: '6px 0 26px',
          animation: 'haulDrop 500ms cubic-bezier(0.2,0.9,0.3,1) both',
        }}>
          {empty ? 'Quiet Water' : 'The Haul'}
        </div>

        {empty && (
          <div style={{ textAlign: 'center', color: 'rgba(234,241,248,0.66)', fontSize: '14.5px', lineHeight: 1.6, animation: 'haulDrop 500ms 150ms both' }}>
            Nothing new banked since the last check-in. Steady is a state, not a failure.
          </div>
        )}

        {drops.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 16px',
            marginBottom: '8px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.045)',
            border: d.kind === 'badge' ? '1px solid rgba(248,199,97,0.55)' : '1px solid rgba(255,255,255,0.10)',
            animation: `haulDrop 460ms ${180 + i * 260}ms cubic-bezier(0.2,0.9,0.3,1) both`,
          }}>
            {d.kind === 'badge' ? (() => {
              const B = BADGES[d.id]
              const Icon = B?.Icon || CheckCircle2
              return (
                <>
                  <span style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    border: '1.5px solid #F8C761', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#F8C761', background: 'rgba(248,199,97,0.10)', boxShadow: '0 0 18px rgba(248,199,97,0.25)',
                  }}><Icon size={17} /></span>
                  <span style={{ flex: 1 }}>
                    <span className="sa-tele" style={{ display: 'block', fontSize: '9px', letterSpacing: '1.6px', color: '#F8C761' }}>BADGE EARNED · {B?.track?.toUpperCase()}</span>
                    <span className="sa-serif" style={{ fontSize: '17px', fontWeight: 500, color: '#fff' }}>{B?.label || d.id}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'rgba(234,241,248,0.6)' }}>{B?.desc}</span>
                  </span>
                </>
              )
            })() : (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', flexShrink: 0, background: '#F8C761', boxShadow: '0 0 10px rgba(248,199,97,0.5)' }} />
                <span style={{ fontSize: '14px', lineHeight: 1.5, color: '#EAF1F8' }}>{d.text}</span>
              </>
            )}
          </div>
        ))}

        <div className="sa-tele" style={{
          textAlign: 'center', marginTop: '24px', color: 'rgba(234,241,248,0.55)', fontSize: '10px', letterSpacing: '1.8px',
          animation: `haulDrop 460ms ${240 + drops.length * 260}ms both`,
        }}>
          {empty ? '' : `${drops.length} COLLECTED · `}{haul.miles != null ? `${haul.miles} MILES MADE TODAY` : ''}
          <span style={{ display: 'block', marginTop: '10px', color: 'rgba(234,241,248,0.35)' }}>CLICK ANYWHERE TO BANK IT</span>
        </div>
      </div>
    </div>
  )
}

// Deterministic productivity strip. Numbers come from row.scorecard, computed
// mechanically server-side at compose time — never model-authored.
function Scorecard({ sc, cip, T }) {
  if (!sc) return null
  const sig = sc.signal || {}
  const sigSub = [
    sig.notes ? `notes ${sig.notes}` : null,
    sig.time != null ? `time ${sig.time}%` : null,
    sig.board != null ? `board ${sig.board ? 'live' : 'dark'}` : null,
    sig.inbox != null ? `inbox ${sig.inbox}%` : null,
  ].filter(Boolean).join(' · ')
  const tiles = [
    ...(sc.miles != null ? [{ label: 'MILES', value: sc.miles, sub: `grade ${milesGrade(sc.miles)} so far` }] : []),
    ...(sig.score != null ? [{ label: 'SIGNAL', value: `${sig.score}%`, sub: sigSub || 'day documented' }] : []),
    { label: 'MEETINGS', value: sc.meetings_captured, sub: `${sc.calendar_events ?? 0} on calendar` },
    { label: 'EMAILS IN', value: sc.emails_in, sub: `${sc.emails_read ?? 0} read` },
    { label: 'SENT', value: sc.emails_sent, sub: 'emails out' },
    { label: 'TASKS DONE', value: sc.tasks_done, sub: 'objectives + projects' },
    { label: 'MY HOURS', value: sc.hours_david, sub: `${sc.hours_firm ?? 0}h firm · ${sc.people_logging ?? 0} people` },
    { label: 'OPEN TODOS', value: sc.open_todos, sub: 'on the board' },
  ]
  const earned = sc.badges || []
  return (
    <div className={`col-12 ${T.cardClass}`} style={{ ...T.cardStyle, padding: '18px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ borderLeft: `2px solid ${cip ? 'rgba(248,199,97,0.45)' : 'rgba(31,64,96,0.25)'}`, paddingLeft: '12px' }}>
            <div className="sa-tele" style={{ fontSize: '9.5px', letterSpacing: '1.4px', color: cip ? PERIWINKLE : 'var(--sa-ink-3)' }}>{t.label}</div>
            <div className="sa-serif" style={{ fontSize: '28px', lineHeight: 1.15, marginTop: '2px', fontWeight: 500, letterSpacing: '-0.01em', color: cip ? '#FFFFFF' : SECTION_BLUE }}>
              {t.value ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: T.ink3, marginTop: '1px' }}>{t.sub}</div>
          </div>
        ))}
      </div>
      {earned.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${T.border}` }}>
          {earned.map(id => {
            const B = BADGES[id]
            if (!B) return null
            const Icon = B.Icon
            return (
              <span key={id} title={`${B.label} · ${B.desc}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 6px',
                borderRadius: '999px', border: `1px solid ${cip ? 'rgba(248,199,97,0.5)' : 'rgba(31,64,96,0.3)'}`,
                background: cip ? 'rgba(248,199,97,0.08)' : 'rgba(31,64,96,0.05)',
              }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: cip ? GOLD : SECTION_BLUE, border: `1px solid ${cip ? 'rgba(248,199,97,0.6)' : 'rgba(31,64,96,0.35)'}`,
                }}><Icon size={13} /></span>
                <span className="sa-tele" style={{ fontSize: '9.5px', letterSpacing: '1.2px', color: cip ? '#EAF1F8' : SECTION_BLUE }}>{B.label.toUpperCase()}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DailyPerformancePage() {
  const [rows, setRows] = useState(null)
  const [sel, setSel] = useState(0)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState(null)
  const [haul, setHaul] = useState(null) // {items, badges, miles, sinceLabel} after a run
  const [cip, setCip] = useState(() => {
    try { return localStorage.getItem('dp-theme') === 'cip' } catch { return false }
  })
  const T = themeOf(cip)

  // The full-bleed navy stage lives on .sa-main; App listens for this event.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dp-cip', { detail: cip }))
    try { localStorage.setItem('dp-theme', cip ? 'cip' : 'light') } catch { /* ignore */ }
  }, [cip])

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_performance')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(30)
      if (!error) { setRows(data || []); setSel(0); return data || [] }
      setRows([])
      return []
    } catch {
      setRows((prev) => prev || [])
      return []
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Manual update: the /api/refresh relay gathers the Ledger, composes the
  // summary with Claude, and writes the new row. Takes a minute or two.
  const runUpdate = useCallback(async () => {
    if (running) return
    setRunning(true); setRunError(null)
    const prev = (rows && rows[0]) || null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`)
      const fresh = await load()
      // The Haul: everything newly collected since the prior run. Loot drops
      // only for completions — the diff makes it honest and unrepeatable.
      const now = fresh && fresh[0]
      if (now) {
        const sameDay = prev && prev.day === now.day
        const prevAcc = sameDay ? (prev.accomplishments || []) : []
        const prevBadges = sameDay ? ((prev.scorecard || {}).badges || []) : []
        const items = (now.accomplishments || []).filter(a => !prevAcc.includes(a))
        const badges = ((now.scorecard || {}).badges || []).filter(b => !prevBadges.includes(b))
        setHaul({
          items, badges,
          miles: (now.scorecard || {}).miles ?? null,
          sinceLabel: sameDay && prev.generated_at ? fmtTime(prev.generated_at) : 'this morning',
        })
      }
    } catch (e) {
      setRunError(String(e.message || e))
    } finally {
      setRunning(false)
    }
  }, [running, load, rows])

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

  const themePill = (
    <div style={{ display: 'inline-flex', borderRadius: '999px', overflow: 'hidden', border: `1px solid ${T.border2}` }}>
      {[['light', 'Light'], ['cip', 'CIP']].map(([id, label]) => {
        const on = (id === 'cip') === cip
        return (
          <button key={id} onClick={() => setCip(id === 'cip')} style={{
            fontSize: '11px', letterSpacing: '0.04em', padding: '5px 13px', border: 'none', cursor: 'pointer',
            background: on ? (cip ? GOLD : SECTION_BLUE) : 'transparent',
            color: on ? (cip ? '#16324A' : '#fff') : T.ink3,
            fontWeight: on ? 600 : 400,
          }}>{label}</button>
        )
      })}
    </div>
  )

  if (rows === null) {
    return <div className="sa-tele" style={{ color: T.ink3, padding: '40px' }}>LOADING…</div>
  }

  if (!rows.length) {
    return (
      <div className="sa-grid">
        <div className={`col-12 ${T.cardClass}`} style={{ ...T.cardStyle, padding: '64px', textAlign: 'center' }}>
          <div className="sa-serif" style={{ fontSize: '26px', ...T.serifStyle }}>Daily Performance</div>
          <p style={{ maxWidth: '52ch', margin: '12px auto 0', fontSize: '14px', lineHeight: 1.6, color: T.ink2 }}>
            Hit Run Update and the day&rsquo;s Ledger activity is read and summarized here:
            what got done, what must still happen today, and what needs to be resourced or assigned.
          </p>
          <button onClick={runUpdate} disabled={running} style={{
            marginTop: '22px', display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 600, padding: '9px 18px', borderRadius: '8px', border: 'none',
            cursor: running ? 'default' : 'pointer', fontFamily: 'inherit',
            background: cip ? GOLD : SECTION_BLUE, color: cip ? '#16324A' : '#fff', opacity: running ? 0.6 : 1,
          }}>
            <RefreshCw size={14} /> {running ? 'Running…' : 'Run Update'}
          </button>
          {runError && <div className="sa-tele" style={{ color: '#E06C5F', marginTop: '12px' }}>UPDATE FAILED · {runError.toUpperCase()}</div>}
        </div>
      </div>
    )
  }

  const done = (row.must_do || []).filter((t) => t.done).length
  const total = (row.must_do || []).length

  const listRow = (i, marker, text, mono = false) => (
    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0' }}>
      {marker}
      <span style={{
        fontSize: mono ? '13.5px' : '14px', lineHeight: 1.55, color: T.ink,
        fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
      }}>{text}</span>
    </div>
  )

  return (
    <div className="sa-grid" style={cip ? { maxWidth: 1060, margin: '0 auto', paddingBottom: 60 } : undefined}>
      {haul && <HaulOverlay haul={haul} onClose={() => setHaul(null)} />}
      {/* Header: which run + source coverage + theme pill */}
      <div className={`col-12 ${T.cardClass}`} style={T.cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div className="sa-serif" style={{ fontSize: cip ? '30px' : '26px', ...T.serifStyle }}>{fmtDay(row.day)}</div>
            <div className="sa-tele" style={{ color: cip ? PERIWINKLE : 'var(--sa-ink-3)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} /> AS OF {fmtTime(row.generated_at).toUpperCase()} · {running ? 'COMPOSING THE UPDATE, GIVE IT A MINUTE OR TWO…' : 'MANUAL · HIT RUN UPDATE TO REGENERATE'}
            </div>
            {runError && (
              <div className="sa-tele" style={{ color: '#E06C5F', marginTop: '6px' }}>UPDATE FAILED · {runError.toUpperCase()}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {themePill}
            {rows.length > 1 && (
              <select value={sel} onChange={(e) => setSel(Number(e.target.value))} style={T.controlStyle()}>
                {rows.map((r, i) => (
                  <option key={r.id} value={i} style={cip ? { color: '#1A354A' } : undefined}>
                    {fmtDay(r.day)} · {fmtTime(r.generated_at)}
                  </option>
                ))}
              </select>
            )}
            <button onClick={load} title="Reload the latest saved run" style={T.controlStyle({ display: 'inline-flex', alignItems: 'center', gap: '6px' })}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={runUpdate} disabled={running} title="Regenerate the summary from the Ledger now" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', border: 'none',
              cursor: running ? 'default' : 'pointer', fontFamily: 'inherit',
              background: running ? (cip ? 'rgba(230,181,79,0.35)' : 'rgba(31,64,96,0.4)') : (cip ? GOLD : SECTION_BLUE),
              color: running ? (cip ? 'rgba(22,50,74,0.7)' : 'rgba(255,255,255,0.7)') : (cip ? '#16324A' : '#fff'),
            }}>
              <RefreshCw size={13} style={running ? { animation: 'spin 1.2s linear infinite' } : undefined} />
              {running ? 'Running…' : 'Run Update'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <SourceChips counts={row.source_counts} cip={cip} T={T} />
        </div>
      </div>

      {/* Scorecard — deterministic counts, the day at a glance */}
      <Scorecard sc={row.scorecard} cip={cip} T={T} />

      {/* The day so far — CIP body copy is the sans (Lora is headings-only in
          the deck grammar; serif body at 400/loose is the known dissonance) */}
      <div className={`col-12 ${T.cardClass}`} style={T.cardStyle}>
        <SectionHeader cip={cip}>The Day So Far</SectionHeader>
        {cip ? (
          <p style={{
            fontSize: '15.5px', lineHeight: 1.75, margin: 0,
            color: 'rgba(234,241,248,0.88)',
            paddingLeft: '18px', borderLeft: `2px solid rgba(248,199,97,0.55)`,
          }}>
            {row.summary}
          </p>
        ) : (
          <p className="sa-serif" style={{ fontSize: '18px', lineHeight: 1.65, margin: 0, color: 'var(--sa-ink)' }}>
            {row.summary}
          </p>
        )}
      </div>

      {/* Noteworthy & connective — the day's threads across areas */}
      {(row.noteworthy || []).length > 0 && (
        <div className={`col-12 ${T.cardClass}`} style={T.cardStyle}>
          <SectionHeader cip={cip}>Noteworthy · Connective</SectionHeader>
          {(row.noteworthy || []).map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '7px 0', alignItems: 'flex-start' }}>
              <span style={{
                width: '16px', height: '2px', flexShrink: 0, marginTop: '10px',
                background: cip ? GOLD : SECTION_BLUE, opacity: 0.8,
              }} />
              <span style={{ fontSize: '14.5px', lineHeight: 1.6, color: T.ink, maxWidth: '92ch' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Must be done today */}
      <div className={`col-6 ${T.cardClass}`} style={T.cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <SectionHeader cip={cip}>Must Be Done Today</SectionHeader>
          {total > 0 && (
            <span className="sa-tele" style={{ color: done === total ? GOLD_DEEP : T.ink3 }}>{done}/{total}</span>
          )}
        </div>
        {(row.must_do || []).length === 0 && (
          <div style={{ fontSize: '13.5px', color: T.ink3 }}>Nothing flagged for today.</div>
        )}
        {(row.must_do || []).map((t, i) => (
          <button key={i} onClick={() => toggleMustDo(i)} style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
            textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
            padding: '7px 0', color: t.done ? T.ink3 : T.ink,
          }}>
            {t.done
              ? <CheckCircle2 size={17} style={{ color: GOLD_DEEP, flexShrink: 0, marginTop: '1px' }} />
              : <Circle size={17} style={{ color: T.border2, flexShrink: 0, marginTop: '1px' }} />}
            <span style={{ fontSize: '14px', lineHeight: 1.5, textDecoration: t.done ? 'line-through' : 'none', textDecorationColor: cip ? 'rgba(255,255,255,0.3)' : undefined }}>{t.text}</span>
          </button>
        ))}
      </div>

      {/* Primary accomplishments */}
      <div className={`col-6 ${T.cardClass}`} style={T.cardStyle}>
        <SectionHeader cip={cip}>What Got Done</SectionHeader>
        {(row.accomplishments || []).length === 0 && (
          <div style={{ fontSize: '13.5px', color: T.ink3 }}>Nothing banked yet.</div>
        )}
        {(row.accomplishments || []).map((a, i) => listRow(i,
          <span style={{ width: '7px', height: '7px', borderRadius: '2px', flexShrink: 0, background: GOLD, marginTop: '7px' }} />, a))}
      </div>

      {/* Interactions */}
      <div className={`col-6 ${T.cardClass}`} style={T.cardStyle}>
        <SectionHeader cip={cip}>Interactions</SectionHeader>
        {!(row.interactions || []).length && (
          <div style={{ fontSize: '13.5px', color: T.ink3 }}>No interactions surfaced yet.</div>
        )}
        {(row.interactions || []).map((s, i) => listRow(i,
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: cip ? PERIWINKLE : SECTION_BLUE, opacity: cip ? 0.9 : 0.55, marginTop: '7px' }} />, s))}
      </div>

      {/* Learned */}
      <div className={`col-6 ${T.cardClass}`} style={T.cardStyle}>
        <SectionHeader cip={cip}>What You Learned</SectionHeader>
        {!(row.learned || []).length && (
          <div style={{ fontSize: '13.5px', color: T.ink3 }}>Nothing banked yet.</div>
        )}
        {(row.learned || []).map((s, i) => listRow(i,
          <span style={{ width: '7px', height: '7px', borderRadius: '2px', flexShrink: 0, background: GOLD, marginTop: '7px' }} />, s))}
      </div>

      {/* Team allocation */}
      <div className={`col-6 ${T.cardClass}`} style={T.cardStyle}>
        <SectionHeader cip={cip}>Team Allocation</SectionHeader>
        {!(row.team_allocation || []).length && (
          <div style={{ fontSize: '13.5px', color: T.ink3 }}>No time logged yet today.</div>
        )}
        {(row.team_allocation || []).map((s, i) => (
          <div key={i} style={{
            fontSize: '13.5px', lineHeight: 1.6, padding: '4px 0', color: T.ink,
            fontFamily: 'var(--font-mono, monospace)',
            borderTop: i ? `1px solid ${T.border}` : 'none',
          }}>{s}</div>
        ))}
      </div>

      {/* New items to resource / task / assign */}
      <div className={`col-6 ${T.cardClass}`} style={T.cardStyle}>
        <SectionHeader cip={cip}>What Needs Doing From Here</SectionHeader>
        {(row.new_items || []).length === 0 && (
          <div style={{ fontSize: '13.5px', color: T.ink3 }}>Nothing new surfaced.</div>
        )}
        {(row.new_items || []).map((n, i) => listRow(i,
          <Flag size={15} style={{ color: cip ? GOLD : SECTION_BLUE, flexShrink: 0, marginTop: '3px', opacity: 0.75 }} />, n))}
      </div>

      {/* Composer's read on the day */}
      <div className={`col-12 ${T.cardClass}`} style={T.cardStyle}>
        <SectionHeader cip={cip}>The Read</SectionHeader>
        {row.notes
          ? <p style={{ fontSize: '14px', lineHeight: 1.7, color: T.ink2, margin: 0, maxWidth: '90ch' }}>{row.notes}</p>
          : <div style={{ fontSize: '13.5px', color: T.ink3 }}>No additional read this run.</div>}
        <div className="sa-tele" style={{ color: T.ink3, marginTop: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Inbox size={12} /> COMPOSED BY {(row.model || 'HEARTBEAT').toUpperCase()}{cip ? ' · PREPARED FOR THE OPERATOR · CONFIDENTIAL' : ''}
        </div>
      </div>
    </div>
  )
}
