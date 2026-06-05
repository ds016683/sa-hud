import { useState, useEffect, useMemo } from 'react'
import { Wallet, TrendingUp, Layers, Building2, RefreshCw, AlertCircle, Landmark, ChevronRight, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PlaidActionsBar from './PlaidActionsBar'
import BankingActivity from './BankingActivity'

// ─── Month definitions ────────────────────────────────────────────────────────
const MONTHS_2026 = [
  { col: 'T',  label: 'Jan', full: 'January 2026',   isActual: true  },
  { col: 'U',  label: 'Feb', full: 'February 2026',  isActual: true  },
  { col: 'V',  label: 'Mar', full: 'March 2026',     isActual: true  },
  { col: 'W',  label: 'Apr', full: 'April 2026',     isActual: true  },
  { col: 'X',  label: 'May', full: 'May 2026',       isActual: false },
  { col: 'Y',  label: 'Jun', full: 'June 2026',      isActual: false },
  { col: 'Z',  label: 'Jul', full: 'July 2026',      isActual: false },
  { col: 'AA', label: 'Aug', full: 'August 2026',    isActual: false },
  { col: 'AB', label: 'Sep', full: 'September 2026', isActual: false },
  { col: 'AC', label: 'Oct', full: 'October 2026',   isActual: false },
  { col: 'AD', label: 'Nov', full: 'November 2026',  isActual: false },
  { col: 'AE', label: 'Dec', full: 'December 2026',  isActual: false },
  { col: 'AF', label: 'Total', full: 'Total',        isActual: false, isTotal: true },
]
const MONTHS_2025 = [
  { col: 'D', label: 'Jan' }, { col: 'E', label: 'Feb' }, { col: 'F', label: 'Mar' },
  { col: 'G', label: 'Apr' }, { col: 'H', label: 'May' }, { col: 'I', label: 'Jun' },
  { col: 'J', label: 'Jul' }, { col: 'K', label: 'Aug' }, { col: 'L', label: 'Sep' },
  { col: 'M', label: 'Oct' }, { col: 'N', label: 'Nov' }, { col: 'O', label: 'Dec' },
  { col: 'P', label: 'Total', isTotal: true },
]

// ─── P&L structure: maps row_indices from finance.pro_forma ──────────────────
const REVENUE_TOTAL_ROW = 6    // Base Revenue (updated w/ NS actuals Jan-Apr)
const EXPENSES_TOTAL_ROW = 168 // Total Expenses (updated w/ NS actuals Jan-Apr)
const NET_INCOME_ROW = 253     // Net Income (updated w/ NS actuals Jan-Apr)

const REVENUE_PRACTICE_AREAS = [
  { rowIndex: 9,   label: 'Behavioral Health',          tag: 'BEH' },
  { rowIndex: 59,  label: 'Payment Design & Analytics', tag: 'PAD' },
  { rowIndex: 75,  label: 'Market Analytics',           tag: 'MAR' },
  { rowIndex: 123, label: 'Workplace Well-Being',       tag: 'WWB' },
  { rowIndex: 136, label: 'Community Health',           tag: 'CMH' },
  { rowIndex: 157, label: 'Third Horizon General',      tag: 'THS' },
]

const EXPENSE_CATEGORIES = [
  {
    id: 'comp',
    label: 'Compensation & Benefits',
    totalRow: 185,
    lines: [
      { rowIndex: 191, label: 'Wages' },
      { rowIndex: 190, label: 'Payroll Taxes' },
      { rowIndex: 187, label: '401(k) Match' },
      { rowIndex: 188, label: 'Health Insurance / HRA' },
      { rowIndex: 193, label: 'Wellbeing Benefit' },
      { rowIndex: 186, label: '401(k) Fees' },
      { rowIndex: 189, label: 'Payroll Processing Fees' },
      { rowIndex: 211, label: 'Cell Phone' },
    ],
  },
  {
    id: 'data_tech',
    label: 'Data & Technology',
    totalRow: 240,  // Project Starset is the primary data cost center
    lines: [
      { rowIndex: 244, label: 'Meco Cloud (Google)' },
      { rowIndex: 245, label: 'Komodo' },
      { rowIndex: 247, label: 'Internology' },
      { rowIndex: 248, label: 'Candor' },
      { rowIndex: 243, label: 'Siftia / Extendo (Platform)' },
      { rowIndex: 246, label: 'PACES' },
      { rowIndex: 233, label: 'SaaS / Subscriptions' },
    ],
  },
  {
    id: 'contractors',
    label: 'Contractors & Professional Fees',
    sumRows: [170, 215],   // no single total — sum these
    lines: [
      { rowIndex: 172, label: 'Anatomy IT' },
      { rowIndex: 183, label: 'Well-being Coaches' },
      { rowIndex: 215, label: 'Legal & Professional Services' },
    ],
  },
  {
    id: 'bizdev',
    label: 'Sales & Business Development',
    sumRows: [199, 200, 201, 202, 204],
    lines: [
      { rowIndex: 199, label: 'Business Development' },
      { rowIndex: 200, label: 'Advertising & Marketing' },
      { rowIndex: 201, label: 'Company Retreat' },
      { rowIndex: 202, label: 'Conference Sponsorship' },
      { rowIndex: 204, label: 'Terry Group Contract (Amortized)' },
    ],
  },
  {
    id: 'facilities',
    label: 'Facilities & Rent',
    totalRow: 226,
    lines: [
      { rowIndex: 228, label: 'Chicago, IL' },
      { rowIndex: 227, label: 'Connecticut' },
      { rowIndex: 229, label: 'New Hampshire' },
    ],
  },
  {
    id: 'te',
    label: 'Travel & Entertainment',
    totalRow: 238,
    lines: [],
  },
  {
    id: 'ga',
    label: 'General & Administrative',
    sumRows: [195, 209, 217, 221, 231],
    lines: [
      { rowIndex: 209, label: 'Business Insurance' },
      { rowIndex: 217, label: 'Office Supplies & Technology' },
      { rowIndex: 195, label: 'Bank Charges & Fees' },
      { rowIndex: 221, label: 'Professional Development' },
      { rowIndex: 231, label: 'State Taxes & Fees' },
    ],
  },
]

const FINANCING_ROW = 197  // Financing Expenses (factoring, interest)

// ─── Probability config ───────────────────────────────────────────────────────
const PROB_CONFIG = {
  'Near Close': { color: '#16A34A', bg: '#DCFCE7', border: '#86EFAC', label: 'Near Close' },
  'High':       { color: '#0369A1', bg: '#E0F2FE', border: '#7DD3FC', label: 'High'       },
  'Medium':     { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', label: 'Medium'     },
  'Low':        { color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB', label: 'Low'        },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = typeof n === 'number' ? n : parseFloat(n)
  if (Number.isNaN(num)) return '—'
  if (num === 0) return '—'
  const abs = Math.abs(num)
  const formatted = '$' + Math.round(abs).toLocaleString('en-US')
  return num < 0 ? `(${formatted})` : formatted
}
function fmtK(n) {
  if (!n || isNaN(n)) return '$0'
  const abs = Math.abs(n)
  const s = abs >= 1000000 ? `$${(abs / 1000000).toFixed(1)}M` : `$${Math.round(abs / 1000).toLocaleString()}K`
  return n < 0 ? `(${s})` : s
}
function fmtTime(ts) {
  if (!ts) return 'never'
  const ms = Date.now() - new Date(ts)
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function rowVal(row, col) {
  const v = row?.payload?.[col]
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[$,]/g, ''))
    return isNaN(n) ? 0 : n
  }
  return 0
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:      { maxWidth: 1280, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  h1:        { fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
  sub:       { fontSize: 13, color: '#8096B2', margin: '2px 0 0' },
  badge:     { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: '#EEF2F7', color: '#334E85', fontSize: 11, fontWeight: 600, border: '1px solid #CBD8E8' },
  syncPill:  (s) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: s === 'ok' ? '#E6F4EA' : '#FFF4E0', color: s === 'ok' ? '#1E7C3A' : '#9A6400', border: `1px solid ${s === 'ok' ? '#B7E1C2' : '#F2D592'}` }),
  pillRow:   { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  pill:      (a) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9999, border: '1px solid', fontSize: 13, cursor: 'pointer', fontWeight: a ? 600 : 500, background: a ? '#002C77' : 'white', color: a ? 'white' : '#334E85', borderColor: a ? '#002C77' : '#CBD8E8', transition: 'all 0.15s' }),
  card:      { background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 },
  cardHdr:   { padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#002C77', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 },
  metricGrid:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: 16 },
  metric:    (neg) => ({ background: neg ? '#FFF5F5' : '#F7FAFD', border: `1px solid ${neg ? '#FED7D7' : '#E2E8F0'}`, borderRadius: 10, padding: 14 }),
  mLabel:    { fontSize: 11, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  mValue:    (neg) => ({ fontSize: 22, fontWeight: 700, color: neg ? '#C53030' : '#002C77', fontVariantNumeric: 'tabular-nums' }),
  mSub:      { fontSize: 11, color: '#565656', marginTop: 4 },
  toggleWrap:{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' },
  toggleTrack:(on) => ({ width: 36, height: 20, borderRadius: 9999, background: on ? '#009DE0' : '#CBD8E8', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }),
  toggleThumb:(on) => ({ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }),
  tbl:       { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thLabel:   { textAlign: 'left', padding: '9px 12px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', position: 'sticky', top: 0, whiteSpace: 'nowrap' },
  thNum:     { textAlign: 'right', padding: '9px 12px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  empty:     { padding: 40, textAlign: 'center', color: '#8096B2', fontSize: 13 },
  errBox:    { padding: 16, background: '#FCE8E8', border: '1px solid #F2B5B5', borderRadius: 10, color: '#A02323', fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 },
}

// ─── Table row components ─────────────────────────────────────────────────────
function SectionHeaderRow({ label, months, values, onClick, expanded, indent = 0, tone = 'default' }) {
  const tones = {
    default:  { bg: '#002C77', text: 'white',   subText: 'rgba(255,255,255,0.75)' },
    revenue:  { bg: '#0A3D62', text: 'white',   subText: 'rgba(255,255,255,0.75)' },
    expense:  { bg: '#1B2A4A', text: 'white',   subText: 'rgba(255,255,255,0.75)' },
    pipeline: { bg: '#0D4A2F', text: 'white',   subText: 'rgba(255,255,255,0.75)' },
    netincome:{ bg: '#003366', text: 'white',   subText: 'rgba(255,255,255,0.75)' },
    subtotal: { bg: '#EFF6FC', text: '#002C77', subText: '#4A6FA5' },
    category: { bg: '#F4F7FB', text: '#1A2B47', subText: '#4A6FA5' },
  }
  const t = tones[tone] || tones.default
  const tdStyle = { padding: '9px 12px', background: t.bg, color: t.text, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default' }
  const tdNumStyle = { padding: '9px 12px', background: t.bg, color: t.text, fontWeight: 700, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  return (
    <tr onClick={onClick} style={{ userSelect: 'none' }}>
      <td style={{ ...tdStyle, paddingLeft: 12 + indent * 12 }}>
        {onClick && (
          <span style={{ marginRight: 6, opacity: 0.8, display: 'inline-flex', verticalAlign: 'middle' }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        )}
        {label}
      </td>
      {months.map(m => (
        <td key={m.col} style={{ ...tdNumStyle, ...(m.isTotal ? { borderLeft: '1px solid rgba(255,255,255,0.15)' } : {}) }}>
          {values[m.col] !== undefined && values[m.col] !== 0 ? fmt(values[m.col]) : ''}
        </td>
      ))}
    </tr>
  )
}

function LineRow({ label, months, values, indent = 1, muted = false, tag = null }) {
  const tdBase = { borderBottom: '1px solid #F0F4F9', whiteSpace: 'nowrap' }
  const labelStyle = { ...tdBase, padding: `6px 12px 6px ${12 + indent * 14}px`, color: muted ? '#94A3B8' : '#334E85', fontSize: 12 }
  const numStyle = { ...tdBase, padding: '6px 12px', textAlign: 'right', color: muted ? '#94A3B8' : '#1A2B47', fontVariantNumeric: 'tabular-nums', fontSize: 12 }
  return (
    <tr style={{ background: indent % 2 === 0 ? '#FAFCFE' : 'white' }}>
      <td style={labelStyle}>
        {label}
        {tag && (
          <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: PROB_CONFIG[tag]?.bg || '#F3F4F6', color: PROB_CONFIG[tag]?.color || '#6B7280', border: `1px solid ${PROB_CONFIG[tag]?.border || '#D1D5DB'}` }}>
            {PROB_CONFIG[tag]?.label || tag}
          </span>
        )}
      </td>
      {months.map(m => (
        <td key={m.col} style={{ ...numStyle, ...(m.isTotal ? { borderLeft: '1px solid #E2E8F0', background: '#F7FAFD', fontWeight: 600, color: '#334E85' } : {}) }}>
          {values[m.col] ? fmt(values[m.col]) : ''}
        </td>
      ))}
    </tr>
  )
}

function DividerRow({ label, months, style = {} }) {
  return (
    <tr style={{ height: 4, ...style }}>
      <td colSpan={months.length + 1} style={{ background: '#E2E8F0', padding: 0 }} />
    </tr>
  )
}

function SpacerRow({ months }) {
  return (
    <tr style={{ height: 8 }}>
      <td colSpan={months.length + 1} style={{ background: '#F7FAFD' }} />
    </tr>
  )
}

function NetIncomeRow({ label, months, values }) {
  return (
    <tr>
      <td style={{ padding: '14px 12px', background: '#001A3D', color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', borderTop: '3px solid #009DE0' }}>
        {label}
      </td>
      {months.map(m => {
        const v = values[m.col]
        const neg = typeof v === 'number' && v < 0
        return (
          <td key={m.col} style={{ padding: '14px 12px', background: '#001A3D', textAlign: 'right', fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: neg ? '#FC8181' : '#68D391', borderTop: '3px solid #009DE0', ...(m.isTotal ? { borderLeft: '1px solid rgba(0,157,224,0.3)' } : {}) }}>
            {v ? fmt(v) : '—'}
          </td>
        )
      })}
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CompanyFinancePage() {
  const [view, setView]   = useState('banking')
  const year = 2026
  const [showPipeline, setShowPipeline] = useState(false)
  const [expanded, setExpanded] = useState({})  // { catId: bool, revenue: bool, pipeline: bool }

  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState(null)
  const [proForma, setProForma]         = useState([])
  const [cashTracker, setCashTracker]   = useState([])
  const [pipelineForecast, setPipelineForecast] = useState([])
  const [syncMeta, setSyncMeta]         = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setErr(null)
      try {
        const [pf, ct, pi, sm] = await Promise.all([
          supabase.schema('finance').from('pro_forma').select('*').order('row_index'),
          supabase.schema('finance').from('cash_tracker').select('*').order('row_index'),
          supabase.schema('finance').from('pipeline_forecast').select('*').order('row_index'),
          supabase.schema('finance').from('sync_metadata').select('*'),
        ])
        if (cancelled) return
        if (pf.error) throw pf.error
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

  const months = MONTHS_2026
  const pfSync = syncMeta.find(s => s.source === 'pro_forma')
  const piSync = syncMeta.find(s => s.source === 'notion_pipeline')

  // ── Row lookup ────────────────────────────────────────────────────────────
  const rowMap = useMemo(() => {
    const m = {}
    proForma.forEach(r => { m[r.row_index] = r })
    return m
  }, [proForma])

  // ── Get monthly values for a row ──────────────────────────────────────────
  function monthVals(rowIndex) {
    const row = rowMap[rowIndex]
    if (!row) return {}
    const out = {}
    months.forEach(m => { out[m.col] = rowVal(row, m.col) })
    return out
  }

  // ── Sum monthly values across multiple rows ───────────────────────────────
  function sumMonthVals(rowIndices) {
    const out = {}
    months.forEach(m => {
      out[m.col] = rowIndices.reduce((acc, ri) => acc + rowVal(rowMap[ri], m.col), 0)
    })
    return out
  }

  // ── Pipeline data from Notion accrual months (row_index 200001+) ──────────
  // month_label like "August 2026" → col letter
  const MONTH_LABEL_TO_COL = {
    'January 2026': 'T', 'February 2026': 'U', 'March 2026': 'V', 'April 2026': 'W',
    'May 2026': 'X', 'June 2026': 'Y', 'July 2026': 'Z', 'August 2026': 'AA',
    'September 2026': 'AB', 'October 2026': 'AC', 'November 2026': 'AD', 'December 2026': 'AE',
  }

  const { accrualRows, dealRows } = useMemo(() => {
    const accrual = pipelineForecast.filter(r => r.row_index >= 200001)
    const deals   = pipelineForecast.filter(r => r.row_index >= 100001 && r.row_index < 200001)
    return { accrualRows: accrual, dealRows: deals }
  }, [pipelineForecast])

  // Pipeline monthly totals: col → total_CM
  const pipelineMonthTotals = useMemo(() => {
    const out = {}
    months.forEach(m => { out[m.col] = 0 })
    accrualRows.forEach(r => {
      const col = MONTH_LABEL_TO_COL[r.payload?.month_label]
      if (col && r.payload?.total_contribution_margin) {
        out[col] = (out[col] || 0) + r.payload.total_contribution_margin
      }
    })
    // Total column
    out['AF'] = Object.entries(out).filter(([k]) => k !== 'AF').reduce((s, [, v]) => s + v, 0)
    return out
  }, [accrualRows, months])

  // Per-deal monthly allocations: [{ name, probability, monthlyVals }]
  const pipelineDeals = useMemo(() => {
    const dealMonths = {}  // deal_row_index → { col: CM }
    accrualRows.forEach(r => {
      const col = MONTH_LABEL_TO_COL[r.payload?.month_label]
      if (!col) return
      ;(r.payload?.deal_allocations || []).forEach(d => {
        if (!d.contribution_margin) return
        if (!dealMonths[d.deal_row_index]) dealMonths[d.deal_row_index] = {}
        dealMonths[d.deal_row_index][col] = (dealMonths[d.deal_row_index][col] || 0) + d.contribution_margin
      })
    })
    return dealRows
      .filter(r => r.weighted > 0 && dealMonths[r.row_index])
      .map(r => {
        const mv = dealMonths[r.row_index] || {}
        const total = Object.values(mv).reduce((s, v) => s + v, 0)
        const vals = { ...mv, AF: total }
        return { rowIndex: r.row_index, name: r.deal_name, probability: r.payload?.probability, vals }
      })
      .sort((a, b) => {
        const order = { 'Near Close': 0, 'High': 1, 'Medium': 2, 'Low': 3 }
        return (order[a.probability] ?? 4) - (order[b.probability] ?? 4)
      })
  }, [accrualRows, dealRows])

  // ── Computed P&L values ────────────────────────────────────────────────────
  const baseRevenueVals    = useMemo(() => monthVals(REVENUE_TOTAL_ROW),    [rowMap, months])
  const totalExpensesVals  = useMemo(() => monthVals(EXPENSES_TOTAL_ROW),   [rowMap, months])
  const netIncomeBaseVals  = useMemo(() => monthVals(NET_INCOME_ROW),       [rowMap, months])
  const financingVals      = useMemo(() => monthVals(FINANCING_ROW),        [rowMap, months])

  // Forecasted revenue = base + pipeline (if ON)
  const forecastedRevenueVals = useMemo(() => {
    if (!showPipeline) return baseRevenueVals
    const out = {}
    months.forEach(m => { out[m.col] = (baseRevenueVals[m.col] || 0) + (pipelineMonthTotals[m.col] || 0) })
    return out
  }, [baseRevenueVals, pipelineMonthTotals, showPipeline, months])

  // Net Income with pipeline shift: net income + pipeline revenue (expenses unchanged)
  const netIncomeVals = useMemo(() => {
    if (!showPipeline) return netIncomeBaseVals
    const out = {}
    months.forEach(m => { out[m.col] = (netIncomeBaseVals[m.col] || 0) + (pipelineMonthTotals[m.col] || 0) })
    return out
  }, [netIncomeBaseVals, pipelineMonthTotals, showPipeline, months])

  // ── Headline summary ──────────────────────────────────────────────────────
  const totalCol = year === 2026 ? 'AF' : 'P'
  const totalRevenue    = forecastedRevenueVals[totalCol] || 0
  const totalExpenses   = totalExpensesVals[totalCol]    || 0
  const totalNetIncome  = netIncomeVals[totalCol]        || 0

  // ── Expense category helpers ───────────────────────────────────────────────
  function catVals(cat) {
    if (cat.totalRow) return monthVals(cat.totalRow)
    if (cat.sumRows)  return sumMonthVals(cat.sumRows)
    return {}
  }

  function toggle(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <h1 style={S.h1}><Wallet size={22} color="#009DE0" /> Company Finance</h1>
          <p style={S.sub}>Third Horizon Strategies — Live Pro Forma</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={S.badge}><Building2 size={11} /> THIRD HORIZON</span>
          {pfSync && (
            <span style={S.syncPill(pfSync.last_status)}>
              <RefreshCw size={11} /> synced {fmtTime(pfSync.last_synced_at)}
            </span>
          )}
          {piSync && (
            <span style={S.syncPill(piSync.last_status)}>
              <TrendingUp size={11} /> pipeline {fmtTime(piSync.last_synced_at)}
            </span>
          )}
          <PlaidActionsBar scope="th" />
        </div>
      </div>

      {/* ── Nav pills ──────────────────────────────────────────────────── */}
      <div style={S.pillRow}>
        {[
          { id: 'banking', icon: <Landmark size={13} />, label: 'Banking Activity' },
          { id: 'proforma', icon: <TrendingUp size={13} />, label: 'P&L / Pro Forma' },
          { id: 'cash', icon: <Layers size={13} />, label: 'Cash Tracker' },
        ].map(v => (
          <span key={v.id} style={S.pill(view === v.id)} onClick={() => setView(v.id)}>
            {v.icon} {v.label}
          </span>
        ))}
      </div>

      {/* ── Errors ─────────────────────────────────────────────────────── */}
      {err && (
        <div style={S.errBox}>
          <AlertCircle size={16} />
          <div><strong>Load error:</strong> {err}</div>
        </div>
      )}

      {loading && !err && <div style={S.empty}>Loading…</div>}

      {/* ═══════════════════════════════════════════════════════════════════
          BANKING VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {view === 'banking' && <BankingActivity scope="th" />}

      {/* ═══════════════════════════════════════════════════════════════════
          P&L VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {!loading && !err && view === 'proforma' && (
        <>
          {/* ── Headline metrics ────────────────────────────────────────── */}
          <div style={S.card}>
            <div style={S.cardHdr}>
              <div style={S.cardTitle}><TrendingUp size={14} /> 2026 Summary</div>
              <div style={{ fontSize: 11, color: '#8096B2' }}>
                Jan–Apr: NetSuite actuals · May–Dec: Pro forma projections
                {showPipeline && <span style={{ marginLeft: 8, color: '#009DE0', fontWeight: 700 }}>+ Pipeline overlay ON</span>}
              </div>
            </div>
            <div style={S.metricGrid}>
              <div style={S.metric(false)}>
                <div style={S.mLabel}>Base Revenue</div>
                <div style={S.mValue(false)}>{fmtK(baseRevenueVals[totalCol])}</div>
                <div style={S.mSub}>2026 contracted</div>
              </div>
              {showPipeline && (
                <div style={{ ...S.metric(false), background: '#EFF9FF', border: '1px solid #BAE6FD' }}>
                  <div style={{ ...S.mLabel, color: '#0369A1' }}>Pipeline Revenue</div>
                  <div style={{ ...S.mValue(false), color: '#0369A1' }}>{fmtK(pipelineMonthTotals[totalCol])}</div>
                  <div style={S.mSub}>{pipelineDeals.length} active deals · weighted CM</div>
                </div>
              )}
              <div style={S.metric(false)}>
                <div style={S.mLabel}>Total Expenses</div>
                <div style={S.mValue(false)}>{fmtK(totalExpenses)}</div>
                <div style={S.mSub}>2026 total</div>
              </div>
              <div style={S.metric(totalNetIncome < 0)}>
                <div style={S.mLabel}>Net Income</div>
                <div style={S.mValue(totalNetIncome < 0)}>{fmtK(totalNetIncome)}</div>
                <div style={S.mSub}>{totalNetIncome < 0 ? 'Net loss' : 'Net profit'} · 2026 total</div>
              </div>
            </div>
          </div>

          {/* ── P&L Table ───────────────────────────────────────────────── */}
          <div style={S.card}>
            <div style={S.cardHdr}>
              <div style={S.cardTitle}><Layers size={14} /> 2026 Profit & Loss</div>
              {year === 2026 && (
                <span style={S.toggleWrap} onClick={() => setShowPipeline(v => !v)}>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pipeline Overlay</span>
                  <span style={S.toggleTrack(showPipeline)}><span style={S.toggleThumb(showPipeline)} /></span>
                  <span style={{ fontSize: 12, color: showPipeline ? '#009DE0' : '#94A3B8', fontWeight: 700 }}>{showPipeline ? 'ON' : 'OFF'}</span>
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={{ ...S.thLabel, minWidth: 240 }}>Line Item</th>
                    {months.map(m => (
                      <th key={m.col} style={{ ...S.thNum, ...(m.isTotal ? { borderLeft: '1px solid #CBD8E8', background: '#EFF4FC' } : {}), ...(m.isActual ? { color: '#16A34A' } : {}) }}>
                        {m.label}{m.isActual ? '*' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>

                  {/* ══ REVENUE ══════════════════════════════════════════ */}
                  <SectionHeaderRow label="REVENUE" months={months} values={baseRevenueVals} tone="revenue"
                    onClick={() => toggle('revenue')} expanded={!!expanded.revenue} />

                  {expanded.revenue && REVENUE_PRACTICE_AREAS.map(pa => (
                    <LineRow key={pa.rowIndex} label={pa.label} months={months} values={monthVals(pa.rowIndex)}
                      tag={null} indent={1} />
                  ))}

                  {/* ── Pipeline deals inline ────────────────────────── */}
                  {year === 2026 && showPipeline && (
                    <>
                      <SectionHeaderRow label="PIPELINE" months={months} values={pipelineMonthTotals} tone="pipeline"
                        onClick={() => toggle('pipeline')} expanded={!!expanded.pipeline} />
                      {expanded.pipeline && pipelineDeals.map(d => (
                        <LineRow key={d.rowIndex} label={d.name} months={months} values={d.vals}
                          tag={d.probability} indent={1} />
                      ))}
                    </>
                  )}

                  {/* Forecasted Revenue (shifts when pipeline ON) */}
                  {year === 2026 && showPipeline && (
                    <SectionHeaderRow label="FORECASTED REVENUE" months={months} values={forecastedRevenueVals} tone="revenue" />
                  )}

                  <SpacerRow months={months} />

                  {/* ══ OPERATING EXPENSES ════════════════════════════════ */}
                  <SectionHeaderRow label="OPERATING EXPENSES" months={months} values={totalExpensesVals} tone="expense" />

                  {EXPENSE_CATEGORIES.map(cat => {
                    const cv = catVals(cat)
                    const isOpen = !!expanded[cat.id]
                    return (
                      <>
                        <SectionHeaderRow
                          key={cat.id}
                          label={cat.label}
                          months={months}
                          values={cv}
                          tone="category"
                          onClick={() => toggle(cat.id)}
                          expanded={isOpen}
                          indent={1}
                        />
                        {isOpen && cat.lines.map(line => (
                          <LineRow key={line.rowIndex} label={line.label} months={months}
                            values={monthVals(line.rowIndex)} indent={2} />
                        ))}
                      </>
                    )
                  })}

                  <SpacerRow months={months} />

                  {/* ══ FINANCING ═════════════════════════════════════════ */}
                  <SectionHeaderRow label="FINANCING EXPENSES" months={months} values={financingVals} tone="expense" />
                  <LineRow label="Interest & Factoring Fees" months={months} values={monthVals(213)} indent={1} />

                  <SpacerRow months={months} />

                  {/* ══ NET INCOME ════════════════════════════════════════ */}
                  <NetIncomeRow label="NET INCOME" months={months} values={netIncomeVals} />

                </tbody>
              </table>
            </div>
            <div style={{ padding: '8px 16px', fontSize: 10, color: '#94A3B8', borderTop: '1px solid #F0F4F9' }}>
              * Jan–Apr marked with asterisk = NetSuite actuals. May–Dec = Pro Forma projections. Expense sub-lines = Pro Forma throughout.
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CASH TRACKER VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {!loading && !err && view === 'cash' && (
        <div style={S.card}>
          <div style={S.cardHdr}>
            <div style={S.cardTitle}><Layers size={14} /> Cash Tracker</div>
            <div style={{ fontSize: 11, color: '#8096B2' }}>{cashTracker.length} rows</div>
          </div>
          <div style={{ padding: 14, fontSize: 12, color: '#8096B2' }}>
            Raw data · smart parser planned for v2
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.tbl}>
              <thead>
                <tr>
                  <th style={S.thLabel}>Row</th>
                  <th style={S.thLabel}>Label</th>
                  <th style={S.thLabel}>Sample</th>
                </tr>
              </thead>
              <tbody>
                {cashTracker.slice(0, 50).map(r => (
                  <tr key={r.row_index}>
                    <td style={{ padding: '7px 12px', borderBottom: '1px solid #F0F4F9', color: '#8096B2', fontSize: 11 }}>{r.row_index}</td>
                    <td style={{ padding: '7px 12px', borderBottom: '1px solid #F0F4F9', fontWeight: 600, color: '#002C77' }}>{r.label || '—'}</td>
                    <td style={{ padding: '7px 12px', borderBottom: '1px solid #F0F4F9', fontSize: 11, color: '#565656' }}>
                      {Object.entries(r.payload || {}).slice(0, 4).map(([k, v]) => (
                        <span key={k} style={{ marginRight: 10 }}>
                          <code style={{ fontSize: 10, color: '#8096B2' }}>{k}</code>: {typeof v === 'number' ? fmt(v) : String(v).slice(0, 20)}
                        </span>
                      ))}
                    </td>
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
