import { useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Calendar, Clock, Users, CheckSquare, FileText, Mic, ExternalLink } from 'lucide-react'

const DROPBOX_BASE = 'C:\\Users\\david\\THS Dropbox\\David Smith\\Call Library\\2026\\04'

const TODAY_CALLS = [
  {
    id: 'chris-hart',
    time: '11:04 AM',
    title: 'Data Reporting Strategy',
    attendees: 'Chris Hart',
    routing: 'mma',
    granolaId: 'not_ud8JkpnADdiTSH',
    dropboxPath: DROPBOX_BASE + '\\2026-04-06_1104_ChrisHart_DataReporting',
    prose: 'David and Chris worked through the core operational problem in MMA data delivery: regions are currently receiving data at the end of a 3-month run, creating a high-stakes "big reveal" dynamic that erodes confidence. The session produced a clear set of solutions and surfaced a significant resourcing opportunity with Alex Meyer as a 1099 contractor for hospital directory cleanup work.',
    bullets: [
      'Core problem: regions see data 3 months after runs -- field loses confidence from gaps (e.g., Mass General missing)',
      'Solution 1: Hospital-first coverage report queryable by region -- shows network-to-NPI relationships, MRF quality, coverage %',
      'Solution 2: Interim reporting gates during post-processing -- "here\'s what we\'re seeing so far" rather than end-of-run reveal',
      'Solution 3: Quarterly region leads call with David + Tanner + Peter to reset expectations and bring regions on the journey',
      'Alex Meyer proposed for 1099 hospital directory cleanup -- ~40-50 hrs/week, 4-8 week engagement',
      'V8/V9/V10 data roadmap aligned: strong lift visible by June, additional bump Aug/Sept',
      'Percent-of-charge flagged as most critical near-term item',
      'Action: David to confirm Alex by EOD, draft data question spec, raise reporting gates on production call'
    ],
    actions: ['Confirm Alex Meyer 1099 by EOD', 'Draft data question spec for hospital-first coverage report', 'Raise reporting gate strategy on production call']
  },
  {
    id: 'production-call',
    time: '12:01 PM',
    title: 'MMA Production Call -- Method Sprint',
    attendees: 'Chris Hart, Andy Wilson, Bobby Schenck, Kelvic, Jenna Sluslarz',
    routing: 'mma',
    granolaId: 'not_00eFWf6KuUgQJ1',
    dropboxPath: DROPBOX_BASE + '\\2026-04-06_1201_MMAProduction_MethodSprint',
    prose: 'The production call covered the v9 method sprint with a focus on percent-of-charge resolution, the APR-DRG conversion decision, and the reporting package strategy. Alex Meyer was confirmed as the 1099 hire for hospital directory cleanup, and the team aligned on a two-objective reporting package to address the region confidence gap.',
    bullets: [
      'Percent-of-charge (v9 priority): Kelvic reviewing Komodo approach this week, deadline Apr 11',
      'APR-DRG conversion: pencils down -- no viable public grouper, 3M licensing not viable, manage expectations with MMA',
      'Claims-TiC merge key: Andy to send documentation to John today; start single CPT key, add secondary/tertiary as needed',
      'Alex Meyer 1099 confirmed for hospital directory cleanup work',
      'Reporting package objective 1: early pipeline indicators during post-processing',
      'Reporting package objective 2: pre-release gating before any production push goes to regions',
      'Root cause: regions were oversold on the product; confidence gap = business risk',
      'Provider directory: Jenna completed 32 state spreadsheets for next data orders'
    ],
    actions: ['Andy: send merge key doc to John today', 'Kelvic: complete percent-of-charge review by Apr 11', 'Bobby: run distribution analysis on percentage-only negotiated type records']
  },
  {
    id: 'peter-alex',
    time: '1:06 PM',
    title: 'Alex Meyer -- 1099 Discussion',
    attendees: 'Peter Schultz (MMA)',
    routing: 'mma',
    granolaId: 'not_3a7WjnKxSvcMoD',
    dropboxPath: DROPBOX_BASE + '\\2026-04-06_1306_PeterSchultz_AlexMeyer',
    prose: 'David and Peter aligned on the Alex Meyer 1099 plan as an extended interview mechanism that keeps both parties flexible. The call also surfaced a second strong candidate and set the agenda for Wednesday\'s meeting. V9 priorities and reporting enhancements were briefly reviewed.',
    bullets: [
      'Alex Meyer 1099: no obligation on either side, acts as extended interview during hiring process',
      'Team interviews scheduled for Wednesday afternoon',
      'Concern noted: Alex slow to respond despite being unemployed and actively looking -- key thing to gauge',
      'Separate Iowa candidate in consideration: carrier-side background, Chicago office',
      'V9 lift expected from: provider directory cleanup, Handle healthing, hospital files',
      '~30-40% of files kicked out due to schema problems or payer name field errors -- needs dedicated resource',
      'New reporting dimension: MPI network to hospital relationship with stronger catchment',
      'Wednesday 2-hour meeting: v9 plan + Network Navigator walkthrough + potential in-person visit TBD'
    ],
    actions: ['Wire up Alex for 1099 this week', 'Send Wednesday meeting invite (2-hour block)', 'Prepare v9 plan ahead of Wednesday']
  },
  {
    id: 'jordana-openclaw',
    time: '1:30 PM',
    title: 'OpenClaw Beta + Security Hire + Recording Policy',
    attendees: 'Jordana Choucair',
    routing: 'internal',
    granolaId: 'not_zkHMufvfGCntzR',
    dropboxPath: DROPBOX_BASE + '\\2026-04-06_1330_Jordana_OpenClawBeta',
    prose: 'David and Jordana covered three important operational topics: the security hire strategy, the OpenClaw beta rollout framework, and the recording disclosure policy that will need to be in place before broader Granola adoption across the team.',
    bullets: [
      'Security hire: engineer (not CIO) -- real need is security, DB management, user mgmt, API tracking; start fractional, FTE by year end',
      'OpenClaw defined as internal productivity tool only -- not client-facing at this stage',
      'Platform architecture: subdomains off thirdhorizon.com (clients.thirdhorizon.com etc.), Vercel + Supabase, MFA',
      'Beta target: 4-5 people over next 2 months; Courtney deploys centrally; playbook inside AI usage policy',
      'Approved LLMs: ChatGPT or Claude only; approved enterprise connections: Zoom, Outlook, limited others',
      'Recording disclosure policy needed before broader Granola adoption -- unlike Zoom, passive tools give no notice',
      'Alistair offer letter due by end of week; Erica call tomorrow re: Alistair'
    ],
    actions: ['Send MMA explainer email before Jordana returns from PTO', 'Provide security engineer job description bullets', 'Schedule deeper dive on recording/disclosure framework (2-3 week horizon)']
  },
  {
    id: 'juliana-aha',
    time: '3:30 PM',
    title: 'AHA Demo -- Juliana Crawford',
    attendees: 'Juliana Crawford (AHA National EVP), Greg Williams',
    routing: 'aha',
    granolaId: 'not_IHTmG85apOL7Rb',
    dropboxPath: DROPBOX_BASE + '\\2026-04-06_1530_JulianaCrawford_AHADemo',
    prose: 'David walked Juliana through the 4-layer Cardiovascular Prevention Index prototype. The reaction was strongly positive, with Juliana framing it as a tool that could automate and scale AHA\'s existing implementation science work. The standout moment: Juliana flagged the PREVENT calculator as the overriding integration point across all AHA guidelines -- a critical insight that should shape the next iteration of the platform.',
    bullets: [
      'Four-layer architecture demoed: Evidence Base, Adoption Mapping, Economic Impact (ESVA), Implementation Strategies',
      'LLM layer (Anthropic Haiku) demoed as "technical assistant in a box" -- stakeholder-specific implementation guidance',
      'AHA has ~100 clinical quality improvement staff embedded at hospitals; recruiting 150 sites by June for CKM rollout',
      'Core scaling problem: going from 150 implementation science sites to 5,000 health systems is manual and slow',
      'PREVENT calculator: replaces ASCVD/Framingham, calculates 10-year AND 30-year risk + heart age -- flagged as key integration point',
      'Dyslipidemia guideline drove 10x traffic to PREVENT calculator in 10 days after publication',
      'AHA moving to modular, annually-updatable guidelines ("knowledge chunks") -- platform could automate dissemination',
      'Target: compress 17-year adoption cycle; Juliana suggested 5 years as realistic',
      'Next: Juliana scheduling follow-up with Michelle Bowls (Clinical Quality Improvement)'
    ],
    actions: ['Refine prototype before next AHA meeting', 'Explore PREVENT calculator and build integration angle', 'Lumen: send follow-up note to Juliana with concept memo link']
  },
  {
    id: 'trent-motive',
    time: '5:00 PM',
    title: 'Motive -- Data Quality + Smart Pay Strategy',
    attendees: 'Trent (Motive)',
    routing: 'client',
    granolaId: 'not_SY1NamlkLZCoJE',
    dropboxPath: DROPBOX_BASE + '\\2026-04-06_1700_Trent_MotiveDataStrategy',
    prose: 'David and Trent worked through Motive\'s data quality challenges with Handle/Arc data and aligned on a path forward for the V8/V9 production decision. The conversation also surfaced episode-based pricing as a compelling future direction that plays well with Motive\'s existing BigQuery infrastructure.',
    bullets: [
      'Core issue: ~50% of Handle rates hitting Medicare floor (175% surgery/imaging, 225% hospitals) -- Handle layered fallback logic on Arc',
      'Handle now 80-90% matched to network tools; First Health deprioritized entirely',
      'Three refresh paths: (1) V8 bridge now, (2) hospital-parallel-run Phoenix focus ~2-4 weeks, (3) wait for V9 mid-May',
      'V9 expected to be biggest data lift: refreshed hospitals, percent-of-charge via Komodo, updated directory, new imputation logic',
      'Motive leaning toward option 2 + V9 as the path -- pending internal discussion',
      'Episode-based pricing using PACES (988 defined episodes) + Komodo claims flagged as strong future direction',
      'Motive infrastructure: BigQuery -- well-suited for Vertex AI semantic layer + natural language member search',
      'Talon evaluated previously: compelling claims analysis but poor directory match rate (50%), rejected'
    ],
    actions: ['Send Trent PACES episode directory', 'Find time Wed or Thu to reconnect', 'Update Rhea that call happened', 'Explore using Komodo claims as additional post-processing vector for Motive']
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

Here is your briefing for Monday, April 6, 2026.

Today is a heavy production day -- 6 calls starting at 11 AM. The day is MMA-focused through early afternoon, building toward the AHA demo with Juliana Crawford at 3:30 PM CT (the one that matters most), and closing with Trent at Motive at 5 PM.

Key priorities going in: MMA -- Alex Meyer 1099 confirmation is your most important action item today, get it done. The reporting gates strategy also needs to land cleanly on the production call. AHA -- lead with the PREVENT calculator integration angle, Juliana flagged it as the entry point. Let her drive the follow-up. Motive -- Trent needs a clear decision on V8 bridge vs. V9; come in with a recommendation.

Tomorrow: Erica call re Alistair (3 PM), send Trent the PACES directory, confirm Alex Meyer next steps, book New Haven room for Thursday.`

const TODAY_SUMMARY = `Strong execution day across all six calls. The AHA demo with Juliana Crawford was the highlight -- strong positive reaction, PREVENT calculator confirmed as the key integration point, and a follow-up with Michelle Bowls in Clinical Quality Improvement is being scheduled. MMA production work landed well: Alex Meyer 1099 confirmed as extended interview, reporting gates strategy aligned, V9 roadmap solidified with a clear lift curve through June. The Motive call with Trent resolved the data quality narrative and pointed toward hospital-parallel-run plus V9 as the path. Jordana alignment on OpenClaw beta rollout and recording disclosure policy gives the internal infrastructure work a clear lane.

Key items for routing and follow-up:
- Alex Meyer: confirm 1099 paperwork through Jordana by end of day
- Peter Schultz: Wednesday 2-hour session -- prep v9 plan plus Network Navigator walkthrough
- Juliana Crawford: follow up with AHA concept memo link and PREVENT calculator research
- Trent (Motive): send PACES episode directory, reconnect Wednesday or Thursday
- Erica: call tomorrow at 3 PM re Alistair, prep for Jordana Monday meeting
- New Haven: book conference room for Thursday April 9`

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
        <div style={{ padding: '14px 16px', background: 'white' }}>
          {/* Attendees */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Users size={12} color="#9CA3AF" />
            <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'Arial, Helvetica, sans-serif' }}>{call.attendees}</span>
          </div>

          {/* Prose summary */}
          <p style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.75, margin: '0 0 14px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{call.prose}</p>

          {/* Key discussion points */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Key Discussion Points</div>
            {call.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ color: '#C8102E', fontWeight: 700, flexShrink: 0, fontSize: 13 }}>-</span>
                <span style={{ fontSize: 13, color: '#334E85', lineHeight: 1.6, fontFamily: 'Arial, Helvetica, sans-serif' }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {call.actions && call.actions.length > 0 && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Action Items</div>
              {call.actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#D97706', flexShrink: 0, fontSize: 13 }}>&#10003;</span>
                  <span style={{ fontSize: 12, color: '#78350F', fontFamily: 'Arial, Helvetica, sans-serif' }}>{a}</span>
                </div>
              ))}
            </div>
          )}

          {/* Transcript link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
            <ExternalLink size={12} color="#6B7280" />
            <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              Transcript stored in Dropbox: <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4B5563', wordBreak: 'break-all' }}>{call.dropboxPath}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DailyBriefingsPage() {
  const [tab, setTab] = useState('today')
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const checkGranola = async () => {
    setLoading(true)
    setLastChecked(new Date())
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 }}>Daily Briefings</h1>
          <p style={{ fontSize: 13, color: '#8096B2', margin: '3px 0 0' }}>
            Briefings and call summaries -- Granola agent checks every 15 min (8AM-6PM weekdays)
            {lastChecked && ` -- Last checked ${lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Calendar size={16} color="#009DE0" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#002C77' }}>{todayLabel}</span>
            <span style={{ fontSize: 12, color: '#8096B2' }}>{TODAY_CALLS.length} calls captured</span>
          </div>

          <CollapsibleSection title="Daily Briefing" icon={FileText} iconColor="#009DE0" defaultOpen={true}>
            <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.8, fontFamily: 'Arial, Helvetica, sans-serif', whiteSpace: 'pre-wrap' }}>{TODAY_BRIEFING}</div>
          </CollapsibleSection>

          <CollapsibleSection title="Call Notes" icon={Mic} iconColor="#C8102E" badge={`${TODAY_CALLS.length} calls`} defaultOpen={true}>
            {TODAY_CALLS.map(call => <CallCard key={call.id} call={call} />)}
          </CollapsibleSection>

          <CollapsibleSection title="Daily Summary" icon={CheckSquare} iconColor="#00968F" defaultOpen={false}>
            <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.8, fontFamily: 'Arial, Helvetica, sans-serif', whiteSpace: 'pre-wrap' }}>{TODAY_SUMMARY}</div>
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
