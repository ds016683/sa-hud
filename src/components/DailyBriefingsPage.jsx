import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Calendar, Clock, Users, CheckSquare, FileText, Mic, ExternalLink } from 'lucide-react'

const SUPA_URL = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

function supaFetch(path) {
  return fetch(SUPA_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
  }).then(function(r) { return r.json() }).catch(function() { return [] })
}

const ROUTING_COLORS = {
  mma:      { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  aha:      { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  internal: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  client:   { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  snmi:     { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  general:  { bg: '#F5F5F5', text: '#6B7280', border: '#E5E7EB' },
}

function CollapsibleSection({ title, icon: Icon, iconColor, badge, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false)
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <button onClick={function() { setOpen(!open) }} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
        background: open ? '#F9FAFB' : 'white', border: 'none', cursor: 'pointer',
        borderBottom: open ? '1px solid #E5E7EB' : 'none', textAlign: 'left',
        fontFamily: 'Arial, Helvetica, sans-serif', transition: 'background 0.1s'
      }}>
        {Icon && <Icon size={16} color={iconColor || '#6B7280'} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 14, fontWeight: 700, color: '#002C77', flex: 1 }}>{title}</span>
        {badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 600 }}>{badge}</span>}
        {open ? <ChevronDown size={14} color="#9CA3AF" /> : <ChevronRight size={14} color="#9CA3AF" />}
      </button>
      {open && <div style={{ padding: '16px 18px', background: 'white' }}>{children}</div>}
    </div>
  )
}

function CallCard({ call }) {
  const [open, setOpen] = useState(false)
  var rc = ROUTING_COLORS[call.routing] || ROUTING_COLORS.general
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button onClick={function() { setOpen(!open) }} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
        background: open ? '#F9FAFB' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'Arial, Helvetica, sans-serif', borderBottom: open ? '1px solid #E5E7EB' : 'none'
      }}>
        <Clock size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#6B7280', flexShrink: 0, minWidth: 65 }}>{call.time || '--'}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#002C77', flex: 1 }}>{call.title || 'Untitled Call'}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: rc.bg, color: rc.text, border: '1px solid ' + rc.border, fontWeight: 600, flexShrink: 0, textTransform: 'uppercase' }}>{call.routing || 'general'}</span>
        {open ? <ChevronDown size={12} color="#9CA3AF" /> : <ChevronRight size={12} color="#9CA3AF" />}
      </button>
      {open && (
        <div style={{ padding: '14px 16px', background: 'white' }}>
          {call.attendees && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Users size={12} color="#9CA3AF" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>{call.attendees}</span>
            </div>
          )}
          {call.prose && <p style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.75, margin: '0 0 14px' }}>{call.prose}</p>}
          {call.bullets && call.bullets.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Key Discussion Points</div>
              {call.bullets.map(function(b, i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ color: '#C8102E', fontWeight: 700, flexShrink: 0, fontSize: 13, lineHeight: 1.6 }}>-</span>
                    <span style={{ fontSize: 13, color: '#334E85', lineHeight: 1.6 }}>{b}</span>
                  </div>
                )
              })}
            </div>
          )}
          {call.actions && call.actions.length > 0 && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Action Items</div>
              {call.actions.map(function(a, i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: '#D97706', flexShrink: 0, fontSize: 13 }}>{'>'}</span>
                    <span style={{ fontSize: 12, color: '#78350F' }}>{a}</span>
                  </div>
                )
              })}
            </div>
          )}
          {call.dropboxPath && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
              <ExternalLink size={12} color="#6B7280" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#6B7280' }}>
                Transcript: <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4B5563', wordBreak: 'break-all' }}>{call.dropboxPath}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DayView({ dateStr, dateLabel }) {
  const [briefing, setBriefing] = useState(null)
  const [calls, setCalls] = useState([])
  const [summary, setSummary] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(function() {
    var path1 = 'briefings?date=eq.' + dateStr + '&type=eq.morning_briefing&order=created_at.desc&limit=1'
    var path2 = 'briefings?date=eq.' + dateStr + '&type=eq.call_note&order=created_at.asc'
    var path3 = 'briefings?date=eq.' + dateStr + '&type=eq.daily_summary&order=created_at.desc&limit=1'
    Promise.all([supaFetch(path1), supaFetch(path2), supaFetch(path3)]).then(function(results) {
      var briefRows = results[0]
      var callRows = results[1]
      var summaryRows = results[2]
      if (briefRows && briefRows.length > 0) setBriefing(briefRows[0].briefing_text)
      if (callRows && callRows.length > 0) {
        var parsed = callRows.map(function(row) {
          try { return JSON.parse(row.briefing_text) } catch(e) { return { title: 'Call', routing: 'general' } }
        })
        setCalls(parsed)
      }
      if (summaryRows && summaryRows.length > 0) setSummary(summaryRows[0].briefing_text)
      setLoaded(true)
    })
  }, [dateStr])

  if (!loaded) {
    return <div style={{ padding: '32px 0', textAlign: 'center', color: '#8096B2', fontSize: 13 }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Calendar size={16} color="#009DE0" />
        <span style={{ fontSize: 16, fontWeight: 700, color: '#002C77' }}>{dateLabel}</span>
        {calls.length > 0 && <span style={{ fontSize: 12, color: '#8096B2' }}>{calls.length} call{calls.length !== 1 ? 's' : ''} captured</span>}
      </div>

      {briefing ? (
        <CollapsibleSection title="Daily Briefing" icon={FileText} iconColor="#009DE0" defaultOpen={true}>
          <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{briefing}</div>
        </CollapsibleSection>
      ) : (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '24px 18px', marginBottom: 12, textAlign: 'center', color: '#8096B2' }}>
          <FileText size={24} style={{ margin: '0 auto 8px', display: 'block', color: '#CBD8E8' }} />
          <div style={{ fontSize: 13 }}>No briefing available for this day</div>
        </div>
      )}

      {calls.length > 0 && (
        <CollapsibleSection title="Call Notes" icon={Mic} iconColor="#C8102E" badge={calls.length + ' calls'} defaultOpen={true}>
          {calls.map(function(call, i) { return <CallCard key={i} call={call} /> })}
        </CollapsibleSection>
      )}
    </div>
  )
}

