import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, ExternalLink, Search, FileText, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHead, Pill } from './sa/SaUi'

const SECTION_BLUE = '#1F4060' // darker TH navy-blue for in-note section headers

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
  // Section header: darker blue, a step larger than body, semibold.
  const headerBase = { color: SECTION_BLUE, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }
  while (i < lines.length) {
    const line = lines[i]
    if (/^#\s/.test(line)) {
      out.push(<div key={i} style={{ ...headerBase, fontSize: 18, margin: '22px 0 9px' }}>{inlineFormat(line.replace(/^#\s+/, ''))}</div>)
    } else if (/^##\s/.test(line) && !/^###/.test(line)) {
      out.push(<div key={i} style={{ ...headerBase, fontSize: 17, margin: '20px 0 8px' }}>{inlineFormat(line.replace(/^##\s+/, ''))}</div>)
    } else if (/^###\s/.test(line)) {
      out.push(<div key={i} style={{ ...headerBase, fontSize: 16, margin: '18px 0 8px' }}>{inlineFormat(line.replace(/^###\s+/, ''))}</div>)
    } else if (/^\s{2,}[-*]\s/.test(line)) {
      out.push(
        <div key={i} style={{ paddingLeft: 50, marginBottom: 4, fontSize: 14, lineHeight: 1.6, color: 'var(--sa-ink-2)', display: 'flex', gap: 9 }}>
          <span style={{ color: 'var(--sa-accent)' }}>◦</span><span>{inlineFormat(line.replace(/^\s+[-*]\s/, ''))}</span>
        </div>
      )
    } else if (/^[-*]\s/.test(line)) {
      out.push(
        <div key={i} style={{ paddingLeft: 18, marginBottom: 5, fontSize: 14.5, lineHeight: 1.65, color: 'var(--sa-ink)', display: 'flex', gap: 9 }}>
          <span style={{ color: 'var(--sa-ink)', fontWeight: 700 }}>•</span><span>{inlineFormat(line.replace(/^[-*]\s/, ''))}</span>
        </div>
      )
    } else if (/^---+\s*$/.test(line)) {
      out.push(<div key={i} style={{ height: 1, background: 'var(--sa-border)', margin: '14px 0' }} />)
    } else if (line.trim() === '') {
      out.push(<div key={i} style={{ height: 7 }} />)
    } else {
      out.push(<p key={i} style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--sa-ink)', margin: '5px 0' }}>{inlineFormat(line)}</p>)
    }
    i++
  }
  return <div>{out}</div>
}

/* -------------------- helpers -------------------- */
function hasRecording(m) {
  return typeof m.summary === 'string' && m.summary.trim().length > 30
}

const ACRONYMS = new Set(['mma', 'snmi', 'achp', 'cdc', 'hp', 'ipi', 'bh', 'ri', 'pshp', 'va', 'la'])
function humanizeTag(raw) {
  return raw.split(/[-_\s]+/).map(w => ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
}

// Tags = client/engagement accounts + meeting type. Used on cards and for filtering.
function tagsFor(m) {
  const tags = []
  const accounts = Array.isArray(m.accounts) ? m.accounts.filter(Boolean) : []
  for (const a of accounts) tags.push({ key: `acct:${a}`, label: humanizeTag(a), kind: 'acct' })
  if (m.meeting_type && m.meeting_type !== 'unknown') tags.push({ key: `type:${m.meeting_type}`, label: humanizeTag(m.meeting_type), kind: 'type' })
  return tags
}

function meetingDateTime(meeting) {
  const isMatched = meeting.reconciliation_status === 'recorded'
  const ts = (isMatched && meeting.outlook_start) || meeting.granola_created_at || meeting.meeting_date
  if (!ts) return { timeStr: null }
  const d = new Date(ts)
  if (isNaN(d)) return { timeStr: null }
  const hasTime = typeof ts === 'string' && ts.includes('T')
  const timeStr = hasTime
    ? d.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '').replace(':00', '')
    : null
  return { timeStr }
}

function formatDayHeading(dateStr) {
  if (!dateStr || dateStr === 'unknown') return 'Undated'
  const d = new Date(dateStr + 'T12:00:00')
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
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
  const { timeStr } = meetingDateTime(meeting)
  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees.filter(Boolean) : []
  const title = (meeting.reconciliation_status === 'recorded' && meeting.outlook_subject) || meeting.title || '(untitled)'
  const transcriptUrl = transcriptUrlFor(meeting)
  const tags = tagsFor(meeting)

  return (
    <section className="sa-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <ChevronRight size={15} style={{ color: 'var(--sa-ink-3)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
        {timeStr && <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', minWidth: 54, flexShrink: 0 }}>{timeStr}</div>}
        <div className="sa-serif" style={{ flex: 1, fontSize: 18, color: 'var(--sa-ink)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {tags.map(t => <Pill key={t.key} kind={t.kind === 'acct' ? 'pending' : 'muted'}>{t.label}</Pill>)}
        </div>
      </button>

      {open && (
        <div style={{ padding: '4px 20px 20px 52px', borderTop: '1px solid var(--sa-border)', background: 'var(--sa-canvas)' }}>
          {attendees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', fontSize: 12.5, color: 'var(--sa-ink-2)' }}>
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

/* -------------------- day group (collapsible) -------------------- */
function DayGroup({ day, meetings, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 18 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', background: 'transparent', border: 0, borderBottom: '1px solid var(--sa-border)', cursor: 'pointer', textAlign: 'left', marginBottom: 12 }}
      >
        <ChevronDown size={16} style={{ color: 'var(--sa-ink-3)', flexShrink: 0, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} />
        <span className="sa-serif" style={{ flex: 1, fontSize: 19, color: 'var(--sa-ink)' }}>{formatDayHeading(day)}</span>
        <span className="sa-tele" style={{ color: 'var(--sa-ink-3)' }}>{meetings.length} {meetings.length === 1 ? 'MEETING' : 'MEETINGS'}</span>
      </button>
      {open && meetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
    </div>
  )
}

/* -------------------- page -------------------- */
export default function MeetingNotesPage() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState([])

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

  // Distinct tags across all recorded meetings, for the filter bar.
  const allTags = useMemo(() => {
    const map = new Map()
    for (const m of recorded) for (const t of tagsFor(m)) if (!map.has(t.key)) map.set(t.key, t)
    return Array.from(map.values()).sort((a, b) => (a.kind === b.kind ? a.label.localeCompare(b.label) : a.kind === 'acct' ? -1 : 1))
  }, [recorded])

  const toggleTag = (key) => setActiveTags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const filtered = useMemo(() => {
    let list = recorded
    if (activeTags.length) {
      list = list.filter(m => {
        const keys = tagsFor(m).map(t => t.key)
        return activeTags.some(k => keys.includes(k))
      })
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.outlook_subject || '').toLowerCase().includes(q) ||
        (m.summary || '').toLowerCase().includes(q) ||
        (Array.isArray(m.attendees) ? m.attendees.join(' ') : '').toLowerCase().includes(q) ||
        (Array.isArray(m.accounts) ? m.accounts.join(' ') : '').toLowerCase().includes(q) ||
        (m.meeting_type || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [recorded, query, activeTags])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const m of filtered) {
      const k = m.meeting_date || 'unknown'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(m)
    }
    return Array.from(map.entries())
  }, [filtered])

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
          desc="Every recorded meeting, transcribed by Granola and indexed by day. Filter by client or type, search across everything said, and open any call to read it back in full."
          right={!loading && (
            <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', textAlign: 'right' }}>
              {recorded.length} RECORDED MEETINGS
              {lastSynced && <div style={{ marginTop: 4 }}>SYNCED {lastSynced.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</div>}
            </div>
          )}
        />
      </div>

      <div className="col-12">
        <section className="sa-card">
          <div className="sa-theo-bar">
            <Search size={16} style={{ color: 'var(--sa-ink-3)', flexShrink: 0 }} />
            <input className="q" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search every meeting — title, people, accounts, anything said…" />
            {query && <button className="go" onClick={() => setQuery('')} style={{ background: 'var(--sa-border)', color: 'var(--sa-ink)' }}>Clear</button>}
          </div>
          {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
              <span className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginRight: 2 }}>FILTER</span>
              {allTags.map(t => {
                const on = activeTags.includes(t.key)
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleTag(t.key)}
                    style={{
                      cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
                      padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap',
                      border: `1px solid ${on ? SECTION_BLUE : 'var(--sa-border)'}`,
                      background: on ? SECTION_BLUE : 'var(--sa-surface)',
                      color: on ? '#fff' : 'var(--sa-ink-2)',
                      transition: 'all .15s',
                    }}
                  >{t.label}</button>
                )
              })}
              {activeTags.length > 0 && (
                <button onClick={() => setActiveTags([])} className="sa-tele" style={{ cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--sa-accent-deep)' }}>CLEAR</button>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="col-12">
        {loading ? (
          <div className="sa-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--sa-ink-3)' }}>
            <span className="sa-tele">LOADING MEETING NOTES…</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="sa-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <FileText size={26} style={{ color: 'var(--sa-ink-3)', margin: '0 auto 12px' }} />
            <div className="sa-serif" style={{ fontSize: 20, color: 'var(--sa-ink)' }}>
              {query || activeTags.length ? 'No meetings match those filters.' : 'No recorded meetings yet.'}
            </div>
            {(query || activeTags.length > 0) && <div style={{ fontSize: 13, color: 'var(--sa-ink-2)', marginTop: 6 }}>Try a different term, or clear the filters.</div>}
          </div>
        ) : (
          grouped.map(([day, items], idx) => (
            <DayGroup key={day} day={day} meetings={items} defaultOpen={idx === 0} />
          ))
        )}
      </div>
    </div>
  )
}
