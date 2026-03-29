import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Server, Globe, Database, MessageSquare, Mail, Hash, GitBranch,
  Cloud, Wifi, FlaskConical, X, ExternalLink, Circle, Cpu,
  HardDrive, Network, Boxes, Zap, FileText, Archive
} from 'lucide-react'

// ─── Ecosystem Data ────────────────────────────────────────────────────────────

const CATEGORIES = {
  core:        { label: 'Core',          color: '#f4d03f', textColor: '#0a0e14', bg: 'rgba(244,208,63,0.15)',  border: 'rgba(244,208,63,0.6)'  },
  apps:        { label: 'Deployed Apps', color: '#3b82f6', textColor: '#e8eaed', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.5)'  },
  integrations:{ label: 'Integrations',  color: '#a855f7', textColor: '#e8eaed', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.5)'  },
  data:        { label: 'Data Sources',  color: '#22c55e', textColor: '#0a0e14', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.5)'   },
  infra:       { label: 'Infrastructure',color: '#ef4444', textColor: '#e8eaed', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.5)'   },
  sandbox:     { label: 'Sandboxes',     color: '#6b7280', textColor: '#e8eaed', bg: 'rgba(107,114,128,0.12)',border: 'rgba(107,114,128,0.5)' },
}

const NODES = [
  // CORE
  {
    id: 'lumen',
    label: 'Lumen',
    subtitle: 'OpenClaw Gateway',
    category: 'core',
    icon: Cpu,
    status: 'live',
    description: 'Always-on AI gateway running on DavidPC. The central intelligence hub — handles messaging, email, calendar, and all integrations.',
    stack: 'Windows 10 · Node v24 · OpenClaw',
    host: 'DavidPC',
    isCenter: true,
  },
  // DEPLOYED APPS
  {
    id: 'mma-tracker',
    label: 'MMA Tracker',
    subtitle: 'GitHub Pages',
    category: 'apps',
    icon: Globe,
    status: 'live',
    description: 'Project/task/notes/people tracker for Third Horizon engagements. Full CRUD with Supabase backend.',
    stack: 'React · TypeScript · Vite · Supabase',
    url: 'https://ds016683.github.io/mma-tracker/',
    repo: 'th-client-apps',
  },
  {
    id: 'sa-hud',
    label: 'SA HUD',
    subtitle: 'GitHub Pages',
    category: 'apps',
    icon: Globe,
    status: 'live',
    description: 'This app. Sovereign Architect personal management HUD — sovereignty tracking, activity log, portfolio, ideas.',
    stack: 'React · Vite · Tailwind CSS',
    url: 'https://ds016683.github.io/sa-hud/',
    repo: 'personal-apps',
  },
  {
    id: 'clarity',
    label: 'Clarity',
    subtitle: 'Fly.io',
    category: 'apps',
    icon: FlaskConical,
    status: 'live',
    description: 'Starset Analytics demo app. Showcases price transparency and negotiated rate analysis capabilities.',
    stack: 'Python · Flask · JavaScript',
    repo: 'th-concept-apps',
  },
  {
    id: 'bh-rate-book',
    label: 'BH Rate Book',
    subtitle: 'Fly.io',
    category: 'apps',
    icon: FileText,
    status: 'live',
    description: 'Behavioral Health rates reference app. Python/Flask backend with JS frontend.',
    stack: 'Python · Flask · JavaScript',
    repo: 'th-concept-apps',
  },
  {
    id: 'achp-intel',
    label: 'ACHP Intel',
    subtitle: 'Local / Dev',
    category: 'apps',
    icon: Archive,
    status: 'dev',
    description: 'ACHP research intelligence tool. Uses ChromaDB for vector search over research documents.',
    stack: 'Python · ChromaDB',
    repo: 'th-business-development-apps',
  },
  // INTEGRATIONS
  {
    id: 'signal',
    label: 'Signal',
    subtitle: '+16302967614',
    category: 'integrations',
    icon: MessageSquare,
    status: 'live',
    description: "Lumen's primary messaging channel. Inbound/outbound messaging on a dedicated Signal number.",
    stack: 'Signal API · Dedicated Number',
  },
  {
    id: 'outlook',
    label: 'Outlook / Graph',
    subtitle: 'Lumen@thirdhorizon.com',
    category: 'integrations',
    icon: Mail,
    status: 'live',
    description: 'Microsoft Graph integration for THS email and calendar. Full read/write access.',
    stack: 'Microsoft Graph API · OAuth2',
  },
  {
    id: 'gmail',
    label: 'Gmail',
    subtitle: 'david.e.smith8@gmail.com',
    category: 'integrations',
    icon: Mail,
    status: 'live',
    description: 'Personal Gmail account. Read-only access for monitoring.',
    stack: 'Gmail API · OAuth2',
  },
  {
    id: 'slack',
    label: 'Slack',
    subtitle: 'Third Horizon workspace',
    category: 'integrations',
    icon: Hash,
    status: 'live',
    description: 'Third Horizon Slack workspace. Read, search, and limited write access.',
    stack: 'Slack API · Bot Token',
  },
  {
    id: 'harvest',
    label: 'Harvest',
    subtitle: 'Time & Expenses',
    category: 'integrations',
    icon: Zap,
    status: 'live',
    description: 'Time tracking and expense management. Full read/write — Lumen can log time and view reports.',
    stack: 'Harvest API · Personal Access Token',
  },
  {
    id: 'github',
    label: 'GitHub',
    subtitle: 'ds016683',
    category: 'integrations',
    icon: GitBranch,
    status: 'live',
    description: 'GitHub repos and Gist sync. Source for SA HUD cross-device state.',
    stack: 'GitHub API · SSH + Token',
    url: 'https://github.com/ds016683',
  },
  // DATA SOURCES
  {
    id: 'supabase',
    label: 'Supabase',
    subtitle: 'MMA Tracker DB',
    category: 'data',
    icon: Database,
    status: 'live',
    description: 'PostgreSQL backend for MMA Tracker. Stores projects, tasks, notes, and people.',
    stack: 'Supabase · PostgreSQL · Row Level Security',
  },
  {
    id: 'gist',
    label: 'GitHub Gist',
    subtitle: 'SA HUD Sync',
    category: 'data',
    icon: Database,
    status: 'live',
    description: 'Cross-device sync storage for SA HUD. Persists game-state, activity-log, and portfolio.',
    stack: 'GitHub Gist API · JSON',
  },
  {
    id: 'dropbox',
    label: 'Dropbox (THS)',
    subtitle: 'C:\\Users\\david\\THS Dropbox\\',
    category: 'data',
    icon: HardDrive,
    status: 'live',
    description: 'Primary file system for THS work — SNMI documents, client files, and personal THS data.',
    stack: 'Dropbox · Local Mount',
  },
  {
    id: 'starset',
    label: 'Starset MMA National',
    subtitle: 'BigQuery · 60B+ rows',
    category: 'data',
    icon: Database,
    status: 'live',
    description: 'National MMA price transparency and negotiated rates dataset. V8 live. The analytical backbone of Starset Analytics.',
    stack: 'BigQuery · 60B+ rows · V8',
  },
  // INFRASTRUCTURE
  {
    id: 'davidpc',
    label: 'DavidPC',
    subtitle: '100.69.104.93',
    category: 'infra',
    icon: Server,
    status: 'live',
    description: 'Primary host machine. Windows 10, always on. Runs the OpenClaw gateway and all local services.',
    stack: 'Windows 10 · Tailscale · OpenClaw Gateway',
  },
  {
    id: 'macm5',
    label: 'Mac M5',
    subtitle: '100.73.172.56',
    category: 'infra',
    icon: Cpu,
    status: 'live',
    description: 'Secondary/portable machine. Apple Silicon M5, macOS 26. Connected via Tailscale.',
    stack: 'macOS 26 · Apple M5 · Tailscale Node',
  },
  {
    id: 'gh-actions',
    label: 'GitHub Actions',
    subtitle: 'CI/CD',
    category: 'infra',
    icon: Zap,
    status: 'live',
    description: 'Automated CI/CD pipelines. Builds and deploys sa-hud and mma-tracker to GitHub Pages on push.',
    stack: 'GitHub Actions · Node.js · Vite',
  },
  {
    id: 'flyio',
    label: 'Fly.io',
    subtitle: 'Docker Containers',
    category: 'infra',
    icon: Cloud,
    status: 'live',
    description: 'Hosts Clarity and BH Rate Book as Docker containers. Edge deployment across global PoPs.',
    stack: 'Fly.io · Docker · Python/Flask',
  },
  {
    id: 'tailscale',
    label: 'Tailscale',
    subtitle: 'VPN Mesh',
    category: 'infra',
    icon: Network,
    status: 'live',
    description: 'Private VPN mesh connecting DavidPC and Mac M5. Enables secure remote access without port forwarding.',
    stack: 'Tailscale · WireGuard',
  },
  // SANDBOXES
  {
    id: 'ideation-apps',
    label: 'ideation-apps',
    subtitle: 'Empty · Ready',
    category: 'sandbox',
    icon: Boxes,
    status: 'dev',
    description: 'Clean sandbox repo for experiments and concept prototypes. Ready when inspiration strikes.',
    stack: 'TBD',
  },
]