function ArchiveView({ yesterday }) {
  var [archiveData, setArchiveData] = React.useState(null)
  var [archiveLoaded, setArchiveLoaded] = React.useState(false)

  React.useEffect(function() {
    var hdrs = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    var p1 = fetch(SUPA_URL + '/rest/v1/briefings?date=eq.' + yesterday + '&type=eq.morning_briefing&order=created_at.desc&limit=1', { headers: hdrs }).then(function(r) { return r.json() }).catch(function() { return [] })
    var p2 = fetch(SUPA_URL + '/rest/v1/briefings?date=eq.' + yesterday + '&type=eq.call_note&order=created_at.asc', { headers: hdrs }).then(function(r) { return r.json() }).catch(function() { return [] })
    var p3 = fetch(SUPA_URL + '/rest/v1/briefings?date=eq.' + yesterday + '&type=eq.daily_summary&order=created_at.desc&limit=1', { headers: hdrs }).then(function(r) { return r.json() }).catch(function() { return [] })
    Promise.all([p1, p2, p3]).then(function(results) {
      var briefing = (results[0] && results[0].length > 0) ? results[0][0].briefing_text : null
      var calls = (results[1] && results[1].length > 0) ? results[1].map(function(row) { try { return JSON.parse(row.briefing_text) } catch(e) { return { title: 'Call', routing: 'general' } } }) : []
      var summary = (results[2] && results[2].length > 0) ? results[2][0].briefing_text : null
      setArchiveData({ briefing, calls, summary })
      setArchiveLoaded(true)
    })
  }, [yesterday])

  var label = new Date(yesterday + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#002C77', marginBottom: 16 }}>Recent Days</h3>
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '14px 18px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={14} color="#009DE0" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#002C77' }}>{label}</span>
          {archiveData && archiveData.calls.length > 0 && <span style={{ fontSize: 12, color: '#8096B2' }}>{archiveData.calls.length} calls</span>}
        </div>
        <div style={{ padding: '16px 18px' }}>
          {!archiveLoaded && <div style={{ color: '#8096B2', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>Loading...</div>}
          {archiveLoaded && !archiveData.briefing && !archiveData.calls.length && !archiveData.summary && (
            <div style={{ color: '#8096B2', fontSize: 13, padding: '8px 0' }}>No data for this day.</div>
          )}
          {archiveLoaded && archiveData.briefing && (
            <CollapsibleSection title="Daily Briefing" icon={FileText} iconColor="#009DE0" defaultOpen={false}>
              <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{archiveData.briefing}</div>
            </CollapsibleSection>
          )}
          {archiveLoaded && archiveData.calls.length > 0 && (
            <CollapsibleSection title="Call Notes" icon={Mic} iconColor="#C8102E" badge={archiveData.calls.length + ' calls'} defaultOpen={false}>
              {archiveData.calls.map(function(call, i) { return <CallCard key={i} call={call} /> })}
            </CollapsibleSection>
          )}
          {archiveLoaded && archiveData.summary && (
            <CollapsibleSection title="Daily Summary" icon={CheckSquare} iconColor="#00968F" defaultOpen={true}>
              <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{archiveData.summary}</div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  )
}
export default function DailyBriefingsPage() {
  const [tab, setTab] = useState('today')
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  var now = new Date()
  var today = now.toISOString().slice(0, 10)
  var tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
  var yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)

  var todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  var tomorrowLabel = new Date(now.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  function checkGranola() {
    setLoading(true)
    setLastChecked(new Date())
    setTimeout(function() { setLoading(false) }, 1500)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 }}>Daily Briefings</h1>
          <p style={{ fontSize: 13, color: '#8096B2', margin: '3px 0 0' }}>
            {'Briefings and call summaries -- Granola agent checks every 15 min (8AM-6PM weekdays)'}
            {lastChecked ? ' -- Last checked ' + lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
          </p>
        </div>
        <button onClick={checkGranola} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#334E85', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Checking...' : 'Check Granola'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#F7F9FC', borderRadius: 10, padding: 4, border: '1px solid #E2E8F0', width: 'fit-content', marginBottom: 20 }}>
        {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['archive', 'Archive']].map(function(item) {
          return (
            <button key={item[0]} onClick={function() { setTab(item[0]) }} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === item[0] ? 700 : 500, background: tab === item[0] ? '#002C77' : 'transparent', color: tab === item[0] ? 'white' : '#8096B2', transition: 'all 0.15s' }}>{item[1]}</button>
          )
        })}
      </div>

      {tab === 'today' && <DayView dateStr={today} dateLabel={todayLabel} />}

      {tab === 'tomorrow' && <DayView dateStr={tomorrow} dateLabel={tomorrowLabel} />}

      {tab === 'archive' && (
        <ArchiveView yesterday={yesterday} />
      )}

      <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  )
}
