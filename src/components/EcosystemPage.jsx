import { useState, useEffect, useRef } from 'react'
import { ExternalLink, GitBranch, Database, Rocket, Users, ScrollText, ChevronDown } from 'lucide-react'
import { PageHead } from './sa/SaUi'
import { ROOT, GROUPS, PLATFORMS, LIFECYCLE_LABEL, LIFECYCLE_COLOR, HEALTH_COLOR, HEALTH_LABEL, effectiveState } from '../constants/ecosystemArchitecture'

const STATE = Object.fromEntries(PLATFORMS.map((p) => [p.id, effectiveState(p)]))
const stateOf = (id) => STATE[id]

// ---- Geometry, ported from the investor deck's hub-and-spoke surface ------
// Pixel geometry in an absolutely-positioned canvas centered on (0,0).
const HUB_RADIUS = 110
const RX_SPOKE = 330 // hub center -> horizontal spoke-card center
const RY_SPOKE = 292 // hub center -> vertical spoke-card center
const CARD_W = 252
const CARD_H = 128
const CARD_HW = CARD_W / 2
const CARD_HH = CARD_H / 2
const CHIP_W = 186
const CHIP_H = 52
const CHIP_GAP = 40
const CHIP_VSTEP = CHIP_H + 18
// Width driven by horizontal spokes (up to two outward chip columns);
// height by vertical spokes (chips flank the card left/right).
const NATURAL_W = 2 * (RX_SPOKE + CARD_HW + CHIP_GAP + CHIP_W + 16 + CHIP_W) + 170
const NATURAL_H = 2 * (RY_SPOKE + 160) + 130

// Angles: 0 = up, 90 = right, 180 = down, 270 = left (CIP convention).
const NODE_ANGLE = { client: 90, sandbox: 270, firm: 0, personal: 180 }
const NODE_HUE = Object.fromEntries(GROUPS.map((g) => [g.id, g.color]))

// Distance from a w×h box's center to its edge along (dx, dy).
function edgeInset(dx, dy, hw, hh) {
  const ex = Math.abs(dx) < 1e-6 ? Infinity : hw / Math.abs(dx)
  const ey = Math.abs(dy) < 1e-6 ? Infinity : hh / Math.abs(dy)
  return Math.min(ex, ey)
}
const calcInset = (dx, dy) => edgeInset(dx, dy, CARD_HW, CARD_HH)

// Horizontal cubic S-curve between two anchor points.
function curvePath(x1, y1, x2, y2) {
  const sign = x2 >= x1 ? 1 : -1
  const k = Math.min(Math.abs(x2 - x1), Math.max(22, Math.abs(x2 - x1) * 0.45))
  return `M${x1},${y1} C${x1 + sign * k},${y1} ${x2 - sign * k},${y2} ${x2},${y2}`
}

const SVG_O = 1000 // canvas (0,0) maps to SVG point (1000,1000)

// Precomputed per-group geometry. Horizontal spokes stack chips in outward
// columns (two columns past six chips); vertical spokes flank the card
// left/right (CIP vertical-branch behavior).
const GEO = GROUPS.map((g) => {
  const rad = ((NODE_ANGLE[g.id] - 90) * Math.PI) / 180
  const dx = Math.round(Math.cos(rad))
  const dy = Math.round(Math.sin(rad))
  const vertical = dy !== 0
  const cardX = dx * RX_SPOKE
  const cardY = dy * RY_SPOKE
  const items = PLATFORMS.filter((p) => p.group === g.id)
  const n = items.length
  let chips
  if (vertical) {
    const half = Math.ceil(n / 2)
    chips = items.map((p, i) => {
      const side = i < half ? -1 : 1
      const m = side === -1 ? half : n - half
      const j = side === -1 ? i : i - half
      const x = cardX + side * (CARD_HW + CHIP_GAP + CHIP_W / 2)
      const y = cardY + (j - (m - 1) / 2) * CHIP_VSTEP
      return { p, x, y }
    })
  } else {
    const twoCol = n > 6
    const rows = twoCol ? Math.ceil(n / 2) : n
    const chipR = RX_SPOKE + CARD_HW + CHIP_GAP + CHIP_W / 2
    chips = items.map((p, i) => {
      const col = twoCol ? Math.floor(i / rows) : 0
      const j = twoCol ? i % rows : i
      const m = twoCol ? (col === 0 ? rows : n - rows) : n
      const x = dx * (chipR + col * (CHIP_W + 16))
      const y = (j - (m - 1) / 2) * CHIP_VSTEP
      return { p, x, y }
    })
  }
  return { g, dx, dy, vertical, cardX, cardY, chips }
})

