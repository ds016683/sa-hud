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

/*
-- MIGRATION NEEDED (run in Supabase SQL editor):
-- CREATE TABLE cost_tracking (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   created_at timestamptz DEFAULT now(),
--   model text NOT NULL,
--   provider text NOT NULL,
--   agent text,
--   task_type text,
--   input_tokens integer,
--   output_tokens integer,
--   cost_usd numeric(10,6),
--   session_id text,
--   channel text
-- );
--
-- NOTE on OpenRouter: OpenRouter has a /api/v1/generation endpoint with activity logs.
-- In a future pass, cost data can be pulled directly from OpenRouter API instead of
-- relying on agents to write to Supabase. For now, agents write to cost_tracking on each LLM call.
*/

// ── Agent Data ───────────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'lumen',     emoji: '🧭', name: 'Lumen',     role: 'Orchestrator & primary interface',  model: 'anthropic/claude-sonnet-4-6', channel: '#lumen',     channelId: '1491935770280333362', status: 'active',  color: '#F59E0B', description: 'Hub agent. Routes tasks, makes judgment calls, maintains full context. Warm, direct, witty.', capabilities: ['routing', 'orchestration', 'full-context reasoning', 'memory access', 'specialist delegation'], rules: "Hub agent. Warm, direct, witty. Knows David's full context. Makes judgment calls. Routes when the task is clearly a specialist job. Never loses the conversational thread. Loads: HARDLINES.md, SOUL.md, USER.md, northstar skill, daily memory files.", lumenNotes: 'Routes to specialists. Maintains memory. Loads northstar skill each session.' },
  { id: 'mr-brief',  emoji: '📋', name: 'Mr. Brief',  role: 'Meeting prep & pre-call research',   model: 'anthropic/claude-sonnet-4-6', channel: '#mr-brief',  channelId: '1491935829331939429', status: 'active',  color: '#2D9CDB', description: 'David never walks into a meeting cold. Reads Slack DMs, emails, and Granola notes to synthesize context.', capabilities: ['pre-call research', 'attendee background', 'briefing generation', 'email thread context'], rules: 'Methodical and thorough. Pre-call research specialist. Reads Slack DMs, emails, Granola notes. Never sends David into a meeting cold.' },
  { id: 'mr-scout',  emoji: '🔍', name: 'Mr. Scout',  role: 'Deep research & intelligence',        model: 'kimi-k2 (1T param model)',    channel: '#mr-scout',  channelId: '1491935858595598466', status: 'active',  color: '#6FCF97', description: "Curious and relentless. Investigates people, orgs, policy, markets. Runs on Kimi K2.", capabilities: ['people research', 'org background', 'policy analysis', 'competitive intelligence', 'web research'], rules: "Curious and relentless. Research engine. Finds the connection chain, the background, the context David doesn't have time to dig for himself. Runs on Kimi K2 (1T param model)." },
  { id: 'mr-draft',  emoji: '✍️', name: 'Mr. Draft',  role: 'Writing & content creation',          model: 'anthropic/claude-sonnet-4-6', channel: '#mr-draft',  channelId: '1491935895496949912', status: 'active',  color: '#BB6BD9', description: "Writes in David's voice. Email drafts, documents, proposals, Tea Leaves content. Never sounds corporate.", capabilities: ['email drafting', 'document writing', 'Tea Leaves content', 'proposals', 'editing'], rules: "Clean and efficient. Output-focused. Speaks in David's voice when drafting (but never signs as David). Tea Leaves content understands the publication's tone." },
  { id: 'mr-watch',  emoji: '👁️', name: 'Mr. Watch',  role: 'Email triage & monitoring',           model: 'openai/gpt-4o-mini',          channel: '#mr-watch',  channelId: '1491935946416062525', status: 'active',  color: '#EB5757', description: 'Quiet and vigilant. Monitors inbox, calendar, Granola. Escalates only what matters. Runs hourly.', capabilities: ['email triage', 'calendar monitoring', 'Granola routing', 'heartbeat execution'], rules: 'Quiet and vigilant. Works in the background. Escalates only when something actually needs attention. Does not cry wolf. Runs hourly heartbeat.' },
  { id: 'mr-build',  emoji: '🔧', name: 'Mr. Build',  role: 'Code, scripts & automation',          model: 'anthropic/claude-sonnet-4-6', channel: '#mr-build',  channelId: '1491936071880019968', status: 'active',  color: '#F2994A', description: 'Technical and precise. Handles workspace engineering. Spawns Claude Code for complex dev work.', capabilities: ['scripting', 'automation', 'Node.js', 'API integration', 'Claude Code subprocess spawning'], rules: 'Technical and precise. Handles workspace engineering and code. Quick scripts and automation run directly. Complex multi-file work handed to Claude Code via SSH to Mac M5.' },
  { id: 'mr-pulse',  emoji: '📊', name: 'Mr. Pulse',  role: 'Data queries & analytics',            model: 'anthropic/claude-sonnet-4-6', channel: '#mr-pulse',  channelId: '1491936114905317499', status: 'active',  color: '#56CCF2', description: 'Analytical and concise. Starset data, portfolio metrics, Supabase queries. Returns structured answers.', capabilities: ['Supabase queries', 'portfolio metrics', 'Starset analytics', 'cost tracking', 'reporting'], rules: 'Analytical and concise. Starset data, portfolio metrics, Supabase queries. Returns structured answers.' },
  { id: 'mr-diablo', emoji: '⚔️', name: 'Mr. Diablo', role: 'Project Diablo engineering',          model: 'anthropic/claude-sonnet-4-6', channel: '#mr-diablo', channelId: '1491977511536431104', status: 'active',  color: '#FF4444', description: 'Dedicated engineering agent for Project Diablo (React/Vite/Vercel). Discusses architecture, stages build briefs for Claude Code.', capabilities: ['React/Vite development', 'architecture decisions', 'build brief staging', 'Claude Code handoff'], rules: 'Dedicated engineering agent for Project Diablo. Discusses architecture, stages build briefs at workspace/tmp/ for Claude Code handoff.' },
  { id: 'mr-deck',   emoji: '🎨', name: 'Mr. Deck',   role: 'Decks & presentations',               model: 'anthropic/claude-sonnet-4-6', channel: '#mr-deck',   channelId: '1491936969108885615', status: 'planned', color: '#1A3A5C', description: 'Visual and executive-polish minded. PowerPoint decks, TH-branded slides. Knows the brand palette.', capabilities: ['PPTX creation', 'TH brand application', 'executive decks', 'narrative arc design'], rules: 'Visual and executive-polish minded. PowerPoint decks, TH-branded slides. Knows the brand palette: darkBlue #1A3A5C, mediumBlue #234D8B, gold #F8C762.' },
]

