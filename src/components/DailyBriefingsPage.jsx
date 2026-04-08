import React, { useState, useEffect } from 'react'
import { ChevronDown, Calendar, Mic, FileText, CheckSquare } from 'lucide-react'

const SUPA_URL = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

const THS_COLORS = {
  darkBlue: '#1A3A5C',
  mediumBlue: '#234D8B',
  gold: '#F8C762',
  lightBlueBg: '#E8F0F8',
  lightGoldBg: '#FDF5E6',
  gray: '#6F7072',
  text: '#000',
  lightText: '#fff',
}

const CollapsibleDay = ({ date, dateLabel, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  
  return (
    <div style={{ marginBottom: 20, border: `1px solid ${THS_COLORS.gold}`, borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '16px 20px', background: THS_COLORS.darkBlue, 
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', 
          gap: 12, color: THS_COLORS.lightText, fontWeight: 700, fontSize: 15
        }}
      >
        <Calendar size={18} color={THS_COLORS.gold} />
        <span>{dateLabel}</span>
        <ChevronDown size={16} style={{ marginLeft: 'auto', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
      </button>
      {open && <div style={{ padding: 20, background: '#fff' }}>{children}</div>}
    </div>
  )
}

const CollapsibleSection = ({ title, icon: Icon, badge, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  
  return (
    <div style={{ marginBottom: 16, border: `1px solid ${THS_COLORS.gold}`, borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 16px', background: THS_COLORS.lightBlueBg,
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 10, fontSize: 13, fontWeight: 700, color: THS_COLORS.darkBlue
        }}
      >
        <Icon size={14} color={THS_COLORS.mediumBlue} />
        <span>{title}</span>
        {badge && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#666' }}>{badge}</span>}
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
      </button>
      {open && <div style={{ padding: 14, fontSize: 13, lineHeight: 1.8, color: '#333', whiteSpace: 'pre-wrap' }}>
        {children}
      </div>}
    </div>
  )
}

const CallCard = ({ call }) => {
  const [open, setOpen] = useState(false)
  
  return (
    <div style={{ marginBottom: 12, border: `1px solid #ddd`, borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 14px', background: '#f9fafb', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
        }}
      >
        <span style={{ fontWeight: 600, color: THS_COLORS.darkBlue }}>
          {call.title || 'Call'} {call.time && `@ ${call.time}`}
        </span>
        {call.routing && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#666' }}>
          [{call.routing}]
        </span>}
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
      </button>
      {open && (
        <div style={{ padding: 14, fontSize: 12, lineHeight: 1.8, color: '#333' }}>
          {call.prose && <div style={{ marginBottom: 12 }}>{call.prose}</div>}
          {call.bullets && call.bullets.length > 0 && (
            <ul style={{ margin: '0 0 0 20px', paddingLeft: 0 }}>
              {call.bullets.map((b, i) => <li key={i} style={{ marginBottom: 6 }}>{b}</li>)}
            </ul>
          )}
          {call.actions && call.actions.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #ddd', fontWeight: 600, color: THS_COLORS.gold }}>
              Actions:
              <ul style={{ margin: '6px 0 0 20px', paddingLeft: 0, fontWeight: 'normal', color: '#333' }}>
                {call.actions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DayView = ({ dateStr }) => {
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
          <div>
            {data.calls.map((call, i) => <CallCard key={i} call={call} />)}
          </div>
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
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  
  // Generate last 7 days for archive
  const archiveDates = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(Date.now() - (i * 86400000))
    archiveDates.push({
      dateStr: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    })
  }

  const todayLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const tomorrowLabel = new Date(tomorrow + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: THS_COLORS.darkBlue, color: THS_COLORS.lightText, padding: '32px 36px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10, color: '#8fb0d0' }}>
          Prepared by Lumen | Confidential
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Daily Briefing</div>
        <div style={{ fontSize: 16, color: '#a8c0e0' }}>Third Horizon Strategies</div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: `2px solid ${THS_COLORS.gold}`, padding: '0 36px', display: 'flex', gap: 0 }}>
        {['tomorrow', 'today', 'archive'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '14px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              color: tab === t ? THS_COLORS.darkBlue : '#999',
              borderBottom: tab === t ? `3px solid ${THS_COLORS.gold}` : 'none',
              background: 'transparent'
            }}
          >
            {t === 'tomorrow' ? 'Tomorrow' : t === 'today' ? 'Today' : 'Archive'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'today' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 20 }}>{todayLabel}</h2>
            <DayView dateStr={today} />
          </div>
        )}

        {tab === 'tomorrow' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 20 }}>{tomorrowLabel}</h2>
            <DayView dateStr={tomorrow} />
          </div>
        )}

        {tab === 'archive' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 20 }}>Archive - Last 7 Days</h2>
            {archiveDates.map(day => (
              <CollapsibleDay key={day.dateStr} date={day.dateStr} dateLabel={day.label} defaultOpen={day.dateStr === archiveDates[0].dateStr}>
                <DayView dateStr={day.dateStr} />
              </CollapsibleDay>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: THS_COLORS.darkBlue, color: '#888', padding: '20px 36px', textAlign: 'center', fontSize: 11, marginTop: 40 }}>
        Generated by Lumen - David Smith's AI Chief of Staff | Third Horizon Strategies
      </div>
    </div>
  )
}
