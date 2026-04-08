import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Server, Globe, Database, MessageSquare, Mail, Hash, GitBranch,
  Cloud, FlaskConical, X, ExternalLink, Cpu,
  HardDrive, Network, Boxes, Zap, FileText, Archive, Activity
} from 'lucide-react'

// â”€â”€â”€ Ecosystem Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CATEGORIES = {
  core:        { label: 'Core',          color: '#F59E0B', textColor: '#0F0A1E', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.5)'  },
  apps:        { label: 'Deployed Apps', color: '#2D1B69', textColor: '#0F0A1E', bg: 'rgba(45,27,105,0.08)',  border: 'rgba(45,27,105,0.35)'  },
  integrations:{ label: 'Integrations',  color: '#7C3AED', textColor: '#0F0A1E', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.4)'  },
  data:        { label: 'Data Sources',  color: '#059669', textColor: '#0F0A1E', bg: 'rgba(5,150,105,0.08)',  border: 'rgba(5,150,105,0.4)'   },
  infra:       { label: 'Infrastructure',color: '#DC2626', textColor: '#0F0A1E', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.4)'   },
  sandbox:     { label: 'Sandboxes',     color: '#6B7280', textColor: '#0F0A1E', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.35)' },
}

const NODES = [
  { id: 'lumen', label: 'Lumen', subtitle: 'OpenClaw Gateway', category: 'core', icon: Cpu, status: 'live', description: 'Always-on AI gateway running on DavidPC. The central intelligence hub â€” handles messaging, email, calendar, and all integrations.', stack: 'Windows 10 Â· Node v24 Â· OpenClaw', host: 'DavidPC', isCenter: true },
  { id: 'mma-tracker', label: 'MMA Tracker', subtitle: 'GitHub Pages', category: 'apps', icon: Globe, status: 'live', description: 'Project/task/notes/people tracker for Third Horizon engagements. Full CRUD with Supabase backend.', stack: 'React Â· TypeScript Â· Vite Â· Supabase', url: 'https://ds016683.github.io/mma-tracker/', repo: 'th-client-apps' },
  { id: 'sa-hud', label: 'SA HUD', subtitle: 'GitHub Pages', category: 'apps', icon: Globe, status: 'live', description: 'This app. Sovereign Architect personal management HUD â€” sovereignty tracking, activity log, portfolio, ideas.', stack: 'React Â· Vite Â· Tailwind CSS', url: 'https://ds016683.github.io/sa-hud/', repo: 'personal-apps' },
  { id: 'clarity', label: 'Clarity', subtitle: 'Fly.io', category: 'apps', icon: FlaskConical, status: 'live', description: 'Starset Analytics demo app. Showcases price transparency and negotiated rate analysis capabilities.', stack: 'Python Â· Flask Â· JavaScript', repo: 'th-concept-apps' },
  { id: 'bh-rate-book', label: 'BH Rate Book', subtitle: 'Fly.io', category: 'apps', icon: FileText, status: 'live', description: 'Behavioral Health rates reference app. Python/Flask backend with JS frontend.', stack: 'Python Â· Flask Â· JavaScript', repo: 'th-concept-apps' },
  { id: 'achp-intel', label: 'ACHP Intel', subtitle: 'Local / Dev', category: 'apps', icon: Archive, status: 'dev', description: 'ACHP research intelligence tool. Uses ChromaDB for vector search over research documents.', stack: 'Python Â· ChromaDB', repo: 'th-business-development-apps' },
  { id: 'remotion', label: 'Remotion', subtitle: 'Video Generation', category: 'apps', icon: Zap, status: 'dev', description: 'Programmatic video generation workspace. Write React components, render to MP4. Used for animated data visualizations, client reports, and branded content.', stack: 'React Â· Remotion Â· ffmpeg Â· Node.js', host: 'DavidPC', repo: 'workspace/remotion' },
  { id: 'signal', label: 'Signal', subtitle: '+16302967614', category: 'integrations', icon: MessageSquare, status: 'live', description: "Lumen's primary messaging channel. Inbound/outbound messaging on a dedicated Signal number.", stack: 'Signal API Â· Dedicated Number' },
  { id: 'outlook', label: 'Outlook / Graph', subtitle: 'Lumen@thirdhorizon.com', category: 'integrations', icon: Mail, status: 'live', description: 'Microsoft Graph integration for THS email and calendar. Full read/write access.', stack: 'Microsoft Graph API Â· OAuth2' },
  { id: 'gmail', label: 'Gmail', subtitle: 'david.e.smith8@gmail.com', category: 'integrations', icon: Mail, status: 'live', description: 'Personal Gmail account. Read-only access for monitoring.', stack: 'Gmail API Â· OAuth2' },
  { id: 'slack', label: 'Slack', subtitle: 'Third Horizon workspace', category: 'integrations', icon: Hash, status: 'live', description: 'Third Horizon Slack workspace. Read, search, and limited write access.', stack: 'Slack API Â· Bot Token' },
  { id: 'harvest', label: 'Harvest', subtitle: 'Time & Expenses', category: 'integrations', icon: Zap, status: 'live', description: 'Time tracking and expense management. Full read/write â€” Lumen can log time and view reports.', stack: 'Harvest API Â· Personal Access Token' },
  { id: 'github', label: 'GitHub', subtitle: 'ds016683', category: 'integrations', icon: GitBranch, status: 'live', description: 'GitHub repos and Gist sync. Source for SA HUD cross-device state.', stack: 'GitHub API Â· SSH + Token', url: 'https://github.com/ds016683' },
  { id: 'supabase', label: 'Supabase', subtitle: 'MMA Tracker DB', category: 'data', icon: Database, status: 'live', description: 'PostgreSQL backend for MMA Tracker. Stores projects, tasks, notes, and people.', stack: 'Supabase Â· PostgreSQL Â· Row Level Security' },
  { id: 'gist', label: 'GitHub Gist', subtitle: 'SA HUD Sync', category: 'data', icon: Database, status: 'live', description: 'Cross-device sync storage for SA HUD. Persists game-state, activity-log, and portfolio.', stack: 'GitHub Gist API Â· JSON' },
  { id: 'dropbox', label: 'Dropbox (THS)', subtitle: 'C:\\Users\\david\\THS Dropbox\\', category: 'data', icon: HardDrive, status: 'live', description: 'Primary file system for THS work â€” SNMI documents, client files, and personal THS data.', stack: 'Dropbox Â· Local Mount' },
  { id: 'starset', label: 'Starset MMA National', subtitle: 'BigQuery Â· 60B+ rows', category: 'data', icon: Database, status: 'live', description: 'National MMA price transparency and negotiated rates dataset. V8 live. The analytical backbone of Starset Analytics.', stack: 'BigQuery Â· 60B+ rows Â· V8' },
  { id: 'davidpc', label: 'DavidPC', subtitle: '100.69.104.93', category: 'infra', icon: Server, status: 'live', description: 'Primary host machine. Windows 10, always on. Runs the OpenClaw gateway and all local services.', stack: 'Windows 10 Â· Tailscale Â· OpenClaw Gateway' },
  { id: 'macm5', label: 'Mac M5', subtitle: '100.73.172.56', category: 'infra', icon: Cpu, status: 'live', description: 'Secondary/portable machine. Apple Silicon M5, macOS 26. Connected via Tailscale.', stack: 'macOS 26 Â· Apple M5 Â· Tailscale Node' },
  { id: 'gh-actions', label: 'GitHub Actions', subtitle: 'CI/CD', category: 'infra', icon: Zap, status: 'live', description: 'Automated CI/CD pipelines. Builds and deploys sa-hud and mma-tracker to GitHub Pages on push.', stack: 'GitHub Actions Â· Node.js Â· Vite' },
  { id: 'flyio', label: 'Fly.io', subtitle: 'Docker Containers', category: 'infra', icon: Cloud, status: 'live', description: 'Hosts Clarity and BH Rate Book as Docker containers. Edge deployment across global PoPs.', stack: 'Fly.io Â· Docker Â· Python/Flask' },
  { id: 'tailscale', label: 'Tailscale', subtitle: 'VPN Mesh', category: 'infra', icon: Network, status: 'live', description: 'Private VPN mesh connecting DavidPC and Mac M5. Enables secure remote access without port forwarding.', stack: 'Tailscale Â· WireGuard' },
  { id: 'ideation-apps', label: 'ideation-apps', subtitle: 'Empty Â· Ready', category: 'sandbox', icon: Boxes, status: 'dev', description: 'Clean sandbox repo for experiments and concept prototypes. Ready when inspiration strikes.', stack: 'TBD' },
]