function Hub() {
  return (
    <div className="eco2-hub">
      <div className="eco2-hub-inner"></div>
      <div className="eb">OPERATOR</div>
      <div className="nm">{ROOT.label}</div>
      <div className="tg">{ROOT.sub}</div>
    </div>
  )
}

function Stage({ sel, litGroup, shift, onChip, onCard, onClear }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / NATURAL_W, el.clientHeight / NATURAL_H))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hasSel = sel !== null || litGroup !== null

  return (
    <div className={`eco2-stage${hasSel ? ' eco2-has-sel' : ''}`} ref={wrapRef} onClick={onClear}>
      <div className="eco2-scale" style={{ transform: `translateX(${shift}px) scale(${scale})` }}>
        <div className="eco2-origin">
          <svg className="eco2-edges" aria-hidden="true">
            {GEO.map(({ g, dx, dy, cardX, cardY, chips }) => {
              const lit = litGroup === g.id || chips.some(({ p }) => p.id === sel)
              const inset = calcInset(dx, dy)
              return (
                <g key={g.id}>
                  <path
                    className={`${lit ? 'eco2-edge-active' : 'eco2-edge'}${hasSel && !lit ? ' eco2-dim' : ''}`}
                    d={curvePath(SVG_O + dx * HUB_RADIUS, SVG_O + dy * HUB_RADIUS, SVG_O + (cardX - dx * inset), SVG_O + (cardY - dy * inset))}
                    fill="none" stroke={NODE_HUE[g.id]}
                    strokeWidth={lit ? 2.4 : 1.6} strokeLinecap="round" strokeOpacity={lit ? 1 : 0.6}
                  />
                  {chips.map(({ p, x, y }) => {
                    const on = sel === p.id
                    const sign = x >= cardX ? 1 : -1
                    return (
                      <path
                        key={p.id}
                        className={`${on || lit ? 'eco2-edge-active' : 'eco2-edge'}${hasSel && !on && !lit ? ' eco2-dim' : ''}`}
                        d={curvePath(
                          SVG_O + cardX + sign * CARD_HW, SVG_O + cardY,
                          SVG_O + x - sign * (CHIP_W / 2), SVG_O + y
                        )}
                        fill="none" stroke={LIFECYCLE_COLOR[stateOf(p.id).lifecycle]}
                        strokeWidth={on ? 2.4 : 1.6} strokeLinecap="round" strokeOpacity={on || lit ? 1 : 0.6}
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>

          <Hub />

          {GEO.map(({ g, cardX, cardY, chips }) => (
            <div key={g.id}>
              <div
                className={`eco2-card${litGroup === g.id ? ' lit' : ''}${hasSel && litGroup !== g.id && !chips.some(({ p }) => p.id === sel) ? ' eco2-dim' : ''}`}
                style={{ left: cardX, top: cardY, width: CARD_W, transform: 'translate(-50%, -50%)', '--node-hue': NODE_HUE[g.id] }}
                onClick={(e) => { e.stopPropagation(); onCard(g.id) }}
              >
                <div className="eb">{g.id}.DAVID</div>
                <div className="nm">{g.label}</div>
                <div className="ds">{g.desc}</div>
                <div className="ct">{chips.length} PLATFORMS</div>
              </div>
              {chips.map(({ p, x, y }) => (
                <div
                  key={p.id}
                  className={`eco2-chip${sel === p.id ? ' on' : ''}${hasSel && sel !== p.id && litGroup !== g.id ? ' eco2-dim' : ''}`}
                  style={{ left: x, top: y, width: CHIP_W, transform: 'translate(-50%, -50%)' }}
                  onClick={(e) => { e.stopPropagation(); onChip(p.id) }}
                >
                  <div className="nm"><span className="dia">◆</span>{p.label}
                    {p.production?.url && (
                      <a
                        className="eco2-chip-out"
                        href={p.production.url} target="_blank" rel="noopener noreferrer"
                        title={`Open ${p.production.url.replace('https://', '')}`}
                        onClick={(e) => e.stopPropagation()}
                      ><ExternalLink size={12} /></a>
                    )}
                  </div>
                  <div className="st"><i style={{ background: HEALTH_COLOR[stateOf(p.id).health] }}></i>{LIFECYCLE_LABEL[stateOf(p.id).lifecycle]} · OPEN VIEWER</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="eco2-foot">
        <span style={{ marginRight: 22 }}>SELECT A NODE TO OPEN ITS VIEWER · ESC RELEASES</span>
        <span className="eco2-leg"><i style={{ background: LIFECYCLE_COLOR.live }}></i>LIVE</span>
        <span className="eco2-leg"><i style={{ background: LIFECYCLE_COLOR.dev }}></i>IN DEVELOPMENT</span>
        <span className="eco2-leg"><i style={{ background: LIFECYCLE_COLOR.inactive }}></i>SUSPENDED</span>
      </div>
    </div>
  )
}

/* ---------------- viewer ---------------- */
function KV({ k, children, link }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      {link
        ? <a className="v link" href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{children}</a>
        : <span className="v">{children}</span>}
    </div>
  )
}

function Viewer({ platform, onClose }) {
  const [logOpen, setLogOpen] = useState(false)
  const p = platform
  const g = GROUPS.find((x) => x.id === p.group)
  const commitsUrl = `https://github.com/${p.github.repo}/commits/${p.github.branch}`

  return (
    <div className="eco2-viewer" onClick={(e) => e.stopPropagation()}>
      <button className="eco2-viewer-x" onClick={onClose} aria-label="Close viewer">×</button>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div className="sa-tele" style={{ color: NODE_HUE[g.id] }}>{g.label.toUpperCase()} · {LIFECYCLE_LABEL[stateOf(p.id).lifecycle]}</div>
          <span className="sa-tele" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: HEALTH_COLOR[stateOf(p.id).health] }}>
            <i style={{ width: 7, height: 7, borderRadius: '50%', background: HEALTH_COLOR[stateOf(p.id).health], display: 'inline-block' }}></i>
            {HEALTH_LABEL[stateOf(p.id).health]}
          </span>
        </div>
        <div className="sa-serif" style={{ fontSize: 24, color: '#fff', marginTop: 5, lineHeight: 1.15 }}>{p.name}</div>
        <a href={p.production.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sa-accent)', textDecoration: 'none' }}>
          <ExternalLink size={12} /> {p.production.url.replace('https://', '')}
        </a>
        {p.production.note && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 0.8, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>{p.production.note.toUpperCase()}</div>}
      </div>

      <div style={{ padding: '6px 20px 20px' }}>
        {stateOf(p.id).openItems.length > 0 && (
          <div className="dpanel" style={{ borderColor: 'rgba(248,199,97,0.35)' }}>
            <div className="ph" style={{ color: HEALTH_COLOR.warn }}>Needs attention · {stateOf(p.id).openItems.length}</div>
            {stateOf(p.id).openItems.map((it, i) => (
              <div key={i} style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', padding: '3px 0', lineHeight: 1.45 }}>· {it}</div>
            ))}
          </div>
        )}
        <div className="dpanel">
          <div className="ph"><GitBranch size={13} /> GitHub</div>
          <KV k="Repo" link={`https://github.com/${p.github.repo}`}>{p.github.repo}</KV>
          <KV k="Branch">{p.github.branch}</KV>
          <KV k="Visibility">{p.github.visibility}</KV>
        </div>

        <div className="dpanel">
          <div className="ph"><Database size={13} /> Supabase</div>
          <KV k="Project">{p.supabase.project}</KV>
          {p.supabase.rls && <KV k="RLS">{p.supabase.rls}</KV>}
        </div>

        <div className="dpanel">
          <div className="ph"><Rocket size={13} /> Vercel</div>
          <KV k="Project">{p.vercel.project}</KV>
          <KV k="Scope">{p.vercel.scope}</KV>
          <KV k="Deploy">{p.vercel.deploy}</KV>
        </div>

        <div className="dpanel">
          <div className="ph"><Users size={13} /> Co-collaborators · {p.collaborators.length}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {p.collaborators.map((c) => (
              <span key={c} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '3px 9px' }}>{c}</span>
            ))}
          </div>
        </div>

        <div className="dpanel">
          <div className="ph"><Users size={13} /> Users</div>
          {p.users.map((u, i) => (
            <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', padding: '4px 0' }}>{u}</div>
          ))}
        </div>

        <div className="dpanel">
          <button onClick={() => setLogOpen(!logOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>
            <span className="ph" style={{ marginBottom: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScrollText size={13} /> Change log · {p.changelog.length}
            </span>
            <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.5)', transform: logOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {logOpen && (
            <div style={{ marginTop: 10 }}>
              {p.changelog.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: i ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sa-accent)', flex: '0 0 74px' }}>{c.date}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>{c.entry}</span>
                </div>
              ))}
              <a href={commitsUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--sa-accent)', textDecoration: 'none' }}>
                FULL HISTORY ON GITHUB <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- narrow fallback list ---------------- */
function FallbackList({ sel, onChip }) {
  return (
    <div className="eco2-list">
      {GROUPS.map((g) => (
        <div key={g.id} className="eco2-list-node">
          <div className="eco2-list-head">
            <span className="eco2-list-title">{g.label}</span>
            <span className="eco2-list-dom" style={{ color: NODE_HUE[g.id] }}>{g.id}.DAVID</span>
          </div>
          {PLATFORMS.filter((p) => p.group === g.id).map((p) => (
            <div key={p.id} className={`eco2-chip${sel === p.id ? ' on' : ''}`} onClick={() => onChip(p.id)}>
              <div className="nm"><span className="dia">◆</span>{p.label}</div>
              <div className="st"><i style={{ background: HEALTH_COLOR[stateOf(p.id).health] }}></i>{LIFECYCLE_LABEL[stateOf(p.id).lifecycle]}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ---------------- page ---------------- */
export default function EcosystemPage() {
  const [sel, setSel] = useState(null) // platform id
  const [litGroup, setLitGroup] = useState(null) // group id (card click)
  const platform = PLATFORMS.find((p) => p.id === sel) || null

  // Esc releases selection (CIP behavior).
  useEffect(() => {
    if (!sel && !litGroup) return
    const onKey = (e) => { if (e.key === 'Escape') { setSel(null); setLitGroup(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, litGroup])

  return (
    <div className="eco2-wrap">
      <PageHead
        eyebrow="NETWORK · ECOSYSTEM"
        title="Ecosystem"
        em="— the platforms you've built"
        desc="Your digital architecture as a living tree. Select any platform node to open its full operating picture."
      />
      <Stage
        sel={sel}
        litGroup={litGroup}
        shift={platform ? (platform.group === 'client' ? -460 : -60) : 0}
        onChip={(id) => { setSel(id); setLitGroup(null) }}
        onCard={(id) => { setLitGroup(litGroup === id ? null : id); setSel(null) }}
        onClear={() => { setSel(null); setLitGroup(null) }}
      />
      <FallbackList sel={sel} onChip={setSel} />
      {platform && <Viewer platform={platform} onClose={() => setSel(null)} />}
    </div>
  )
}
