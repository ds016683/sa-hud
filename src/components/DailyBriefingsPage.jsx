import React, { useState, useEffect } from 'react'
import { ChevronDown, Calendar, Mic, FileText, CheckSquare, Copy, Check } from 'lucide-react'

const SUPA_URL = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

const TH = {
  darkBlue: '#1A3A5C',
  mediumBlue: '#234D8B',
  gold: '#F8C762',
  lightBlueBg: '#E8F0F8',
  lightGoldBg: '#FDF5E6',
  gray: '#6F7072',
  white: '#fff',
}

// Local date string YYYY-MM-DD without UTC shift
const localDateStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const fmtLabel = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

const TabButtons = ({ activeTab, setActiveTab, tabs }) => (
  <div style={{ display: 'flex', gap: 12, padding: '20px 0', borderBottom: `2px solid ${TH.gold}` }}>
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
          background: activeTab === tab.id ? TH.darkBlue : '#f0f0f0',
          color: activeTab === tab.id ? TH.white : '#999',
          transition: 'all 0.2s ease',
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

const CollapsibleDay = ({ dateLabel, children }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 20, border: `1px solid ${TH.gold}`, borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '16px 20px', background: TH.darkBlue,
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 12, color: TH.white, fontWeight: 700, fontSize: 15,
        }}
      >
        <Calendar size={18} color={TH.gold} />
        <span>{dateLabel}</span>
        <ChevronDown size={16} style={{ marginLeft: 'auto', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', color: TH.gold }} />
      </button>
      {open && <div style={{ padding: 20, background: TH.white }}>{children}</div>}
    </div>
  )
}

const CollapsibleSection = ({ title, icon: Icon, badge, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 16, border: `1px solid ${TH.gold}`, borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 16px', background: TH.lightBlueBg,
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 10, fontSize: 13, fontWeight: 700, color: TH.darkBlue,
        }}
      >
        <Icon size={14} color={TH.mediumBlue} />
        <span>{title}</span>
        {badge != null && (
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 600,
            background: TH.mediumBlue, color: TH.white,
            padding: '2px 8px', borderRadius: 10,
          }}>{badge}</span>
        )}
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', color: TH.mediumBlue }} />
      </button>
      {open && (
        <div style={{ padding: 14, fontSize: 13, lineHeight: 1.8, color: '#333', whiteSpace: 'pre-wrap', background: TH.white }}>
          {children}
        </div>
      )}
    </div>
  )
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const handle = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handle} title="Copy path" style={{
      background: 'none', border: `1px solid ${TH.gold}`, borderRadius: 4,
      padding: '2px 8px', cursor: 'pointer', color: TH.mediumBlue,
      fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
      fontWeight: 600,
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

const CallCard = ({ call }) => {
  const [open, setOpen] = useState(false)

  const routingStyle = () => {
    if (!call.routing) return { background: '#f0f0f0', color: TH.gray }
    const r = call.routing.toLowerCase()
    if (r === 'internal') return { background: '#e8f5e9', color: '#2e7d32' }
    if (r === 'snmi') return { background: TH.lightGoldBg, color: '#b45309' }
    return { background: TH.lightBlueBg, color: TH.mediumBlue }
  }

  return (
    <div style={{ marginBottom: 12, border: `1px solid ${TH.gold}`, borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 14px', background: '#fafbfc', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
        }}
      >
        <Mic size={13} color={TH.mediumBlue} />
        <span style={{ fontWeight: 600, color: TH.darkBlue, flex: 1, textAlign: 'left' }}>
          {call.title || 'Call'}{call.time ? ` — ${call.time}` : ''}
        </span>
        {call.routing && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, ...routingStyle() }}>
            {call.routing}
          </span>
        )}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', color: TH.gray }} />
      </button>
      {open && (
        <div style={{ padding: 14, fontSize: 12, lineHeight: 1.8, color: '#333', background: TH.white }}>
          {call.dropboxPath && (
            <div style={{
              marginBottom: 12, padding: '8px 10px', background: TH.lightGoldBg,
              borderRadius: 4, border: `1px solid ${TH.gold}`,
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 11, color: TH.gray, fontWeight: 700 }}>Dropbox</span>
              <code style={{ fontSize: 11, color: TH.darkBlue, flex: 1, wordBreak: 'break-all' }}>{call.dropboxPath}</code>
              <CopyButton text={call.dropboxPath} />
            </div>
          )}
          {call.prose && <div style={{ marginBottom: 12 }}>{call.prose}</div>}
          {call.bullets?.length > 0 && (
            <ul style={{ margin: '0 0 0 16px', paddingLeft: 0 }}>
              {call.bullets.map((b, i) => <li key={i} style={{ marginBottom: 5 }}>{b}</li>)}
            </ul>
          )}
          {call.actions?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${TH.gold}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TH.darkBlue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Action Items
              </div>
              <ul style={{ margin: '0 0 0 16px', paddingLeft: 0 }}>
                {call.actions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const EmptyState = ({ message, sub }) => (
  <div style={{
    textAlign: 'center', padding: '48px 24px',
    color: TH.gray, background: TH.lightBlueBg,
    borderRadius: 8, border: `1px dashed ${TH.gold}`,
  }}>
    <div style={{ fontSize: 14, fontWeight: 600, color: TH.darkBlue, marginBottom: 8 }}>{message}</div>
    {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
  </div>
)

const DayView = ({ dateStr, emptyMessage, emptySub }) => {
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
        try { return JSON.parse(row.briefing_text) }
        catch { return { title: 'Call', routing: 'unknown' } }
      })
      setData({
        briefing: briefing?.length ? briefing[0].briefing_text : null,
        calls: processedCalls,
        summary: summary?.length ? summary[0].briefing_text : null,
      })
      setLoading(false)
    }).catch(err => {
      console.error('Fetch error:', err)
      setLoading(false)
    })
  }, [dateStr])

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: TH.gray }}>Loading...</div>
  if (!data) return <div style={{ padding: 20, textAlign: 'center', color: '#c00' }}>Error loading data.</div>
  if (!data.briefing && !data.calls.length && !data.summary) {
    return <EmptyState message={emptyMessage || 'No data for this day.'} sub={emptySub} />
  }

  return (
    <div>
      {data.briefing && (
        <CollapsibleSection title="Daily Briefing" icon={FileText} defaultOpen={true}>
          {data.briefing}
        </CollapsibleSection>
      )}
      {data.calls.length > 0 && (
        <CollapsibleSection title="Call Notes" icon={Mic} badge={data.calls.length} defaultOpen={true}>
          {data.calls.map((call, i) => <CallCard key={i} call={call} />)}
        </CollapsibleSection>
      )}
      {data.summary && (
        <CollapsibleSection title="Day in Review" icon={CheckSquare} defaultOpen={true}>
          {data.summary}
        </CollapsibleSection>
      )}
    </div>
  )
}

