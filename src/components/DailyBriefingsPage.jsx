import React, { useState, useEffect } from 'react'
import { ChevronDown, Calendar, Mic, FileText, CheckSquare } from 'lucide-react'

const SUPA_URL = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

const CollapsibleSection = ({ title, icon: Icon, badge, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 16, border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 16px', background: '#F9FAFB', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700
        }}
      >
        <Icon size={14} color="#0066CC" />
        <span>{title}</span>
        {badge && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#666' }}>{badge}</span>}
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
      </button>
      {open && <div style={{ padding: 16, fontSize: 13, lineHeight: 1.8, color: '#1A1A1A', whiteSpace: 'pre-wrap' }}>
        {children}
      </div>}
    </div>
  )
}

const CallCard = ({ call }) => (
  <div style={{ padding: 12, background: '#f9fafb', borderRadius: 6, marginBottom: 12, borderLeft: '3px solid #0066CC' }}>
    <div style={{ fontSize: 13, fontWeight: 600, color: '#002C77', marginBottom: 6 }}>
      {call.title || 'Untitled Call'} {call.time && `@ ${call.time}`}
    </div>
    {call.routing && <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
      [{call.routing}]
    </div>}
    {call.prose && <div style={{ fontSize: 12, color: '#333', marginBottom: 8 }}>
      {call.prose}
    </div>}
    {call.bullets && call.bullets.length > 0 && (
      <ul style={{ margin: '8px 0', paddingLeft: 20, fontSize: 11 }}>
        {call.bullets.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
      </ul>
    )}
  </div>
)

const DayView = ({ dateStr, label }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hdrs = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    
    Promise.all([
      fetch(`${SUPA_URL}/rest/v1/briefings?date=eq.${dateStr}&type=eq.morning_briefing`, { headers: hdrs }).then(r => r.json()),
      fetch(`${SUPA_URL}/rest/v1/briefings?date=eq.${dateStr}&type=eq.call_note&order=created_at.asc`, { headers: hdrs }).then(r => r.json()),
      fetch(`${SUPA_URL}/rest/v1/briefings?date=eq.${dateStr}&type=eq.daily_summary`, { headers: hdrs }).then(r => r.json()),
    ]).then(([briefing, calls, summary]) => {
      const processedCalls = (calls || []).map(row => {
        try {
          return JSON.parse(row.briefing_text)
        } catch (e) {
          return { title: 'Call', routing: 'unknown' }
        }
      })
      
      setData({
        briefing: briefing && briefing.length ? briefing[0].briefing_text : null,
        calls: processedCalls,
        summary: summary && summary.length ? summary[0].briefing_text : null,
      })
      setLoading(false)
    }).catch(err => {
      console.error('Fetch error:', err)
      setLoading(false)
    })
  }, [dateStr])

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading...</div>
  if (!data) return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Error loading data</div>
  if (!data.briefing && !data.calls.length && !data.summary) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No data for this day</div>
  }

  return (
    <div>
      {data.briefing && (
        <CollapsibleSection title="Daily Briefing" icon={FileText} defaultOpen={true}>
          {data.briefing}
        </CollapsibleSection>
      )}
      {data.calls.length > 0 && (
        <CollapsibleSection title="Call Notes" icon={Mic} badge={`${data.calls.length} calls`} defaultOpen={true}>
          {data.calls.map((call, i) => <CallCard key={i} call={call} />)}
        </CollapsibleSection>
      )}
      {data.summary && (
        <CollapsibleSection title="Daily Summary" icon={CheckSquare} defaultOpen={true}>
          {data.summary}
        </CollapsibleSection>
      )}
    </div>
  )
}

export default function DailyBriefingsPage() {
  const [tab, setTab] = useState('today')
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const todayLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const yesterdayLabel = new Date(yesterday + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #E5E7EB' }}>
          <button
            onClick={() => setTab('today')}
            style={{
              padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: tab === 'today' ? '#0066CC' : '#666',
              borderBottom: tab === 'today' ? '2px solid #0066CC' : 'none'
            }}
          >
            Today
          </button>
          <button
            onClick={() => setTab('archive')}
            style={{
              padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: tab === 'archive' ? '#0066CC' : '#666',
              borderBottom: tab === 'archive' ? '2px solid #0066CC' : 'none'
            }}
          >
            Yesterday
          </button>
        </div>

        {tab === 'today' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#002C77', marginBottom: 16 }}>{todayLabel}</h2>
            <DayView dateStr={today} label={todayLabel} />
          </div>
        )}

        {tab === 'archive' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#002C77', marginBottom: 16 }}>{yesterdayLabel}</h2>
            <DayView dateStr={yesterday} label={yesterdayLabel} />
          </div>
        )}
      </div>
    </div>
  )
}