// Status styles
const STATUS = {
  live:    { label: 'LIVE',    dot: 'bg-game-green',  text: 'text-game-green'  },
  dev:     { label: 'DEV',     dot: 'bg-yellow-400',  text: 'text-yellow-400'  },
  offline: { label: 'OFFLINE', dot: 'bg-game-red',    text: 'text-game-red'    },
}

// ─── Layout: polar coordinate positions ──────────────────────────────────────
// Center is at (50, 50) in % of SVG viewBox (1000×700)
// Each cluster gets an arc + radius

const CX = 500
const CY = 350
const VW = 1000
const VH = 700

function polarToXY(angleDeg, radius) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  }
}

// Distribute nodes in a category around an arc
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
    ...layoutCluster(byCategory.apps || [],         -155, -25,  230),
    ...layoutCluster(byCategory.integrations || [],   15, 100,  220),
    ...layoutCluster(byCategory.data || [],          105, 175,  230),
    ...layoutCluster(byCategory.infra || [],         185, 290,  235),
    ...layoutCluster(byCategory.sandbox || [],       300, 330,  210),
  ]

  return [center, ...clusters]
}

const LAID_OUT = buildLayout()

// ─── Node Component ──────────────────────────────────────────────────────────

function EcoNode({ node, isSelected, onSelect, svgRef }) {
  const cat = CATEGORIES[node.category]
  const Icon = node.icon
  const nodeSize = node.isCenter ? 52 : 36
  const half = nodeSize / 2

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(node.id === isSelected ? null : node.id)
  }, [node.id, isSelected, onSelect])

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      className="group"
    >
      {/* Outer pulse ring for center node */}
      {node.isCenter && (
        <circle
          cx={0} cy={0}
          r={half + 14}
          fill="none"
          stroke={cat.color}
          strokeWidth={1}
          opacity={0.25}
          style={{ animation: 'pulse 3s ease-in-out infinite' }}
        />
      )}
      {/* Selection ring */}
      {isSelected === node.id && (
        <circle
          cx={0} cy={0}
          r={half + 8}
          fill="none"
          stroke={cat.color}
          strokeWidth={2}
          opacity={0.8}
        />
      )}
      {/* Main circle */}
      <circle
        cx={0} cy={0}
        r={half}
        fill={cat.bg}
        stroke={cat.border}
        strokeWidth={node.isCenter ? 2.5 : 1.5}
      />
      {/* Icon — rendered via foreignObject so Lucide works */}
      <foreignObject
        x={-half + (node.isCenter ? 12 : 8)}
        y={-half + (node.isCenter ? 12 : 8)}
        width={node.isCenter ? 40 : 20}
        height={node.isCenter ? 40 : 20}
        style={{ overflow: 'visible', pointerEvents: 'none' }}
      >
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
        >
          <Icon size={node.isCenter ? 26 : 16} />
        </div>
      </foreignObject>
      {/* Label */}
      <text
        y={half + 14}
        textAnchor="middle"
        fill={node.isCenter ? cat.color : '#e8eaed'}
        fontSize={node.isCenter ? 12 : 10}
        fontFamily="'Courier New', monospace"
        fontWeight={node.isCenter ? '700' : '500'}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.label}
      </text>
      {!node.isCenter && (
        <text
          y={half + 26}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={8}
          fontFamily="'Courier New', monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {node.subtitle}
        </text>
      )}
    </g>
  )
}