export default function DailyBriefingsPage() {
  const [tab, setTab] = useState('today')

  const now = new Date()
  const today = localDateStr(now)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = localDateStr(tomorrowDate)

  // Archive: yesterday back through 30 days ago
  const archiveDates = []
  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    archiveDates.push({ dateStr: localDateStr(d), label: fmtLabel(localDateStr(d)) })
  }

  const tabs = [
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'today', label: 'Today' },
    { id: 'archive', label: 'Archive' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: TH.darkBlue, color: TH.white, padding: '32px 36px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10, color: '#8fb0d0' }}>
          Prepared by Lumen | Confidential
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Daily Intelligence</div>
        <div style={{ fontSize: 16, color: '#a8c0e0' }}>Third Horizon</div>
      </div>

      {/* Tabs */}
      <div style={{ background: TH.white, padding: '0 36px' }}>
        <TabButtons activeTab={tab} setActiveTab={setTab} tabs={tabs} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'today' && (
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: TH.gray, marginBottom: 4 }}>Today</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: TH.darkBlue, marginBottom: 20 }}>{fmtLabel(today)}</h2>
            <DayView
              dateStr={today}
              emptyMessage="No briefing data for today yet."
              emptySub="Check back after tonight's 8:30 PM cron."
            />
          </div>
        )}

        {tab === 'tomorrow' && (
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: TH.gray, marginBottom: 4 }}>Tomorrow</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: TH.darkBlue, marginBottom: 20 }}>{fmtLabel(tomorrow)}</h2>
            <DayView
              dateStr={tomorrow}
              emptyMessage="Tomorrow's briefing hasn't posted yet."
              emptySub="Lumen writes it tonight at 8:30 PM."
            />
          </div>
        )}

        {tab === 'archive' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: TH.darkBlue, marginBottom: 20 }}>Archive</h2>
            {archiveDates.map(day => (
              <CollapsibleDay key={day.dateStr} dateLabel={day.label}>
                <DayView dateStr={day.dateStr} emptyMessage="No data recorded for this day." />
              </CollapsibleDay>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: TH.darkBlue, color: '#6888aa', padding: '20px 36px', textAlign: 'center', fontSize: 11, marginTop: 40 }}>
        Lumen | Third Horizon Intelligence System
      </div>
    </div>
  )
}
