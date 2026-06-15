import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ExternalLink, Search, FileText, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHead, Pill } from './sa/SaUi'

/* -------------------- inline markdown (bold / italic / links) -------------------- */
const inlineFormat = (text) => {
  const parts = []
  let key = 0
  const re = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/\S+)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) {
      parts.push(<strong key={key++} style={{ color: 'var(--sa-ink)', fontWeight: 700 }}>{m[1].slice(2, -2)}</strong>)
    } else if (m[2]) {
      parts.push(<em key={key++} style={{ color: 'var(--sa-ink)' }}>{m[2].slice(1, -1)}</em>)
    } else if (m[3]) {
      const md = m[3].match(/\[([^\]]+)\]\(([^)]+)\)/)
      parts.push(<a key={key++} href={md[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sa-accent-deep)', textDecoration: 'underline' }}>{md[1]}</a>)
    } else if (m[4]) {
      parts.push(<a key={key++} href={m[4]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sa-accent-deep)', textDecoration: 'underline', wordBreak: 'break-all' }}>{m[4]}</a>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

/* -------------------- block markdown renderer (TH tokens) -------------------- */
function THMarkdown({ text }) {
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^#\s/.test(line)) {
      out.push(<div key={i} className="sa-serif" style={{ fontSize: 18, color: 'var(--sa-ink)', margin: '20px 0 8px', paddingBottom: 6, borderBottom: '1px solid var(--sa-border)' }}>{inlineFormat(line.replace(/^#\s+/, ''))}</div>)
    } else if (/^##\s/.test(line) && !/^###/.test(line)) {
      out.push(<div key={i} className="sa-serif" style={{ fontSize: 16, color: 'var(--sa-ink)', margin: '18px 0 6px' }}>{inlineFormat(line.replace(/^##\s+/, ''))}</div>)
    } else if (/^###\s/.test(line)) {
      out.push(<div key={i} className="sa-tele" style={{ color: 'var(--sa-accent-deep)', margin: '16px 0 6px' }}>{inlineFormat(line.replace(/^###\s+/, ''))}</div>)
    } else if (/^\s{2,}[-*]\s/.test(line)) {
      out.push(
        <div key={i} style={{ paddingLeft: 50, marginBottom: 3, fontSize: 12.5, lineHeight: 1.6, color: 'var(--sa-ink-2)', display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--sa-accent)' }}>◦</span><span>{inlineFormat(line.replace(/^\s+[-*]\s/, ''))}</span>
        </div>
      )
    } else if (/^[-*]\s/.test(line)) {
      out.push(
        <div key={i} style={{ paddingLeft: 18, marginBottom: 4, fontSize: 13, lineHeight: 1.65, color: 'var(--sa-ink)', display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--sa-ink)', fontWeight: 700 }}>•</span><span>{inlineFormat(line.replace(/^[-*]\s/, ''))}</span>
        </div>
      )
    } else if (/^---+\s*$/.test(line)) {
      out.push(<div key={i} style={{ height: 1, background: 'var(--sa-border)', margin: '14px 0' }} />)
    } else if (line.trim() === '') {
      out.push(<div key={i} style={{ height: 6 }} />)
    } else {
      out.push(<p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--sa-ink)', margin: '4px 0' }}>{inlineFormat(line)}</p>)
    }
    i++
  }
  return <div>{out}</div>
}

/* -------------------- helpers -------------------- */
// A meeting "has a recording" if it actually carries notes. Calendar holds with
// no Granola transcript come through with an empty summary — those are dropped.
function hasRecording(m) {
  return typeof m.summary === 'string' && m.summary.trim().length > 30
}

function meetingDateTime(meeting) {
  const isMatched = meeting.reconciliation_status === 'recorded'
  const ts = (isMatched && meeting.outlook_start) || meeting.granola_created_at || meeting.meeting_date
  if (!ts) return { dateStr: '', timeStr: null }
  const d = new Date(ts)
  if (isNaN(d)) return { dateStr: '', timeStr: null }
  const dateStr = d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })
  const hasTime = typeof ts === 'string' && ts.includes('T')
  const timeStr = hasTime
    ? d.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '').replace(':00', '')
    : null
  return { dateStr, timeStr }
}

function transcriptUrlFor(meeting) {
  if (meeting.transcript_url) return meeting.transcript_url
  if (meeting.summary) {
    const match = meeting.summary.match(/https:\/\/notes\.granola\.ai\/t\/[a-z0-9-]+/)
    if (match) return match[0]
  }
  return `https://notes.granola.ai/t/${meeting.id}`
}

/* -------------------- meeting card -------------------- */
function MeetingCard({ meeting }) {
  const [open, setOpen] = useState(false)
  const { dateStr, timeStr } = meetingDateTime(meeting)
  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees.filter(Boolean) : []
  const accounts = Array.isArray(meeting.accounts) ? meeting.accounts.filter(Boolean) : []
  const title = (meeting.reconciliation_status === 'recorded' && meeting.outlook_subject) || meeting.title || '(untitled)'
  const transcriptUrl = transcriptUrlFor(meeting)

  return (
    <section className="sa-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--sa-gap)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '16px 20px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <ChevronRight size={15} style={{ color: 'var(--sa-ink-3)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
        <div style={{ minWidth: 78, flexShrink: 0 }}>
          <div className="sa-tele" style={{ color: 'var(--sa-accent-deep)' }}>{dateStr}</div>
          {timeStr && <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: 2 }}>{timeStr}</div>}
        </div>
        <div className="sa-serif" style={{ flex: 1, fontSize: 18, color: 'var(--sa-ink)', lineHeight: 1.2 }}>{title}</div>
        {accounts.length > 0 && <Pill kind="muted">{accounts.join(' · ')}</Pill>}
        {meeting.meeting_type && meeting.meeting_type !== 'unknown' && (
          <Pill kind="pending">{meeting.meeting_type.replace(/-/g, ' ')}</Pill>
        )}
      </button>

      {open && (
        <div style={{ padding: '4px 20px 20px 56px', borderTop: '1px solid var(--sa-border)', background: 'var(--sa-canvas)' }}>
          {attendees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', fontSize: 12, color: 'var(--sa-ink-2)' }}>
              <Users size={13} style={{ color: 'var(--sa-ink-3)' }} />
              <span className="sa-tele" style={{ color: 'var(--sa-ink-3)' }}>ATTENDEES</span>
              <span>{attendees.join(', ')}</span>
            </div>
          )}
          <THMarkdown text={meeting.summary} />
          {transcriptUrl && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--sa-border)' }}>
              <a href={transcriptUrl} target="_blank" rel="noopener noreferrer" className="fin-btn" style={{ textDecoration: 'none' }}>
                <ExternalLink size={13} /> Open in Granola
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/* -------------------- page -------------------- */
const SAMPLE_QUERIES = [
  'how have we priced landscape analyses?',
  'what went wrong on multi-workstream handoffs?',
  'who has worked with Kennedy Forum?',
]

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
        .order('granola_created_at', { ascending: false })
        .limit(1000)
      if (error) console.error('granola_meetings fetch failed', error)
      setMeetings(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [])

  // Drop every meeting without a recording (no notes), then apply search.
  const recorded = useMemo(() => meetings.filter(hasRecording), [meetings])

  const filtered = useMemo(() => {
    if (!query.trim()) return recorded
    const q = query.toLowerCase()
    return recorded.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.outlook_subject || '').toLowerCase().includes(q) ||
      (m.summary || '').toLowerCase().includes(q) ||
      (Array.isArray(m.attendees) ? m.attendees.join(' ') : '').toLowerCase().includes(q) ||
      (Array.isArray(m.accounts) ? m.accounts.join(' ') : '').toLowerCase().includes(q) ||
      (m.meeting_type || '').toLowerCase().includes(q)
    )
  }, [recorded, query])

  const lastSynced = useMemo(() => {
    if (!meetings.length) return null
    const ts = meetings.map(m => m.last_synced_at || m.tagged_at || m.granola_created_at).filter(Boolean).sort().pop()
    return ts ? new Date(ts) : null
  }, [meetings])

  return (
    <div className="sa-grid">
      <div className="col-12">
        <PageHead
          eyebrow="THE BRAIN · KNOWLEDGE"
          title="Meeting Notes"
          em="— your memory, searchable"
          desc="Every recorded meeting, transcribed by Granola and indexed here. Search across everything you've discussed and decided; open any call to read it back in full."
          right={!loading && (
            <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', textAlign: 'right' }}>
              {recorded.length} RECORDED MEETINGS
              {lastSynced && <div style={{ marginTop: 4 }}>SYNCED {lastSynced.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</div>}
            </div>
          )}
        />
      </div>

      {/* Ask / search bar — TH aesthetic */}
      <div className="col-12">
        <section className="sa-card">
          <div className="sa-theo-bar">
            <Search size={16} style={{ color: 'var(--sa-ink-3)', flexShrink: 0 }} />
            <input
              className="q"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search every meeting — title, people, accounts, anything said…"
            />
            {query && (
              <button className="go" onClick={() => setQuery('')} style={{ background: 'var(--sa-border)', color: 'var(--sa-ink)' }}>Clear</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
            {SAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuery(q.replace(/[?]/g, ''))}
                className="sa-int-btn"
                style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', fontSize: 11.5, cursor: 'pointer' }}
              >“{q}”</button>
            ))}
          </div>
        </section>
      </div>

      <div className="col-12">
        {loading ? (
          <div className="sa-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--sa-ink-3)' }}>
            <span className="sa-tele">LOADING MEETING NOTES…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sa-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <FileText size={26} style={{ color: 'var(--sa-ink-3)', margin: '0 auto 12px' }} />
            <div className="sa-serif" style={{ fontSize: 20, color: 'var(--sa-ink)' }}>
              {query ? 'No meetings match that search.' : 'No recorded meetings yet.'}
            </div>
            {query && <div style={{ fontSize: 13, color: 'var(--sa-ink-2)', marginTop: 6 }}>Try a different term, or clear the search.</div>}
          </div>
        ) : (
          filtered.map(m => <MeetingCard key={m.id} meeting={m} />)
        )}
      </div>
    </div>
  )
}
