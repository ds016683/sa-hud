import { useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Calendar, Clock, Users, CheckSquare, FileText, Mic } from 'lucide-react'

// â”€â”€ Today's real call data from Granola â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TODAY_CALLS = [
  {
    id: 'chris-hart',
    time: '11:04 AM',
    title: 'Data Reporting Strategy',
    attendees: 'Chris Hart',
    routing: 'mma',
    summary: 'Core issue: MMA regions see data 3 months after runs â€” creates "big reveal" dynamic. Solutions aligned: hospital-first coverage report queryable by region, interim reporting gates during post-processing, quarterly region leads call to reset expectations. Alex Meyer proposed as 1099 for hospital directory cleanup. V8/V9/V10 data roadmap confirmed. Action: David to confirm Alex by EOD, draft data question spec, raise reporting gates on production call.'
  },
  {
    id: 'production-call',
    time: '12:01 PM',
    title: 'MMA Production Call â€” Method Sprint',
    attendees: 'Production team (Chris, Andy, Bobby, Kelvic, Jenna)',
    routing: 'mma',
    summary: 'Percent-of-charge (v9 priority): Kelvic reviewing Komodo approach, deadline Apr 11. APR-DRG conversion: pencils down â€” no viable public grouper. Claims-TiC merge key: Andy to send doc to John today. Alex Meyer 1099 confirmed. Reporting package: two goals â€” early pipeline indicators + pre-release gating. Region confidence gap is the core business risk.'
  },
  {
    id: 'peter-alex',
    time: '1:06 PM',
    title: 'Alex Meyer â€” 1099 Discussion',
    attendees: 'Peter Schultz (MMA)',
    routing: 'mma',
    summary: 'Alex Meyer 1099 confirmed as extended interview format. No obligation on either side. Team interviews Wednesday afternoon. Iowa candidate also in consideration. Wednesday 2-hour meeting planned: v9 plan + Network Navigator walkthrough. In-person visit TBD (wife surgery Apr 14).'
  },
  {
    id: 'jordana-openclaw',
    time: '1:30 PM',
    title: 'OpenClaw Beta + Security Hire + Recording Policy',
    attendees: 'Jordana Choucair',
    routing: 'internal',
    summary: 'Aligned on hiring security engineer (not CIO). OpenClaw defined as internal productivity tool only â€” not client-facing. Platform: subdomains off thirdhorizon.com, Vercel + Supabase, MFA. Beta: 4-5 people over next 2 months, deployed centrally by Courtney. Recording disclosure policy needed before broader Granola adoption. Alistair offer letter by end of week. Erica call tomorrow re: Alistair.'
  },
  {
    id: 'juliana-aha',
    time: '3:30 PM',
    title: 'AHA Demo â€” Juliana Crawford',
    attendees: 'Juliana Crawford (AHA National EVP), Greg Williams',
    routing: 'aha',
    summary: 'Walked Juliana through 4-layer prototype. Strong positive reaction â€” framed as automating AHA\'s existing implementation science work. Key insight: PREVENT calculator is the overriding entry point across all guidelines (replaces ASCVD/Framingham, calculates 10/30-year risk + heart age). AHA moving to modular annually-updatable guidelines. Target: compress 17-year cycle to 5 years. Next: refine prototype, explore PREVENT calculator integration. Juliana scheduling follow-up with Michelle Bowls (Clinical Quality Improvement).'
  },
  {
    id: 'trent-motive',
    time: '5:00 PM',
    title: 'Motive â€” Data Quality + Smart Pay Strategy',
    attendees: 'Trent (Motive)',
    routing: 'client',
    summary: '~50% of Handle rates hitting Medicare floor. Handle now 80-90% matched. First Health deprioritized. Three refresh paths: V8 bridge now, hospital-parallel-run (Phoenix priority ~2-4 weeks), or wait for V9 (mid-May, biggest lift). Motive leaning toward option 2 + V9. Episode-based pricing using PACES + Komodo claims flagged as future direction. BigQuery + Vertex AI well-suited. Action: David to send PACES directory, reconnect Wed/Thu.'
  }
]