const STATUS = {
  live:    { label: 'LIVE',    dot: 'bg-game-green',   text: 'text-emerald-600' },
  dev:     { label: 'DEV',     dot: 'bg-amber-400',    text: 'text-amber-600'   },
  offline: { label: 'OFFLINE', dot: 'bg-game-red',     text: 'text-red-600'     },
}

const CX = 500, CY = 350, VW = 1000, VH = 700

function polarToXY(angleDeg, radius) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function layoutCluster(nodes, startAngle, endAngle, radius) {
  const count = nodes.length
  return nodes.map((node, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const angle = startAngle + t * (endAngle - startAngle)
    const pos = polarToXY(angle, radius)
    return { ...node, x: pos.x, y: pos.y }
  })
}

function buildLayout() {
  const byCategory = {}
  NODES.filter(n => !n.isCenter).forEach(n => {
    if (!byCategory[n.category]) byCategory[n.category] = []
    byCategory[n.category].push(n)
  })
  const center = { ...NODES.find(n => n.isCenter), x: CX, y: CY }
  const clusters = [
    ...layoutCluster(byCategory.apps || [], -160, -30, 245),
    ...layoutCluster(byCategory.integrations || [], -20, 80, 235),
    ...layoutCluster(byCategory.data || [], 85, 170, 245),
    ...layoutCluster(byCategory.infra || [], 175, 290, 250),
    ...layoutCluster(byCategory.sandbox || [], 295, 340, 220),
  ]
  return [center, ...clusters]
}

