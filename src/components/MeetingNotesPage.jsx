import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Search, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAVY      = '#002C77'
const ACCENT    = '#009DE0'
const GOLD      = '#D4A106'
const LIGHT_BG  = '#F7F9FC'
const PANEL_BG  = '#FFFFFF'
const BORDER    = '#E1E8F0'
const GRAY      = '#5E7187'
const MEETING_TYPE_COLORS = {
  'one-on-one':       { bg: '#E8F5E9', color: '#2E7D32' },
  'team-meeting':     { bg: '#E3F2FD', color: '#1565C0' },
  'client-call':      { bg: '#FFFBF0', color: '#B45309' },
  'external-intro':   { bg: '#F3E5F5', color: '#6A1B9A' },
  'coaching':         { bg: '#FFF3E0', color: '#E65100' },
  'demo-prep':        { bg: '#E8EAF6', color: '#283593' },
  'strategy-session': { bg: '#FCE4EC', color: '#880E4F' },
}

function formatDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDayShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

/* -------------------- Markdown renderer (Third Horizon styled) -------------------- */
const inlineFormat = (text) => {
  // Bold **text**, italic *text*, inline links
  const parts = []
  let rest = text
  let key = 0
  // crude tokenizer: handle **bold** then links then leftover
  const re = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/\S+)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) {
      parts.push(<strong key={key++} style={{ color: NAVY, fontWeight: 700 }}>{m[1].slice(2,-2)}</strong>)
    } else if (m[2]) {
      const md = m[2].match(/\[([^\]]+)\]\(([^)]+)\)/)
      parts.push(<a key={key++} href={md[2]} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline' }}>{md[1]}</a>)
    } else if (m[3]) {
      parts.push(<a key={key++} href={m[3]} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'underline', wordBreak: 'break-all' }}>{m[3]}</a>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

function THMarkdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // H1 #
    if (/^#\s/.test(line)) {
      out.push(<h2 key={i} style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '20px 0 8px', paddingBottom: 6, borderBottom: `2px solid ${GOLD}` }}>{inlineFormat(line.replace(/^#\s+/, ''))}</h2>)
    }
    // H2 ##
    else if (/^##\s/.test(line) && !/^###/.test(line)) {
      out.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: '18px 0 6px' }}>{inlineFormat(line.replace(/^##\s+/, ''))}</h3>)
    }
    // H3 ###
    else if (/^###\s/.test(line)) {
      out.push(<h4 key={i} style={{ fontSize: 13, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 6px' }}>{inlineFormat(line.replace(/^###\s+/, ''))}</h4>)
    }
    // Nested bullet "  - foo" or "  * foo"
    else if (/^\s{2,}[-*]\s/.test(line)) {
      out.push(<div key={i} style={{ paddingLeft: 36, marginBottom: 3, fontSize: 13, lineHeight: 1.65, color: '#475569' }}>
        <span style={{ color: GOLD, marginRight: 8 }}>◦</span>{inlineFormat(line.replace(/^\s+[-*]\s/, ''))}
      </div>)
    }
    // Top-level bullet "- foo"
    else if (/^[-*]\s/.test(line)) {
      out.push(<div key={i} style={{ paddingLeft: 18, marginBottom: 4, fontSize: 13, lineHeight: 1.65, color: '#1F2937' }}>
        <span style={{ color: NAVY, marginRight: 8, fontWeight: 700 }}>•</span>{inlineFormat(line.replace(/^[-*]\s/, ''))}
      </div>)
    }
    // Horizontal rule
    else if (/^---+\s*$/.test(line)) {
      out.push(<div key={i} style={{ height: 1, background: BORDER, margin: '14px 0' }} />)
    }
    // Blank line
    else if (line.trim() === '') {
      out.push(<div key={i} style={{ height: 6 }} />)
    }
    // Paragraph
    else {
      out.push(<p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: '#1F2937', margin: '4px 0' }}>{inlineFormat(line)}</p>)
    }
    i++
  }
  return <div>{out}</div>
}

/* -------------------- Meeting card -------------------- */
function extractTranscriptUrl(meeting) {
  if (meeting.transcript_url) return meeting.transcript_url
  if (meeting.summary) {
    const match = meeting.summary.match(/https:\/\/notes\.granola\.ai\/t\/[a-z0-9-]+/)
    if (match) return match[0]
  }
  return `https://notes.granola.ai/t/${meeting.id}`
}

function MeetingCard({ meeting }) {
  const [open, setOpen] = useState(false)
  const typeStyle = MEETING_TYPE_COLORS[meeting.meeting_type] || { bg: '#F1F5F9', color: GRAY }
  const transcriptUrl = extractTranscriptUrl(meeting)
  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees.filter(Boolean) : []
  const accounts  = Array.isArray(meeting.accounts)  ? meeting.accounts.filter(Boolean)  : []

  return (
    <div style={{
      background: PANEL_BG,
      border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${open ? ACCENT : BORDER}`,
      borderRadius: 8,
      marginBottom: 8,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <ChevronRight size={14} style={{
          color: GRAY, flexShrink: 0,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
        <span style={{ fontWeight: 600, color: NAVY, flex: 1, fontSize: 13, lineHeight: 1.4 }}>
          {meeting.title || '(untitled)'}
        </span>
        {meeting.meeting_type && meeting.meeting_type !== 'unknown' && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: typeStyle.bg, color: typeStyle.color, whiteSpace: 'nowrap',
          }}>
            {meeting.meeting_type.replace(/-/g, ' ')}
          </span>
        )}
        {accounts.length > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            background: '#EBF4FF', color: NAVY, whiteSpace: 'nowrap',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {accounts.join(' · ')}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          padding: '4px 18px 18px 36px',
          borderTop: `1px solid ${BORDER}`,
          background: LIGHT_BG,
        }}>
          {attendees.length > 0 && (
            <div style={{ margin: '10px 0', fontSize: 11, color: GRAY }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Attendees: </span>
              {attendees.join(', ')}
            </div>
          )}

          {meeting.summary ? (
            <THMarkdown text={meeting.summary} />
          ) : (
            <div style={{ color: GRAY, fontStyle: 'italic', fontSize: 12, padding: '10px 0' }}>No summary available.</div>
          )}

          {transcriptUrl && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
              <a
                href={transcriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600, color: NAVY,
                  textDecoration: 'none', padding: '6px 12px',
                  border: `1px solid ${ACCENT}`, borderRadius: 6,
                  background: 'white',
                }}
              >
                <ExternalLink size={12} />
                Open in Granola →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------- Day group -------------------- */
function DayGroup({ day, meetings, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 18 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: open ? NAVY : 'white',
          color: open ? 'white' : NAVY,
          border: `1px solid ${open ? NAVY : BORDER}`,
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: 'Arial, Helvetica, sans-serif',
          textAlign: 'left',
          marginBottom: 8,
          transition: 'all 0.2s',
        }}
      >
        <ChevronDown size={14} style={{
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s',
        }} />
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
          {formatDay(day)}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: open ? 'rgba(255,255,255,0.18)' : '#EBF4FF',
          color: open ? 'white' : NAVY,
          padding: '3px 9px', borderRadius: 999,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {meetings.length} {meetings.length === 1 ? 'call' : 'calls'}
        </span>
      </button>
      {open && (
        <div style={{ paddingLeft: 6 }}>
          {meetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
        </div>
      )}
    </div>
  )
}

/* -------------------- Page -------------------- */
export default function MeetingNotesPage() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('granola_meetings')
        .select('*')
        .order('meeting_date', { ascending: false })
        .limit(1000)
      if (error) {
        console.error('granola_meetings fetch failed', error)
      }
      setMeetings(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return meetings
    const q = query.toLowerCase()
    return meetings.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.summary || '').toLowerCase().includes(q) ||
      (Array.isArray(m.attendees) ? m.attendees.join(' ') : '').toLowerCase().includes(q) ||
      (Array.isArray(m.accounts)  ? m.accounts.join(' ')  : '').toLowerCase().includes(q) ||
      (m.meeting_type || '').toLowerCase().includes(q)
    )
  }, [meetings, query])

  // Group by day, preserve descending order
  const grouped = useMemo(() => {
    const map = new Map()
    for (const m of filtered) {
      const k = m.meeting_date || 'unknown'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(m)
    }
    return Array.from(map.entries()) // already date-desc due to query order
  }, [filtered])

  // Last-synced indicator
  const lastSynced = useMemo(() => {
    if (!meetings.length) return null
    const ts = meetings.map(m => m.last_synced_at || m.tagged_at || m.granola_created_at).filter(Boolean).sort().pop()
    return ts ? new Date(ts) : null
  }, [meetings])

  return (
    <div style={{
      maxWidth: 920,
      margin: '0 auto',
      padding: '24px 24px 60px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: NAVY,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <FileText size={22} color={NAVY} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: NAVY }}>Meeting Notes</h1>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: NAVY,
              background: '#EBF4FF', padding: '3px 10px', borderRadius: 999,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {filtered.length} {filtered.length === 1 ? 'call' : 'calls'} · {grouped.length} {grouped.length === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: GRAY }}>
          Granola verbatim summaries · Third Horizon formatted
          {lastSynced && (
            <span style={{ marginLeft: 10, color: GRAY }}>
              · last sync: {lastSynced.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {lastSynced.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 22, padding: '10px 14px',
        border: `1px solid ${BORDER}`, borderRadius: 8,
        background: 'white',
      }}>
        <Search size={14} color={GRAY} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search title, summary, attendees, accounts..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 13, color: NAVY, background: 'transparent',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: GRAY, fontSize: 18, lineHeight: 1 }}
          >×</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: GRAY, fontSize: 13 }}>
          Loading meeting notes...
        </div>
      ) : grouped.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', color: GRAY,
          background: 'white', borderRadius: 10, border: `1px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
            {query ? 'No meetings match that search.' : 'No meeting notes yet.'}
          </div>
          {!query && (
            <div style={{ fontSize: 12, color: GRAY }}>Mr-Pulse will populate this once the Granola pipe is live.</div>
          )}
        </div>
      ) : (
        grouped.map(([day, items], idx) => (
          <DayGroup key={day} day={day} meetings={items} defaultOpen={idx === 0} />
        ))
      )}
    </div>
  )
}
