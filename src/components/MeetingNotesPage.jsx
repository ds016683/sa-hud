// MONITOR · NOTES. Every recorded meeting (granola_meetings), grouped by day,
// searchable across title, people and everything said. Rows expand in place to
// show the Granola summary rendered from markdown. Styled to the River canon.
import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ExternalLink, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INK, INK2, GRAY, PANEL_BG, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, GREEN, MONO, SERIF,
  S, Eyebrow, Stat, fmtDay, chiToday,
} from './river/canon'

const MAX_ATTENDEES = 4
const SNIPPET_RADIUS = 110

/* -------------------- helpers -------------------- */
function hasRecording(m) {
  return typeof m.summary === 'string' && m.summary.trim().length > 30
}

const ACRONYMS = new Set(['mma', 'snmi', 'achp', 'cdc', 'hp', 'ipi', 'bh', 'ri', 'pshp', 'va', 'la'])
function humanizeTag(raw) {
  return raw.split(/[-_\s]+/).map(w => ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
}

// Tags = client/engagement accounts + meeting type. Shown in the expanded meta line.
function tagsFor(m) {
  const tags = []
  const accounts = Array.isArray(m.accounts) ? m.accounts.filter(Boolean) : []
  for (const a of accounts) tags.push(humanizeTag(a))
  if (m.meeting_type && m.meeting_type !== 'unknown') tags.push(humanizeTag(m.meeting_type))
  return tags
}

function meetingTime(meeting) {
  const isMatched = meeting.reconciliation_status === 'recorded'
  const ts = (isMatched && meeting.outlook_start) || meeting.granola_created_at || meeting.meeting_date
  if (!ts || typeof ts !== 'string' || !ts.includes('T')) return null
  const d = new Date(ts)
  if (isNaN(d)) return null
  return d.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase().replace(' ', '').replace(':00', '')
}

function titleOf(meeting) {
  return (meeting.reconciliation_status === 'recorded' && meeting.outlook_subject) || meeting.title || '(untitled)'
}

function attendeesOf(meeting) {
  return Array.isArray(meeting.attendees) ? meeting.attendees.filter(Boolean) : []
}

function transcriptUrlFor(meeting) {
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

// Monday of the current Chicago week, as YYYY-MM-DD.
function chiWeekStart() {
  const today = chiToday()
  const d = new Date(today + 'T12:00:00')
  const dow = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - dow)
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

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

// The sentence around the first match in the summary (or attendee list).
function snippetFor(meeting, q) {
  if (!q) return null
  const needle = q.toLowerCase()
  const sources = [meeting.summary || '', attendeesOf(meeting).join(', ')]
  for (const raw of sources) {
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
    const s = (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '')
    return s
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

/* -------------------- row -------------------- */
function MeetingRow({ meeting, query, open, onToggle, first }) {
  const time = meetingTime(meeting)
  const title = titleOf(meeting)
  const attendees = attendeesOf(meeting)
  const shown = attendees.slice(0, MAX_ATTENDEES)
  const more = attendees.length - shown.length
  const snippet = snippetFor(meeting, query)
  const tags = tagsFor(meeting)
  const transcriptUrl = transcriptUrlFor(meeting)

  return (
    <div style={{
      borderTop: first ? 'none' : `1px solid ${PANEL_BORDER}`,
      borderLeft: `2px solid ${open ? GOLD : 'transparent'}`,
      marginLeft: -16, paddingLeft: 14,
      background: open ? 'rgba(255,255,255,0.02)' : 'transparent',
      transition: 'background .15s',
    }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) 18px', gap: 14, alignItems: 'flex-start',
          padding: '12px 0 12px 0', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', color: INK,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 11, color: GRAY, letterSpacing: '0.4px', paddingTop: 3, lineHeight: 1.5 }}>{time || ''}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{highlight(title, query)}</div>
          {attendees.length > 0 && (
            <div style={{ fontSize: 12, color: GRAY, marginTop: 3, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highlight(shown.join(', '), query)}{more > 0 ? ` +${more}` : ''}
            </div>
          )}
          {snippet && (
            <div style={{ fontSize: 12, color: INK2, marginTop: 6, lineHeight: 1.5, fontStyle: 'italic' }}>{highlight(snippet, query)}</div>
          )}
        </div>
        <ChevronRight size={15} style={{ color: open ? GOLD : GRAY, marginTop: 4, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s, color .18s' }} />
      </button>

      {open && (
        <div style={{ padding: '2px 18px 18px 78px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 10, borderBottom: `1px solid ${PANEL_BORDER}`, marginBottom: 4 }}>
            {attendees.length > 0 && (
              <div style={{ fontSize: 11.5, color: GRAY, lineHeight: 1.5, minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', marginRight: 8 }}>Attendees</span>
                {attendees.join(', ')}
              </div>
            )}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                {tags.map(t => <span key={t} style={S.chip('rgba(150,168,240,0.14)', PERIWINKLE)}>{t}</span>)}
              </div>
            )}
          </div>
          <Markdown text={meeting.summary} />
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
            <a href={transcriptUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase',
              color: BLUE, textDecoration: 'none', border: `1px solid ${PANEL_BORDER}`, borderRadius: 999, padding: '5px 11px',
            }}>
              <ExternalLink size={12} /> Open in Granola
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------- day section -------------------- */
function DaySection({ day, meetings, query, openIds, onToggle }) {
  const n = meetings.length
  const isToday = day === chiToday()
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Eyebrow style={{ marginBottom: 0, color: isToday ? GOLD_BRIGHT : INK2 }}>{dayLabel(day)}{isToday ? ' · today' : ''}</Eyebrow>
        <span style={S.chip('rgba(255,255,255,0.08)', GRAY)}>{n} {n === 1 ? 'meeting' : 'meetings'}</span>
        <div style={{ flex: 1, height: 1, background: PANEL_BORDER }} />
      </div>
      <div style={{ ...S.panel, padding: '0 16px', marginBottom: 0 }}>
        {meetings.map((m, i) => (
          <MeetingRow key={m.id} meeting={m} query={query} open={openIds.has(m.id)} onToggle={() => onToggle(m.id)} first={i === 0} />
        ))}
      </div>
    </section>
  )
}

const Empty = ({ children }) => (
  <div style={{ ...S.panel, fontFamily: MONO, fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, textAlign: 'center', padding: '40px 16px' }}>{children}</div>
)

/* -------------------- page -------------------- */
export default function MeetingNotesPage() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [openIds, setOpenIds] = useState(() => new Set())

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('granola_meetings')
        .select('*')
        .order('meeting_date', { ascending: false })
        .order('granola_created_at', { ascending: false })
        .limit(1000)
      if (error) console.error('granola_meetings fetch failed', error)
      setMeetings(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [])

  const recorded = useMemo(() => meetings.filter(hasRecording), [meetings])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return recorded
    return recorded.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.outlook_subject || '').toLowerCase().includes(q) ||
      (m.summary || '').toLowerCase().includes(q) ||
      (Array.isArray(m.attendees) ? m.attendees.join(' ') : '').toLowerCase().includes(q) ||
      (Array.isArray(m.accounts) ? m.accounts.join(' ') : '').toLowerCase().includes(q) ||
      (m.meeting_type || '').toLowerCase().includes(q)
    )
  }, [recorded, q])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const m of filtered) {
      const k = m.meeting_date || 'unknown'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(m)
    }
    return Array.from(map.entries())
  }, [filtered])

  const stats = useMemo(() => {
    const today = chiToday()
    const weekStart = chiWeekStart()
    let week = 0, day = 0
    for (const m of recorded) {
      const d = m.meeting_date || ''
      if (d >= weekStart && d <= today) week++
      if (d === today) day++
    }
    return { total: recorded.length, week, day }
  }, [recorded])

  const toggle = (id) => setOpenIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const searchQuery = query.trim()

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <Eyebrow>Monitor · Notes</Eyebrow>
          <h1 style={S.h1}>Notes</h1>
          <div style={S.sub}>every recorded meeting, transcribed by Granola, indexed by day</div>
        </div>
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(96px, auto))', gap: 20 }}>
            <Stat v={stats.total} l="Meetings" />
            <Stat v={stats.week} l="This week" color={BLUE} />
            <Stat v={stats.day} l="Today" color={stats.day ? GOLD_BRIGHT : GRAY} />
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
          placeholder="Search title, people, anything said"
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
        <Empty>Loading meeting notes…</Empty>
      ) : grouped.length === 0 ? (
        <Empty>{searchQuery ? `No meetings match "${searchQuery}"` : 'No recorded meetings yet'}</Empty>
      ) : (
        grouped.map(([day, items]) => (
          <DaySection key={day} day={day} meetings={items} query={searchQuery} openIds={openIds} onToggle={toggle} />
        ))
      )}

      <div style={{ ...S.source, marginTop: 14 }}>
        SOURCE · granola_meetings · {recorded.length} recorded of {meetings.length} loaded · Chicago time
      </div>
    </div>
  )
}
