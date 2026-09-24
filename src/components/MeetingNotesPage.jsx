// MONITOR · NOTES. The record of meetings as David ran them, structured like
// the Agenda's calendar: for each day, the calendar events, each carrying its
// timer session (meeting_sessions) and its Granola note (granola_meetings).
// Granola recordings that matched no event stay visible under the day as
// "Unscheduled recordings". Rows expand in place to show the Granola summary
// rendered from markdown and the close-out. Styled to the River canon.
import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronRight, ExternalLink, HelpCircle, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { matchNotes } from '../lib/meetings'
import {
  INK, INK2, GRAY, PANEL_BG, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, GREEN, MONO, SERIF,
  S, Eyebrow, Stat, fmtDay, fmtTime, chiToday, chiDayOf,
} from './river/canon'

const DAYS_STEP = 30
const MAX_ATTENDEES = 4
const SNIPPET_RADIUS = 110

/* -------------------- helpers -------------------- */
function hasRecording(m) {
  return !!m && typeof m.summary === 'string' && m.summary.trim().length > 30
}

const ACRONYMS = new Set(['mma', 'snmi', 'achp', 'cdc', 'hp', 'ipi', 'bh', 'ri', 'pshp', 'va', 'la'])
function humanizeTag(raw) {
  return raw.split(/[-_\s]+/).map(w => ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
}

// Tags = client/engagement accounts + meeting type on the Granola note.
function tagsFor(m) {
  const tags = []
  if (!m) return tags
  const accounts = Array.isArray(m.accounts) ? m.accounts.filter(Boolean) : []
  for (const a of accounts) tags.push(humanizeTag(a))
  if (m.meeting_type && m.meeting_type !== 'unknown') tags.push(humanizeTag(m.meeting_type))
  return tags
}

// Attendees arrive as arrays of strings, arrays of {name,email}, JSON strings,
// or delimited strings depending on the table. Normalize to names.
function attendeeList(a) {
  if (a == null) return []
  if (Array.isArray(a)) {
    return a.map(x => {
      if (!x) return null
      if (typeof x === 'string') return x.trim()
      if (typeof x === 'object') return x.name || x.displayName || x.email || x.address || null
      return String(x)
    }).filter(Boolean)
  }
  if (typeof a === 'string') {
    if (/^\s*\[/.test(a)) { try { return attendeeList(JSON.parse(a)) } catch { /* fall through */ } }
    return a.split(/[;,]/).map(s => s.trim()).filter(Boolean)
  }
  if (typeof a === 'object') return Object.values(a).map(v => (typeof v === 'string' ? v : v?.name || v?.email)).filter(Boolean)
  return []
}

function followUpsOf(session) {
  const raw = session?.follow_ups
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map(x => (typeof x === 'string' ? x : x?.text || x?.title || '')).map(s => s.trim()).filter(Boolean)
  if (typeof raw === 'string') {
    if (/^\s*\[/.test(raw)) { try { return followUpsOf({ follow_ups: JSON.parse(raw) }) } catch { /* fall through */ } }
    return raw.split('\n').map(s => s.trim()).filter(Boolean)
  }
  return []
}

function timeOf(ts) {
  if (!ts || typeof ts !== 'string' || !ts.includes('T')) return ''
  const d = new Date(ts)
  return isNaN(d) ? '' : fmtTime(ts)
}

function transcriptUrlFor(meeting) {
  if (!meeting) return null
  if (meeting.transcript_url) return meeting.transcript_url
  if (meeting.summary) {
    const match = meeting.summary.match(/https:\/\/notes\.granola\.ai\/t\/[a-z0-9-]+/)
    if (match) return match[0]
  }
  return `https://notes.granola.ai/t/${meeting.id}`
}

function dayLabel(day) {
  if (!day || day === 'unknown') return 'Undated'
  const d = new Date(day + 'T12:00:00')
  return isNaN(d) ? day : fmtDay(day)
}

function addDays(day, n) {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

const fmtHours = (h) => {
  const n = Number(h)
  if (!isFinite(n) || n <= 0) return null
  return `${Math.round(n * 100) / 100}h`
}

// Attendance for a timed event: closed out, attended (attended_at from the
// timer or Lumen, or a started timer), needs confirmation (ended with no
// trace), or nothing yet (upcoming or live).
function attendanceState(event, session, nowMs) {
  if (!event || event.is_all_day) return null
  if (session?.closed_at) return 'closed'
  if (session?.attended_at || session?.started_at) return 'attended'
  const en = event.end_at ? new Date(event.end_at).getTime() : null
  return en != null && en <= nowMs ? 'confirm' : null
}
const CONFIRM_TITLE = 'Not confirmed attended. Start the timer, close it out, or tell Lumen.'
const attendedChip = S.chip('rgba(67,211,146,0.16)', GREEN)
const confirmChip = S.chip('rgba(230,181,79,0.16)', GOLD_BRIGHT)

/* -------------------- search highlight + snippet -------------------- */
// Splits `text` on case-insensitive occurrences of `q`, wrapping matches in gold.
function highlight(text, q) {
  if (!q || !text) return text
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts = []
  let last = 0
  let idx = lower.indexOf(needle, last)
  let key = 0
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx))
    parts.push(<mark key={key++} style={{ background: 'transparent', color: GOLD_BRIGHT, fontWeight: 600 }}>{text.slice(idx, idx + q.length)}</mark>)
    last = idx + q.length
    idx = lower.indexOf(needle, last)
  }
  if (!parts.length) return text
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// The sentence around the first match across the unit's searchable text.
function snippetFor(sources, q) {
  if (!q) return null
  const needle = q.toLowerCase()
  for (const raw of sources) {
    if (!raw) continue
    const text = raw.replace(/[#*_>`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ')
    const idx = text.toLowerCase().indexOf(needle)
    if (idx === -1) continue
    const before = text.slice(0, idx)
    const after = text.slice(idx)
    const startMatch = before.match(/[.!?]\s[^.!?]*$/)
    let start = startMatch ? before.length - startMatch[0].length + 2 : 0
    if (idx - start > SNIPPET_RADIUS) start = idx - SNIPPET_RADIUS
    const endMatch = after.match(/[.!?](\s|$)/)
    let end = endMatch ? idx + endMatch.index + 1 : text.length
    if (end - idx > SNIPPET_RADIUS + q.length) end = idx + SNIPPET_RADIUS + q.length
    return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '')
  }
  return null
}

/* -------------------- tiny markdown renderer -------------------- */
const INLINE_RE = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s)]+)/g
const linkStyle = { color: PERIWINKLE, textDecoration: 'underline', textDecorationColor: `${PERIWINKLE}66`, textUnderlineOffset: 2 }