const LAID_OUT = buildLayout()

function EcoNode({ node, isSelected, onSelect }) {
  const cat = CATEGORIES[node.category]
  const Icon = node.icon
  const nodeSize = node.isCenter ? 52 : 36
  const half = nodeSize / 2

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(node.id === isSelected ? null : node.id)
  }, [node.id, isSelected, onSelect])

  return (
    <g transform={`translate(${node.x},${node.y})`} onClick={handleClick} style={{ cursor: 'pointer' }} className="group">
      {node.isCenter && (
        <circle cx={0} cy={0} r={half + 14} fill="none" stroke={cat.color} strokeWidth={1} opacity={0.25} style={{ animation: 'pulse 3s ease-in-out infinite' }} />
      )}
      {isSelected === node.id && (
        <circle cx={0} cy={0} r={half + 8} fill="none" stroke={cat.color} strokeWidth={2} opacity={0.8} />
      )}
      <circle cx={0} cy={0} r={half} fill={cat.bg} stroke={cat.border} strokeWidth={node.isCenter ? 2.5 : 1.5} />
      <foreignObject x={-half + (node.isCenter ? 12 : 8)} y={-half + (node.isCenter ? 12 : 8)} width={node.isCenter ? 40 : 20} height={node.isCenter ? 40 : 20} style={{ overflow: 'visible', pointerEvents: 'none' }}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Icon size={node.isCenter ? 26 : 16} />
        </div>
      </foreignObject>
      <text y={half + 14} textAnchor="middle" fill={node.isCenter ? cat.color : '#0F0A1E'} fontSize={node.isCenter ? 12 : 10} fontFamily="'Courier New', monospace" fontWeight={node.isCenter ? '700' : '500'} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {node.label}
      </text>
      {!node.isCenter && (
        <text y={half + 26} textAnchor="middle" fill="#6B7280" fontSize={8} fontFamily="'Courier New', monospace" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {node.subtitle}
        </text>
      )}
    </g>
  )
}

