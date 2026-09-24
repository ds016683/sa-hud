// MONITOR · NARRATIVE. The day's narrative as the composer last wrote it:
// the latest daily_performance row for a selected day (default today,
// Chicago). Replaces the old Daily Monitor summary view. Prints cleanly for a
// three-hole binder (see the @media print block at the bottom).
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Printer, CheckCircle2, Circle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INK, INK2, GRAY, NAVY_DEEP, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, RED, MONO, SERIF,
  S, Eyebrow, chiToday, fmtTime, fmtDay, weekday,
} from './river/canon'

// A composer slip can land a list field as a bare string; rows are canon, so
// tolerate any shape on read.
const asList = (v) => {
  if (Array.isArray(v)) return v
  if (v == null || v === '') return []
  if (typeof v === 'string') {
    if (/^\s*\[/.test(v)) { try { const p = JSON.parse(v); if (Array.isArray(p)) return p } catch { /* fall through */ } }
    return [v]
  }
  return [v]
}
// Items may be strings or JSON-ish objects; surface the human field.
const itemText = (v) => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const t = v.text ?? v.title ?? v.name ?? v.summary ?? v.label
    if (t != null) return String(t)
    try { return JSON.stringify(v) } catch { return String(v) }
  }
  return String(v)
}
const fmtShortDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const fmtFullDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''
const isClosed = (row) => !!row && row.model === 'Daily Report' && !!((row.scorecard || {}).closed_at)

const control = (extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 10.5, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase',
  padding: '7px 14px', borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.16)', background: 'transparent',
  color: 'rgba(234,241,248,0.7)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2,
  ...extra,
})

function Section({ title, children }) {
  return (
    <div className="np-section" style={{ marginTop: 30 }}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </div>
  )
}

function Bullet({ children }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', alignItems: 'flex-start' }}>
      <span className="np-dash" style={{ width: 14, height: 2, flexShrink: 0, marginTop: 10, background: GOLD, opacity: 0.85 }} />
      <span style={{ fontSize: 14, lineHeight: 1.6, color: INK, maxWidth: '76ch' }}>{children}</span>
    </div>
  )
}

