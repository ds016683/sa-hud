import { useState } from 'react'

// â”€â”€ DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CATEGORIES = [
  {
    id: 'communication', label: 'Communication', color: '#009DE0', angle: 0,
    nodes: [
      { id: 'signal',  label: 'Signal',          sub: 'Primary channel',     method: 'Signal API via OpenClaw gateway', created: '2026-03-22', purpose: 'Primary real-time messaging between David and Lumen. Allowlisted to David\'s number.' },
      { id: 'graph',   label: 'Graph API / O365', sub: 'Email + Calendar',    method: 'Azure AD App Registration, client_credentials OAuth', created: '2026-03-21', purpose: 'Read/send email from Lumen@thirdhorizon.com, read David\'s calendar, write calendar events.' },
      { id: 'slack',   label: 'Slack',            sub: 'Team comms',          method: 'xoxp token, read/search only', created: '2026-03-11', purpose: 'Read and search Slack messages for context and updates.' },
      { id: 'zoom',    label: 'Zoom API',         sub: 'Meetings (planned)',   method: 'Server-to-Server OAuth â€” not yet set up', created: 'Pending', purpose: 'Future: auto-join meetings, capture notes, log action items.' },
    ]
  },
  {
    id: 'data', label: 'Data & Intelligence', color: '#00968F', angle: 72,
    nodes: [
      { id: 'starset',  label: 'Starset Analytics', sub: '150B+ claims',      method: 'Direct DB access + MRF pipeline', created: '2026-03-01', purpose: 'Core data asset. Price transparency, claims data, provider intelligence. Powers Clarity and BH Rate Intel.' },
      { id: 'clarity',  label: 'Starset Clarity',   sub: 'Cost intelligence', method: 'Fly.io deployment, Python/Flask backend', created: '2026-03-15', purpose: 'Episode-based cost intelligence demo for health plan pitches.' },
      { id: 'bh-rate',  label: 'BH Rate Intel',     sub: 'Rate benchmarking', method: 'Vercel + Supabase', created: '2026-03-20', purpose: 'BH rate benchmarking demo. Delivered to AllHealth Network. Archived.' },
      { id: 'naic',     label: 'NAIC Data',          sub: 'Deep dive pending', method: 'CMS-embedded NAIC codes (free) â€” no API yet', created: 'Pending', purpose: 'Insurance carrier codes as linkage keys across datasets. Flagged for deep dive.' },
    ]
  },
  {
    id: 'platforms', label: 'Client Platforms', color: '#6D28D9', angle: 144,
    nodes: [
      { id: 'mma',   label: 'MMA Tracker',   sub: 'Project management', method: 'GitHub Pages + Supabase backend', created: '2026-03-25', purpose: 'Project tracking and reporting platform for Marsh McLennan Agency.' },
      { id: 'achp',  label: 'ACHP Intel',    sub: 'Policy AI',          method: 'Local Flask + ChromaDB RAG', created: '2026-03-10', purpose: 'Federal policy intelligence for ACHP. Needs Fly.io public deploy.' },
      { id: 'apex',  label: 'Apex Media',    sub: 'Studio booking',     method: 'GitHub Pages + Supabase', created: '2026-04-04', purpose: 'Private studio booking and screening app. Personal project â€” isolated from TH.' },
    ]
  },
  {
    id: 'infrastructure', label: 'Infrastructure', color: '#DC2626', angle: 216,
    nodes: [
      { id: 'github',    label: 'GitHub',       sub: 'ds016683',         method: 'Fine-grained PAT tokens', created: '2026-03-11', purpose: 'Source control for all TH platform code. Primary deployment mechanism via GitHub Pages.' },
      { id: 'supabase',  label: 'Supabase',     sub: 'SA HUD + MMA',     method: 'Anon key (client) + Service role key (server)', created: '2026-04-05', purpose: 'Backend database for SA HUD (dedicated project) and MMA Tracker. Postgres + RLS.' },
      { id: 'vercel',    label: 'Vercel',        sub: 'Frontend hosting', method: 'GitHub integration, auto-deploy', created: '2026-03-01', purpose: 'Hosts BH Rate Intelligence. Target for TH platform consolidation.' },
      { id: 'flyio',     label: 'Fly.io',        sub: 'Backend apps',     method: 'flyctl CLI deployment', created: '2026-03-15', purpose: 'Hosts Starset Clarity and preview instances. ACHP Intel pending deploy.' },
      { id: 'tailscale', label: 'Tailscale',     sub: 'Secure network',   method: 'Mesh VPN, david.e.smith8@ account', created: '2026-03-11', purpose: 'Secure tunnel between DavidPC (Chicago office), Mac M5, and other nodes.' },
    ]
  },
  {
    id: 'integrations', label: 'Integrations', color: '#FF8C00', angle: 288,
    nodes: [
      { id: 'harvest',   label: 'Harvest',       sub: 'Time & expenses',  method: 'Bearer token, read/write', created: '2026-03-11', purpose: 'Time tracking and expense logging. Lumen can read and write entries.' },
      { id: 'anthropic', label: 'Anthropic API',  sub: 'Claude models',    method: 'API key (sk-ant-...)', created: '2026-03-11', purpose: 'Powers all Lumen AI operations. Claude Sonnet 4 for main session, Haiku for lightweight tasks.' },
      { id: 'openai',    label: 'OpenAI',         sub: 'Whisper + GPT',    method: 'API key (sk-...)', created: '2026-03-11', purpose: 'Whisper for voice memo transcription. GPT as fallback.' },
      { id: 'vapi',      label: 'Vapi Voice',     sub: 'Voice interface',  method: 'Vapi API + Lumen API backend (pending Render deploy)', created: '2026-03-25', purpose: 'Give Lumen a phone number and voice. Number: +16308691113. Backend built, blocked on deploy.' },
      { id: 'granola',   label: 'Granola',        sub: 'Meeting notes',    method: 'Watch export folder â€” not yet configured', created: 'Pending', purpose: 'Capture meeting notes and auto-log to Lumen context.' },
    ]
  },
]

