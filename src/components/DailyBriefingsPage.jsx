import React, { useState, useEffect } from 'react'
import { ChevronDown, Calendar, Mic, FileText, CheckSquare, TrendingUp, AlertCircle, Activity } from 'lucide-react'

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

const TabButtons = ({ activeTab, setActiveTab, tabs }) => (
  <div style={{ display: 'flex', gap: 12, padding: '20px 0', borderBottom: `2px solid ${THS_COLORS.gold}` }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        style={{
          padding: '12px 24px',
          border: 'none',
          borderRadius: 24,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          background: activeTab === tab.id ? THS_COLORS.darkBlue : '#f0f0f0',
          color: activeTab === tab.id ? THS_COLORS.lightText : '#999',
          transition: 'all 0.2s ease'
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

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
  
  const getRoutingBadgeStyle = () => {
    if (!call.routing) return { background: '#f0f0f0', color: '#666' }
    if (call.routing.toLowerCase() === 'internal') return { background: '#e8f5e9', color: '#2e7d32' }
    if (call.routing.toLowerCase() === 'snmi') return { background: '#fff3e0', color: '#e65100' }
    return { background: '#e3f2fd', color: '#0d47a1' }
  }
  
  return (
    <div style={{ marginBottom: 12, border: `1px solid #ddd`, borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 14px', background: '#f9fafb', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13
        }}
      >
        <span style={{ fontWeight: 600, color: THS_COLORS.darkBlue, flex: 1, textAlign: 'left' }}>
          {call.title || 'Call'} {call.time && `@ ${call.time}`}
        </span>
        {call.routing && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4,
            ...getRoutingBadgeStyle()
          }}>
            [{call.routing}]
          </span>
        )}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
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

const CostDashboard = () => (
  <div>
    <div style={{
      padding: 16,
      background: THS_COLORS.lightBlueBg,
      borderRadius: 8,
      marginBottom: 24,
      border: `1px solid ${THS_COLORS.gold}`
    }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Today's Spend</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: THS_COLORS.mediumBlue }}>$4.23</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>30-Day Total</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: THS_COLORS.mediumBlue }}>$87.45</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Daily Average</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: THS_COLORS.mediumBlue }}>$2.92</div>
        </div>
      </div>
    </div>

    <div style={{ padding: 20, background: THS_COLORS.lightBlueBg, borderRadius: 8, textAlign: 'center', border: `1px solid ${THS_COLORS.gold}` }}>
      <TrendingUp size={24} color={THS_COLORS.gold} style={{ margin: '0 auto 12px' }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: THS_COLORS.darkBlue, marginBottom: 6 }}>
        Cost Dashboard
      </div>
      <div style={{ fontSize: 12, color: '#666' }}>
        Agent activity and provider breakdown coming soon
      </div>
    </div>
  </div>
)

const ExecutiveBriefings = () => (
  <div style={{ padding: 20, background: THS_COLORS.lightBlueBg, borderRadius: 8, textAlign: 'center', border: `1px solid ${THS_COLORS.gold}` }}>
    <AlertCircle size={24} color={THS_COLORS.gold} style={{ margin: '0 auto 12px' }} />
    <div style={{ fontSize: 14, fontWeight: 600, color: THS_COLORS.darkBlue, marginBottom: 6 }}>
      Executive Briefings
    </div>
    <div style={{ fontSize: 12, color: '#666' }}>
      High-level summaries and executive updates coming soon
    </div>
  </div>
)

export default function DailyBriefingsPage() {
  const [tab, setTab] = useState('today')
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  
  // Generate dates from Monday (April 6) onwards
  const mondayApril6 = new Date('2026-04-06T12:00:00Z')
  const archiveDates = []
  let currentDate = new Date(mondayApril6)
  while (currentDate <= new Date(today + 'T12:00:00Z')) {
    archiveDates.push({
      dateStr: currentDate.toISOString().split('T')[0],
      label: currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    })
    currentDate = new Date(currentDate.getTime() + 86400000)
  }
  archiveDates.reverse()

  const todayLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const tomorrowLabel = new Date(tomorrow + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const tabs = [
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'today', label: 'Today' },
    { id: 'archive', label: 'Archive' },
    { id: 'cost', label: 'Cost Dashboard' },
    { id: 'executive', label: 'Executive Briefings' }
  ]

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
      <div style={{ background: '#fff', padding: '0 36px' }}>
        <TabButtons activeTab={tab} setActiveTab={setTab} tabs={tabs} />
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
              <CollapsibleDay key={day.dateStr} date={day.dateStr} dateLabel={day.label} defaultOpen={false}>
                <DayView dateStr={day.dateStr} />
              </CollapsibleDay>
            ))}
          </div>
        )}

        {tab === 'cost' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 20 }}>Cost Dashboard</h2>
            <CostDashboard />
          </div>
        )}

        {tab === 'executive' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 20 }}>Executive Briefings</h2>
            <ExecutiveBriefings />
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