const ROUTING_COLORS = {
  mma:      { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  aha:      { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  internal: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  client:   { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  general:  { bg: '#F5F5F5', text: '#6B7280', border: '#E5E7EB' },
}

const TODAY_BRIEFING = `Good morning David,

Here's your briefing for Monday, April 6, 2026.

Productivity: Exceptional day ahead. You have 6 calls starting at 11 AM â€” heavy MMA production focus through early afternoon, then the AHA demo with Juliana Crawford at 3:30 PM CT (the one that matters most today), then Trent at Motive at 5 PM.

Key context going in:
- MMA: Alex Meyer 1099 confirmation is the key action item â€” get this done today. Reporting gates strategy needs to land on the production call.
- AHA: Juliana's call is high-stakes. Lead with the PREVENT calculator integration angle â€” she flagged it in the pre-read. Let her drive the follow-up pathway.
- Motive: Trent needs a clear decision framework on V8 bridge vs. V9. Come in with a recommendation.

Tomorrow's focus: Erica call re: Alistair (3 PM), send Trent the PACES directory, confirm Alex Meyer next steps, book New Haven room for Thursday.`

const TODAY_SUMMARY = `Strong execution day. AHA demo with Juliana Crawford was the highlight â€” strong positive reaction, PREVENT calculator confirmed as the key integration point, follow-up with Michelle Bowls being scheduled. MMA production work aligned: Alex Meyer 1099 confirmed, reporting gates strategy landed, V9 roadmap solidified. Motive/Trent call resolved data quality concerns and pointed toward hospital-parallel-run + V9 path. Internal alignment with Jordana on OpenClaw beta and recording disclosure policy.

Key items for routing/review:
- Alex Meyer: confirm 1099 paperwork through Jordana by EOD
- Peter Schultz: Wednesday 2-hour session â€” prep v9 plan + Network Navigator walkthrough
- Juliana Crawford: Lumen to follow up with AHA concept memo + PREVENT calculator research
- Trent: send PACES episode directory; reconnect Wed or Thu
- Erica call tomorrow 3 PM re: Alistair â€” prep her for Jordana's Monday meeting
- Book New Haven conference room for Thursday April 9`

// â”€â”€ Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CollapsibleSection({ title, icon: Icon, iconColor, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <button onClick={() => setOpen(!open)} style={{
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
  const rc = ROUTING_COLORS[call.routing] || ROUTING_COLORS.general
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
        background: open ? '#F9FAFB' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'Arial, Helvetica, sans-serif', borderBottom: open ? '1px solid #E5E7EB' : 'none'
      }}>
        <Clock size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'Arial, Helvetica, sans-serif', flexShrink: 0, minWidth: 65 }}>{call.time}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#002C77', flex: 1, fontFamily: 'Arial, Helvetica, sans-serif' }}>{call.title}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, fontWeight: 600, flexShrink: 0, textTransform: 'uppercase' }}>{call.routing}</span>
        {open ? <ChevronDown size={12} color="#9CA3AF" /> : <ChevronRight size={12} color="#9CA3AF" />}
      </button>
      {open && (
        <div style={{ padding: '12px 14px', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Users size={12} color="#9CA3AF" />
            <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'Arial, Helvetica, sans-serif' }}>{call.attendees}</span>
          </div>
          <p style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.7, margin: 0, fontFamily: 'Arial, Helvetica, sans-serif' }}>{call.summary}</p>
        </div>
      )}
    </div>
  )
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function DailyBriefingsPage() {
  const [tab, setTab] = useState('today')
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const checkGranola = async () => {
    setLoading(true)
    setLastChecked(new Date())
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 }}>Daily Briefings</h1>
          <p style={{ fontSize: 13, color: '#8096B2', margin: '3px 0 0' }}>
            Briefings and call summaries â€” Granola agent checks every 15 min (8AMâ€“6PM weekdays)
            {lastChecked && ` Â· Last checked ${lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button onClick={checkGranola} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 8,
          fontSize: 13, color: '#334E85', cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif',
          opacity: loading ? 0.7 : 1
        }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Checking...' : 'Check Granola'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F7F9FC', borderRadius: 10, padding: 4, border: '1px solid #E2E8F0', width: 'fit-content', marginBottom: 20 }}>
        {[['today', 'Today'], ['archive', 'Archive']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: tab === id ? 700 : 500,
            background: tab === id ? '#002C77' : 'transparent', color: tab === id ? 'white' : '#8096B2',
            transition: 'all 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {tab === 'today' && (
        <div>
          {/* Date header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Calendar size={16} color="#009DE0" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#002C77' }}>{todayLabel}</span>
            <span style={{ fontSize: 12, color: '#8096B2' }}>{TODAY_CALLS.length} calls captured</span>
          </div>

          {/* 1. Daily Briefing */}
          <CollapsibleSection title="Daily Briefing" icon={FileText} iconColor="#009DE0" defaultOpen={true}>
            <pre style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {TODAY_BRIEFING}
            </pre>
          </CollapsibleSection>

          {/* 2. Call Notes */}
          <CollapsibleSection title="Call Notes" icon={Mic} iconColor="#C8102E" badge={`${TODAY_CALLS.length} calls`} defaultOpen={true}>
            {TODAY_CALLS.map(call => <CallCard key={call.id} call={call} />)}
          </CollapsibleSection>

          {/* 3. Daily Summary */}
          <CollapsibleSection title="Daily Summary" icon={CheckSquare} iconColor="#00968F" defaultOpen={false}>
            <pre style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {TODAY_SUMMARY}
            </pre>
          </CollapsibleSection>
        </div>
      )}

      {tab === 'archive' && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#8096B2' }}>
          <FileText size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#CBD8E8' }} />
          <div style={{ fontSize: 14, marginBottom: 4 }}>No archived entries yet</div>
          <div style={{ fontSize: 12 }}>Past days will appear here automatically</div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