const AGENTS = [
  { id: 'lumen', label: 'Lumen', role: 'AI Chief of Staff', type: 'ceo', status: 'active', description: 'Primary AI Operations agent for David Smith at Third Horizon. Main session via Signal.' },
  { id: 'hourly-email', label: 'Hourly Email Check', role: 'Inbox Monitor', type: 'cron', status: 'active', parent: 'lumen', schedule: 'Every 60 min', description: 'Checks Lumen@thirdhorizon.com inbox hourly. Prioritizes Tanner/MMA emails. Reports back without acting unilaterally.' },
  { id: 'daily-briefing', label: 'Daily Briefing', role: 'Briefing Agent', type: 'cron', status: 'active', parent: 'lumen', schedule: 'Nightly 8:30 PM CT', description: 'Generates and sends a daily briefing email from Lumen. Reads HARDLINES.md before acting.' },
  { id: 'vapi-voice', label: 'Vapi Voice', role: 'Voice Interface', type: 'integration', status: 'pending', parent: 'lumen', description: 'Phone-based voice access to Lumen. Number: +16308691113. Pending Render deploy.' },
]

const DEPLOYED_SITES = [
  { id: 'sa-hud',      name: 'Sovereign Architect HUD',      url: 'https://ds016683.github.io/sa-hud/',                  stack: 'React + Vite + Supabase', status: 'live',    category: 'Personal',  updated: '2026-04-05' },
  { id: 'mma',         name: 'MMA Tracker',                   url: 'https://ds016683.github.io/mma-tracker/',             stack: 'React + Vite + Supabase', status: 'live',    category: 'Client',    updated: '2026-04-02' },
  { id: 'clarity',     name: 'Starset Clarity',               url: 'https://starset-clarity.fly.dev',                     stack: 'Python/Flask + Fly.io',   status: 'live',    category: 'TH',        updated: '2026-03-20' },
  { id: 'clarity-pre', name: 'Starset Clarity (Preview)',     url: 'https://starset-clarity-preview.fly.dev',             stack: 'Python/Flask + Fly.io',   status: 'preview', category: 'TH',        updated: '2026-03-28' },
  { id: 'bh-rate',     name: 'BH Rate Intelligence',          url: 'https://bh-rate-intelligence.vercel.app',             stack: 'React + Vercel',          status: 'archived',category: 'TH',        updated: '2026-03-20' },
  { id: 'apex',        name: 'Apex Media Chicago',            url: 'https://ds016683.github.io/apex-media-chicago/',      stack: 'React + GitHub Pages',    status: 'live',    category: 'Personal',  updated: '2026-04-04' },
  { id: 'values',      name: 'Values Deck (Sabina)',          url: 'https://ds016683.github.io/values-deck/',             stack: 'HTML + GitHub Pages',     status: 'live',    category: 'Personal',  updated: '2026-04-03' },
  { id: 'dante',       name: 'Project Dante Workspace',       url: 'https://ds016683.github.io/project-dante/',          stack: 'HTML + GitHub Pages',     status: 'live',    category: 'Personal',  updated: '2026-04-03' },
]