function inline(text) {
  const parts = []
  let last = 0
  let key = 0
  let m
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) {
      parts.push(<strong key={key++} style={{ color: INK, fontWeight: 600 }}>{m[1].slice(2, -2)}</strong>)
    } else if (m[2]) {
      const md = m[2].match(/\[([^\]]+)\]\(([^)]+)\)/)
      parts.push(<a key={key++} href={md[2]} target="_blank" rel="noopener noreferrer" style={linkStyle}>{md[1]}</a>)
    } else if (m[3]) {
      parts.push(<a key={key++} href={m[3]} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, wordBreak: 'break-all' }}>{m[3]}</a>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

const mdHeading = { fontFamily: MONO, fontSize: 10, fontWeight: 600, color: BLUE, textTransform: 'uppercase', letterSpacing: '1.6px', margin: '16px 0 6px' }
const mdPara = { fontSize: 13, lineHeight: 1.65, color: INK2, margin: '6px 0' }
const mdBullet = { display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.55, color: INK2, padding: '3px 0' }
const mdDash = { width: 12, height: 2, background: GOLD, opacity: 0.85, flexShrink: 0, marginTop: 9 }
const mdSubDash = { ...mdDash, width: 8, background: BLUE, marginLeft: 22 }

function Markdown({ text }) {
  const lines = text.split('\n')
  const out = []
  let para = []
  const flush = () => {
    if (para.length) {
      out.push(<p key={`p${out.length}`} style={mdPara}>{inline(para.join(' '))}</p>)
      para = []
    }
  }
  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, '')
    if (/^#{1,3}\s/.test(line)) {
      flush()
      out.push(<div key={i} style={mdHeading}>{inline(line.replace(/^#{1,3}\s+/, ''))}</div>)
    } else if (/^\s{2,}[-*•]\s/.test(line)) {
      flush()
      out.push(<div key={i} style={mdBullet}><span style={mdSubDash} /><span>{inline(line.replace(/^\s+[-*•]\s/, ''))}</span></div>)
    } else if (/^[-*•]\s/.test(line)) {
      flush()
      out.push(<div key={i} style={mdBullet}><span style={mdDash} /><span>{inline(line.replace(/^[-*•]\s/, ''))}</span></div>)
    } else if (/^---+\s*$/.test(line)) {
      flush()
      out.push(<div key={i} style={{ height: 1, background: PANEL_BORDER, margin: '12px 0' }} />)
    } else if (line.trim() === '') {
      flush()
    } else {
      para.push(line.trim())
    }
  })
  flush()
  return <div>{out}</div>
}

/* -------------------- units -------------------- */
// A unit is one row: a calendar event (with optional session + notes), or an
// unscheduled Granola recording. Both share the same row grammar.
function eventUnit(event, session, notes, nowMs) {
  const attendees = attendeeList(event.attendees)
  const followUps = followUpsOf(session)
  return {
    key: `ev:${event.id}`,
    kind: 'event',
    day: event.day || chiDayOf(event.start_at) || 'unknown',
    sortAt: event.start_at || '',
    time: timeOf(event.start_at),
    endTime: timeOf(event.end_at),
    subject: event.subject || '(no subject)',
    organizer: event.organizer || '',
    attendees,
    attendance: attendanceState(event, session, nowMs),
    session: session || null,
    notes: notes || null,
    followUps,
    specialNotes: session?.special_notes || '',
    searchText: [
      event.subject, event.organizer, attendees.join(' '), attendeeList(notes?.attendees).join(' '),
      notes?.summary, session?.special_notes, followUps.join(' '),
    ].filter(Boolean).join('\n').toLowerCase(),
  }
}

function notesUnit(m) {
  const attendees = attendeeList(m.attendees)
  return {
    key: `gm:${m.id}`,
    kind: 'recording',
    day: m.meeting_date || chiDayOf(m.granola_created_at) || 'unknown',
    sortAt: m.granola_created_at || '',
    time: timeOf(m.granola_created_at),
    endTime: '',
    subject: m.title || '(untitled)',
    organizer: '',
    attendees,
    attendance: null,
    session: null,
    notes: m,
    followUps: [],
    specialNotes: '',
    searchText: [m.title, attendees.join(' '), m.summary].filter(Boolean).join('\n').toLowerCase(),
  }
}

/* -------------------- row -------------------- */
const chipMono = (bg, fg) => ({ ...S.chip(bg, fg), fontFamily: MONO, fontWeight: 600, letterSpacing: '0.6px' })

function MeetingRow({ unit, query, open, onToggle, first }) {
  const { session, notes, attendees, followUps, specialNotes } = unit
  const hasNotes = hasRecording(notes)
  const closed = !!session?.closed_at
  const hours = fmtHours(session?.hours)
  const expandable = hasNotes || !!session
  const shown = attendees.slice(0, MAX_ATTENDEES)
  const more = attendees.length - shown.length
  const snippet = query ? snippetFor([notes?.summary, attendees.join(', '), specialNotes, followUps.join('. ')], query) : null
  const tags = tagsFor(notes)
  const transcriptUrl = hasNotes ? transcriptUrlFor(notes) : null
  const n = attendees.length
  const metaLeft = unit.kind === 'event' ? (unit.organizer || 'No organizer') : 'Granola recording'

  return (
    <div style={{
      borderTop: first ? 'none' : `1px solid ${PANEL_BORDER}`,
      borderLeft: `2px solid ${open ? GOLD : 'transparent'}`,
      marginLeft: -16, paddingLeft: 14,
      background: open ? 'rgba(255,255,255,0.02)' : 'transparent',
      transition: 'background .15s',
    }}>
      <button
        onClick={expandable ? onToggle : undefined}
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
        style={{
          width: '100%', display: 'grid', gridTemplateColumns: '84px minmax(0,1fr) 18px', gap: 14, alignItems: 'flex-start',
          padding: '12px 0 12px 0', background: 'transparent', border: 0, cursor: expandable ? 'pointer' : 'default', textAlign: 'left', color: INK,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 11, color: INK2, letterSpacing: '0.4px', paddingTop: 3, lineHeight: 1.5 }}>
          {unit.time}
          {unit.endTime && <div style={{ color: GRAY, fontSize: 10 }}>to {unit.endTime}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{highlight(unit.subject, query)}</span>
            {/* Attendance leads the chips: closed out or attended (green), or a Confirm prompt once the meeting has ended with no trace. */}
            {(unit.attendance === 'closed' || unit.attendance === 'attended') && (
              <span style={attendedChip}><Check size={11} />{unit.attendance === 'closed' ? 'Closed out' : 'Attended'}</span>
            )}
            {unit.attendance === 'confirm' && (
              <span title={CONFIRM_TITLE} style={confirmChip}><HelpCircle size={11} />Confirm</span>
            )}
            {hasNotes && <span style={S.chip('rgba(169,201,232,0.14)', BLUE)}>Notes</span>}
            {hours && <span style={chipMono('rgba(255,255,255,0.08)', GRAY)}>{hours}</span>}
            {!hasNotes && !session && <span style={S.chip('rgba(255,255,255,0.05)', GRAY)}>No notes</span>}
          </div>
          <div style={{ fontSize: 11.5, color: GRAY, marginTop: 3, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {highlight(metaLeft, query)}{n > 0 ? ` · ${n} attendee${n === 1 ? '' : 's'}` : ''}
            {unit.kind === 'recording' && shown.length > 0 ? <> · {highlight(shown.join(', '), query)}{more > 0 ? ` +${more}` : ''}</> : null}
          </div>
          {snippet && (
            <div style={{ fontSize: 12, color: INK2, marginTop: 6, lineHeight: 1.5, fontStyle: 'italic' }}>{highlight(snippet, query)}</div>
          )}
        </div>
        {expandable ? (
          <ChevronRight size={15} style={{ color: open ? GOLD : GRAY, marginTop: 4, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s, color .18s' }} />
        ) : <span />}
      </button>

      {open && expandable && (
        <div style={{ padding: '2px 18px 18px 98px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 10, borderBottom: `1px solid ${PANEL_BORDER}`, marginBottom: 4 }}>
            {attendees.length > 0 && (
              <div style={{ fontSize: 11.5, color: GRAY, lineHeight: 1.5, minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', marginRight: 8 }}>Attendees</span>
                {highlight(attendees.join(', '), query)}
              </div>
            )}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                {tags.map(t => <span key={t} style={S.chip('rgba(150,168,240,0.14)', PERIWINKLE)}>{t}</span>)}
              </div>
            )}
          </div>

          {hasNotes ? (
            <Markdown text={notes.summary} />
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>No Granola notes for this meeting</div>
          )}

          {session && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
              <Eyebrow style={{ marginBottom: 8, color: GOLD_BRIGHT }}>Close-out</Eyebrow>
              {followUps.length > 0 ? (
                <div>
                  {followUps.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '3px 0', fontSize: 12.5, lineHeight: 1.55, color: INK2 }}>
                      <Check size={13} style={{ color: GOLD, flexShrink: 0, marginTop: 3 }} />
                      <span>{highlight(f, query)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>No follow-ups</div>
              )}
              {specialNotes && (
                <p style={{ ...mdPara, marginTop: 10 }}>{highlight(specialNotes, query)}</p>
              )}
              {!closed && (
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, marginTop: 8 }}>Not closed out</div>
              )}
            </div>
          )}

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.4px' }}>
              SOURCE · {unit.kind === 'event' ? 'calendar_events' : 'granola_meetings'}
              {session ? ' · meeting_sessions' : ''}
              {unit.kind === 'event' && hasNotes ? ' · granola_meetings' : ''}
            </div>
            {transcriptUrl && (
              <a href={transcriptUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase',
                color: BLUE, textDecoration: 'none', border: `1px solid ${PANEL_BORDER}`, borderRadius: 999, padding: '5px 11px', marginLeft: 'auto',
              }}>
                <ExternalLink size={12} /> Open in Granola
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------- day section -------------------- */
function DaySection({ day, events, recordings, query, openIds, onToggle }) {
  const n = events.length
  const isToday = day === chiToday()
  const documented = events.filter(u => hasRecording(u.notes)).length
  const unconfirmed = events.filter(u => u.attendance === 'confirm').length
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Eyebrow style={{ marginBottom: 0, color: isToday ? GOLD_BRIGHT : INK2 }}>{dayLabel(day)}{isToday ? ' · today' : ''}</Eyebrow>
        <span style={S.chip('rgba(255,255,255,0.08)', GRAY)}>{n} {n === 1 ? 'meeting' : 'meetings'}</span>
        {documented > 0 && <span style={S.chip('rgba(169,201,232,0.14)', BLUE)}>{documented} with notes</span>}
        {unconfirmed > 0 && <span style={confirmChip}><HelpCircle size={11} />{unconfirmed} to confirm</span>}
        <div style={{ flex: 1, height: 1, background: PANEL_BORDER }} />
      </div>
      <div style={{ ...S.panel, padding: '0 16px', marginBottom: 0 }}>
        {events.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, padding: '12px 0' }}>Nothing on the calendar</div>
        )}
        {events.map((u, i) => (
          <MeetingRow key={u.key} unit={u} query={query} open={openIds.has(u.key)} onToggle={() => onToggle(u.key)} first={i === 0} />
        ))}
        {recordings.length > 0 && (
          <>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY,
              padding: '10px 0 2px', borderTop: `1px solid ${PANEL_BORDER}`, marginLeft: -16, paddingLeft: 16,
            }}>Unscheduled recordings</div>
            {recordings.map((u) => (
              <MeetingRow key={u.key} unit={u} query={query} open={openIds.has(u.key)} onToggle={() => onToggle(u.key)} first />
            ))}
          </>
        )}
      </div>
    </section>
  )
}

const Empty = ({ children }) => (
  <div style={{ ...S.panel, fontFamily: MONO, fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, textAlign: 'center', padding: '40px 16px' }}>{children}</div>
)

/* -------------------- data -------------------- */
async function fetchRange(start, end) {
  const [ev, gm, ms] = await Promise.all([
    supabase.from('calendar_events').select('*').gte('day', start).lte('day', end).order('start_at', { ascending: true }),
    supabase.from('granola_meetings').select('*').gte('meeting_date', start).lte('meeting_date', end).order('granola_created_at', { ascending: true }).limit(2000),
    supabase.from('meeting_sessions').select('*').gte('day', start).lte('day', end).then(r => r, () => ({ data: null, error: { message: 'unavailable' } })),
  ])
  if (ev.error) console.error('calendar_events fetch failed', ev.error)
  if (gm.error) console.error('granola_meetings fetch failed', gm.error)
  // meeting_sessions may not exist yet; treat any error as "no sessions".
  return {
    events: Array.isArray(ev.data) ? ev.data : [],
    notes: Array.isArray(gm.data) ? gm.data : [],
    sessions: Array.isArray(ms.data) ? ms.data : [],
  }
}

/* -------------------- page -------------------- */
export default function MeetingNotesPage() {
  const [days, setDays] = useState(DAYS_STEP)
  const [data, setData] = useState(null) // { days, fetchedAt, events, notes, sessions }
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [openIds, setOpenIds] = useState(() => new Set())

  const today = chiToday()
  const start = addDays(today, -(days - 1))

  useEffect(() => {
    let alive = true
    fetchRange(start, today).then(res => {
      if (alive) setData({ days, fetchedAt: Date.now(), ...res })
    })
    return () => { alive = false }
  }, [days, start, today])

  const loading = !data
  const extending = !!data && data.days !== days

  // Assemble the units: events in the range (not cancelled, not all-day) with
  // their session and Granola note; then Granola recordings nobody claimed.
  const units = useMemo(() => {
    if (!data) return []
    const recorded = data.notes.filter(hasRecording)
    const notesById = new Map(recorded.map(m => [m.id, m]))
    const sessionsByEvent = new Map(data.sessions.filter(s => s.event_id).map(s => [s.event_id, s]))
    const claimed = new Set()
    // Attendance is judged as of the fetch, so the memo stays pure.
    const nowMs = data.fetchedAt

    const events = data.events.filter(e => !e.is_cancelled && !e.is_all_day)
      .map(e => ({ e, session: sessionsByEvent.get(e.id) || null, day: e.day || chiDayOf(e.start_at) || 'unknown' }))

    // Pass 1: sessions that name their note claim it outright.
    const explicit = new Map()
    for (const { e, session } of events) {
      const id = session?.notes_meeting_id
      if (id && notesById.has(id)) { explicit.set(e.id, notesById.get(id)); claimed.add(id) }
    }
    // Pass 2: everyone else matches by subject against the day's unclaimed notes.
    const out = []
    for (const { e, session, day } of events) {
      let notes = explicit.get(e.id) || null
      if (!notes) {
        const pool = recorded.filter(m => (m.meeting_date || chiDayOf(m.granola_created_at)) === day && !claimed.has(m.id))
        notes = matchNotes(e, pool)
        if (notes) claimed.add(notes.id)
      }
      out.push(eventUnit(e, session, notes, nowMs))
    }
    for (const m of recorded) if (!claimed.has(m.id)) out.push(notesUnit(m))
    return out
  }, [data])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => (q ? units.filter(u => u.searchText.includes(q)) : units), [units, q])

  // Days newest first; events by start time, recordings by created time.
  const grouped = useMemo(() => {
    const map = new Map()
    for (const u of filtered) {
      if (!map.has(u.day)) map.set(u.day, { events: [], recordings: [] })
      map.get(u.day)[u.kind === 'event' ? 'events' : 'recordings'].push(u)
    }
    const byTime = (a, b) => String(a.sortAt).localeCompare(String(b.sortAt))
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([day, g]) => [day, { events: g.events.sort(byTime), recordings: g.recordings.sort(byTime) }])
  }, [filtered])

  const stats = useMemo(() => {
    let meetings = 0, documented = 0, closed = 0
    for (const u of units) {
      if (u.kind !== 'event') continue
      meetings++
      if (hasRecording(u.notes)) documented++
      if (u.session?.closed_at) closed++
    }
    return { meetings, documented, closed }
  }, [units])

  const toggle = (key) => setOpenIds(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  const searchQuery = query.trim()

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <Eyebrow>Monitor · Notes</Eyebrow>
          <h1 style={S.h1}>Notes</h1>
          <div style={S.sub}>meetings as you ran them: calendar, timer, Granola notes, close-out</div>
        </div>
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(96px, auto))', gap: 20 }}>
            <Stat v={stats.meetings} l="Meetings" />
            <Stat v={stats.documented} l="Documented" color={BLUE} />
            <Stat v={stats.closed} l="Closed out" color={stats.closed ? GREEN : GRAY} />
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        background: PANEL_BG, border: `1px solid ${focused ? GOLD : PANEL_BORDER}`, borderRadius: 12, padding: '0 14px',
        transition: 'border-color .15s',
      }}>
        <Search size={15} style={{ color: focused ? GOLD : GRAY, flexShrink: 0, transition: 'color .15s' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search subject, people, notes, follow-ups"
          className="notes-q"
          style={{
            flex: 1, minWidth: 0, height: 42, background: 'transparent', border: 0, outline: 'none',
            color: INK, fontSize: 14, fontFamily: 'inherit',
          }}
        />
        <style>{`.notes-q::placeholder { color: ${GRAY}; opacity: 1; }`}</style>
        {searchQuery && (
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: filtered.length ? GREEN : GRAY, whiteSpace: 'nowrap' }}>
            {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
          </span>
        )}
        {query && (
          <button onClick={() => setQuery('')} style={{
            background: 'transparent', border: `1px solid ${PANEL_BORDER}`, borderRadius: 999, color: INK2, cursor: 'pointer',
            fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
          }}>Clear</button>
        )}
      </div>

      {loading ? (
        <Empty>Loading meetings…</Empty>
      ) : grouped.length === 0 ? (
        <Empty>{searchQuery ? `No meetings match "${searchQuery}"` : `No meetings in the last ${days} days`}</Empty>
      ) : (
        grouped.map(([day, g]) => (
          <DaySection key={day} day={day} events={g.events} recordings={g.recordings} query={searchQuery} openIds={openIds} onToggle={toggle} />
        ))
      )}

      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
          <button
            onClick={() => setDays(d => d + DAYS_STEP)}
            disabled={extending}
            style={{
              background: 'transparent', border: `1px solid ${PANEL_BORDER}`, borderRadius: 999, color: extending ? GRAY : INK2,
              cursor: extending ? 'default' : 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '7px 16px',
            }}
          >
            {extending ? 'Loading…' : `Load ${DAYS_STEP} more days`}
          </button>
        </div>
      )}

      <div style={{ ...S.source, marginTop: 14 }}>
        SOURCES · calendar_events · meeting_sessions · granola_meetings · {start} to {today} · Chicago time
      </div>
    </div>
  )
}
