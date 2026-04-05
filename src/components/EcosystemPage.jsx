import { useState } from 'react'

const CATEGORIES = [
  {
    id: 'communication',
    label: 'Communication',
    color: '#009DE0',
    angle: 0,
    nodes: [
      { id: 'signal',    label: 'Signal',         sub: 'Primary channel' },
      { id: 'graph',     label: 'Graph API / O365', sub: 'Email + Calendar' },
      { id: 'slack',     label: 'Slack',           sub: 'Team comms' },
      { id: 'zoom',      label: 'Zoom API',        sub: 'Meetings (planned)' },
    ]
  },
  {
    id: 'data',
    label: 'Data & Intelligence',
    color: '#00968F',
    angle: 72,
    nodes: [
      { id: 'starset',   label: 'Starset Analytics', sub: '150B+ claims' },
      { id: 'clarity',   label: 'Clarity',           sub: 'Cost intelligence' },
      { id: 'bh-rate',   label: 'BH Rate Intel',     sub: 'Rate benchmarking' },
      { id: 'naic',      label: 'NAIC Data',         sub: 'Deep dive pending' },
    ]
  },
  {
    id: 'platforms',
    label: 'Client Platforms',
    color: '#6D28D9',
    angle: 144,
    nodes: [
      { id: 'mma',       label: 'MMA Tracker',      sub: 'Project management' },
      { id: 'achp',      label: 'ACHP Intel',        sub: 'Policy AI' },
      { id: 'apex',      label: 'Apex Media',        sub: 'Studio booking' },
    ]
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    color: '#DC2626',
    angle: 216,
    nodes: [
      { id: 'github',    label: 'GitHub',            sub: 'ds016683' },
      { id: 'supabase',  label: 'Supabase',          sub: 'SA HUD + MMA data' },
      { id: 'vercel',    label: 'Vercel',             sub: 'Frontend hosting' },
      { id: 'flyio',     label: 'Fly.io',             sub: 'Backend apps' },
      { id: 'tailscale', label: 'Tailscale',          sub: 'Secure network' },
    ]
  },
  {
    id: 'integrations',
    label: 'Integrations',
    color: '#FF8C00',
    angle: 288,
    nodes: [
      { id: 'harvest',   label: 'Harvest',           sub: 'Time & expenses' },
      { id: 'anthropic', label: 'Anthropic API',      sub: 'Claude models' },
      { id: 'openai',    label: 'OpenAI',             sub: 'Whisper + GPT' },
      { id: 'vapi',      label: 'Vapi Voice',         sub: 'Voice interface' },
      { id: 'granola',   label: 'Granola',            sub: 'Meeting notes (planned)' },
    ]
  },
]

const CX = 500  // center x
const CY = 420  // center y
const CAT_R = 190  // category node radius from center
const NODE_R = 290 // leaf node radius from center

function toRad(deg) { return (deg * Math.PI) / 180 }

function catPos(angle) {
  return {
    x: CX + CAT_R * Math.cos(toRad(angle - 90)),
    y: CY + CAT_R * Math.sin(toRad(angle - 90)),
  }
}

function nodePos(angle, idx, total) {
  const spread = Math.min(40, 25 * (total - 1) / 2)
  const startAngle = angle - spread
  const step = total > 1 ? (spread * 2) / (total - 1) : 0
  const a = startAngle + step * idx
  return {
    x: CX + NODE_R * Math.cos(toRad(a - 90)),
    y: CY + NODE_R * Math.sin(toRad(a - 90)),
  }
}