// â”€â”€ ECOSYSTEM MAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CX = 500, CY = 380, CAT_R = 185, NODE_R = 285

function toRad(deg) { return (deg * Math.PI) / 180 }

function catPos(angle) {
  return { x: CX + CAT_R * Math.cos(toRad(angle - 90)), y: CY + CAT_R * Math.sin(toRad(angle - 90)) }
}

function nodePos(angle, idx, total) {
  const spread = Math.min(38, 22 * (total - 1) / 2)
  const startAngle = angle - spread
  const step = total > 1 ? (spread * 2) / (total - 1) : 0
  const a = startAngle + step * idx
  return { x: CX + NODE_R * Math.cos(toRad(a - 90)), y: CY + NODE_R * Math.sin(toRad(a - 90)) }
}

function EcosystemMap({ onSelectNode }) {
  const [active, setActive] = useState(null)

  const handleCat = (id) => setActive(prev => prev === id ? null : id)

  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 }}>
      <svg viewBox="0 0 1000 760" width="100%" style={{ display: 'block' }}>
        {CATEGORIES.map(cat => {
          const cp = catPos(cat.angle)
          const isActive = active === cat.id
          const isDimmed = active && !isActive
          return <line key={`s-${cat.id}`} x1={CX} y1={CY} x2={cp.x} y2={cp.y} stroke={cat.color} strokeWidth={isActive ? 2 : 1.5} strokeOpacity={isDimmed ? 0.1 : isActive ? 0.8 : 0.35} strokeDasharray={isActive ? "none" : "6,4"} />
        })}

        {CATEGORIES.map(cat => {
          if (active !== cat.id) return null
          const cp = catPos(cat.angle)
          return cat.nodes.map((node, i) => {
            const np = nodePos(cat.angle, i, cat.nodes.length)
            return <line key={`l-${node.id}`} x1={cp.x} y1={cp.y} x2={np.x} y2={np.y} stroke={cat.color} strokeWidth={1.5} strokeOpacity={0.55} />
          })
        })}

        {CATEGORIES.map(cat => {
          if (active !== cat.id) return null
          return cat.nodes.map((node, i) => {
            const np = nodePos(cat.angle, i, cat.nodes.length)
            return (
              <g key={`n-${node.id}`} onClick={() => onSelectNode(node, cat)} style={{ cursor: 'pointer' }}>
                <circle cx={np.x} cy={np.y} r={38} fill="white" stroke={cat.color} strokeWidth={1.5} />
                <circle cx={np.x} cy={np.y} r={38} fill={cat.color} fillOpacity={0.06} />
                <text x={np.x} y={np.y - 5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#002C77" fontFamily="Arial, sans-serif">{node.label.length > 12 ? node.label.substring(0,11)+'â€¦' : node.label}</text>
                <text x={np.x} y={np.y + 9} textAnchor="middle" fontSize={8} fill="#8096B2" fontFamily="Arial, sans-serif">{node.sub.length > 14 ? node.sub.substring(0,13)+'â€¦' : node.sub}</text>
              </g>
            )
          })
        })}

        {CATEGORIES.map(cat => {
          const cp = catPos(cat.angle)
          const isActive = active === cat.id
          const isDimmed = active && !isActive
          const r = isActive ? 50 : 42
          return (
            <g key={`c-${cat.id}`} onClick={() => handleCat(cat.id)} style={{ cursor: 'pointer' }}>
              <circle cx={cp.x} cy={cp.y} r={r + 5} fill={cat.color} fillOpacity={isActive ? 0.1 : 0.05} opacity={isDimmed ? 0.25 : 1} />
              <circle cx={cp.x} cy={cp.y} r={r} fill={isActive ? cat.color : 'white'} stroke={cat.color} strokeWidth={isActive ? 0 : 2} opacity={isDimmed ? 0.25 : 1} />
              {cat.label.split(' ').map((word, wi, arr) => (
                <text key={wi} x={cp.x} y={cp.y + (wi - (arr.length - 1) / 2) * 13 - 5} textAnchor="middle"
                  fontSize={isActive ? 10 : 9.5} fontWeight={700}
                  fill={isActive ? 'white' : cat.color}
                  fontFamily="Arial, sans-serif" opacity={isDimmed ? 0.25 : 1}>{word}</text>
              ))}
              <text x={cp.x} y={cp.y + (cat.label.split(' ').length) * 6 + 8} textAnchor="middle" fontSize={8}
                fill={isActive ? 'rgba(255,255,255,0.75)' : '#8096B2'}
                fontFamily="Arial, sans-serif" opacity={isDimmed ? 0.25 : 1}>
                {cat.nodes.length} nodes
              </text>
            </g>
          )
        })}

        <circle cx={CX} cy={CY} r={62} fill="#002C77" />
        <circle cx={CX} cy={CY} r={56} fill="white" />
        <circle cx={CX} cy={CY} r={52} fill="#002C77" fillOpacity={0.07} />
        <text x={CX} y={CY - 7} textAnchor="middle" fontSize={17} fontWeight={800} fill="#002C77" fontFamily="Arial, sans-serif">LUMEN</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={8.5} fill="#8096B2" fontFamily="Arial, sans-serif">AI Operations</text>
        <text x={CX} y={CY + 23} textAnchor="middle" fontSize={8.5} fill="#009DE0" fontFamily="Arial, sans-serif">Third Horizon</text>
        <circle cx={CX} cy={CY} r={66} fill="none" stroke="#F59E0B" strokeWidth={2} strokeOpacity={0.5} strokeDasharray="8,5" />
      </svg>

      {active && (() => {
        const cat = CATEGORIES.find(c => c.id === active)
        return (
          <div style={{ borderTop: `2px solid ${cat.color}25`, padding: '12px 20px 16px', background: cat.color + '05' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{cat.label} â€” click a node for details</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cat.nodes.map(node => (
                <button key={node.id} onClick={() => onSelectNode(node, cat)}
                  style={{ background: 'white', border: `1px solid ${cat.color}40`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Arial, sans-serif', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = cat.color + '08' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = cat.color + '40'; e.currentTarget.style.background = 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#002C77' }}>{node.label}</div>
                  <div style={{ fontSize: 11, color: '#8096B2' }}>{node.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// â”€â”€ AGENTS ORG CHART â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AgentsTab() {
  const [selected, setSelected] = useState(null)
  const STATUS_COLOR = { active: '#00968F', pending: '#F59E0B', paused: '#8096B2' }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#8096B2', marginBottom: 20, marginTop: 0 }}>AI agent workforce deployed in OpenClaw. Lumen is the primary agent; cron jobs and integrations report in.</p>

      {/* Lumen CEO card */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div onClick={() => setSelected(AGENTS[0])} style={{ display: 'inline-block', background: '#002C77', color: 'white', borderRadius: 12, padding: '16px 28px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,44,119,0.3)', minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.7, marginBottom: 4 }}>AI CHIEF OF STAFF</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>LUMEN</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Third Horizon Strategies</div>
        </div>
        <div style={{ width: 2, height: 24, background: '#E2E8F0', margin: '0 auto' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {AGENTS.slice(1).map((agent, i) => (
            <div key={agent.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 2, height: 20, background: '#E2E8F0' }} />
              <div onClick={() => setSelected(agent)}
                style={{ background: 'white', border: `1.5px solid ${STATUS_COLOR[agent.status] || '#E2E8F0'}`, borderRadius: 10, padding: '12px 20px', cursor: 'pointer', minWidth: 160, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
                <div style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[agent.status] || '#E2E8F0', marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#002C77', marginBottom: 2 }}>{agent.label}</div>
                <div style={{ fontSize: 11, color: '#8096B2' }}>{agent.role}</div>
                {agent.schedule && <div style={{ fontSize: 10, color: '#009DE0', marginTop: 4 }}>{agent.schedule}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent detail */}
      {selected && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#002C77' }}>{selected.label}</div>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 9999, background: STATUS_COLOR[selected.status] + '15', color: STATUS_COLOR[selected.status], border: `1px solid ${STATUS_COLOR[selected.status]}40`, fontWeight: 600 }}>{selected.status}</span>
          </div>
          <p style={{ fontSize: 13, color: '#565656', margin: '0 0 8px', lineHeight: 1.6 }}>{selected.description}</p>
          {selected.schedule && <div style={{ fontSize: 12, color: '#8096B2' }}>Schedule: <strong style={{ color: '#002C77' }}>{selected.schedule}</strong></div>}
        </div>
      )}
    </div>
  )
}

// â”€â”€ DEPLOYED SITES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DeployedSitesTab() {
  const STATUS_STYLES = {
    live:     { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    preview:  { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
    archived: { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
  }
  const CAT_COLOR = { Client: '#009DE0', TH: '#00968F', Personal: '#6D28D9' }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#8096B2', marginBottom: 20, marginTop: 0 }}>Working directory of all deployed platforms and sites.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEPLOYED_SITES.map(site => {
          const ss = STATUS_STYLES[site.status]
          const cc = CAT_COLOR[site.category] || '#8096B2'
          return (
            <div key={site.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ss.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#002C77', marginBottom: 2 }}>{site.name}</div>
                <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#009DE0', textDecoration: 'none', wordBreak: 'break-all' }}>{site.url}</a>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: cc + '15', color: cc, border: `1px solid ${cc}30` }}>{site.category}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, fontWeight: 600 }}>{site.status}</span>
                <span style={{ fontSize: 11, color: '#8096B2' }}>{site.updated}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function EcosystemPage() {
  const [tab, setTab] = useState('map')
  const [selectedNode, setSelectedNode] = useState(null)

  const tabs = [
    { id: 'map',     label: 'Connections Map' },
    { id: 'agents',  label: 'Agent Org Chart' },
    { id: 'sites',   label: 'Deployed Sites' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 }}>Ecosystem</h1>
        <p style={{ fontSize: 13, color: '#8096B2', margin: '3px 0 0' }}>Connections, agents, and deployed platforms</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F7F9FC', borderRadius: 10, padding: 4, border: '1px solid #E2E8F0', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? '#002C77' : 'transparent',
              color: tab === t.id ? 'white' : '#8096B2',
              transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'map' && (
        <>
          <EcosystemMap onSelectNode={(node, cat) => setSelectedNode({ ...node, catColor: cat.color, catLabel: cat.label })} />
          {selectedNode && (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 499 }} onClick={() => setSelectedNode(null)} />
              <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: 'white', borderLeft: '1px solid #E2E8F0', boxShadow: '-4px 0 20px rgba(0,0,0,0.08)', zIndex: 500, fontFamily: 'Arial, Helvetica, sans-serif', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: selectedNode.catColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{selectedNode.catLabel}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#002C77' }}>{selectedNode.label}</div>
                  </div>
                  <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8096B2', fontSize: 20, lineHeight: 1, padding: 4 }}>Ã—</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Purpose</div>
                    <p style={{ fontSize: 14, color: '#334E85', lineHeight: 1.6, margin: 0 }}>{selectedNode.purpose}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Connection Method</div>
                    <p style={{ fontSize: 14, color: '#334E85', lineHeight: 1.6, margin: 0 }}>{selectedNode.method}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Date Connected</div>
                    <p style={{ fontSize: 14, color: '#334E85', margin: 0 }}>{selectedNode.created}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'agents' && <AgentsTab />}
      {tab === 'sites' && <DeployedSitesTab />}
    </div>
  )
}
