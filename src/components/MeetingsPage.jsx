import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ExternalLink, Search, Calendar } from 'lucide-react'

const SUPA_URL = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

const TH = {
  darkBlue:    '#1A3A5C',
  mediumBlue:  '#2B6CB0',
  gold:        '#D4A017',
  lightGoldBg: '#FFFBF0',
  lightBlueBg: '#EBF4FF',
  gray:        '#6B7280',
  white:       '#FFFFFF',
}

const MEETING_TYPE_COLORS = {
  'one-on-one':       { bg: '#E8F5E9', color: '#2E7D32' },
  'team-meeting':     { bg: '#E3F2FD', color: '#1565C0' },
  'client-call':      { bg: TH.lightGoldBg, color: '#B45309' },
  'external-intro':   { bg: '#F3E5F5', color: '#6A1B9A' },
  'coaching':         { bg: '#FFF3E0', color: '#E65100' },
  'demo-prep':        { bg: '#E8EAF6', color: '#283593' },
  'strategy-session': { bg: '#FCE4EC', color: '#880E4F' },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const MarkdownBlock = ({ text }) => {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^#{1,3}\s/.test(line)) {
      const content = line.replace(/^#{1,3}\s+/, '')
      elements.push(
        <div key={i} style={{ fontWeight: 700, color: TH.darkBlue, fontSize: 12, marginTop: 14, marginBottom: 4 }}>
          {content}
        </div>
      )
    } else if (/^[-*]\s/.test(line)) {
      elements.push(
        <div key={i} style={{ paddingLeft: 16, marginBottom: 2, fontSize: 12, lineHeight: 1.7 }}>
          • {line.replace(/^[-*]\s/, '')}
        </div>
      )
    } else if (/^\s{2,}[-*]\s/.test(line)) {
      elements.push(
        <div key={i} style={{ paddingLeft: 32, marginBottom: 2, fontSize: 12, lineHeight: 1.7, color: '#555' }}>
          ◦ {line.replace(/^\s+[-*]\s/, '')}
        </div>
      )
    } else if (/^•/.test(line)) {
      elements.push(
        <div key={i} style={{ paddingLeft: 16, marginBottom: 2, fontSize: 12, lineHeight: 1.7 }}>
          {line}
        </div>
      )
    } else if (line.trim() === '' || line.trim() === '---') {
      elements.push(<div key={i} style={{ height: 6 }} />)
    } else if (/https?:\/\/\S+/.test(line.trim())) {
      const urlMatch = line.trim().match(/https?:\/\/\S+/)
      const url = urlMatch ? urlMatch[0] : line.trim()
      const label = line.trim().replace(url, '').replace('Chat with meeting transcript:', '').trim()
      elements.push(
        <div key={i} style={{ marginTop: 8, marginBottom: 4 }}>
          {label && <span style={{ fontSize: 11, color: '#666', marginRight: 6 }}>{label}</span>}
          <a href={url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, color: TH.darkBlue, fontWeight: 600,
            textDecoration: 'underline', wordBreak: 'break-all'
          }}>{url}</a>
        </div>
      )
    } else {
      elements.push(
        <div key={i} style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 2 }}>{line}</div>
      )
    }
    i++
  }
  return <div style={{ marginBottom: 12 }}>{elements}</div>
}

function extractTranscriptUrl(meeting) {
  if (meeting.transcript_url) return meeting.transcript_url
  if (meeting.summary) {
    const match = meeting.summary.match(/https:\/\/notes\.granola\.ai\/t\/[a-z0-9-]+/)
    if (match) return match[0]
  }
  // Fallback: construct from id
  return `https://notes.granola.ai/t/${meeting.id}`
}