function AgentPanel({ agent, onClose }) {
  return (
    <div className="flex flex-col h-full" style={{ overflowY: 'auto' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-game text-base text-game-text leading-tight">{agent.emoji} {agent.name}</h3>
          <p className="text-game-text-dim text-xs mt-0.5">{agent.role}</p>
        </div>
        <button onClick={onClose} className="text-game-text-dim hover:text-game-text transition-colors flex-shrink-0 mt-1">
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: agent.status === 'active' ? '#e8f5e9' : '#fff3e0', color: agent.status === 'active' ? '#2e7d32' : '#e65100', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {agent.status}
        </span>
      </div>
      <div className="mb-3">
        <p className="text-game-text-dim text-[10px] uppercase tracking-wider mb-1">Model</p>
        <p className="text-xs font-mono text-game-text-muted">{agent.model}</p>
      </div>
      <div className="mb-3">
        <p className="text-game-text-dim text-[10px] uppercase tracking-wider mb-1">Discord Channel</p>
        <button
          className="text-xs font-mono text-game-blue hover:text-blue-400 transition-colors block"
          onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(agent.channel) }}
          title="Click to copy channel name"
        >
          {agent.channel}
        </button>
        <p className="text-game-text-dim text-[10px] mt-0.5 font-mono">ID: {agent.channelId}</p>
      </div>
      <p className="text-game-text-muted text-xs leading-relaxed mb-3">{agent.description}</p>
      {agent.lumenNotes && (
        <div className="mb-3 p-2 rounded" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#92400e' }}>Context</p>
          <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>{agent.lumenNotes}</p>
        </div>
      )}
      <div className="mb-3">
        <p className="text-game-text-dim text-[10px] uppercase tracking-wider mb-1.5">Capabilities</p>
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map(cap => (
            <span key={cap} className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-game-darker border border-game-border text-game-text-muted">
              {cap}
            </span>
          ))}
        </div>
      </div>
      {agent.rules && (
        <div>
          <p className="text-game-text-dim text-[10px] uppercase tracking-wider mb-1.5">Rules (from AGENTS.md)</p>
          <div className="text-xs leading-relaxed p-2 rounded" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', color: '#555', fontStyle: 'italic' }}>
            {agent.rules}
          </div>
        </div>
      )}
    </div>
  )
}