// ─── Side Panel ──────────────────────────────────────────────────────────────

function NodePanel({ node, onClose }) {
  if (!node) return null
  const cat = CATEGORIES[node.category]
  const Icon = node.icon
  const st = STATUS[node.status] || STATUS.dev

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: cat.bg, border: `1.5px solid ${cat.border}` }}
          >
            <Icon size={20} style={{ color: cat.color }} />
          </div>
          <div>
            <h3 className="font-game text-base text-game-text leading-tight">{node.label}</h3>
            <p className="text-game-text-dim text-xs mt-0.5">{node.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-game-text-dim hover:text-game-text transition-colors flex-shrink-0 mt-1"
        >
          <X size={16} />
        </button>
      </div>

      {/* Category + Status badges */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm"
          style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
        >
          {cat.label}
        </span>
        <span className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${st.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} animate-pulse-slow`} />
          {st.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-game-text-muted text-xs leading-relaxed mb-4">{node.description}</p>

      {/* Stack */}
      {node.stack && (
        <div className="mb-4">
          <p className="text-game-text-dim text-[10px] uppercase tracking-wider mb-1.5">Stack / Tech</p>
          <div className="flex flex-wrap gap-1.5">
            {node.stack.split(' · ').map(s => (
              <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-game-darker border border-game-border/60 text-game-text-muted">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional fields */}
      {node.host && (
        <div className="mb-2">
          <span className="text-game-text-dim text-[10px] uppercase tracking-wider">Host: </span>
          <span className="text-game-text-muted text-xs">{node.host}</span>
        </div>
      )}
      {node.repo && (
        <div className="mb-2">
          <span className="text-game-text-dim text-[10px] uppercase tracking-wider">Repo: </span>
          <span className="text-game-text-muted text-xs">{node.repo}</span>
        </div>
      )}

      {/* URL */}
      {node.url && (
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center gap-2 text-xs font-mono text-game-blue hover:text-blue-400 transition-colors border border-game-blue/30 hover:border-blue-400/50 rounded-sm px-3 py-2"
        >
          <ExternalLink size={12} />
          Open App
        </a>
      )}
    </div>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {Object.entries(CATEGORIES).map(([key, cat]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: cat.color }}
          />
          <span className="text-[10px] font-mono text-game-text-muted uppercase tracking-wider">{cat.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 ml-2 pl-2 border-l border-game-border/40">
        <span className="flex items-center gap-1 text-[10px] font-mono text-game-green"><span className="w-1.5 h-1.5 rounded-full bg-game-green" />Live</span>
        <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-400"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Dev</span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EcosystemPage() {
  const [selectedId, setSelectedId] = useState(null)
  const svgRef = useRef(null)
  const [svgSize, setSvgSize] = useState({ w: VW, h: VH })

  const selectedNode = selectedId ? LAID_OUT.find(n => n.id === selectedId) : null

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
  }, [])

  const handleBgClick = useCallback(() => {
    setSelectedId(null)
  }, [])

  return (
    <div className="w-full min-h-screen p-3 md:p-6">
      {/* Page header */}
      <div className="game-panel p-3 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-game text-xl text-game-gold glow-text">ECOSYSTEM MAP</h1>
            <p className="text-game-text-dim text-xs mt-0.5">
              {LAID_OUT.length} nodes · {Object.values(NODES.filter(n => n.status === 'live')).length} live
            </p>
          </div>
          <Legend />
        </div>
      </div>

      {/* Main content: graph + side panel */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* SVG Graph */}
        <div
          className="flex-1 bg-game-darker border border-game-border/50 rounded-sm overflow-hidden"
          style={{ minHeight: 420 }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            width="100%"
            style={{ display: 'block', background: 'linear-gradient(180deg, #0a0e14 0%, #0d1219 100%)' }}
            onClick={handleBgClick}
          >
            <defs>
              {/* Radial bg glow at center */}
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="30%">
                <stop offset="0%" stopColor="rgba(244,208,63,0.08)" />
                <stop offset="100%" stopColor="rgba(244,208,63,0)" />
              </radialGradient>
              {/* Line gradient per category */}
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <linearGradient key={key} id={`lg-${key}`} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={cat.color} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={cat.color} stopOpacity="0.1" />
                </linearGradient>
              ))}
            </defs>

            {/* Center glow */}
            <ellipse
              cx={CX} cy={CY}
              rx={180} ry={140}
              fill="url(#centerGlow)"
            />

            {/* Connection lines */}
            {LAID_OUT.filter(n => !n.isCenter).map(node => {
              const cat = CATEGORIES[node.category]
              return (
                <line
                  key={`line-${node.id}`}
                  x1={CX} y1={CY}
                  x2={node.x} y2={node.y}
                  stroke={cat.color}
                  strokeWidth={selectedId === node.id ? 1.5 : 0.75}
                  strokeOpacity={selectedId === node.id ? 0.7 : selectedId ? 0.12 : 0.3}
                  strokeDasharray={node.status === 'dev' ? '4 4' : undefined}
                />
              )
            })}

            {/* Nodes */}
            {LAID_OUT.map(node => (
              <EcoNode
                key={node.id}
                node={node}
                isSelected={selectedId}
                onSelect={handleSelect}
                svgRef={svgRef}
              />
            ))}
          </svg>
        </div>

        {/* Side panel */}
        <div
          className={`lg:w-72 xl:w-80 transition-all duration-200 ${selectedNode ? 'opacity-100' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}`}
        >
          <div
            className="bg-game-dark border border-game-border/60 rounded-sm p-4 h-full"
            style={{ minHeight: 320 }}
          >
            {selectedNode ? (
              <NodePanel node={selectedNode} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Network size={32} className="text-game-text-dim mb-3" />
                <p className="text-game-text-dim text-xs font-mono uppercase tracking-wider">
                  Select a node
                </p>
                <p className="text-game-text-subtle text-[10px] mt-1">
                  Click any node to inspect
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: selected node panel below graph */}
      {selectedNode && (
        <div className="lg:hidden mt-4 bg-game-dark border border-game-border/60 rounded-sm p-4">
          <NodePanel node={selectedNode} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {/* Footer note */}
      <div className="mt-4 text-center text-game-text-dim text-[10px] font-mono uppercase tracking-wider">
        Lumen · OpenClaw Gateway · DavidPC · Always On
      </div>
    </div>
  )
}