export default function NarrativePage() {
  const [days, setDays] = useState(null)          // distinct days, newest first
  const [day, setDay] = useState(chiToday)
  const [row, setRow] = useState(null)            // latest row for the day
  const [count, setCount] = useState(0)           // updates written that day
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDays = useCallback(async () => {
    const { data } = await supabase
      .from('daily_performance')
      .select('day')
      .order('day', { ascending: false })
      .limit(600)
    const seen = new Set()
    const list = []
    for (const r of data || []) { if (r.day && !seen.has(r.day)) { seen.add(r.day); list.push(r.day) } }
    setDays(list)
    return list
  }, [])

  const loadDay = useCallback(async (d) => {
    setLoading(true)
    try {
      const [{ data, error: e1 }, { count: n }] = await Promise.all([
        supabase.from('daily_performance').select('*').eq('day', d).order('generated_at', { ascending: false }).limit(1),
        supabase.from('daily_performance').select('id', { count: 'exact', head: true }).eq('day', d),
      ])
      if (e1) throw e1
      setRow((data && data[0]) || null)
      setCount(n || 0)
    } catch (e) {
      setRow(null); setCount(0)
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDays() }, [loadDays])
  useEffect(() => { loadDay(day) }, [day, loadDay])

  const today = chiToday()
  const closed = isClosed(row)
  const noteworthy = asList(row?.noteworthy)
  const mustDo = asList(row?.must_do)
  const learned = asList(row?.learned)
  const interactions = asList(row?.interactions)
  const composerNotes = row?.composer_notes
  const dayOptions = days && days.length
    ? (days.includes(day) ? days : [day, ...days])
    : [day]
  const recent = (days || []).slice(0, 14)

  const subLine = row
    ? (closed
        ? `${fmtFullDay(day)} · CLOSED · minted at ${fmtTime((row.scorecard || {}).closed_at)}`
        : `${fmtFullDay(day)} · as of ${fmtTime(row.generated_at)} · ${count} update${count === 1 ? '' : 's'} ${day === today ? 'today' : 'that day'}`)
    : `${fmtFullDay(day)} · no narrative written${day === today ? ' yet' : ''}`

  return (
    <div className="narrative-print" style={S.page}>
      <style>{PRINT_CSS}</style>

      {/* Print-only running head; hidden on screen by the style block */}
      <div className="np-print-head">Third Horizon · Narrative · {fmtFullDay(day)}</div>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <Eyebrow>Narrative</Eyebrow>
        <h1 style={S.h1}>{weekday(day)}&rsquo;s Narrative</h1>
        <div style={S.sub}>{subLine}</div>
        {error && <div className="no-print" style={{ ...S.sub, color: RED, marginTop: 6 }}>UPDATE FAILED · {error}</div>}
      </div>

      {/* Controls */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <select value={day} onChange={(e) => setDay(e.target.value)} style={control({ paddingRight: 10, appearance: 'auto' })}>
          {dayOptions.map((d) => (
            <option key={d} value={d} style={{ color: '#1A354A' }}>{fmtDay(d)}{d === today ? ' · today' : ''}</option>
          ))}
        </select>
        <button onClick={() => window.print()} title="Print this narrative for the binder" style={control()}>
          <Printer size={12} /> Print
        </button>
      </div>

      {/* Past narratives strip */}
      {recent.length > 0 && (
        <div className="no-print" style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 9.5, color: GRAY, fontFamily: MONO, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: 8 }}>Past narratives</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recent.map((d) => {
              const on = d === day
              return (
                <button key={d} onClick={() => setDay(d)} style={{
                  ...S.chip(on ? BLUE : 'rgba(255,255,255,0.06)', on ? NAVY_DEEP : 'rgba(234,241,248,0.6)'),
                  border: `1px solid ${on ? BLUE : 'rgba(255,255,255,0.12)'}`, cursor: 'pointer', fontFamily: MONO, fontWeight: 600, padding: '4px 10px',
                }}>
                  {d === today ? 'Today' : `${weekday(d).slice(0, 3)} ${fmtShortDay(d)}`}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Body */}
      {loading && !row && (
        <div style={{ ...S.sub, marginTop: 20 }}>Loading…</div>
      )}
      {!loading && !row && (
        <div style={{ ...S.panel, padding: '40px 24px', textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>Nothing written for {fmtDay(day)}.</div>
          <div style={{ fontSize: 13.5, color: INK2, marginTop: 8, lineHeight: 1.6 }}>
            {day === today ? 'Hit Run Update and the Ledger is read and the narrative composed here.' : 'No update ran that day.'}
          </div>
        </div>
      )}
      {row && (
        <div>
          <div className="np-section np-prose" style={{
            fontFamily: SERIF, fontSize: 15, lineHeight: 1.75, color: INK2, maxWidth: '76ch',
            paddingLeft: 18, borderLeft: `2px solid ${GOLD}`, whiteSpace: 'pre-line',
          }}>
            {row.summary || 'The composer left the narrative blank on this run.'}
          </div>

          {noteworthy.length > 0 && (
            <Section title="Noteworthy">
              {noteworthy.map((n, i) => <Bullet key={i}>{itemText(n)}</Bullet>)}
            </Section>
          )}

          {mustDo.length > 0 && (
            <Section title="Must Do">
              {mustDo.map((t, i) => {
                const item = typeof t === 'object' && t !== null ? t : { text: itemText(t) }
                const late = !item.done && !!item.overdue
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                    {item.done
                      ? <CheckCircle2 size={16} style={{ color: GOLD_BRIGHT, flexShrink: 0, marginTop: 2 }} />
                      : <Circle size={16} style={{ color: late ? RED : 'rgba(255,255,255,0.28)', flexShrink: 0, marginTop: 2 }} />}
                    <span style={{
                      fontSize: 14, lineHeight: 1.55, maxWidth: '76ch',
                      color: item.done ? GRAY : late ? RED : INK,
                      textDecoration: item.done ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.3)',
                    }}>
                      {itemText(item)}
                      {late && item.due_date && (
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: RED, marginLeft: 8, textTransform: 'uppercase' }}>
                          Due {fmtShortDay(item.due_date)}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </Section>
          )}

          {learned.length > 0 && (
            <Section title="Learned">
              {learned.map((n, i) => <Bullet key={i}>{itemText(n)}</Bullet>)}
            </Section>
          )}

          {interactions.length > 0 && (
            <Section title="Interactions">
              {interactions.map((n, i) => <Bullet key={i}>{itemText(n)}</Bullet>)}
            </Section>
          )}

          {composerNotes && (
            <div className="np-section" style={{ marginTop: 34, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}` }}>
              <Eyebrow style={{ color: GRAY }}>Composer notes</Eyebrow>
              <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.65, color: GRAY, maxWidth: '90ch', whiteSpace: 'pre-line' }}>
                {typeof composerNotes === 'string' ? composerNotes : itemText(composerNotes)}
              </div>
            </div>
          )}

          <div className="no-print" style={{ ...S.source, marginTop: 28 }}>
            COMPOSED BY {(row.model || 'HEARTBEAT').toUpperCase()} · {fmtTime(row.generated_at).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  )
}

// Print: white page, black Georgia body at 11.5pt, binder margins (extra left
// for the hole punch), shell chrome hidden, dark surfaces made white.
const PRINT_CSS = `
.narrative-print .np-print-head { display: none; }
@media print {
  @page { margin: 1in 1in 1in 1.25in; }
  html, body { background: #fff !important; color: #000 !important; }
  .sa-sidebar, .sa-topbar, .sa-burger, .sa-scrim { display: none !important; }
  .sa-app, .sa-main, .sa-surface-dark, .sa-dark-scroll, .sa-content {
    display: block !important; position: static !important;
    height: auto !important; min-height: 0 !important; max-width: none !important;
    overflow: visible !important; background: #fff !important; background-image: none !important;
    padding: 0 !important; margin: 0 !important;
  }
  .narrative-print {
    max-width: none !important; padding: 0 !important; margin: 0 !important;
    color: #000 !important; font-family: Georgia, 'Times New Roman', serif !important; font-size: 11.5pt !important;
  }
  .narrative-print * { color: #000 !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
  .narrative-print .no-print { display: none !important; }
  .narrative-print .np-print-head {
    display: block; font-family: Georgia, serif; font-size: 9pt; letter-spacing: 0.06em; text-transform: uppercase;
    color: #333 !important; border-bottom: 1px solid #000; padding-bottom: 4pt; margin-bottom: 14pt;
  }
  .narrative-print h1 { font-family: Georgia, serif !important; font-size: 20pt !important; font-weight: 500 !important; }
  .narrative-print .np-prose { font-family: Georgia, serif !important; font-size: 11.5pt !important; line-height: 1.6 !important; border-left-color: #000 !important; max-width: none !important; }
  .narrative-print .np-section { page-break-inside: avoid; break-inside: avoid; }
  .narrative-print .np-dash { background: #000 !important; }
  .narrative-print svg { color: #000 !important; stroke: #000 !important; }
}
`