export default function EcosystemPage() {
  const [active, setActive] = useState(null)

  const handleCatClick = (id) => setActive(prev => prev === id ? null : id)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 }}>Ecosystem Map</h1>
        <p style={{ fontSize: 13, color: '#8096B2', margin: '3px 0 0' }}>Click a category to expand its connections</p>
      </div>

      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <svg viewBox="0 0 1000 840" width="100%" style={{ display: 'block' }}>

          {/* Draw spokes to categories */}
          {CATEGORIES.map(cat => {
            const cp = catPos(cat.angle)
            const isActive = active === cat.id
            const isDimmed = active && !isActive
            return (
              <line key={`spoke-${cat.id}`}
                x1={CX} y1={CY} x2={cp.x} y2={cp.y}
                stroke={cat.color}
                strokeWidth={isActive ? 2 : 1.5}
                strokeOpacity={isDimmed ? 0.15 : isActive ? 0.9 : 0.4}
                strokeDasharray={isActive ? "none" : "6,4"}
              />
            )
          })}

          {/* Draw spokes to leaf nodes for active category */}
          {CATEGORIES.map(cat => {
            if (active !== cat.id) return null
            const cp = catPos(cat.angle)
            return cat.nodes.map((node, i) => {
              const np = nodePos(cat.angle, i, cat.nodes.length)
              return (
                <line key={`leaf-${node.id}`}
                  x1={cp.x} y1={cp.y} x2={np.x} y2={np.y}
                  stroke={cat.color} strokeWidth={1.5} strokeOpacity={0.6}
                />
              )
            })
          })}

          {/* Leaf nodes for active category */}
          {CATEGORIES.map(cat => {
            if (active !== cat.id) return null
            return cat.nodes.map((node, i) => {
              const np = nodePos(cat.angle, i, cat.nodes.length)
              return (
                <g key={`node-${node.id}`}>
                  <circle cx={np.x} cy={np.y} r={36} fill="white" stroke={cat.color} strokeWidth={1.5} />
                  <text x={np.x} y={np.y - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#002C77" fontFamily="Arial, sans-serif">{node.label}</text>
                  <text x={np.x} y={np.y + 10} textAnchor="middle" fontSize={9} fill="#8096B2" fontFamily="Arial, sans-serif">{node.sub}</text>
                </g>
              )
            })
          })}

          {/* Category nodes */}
          {CATEGORIES.map(cat => {
            const cp = catPos(cat.angle)
            const isActive = active === cat.id
            const isDimmed = active && !isActive
            const r = isActive ? 52 : 44
            return (
              <g key={`cat-${cat.id}`} onClick={() => handleCatClick(cat.id)} style={{ cursor: 'pointer' }}>
                <circle cx={cp.x} cy={cp.y} r={r + 4} fill={cat.color} fillOpacity={isActive ? 0.12 : 0.06}
                  opacity={isDimmed ? 0.3 : 1} />
                <circle cx={cp.x} cy={cp.y} r={r} fill={isActive ? cat.color : 'white'}
                  stroke={cat.color} strokeWidth={isActive ? 0 : 2}
                  opacity={isDimmed ? 0.3 : 1} />
                <text x={cp.x} y={cp.y - 4} textAnchor="middle"
                  fontSize={isActive ? 11 : 10} fontWeight={700}
                  fill={isActive ? 'white' : cat.color}
                  fontFamily="Arial, sans-serif"
                  opacity={isDimmed ? 0.3 : 1}>
                  {cat.label.split(' ').map((word, wi) => (
                    <tspan key={wi} x={cp.x} dy={wi === 0 ? 0 : 13}>{word}</tspan>
                  ))}
                </text>
                <text x={cp.x} y={cp.y + (cat.label.includes(' ') ? 20 : 14)} textAnchor="middle"
                  fontSize={9} fill={isActive ? 'rgba(255,255,255,0.8)' : '#8096B2'}
                  fontFamily="Arial, sans-serif"
                  opacity={isDimmed ? 0.3 : 1}>
                  {cat.nodes.length} nodes
                </text>
              </g>
            )
          })}

          {/* Center: Lumen */}
          <circle cx={CX} cy={CY} r={58} fill="#002C77" />
          <circle cx={CX} cy={CY} r={52} fill="white" />
          <circle cx={CX} cy={CY} r={48} fill="#002C77" fillOpacity={0.08} />
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize={16} fontWeight={800} fill="#002C77" fontFamily="Arial, sans-serif">LUMEN</text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fill="#8096B2" fontFamily="Arial, sans-serif">AI Operations</text>
          <text x={CX} y={CY + 23} textAnchor="middle" fontSize={9} fill="#009DE0" fontFamily="Arial, sans-serif">Third Horizon</text>

          {/* Pulse ring */}
          <circle cx={CX} cy={CY} r={62} fill="none" stroke="#F59E0B" strokeWidth={2} strokeOpacity={0.6} strokeDasharray="8,6" />

        </svg>
      </div>

      {/* Active category detail */}
      {active && (() => {
        const cat = CATEGORIES.find(c => c.id === active)
        return (
          <div style={{ marginTop: 16, background: 'white', border: `1.5px solid ${cat.color}40`, borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {cat.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cat.nodes.map(node => (
                <div key={node.id} style={{ background: cat.color + '0D', border: `1px solid ${cat.color}30`, borderRadius: 8, padding: '8px 14px', minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#002C77', marginBottom: 2 }}>{node.label}</div>
                  <div style={{ fontSize: 11, color: '#8096B2' }}>{node.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
