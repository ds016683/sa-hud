import { useState } from 'react'
import { Wallet, TrendingUp, Layers, Building2, Info } from 'lucide-react'

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' },

  // Header
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  h1: { fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
  sub: { fontSize: 13, color: '#8096B2', margin: '2px 0 0' },

  // Container scope label (Third Horizon for now — placeholder for future swap)
  scopeBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: '#EEF2F7', color: '#334E85', fontSize: 11, fontWeight: 600, border: '1px solid #CBD8E8', letterSpacing: '0.04em' },

  // Pill menu row (Cash Projection / Pro Forma Projections)
  pillRow: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  pill: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 9999,
    border: '1px solid',
    fontSize: 13, cursor: 'pointer',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: active ? 600 : 500,
    background: active ? '#002C77' : 'white',
    color: active ? 'white' : '#334E85',
    borderColor: active ? '#002C77' : '#CBD8E8',
    transition: 'all 0.15s',
  }),

  // Overlay toggle row
  overlayRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 14px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  overlayLabel: { fontSize: 12, color: '#565656', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
  overlayHelp: { fontSize: 11, color: '#8096B2', display: 'inline-flex', alignItems: 'center', gap: 4 },

  // Toggle switch
  toggleWrap: { display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' },
  toggleTrack: (on) => ({
    width: 36, height: 20, borderRadius: 9999,
    background: on ? '#009DE0' : '#CBD8E8',
    position: 'relative', transition: 'background 0.2s',
    flexShrink: 0,
  }),
  toggleThumb: (on) => ({
    position: 'absolute', top: 2, left: on ? 18 : 2,
    width: 16, height: 16, borderRadius: '50%',
    background: 'white',
    transition: 'left 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  }),
  toggleText: { fontSize: 13, color: '#002C77', fontWeight: 600 },

  // Main content panel (chart placeholder)
  panel: { background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #E2E8F0' },
  panelTitle: { fontSize: 14, fontWeight: 700, color: '#002C77', textTransform: 'uppercase', letterSpacing: '0.06em' },
  panelMeta: { fontSize: 11, color: '#8096B2' },

  // Placeholder body (until data is wired)
  placeholder: {
    minHeight: 320,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 10,
    background: 'linear-gradient(180deg, #F7F9FC 0%, white 100%)',
    border: '1px dashed #CBD8E8',
    borderRadius: 10,
    padding: 24,
    textAlign: 'center',
  },
  placeholderTitle: { fontSize: 14, fontWeight: 700, color: '#334E85' },
  placeholderBody: { fontSize: 12, color: '#8096B2', maxWidth: 480, lineHeight: 1.5 },
  placeholderTag: { fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#EEF2F7', color: '#334E85', border: '1px solid #CBD8E8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },

  // Source-of-truth footer note
  footer: { marginTop: 14, fontSize: 11, color: '#8096B2', lineHeight: 1.6, padding: '10px 14px', background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 8 },
  footerStrong: { color: '#334E85', fontWeight: 600 },
}

const VIEWS = [
  { id: 'cash',     label: 'Cash Projection',        icon: Wallet,     sheet: 'Cash Tracker 2026' },
  { id: 'proforma', label: 'Pro Forma Projections',  icon: TrendingUp, sheet: 'PRO FORMA 2026'    },
]

function PillNav({ value, onChange }) {
  return (
    <div style={S.pillRow}>
      {VIEWS.map(v => {
        const Icon = v.icon
        const active = value === v.id
        return (
          <button
            key={v.id}
            style={S.pill(active)}
            onClick={() => onChange(v.id)}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#009DE0'; e.currentTarget.style.color = '#002C77' } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#CBD8E8'; e.currentTarget.style.color = '#334E85' } }}
          >
            <Icon size={14} />
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

function OverlayToggle({ on, onChange }) {
  return (
    <div style={S.overlayRow}>
      <label style={S.toggleWrap} onClick={() => onChange(!on)}>
        <div style={S.toggleTrack(on)}>
          <div style={S.toggleThumb(on)} />
        </div>
        <span style={S.toggleText}>Overlay Pipeline</span>
      </label>
      <span style={S.overlayHelp}>
        <Info size={11} />
        Layers weighted pipeline forecast on top of the active view
      </span>
    </div>
  )
}

function ViewPanel({ view, overlay }) {
  const meta = VIEWS.find(v => v.id === view)
  const Icon = meta.icon

  return (
    <div style={S.panel}>
      <div style={S.panelHeader}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#002C77' }}>
          <Icon size={16} />
          <span style={S.panelTitle}>{meta.label}</span>
        </div>
        <span style={S.panelMeta}>
          Source: 2025 Pro Forma.xlsx <span style={{ color: '#CBD8E8', margin: '0 6px' }}>·</span> sheet: <strong style={{ color: '#334E85' }}>{meta.sheet}</strong>
        </span>
      </div>

      <div style={S.placeholder}>
        <Layers size={28} color="#009DE0" />
        <div style={S.placeholderTitle}>Chart scaffold</div>
        <div style={S.placeholderBody}>
          Data wiring is in progress. The {meta.label.toLowerCase()} view will read{' '}
          <strong style={{ color: '#334E85' }}>{meta.sheet}</strong> from the THSFinanceBinder SharePoint Pro Forma workbook, refreshed daily by <strong style={{ color: '#334E85' }}>mr-ledger</strong>.
        </div>
        {overlay && (
          <div style={{ ...S.placeholderTag, background: '#FFF7E5', borderColor: '#E5C66B', color: '#7A5A00' }}>
            + Pipeline overlay ACTIVE — Notion-sourced, weighted by probability
          </div>
        )}
      </div>

      <div style={S.footer}>
        <strong style={S.footerStrong}>What lands here next:</strong> chart component (recharts or chart.js),
        SharePoint Graph fetch via mr-ledger, period selector (month/quarter/YTD),
        and click-through to row-level detail. Pipeline overlay reads the BD pipeline Notion database
        and projects probability-weighted revenue against the same time axis as the active view.
      </div>
    </div>
  )
}

export default function CompanyFinancePage() {
  const [view, setView] = useState('cash')
  const [overlay, setOverlay] = useState(false)

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <h1 style={S.h1}>
            <Building2 size={20} color="#002C77" />
            Company Finance
          </h1>
          <div style={S.sub}>Cash projections, pro forma, and pipeline overlay — sourced from the TH Finance Binder.</div>
        </div>
        <span style={S.scopeBadge}>
          THIRD HORIZON
        </span>
      </div>

      <PillNav value={view} onChange={setView} />

      <OverlayToggle on={overlay} onChange={setOverlay} />

      <ViewPanel view={view} overlay={overlay} />
    </div>
  )
}