function AgentOrgChart() {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const containerRef = useRef(null)
  const lumenRef = useRef(null)
  const agentRefs = useRef({})
  const [lines, setLines] = useState([])

  const lumen = AGENTS[0]
  const row1 = AGENTS.filter(a => ['mr-brief', 'mr-scout', 'mr-draft', 'mr-watch'].includes(a.id))
  const row2 = AGENTS.filter(a => ['mr-build', 'mr-pulse', 'mr-diablo', 'mr-deck'].includes(a.id))

  const recalcLines = useCallback(() => {
    if (!lumenRef.current || !containerRef.current) return
    const container = containerRef.current.getBoundingClientRect()
    const lr = lumenRef.current.getBoundingClientRect()
    const lx = lr.left - container.left + lr.width / 2
    const ly = lr.bottom - container.top
    const newLines = AGENTS.filter(a => a.id !== 'lumen').map(agent => {
      const el = agentRefs.current[agent.id]
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { id: agent.id, x1: lx, y1: ly, x2: rect.left - container.left + rect.width / 2, y2: rect.top - container.top, color: agent.color }
    }).filter(Boolean)
    setLines(newLines)
  }, [])

  useEffect(() => {
    recalcLines()
    window.addEventListener('resize', recalcLines)
    return () => window.removeEventListener('resize', recalcLines)
  }, [recalcLines])

  const selectedAgentData = selectedAgent ? AGENTS.find(a => a.id === selectedAgent) : null

  return (
    <div className="flex gap-4 flex-col lg:flex-row">
      <div className="flex-1 bg-white border border-game-border rounded-lg p-6 shadow-sm overflow-x-auto">
        <div ref={containerRef} style={{ position: 'relative', minHeight: 360, minWidth: 680 }}>
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            {lines.map(ln => (
              <line key={ln.id} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={ln.color} strokeWidth={1.5} strokeOpacity={0.45} />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
            <div
              ref={lumenRef}
              onClick={() => setSelectedAgent(selectedAgent === lumen.id ? null : lumen.id)}
              style={{ width: 250, padding: '16px 20px', border: `2px solid ${lumen.color}`, borderRadius: 10, background: selectedAgent === lumen.id ? 'rgba(245,158,11,0.14)' : 'rgba(245,158,11,0.06)', cursor: 'pointer', boxShadow: selectedAgent === lumen.id ? '0 0 20px rgba(245,158,11,0.3)' : 'none', transition: 'all 0.2s ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: lumen.color, fontFamily: 'Cinzel, serif' }}>Lumen</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#e8f5e9', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.06em' }}>active</span>
              </div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 5, fontFamily: "'Courier New', monospace" }}>{lumen.role}</div>
              <div style={{ fontSize: 10, color: '#999', fontFamily: "'Courier New', monospace" }}>{lumen.model}</div>
              <div style={{ fontSize: 10, color: lumen.color, fontFamily: "'Courier New', monospace", marginTop: 2 }}>{lumen.channel}</div>
            </div>
          </div>
          {[row1, row2].map((row, rowIdx) => (
            <div key={row[0].id} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: rowIdx === 0 ? 12 : 0, position: 'relative', zIndex: 1 }}>
              {row.map(agent => {
                const isPlanned = agent.status === 'planned'
                const isSel = selectedAgent === agent.id
                return (
                  <div
                    key={agent.id}
                    ref={el => { agentRefs.current[agent.id] = el }}
                    onClick={() => setSelectedAgent(isSel ? null : agent.id)}
                    style={{ width: 158, padding: '10px 12px', border: `1.5px ${isPlanned ? 'dashed' : 'solid'} ${agent.color}`, borderRadius: 8, background: isSel ? `${agent.color}1A` : '#fff', cursor: 'pointer', opacity: isPlanned ? 0.6 : 1, boxShadow: isSel ? `0 0 10px ${agent.color}40` : 'none', transition: 'all 0.2s ease', flexShrink: 0 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THS_COLORS.darkBlue, fontFamily: 'Cinzel, serif' }}>{agent.name}</span>
                      <span style={{ fontSize: 8, fontWeight: 600, padding: '2px 5px', borderRadius: 3, background: isPlanned ? '#f5f5f5' : '#e8f5e9', color: isPlanned ? '#aaa' : '#2e7d32', textTransform: 'uppercase', flexShrink: 0 }}>{agent.status}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#666', marginBottom: 3, fontFamily: "'Courier New', monospace", lineHeight: 1.3 }}>{agent.role}</div>
                    <div style={{ fontSize: 9, color: '#aaa', fontFamily: "'Courier New', monospace" }}>{agent.model}</div>
                    <div style={{ fontSize: 9, color: agent.color, fontFamily: "'Courier New', monospace", marginTop: 2 }}>{agent.channel}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={`lg:w-72 xl:w-80 transition-all duration-200 ${selectedAgentData ? 'opacity-100' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}`}>
        <div className="bg-white border border-game-border rounded-lg p-4 h-full shadow-sm" style={{ minHeight: 320 }}>
          {selectedAgentData ? (
            <AgentPanel agent={selectedAgentData} onClose={() => setSelectedAgent(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Cpu size={32} className="text-game-text-dim mb-3" />
              <p className="text-game-text-dim text-xs font-mono uppercase tracking-wider">Select an agent</p>
              <p className="text-game-text-subtle text-[10px] mt-1">Click any card to inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UseInstructionsTab() {
  const routingMap = [
    { need: 'Anything uncertain', agent: '#lumen', example: '"What should I do about..."' },
    { need: 'Meeting prep', agent: '#mr-brief', example: '"Brief me on [name] before my 2pm"' },
    { need: 'Research', agent: '#mr-scout', example: '"Deep background on [org/person]"' },
    { need: 'Writing', agent: '#mr-draft', example: '"Draft a response to [email]"' },
    { need: 'Inbox check', agent: '#mr-watch', example: '"What\'s in my inbox?"' },
    { need: 'Scripts / automation', agent: '#mr-build', example: '"Write a script that..."' },
    { need: 'Starset / data', agent: '#mr-pulse', example: '"Query the last 30 days of..."' },
    { need: 'Project Diablo', agent: '#mr-diablo', example: '"I want to add a feature that..."' },
    { need: 'Deck / slides', agent: '#mr-deck', example: '"Build a deck for [meeting]"' },
  ]
  const powerMoves = [
    { title: 'Pre-meeting brief', detail: '"Brief me on [name] for my [time] call" → Mr. Brief reads email history, Slack DMs, Granola notes, returns context doc' },
    { title: 'Research chain', detail: '"Background on [org]" → Mr. Scout digs for 10–15 min, returns structured intelligence' },
    { title: 'Email draft', detail: '"Draft a response to [person]\'s email about [topic]" → Mr. Draft returns ready-to-send copy in David\'s voice' },
    { title: 'Build handoff', detail: 'Ask Mr. Diablo for any Diablo feature → he stages a brief at workspace/tmp/ → you open Claude Code and it\'s waiting' },
    { title: 'Morning brief', detail: 'Delivered automatically by Mr. Watch around 7am PT in #mr-brief' },
    { title: 'Cost check', detail: '"What did I spend on AI this week?" → Mr. Pulse hits Supabase cost_tracking table' },
  ]
  const usageTips = [
    'No @ mentions required — just talk in the channel',
    'Short = fast response; long = thorough response',
    '"Don\'t tell me, just do it" → skips confirmation step',
    'Prefix with "draft:" to get output without it being sent',
    'Mr. Scout is the expensive one (Kimi K2) — use it for real research, not quick lookups',
  ]
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 12, fontFamily: 'Cinzel, serif' }}>The Routing Map</h3>
        <div style={{ border: `1px solid ${THS_COLORS.gold}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: THS_COLORS.darkBlue, color: '#fff' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Need</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Go to</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Example</th>
              </tr>
            </thead>
            <tbody>
              {routingMap.map((row, i) => (
                <tr key={row.agent} style={{ background: i % 2 === 0 ? '#fff' : THS_COLORS.lightBlueBg, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '10px 16px', color: '#333' }}>{row.need}</td>
                  <td style={{ padding: '10px 16px', fontFamily: "'Courier New', monospace", fontWeight: 700, color: THS_COLORS.mediumBlue }}>{row.agent}</td>
                  <td style={{ padding: '10px 16px', color: '#555', fontStyle: 'italic' }}>{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 12, fontFamily: 'Cinzel, serif' }}>Power Moves</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {powerMoves.map(move => (
            <div key={move.title} style={{ padding: '12px 16px', border: `1px solid ${THS_COLORS.gold}`, borderRadius: 8, background: THS_COLORS.lightBlueBg, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: THS_COLORS.darkBlue }}>{move.title}:</span> {move.detail}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 12, fontFamily: 'Cinzel, serif' }}>Memory & Continuity</h3>
        <div style={{ padding: '16px 20px', border: `2px solid ${THS_COLORS.gold}`, borderRadius: 8, background: 'rgba(248,199,98,0.08)', fontSize: 13, color: '#444', lineHeight: 1.7 }}>
          Agents wake up fresh each session but read from{' '}
          <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3, fontFamily: "'Courier New', monospace", fontSize: 12 }}>workspace/memory/</code>{' '}
          files. If something important happens, say <strong>&ldquo;write this to memory&rdquo;</strong> and the agent will persist it to{' '}
          <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3, fontFamily: "'Courier New', monospace", fontSize: 12 }}>workspace/memory/YYYY-MM-DD.md</code>.
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 12, fontFamily: 'Cinzel, serif' }}>Quick Usage Tips</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usageTips.map(tip => (
            <div key={tip} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#444', padding: '8px 12px', background: THS_COLORS.lightBlueBg, borderRadius: 6, border: `1px solid rgba(26,58,92,0.12)` }}>
              <span style={{ color: THS_COLORS.gold, fontWeight: 700, flexShrink: 0 }}>→</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Deployed Sites Data ───────────────────────────────────────────────────────

const DEPLOYED_SITES = [
  { name: 'Sovereign Architect HUD', repo: 'ds016683/sa-hud', url: 'https://ds016683.github.io/sa-hud/', status: 'active', visibility: 'public', hosting: 'GitHub Pages', deploy: 'npm run deploy (gh-pages)', stack: 'React / Vite', dataStorage: 'Supabase (cmuvomnmaoseccxpeuxq) — briefings, projects, ideas, todos', description: 'Daily intelligence dashboard. Morning briefings, call notes, portfolio tracking, agent ecosystem map.', lastDeployed: '2026-04-10', notes: 'Primary HUD. Mr. Build deploys via SSH to Mac M5.' },
  { name: 'Project Diablo', repo: 'ds016683/project-diablo', url: 'https://project-diablo.vercel.app', status: 'active', visibility: 'private', hosting: 'Vercel', deploy: 'git push → Vercel auto-deploy', stack: 'React / Vite', dataStorage: 'TBD', description: 'Commercializing the Sovereign Architect framework. Assessment + personality profiling app.', lastDeployed: '2026-04-07', notes: 'Private beta May-June 2026. Mr. Diablo handles engineering.' },
  { name: 'NACDD Knowledge Platform', repo: 'ds016683/nacdd-knowledge-platform', url: 'https://nacdd-knowledge-platform.vercel.app', status: 'active', visibility: 'private', hosting: 'Vercel', deploy: 'git push → Vercel auto-deploy', stack: 'Unknown', dataStorage: 'Unknown', description: 'AI-powered knowledge platform demo/sandbox for NACDD client.', lastDeployed: '2026-04-06', notes: 'Client-facing demo.' },
  { name: 'Lumen API', repo: 'ds016683/lumen-api', url: null, status: 'active', visibility: 'private', hosting: 'PM2 on DavidPC', deploy: 'PM2 process manager (ecosystem.config.cjs)', stack: 'Node.js / Express', dataStorage: 'None (stateless webhook handler)', description: "Vapi webhook backend. Gives Lumen voice calls access to David's context and tools.", lastDeployed: '2026-04-10', notes: 'Runs on DavidPC at home office. Vapi assistant ID: 62dd6701. Phone: +16308691113.' },
  { name: 'AHA Cardiovascular Index', repo: 'ds016683/aha-cardiovascular-index', url: 'https://ds016683.github.io/aha-cardiovascular-index/', status: 'active', visibility: 'public', hosting: 'GitHub Pages', deploy: 'GitHub Pages', stack: 'Unknown', dataStorage: 'None (static)', description: 'AHA Cardiovascular Prevention Index — evidence-based guideline implementation tracker.', lastDeployed: '2026-04-06', notes: '' },
  { name: 'BH Rate Intelligence', repo: 'ds016683/bh-rate-intelligence', url: null, status: 'active', visibility: 'private', hosting: 'Vercel', deploy: 'git push → Vercel auto-deploy', stack: 'Unknown', dataStorage: 'Unknown', description: 'Behavioral health rate analytics platform for THS internal use.', lastDeployed: '2026-03-29', notes: 'No public URL configured in GitHub.' },
  { name: 'Project Dante', repo: 'ds016683/project-dante', url: 'https://ds016683.github.io/project-dante/', status: 'active', visibility: 'public', hosting: 'GitHub Pages', deploy: 'GitHub Pages', stack: 'Unknown', dataStorage: 'None (static)', description: 'Sovereign Architect book + product collaboration (David Smith + Sabina Beachdell).', lastDeployed: '2026-04-02', notes: '' },
  { name: 'Project Heart', repo: 'ds016683/project-heart', url: null, status: 'deprecated', visibility: 'private', hosting: 'None', deploy: 'None', stack: 'Unknown', dataStorage: 'Unknown', description: 'THS x AHA Cardiovascular Transparency Dashboard. Flagged for deletion.', lastDeployed: '2026-03-23', notes: 'Premature — flagged to delete.' },
]

function SiteDetailPanel({ site, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, background: '#fff', borderLeft: `2px solid ${THS_COLORS.gold}`, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', zIndex: 500, display: 'flex', flexDirection: 'column', fontFamily: 'Arial, Helvetica, sans-serif', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${THS_COLORS.gold}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: THS_COLORS.darkBlue }}>{site.name}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4, display: 'flex' }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, margin: 0 }}>{site.description}</p>
        {[
          ['Repo', site.repo],
          ['Hosting', site.hosting],
          ['Deploy', site.deploy],
          ['Stack', site.stack],
          ['Data Storage', site.dataStorage],
          ['Last Deployed', site.lastDeployed],
          ['Notes', site.notes],
        ].filter(([, v]) => v).map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12, color: THS_COLORS.darkBlue, fontFamily: "'Courier New', monospace" }}>{val}</div>
          </div>
        ))}
        {site.url && (
          <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: "'Courier New', monospace", color: '#2D9CDB', border: '1px solid rgba(45,156,219,0.35)', borderRadius: 6, padding: '10px 14px', textDecoration: 'none' }}>
            <ExternalLink size={12} />
            Open App
          </a>
        )}
      </div>
    </div>
  )
}

function DeployedSitesTab() {
  const [selectedSite, setSelectedSite] = useState(null)
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {DEPLOYED_SITES.map(site => {
          const isDeprecated = site.status === 'deprecated'
          return (
            <div
              key={site.repo}
              onClick={() => setSelectedSite(selectedSite?.repo === site.repo ? null : site)}
              style={{ padding: 18, border: `1px solid ${selectedSite?.repo === site.repo ? THS_COLORS.mediumBlue : THS_COLORS.gold}`, borderRadius: 10, background: '#fff', boxShadow: selectedSite?.repo === site.repo ? '0 2px 12px rgba(35,77,139,0.12)' : '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'all 0.15s ease', opacity: isDeprecated ? 0.65 : 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THS_COLORS.darkBlue, fontFamily: 'Cinzel, serif', lineHeight: 1.3 }}>{site.name}</div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em', background: isDeprecated ? '#fee2e2' : '#dcfce7', color: isDeprecated ? '#dc2626' : '#16a34a' }}>
                    {site.status}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em', background: site.visibility === 'public' ? THS_COLORS.lightBlueBg : '#f3f4f6', color: site.visibility === 'public' ? THS_COLORS.mediumBlue : '#6b7280' }}>
                    {site.visibility}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#555', lineHeight: 1.5, margin: 0 }}>{site.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[site.stack, site.hosting].filter(Boolean).map(chip => (
                  <span key={chip} style={{ fontSize: 10, fontFamily: "'Courier New', monospace", padding: '2px 7px', borderRadius: 4, background: THS_COLORS.lightBlueBg, color: THS_COLORS.mediumBlue, border: `1px solid rgba(35,77,139,0.15)` }}>{chip}</span>
                ))}
              </div>
              {site.url && (
                <a href={site.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: "'Courier New', monospace", color: '#2D9CDB', border: '1px solid rgba(45,156,219,0.3)', borderRadius: 6, padding: '7px 10px', textDecoration: 'none' }}>
                  <ExternalLink size={11} />
                  Open App
                </a>
              )}
            </div>
          )
        })}
      </div>
      {selectedSite && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 499 }} onClick={() => setSelectedSite(null)} />
          <SiteDetailPanel site={selectedSite} onClose={() => setSelectedSite(null)} />
        </>
      )}
    </div>
  )
}

// ── Connections Map (hub-and-spoke) ───────────────────────────────────────────

const CONN_VW = 1000, CONN_VH = 680, CONN_CX = 500, CONN_CY = 370
const HUB_R = 185, LEAF_R = 130

const CONN_HUBS = [
  { id: 'hub-agents', label: 'AI Agents',          shortLabel: 'AI Agents',  color: '#F59E0B', angle: 0,   fanWidth: 50, summary: '8 specialist agents orchestrated via Discord channels' },
  { id: 'hub-comms',  label: 'Communication Tools', shortLabel: 'Comms',      color: '#7C3AED', angle: 72,  fanWidth: 40, summary: 'Signal, WhatsApp, Discord, Slack, Gmail, Outlook, Vapi' },
  { id: 'hub-data',   label: 'Data & Analytics',    shortLabel: 'Data',       color: '#059669', angle: 144, fanWidth: 35, summary: 'Supabase, Granola, Harvest, Notion, OpenRouter' },
  { id: 'hub-apps',   label: 'Deployed Apps',       shortLabel: 'Apps',       color: '#2563EB', angle: 216, fanWidth: 35, summary: '6+ projects across GitHub Pages, Vercel, and DavidPC' },
  { id: 'hub-infra',  label: 'Dev Infrastructure',  shortLabel: 'Infra',      color: '#DC2626', angle: 288, fanWidth: 30, summary: 'GitHub, DavidPC, Mac M5, Tailscale, Claude Code' },
]

const CONN_LEAVES = [
  // AI Agents
  { id: 'l-mr-brief',  hub: 'hub-agents', label: 'Mr. Brief',   status: 'active',  description: 'Pre-call research specialist. Reads Slack DMs, emails, Granola notes. Never sends David into a meeting cold.', connectedTo: ['Gmail', 'Outlook/Calendar', 'Slack', 'Granola'] },
  { id: 'l-mr-scout',  hub: 'hub-agents', label: 'Mr. Scout',   status: 'active',  description: "Curious and relentless. Research engine. Finds the connection chain David doesn't have time to dig for. Runs on Kimi K2 (1T param model).", notes: 'Model: kimi-k2', connectedTo: ['Lumen', 'OpenRouter'] },
  { id: 'l-mr-draft',  hub: 'hub-agents', label: 'Mr. Draft',   status: 'active',  description: "Clean and efficient. Speaks in David's voice when drafting. Tea Leaves content understands the publication's tone.", connectedTo: ['Gmail', 'Outlook/Calendar'] },
  { id: 'l-mr-watch',  hub: 'hub-agents', label: 'Mr. Watch',   status: 'active',  description: 'Quiet and vigilant. Escalates only when something actually needs attention. Does not cry wolf. Runs hourly heartbeat.', connectedTo: ['Gmail', 'Outlook/Calendar', 'Granola', 'Slack'] },
  { id: 'l-mr-build',  hub: 'hub-agents', label: 'Mr. Build',   status: 'active',  description: 'Technical and precise. Quick scripts run directly. Complex multi-file work handed to Claude Code via SSH to Mac M5.', connectedTo: ['Claude Code', 'Mac M5 (node)', 'GitHub (ds016683)'] },
  { id: 'l-mr-pulse',  hub: 'hub-agents', label: 'Mr. Pulse',   status: 'active',  description: 'Analytical and concise. Starset data, portfolio metrics, Supabase queries. Returns structured answers.', connectedTo: ['Supabase (SA HUD)', 'Supabase (main)', 'Harvest'] },
  { id: 'l-mr-diablo', hub: 'hub-agents', label: 'Mr. Diablo',  status: 'active',  description: 'Dedicated engineering agent for Project Diablo. Stages build briefs at workspace/tmp/ for Claude Code handoff.', connectedTo: ['Claude Code', 'project-diablo'] },
  { id: 'l-mr-deck',   hub: 'hub-agents', label: 'Mr. Deck',    status: 'planned', description: 'Visual and executive-polish minded. PowerPoint decks, TH-branded slides. Brand palette: darkBlue #1A3A5C, gold #F8C762.', connectedTo: ['Lumen'] },
  // Communication Tools
  { id: 'l-signal',   hub: 'hub-comms', label: 'Signal',          status: 'active', description: "Lumen's primary messaging channel. Dedicated number +16302967614.", notes: '+16302967614', connectedTo: ['Lumen'] },
  { id: 'l-whatsapp', hub: 'hub-comms', label: 'WhatsApp',         status: 'active', description: 'WhatsApp messaging integration.', connectedTo: ['Lumen'] },
  { id: 'l-discord',  hub: 'hub-comms', label: 'Discord',          status: 'active', description: 'Agent channels hub. Each agent has a dedicated Discord channel for direct tasking.', connectedTo: ['Lumen', 'AI Agents'] },
  { id: 'l-slack',    hub: 'hub-comms', label: 'Slack',            status: 'active', description: 'Third Horizon workspace. Read, search, limited write access.', connectedTo: ['Lumen', 'Mr. Brief', 'Mr. Watch'] },
  { id: 'l-gmail',    hub: 'hub-comms', label: 'Gmail',            status: 'active', description: 'Personal Gmail (david.e.smith8@gmail.com). Read-only monitoring.', connectedTo: ['Lumen', 'Mr. Brief', 'Mr. Watch'] },
  { id: 'l-outlook',  hub: 'hub-comms', label: 'Outlook/Calendar', status: 'active', description: 'Microsoft Graph — THS email and calendar. Full read/write. Lumen@thirdhorizon.com.', connectedTo: ['Lumen', 'Mr. Brief', 'Mr. Watch'] },
  { id: 'l-vapi',     hub: 'hub-comms', label: 'Vapi (voice)',     status: 'active', description: 'Voice call interface. Assistant ID: 62dd6701. Phone: +16308691113. Routes to Lumen API on DavidPC.', notes: '+16308691113', connectedTo: ['Lumen API'] },
  // Data & Analytics
  { id: 'l-supa-hud',  hub: 'hub-data', label: 'Supabase (SA HUD)', status: 'active', description: 'PostgreSQL backend for SA HUD. Stores briefings, projects, ideas, todos.', notes: 'cmuvomnmaoseccxpeuxq', connectedTo: ['sa-hud', 'Lumen'] },
  { id: 'l-supa-main', hub: 'hub-data', label: 'Supabase (main)',   status: 'active', description: 'Main PostgreSQL backend for MMA Tracker and other tools.', connectedTo: ['Lumen', 'Mr. Pulse'] },
  { id: 'l-granola',   hub: 'hub-data', label: 'Granola',           status: 'active', description: 'AI note-taker for meetings. Call notes routed to SA HUD via Mr. Watch.', connectedTo: ['Mr. Brief', 'Mr. Watch', 'Supabase (SA HUD)'] },
  { id: 'l-harvest',   hub: 'hub-data', label: 'Harvest',           status: 'active', description: 'Time tracking and expense management. Full read/write — Lumen can log time and view reports.', connectedTo: ['Lumen', 'Mr. Pulse'] },
  { id: 'l-notion',    hub: 'hub-data', label: 'Notion',            status: 'active', description: 'Docs and knowledge base.', connectedTo: ['Lumen'] },
  { id: 'l-openrouter',hub: 'hub-data', label: 'OpenRouter',        status: 'active', description: 'Unified API gateway for LLM routing. Routes to Anthropic, Google, Kimi, OpenAI. Activity logs at /api/v1/generation.', connectedTo: ['Lumen', 'Mr. Scout'] },
  // Deployed Apps
  { id: 'l-sa-hud',    hub: 'hub-apps', label: 'sa-hud',                   status: 'active', description: 'Sovereign Architect HUD. Daily intelligence dashboard, morning briefings, portfolio, ecosystem map.', notes: 'GitHub Pages', connectedTo: ['Supabase (SA HUD)'], link: 'https://ds016683.github.io/sa-hud/' },
  { id: 'l-diablo',    hub: 'hub-apps', label: 'project-diablo',           status: 'active', description: 'Commercializing the SA framework. Assessment + personality profiling. Private beta May-June 2026.', notes: 'Vercel auto-deploy', connectedTo: ['Mr. Diablo'] },
  { id: 'l-nacdd',     hub: 'hub-apps', label: 'nacdd-platform',           status: 'active', description: 'AI-powered knowledge platform demo/sandbox for NACDD client.', notes: 'Vercel auto-deploy', connectedTo: [] },
  { id: 'l-lumen-api', hub: 'hub-apps', label: 'lumen-api',                status: 'active', description: "Vapi webhook backend. Stateless — gives Lumen voice calls access to David's context. PM2 on DavidPC.", notes: 'PM2 on DavidPC', connectedTo: ['Vapi (voice)', 'Lumen'] },
  { id: 'l-aha',       hub: 'hub-apps', label: 'aha-cardiovascular',       status: 'active', description: 'AHA Cardiovascular Prevention Index — evidence-based guideline implementation tracker.', notes: 'GitHub Pages', connectedTo: [], link: 'https://ds016683.github.io/aha-cardiovascular-index/' },
  { id: 'l-bh-rate',   hub: 'hub-apps', label: 'bh-rate-intelligence',     status: 'active', description: 'Behavioral health rate analytics platform for THS internal use.', notes: 'Vercel auto-deploy', connectedTo: [] },
  // Dev Infrastructure
  { id: 'l-github',      hub: 'hub-infra', label: 'GitHub (ds016683)', status: 'active', description: 'Primary GitHub account. Source of truth for all repos. SSH + token access.', connectedTo: ['Mr. Build', 'Claude Code'], link: 'https://github.com/ds016683' },
  { id: 'l-davidpc',     hub: 'hub-infra', label: 'DavidPC (gateway)', status: 'active', description: 'Primary host. Windows 10, always on. Runs OpenClaw/Lumen gateway and lumen-api.', notes: '100.69.104.93', connectedTo: ['Tailscale', 'lumen-api'] },
  { id: 'l-mac-m5',      hub: 'hub-infra', label: 'Mac M5 (node)',     status: 'active', description: 'Secondary machine. Apple Silicon M5, macOS 26. Claude Code runs here.', notes: '100.73.172.56', connectedTo: ['Tailscale', 'Claude Code'] },
  { id: 'l-tailscale',   hub: 'hub-infra', label: 'Tailscale',         status: 'active', description: 'Private VPN mesh connecting DavidPC and Mac M5. Secure remote access via WireGuard.', connectedTo: ['DavidPC (gateway)', 'Mac M5 (node)'] },
  { id: 'l-claude-code', hub: 'hub-infra', label: 'Claude Code',       status: 'active', description: 'AI coding agent. Runs on Mac M5 via SSH from DavidPC. Used for complex multi-file dev work.', connectedTo: ['Mac M5 (node)', 'Mr. Build', 'Mr. Diablo'] },
]

function buildConnLayout() {
  const hubs = CONN_HUBS.map(hub => {
    const rad = (hub.angle - 90) * (Math.PI / 180)
    return { ...hub, x: CONN_CX + HUB_R * Math.cos(rad), y: CONN_CY + HUB_R * Math.sin(rad) }
  })
  const leaves = []
  hubs.forEach(hub => {
    const hubLeaves = CONN_LEAVES.filter(l => l.hub === hub.id)
    const N = hubLeaves.length
    hubLeaves.forEach((leaf, i) => {
      const t = N === 1 ? 0.5 : i / (N - 1)
      const angle = hub.angle + (t - 0.5) * 2 * hub.fanWidth
      const rad = (angle - 90) * (Math.PI / 180)
      leaves.push({ ...leaf, x: hub.x + LEAF_R * Math.cos(rad), y: hub.y + LEAF_R * Math.sin(rad), hubColor: hub.color })
    })
  })
  return { hubs, leaves }
}
const CONN_LAYOUT = buildConnLayout()

function ConnLeafPanel({ leaf, onClose }) {
  const hub = CONN_HUBS.find(h => h.id === leaf.hub)
  const hubColor = leaf.hubColor
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: hubColor, margin: 0 }}>{leaf.label}</h3>
          <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{hub?.label}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 2, display: 'flex' }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: leaf.status === 'active' ? '#dcfce7' : '#fff3e0', color: leaf.status === 'active' ? '#16a34a' : '#e65100', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{leaf.status}</span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: `${hubColor}18`, color: hubColor, border: `1px solid ${hubColor}35`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{hub?.shortLabel}</span>
      </div>
      <p style={{ fontSize: 12, lineHeight: 1.7, color: '#444', marginBottom: 12 }}>{leaf.description}</p>
      {leaf.notes && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 4 }}>Key Info</p>
          <code style={{ fontSize: 11, color: THS_COLORS.darkBlue, fontFamily: "'Courier New', monospace" }}>{leaf.notes}</code>
        </div>
      )}
      {leaf.connectedTo?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 6 }}>Connected to</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {leaf.connectedTo.map(c => (
              <span key={c} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: THS_COLORS.lightBlueBg, color: THS_COLORS.mediumBlue, border: `1px solid rgba(35,77,139,0.18)`, fontFamily: "'Courier New', monospace" }}>{c}</span>
            ))}
          </div>
        </div>
      )}
      {leaf.link && (
        <a href={leaf.link} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: "'Courier New', monospace", color: '#2D9CDB', border: '1px solid rgba(45,156,219,0.3)', borderRadius: 6, padding: '8px 12px', textDecoration: 'none' }}>
          <ExternalLink size={11} />
          Open Link
        </a>
      )}
    </div>
  )
}

function ConnHubPanel({ hub, onClose }) {
  const leaves = CONN_LEAVES.filter(l => l.hub === hub.id)
  const active = leaves.filter(l => l.status === 'active').length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, color: hub.color, margin: 0 }}>{hub.label}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 2, display: 'flex' }}>
          <X size={15} />
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>{hub.summary}</p>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: 8 }}>
        {leaves.length} nodes · {active} active
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {leaves.map(leaf => (
          <div key={leaf.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: THS_COLORS.lightBlueBg, border: `1px solid rgba(35,77,139,0.12)`, fontSize: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: leaf.status === 'active' ? '#22c55e' : '#f59e0b', flexShrink: 0 }} />
            <span style={{ color: THS_COLORS.darkBlue, fontWeight: 600, fontFamily: "'Courier New', monospace" }}>{leaf.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectionsMap() {
  const [selectedHub, setSelectedHub] = useState(null)
  const [selectedLeaf, setSelectedLeaf] = useState(null)

  const selectedHubData = selectedHub ? CONN_HUBS.find(h => h.id === selectedHub) : null
  const selectedLeafData = selectedLeaf ? CONN_LAYOUT.leaves.find(l => l.id === selectedLeaf) : null
  const panelOpen = !!(selectedHubData || selectedLeafData)
  const hubLeafSet = selectedHub ? new Set(CONN_LEAVES.filter(l => l.hub === selectedHub).map(l => l.id)) : null

  const handleBgClick = () => { setSelectedHub(null); setSelectedLeaf(null) }
  const handleHubClick = (e, hubId) => { e.stopPropagation(); setSelectedHub(hubId === selectedHub ? null : hubId); setSelectedLeaf(null) }
  const handleLeafClick = (e, leafId) => { e.stopPropagation(); setSelectedLeaf(leafId === selectedLeaf ? null : leafId); setSelectedHub(null) }

  return (
    <div className="flex gap-4 flex-col lg:flex-row">
      <div className="flex-1 bg-white border border-game-border rounded-lg overflow-hidden shadow-sm" style={{ minHeight: 420 }}>
        <svg viewBox={`0 0 ${CONN_VW} ${CONN_VH}`} width="100%" style={{ display: 'block', background: '#F8F7FF' }} onClick={handleBgClick}>
          <defs>
            <radialGradient id="connCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(245,158,11,0.18)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0)" />
            </radialGradient>
          </defs>
          <ellipse cx={CONN_CX} cy={CONN_CY} rx={90} ry={72} fill="url(#connCenterGlow)" />

          {/* Center-to-hub lines */}
          {CONN_LAYOUT.hubs.map(hub => (
            <line key={`ch-${hub.id}`} x1={CONN_CX} y1={CONN_CY} x2={hub.x} y2={hub.y}
              stroke={hub.color} strokeWidth={selectedHub === hub.id ? 2 : 1}
              strokeOpacity={selectedHub && selectedHub !== hub.id ? 0.12 : 0.5} />
          ))}

          {/* Hub-to-leaf lines */}
          {CONN_LAYOUT.leaves.map(leaf => {
            const hub = CONN_LAYOUT.hubs.find(h => h.id === leaf.hub)
            const isHighlighted = hubLeafSet?.has(leaf.id) || selectedLeaf === leaf.id
            const dimmed = (selectedHub || selectedLeaf) && !isHighlighted
            return (
              <line key={`hl-${leaf.id}`} x1={hub.x} y1={hub.y} x2={leaf.x} y2={leaf.y}
                stroke={leaf.hubColor} strokeWidth={isHighlighted ? 1.5 : 0.75}
                strokeOpacity={dimmed ? 0.06 : isHighlighted ? 0.7 : 0.28}
                strokeDasharray={leaf.status === 'planned' ? '4 3' : undefined} />
            )
          })}

          {/* Leaf nodes */}
          {CONN_LAYOUT.leaves.map(leaf => {
            const isHighlighted = hubLeafSet?.has(leaf.id) || selectedLeaf === leaf.id
            const dimmed = (selectedHub || selectedLeaf) && !isHighlighted
            return (
              <g key={leaf.id} transform={`translate(${leaf.x},${leaf.y})`}
                onClick={(e) => handleLeafClick(e, leaf.id)} style={{ cursor: 'pointer' }}>
                {selectedLeaf === leaf.id && (
                  <circle cx={0} cy={0} r={18} fill="none" stroke={leaf.hubColor} strokeWidth={1.5} opacity={0.7} />
                )}
                <circle cx={0} cy={0} r={11}
                  fill={isHighlighted ? `${leaf.hubColor}22` : '#f4f4f8'}
                  stroke={leaf.hubColor} strokeWidth={isHighlighted ? 1.5 : 1}
                  opacity={dimmed ? 0.2 : 1}
                  strokeDasharray={leaf.status === 'planned' ? '3 2' : undefined} />
                <text y={21} textAnchor="middle" fill={dimmed ? '#ccc' : '#444'}
                  fontSize={7.5} fontFamily="'Courier New', monospace"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {leaf.label.length > 16 ? leaf.label.slice(0, 15) + '…' : leaf.label}
                </text>
              </g>
            )
          })}

          {/* Hub nodes */}
          {CONN_LAYOUT.hubs.map(hub => {
            const isSel = selectedHub === hub.id
            const dimmed = selectedHub && !isSel
            return (
              <g key={hub.id} transform={`translate(${hub.x},${hub.y})`}
                onClick={(e) => handleHubClick(e, hub.id)} style={{ cursor: 'pointer' }}>
                {isSel && <circle cx={0} cy={0} r={34} fill="none" stroke={hub.color} strokeWidth={2} opacity={0.55} />}
                <circle cx={0} cy={0} r={25}
                  fill={isSel ? `${hub.color}22` : `${hub.color}0e`}
                  stroke={hub.color} strokeWidth={isSel ? 2 : 1.5}
                  opacity={dimmed ? 0.3 : 1} />
                <text y={4} textAnchor="middle" fill={hub.color}
                  fontSize={10} fontFamily="Cinzel, serif" fontWeight="700"
                  opacity={dimmed ? 0.3 : 1}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {hub.shortLabel}
                </text>
                <text y={37} textAnchor="middle" fill={hub.color}
                  fontSize={8.5} fontFamily="'Courier New', monospace" fontWeight="600"
                  opacity={dimmed ? 0.3 : 0.85}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {hub.label}
                </text>
              </g>
            )
          })}

          {/* Center node */}
          <g transform={`translate(${CONN_CX},${CONN_CY})`}>
            <circle cx={0} cy={0} r={40} fill="none" stroke="#F59E0B" strokeWidth={1} opacity={0.18} />
            <circle cx={0} cy={0} r={28} fill="rgba(245,158,11,0.1)" stroke="#F59E0B" strokeWidth={2.5} />
            <text y={-3} textAnchor="middle" fill="#F59E0B" fontSize={13} fontFamily="Cinzel, serif" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>Lumen</text>
            <text y={11} textAnchor="middle" fill="#F59E0B" fontSize={7.5} fontFamily="'Courier New', monospace" style={{ pointerEvents: 'none', userSelect: 'none' }}>AI Assistant</text>
          </g>
        </svg>
      </div>
      <div className={`lg:w-72 xl:w-80 transition-all duration-200 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}`}>
        <div className="bg-white border border-game-border rounded-lg p-4 shadow-sm" style={{ minHeight: 320 }}>
          {selectedLeafData ? (
            <ConnLeafPanel leaf={selectedLeafData} onClose={() => setSelectedLeaf(null)} />
          ) : selectedHubData ? (
            <ConnHubPanel hub={selectedHubData} onClose={() => setSelectedHub(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Network size={32} className="text-game-text-dim mb-3" />
              <p className="text-game-text-dim text-xs font-mono uppercase tracking-wider">Select a node</p>
              <p className="text-game-text-subtle text-[10px] mt-1">Hub = category · Leaf = tool/service</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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

/*
 * CostDashboardTab — current state assessment (2026-04-10):
 *
 * DATA SOURCE: Reads from Supabase `cost_tracking` table via REST API.
 *   The table does NOT yet exist — all fetches return errors/empty arrays.
 *
 * WHAT IT WAS DISPLAYING: 3 stat cards (Today's Spend, 30-Day Total, Daily Average)
 *   + hardcoded agent list (Router, Strategy, Code, Design, Data, Voice, CostWatch)
 *   with $0.00 placeholders. The agent list was stale/wrong (those aren't the actual agents).
 *
 * BROKEN: cost_tracking table doesn't exist yet → migration SQL block is at top of file.
 * MISSING: auto-refresh, "Recent API Calls" table, per-model breakdown, empty state with SQL.
 *
 * NOTE on OpenRouter: OpenRouter /api/v1/generation endpoint has activity logs.
 * Future pass can pull cost data directly from OpenRouter instead of Supabase writes.
 */
function CostDashboardTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const SUPA_URL = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

  const MIGRATION_SQL = `CREATE TABLE cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  model text NOT NULL,
  provider text NOT NULL,
  agent text,
  task_type text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  session_id text,
  channel text
);`

  const fetchData = useCallback(() => {
    const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    fetch(`${SUPA_URL}/rest/v1/cost_tracking?created_at=gte.${sevenDaysAgo}&order=created_at.desc&limit=200`, { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRows(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const today = new Date().toISOString().split('T')[0]
  const todayCost = rows.filter(r => r.created_at?.startsWith(today)).reduce((s, r) => s + (r.cost_usd || 0), 0)
  const weekCost = rows.reduce((s, r) => s + (r.cost_usd || 0), 0)
  const topModelToday = (() => {
    const todayRows = rows.filter(r => r.created_at?.startsWith(today))
    if (!todayRows.length) return '—'
    const byModel = {}
    todayRows.forEach(r => { byModel[r.model] = (byModel[r.model] || 0) + (r.cost_usd || 0) })
    return Object.entries(byModel).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  })()

  // Group rows by model for 7-day table
  const byModel = {}
  rows.forEach(r => { byModel[r.model] = (byModel[r.model] || 0) + (r.cost_usd || 0) })
  const modelRows = Object.entries(byModel).sort((a, b) => b[1] - a[1])

  const statCard = (label, value) => (
    <div key={label} style={{ flex: 1, padding: '14px 18px', background: '#fff', border: `1px solid ${THS_COLORS.gold}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: THS_COLORS.mediumBlue, fontFamily: "'Courier New', monospace" }}>{value}</div>
    </div>
  )

  if (!loading && rows.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {statCard("Today's Cost", '$0.00')}
          {statCard('This Week', '$0.00')}
          {statCard('Top Model Today', '—')}
        </div>
        <div style={{ padding: 24, border: `2px dashed ${THS_COLORS.gold}`, borderRadius: 10, background: THS_COLORS.lightBlueBg, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 8 }}>No data yet — cost_tracking table needs to be created</div>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>Run this SQL in the Supabase SQL editor, then agents can write cost data on each LLM call.</p>
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <pre style={{ background: '#1e1e2e', color: '#cdd6f4', borderRadius: 8, padding: 16, fontSize: 12, fontFamily: "'Courier New', monospace", overflowX: 'auto', margin: 0 }}>{MIGRATION_SQL}</pre>
            <button
              onClick={() => { navigator.clipboard?.writeText(MIGRATION_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', background: copied ? '#22c55e' : THS_COLORS.mediumBlue, color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
            >
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCard("Today's Cost", loading ? '...' : `$${todayCost.toFixed(4)}`)}
        {statCard('This Week', loading ? '...' : `$${weekCost.toFixed(4)}`)}
        {statCard('Top Model Today', loading ? '...' : topModelToday)}
      </div>

      {modelRows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost by Model — Last 7 Days</h3>
          <div style={{ border: `1px solid ${THS_COLORS.gold}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: THS_COLORS.darkBlue, color: '#fff' }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Model</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, fontSize: 11 }}>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelRows.map(([model, cost], i) => (
                  <tr key={model} style={{ background: i % 2 === 0 ? '#fff' : THS_COLORS.lightBlueBg }}>
                    <td style={{ padding: '8px 14px', fontFamily: "'Courier New', monospace", color: '#333' }}>{model}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: THS_COLORS.mediumBlue }}>${cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: 13, fontWeight: 700, color: THS_COLORS.darkBlue, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent API Calls</h3>
      <div style={{ border: `1px solid ${THS_COLORS.gold}`, borderRadius: 8, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 600 }}>
          <thead>
            <tr style={{ background: THS_COLORS.darkBlue, color: '#fff' }}>
              {['Time', 'Agent', 'Model', 'Task Type', 'Tokens In', 'Tokens Out', 'Cost'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : THS_COLORS.lightBlueBg, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '6px 12px', fontFamily: "'Courier New', monospace", color: '#666', whiteSpace: 'nowrap' }}>
                  {new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '6px 12px', color: '#333' }}>{r.agent || '—'}</td>
                <td style={{ padding: '6px 12px', fontFamily: "'Courier New', monospace", color: THS_COLORS.mediumBlue }}>{r.model}</td>
                <td style={{ padding: '6px 12px', color: '#555' }}>{r.task_type || '—'}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#666' }}>{r.input_tokens?.toLocaleString() || '—'}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#666' }}>{r.output_tokens?.toLocaleString() || '—'}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: THS_COLORS.mediumBlue }}>${(r.cost_usd || 0).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: 12 }}>No data</div>
        )}
      </div>
    </div>
  )
}

export default function EcosystemPage() {
  const [activeTab, setActiveTab] = useState('network')

  const tabs = [
    { id: 'network', label: 'Connections Map' },
    { id: 'org', label: 'Agent Org Chart' },
    { id: 'sites', label: 'Deployed Sites' },
    { id: 'cost', label: 'Cost Dashboard' },
    { id: 'instructions', label: 'How to Use' },
  ]

  return (
    <div className="w-full min-h-screen p-3 md:p-6">
      <div className="game-panel p-3 mb-4">
        <div>
          <h1 className="font-game text-xl text-[#2D1B69]">ECOSYSTEM</h1>
          <p className="text-game-text-dim text-xs mt-0.5">
            {activeTab === 'network' ? `${CONN_LAYOUT.hubs.length} hubs · ${CONN_LEAVES.length} nodes` : ''}
          </p>
        </div>
      </div>

      <div style={{ background: '#fff', marginBottom: 16 }}>
        <TabButtons activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      </div>

      {activeTab === 'network' && <ConnectionsMap />}

      {activeTab === 'cost' && (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <CostDashboardTab />
        </div>
      )}

      {activeTab === 'org' && <AgentOrgChart />}

      {activeTab === 'sites' && <DeployedSitesTab />}

      {activeTab === 'instructions' && <UseInstructionsTab />}

      <div className="mt-4 text-center text-game-text-dim text-[10px] font-mono uppercase tracking-wider">
        Lumen · OpenClaw Gateway · DavidPC · Always On
      </div>
    </div>
  )
}