function NodePanel({ node, onClose }) {
  if (!node) return null
  const cat = CATEGORIES[node.category]
  const Icon = node.icon
  const st = STATUS[node.status] || STATUS.dev

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: cat.bg, border: `1.5px solid ${cat.border}` }}>
            <Icon size={20} style={{ color: cat.color }} />
          </div>
          <div>
            <h3 className="font-game text-base text-game-text leading-tight">{node.label}</h3>
            <p className="text-game-text-dim text-xs mt-0.5">{node.subtitle}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-game-text-dim hover:text-game-text transition-colors flex-shrink-0 mt-1">
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
          {cat.label}
        </span>
        <span className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${st.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} animate-pulse-slow`} />
          {st.label}
        </span>
      </div>
      <p className="text-game-text-muted text-xs leading-relaxed mb-4">{node.description}</p>
      {node.stack && (
        <div className="mb-4">
          <p className="text-game-text-dim text-[10px] uppercase tracking-wider mb-1.5">Stack / Tech</p>
          <div className="flex flex-wrap gap-1.5">
            {node.stack.split(' Â· ').map(s => (
              <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-game-darker border border-game-border text-game-text-muted">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {node.host && (<div className="mb-2"><span className="text-game-text-dim text-[10px] uppercase tracking-wider">Host: </span><span className="text-game-text-muted text-xs">{node.host}</span></div>)}
      {node.repo && (<div className="mb-2"><span className="text-game-text-dim text-[10px] uppercase tracking-wider">Repo: </span><span className="text-game-text-muted text-xs">{node.repo}</span></div>)}
      {node.url && (
        <a href={node.url} target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center gap-2 text-xs font-mono text-game-blue hover:text-blue-400 transition-colors border border-game-blue/30 hover:border-blue-400/50 rounded-sm px-3 py-2">
          <ExternalLink size={12} />
          Open App
        </a>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {Object.entries(CATEGORIES).map(([key, cat]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
          <span className="text-[10px] font-mono text-game-text-muted uppercase tracking-wider">{cat.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 ml-2 pl-2 border-l border-game-border">
        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Live</span>
        <span className="flex items-center gap-1 text-[10px] font-mono text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Dev</span>
      </div>
    </div>
  )
}

const THS_COLORS = { darkBlue: '#1A3A5C', mediumBlue: '#234D8B', gold: '#F8C762', lightBlueBg: '#E8F0F8' }

function TabButtons({ activeTab, setActiveTab, tabs }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: `2px solid ${THS_COLORS.gold}` }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', border: 'none', borderRadius: 24, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === tab.id ? THS_COLORS.darkBlue : '#f0f0f0', color: activeTab === tab.id ? '#fff' : '#999', transition: 'all 0.2s ease' }}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function CostDashboardTab() {
  const [costData, setCostData] = useState(null)
  const [thirtyDayData, setThirtyDayData] = useState(null)
  const [loading, setLoading] = useState(true)

  const SUPA_URL = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

  const agents = [
    { id: 'router', name: 'Router', model: 'local/gemma4:26b', status: 'active' },
    { id: 'strategy', name: 'Strategy', model: 'anthropic/claude-opus-4-6', status: 'active' },
    { id: 'code', name: 'Code', model: 'google/gemini-2.5-pro', status: 'active' },
    { id: 'design', name: 'Design', model: 'anthropic/claude-opus-4-6', status: 'standby' },
    { id: 'data', name: 'Data', model: 'google/gemini-2.5-flash', status: 'active' },
    { id: 'voice', name: 'Voice', model: 'openai/whisper + vapi', status: 'standby' },
    { id: 'costwatch', name: 'CostWatch', model: 'local/gemma4:26b', status: 'active' }
  ]

  useEffect(() => {
    const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    
    // Get today's cost
    const today = new Date().toISOString().split('T')[0]
    fetch(`${SUPA_URL}/rest/v1/cost_tracking?date=eq.${today}`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          setCostData(data[0])
        }
      })
      .catch(err => console.warn('Cost data fetch error:', err))

    // Get 30-day data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    fetch(`${SUPA_URL}/rest/v1/cost_tracking?date=gte.${thirtyDaysAgo}&order=date.desc`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          const total = data.reduce((sum, d) => sum + (d.total_cost || 0), 0)
          const avg = total / data.length
          setThirtyDayData({ total, average: avg, days: data.length })
        }
      })
      .catch(err => console.warn('30-day data fetch error:', err))
      .finally(() => setLoading(false))
  }, [])

  const todaySpend = costData?.total_cost || 0
  const thirtyDayTotal = thirtyDayData?.total || 0
  const dailyAverage = thirtyDayData?.average || 0

  return (
    <div>
      <div style={{ padding: 16, background: THS_COLORS.lightBlueBg, borderRadius: 8, marginBottom: 24, border: `1px solid ${THS_COLORS.gold}` }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Today's Spend</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: THS_COLORS.mediumBlue }}>
              ${loading ? '...' : todaySpend.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>30-Day Total</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: THS_COLORS.mediumBlue }}>
              ${loading ? '...' : thirtyDayTotal.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Daily Average</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: THS_COLORS.mediumBlue }}>
              ${loading ? '...' : dailyAverage.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 12 }}>Agent Activity</h3>
      {agents.map(agent => (
        <div key={agent.id} style={{ padding: 16, border: `1px solid ${THS_COLORS.gold}`, borderRadius: 8, background: '#fff', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Activity size={18} color={agent.status === 'active' ? '#2e7d32' : '#999'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: THS_COLORS.darkBlue }}>{agent.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{agent.model}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4, background: agent.status === 'active' ? '#e8f5e9' : '#f5f5f5', color: agent.status === 'active' ? '#2e7d32' : '#999' }}>
              {agent.status}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
            <div style={{ background: THS_COLORS.lightBlueBg, padding: 8, borderRadius: 4 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>Today</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: THS_COLORS.mediumBlue }}>$0.00</div>
            </div>
            <div style={{ background: THS_COLORS.lightBlueBg, padding: 8, borderRadius: 4 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>This Month</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: THS_COLORS.mediumBlue }}>$0.00</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EcosystemPage() {
  const [activeTab, setActiveTab] = useState('network')
  const [selectedId, setSelectedId] = useState(null)
  const svgRef = useRef(null)

  const selectedNode = selectedId ? LAID_OUT.find(n => n.id === selectedId) : null

  const handleSelect = useCallback((id) => { setSelectedId(id) }, [])
  const handleBgClick = useCallback(() => { setSelectedId(null) }, [])

  const tabs = [
    { id: 'network', label: 'Connections Map' },
    { id: 'org', label: 'Agent Org Chart' },
    { id: 'sites', label: 'Deployed Sites' },
    { id: 'cost', label: 'Cost Dashboard' }
  ]

  return (
    <div className="w-full min-h-screen p-3 md:p-6">
      <div className="game-panel p-3 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-game text-xl text-[#2D1B69]">ECOSYSTEM</h1>
            <p className="text-game-text-dim text-xs mt-0.5">
              {activeTab === 'network' ? `${LAID_OUT.length} nodes Â· ${NODES.filter(n => n.status === 'live').length} live` : ''}
            </p>
          </div>
          {activeTab === 'network' && <Legend />}
        </div>
      </div>

      <div style={{ background: '#fff', marginBottom: 16 }}>
        <TabButtons activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      </div>

      {activeTab === 'cost' && (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <CostDashboardTab />
        </div>
      )}

      {activeTab === 'network' && (
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="flex-1 bg-white border border-game-border rounded-lg overflow-hidden shadow-sm" style={{ minHeight: 420 }}>
            <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block', background: '#F8F7FF' }} onClick={handleBgClick}>
              <defs>
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="30%">
                  <stop offset="0%" stopColor="rgba(245,158,11,0.12)" />
                  <stop offset="100%" stopColor="rgba(245,158,11,0)" />
                </radialGradient>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <linearGradient key={key} id={`lg-${key}`} gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={cat.color} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={cat.color} stopOpacity="0.1" />
                  </linearGradient>
                ))}
              </defs>
              <ellipse cx={CX} cy={CY} rx={180} ry={140} fill="url(#centerGlow)" />
              {LAID_OUT.filter(n => !n.isCenter).map(node => {
                const cat = CATEGORIES[node.category]
                return (
                  <line key={`line-${node.id}`} x1={CX} y1={CY} x2={node.x} y2={node.y} stroke={cat.color} strokeWidth={selectedId === node.id ? 1.5 : 0.75} strokeOpacity={selectedId === node.id ? 0.7 : selectedId ? 0.1 : 0.35} strokeDasharray={node.status === 'dev' ? '4 4' : undefined} />
                )
              })}
              {LAID_OUT.map(node => (
                <EcoNode key={node.id} node={node} isSelected={selectedId} onSelect={handleSelect} />
              ))}
            </svg>
          </div>
          <div className={`lg:w-72 xl:w-80 transition-all duration-200 ${selectedNode ? 'opacity-100' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}`}>
            <div className="bg-white border border-game-border rounded-lg p-4 h-full shadow-sm" style={{ minHeight: 320 }}>
              {selectedNode ? (
                <NodePanel node={selectedNode} onClose={() => setSelectedId(null)} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Network size={32} className="text-game-text-dim mb-3" />
                  <p className="text-game-text-dim text-xs font-mono uppercase tracking-wider">Select a node</p>
                  <p className="text-game-text-subtle text-[10px] mt-1">Click any node to inspect</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedNode && activeTab === 'network' && (
        <div className="lg:hidden mt-4 bg-white border border-game-border rounded-lg p-4 shadow-sm">
          <NodePanel node={selectedNode} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {activeTab === 'org' && (<div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}><h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Agent Org Chart</h3><p style={{ fontSize: 14 }}>Coming soon</p></div>)}

      {activeTab === 'sites' && (<div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}><h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Deployed Sites</h3><p style={{ fontSize: 14 }}>Coming soon</p></div>)}

      <div className="mt-4 text-center text-game-text-dim text-[10px] font-mono uppercase tracking-wider">
        Lumen Â· OpenClaw Gateway Â· DavidPC Â· Always On
      </div>
    </div>
  )
}
