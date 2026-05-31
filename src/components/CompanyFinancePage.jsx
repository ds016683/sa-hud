import { useState, useEffect, useMemo } from 'react'
import { Wallet, TrendingUp, Layers, Building2, Info, RefreshCw, AlertCircle, Landmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PlaidActionsBar from './PlaidActionsBar'
import BankingActivity from './BankingActivity'

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  h1: { fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
  sub: { fontSize: 13, color: '#8096B2', margin: '2px 0 0' },
  scopeBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: '#EEF2F7', color: '#334E85', fontSize: 11, fontWeight: 600, border: '1px solid #CBD8E8', letterSpacing: '0.04em' },
  syncPill: (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999,
    background: status === 'ok' ? '#E6F4EA' : status === 'pending' ? '#FFF4E0' : '#FCE8E8',
    color: status === 'ok' ? '#1E7C3A' : status === 'pending' ? '#9A6400' : '#A02323',
    fontSize: 11, fontWeight: 600, border: `1px solid ${status === 'ok' ? '#B7E1C2' : status === 'pending' ? '#F2D592' : '#F2B5B5'}`,
  }),
  pillRow: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  pill: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 9999, border: '1px solid',
    fontSize: 13, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: active ? 600 : 500,
    background: active ? '#002C77' : 'white',
    color: active ? 'white' : '#334E85',
    borderColor: active ? '#002C77' : '#CBD8E8',
    transition: 'all 0.15s',
  }),
  overlayRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 14px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  overlayLabel: { fontSize: 12, color: '#565656', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
  overlayHelp: { fontSize: 11, color: '#8096B2', display: 'inline-flex', alignItems: 'center', gap: 4 },
  toggleWrap: { display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' },
  toggleTrack: (on) => ({ width: 36, height: 20, borderRadius: 9999, background: on ? '#009DE0' : '#CBD8E8', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }),
  toggleThumb: (on) => ({ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }),

  card: { background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 20 },
  cardHeader: { padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#002C77', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 },
  cardSub: { fontSize: 11, color: '#8096B2' },

  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, padding: 16 },
  metricCard: { background: '#F7FAFD', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 },
  metricLabel: { fontSize: 11, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: 700, color: '#002C77', fontFamily: 'Arial, Helvetica, sans-serif' },
  metricSub: { fontSize: 11, color: '#565656', marginTop: 4 },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', position: 'sticky', top: 0, whiteSpace: 'nowrap' },
  thNum: { textAlign: 'right', padding: '10px 12px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  td: { padding: '8px 12px', borderBottom: '1px solid #F0F4F9', color: '#1A2B47', whiteSpace: 'nowrap' },
  tdNum: { padding: '8px 12px', borderBottom: '1px solid #F0F4F9', color: '#1A2B47', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  tdLabel: { padding: '8px 12px', borderBottom: '1px solid #F0F4F9', color: '#002C77', fontWeight: 600, whiteSpace: 'nowrap' },
  tdContractId: { padding: '8px 12px', borderBottom: '1px solid #F0F4F9', color: '#565656', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, whiteSpace: 'nowrap' },
  rowHeadline: { background: '#EFF6FC' },
  rowSection: { background: '#002C77' },
  tdSection: { padding: '10px 12px', borderBottom: '1px solid #001A4D', color: 'white', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  tdSectionNum: { padding: '10px 12px', borderBottom: '1px solid #001A4D', color: 'white', fontWeight: 700, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  rowSubtotal: { background: '#F0F4F9' },
  rowMuted: { color: '#8096B2' },

  empty: { padding: 40, textAlign: 'center', color: '#8096B2', fontSize: 13 },
  errorBox: { padding: 16, background: '#FCE8E8', border: '1px solid #F2B5B5', borderRadius: 10, color: '#A02323', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10 },
}

const MONTHS_2025 = [
  { col: 'D', label: 'Jan 25' }, { col: 'E', label: 'Feb 25' }, { col: 'F', label: 'Mar 25' },
  { col: 'G', label: 'Apr 25' }, { col: 'H', label: 'May 25' }, { col: 'I', label: 'Jun 25' },
  { col: 'J', label: 'Jul 25' }, { col: 'K', label: 'Aug 25' }, { col: 'L', label: 'Sep 25' },
  { col: 'M', label: 'Oct 25' }, { col: 'N', label: 'Nov 25' }, { col: 'O', label: 'Dec 25' },
  { col: 'P', label: '2025 Total' },
]
const MONTHS_2026 = [
  { col: 'T', label: 'Jan 26' }, { col: 'U', label: 'Feb 26' }, { col: 'V', label: 'Mar 26' },
  { col: 'W', label: 'Apr 26' }, { col: 'X', label: 'May 26' }, { col: 'Y', label: 'Jun 26' },
  { col: 'Z', label: 'Jul 26' }, { col: 'AA', label: 'Aug 26' }, { col: 'AB', label: 'Sep 26' },
  { col: 'AC', label: 'Oct 26' }, { col: 'AD', label: 'Nov 26' }, { col: 'AE', label: 'Dec 26' },
  { col: 'AF', label: '2026 Total' },
]
const HEADLINE_LABELS = new Set(['Base Revenue', 'Pipeline Revenue', 'Forecasted Revenue'])

function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = typeof n === 'number' ? n : parseFloat(n)
  if (Number.isNaN(num)) return typeof n === 'string' ? n : '—'
  return '$' + Math.round(num).toLocaleString('en-US')
}

function fmtTime(ts) {
  if (!ts) return 'never'
  const d = new Date(ts)
  const now = new Date()
  const ms = now - d
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function CompanyFinancePage() {
  const [view, setView] = useState('banking')  // 'banking' | 'proforma' | 'cash' | 'pipeline'
  const [year, setYear] = useState(2026)
  const [showPipelineOverlay, setShowPipelineOverlay] = useState(true)

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [proForma, setProForma] = useState([])
  const [cashTracker, setCashTracker] = useState([])
  const [pipelineForecast, setPipelineForecast] = useState([])
  const [syncMeta, setSyncMeta] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setErr(null)
      try {
        const [pf, ct, pi, sm] = await Promise.all([
          supabase.schema('finance').from('pro_forma').select('*').order('row_index'),
          supabase.schema('finance').from('cash_tracker').select('*').order('row_index'),
          supabase.schema('finance').from('pipeline_forecast').select('*').order('row_index'),
          supabase.schema('finance').from('sync_metadata').select('*'),
        ])
        if (cancelled) return
        if (pf.error) throw pf.error
        if (ct.error) throw ct.error
        if (pi.error) throw pi.error
        if (sm.error) throw sm.error
        setProForma(pf.data || [])
        setCashTracker(ct.data || [])
        setPipelineForecast(pi.data || [])
        setSyncMeta(sm.data || [])
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const months = year === 2026 ? MONTHS_2026 : MONTHS_2025
  const pfSync = syncMeta.find(s => s.source === 'pro_forma')
  const ctSync = syncMeta.find(s => s.source === 'cash_tracker')
  const piSync = syncMeta.find(s => s.source === 'pipeline_forecast')

  const headlines = useMemo(() => {
    const find = (label) => proForma.find(r => r.label === label)
    const base = find('Base Revenue')
    const pipe = find('Pipeline Revenue')
    const fc = find('Forecasted Revenue')
    const totalCol = year === 2026 ? 'AF' : 'P'
    return {
      base: base?.payload?.[totalCol],
      pipeline: pipe?.payload?.[totalCol],
      forecast: fc?.payload?.[totalCol],
    }
  }, [proForma, year])

  // Identify section header rows: payload.A null AND payload.B is a non-empty string AND payload.C null AND
  // monthly cells in this row aggregate the section below (e.g. "BEH - Behavioral Health").
  // We treat any row where label !== 'FF' && label !== 'RR' && payload.C is empty AND payload.B looks like a category as a section.
  const SECTION_PATTERN = /^[A-Z]{2,4}\s*-\s/  // BEH -, PAD -, MAR -, WWB -, CMH - etc.
  const SUMMARY_LABELS = new Set(['Base Revenue', 'Pipeline Revenue', 'Forecasted Revenue', 'Profit & Loss Pro Forma', 'Projected'])

  // Visible Pro Forma rows: pass through everything that has either a label or a payload.B name.
  // Skip the very-top header rows we already render as headline metrics.
  const visibleRows = useMemo(() => {
    return proForma.filter(r => {
      const b = (r.payload?.B || '').toString().trim()
      const hasName = b.length > 0
      if (!hasName && !r.label) return false
      // Suppress the duplicate "Profit & Loss Pro Forma" + "Projected" header rows
      if (SUMMARY_LABELS.has(r.label) && r.label !== 'Base Revenue' && r.label !== 'Pipeline Revenue' && r.label !== 'Forecasted Revenue') {
        return false
      }
      return true
    })
  }, [proForma])

  const valueFor = (row, col) => {
    const v = row.payload?.[col]
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      // try parse numeric strings, but pass through label/header strings
      const cleaned = v.replace(/[$,]/g, '')
      const n = parseFloat(cleaned)
      if (!Number.isNaN(n) && cleaned.trim() !== '') return n
      return v
    }
    return null
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <h1 style={S.h1}><Wallet size={22} color="#009DE0" /> Company Finance</h1>
          <p style={S.sub}>Live Pro Forma — synced from THSFinanceBinder</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={S.scopeBadge}><Building2 size={11} /> THIRD HORIZON</span>
          {pfSync && (
            <span style={S.syncPill(pfSync.last_status)}>
              <RefreshCw size={11} /> {pfSync.last_status === 'ok' ? 'synced' : pfSync.last_status} {fmtTime(pfSync.last_synced_at)}
            </span>
          )}
          <PlaidActionsBar scope="th" />
        </div>
      </div>

      {/* View pills */}
      <div style={S.pillRow}>
        <span style={S.pill(view === 'banking')} onClick={() => setView('banking')}>
          <Landmark size={13} /> Banking Activity
        </span>
        <span style={S.pill(view === 'proforma')} onClick={() => setView('proforma')}>
          <TrendingUp size={13} /> Pro Forma (P&L)
        </span>
        <span style={S.pill(view === 'cash')} onClick={() => setView('cash')}>
          <Layers size={13} /> Cash Tracker
        </span>
        <span style={S.pill(view === 'pipeline')} onClick={() => setView('pipeline')}>
          <TrendingUp size={13} /> Pipeline Forecast
        </span>
      </div>

      {/* Year pills */}
      {view === 'proforma' && (
        <div style={S.pillRow}>
          <span style={S.pill(year === 2025)} onClick={() => setYear(2025)}>2025</span>
          <span style={S.pill(year === 2026)} onClick={() => setYear(2026)}>2026</span>
        </div>
      )}

      {/* Overlay toggle (visible on proforma) */}
      {view === 'proforma' && (
        <div style={S.overlayRow}>
          <span style={S.overlayLabel}>Pipeline overlay</span>
          <span style={S.toggleWrap} onClick={() => setShowPipelineOverlay(v => !v)}>
            <span style={S.toggleTrack(showPipelineOverlay)}>
              <span style={S.toggleThumb(showPipelineOverlay)} />
            </span>
            <span style={{ fontSize: 12, color: '#334E85', fontWeight: 600 }}>{showPipelineOverlay ? 'ON' : 'OFF'}</span>
          </span>
          <span style={S.overlayHelp}><Info size={11} /> Highlights Base + Pipeline + Forecasted Revenue rows</span>
        </div>
      )}

      {/* Errors */}
      {err && (
        <div style={S.errorBox}>
          <AlertCircle size={16} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Couldn't load finance data</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11 }}>{err}</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !err && <div style={S.empty}>Loading…</div>}

      {/* Banking Activity view */}
      {view === 'banking' && (
        <BankingActivity scope="th" />
      )}

      {/* Pro Forma view */}
      {!loading && !err && view === 'proforma' && (
        <>
          {/* Headline metrics */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><TrendingUp size={14} /> {year} Headline</div>
              <div style={S.cardSub}>
                {pfSync?.row_count != null ? `${pfSync.row_count} rows` : ''}
                {pfSync?.source_modified ? ` · source ${new Date(pfSync.source_modified).toLocaleDateString()}` : ''}
              </div>
            </div>
            <div style={S.metricGrid}>
              <div style={S.metricCard}>
                <div style={S.metricLabel}>Base Revenue</div>
                <div style={S.metricValue}>{fmtMoney(headlines.base)}</div>
                <div style={S.metricSub}>{year} total</div>
              </div>
              <div style={S.metricCard}>
                <div style={S.metricLabel}>Pipeline Revenue</div>
                <div style={S.metricValue}>{fmtMoney(headlines.pipeline)}</div>
                <div style={S.metricSub}>{year} total</div>
              </div>
              <div style={S.metricCard}>
                <div style={S.metricLabel}>Forecasted Revenue</div>
                <div style={S.metricValue}>{fmtMoney(headlines.forecast)}</div>
                <div style={S.metricSub}>{year} total (base + pipeline)</div>
              </div>
            </div>
          </div>

          {/* Full table */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Layers size={14} /> {year} Pro Forma rows</div>
              <div style={S.cardSub}>{visibleRows.length} rows</div>
            </div>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Line</th>
                    <th style={S.th}>Contract ID</th>
                    {months.map(m => <th key={m.col} style={S.thNum}>{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(row => {
                    const isHeadline = HEADLINE_LABELS.has(row.label)
                    const rowName = (row.payload?.B && typeof row.payload.B === 'string' ? row.payload.B.trim() : '') || row.label || ''
                    const contractId = (row.payload?.C && typeof row.payload.C === 'string' ? row.payload.C.trim() : '') || ''
                    const aTag = (row.payload?.A || '').toString().trim()
                    const isSection = !isHeadline && !contractId && SECTION_PATTERN.test(rowName)
                    const isSubtotal = !isHeadline && !contractId && /total\s*$/i.test(rowName)

                    if (isSection) {
                      return (
                        <tr key={row.row_index} style={S.rowSection}>
                          <td style={S.tdSection} colSpan={2}>{rowName}</td>
                          {months.map(m => {
                            const v = valueFor(row, m.col)
                            return (
                              <td key={m.col} style={S.tdSectionNum}>
                                {typeof v === 'number' ? fmtMoney(v) : ''}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    }

                    return (
                      <tr key={row.row_index} style={isHeadline && showPipelineOverlay ? S.rowHeadline : (isSubtotal ? S.rowSubtotal : null)}>
                        <td style={{ ...S.tdLabel, ...(isSubtotal ? { fontWeight: 700 } : {}) }}>{rowName}</td>
                        <td style={S.tdContractId}>{contractId}</td>
                        {months.map(m => {
                          const v = valueFor(row, m.col)
                          const isNumber = typeof v === 'number'
                          return (
                            <td key={m.col} style={S.tdNum}>
                              {isNumber ? fmtMoney(v) : (v === null ? '' : <span style={{ color: '#A8B7CC' }}>{String(v)}</span>)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Cash Tracker view — raw rows */}
      {!loading && !err && view === 'cash' && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Layers size={14} /> Cash Tracker</div>
            <div style={S.cardSub}>
              {ctSync?.row_count ?? cashTracker.length} rows
              {ctSync?.last_synced_at ? ` · synced ${fmtTime(ctSync.last_synced_at)}` : ''}
            </div>
          </div>
          <div style={{ padding: 16, fontSize: 12, color: '#8096B2' }}>
            Raw cell dump (v1). Smart parsing planned for v2 — current data shape is column-letter ↔ value.
          </div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Row</th>
                  <th style={S.th}>Label</th>
                  <th style={S.th}>Sample values</th>
                </tr>
              </thead>
              <tbody>
                {cashTracker.slice(0, 50).map(r => (
                  <tr key={r.row_index}>
                    <td style={S.td}>{r.row_index}</td>
                    <td style={S.tdLabel}>{r.label || <span style={{ color: '#A8B7CC' }}>—</span>}</td>
                    <td style={S.td}>
                      {Object.entries(r.payload || {}).slice(0, 4).map(([k, v]) => (
                        <span key={k} style={{ marginRight: 12, color: '#565656' }}>
                          <code style={{ fontSize: 10, color: '#8096B2' }}>{k}</code>:{' '}
                          {typeof v === 'number' ? fmtMoney(v) : String(v).slice(0, 24)}
                        </span>
                      ))}
                      {Object.keys(r.payload || {}).length > 4 && (
                        <span style={{ color: '#A8B7CC', fontSize: 11 }}>+{Object.keys(r.payload).length - 4} more</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cashTracker.length > 50 && (
            <div style={{ padding: 12, fontSize: 11, color: '#8096B2', textAlign: 'center', borderTop: '1px solid #F0F4F9' }}>
              Showing 50 of {cashTracker.length} rows
            </div>
          )}
        </div>
      )}

      {/* Pipeline Forecast view */}
      {!loading && !err && view === 'pipeline' && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><TrendingUp size={14} /> Pipeline Forecast (raw)</div>
            <div style={S.cardSub}>
              {piSync?.row_count ?? pipelineForecast.length} rows
              {piSync?.last_synced_at ? ` · synced ${fmtTime(piSync.last_synced_at)}` : ''}
            </div>
          </div>
          <div style={{ padding: 16, fontSize: 12, color: '#8096B2' }}>
            This sheet uses cross-sheet refs (many `#REF!` until smart parser lands). v1 = read-only preview.
            Better source: Notion Pipeline DB (coming next — `finance.notion_pipeline` is wired but empty).
          </div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Row</th>
                  <th style={S.th}>Deal</th>
                  <th style={S.th}>Stage</th>
                  <th style={S.thNum}>Weighted</th>
                </tr>
              </thead>
              <tbody>
                {pipelineForecast.slice(0, 50).map(r => (
                  <tr key={r.row_index}>
                    <td style={S.td}>{r.row_index}</td>
                    <td style={S.tdLabel}>{r.deal_name || r.payload?.B || r.payload?.F || <span style={{ color: '#A8B7CC' }}>—</span>}</td>
                    <td style={S.td}>{r.stage || <span style={{ color: '#A8B7CC' }}>—</span>}</td>
                    <td style={S.tdNum}>{r.weighted != null ? fmtMoney(r.weighted) : <span style={{ color: '#A8B7CC' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