const MeetingCard = ({ meeting }) => {
  const [open, setOpen] = useState(false)
  const typeStyle = MEETING_TYPE_COLORS[meeting.meeting_type] || { bg: '#F3F4F6', color: TH.gray }
  const transcriptUrl = extractTranscriptUrl(meeting)

  const attendeeList = (() => {
    const arr = Array.isArray(meeting.attendees) ? meeting.attendees : []
    return arr.filter(Boolean).join(', ')
  })()

  const accountList = (() => {
    const arr = Array.isArray(meeting.accounts) ? meeting.accounts : []
    return arr.filter(Boolean).join(', ')
  })()

  return (
    <div style={{ marginBottom: 10, border: `1px solid ${TH.gold}`, borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 14px', background: '#fafbfc', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 600, color: TH.darkBlue, flex: 1, textAlign: 'left', lineHeight: 1.4 }}>
          {meeting.title || '(untitled)'}
        </span>
        <span style={{ fontSize: 11, color: TH.gray, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatDate(meeting.meeting_date)}
        </span>
        {meeting.meeting_type && meeting.meeting_type !== 'unknown' && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            whiteSpace: 'nowrap', flexShrink: 0,
            background: typeStyle.bg, color: typeStyle.color,
          }}>
            {meeting.meeting_type.replace(/-/g, ' ').toUpperCase()}
          </span>
        )}
        {accountList && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
            background: TH.lightBlueBg, color: TH.mediumBlue,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {accountList}
          </span>
        )}
        <ChevronDown
          size={14}
          style={{
            color: TH.gray, flexShrink: 0,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      <div style={{
        maxHeight: open ? 4000 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{ padding: 14, fontSize: 12, lineHeight: 1.8, color: '#333', background: TH.white }}>
          {attendeeList && (
            <div style={{ marginBottom: 10, fontSize: 11, color: TH.gray }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attendees: </span>
              {attendeeList}
            </div>
          )}

          {meeting.summary ? (
            <MarkdownBlock text={meeting.summary} />
          ) : (
            <div style={{ color: TH.gray, fontStyle: 'italic', fontSize: 12 }}>No summary available.</div>
          )}

          {transcriptUrl && (
            <div style={{
              marginTop: 14, paddingTop: 12, borderTop: `1px solid ${TH.gold}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <a
                href={transcriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600, color: TH.mediumBlue,
                  textDecoration: 'none', padding: '5px 10px',
                  border: `1px solid ${TH.mediumBlue}`, borderRadius: 4,
                  background: TH.lightBlueBg,
                }}
              >
                <ExternalLink size={12} />
                View Transcript →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const hdrs = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    fetch(`${SUPA_URL}/rest/v1/granola_meetings?order=meeting_date.desc&limit=500`, { headers: hdrs })
      .then(r => r.json())
      .then(rows => {
        setMeetings(Array.isArray(rows) ? rows : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return meetings
    const q = query.toLowerCase()
    return meetings.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (Array.isArray(m.attendees) ? m.attendees.join(' ') : '').toLowerCase().includes(q) ||
      (Array.isArray(m.accounts) ? m.accounts.join(' ') : '').toLowerCase().includes(q) ||
      (Array.isArray(m.topics) ? m.topics.join(' ') : '').toLowerCase().includes(q) ||
      (m.meeting_type || '').toLowerCase().includes(q)
    )
  }, [meetings, query])

  return (
    <div style={{
      padding: '32px 32px 48px',
      maxWidth: 860, margin: '0 auto',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Calendar size={20} color={TH.darkBlue} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: TH.darkBlue }}>Meetings</h1>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: TH.gray,
              background: '#F3F4F6', padding: '2px 8px', borderRadius: 12,
            }}>
              {filtered.length} / {meetings.length}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: TH.gray }}>Granola call notes — synced automatically</div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 20, padding: '8px 12px',
        border: `1px solid ${TH.gold}`, borderRadius: 6,
        background: TH.white,
      }}>
        <Search size={14} color={TH.gray} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, attendees, accounts, topics..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 13, color: TH.darkBlue, background: 'transparent',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: TH.gray, fontSize: 16, lineHeight: 1 }}
          >×</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: TH.gray, fontSize: 13 }}>
          Loading meetings...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', color: TH.gray,
          background: TH.lightBlueBg, borderRadius: 8, border: `1px dashed ${TH.gold}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: TH.darkBlue, marginBottom: 8 }}>
            {query ? 'No meetings match that search.' : 'No meetings found.'}
          </div>
        </div>
      ) : (
        filtered.map(m => <MeetingCard key={m.id} meeting={m} />)
      )}
    </div>
  )
}
