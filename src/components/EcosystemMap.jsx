import { useEffect, useRef, useState } from 'react'
import MarkdownModal from './MarkdownModal'

const NAVY = '#002C77'
const SKY = '#009DE0'
const GOLD = '#FF8C00'
const BORDER = '#E2E8F0'
const PANEL = '#FFFFFF'
const TEXT = '#002C77'
const TEXT_MUTED = '#334E85'

const PARENT_SLUGS = new Set([
  'lumen', 'mr-cco', 'mr-coo', 'chief-creative-bot', 'chief-growth-bot',
  'chief-strategy-bot', 'safety-net-bot', 'mr-ledger', 'vela',
])

// Build the Dropbox vault path(s) for a clicked bot.
// Parent → Agents/<parent>/BOT-PROFILE.md
// Sub    → walk parents to find owning parent, then
//          Agents/<parent>/<sub>/Agent Instructions and Profile/{IDENTITY.md, SYSTEM-PROMPT.md}
const PARENT_OF_SUB = {
  // lumen
  'lumen': 'lumen', 'lumen-th': 'lumen',
  // mr-cco
  'mr-mma': 'mr-cco', 'mr-achp': 'mr-cco', 'mr-pomegranate': 'mr-cco', 'mr-purple': 'mr-cco',
  // mr-coo
  'mr-harvest': 'mr-coo', 'mr-pulse': 'mr-coo', 'mr-task': 'mr-coo',
  // chief-creative-bot
  'mr-hfma': 'chief-creative-bot', 'mr-wellness': 'chief-creative-bot',
  'mr-diablo': 'chief-creative-bot', 'mr-tcoc': 'chief-creative-bot', 'mr-baseball': 'chief-creative-bot',
  // chief-growth-bot
  'mr-relationship': 'chief-growth-bot',
  // chief-strategy-bot
  'mr-framework': 'chief-strategy-bot', 'mr-strategist': 'chief-strategy-bot',
  // safety-net-bot
  'mr-snmi': 'safety-net-bot', 'mr-snh': 'safety-net-bot',
  // mr-ledger
  'mr-ledger-personal': 'mr-ledger', 'mr-ledger-th': 'mr-ledger',
  // vela
  'vela': 'vela',
}

const VAULT = '/0. David Vault/Lumen OS/Agents'

function pathsForBot(slug) {
  if (PARENT_SLUGS.has(slug)) {
    return {
      title: slug,
      paths: [`${VAULT}/${slug}/BOT-PROFILE.md`],
    }
  }
  const parent = PARENT_OF_SUB[slug]
  if (!parent) return { title: slug, paths: [] }
  const base = `${VAULT}/${parent}/${slug}/Agent Instructions and Profile`
  return {
    title: slug,
    paths: [`${base}/IDENTITY.md`, `${base}/SYSTEM-PROMPT.md`],
  }
}

export default function EcosystemMap() {
  const [view, setView] = useState('org')  // 'org' | 'domain'
  const [svgMarkup, setSvgMarkup] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [active, setActive] = useState(null) // { title, paths }
  const containerRef = useRef(null)

  useEffect(() => {
    const url = view === 'org' ? '/ecosystem/org-chart.svg' : '/ecosystem/domain-map.svg'
    setLoading(true); setError(null)
    fetch(url)
      .then((r) => r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${url}`)))
      .then(setSvgMarkup)
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false))
  }, [view])

  // After the SVG is injected, wire click handlers onto every <g class="clickable">
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const nodes = root.querySelectorAll('g.clickable')
    const handler = (e) => {
      const g = e.currentTarget
      const slug = g.getAttribute('data-slug')
      if (!slug) return
      setActive(pathsForBot(slug))
    }
    nodes.forEach((n) => {
      n.style.cursor = 'pointer'
      n.addEventListener('click', handler)
      // hover effect
      const circle = n.querySelector('circle')
      if (circle) {
        const orig = circle.getAttribute('stroke-width')
        n.addEventListener('mouseenter', () => circle.setAttribute('stroke-width', String(Number(orig) + 2)))
        n.addEventListener('mouseleave', () => circle.setAttribute('stroke-width', orig))
      }
    })
    return () => nodes.forEach((n) => n.removeEventListener('click', handler))
  }, [svgMarkup])

  const tabBtn = (key, label) => (
    <button
      onClick={() => setView(key)}
      style={{
        padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: `1px solid ${view === key ? NAVY : BORDER}`,
        background: view === key ? NAVY : PANEL,
        color: view === key ? 'white' : TEXT_MUTED,
        borderRadius: 6, fontFamily: 'inherit',
      }}
    >{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {tabBtn('org', 'Discord Org Chart')}
        {tabBtn('domain', 'Domain Map')}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: TEXT_MUTED }}>
          Click any node → opens BOT-PROFILE.md (parent) or IDENTITY.md + SYSTEM-PROMPT.md (sub)
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10,
          overflow: 'auto', padding: 12, minHeight: 600,
        }}
      >
        {loading && <div style={{ padding: 24, color: TEXT_MUTED, fontSize: 13 }}>Loading {view === 'org' ? 'org chart' : 'domain map'}…</div>}
        {error && <div style={{ padding: 24, color: '#EF4E45', fontSize: 13 }}>SVG load failed: {error}</div>}
        {!loading && !error && (
          <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
        )}
      </div>

      <MarkdownModal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title}
        paths={active?.paths || []}
      />
    </div>
  )
}
