import { useState, useEffect, useRef } from 'react'
import { ExternalLink, GitBranch, Database, Rocket, Users, ScrollText, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react'
import { PageHead } from './sa/SaUi'
import { GROUPS, SUBGROUPS, PLATFORMS, HEALTH_COLOR, HEALTH_LABEL, LIFECYCLE_LABEL, LIFECYCLE_COLOR, effectiveState } from '../constants/ecosystemArchitecture'
import {
  CATEGORIES, REGISTRY, SNAPSHOT_AS_OF,
  deriveCategory, deriveState, STATE_COLOR, registryOpenItems, registryHealth,
  LANE_LABEL, BUILD_CLASS_LABEL, CONTRACT_STATUS_LABEL,
} from '../constants/thToolsRegistry'

const GHOST_STATE = Object.fromEntries(PLATFORMS.map((p) => [p.id, effectiveState(p)]))

// ---- Geometry, ported from the investor deck's hub-and-spoke surface ------
const HUB_RADIUS = 110
const RX_SPOKE = 330
const RY_SPOKE = 270
const CARD_W = 252
const CARD_H = 128
const CARD_HW = CARD_W / 2
const CARD_HH = CARD_H / 2
const CHIP_W = 186
const CHIP_H = 52
const CHIP_GAP = 40
const CHIP_VSTEP = CHIP_H + 18
const NATURAL_W = 2 * (RX_SPOKE + CARD_HW + CHIP_GAP + CHIP_W) + 170
const NATURAL_H = 2 * (RY_SPOKE + 150) + 150

const DAVID_ANGLE = { client: 90, sandbox: 270, firm: 0, personal: 180 }

function edgeInset(dx, dy, hw, hh) {
  const ex = Math.abs(dx) < 1e-6 ? Infinity : hw / Math.abs(dx)
  const ey = Math.abs(dy) < 1e-6 ? Infinity : hh / Math.abs(dy)
  return Math.min(ex, ey)
}

function curvePath(x1, y1, x2, y2) {
  const sign = x2 >= x1 ? 1 : -1
  const k = Math.min(Math.abs(x2 - x1), Math.max(22, Math.abs(x2 - x1) * 0.45))
  return `M${x1},${y1} C${x1 + sign * k},${y1} ${x2 - sign * k},${y2} ${x2},${y2}`
}

const SVG_O = 1000

function geoFor(groups, angleOf, itemsFor) {
  return groups.map((g) => {
    const rad = ((angleOf[g.id] - 90) * Math.PI) / 180
    const dx = Math.round(Math.cos(rad))
    const dy = Math.round(Math.sin(rad))
    const vertical = dy !== 0
    const cardX = dx * RX_SPOKE
    const cardY = dy * RY_SPOKE
    const items = itemsFor(g)
    const n = items.length
    let chips
    if (vertical) {
      const half = Math.ceil(n / 2)
      chips = items.map((r, i) => {
        const side = i < half ? -1 : 1
        const m = side === -1 ? half : n - half
        const j = side === -1 ? i : i - half
        return { r, x: cardX + side * (CARD_HW + CHIP_GAP + CHIP_W / 2), y: cardY + (j - (m - 1) / 2) * CHIP_VSTEP }
      })
    } else {
      const chipR = RX_SPOKE + CARD_HW + CHIP_GAP + CHIP_W / 2
      chips = items.map((r, i) => ({ r, x: dx * chipR, y: (i - (n - 1) / 2) * CHIP_VSTEP }))
    }
    const xs = [cardX - CARD_HW, cardX + CARD_HW, ...chips.flatMap(({ x }) => [x - CHIP_W / 2, x + CHIP_W / 2])]
    const ys = [cardY - CARD_HH, cardY + CARD_HH, ...chips.flatMap(({ y }) => [y - CHIP_H / 2, y + CHIP_H / 2])]
    const bbox = {
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
      cy: (Math.min(...ys) + Math.max(...ys)) / 2,
      w: Math.max(...xs) - Math.min(...xs) + 120,
      h: Math.max(...ys) - Math.min(...ys) + 120,
    }
    return { g, dx, dy, cardX, cardY, chips, bbox }
  })
}

function Hub({ eb, nm, tg }) {
  return (
    <div className="eco2-hub">
      <div className="eco2-hub-inner"></div>
      <div className="eb">{eb}</div>
      <div className="nm">{nm}</div>
      <div className="tg">{tg}</div>
    </div>
  )
}

function Stage({ geo, hub, hueOf, countLabel, footLegend, chipView, edgeColor, sel, litGroup, litSet, focusBBox, forceUp, onChip, onCard, onClear, onUp, naturalW = NATURAL_W, naturalH = NATURAL_H, children }) {
  const wrapRef = useRef(null)
  const [dims, setDims] = useState({ w: 1, h: 1 })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hasSel = sel !== null || litGroup !== null
  const fitScale = Math.min(1, dims.w / naturalW, dims.h / naturalH)

  let transform
  const zoomed = litGroup ? geo.find((x) => x.g.id === litGroup) : null
  if (zoomed) {
    const viewerW = sel ? 400 : 0
    const k = Math.min(1.2, (dims.w - viewerW - 70) / zoomed.bbox.w, (dims.h - 80) / zoomed.bbox.h)
    transform = `translate(${-zoomed.bbox.cx * k - viewerW / 2}px, ${-zoomed.bbox.cy * k}px) scale(${k})`
  } else if (focusBBox) {
    const viewerW = sel ? 400 : 0
    const k = Math.min(1.1, (dims.w - viewerW - 70) / focusBBox.w, (dims.h - 80) / focusBBox.h)
    transform = `translate(${-focusBBox.cx * k - viewerW / 2}px, ${-focusBBox.cy * k}px) scale(${k})`
  } else {
    const shift = sel ? -380 : 0
    transform = `translateX(${shift}px) scale(${fitScale})`
  }

  return (
    <div className={`eco2-stage${hasSel ? ' eco2-has-sel' : ''}`} ref={wrapRef} onClick={onClear}>
      {(litGroup || forceUp) && (
        <button className="eco2-up" onClick={(e) => { e.stopPropagation(); onUp() }} title="Back to full tree">
          <ChevronUp size={16} />
        </button>
      )}
      <div className="eco2-scale" style={{ transform }}>
        <div className="eco2-origin">
          <svg className="eco2-edges" aria-hidden="true">
            {geo.map(({ g, cardX, cardY, chips, from }) => {
              const lit = litGroup === g.id || (litSet ? litSet.has(g.id) : false) || chips.some(({ r }) => r.id === sel)
              const dimmed = ((hasSel || !!litSet) && !lit)
              const fx = from ? from.x : 0
              const fy = from ? from.y : 0
              const len = Math.hypot(cardX - fx, cardY - fy) || 1
              const ux = (cardX - fx) / len
              const uy = (cardY - fy) / len
              const srcInset = from ? edgeInset(ux, uy, CARD_HW, CARD_HH) : HUB_RADIUS
              const dstInset = edgeInset(ux, uy, CARD_HW, CARD_HH)
              return (
                <g key={g.id}>
                  <path
                    className={`${lit ? 'eco2-edge-active' : 'eco2-edge'}${dimmed ? ' eco2-dim' : ''}`}
                    d={curvePath(SVG_O + fx + ux * srcInset, SVG_O + fy + uy * srcInset, SVG_O + (cardX - ux * dstInset), SVG_O + (cardY - uy * dstInset))}
                    fill="none" stroke={hueOf(g.id)}
                    strokeWidth={lit ? 2.4 : 1.6} strokeLinecap="round" strokeOpacity={lit ? 1 : 0.6}
                  />
                  {chips.map(({ r, x, y }) => {
                    const on = sel === r.id
                    const sign = x >= cardX ? 1 : -1
                    return (
                      <path
                        key={r.id}
                        className={`${on || lit ? 'eco2-edge-active' : 'eco2-edge'}${(dimmed || (hasSel && !on && !lit)) ? ' eco2-dim' : ''}`}
                        d={curvePath(SVG_O + cardX + sign * CARD_HW, SVG_O + cardY, SVG_O + x - sign * (CHIP_W / 2), SVG_O + y)}
                        fill="none" stroke={edgeColor(r)}
                        strokeWidth={on ? 2.4 : 1.6} strokeLinecap="round" strokeOpacity={on || lit ? 1 : 0.6}
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>

          <Hub {...hub} />

          {geo.map(({ g, cardX, cardY, chips }) => (
            <div key={g.id}>
              <div
                className={`eco2-card${litGroup === g.id ? ' lit' : ''}${hasSel && litGroup !== g.id && !chips.some(({ r }) => r.id === sel) ? ' eco2-dim' : ''}`}
                style={{ left: cardX, top: cardY, width: CARD_W, transform: 'translate(-50%, -50%)', '--node-hue': hueOf(g.id) }}
                onClick={(e) => { e.stopPropagation(); onCard(g.id) }}
              >
                <div className="eb">{g.label.toUpperCase()}</div>
                <div className="nm">{g.label}</div>
                <div className="ds">{g.desc}</div>
                <div className="ct">{countLabel(g, chips.length)}</div>
              </div>
              {chips.map(({ r, x, y }) => {
                const cv = chipView(r)
                return (
                  <div
                    key={r.id}
                    className={`eco2-chip${sel === r.id ? ' on' : ''}${hasSel && sel !== r.id && litGroup !== g.id ? ' eco2-dim' : ''}`}
                    style={{ left: x, top: y, width: CHIP_W, transform: 'translate(-50%, -50%)' }}
                    onClick={(e) => { e.stopPropagation(); onChip(r.id) }}
                  >
                    <div className="nm"><span className="dia">◆</span>{r.label}
                      {cv.url && (
                        <a className="eco2-chip-out" href={cv.url} target="_blank" rel="noopener noreferrer"
                          title={`Open ${cv.url.replace('https://', '')}`} onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="st"><i style={{ background: cv.dot }}></i>{cv.label}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {children}
      <div className="eco2-foot">{footLegend}</div>
    </div>
  )
}

/* ---------------- viewers ---------------- */
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

function ViewerShell({ eyebrow, eyebrowColor, health, name, url, note, onClose, children }) {
  return (
    <div className="eco2-viewer" onClick={(e) => e.stopPropagation()}>
      <button className="eco2-viewer-x" onClick={onClose} aria-label="Close viewer">×</button>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div className="sa-tele" style={{ color: eyebrowColor }}>{eyebrow}</div>
          <span className="sa-tele" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: HEALTH_COLOR[health] }}>
            <i style={{ width: 7, height: 7, borderRadius: '50%', background: HEALTH_COLOR[health], display: 'inline-block' }}></i>
            {HEALTH_LABEL[health]}
          </span>
        </div>
        <div className="sa-serif" style={{ fontSize: 24, color: '#fff', marginTop: 5, lineHeight: 1.15 }}>{name}</div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sa-accent)', textDecoration: 'none' }}>
            <ExternalLink size={12} /> {url.replace('https://', '').replace('http://', '')}
          </a>
        )}
        {note && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 0.8, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>{note.toUpperCase()}</div>}
      </div>
      <div style={{ padding: '6px 20px 20px' }}>{children}</div>
    </div>
  )
}

function AttentionPanel({ items }) {
  if (!items.length) return null
  return (
    <div className="dpanel" style={{ borderColor: 'rgba(248,199,97,0.35)' }}>
      <div className="ph" style={{ color: HEALTH_COLOR.warn }}><ShieldAlert size={13} /> Needs attention · {items.length}</div>
      {items.map((it, i) => (
        <div key={i} style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', padding: '3px 0', lineHeight: 1.45 }}>· {it}</div>
      ))}
    </div>
  )
}

function RegistryViewer({ r, onClose }) {
  const g = CATEGORIES.find((x) => x.id === deriveCategory(r))
  const st = deriveState(r)
  const items = registryOpenItems(r)
  const nullField = 'NULL — needs triage'
  return (
    <ViewerShell
      eyebrow={`${g.label.toUpperCase()} · ${st.label.toUpperCase()}`}
      eyebrowColor={g.color}
      health={registryHealth(r)}
      name={r.name}
      url={r.url || null}
      note={`TH-TOOLS REGISTRY · SNAPSHOT ${SNAPSHOT_AS_OF}`}
      onClose={onClose}
    >
      <AttentionPanel items={items} />
      <div className="dpanel">
        <div className="ph"><ShieldAlert size={13} /> Governance (state is derived from these)</div>
        <KV k="Lane">{r.lane ? LANE_LABEL[r.lane] : nullField}</KV>
        <KV k="Build class">{r.buildClass ? BUILD_CLASS_LABEL[r.buildClass] : nullField}</KV>
        <KV k="Contract">{r.contractStatus ? CONTRACT_STATUS_LABEL[r.contractStatus] : nullField}</KV>
        {r.dataClass && <KV k="Data class">{r.dataClass}</KV>}
        {r.retired && <KV k="Retirement">Retirement date set</KV>}
      </div>
      <div className="dpanel">
        <div className="ph"><Users size={13} /> Stewardship</div>
        <KV k="Steward">{r.steward || nullField}</KV>
        {r.client && <KV k="Client">{r.client}</KV>}
        <KV k="Updated">{r.updatedAt}</KV>
      </div>
      <div className="dpanel">
        <div className="ph"><GitBranch size={13} /> GitHub</div>
        {r.github
          ? <KV k="Repo" link={`https://github.com/${r.github}`}>{r.github}</KV>
          : <KV k="Repo">{nullField}</KV>}
      </div>
      <div className="dpanel">
        <div className="ph"><Database size={13} /> Supabase</div>
        <KV k="Project">{r.supabase || nullField}</KV>
      </div>
      <div className="dpanel">
        <div className="ph"><Rocket size={13} /> Vercel</div>
        <KV k="Project">{r.vercel || nullField}</KV>
      </div>
      <div className="dpanel">
        <div className="ph"><Users size={13} /> Users · {(r.users || []).length}</div>
        {(r.users || []).length
          ? r.users.map((u, i) => <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', padding: '4px 0' }}>{u}</div>)
          : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '4px 0' }}>None registered</div>}
      </div>
    </ViewerShell>
  )
}

function GhostViewer({ p, onClose, unregistered = true }) {
  const [logOpen, setLogOpen] = useState(false)
  const st = GHOST_STATE[p.id]
  const g = GROUPS.find((x) => x.id === p.group)
  const commitsUrl = p.github ? `https://github.com/${p.github.repo}/commits/${p.github.branch}` : null
  return (
    <ViewerShell
      eyebrow={unregistered ? `UNREGISTERED · OBSERVED (${(g?.label || '').toUpperCase()})` : `${(g?.label || '').toUpperCase()} · ${LIFECYCLE_LABEL[st.lifecycle]}`}
      eyebrowColor={unregistered ? 'rgba(255,255,255,0.55)' : g?.color}
      health={unregistered ? 'warn' : st.health}
      name={p.name}
      url={p.production?.url || null}
      note={p.production?.note || null}
      onClose={onClose}
    >
      <AttentionPanel items={unregistered ? ['Not in the th-tools registry — register it (build_class covers personal tools) to bring it under surveillance', ...st.openItems] : st.openItems} />
      <div className="dpanel">
        <div className="ph"><GitBranch size={13} /> GitHub (observed)</div>
        <KV k="Repo" link={`https://github.com/${p.github.repo}`}>{p.github.repo}</KV>
        <KV k="Branch">{p.github.branch}</KV>
        <KV k="Visibility">{p.github.visibility}</KV>
      </div>
      <div className="dpanel">
        <div className="ph"><Database size={13} /> Supabase (observed)</div>
        <KV k="Project">{p.supabase.project}</KV>
      </div>
      <div className="dpanel">
        <div className="ph"><Rocket size={13} /> Vercel (observed)</div>
        <KV k="Project">{p.vercel.project}</KV>
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
      {p.changelog.length > 0 && (
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
              {commitsUrl && (
                <a href={commitsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--sa-accent)', textDecoration: 'none' }}>
                  FULL HISTORY ON GITHUB <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </ViewerShell>
  )
}

/* ---------------- narrow fallback ---------------- */
function FallbackList({ registered, onChip }) {
  return (
    <div className="eco2-list">
      {CATEGORIES.map((g) => {
        const rows = registered.filter((r) => r.cat === g.id)
        if (!rows.length) return null
        return (
          <div key={g.id} className="eco2-list-node">
            <div className="eco2-list-head">
              <span className="eco2-list-title">{g.label}</span>
              <span className="eco2-list-dom" style={{ color: g.color }}>{rows.length} REGISTERED</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="eco2-chip" onClick={() => onChip(r.id)}>
                <div className="nm"><span className="dia">◆</span>{r.label}</div>
                <div className="st"><i style={{ background: HEALTH_COLOR[registryHealth(r)] }}></i>{deriveState(r).label}</div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- page ---------------- */
const VIEWS = [
  { id: 'th', label: 'Third Horizon' },
  { id: 'david', label: 'David' },
]

const TH_HUB = {
  eb: 'TH-TOOLS REGISTRY',
  nm: 'Third Horizon Platforms',
  tg: `tools.thirdhorizon.com · snapshot ${SNAPSHOT_AS_OF}`,
}
const DAVID_HUB = {
  eb: 'OPERATOR',
  nm: "David's Architecture",
  tg: 'Built, operated, and evolving',
}

const TH_HUE = Object.fromEntries(CATEGORIES.map((g) => [g.id, g.color]))
const DAVID_HUE = Object.fromEntries(GROUPS.map((g) => [g.id, g.color]))

// ---- TH view: six-spoke category architecture, mirroring the th-tools map.
// Big categories take the vertical spokes (chips flank left/right); small
// ones take horizontal spokes and corners (chips run in an outward column).
const TH_ROWS = REGISTRY.map((r) => ({ ...r, label: r.name, cat: deriveCategory(r) }))
const TH_LAYOUT = {
  sandbox: { x: 0, y: -270, mode: 'flank' },
  deployed: { x: 0, y: 270, mode: 'flank' },
  unclassified: { x: -430, y: 0, mode: 'col', dir: -1 },
  subscription: { x: 430, y: 0, mode: 'col', dir: 1 },
  internal: { x: -500, y: 430, mode: 'col', dir: -1 },
  business_development: { x: 500, y: 430, mode: 'col', dir: 1 },
  client_platform: { x: 500, y: -430, mode: 'col', dir: 1 },
}
const CHIP_OFF = CARD_HW + CHIP_GAP + CHIP_W / 2
const TH_GEO = CATEGORIES
  .map((g) => ({ g, items: TH_ROWS.filter((r) => r.cat === g.id) }))
  .filter(({ items }) => items.length > 0)
  .map(({ g, items }) => {
    const L = TH_LAYOUT[g.id]
    const n = items.length
    let chips
    if (L.mode === 'flank') {
      const half = Math.ceil(n / 2)
      chips = items.map((r, i) => {
        const side = i < half ? -1 : 1
        const m = side === -1 ? half : n - half
        const j = side === -1 ? i : i - half
        return { r, x: L.x + side * CHIP_OFF, y: L.y + (j - (m - 1) / 2) * CHIP_VSTEP }
      })
    } else {
      chips = items.map((r, i) => ({ r, x: L.x + L.dir * CHIP_OFF, y: L.y + (i - (n - 1) / 2) * CHIP_VSTEP }))
    }
    const xs = [L.x - CARD_HW, L.x + CARD_HW, ...chips.flatMap(({ x }) => [x - CHIP_W / 2, x + CHIP_W / 2])]
    const ys = [L.y - CARD_HH, L.y + CARD_HH, ...chips.flatMap(({ y }) => [y - CHIP_H / 2, y + CHIP_H / 2])]
    const bbox = {
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
      cy: (Math.min(...ys) + Math.max(...ys)) / 2,
      w: Math.max(...xs) - Math.min(...xs) + 120,
      h: Math.max(...ys) - Math.min(...ys) + 120,
    }
    return { g, cardX: L.x, cardY: L.y, chips, bbox }
  })
// Measured scene bounds (collision-checked): x ±852, y -471..494.
const TH_NATURAL_W = 2 * (852 + 40) + 170
const TH_NATURAL_H = 965 + 300

// David root level: Sandbox shows its three child branches as folder nodes.
const SUB_COUNT = Object.fromEntries(SUBGROUPS.map((sg) => [sg.id, PLATFORMS.filter((p) => p.subgroup === sg.id).length]))
const DAVID_GEO = geoFor(GROUPS, DAVID_ANGLE, (g) =>
  g.id === 'sandbox'
    ? SUBGROUPS.map((sg) => ({ id: `sub:${sg.id}`, folder: true, label: sg.label, color: sg.color, count: SUB_COUNT[sg.id] }))
    : PLATFORMS.filter((p) => p.group === g.id))

// David focused level: the SAME scene with Sandbox's subtree expanded in
// place. Children hang off the Sandbox card (outward, away from the hub);
// the camera glides to frame the subtree — hub and siblings stay in the
// world, dimmed, exactly like a branch zoom.
const SUB_HUE = Object.fromEntries(SUBGROUPS.map((sg) => [sg.id, sg.color]))
const SBX = -RX_SPOKE // sandbox card center x (left spoke)
const SUB_POS = {
  tl: { x: SBX, y: -320 },
  bd: { x: SBX, y: 320 },
  global: { x: SBX - 470, y: 0 },
}
function subChips(sgId, cx, cy) {
  const items = PLATFORMS.filter((p) => p.subgroup === sgId)
  const n = items.length
  if (sgId === 'bd') {
    // flank left/right of the card
    const half = Math.ceil(n / 2)
    return items.map((p, i) => {
      const side = i < half ? -1 : 1
      const m = side === -1 ? half : n - half
      const j = side === -1 ? i : i - half
      return { r: p, x: cx + side * (CARD_HW + CHIP_GAP + CHIP_W / 2), y: cy + (j - (m - 1) / 2) * CHIP_VSTEP }
    })
  }
  // column outward-left
  return items.map((p, i) => ({ r: p, x: cx - (CARD_HW + CHIP_GAP + CHIP_W / 2), y: cy + (i - (n - 1) / 2) * CHIP_VSTEP }))
}
const SUB_ENTRIES = SUBGROUPS.map((sg) => {
  const pos = SUB_POS[sg.id]
  const chips = subChips(sg.id, pos.x, pos.y)
  const xs = [pos.x - CARD_HW, pos.x + CARD_HW, ...chips.flatMap(({ x }) => [x - CHIP_W / 2, x + CHIP_W / 2])]
  const ys = [pos.y - CARD_HH, pos.y + CARD_HH, ...chips.flatMap(({ y }) => [y - CHIP_H / 2, y + CHIP_H / 2])]
  return {
    g: sg, cardX: pos.x, cardY: pos.y, chips, from: { x: SBX, y: 0 },
    bbox: { cx: 0, cy: 0, w: 0, h: 0 },
    _xs: xs, _ys: ys,
  }
})
// Expanded scene = root scene with Sandbox's folder chips removed + subtree.
const DAVID_GEO_EXPANDED = [
  ...DAVID_GEO.map((e) => (e.g.id === 'sandbox' ? { ...e, chips: [] } : e)),
  ...SUB_ENTRIES,
]
// Camera frame: sandbox card + whole subtree, biased toward the sandbox card.
const _fx = [SBX - CARD_HW, SBX + CARD_HW, ...SUB_ENTRIES.flatMap((e) => e._xs)]
const _fy = [-CARD_HH, CARD_HH, ...SUB_ENTRIES.flatMap((e) => e._ys)]
const _bb = {
  minX: Math.min(..._fx), maxX: Math.max(..._fx),
  minY: Math.min(..._fy), maxY: Math.max(..._fy),
}
const SANDBOX_FOCUS_BBOX = {
  cx: ((_bb.minX + _bb.maxX) / 2) * 0.6 + SBX * 0.4,
  cy: (_bb.minY + _bb.maxY) / 2,
  w: _bb.maxX - _bb.minX + 140,
  h: _bb.maxY - _bb.minY + 140,
}
const SANDBOX_LIT = new Set(['sandbox', 'bd', 'tl', 'global'])

export default function EcosystemPage() {
  const [view, setView] = useState('th')
  const [davidFocus, setDavidFocus] = useState(null) // null | 'sandbox'
  const [sel, setSel] = useState(null)
  const [selKind, setSelKind] = useState(null) // 'registered' | 'ghost'
  const [litGroup, setLitGroup] = useState(null)

  const isTH = view === 'th'
  const regRow = isTH && selKind === 'registered' ? TH_ROWS.find((r) => r.id === sel) : null
  const davidRow = !isTH && selKind === 'david' ? PLATFORMS.find((p) => p.id === sel) : null
  const triageCount = TH_ROWS.reduce((n, r) => n + registryOpenItems(r).length, 0)

  useEffect(() => {
    if (!sel && !litGroup && !davidFocus) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (sel) { setSel(null); setSelKind(null) }
      else if (litGroup) setLitGroup(null)
      else setDavidFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, litGroup, davidFocus])

  const clearAll = () => { setSel(null); setSelKind(null); setLitGroup(null) }

  return (
    <div className="eco2-wrap">
      <PageHead
        eyebrow="NETWORK · ECOSYSTEM"
        title="Ecosystem"
        em={isTH ? '— the firm platform map' : "— David's architecture"}
        desc={isTH
          ? `One-for-one mirror of the th-tools platform registry (live pull ${SNAPSHOT_AS_OF}). ${TH_ROWS.length} platforms · ${TH_GEO.length} categories · category and state derived, never stored · ${triageCount} open triage items.`
          : `The full observed inventory: every platform in your repos, on your own frame. ${PLATFORMS.length} platforms across ${GROUPS.length} branches.`}
        right={
          <div className="pill-toggle">
            {VIEWS.map((v) => (
              <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => { setView(v.id); clearAll(); setDavidFocus(null) }}>
                {v.label}
              </button>
            ))}
          </div>
        }
      />
      <Stage
        key={isTH ? 'th' : 'david'}
        geo={isTH ? TH_GEO : davidFocus ? DAVID_GEO_EXPANDED : DAVID_GEO}
        hub={isTH ? TH_HUB : DAVID_HUB}
        hueOf={(id) => (isTH ? TH_HUE : { ...DAVID_HUE, ...SUB_HUE })[id]}
        litSet={!isTH && davidFocus ? SANDBOX_LIT : null}
        focusBBox={!isTH && davidFocus ? SANDBOX_FOCUS_BBOX : null}
        countLabel={isTH
          ? (g, n) => `${n} REGISTERED`
          : (g, n) => (g.id === 'sandbox' && !davidFocus ? `${n} BRANCHES` : `${n} PLATFORMS`)}
        forceUp={!isTH && !!davidFocus}
        naturalW={isTH ? TH_NATURAL_W : undefined}
        naturalH={isTH ? TH_NATURAL_H : undefined}
        chipView={isTH
          ? (r) => ({ url: r.url || null, dot: HEALTH_COLOR[registryHealth(r)], label: `${deriveState(r).label.toUpperCase()} · OPEN VIEWER` })
          : (p) => p.folder
            ? ({ url: null, dot: p.color, label: `${p.count} PLATFORMS · OPEN BRANCH` })
            : ({ url: p.production?.url || null, dot: HEALTH_COLOR[GHOST_STATE[p.id].health], label: `${LIFECYCLE_LABEL[GHOST_STATE[p.id].lifecycle]} · OPEN VIEWER` })}
        edgeColor={isTH
          ? (r) => STATE_COLOR[deriveState(r).state]
          : (p) => p.folder ? p.color : LIFECYCLE_COLOR[GHOST_STATE[p.id].lifecycle]}
        footLegend={isTH ? (
          <>
            <span style={{ marginRight: 22 }}>STATE IS DERIVED, NEVER STORED · ESC RELEASES</span>
            <span className="eco2-leg"><i style={{ background: STATE_COLOR.production }}></i>PRODUCTION</span>
            <span className="eco2-leg"><i style={{ background: STATE_COLOR.bd_demo }}></i>PILOT / BD / BUILDING</span>
            <span className="eco2-leg"><i style={{ background: STATE_COLOR.sandbox }}></i>SANDBOX</span>
            <span className="eco2-leg"><i style={{ background: STATE_COLOR.needs_review }}></i>NEEDS REVIEW / RETIRED</span>
          </>
        ) : (
          <>
            <span style={{ marginRight: 22 }}>OBSERVED INVENTORY · ESC RELEASES</span>
            <span className="eco2-leg"><i style={{ background: LIFECYCLE_COLOR.live }}></i>LIVE</span>
            <span className="eco2-leg"><i style={{ background: LIFECYCLE_COLOR.dev }}></i>IN DEVELOPMENT</span>
            <span className="eco2-leg"><i style={{ background: LIFECYCLE_COLOR.inactive }}></i>SUSPENDED</span>
          </>
        )}
        sel={selKind === 'registered' || selKind === 'david' ? sel : null}
        litGroup={litGroup}
        onChip={(id) => {
          if (!isTH && id.startsWith('sub:')) { setDavidFocus('sandbox'); setSel(null); setSelKind(null); setLitGroup(null); return }
          setSel(id); setSelKind(isTH ? 'registered' : 'david')
        }}
        onCard={(id) => {
          if (!isTH && id === 'sandbox' && !davidFocus) { setDavidFocus('sandbox'); setSel(null); setSelKind(null); setLitGroup(null); return }
          setLitGroup(litGroup === id ? null : id); setSel(null); setSelKind(null)
        }}
        onClear={clearAll}
        onUp={() => { clearAll(); setDavidFocus(null) }}
      />
      {isTH && <FallbackList registered={TH_ROWS} onChip={(id) => { setSel(id); setSelKind('registered') }} />}
      {regRow && <RegistryViewer r={regRow} onClose={() => { setSel(null); setSelKind(null) }} />}
      {davidRow && <GhostViewer p={davidRow} unregistered={false} onClose={() => { setSel(null); setSelKind(null) }} />}
    </div>
  )
}
