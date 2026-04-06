import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Calendar, FileText, Mic, ExternalLink, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

const S = {
  page: { maxWidth: 1000, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  h1: { fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 },
  sub: { fontSize: 13, color: '#8096B2', margin: '3px 0 0' },
  tabs: { display: 'flex', gap: 4, background: '#F7F9FC', borderRadius: 10, padding: 4, border: '1px solid #E2E8F0', width: 'fit-content', marginBottom: 20 },
  tab: (active) => ({ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: active ? 700 : 500, background: active ? '#002C77' : 'transparent', color: active ? 'white' : '#8096B2', transition: 'all 0.15s' }),
  card: { background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: { padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' },
  dateLabel: { fontSize: 15, fontWeight: 700, color: '#002C77' },
  dateCount: { fontSize: 12, color: '#8096B2', marginLeft: 8 },
  section: { padding: '16px 20px', borderBottom: '1px solid #F1F5F9' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 },
  briefingText: { fontSize: 14, color: '#334E85', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  callCard: { background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', marginBottom: 8 },
  callTitle: { fontSize: 14, fontWeight: 600, color: '#002C77', marginBottom: 4 },
  callMeta: { fontSize: 12, color: '#8096B2', marginBottom: 6 },
  callSummary: { fontSize: 13, color: '#334E85', lineHeight: 1.6 },
  badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: color + '15', color: color, border: `1px solid ${color}30`, marginLeft: 8 }),
  emptyState: { textAlign: 'center', padding: '48px 0', color: '#8096B2' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#334E85', cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' },
}

const ROUTING_CATEGORIES = {
  'client': { label: 'Client', color: '#009DE0' },
  'snmi': { label: 'SNMI', color: '#6D28D9' },
  'internal': { label: 'Internal', color: '#00968F' },
  'personal': { label: 'Personal', color: '#FF8C00' },
  'mma': { label: 'MMA', color: '#002C77' },
  'unknown': { label: 'Unclassified', color: '#8096B2' },
}

// Mock data for UI demo â€” will be replaced by real Granola data
const DEMO_ENTRIES = [
  {
    date: '2026-04-05',
    dateLabel: 'Sunday, April 5, 2026',
    briefing: `Good evening David,

Here's your daily summary for April 5, 2026.

**Productivity:** Exceptional. This was one of the most productive single-day sessions we've had. You moved through a complete system redesign of the SA HUD, sorted through all 29 active work items, built the Notion Command Center foundation, and architected the Granola integration plan.

**Key outcomes today:**
- SA HUD fully migrated to Supabase with auth, left nav, and MMA-matched aesthetic
- All 29 inventory items classified and routed to Portfolio, Ideas, or Quests
- Commercial Infrastructure category created in Portfolio
- Notion Command Center established and connected
- Granola API integration live and ready for first meeting

**Tomorrow's focus:** First Granola meeting capture. Q2 push begins in earnest.`,
    calls: [],
    pending: true
  }
]

function CallEntry({ call }) {
  const [expanded, setExpanded] = useState(false)
  const routing = ROUTING_CATEGORIES[call.routing] || ROUTING_CATEGORIES.unknown

  return (
    <div style={S.callCard}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={S.callTitle}>
            <Mic size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#009DE0' }} />
            {call.title}
            <span style={S.badge(routing.color)}>{routing.label}</span>
            {call.confidence === 'low' && <span style={S.badge('#FF8C00')}>Review routing</span>}
          </div>
          <div style={S.callMeta}>
            {call.time && <span>{call.time} &nbsp;Â·&nbsp; </span>}
            {call.duration && <span>{call.duration} &nbsp;Â·&nbsp; </span>}
            {call.attendees && <span>{call.attendees}</span>}
          </div>
          <div style={S.callSummary}>{call.summary}</div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8096B2', padding: '0 0 0 12px', flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
      {expanded && call.transcript && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Transcript excerpt</div>
          <div style={{ fontSize: 12, color: '#565656', lineHeight: 1.7, fontFamily: 'Arial, Helvetica, sans-serif' }}>{call.transcript}</div>
        </div>
      )}
      {call.notionUrl && (
        <div style={{ marginTop: 8 }}>
          <a href={call.notionUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#009DE0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink size={11} /> View in Notion
          </a>
        </div>
      )}
    </div>
  )
}

function DayEntry({ entry }) {
  const [open, setOpen] = useState(true)

  return (
    <div style={S.card}>
      <div style={S.cardHeader} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Calendar size={14} style={{ color: '#009DE0', marginRight: 8 }} />
          <span style={S.dateLabel}>{entry.dateLabel}</span>
          <span style={S.dateCount}>{entry.calls.length} call{entry.calls.length !== 1 ? 's' : ''}</span>
          {entry.pending && <span style={{ ...S.badge('#FF8C00'), marginLeft: 8 }}>Awaiting Granola data</span>}
        </div>
        {open ? <ChevronDown size={14} style={{ color: '#8096B2' }} /> : <ChevronRight size={14} style={{ color: '#8096B2' }} />}
      </div>

      {open && (
        <>
          {entry.briefing && (
            <div style={S.section}>
              <div style={S.sectionLabel}>Daily Briefing</div>
              <div style={S.briefingText}>{entry.briefing}</div>
            </div>
          )}
          {entry.calls.length > 0 && (
            <div style={{ padding: '16px 20px' }}>
              <div style={S.sectionLabel}>Call Summaries ({entry.calls.length})</div>
              {entry.calls.map(call => <CallEntry key={call.id} call={call} />)}
            </div>
          )}
          {entry.calls.length === 0 && !entry.pending && (
            <div style={{ padding: '16px 20px', color: '#8096B2', fontSize: 13 }}>No calls recorded this day.</div>
          )}
          {entry.pending && entry.calls.length === 0 && (
            <div style={{ padding: '16px 20px' }}>
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400E' }}>
                <strong>Granola integration is live.</strong> Your first meeting capture will appear here automatically. Make sure Granola is running on your Mac before your next call.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DailyBriefingsPage() {
  const [tab, setTab] = useState('today')
  const [entries, setEntries] = useState(DEMO_ENTRIES)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const today = entries.find(e => e.date === new Date().toISOString().slice(0, 10))
  const archive = entries.filter(e => e.date !== new Date().toISOString().slice(0, 10))

  const checkGranola = async () => {
    setLoading(true)
    setLastChecked(new Date())
    // Real implementation will call Granola API here
    // For now just simulate a check
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Daily Briefings</h1>
          <p style={S.sub}>
            Briefings + call summaries Â· {lastChecked ? `Last checked ${lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Granola agent checks every 15 min (8AMâ€“6PM)'}
          </p>
        </div>
        <button style={S.refreshBtn} onClick={checkGranola} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Checking...' : 'Check Granola'}
        </button>
      </div>

      <div style={S.tabs}>
        <button style={S.tab(tab === 'today')} onClick={() => setTab('today')}>Today</button>
        <button style={S.tab(tab === 'archive')} onClick={() => setTab('archive')}>Archive</button>
      </div>

      {tab === 'today' && (
        today ? <DayEntry entry={today} /> : (
          <div style={S.emptyState}>
            <FileText size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD8E8' }} />
            <div style={{ fontSize: 14, marginBottom: 4 }}>No entry for today yet</div>
            <div style={{ fontSize: 12 }}>Daily briefing arrives around 11 PM. Call summaries populate as meetings finish.</div>
          </div>
        )
      )}

      {tab === 'archive' && (
        archive.length > 0 ? (
          archive.map(entry => <DayEntry key={entry.date} entry={entry} />)
        ) : (
          <div style={S.emptyState}>
            <div style={{ fontSize: 14 }}>No archived entries yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Past days will appear here automatically</div>
          </div>
        )
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
