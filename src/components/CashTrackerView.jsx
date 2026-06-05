import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

// ─── Column structure ────────────────────────────────────────────────────────
// Cash Tracker is bi-monthly (15th + EOM per month). 2026 cols: AA–AX
// Jan–Jun have mislabeled year headers in the sheet — doesn't matter, we hardcode.
export const CT_MONTHS = [
  { label: 'Jan', full: 'January',   col1: 'AA', col2: 'AB', beginCol: 'Z'  },
  { label: 'Feb', full: 'February',  col1: 'AC', col2: 'AD', beginCol: 'AB' },
  { label: 'Mar', full: 'March',     col1: 'AE', col2: 'AF', beginCol: 'AD' },
  { label: 'Apr', full: 'April',     col1: 'AG', col2: 'AH', beginCol: 'AF' },
  { label: 'May', full: 'May',       col1: 'AI', col2: 'AJ', beginCol: 'AH' },
  { label: 'Jun', full: 'June',      col1: 'AK', col2: 'AL', beginCol: 'AJ' },
  { label: 'Jul', full: 'July',      col1: 'AM', col2: 'AN', beginCol: 'AL' },
  { label: 'Aug', full: 'August',    col1: 'AO', col2: 'AP', beginCol: 'AN' },
  { label: 'Sep', full: 'September', col1: 'AQ', col2: 'AR', beginCol: 'AP' },
  { label: 'Oct', full: 'October',   col1: 'AS', col2: 'AT', beginCol: 'AR' },
  { label: 'Nov', full: 'November',  col1: 'AU', col2: 'AV', beginCol: 'AT' },
  { label: 'Dec', full: 'December',  col1: 'AW', col2: 'AX', beginCol: 'AV' },
]

// Flat 24-entry array — one entry per half-period, matching cash tracker columns
export const CT_PERIODS = CT_MONTHS.flatMap(m => [
  { label: m.full + ' 1H', col: m.col1, month: m.label, half: '1H', beginCol: m.beginCol },
  { label: m.full + ' 2H', col: m.col2, month: m.label, half: '2H', beginCol: m.col1  },
])

// ─── Row index definitions ────────────────────────────────────────────────────
const ROW_BALANCE      = 216   // Anticipated 15-Day Balance (running cash position)
const ROW_CASH_IN      = 100   // Total Cash In
const ROW_CASH_OUT     = 214   // Total Cash Out

// Cash In clients: rows 5–99 (all individual client receipts)
const CASH_IN_ROWS = {
  'Behavioral Health': [
    { row: 7,  label: 'Addiction Professionals of NC (Retainer)' },
    { row: 8,  label: 'Alliance for Addiction & MH Services (MAAMS)' },
    { row: 26, label: 'Easterseals of NH' },
    { row: 44, label: 'Indiana' },
    { row: 47, label: 'Kids TLC' },
    { row: 49, label: 'Maine Health Access Foundation' },
    { row: 55, label: 'McCall BH' },
    { row: 67, label: 'New Hampshire Charitable Foundation' },
    { row: 68, label: 'OASAS - RASFP' },
    { row: 69, label: 'OASAS - ATC' },
    { row: 70, label: 'OR ADPC' },
    { row: 72, label: 'OR Prevention' },
    { row: 76, label: 'Recovery Link' },
    { row: 77, label: 'Rosecrance' },
    { row: 78, label: 'San Luis Valley' },
    { row: 79, label: 'Signal' },
    { row: 81, label: 'Spurwink' },
    { row: 82, label: 'SW Counseling Service' },
    { row: 84, label: 'WeConnect' },
  ],
  'Payment Design & Analytics': [
    { row: 12, label: 'Blue Cross Blue Shield of Michigan' },
    { row: 29, label: 'HFMA' },
    { row: 30, label: 'Michigan Dental' },
    { row: 31, label: 'Part D Advisors' },
    { row: 32, label: 'SSNC' },
    { row: 33, label: 'HandlHealth (MotivHealth)' },
    { row: 51, label: 'MMA (2026 Fixed)' },
    { row: 52, label: 'MMA (Innovation)' },
    { row: 53, label: 'MMA Escrow' },
    { row: 54, label: 'MMA (Promise)' },
    { row: 56, label: 'MotivHealth' },
    { row: 58, label: 'MJ Insurance' },
    { row: 60, label: 'Mutual of Omaha' },
    { row: 61, label: 'NAATP' },
    { row: 83, label: 'XO Health Repricing' },
  ],
  'Market Analytics': [
    { row: 16, label: 'Can You Play (Clayton Christenson Inst.)' },
    { row: 17, label: 'CIAB' },
    { row: 21, label: 'DCM Foundation' },
    { row: 36, label: 'Kennedy Forum (MSA)' },
    { row: 37, label: 'Kennedy Forum URAC' },
    { row: 38, label: 'Intermountain' },
    { row: 48, label: 'KPMG - CO' },
    { row: 62, label: 'National Council' },
    { row: 63, label: 'National Council TTA CCBHC' },
    { row: 64, label: 'National Association of Chronic Disease Directors' },
    { row: 65, label: 'NACDD Re-Draw' },
    { row: 66, label: 'NACDD Diabetes 2' },
    { row: 71, label: 'One Utah Health Collaborative' },
    { row: 74, label: 'Pomegranate Market' },
  ],
  'Workplace Well-Being': [
    { row: 22, label: 'Deloitte Consulting' },
    { row: 23, label: 'Deloitte Green Dot' },
    { row: 27, label: 'Eli Lilly' },
    { row: 43, label: 'Lemonada' },
    { row: 45, label: 'Health Fitness Corporation' },
  ],
  'Community Health': [
    { row: 15, label: 'Blain County (Idaho)' },
    { row: 19, label: 'Community Mental Health Fund' },
    { row: 20, label: 'CO 988' },
    { row: 24, label: 'Denver Public Health' },
    { row: 25, label: 'Dream Engine Ventures' },
    { row: 28, label: 'HealthTeamWorks' },
    { row: 75, label: 'Project Angel Heart' },
    { row: 85, label: 'Sanford' },
  ],
  'THS General': [
    { row: 5,  label: 'Alliance of Community Health Plans - Strategic' },
    { row: 6,  label: 'American Medical Association' },
    { row: 9,  label: 'Ascension' },
    { row: 10, label: 'Ascension (Alt)' },
    { row: 11, label: 'Axis Health' },
    { row: 13, label: 'Barnes & Thornburg' },
    { row: 14, label: 'American Hospital Association' },
    { row: 18, label: 'Claire Matrix' },
    { row: 34, label: 'Health Plan Alliance' },
    { row: 35, label: 'High Watch' },
    { row: 39, label: 'Mindshare / Intermountain' },
    { row: 40, label: 'Mindshare (Intentional Strategy)' },
    { row: 41, label: 'NFI North' },
    { row: 42, label: 'Lakes Treatment' },
    { row: 46, label: 'HMHI' },
    { row: 50, label: 'Mattie Rhodes Center' },
    { row: 57, label: 'McLean County' },
    { row: 59, label: 'MoreCare' },
    { row: 73, label: 'Penumbra' },
    { row: 80, label: 'Schreiber / MATTER' },
  ],
}

// Cash Out expense categories
const CASH_OUT_GROUPS = [
  {
    id: 'comp',
    label: 'Compensation & Benefits',
    lines: [
      { row: 103, label: 'Staff Compensation' },
      { row: 104, label: 'ICHRA' },
      { row: 105, label: 'Payroll Fees & Taxes' },
      { row: 106, label: '401(k) Contributions' },
      { row: 107, label: '401(k) Employer Match' },
      { row: 109, label: 'Wellness Card' },
      { row: 110, label: 'Bonus Incentives' },
      { row: 111, label: 'EJ SAAD ERC Payback' },
      { row: 112, label: 'R&D Tax Credit Fees' },
      { row: 113, label: 'PTE Tax Payments (IL)' },
    ],
  },
  {
    id: 'vendors',
    label: 'Vendors & Contractors',
    lines: [
      { row: 116, label: 'Chris Calip' },
      { row: 117, label: 'Anatomy IT' },
      { row: 123, label: 'Interknowlogy' },
      { row: 125, label: 'Zina Mercil' },
      { row: 126, label: 'HVC Incentives' },
      { row: 128, label: 'Siftia - Starset Support' },
      { row: 129, label: 'Komodo' },
      { row: 130, label: 'Handl Health - MMA' },
      { row: 131, label: 'PACES' },
      { row: 134, label: 'NORC' },
      { row: 135, label: 'Interns' },
      { row: 138, label: 'Abacus (Denver Health CPA)' },
      { row: 145, label: 'Metopio' },
      { row: 149, label: 'Mandall Assc.' },
      { row: 153, label: 'Langshur' },
    ],
  },
  {
    id: 'facilities',
    label: 'Facilities',
    lines: [
      { row: 157, label: 'Summit (CT)' },
      { row: 158, label: 'Chicago Office' },
      { row: 159, label: 'Chicago Office Expenses + Retreat' },
    ],
  },
  {
    id: 'data_tech',
    label: 'Data & Technology',
    lines: [
      { row: 179, label: 'Candor' },
      { row: 180, label: 'Google / Meco Cloud / Zazmik' },
      { row: 183, label: 'Netsuite / Aprio' },
    ],
  },
  {
    id: 'subs',
    label: 'Subscriptions & SaaS',
    lines: [
      { row: 162, label: 'Cogent' },
      { row: 163, label: 'Claude' },
      { row: 164, label: 'ChatGPT' },
      { row: 168, label: 'GitHub' },
      { row: 169, label: 'Google Suite (Life-XT)' },
      { row: 170, label: 'Google Suite (THS)' },
      { row: 172, label: 'Kastle Security' },
      { row: 175, label: 'Mailchimp' },
      { row: 176, label: 'Intuit' },
      { row: 191, label: 'Zoom' },
      { row: 193, label: 'Prudential' },
      { row: 194, label: 'Slack (SR4)' },
      { row: 195, label: 'Slack (THS)' },
      { row: 198, label: 'Supabase' },
      { row: 202, label: 'Chubb' },
      { row: 208, label: 'Verizon Wireless' },
      { row: 210, label: 'Harvest' },
      { row: 211, label: 'Propel Insurance' },
      { row: 212, label: 'People Keep' },
    ],
  },
]

// ─── Pipeline 30-day lag map: accrual month → cash period col ──────────────
// Pipeline receipts land in the 2H (EOM) period of the lagged month (30-day lag)
const PIPELINE_LAG = {
  'June 2026':      'AN', // July 2H
  'July 2026':      'AP', // August 2H
  'August 2026':    'AR', // September 2H
  'September 2026': 'AT', // October 2H
  'October 2026':   'AV', // November 2H
  'November 2026':  'AX', // December 2H
}
const PIPELINE_LAG_DEST_LABEL = {
  'June 2026':      'July 2H',
  'July 2026':      'August 2H',
  'August 2026':    'September 2H',
  'September 2026': 'October 2H',
  'October 2026':   'November 2H',
  'November 2026':  'December 2H',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rv(row, col) {
  if (!row?.payload) return 0
  const v = row.payload[col]
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = parseFloat(v.replace(/[$,]/g, '')); return isNaN(n) ? 0 : n }
  return 0
}
function periodVal(row, p) { return rv(row, p.col) }
function monthSum(row, m) { return rv(row, m.col1) + rv(row, m.col2) }
function totalSum(row) { return CT_PERIODS.reduce((s, p) => s + periodVal(row, p), 0) }

function fmt(n, compact = false) {
  if (n === null || n === undefined) return '—'
  const num = typeof n === 'number' ? n : parseFloat(n)
  if (isNaN(num) || num === 0) return '—'
  const abs = Math.abs(num)
  if (compact) {
    const s = abs >= 1000000 ? `$${(abs/1000000).toFixed(1)}M` : abs >= 1000 ? `$${Math.round(abs/1000)}K` : `$${Math.round(abs)}`
    return num < 0 ? `(${s})` : s
  }
  const s = '$' + Math.round(abs).toLocaleString('en-US')
  return num < 0 ? `(${s})` : s
}

const S = {
  tbl:     { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thL:     { textAlign: 'left', padding: '8px 12px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', position: 'sticky', top: 0, whiteSpace: 'nowrap', minWidth: 220 },
  thN:     { textAlign: 'right', padding: '8px 10px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  tdL:     (indent) => ({ padding: `6px 12px 6px ${12 + indent * 14}px`, borderBottom: '1px solid #F0F4F9', color: '#334E85', whiteSpace: 'nowrap', fontSize: 12 }),
  tdN:     (neg) => ({ padding: '6px 10px', borderBottom: '1px solid #F0F4F9', textAlign: 'right', color: neg ? '#C53030' : '#1A2B47', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 12 }),
  tdNT:    (neg) => ({ padding: '6px 10px', borderBottom: '1px solid #F0F4F9', textAlign: 'right', color: neg ? '#C53030' : '#334E85', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 12, background: '#F7FAFD', borderLeft: '1px solid #E2E8F0' }),
  secHdr:  (tone) => {
    const tones = { blue: '#002C77', green: '#0D4A2F', red: '#4A1010', gray: '#1B2A4A', cash: '#1A3A2A' }
    return { padding: '9px 12px', background: tones[tone] || tones.blue, color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', userSelect: 'none', cursor: 'pointer' }
  },
  secHdrN: (tone) => {
    const tones = { blue: '#002C77', green: '#0D4A2F', red: '#4A1010', gray: '#1B2A4A', cash: '#1A3A2A' }
    return { padding: '9px 10px', background: tones[tone] || tones.blue, color: 'white', fontWeight: 700, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  },
  catHdr:  { padding: '8px 12px 8px 26px', background: '#EFF4FB', color: '#1A2B47', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', userSelect: 'none', cursor: 'pointer', borderBottom: '1px solid #E2E8F0' },
  catHdrN: { padding: '8px 10px', background: '#EFF4FB', color: '#334E85', fontWeight: 700, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' },
  balRow:  (type) => ({
    padding: '11px 12px', fontWeight: 800, fontSize: 13,
    background: type === 'begin' ? '#002C77' : type === 'end' ? '#001A3D' : '#F7FAFD',
    color: type === 'begin' ? 'white' : type === 'end' ? 'white' : '#002C77',
    whiteSpace: 'nowrap', borderTop: type === 'end' ? '3px solid #009DE0' : 'none',
  }),
  balRowN: (val, type) => ({
    padding: '11px 10px', fontWeight: 800, fontSize: 12, textAlign: 'right',
    background: type === 'begin' ? '#002C77' : type === 'end' ? '#001A3D' : '#F7FAFD',
    color: type === 'end'
      ? (val < 0 ? '#FC8181' : '#68D391')
      : type === 'begin' ? 'white'
      : (val < 0 ? '#C53030' : '#002C77'),
    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    borderTop: type === 'end' ? '3px solid #009DE0' : 'none',
  }),
  spacer: { height: 6, background: '#E2E8F0' },
  pipeHdr: { padding: '8px 12px 8px 26px', background: '#0D4A2F', color: '#86EFAC', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', userSelect: 'none', cursor: 'pointer' },
  pipeHdrN:{ padding: '8px 10px', background: '#0D4A2F', color: '#86EFAC', fontWeight: 700, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CashTrackerView({ cashTracker, pipelineForecast }) {
  const [expanded, setExpanded] = useState({})
  const [showPipeline, setShowPipeline] = useState(false)
  const toggle = (k) => setExpanded(p => ({ ...p, [k]: !p[k] }))

  // Row lookup
  const rowMap = useMemo(() => {
    const m = {}
    cashTracker.forEach(r => { m[r.row_index] = r })
    return m
  }, [cashTracker])

  const balRow    = rowMap[ROW_BALANCE]
  const cashInRow = rowMap[ROW_CASH_IN]
  const cashOutRow= rowMap[ROW_CASH_OUT]

  // Beginning of year = row 216 col Z (Dec 31 2025)
  const boyBalance = rv(balRow, 'Z')

  // ── Current-period start rule ─────────────────────────────────────────────
  // Rule: first visible column = the half-period we are currently IN.
  //   Before the 15th  → show month 1H onward
  //   15th or after    → show month 2H onward
  // Columns before that half-period are dropped from the display.
  const visiblePeriods = useMemo(() => {
    const now  = new Date()
    const mo   = now.toLocaleString('en-US', { month: 'long' })  // e.g. "June"
    const day  = now.getDate()
    const half = day < 15 ? '1H' : '2H'
    const startIdx = CT_PERIODS.findIndex(p => p.label === `${mo} ${half}`)
    return startIdx >= 0 ? CT_PERIODS.slice(startIdx) : CT_PERIODS
  }, [])

  // Pipeline 30-day lag: destination period col → CM
  const pipelineByCol = useMemo(() => {
    const out = {}
    CT_PERIODS.forEach(p => { out[p.col] = 0 })
    const accrualRows = pipelineForecast.filter(r => r.row_index >= 200001)
    accrualRows.forEach(r => {
      const destCol = PIPELINE_LAG[r.payload?.month_label]
      if (destCol && r.payload?.total_contribution_margin) {
        out[destCol] = (out[destCol] || 0) + r.payload.total_contribution_margin
      }
    })
    return out
  }, [pipelineForecast])

  const pipelineTotal = Object.values(pipelineByCol).reduce((s, v) => s + v, 0)

  // Per-period helpers
  function ciPeriod(p)  { return periodVal(cashInRow, p) + (showPipeline ? (pipelineByCol[p.col] || 0) : 0) }
  function coPeriod(p)  { return periodVal(cashOutRow, p) }
  function linePeriod(rowIdx, p) { return periodVal(rowMap[rowIdx], p) }
  function lineTotal(rowIdx) { return totalSum(rowMap[rowIdx]) }
  function beginBal(m) { return rv(balRow, m.beginCol) }
  function endBal(m)   { return rv(balRow, m.col2) }

  // Year totals
  const totalCashIn  = CT_PERIODS.reduce((s, p) => s + periodVal(cashInRow, p), 0) + (showPipeline ? pipelineTotal : 0)
  const totalCashOut = totalSum(cashOutRow)
  const endYearBal   = rv(balRow, 'AX') + (showPipeline ? pipelineTotal : 0)

  // Group helpers
  function groupTotal(rows) {
    return rows.reduce((s, { row }) => s + (totalSum(rowMap[row]) || 0), 0)
  }
  function groupPeriodVal(rows, p) {
    return rows.reduce((s, { row }) => s + (periodVal(rowMap[row], p) || 0), 0)
  }

  const NCOLS = visiblePeriods.length + 1 // +1 for Total col

  function TotalCell({ val, isLast }) {
    return (
      <td style={{ ...S.tdN(val < 0), ...(isLast ? S.tdNT(val < 0) : {}), ...(isLast ? {} : {}) }}>
        {fmt(val)}
      </td>
    )
  }

  return (
    <div>
      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Beginning of Year', val: boyBalance, sub: 'Dec 31 2025 balance', neg: boyBalance < 0 },
          { label: 'Total Cash In', val: totalCashIn + (showPipeline ? 0 : 0), sub: showPipeline ? `Base + ${fmt(pipelineTotal, true)} pipeline` : '2026 projected', neg: false },
          { label: 'Total Cash Out', val: totalCashOut, sub: '2026 projected', neg: false },
          { label: 'End of Year (Projected)', val: endYearBal, sub: 'Dec 31 2026', neg: endYearBal < 0 },
        ].map(({ label, val, sub, neg }) => (
          <div key={label} style={{ background: neg ? '#FFF5F5' : 'white', border: `1px solid ${neg ? '#FED7D7' : '#E2E8F0'}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: neg ? '#C53030' : '#002C77', fontVariantNumeric: 'tabular-nums' }}>{fmt(val, true)}</div>
            <div style={{ fontSize: 11, color: '#565656', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Pipeline toggle ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 10 }}>
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pipeline Overlay</span>
        <span style={{ fontSize: 11, color: '#8096B2' }}>30-day lag · Jun CM → Jul cash, Jul → Aug, Aug → Sep, Sep → Oct, Oct → Nov, Nov → Dec</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowPipeline(v => !v)}>
          <span style={{ width: 36, height: 20, borderRadius: 9999, background: showPipeline ? '#009DE0' : '#CBD8E8', position: 'relative', transition: 'background 0.2s', flexShrink: 0, display: 'inline-block' }}>
            <span style={{ position: 'absolute', top: 2, left: showPipeline ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
          </span>
          <span style={{ fontSize: 12, color: showPipeline ? '#009DE0' : '#94A3B8', fontWeight: 700 }}>{showPipeline ? 'ON' : 'OFF'}</span>
        </span>
      </div>

      {/* ── Cash Tracker table ──────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={S.tbl}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...S.thL, verticalAlign: 'bottom' }}>Line Item</th>
              {CT_MONTHS.map(m => (
                <th key={m.label} colSpan={2} style={{ ...S.thN, borderLeft: '2px solid #CBD8E8', background: '#EFF4FC', fontSize: 11 }}>
                  {m.full}
                </th>
              ))}
              <th rowSpan={2} style={{ ...S.thN, borderLeft: '2px solid #CBD8E8', background: '#EFF4FC' }}>Total</th>
            </tr>
            <tr>
              {visiblePeriods.map(p => (
                <th key={p.col} style={{ ...S.thN, borderLeft: p.half === '1H' ? '2px solid #CBD8E8' : undefined, fontSize: 10, color: '#8096B2', background: p.half === '2H' ? '#F7FAFD' : '#EFF4FC' }}>
                  {p.half}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>

            {/* ── BEGINNING BALANCE ─────────────────────────────────── */}
            <tr>
              <td style={S.balRow('begin')}>BEGINNING CASH</td>
              {visiblePeriods.map(p => {
                const m = CT_MONTHS.find(m => m.label === p.month)
                const v = p.half === '1H' ? rv(balRow, m.beginCol) : rv(balRow, m.col1)
                return <td key={p.col} style={{ ...S.balRowN(v, 'begin'), borderLeft: p.half === '1H' ? '2px solid rgba(255,255,255,0.15)' : undefined }}>{fmt(v)}</td>
              })}
              <td style={S.balRowN(boyBalance, 'begin')}>{fmt(boyBalance)}</td>
            </tr>

            {/* ── SPACER ────────────────────────────────────────────── */}
            <tr><td colSpan={NCOLS + 1} style={S.spacer} /></tr>

            {/* ══ CASH IN ══════════════════════════════════════════════ */}
            <tr>
              <td style={{ ...S.secHdr('green'), cursor: 'default', paddingLeft: 14 }} colSpan={1}>
                CASH IN — REVENUE
              </td>
              {visiblePeriods.map(p => {
                const v = ciPeriod(p)
                return <td key={p.col} style={{ ...S.secHdrN('green'), borderLeft: p.half === '1H' ? '2px solid rgba(255,255,255,0.1)' : undefined }}>{v ? fmt(v) : ''}</td>
              })}
              <td style={S.secHdrN('green')}>{fmt(totalCashIn)}</td>
            </tr>

            {/* Pipeline rows (30-day lagged) */}
            {showPipeline && (
              <>
                <tr onClick={() => toggle('pipeline_ct')}>
                  <td style={S.pipeHdr}>
                    <span style={{ marginRight: 6, display: 'inline-flex', verticalAlign: 'middle' }}>
                      {expanded.pipeline_ct ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                    Pipeline (30-day lag)
                  </td>
                  {visiblePeriods.map(p => {
                    const v = pipelineByCol[p.col] || 0
                    return <td key={p.col} style={{ ...S.pipeHdrN, borderLeft: p.half === '1H' ? '2px solid rgba(255,255,255,0.1)' : undefined }}>{v ? fmt(v) : ''}</td>
                  })}
                  <td style={S.pipeHdrN}>{fmt(pipelineTotal)}</td>
                </tr>
                {expanded.pipeline_ct && pipelineForecast
                  .filter(r => r.row_index >= 200001)
                  .filter(r => PIPELINE_LAG[r.payload?.month_label])
                  .map(r => {
                    const destCol = PIPELINE_LAG[r.payload?.month_label]
                    const destLabel = PIPELINE_LAG_DEST_LABEL[r.payload?.month_label]
                    const cm = r.payload?.total_contribution_margin || 0
                    return (
                      <tr key={r.row_index} style={{ background: '#F0FDF4' }}>
                        <td style={{ ...S.tdL(2), color: '#166534', fontSize: 11 }}>
                          {r.payload?.month_label} accrual → {destLabel}
                        </td>
                        {visiblePeriods.map(p => (
                          <td key={p.col} style={{ ...S.tdN(false), color: '#166534', fontSize: 11, borderLeft: p.half === '1H' ? '2px solid #E2E8F0' : undefined }}>
                            {p.col === destCol ? fmt(cm) : ''}
                          </td>
                        ))}
                        <td style={{ ...S.tdNT(false), color: '#166534', fontSize: 11 }}>{fmt(cm)}</td>
                      </tr>
                    )
                  })
                }
              </>
            )}

            {/* Practice area groups for cash in */}
            {Object.entries(CASH_IN_ROWS).map(([area, clients]) => {
              const areaTotal = groupTotal(clients)
              const isOpen = !!expanded[`ci_${area}`]
              return (
                <>
                  <tr key={area} onClick={() => toggle(`ci_${area}`)}>
                    <td style={S.catHdr}>
                      <span style={{ marginRight: 6, display: 'inline-flex', verticalAlign: 'middle', opacity: 0.6 }}>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      {area}
                    </td>
                    {visiblePeriods.map(p => {
                      const v = groupPeriodVal(clients, p)
                      return <td key={p.col} style={{ ...S.catHdrN, borderLeft: p.half === '1H' ? '2px solid #CBD8E8' : undefined }}>{v ? fmt(v) : ''}</td>
                    })}
                    <td style={S.catHdrN}>{areaTotal ? fmt(areaTotal) : '—'}</td>
                  </tr>
                  {isOpen && clients.map(({ row, label }) => {
                    const lineRow = rowMap[row]
                    if (!lineRow) return null
                    const lt = lineTotal(row)
                    if (lt === 0 && visiblePeriods.every(p => !linePeriod(row, p))) return null
                    return (
                      <tr key={row} style={{ background: 'white' }}>
                        <td style={S.tdL(2)}>{label}</td>
                        {visiblePeriods.map(p => {
                          const v = linePeriod(row, p)
                          return <td key={p.col} style={{ ...S.tdN(false), borderLeft: p.half === '1H' ? '2px solid #E2E8F0' : undefined }}>{v ? fmt(v) : ''}</td>
                        })}
                        <td style={S.tdNT(false)}>{lt ? fmt(lt) : '—'}</td>
                      </tr>
                    )
                  })}
                </>
              )
            })}

            {/* ── SPACER ────────────────────────────────────────────── */}
            <tr><td colSpan={NCOLS + 1} style={S.spacer} /></tr>

            {/* ══ CASH OUT ═════════════════════════════════════════════ */}
            <tr>
              <td style={{ ...S.secHdr('red'), cursor: 'default', paddingLeft: 14 }}>
                CASH OUT — EXPENSES
              </td>
              {visiblePeriods.map(p => {
                const v = coPeriod(p)
                return <td key={p.col} style={{ ...S.secHdrN('red'), borderLeft: p.half === '1H' ? '2px solid rgba(255,255,255,0.1)' : undefined }}>{v ? fmt(v) : ''}</td>
              })}
              <td style={S.secHdrN('red')}>{fmt(totalCashOut)}</td>
            </tr>

            {CASH_OUT_GROUPS.map(cat => {
              const catTotal = groupTotal(cat.lines)
              const isOpen = !!expanded[cat.id]
              return (
                <>
                  <tr key={cat.id} onClick={() => toggle(cat.id)}>
                    <td style={S.catHdr}>
                      <span style={{ marginRight: 6, display: 'inline-flex', verticalAlign: 'middle', opacity: 0.6 }}>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      {cat.label}
                    </td>
                    {visiblePeriods.map(p => {
                      const v = groupPeriodVal(cat.lines, p)
                      return <td key={p.col} style={{ ...S.catHdrN, borderLeft: p.half === '1H' ? '2px solid #CBD8E8' : undefined }}>{v ? fmt(v) : ''}</td>
                    })}
                    <td style={S.catHdrN}>{catTotal ? fmt(catTotal) : '—'}</td>
                  </tr>
                  {isOpen && cat.lines.map(({ row, label }) => {
                    const lt = lineTotal(row)
                    if (lt === 0 && visiblePeriods.every(p => !linePeriod(row, p))) return null
                    return (
                      <tr key={row} style={{ background: 'white' }}>
                        <td style={S.tdL(2)}>{label}</td>
                        {visiblePeriods.map(p => {
                          const v = linePeriod(row, p)
                          return <td key={p.col} style={{ ...S.tdN(false), borderLeft: p.half === '1H' ? '2px solid #E2E8F0' : undefined }}>{v ? fmt(v) : ''}</td>
                        })}
                        <td style={S.tdNT(false)}>{lt ? fmt(lt) : '—'}</td>
                      </tr>
                    )
                  })}
                </>
              )
            })}

            {/* ── SPACER ────────────────────────────────────────────── */}
            <tr><td colSpan={NCOLS + 1} style={S.spacer} /></tr>

            {/* ── ENDING BALANCE ────────────────────────────────────── */}
            <tr>
              <td style={S.balRow('end')}>ENDING CASH</td>
              {visiblePeriods.map((p, i) => {
                const base = rv(balRow, p.col)
                const v = showPipeline
                  ? base + visiblePeriods.slice(0, i + 1).reduce((s, pp) => s + (pipelineByCol[pp.col] || 0), 0)
                  : base
                return <td key={p.col} style={{ ...S.balRowN(v, 'end'), borderLeft: p.half === '1H' ? '2px solid rgba(255,255,255,0.15)' : undefined }}>{fmt(v)}</td>
              })}
              <td style={S.balRowN(endYearBal, 'end')}>{fmt(endYearBal, true)}</td>
            </tr>

          </tbody>
        </table>
      </div>
      <div style={{ padding: '8px 12px', fontSize: 10, color: '#94A3B8', borderTop: '1px solid #F0F4F9', marginTop: 0 }}>
        Beginning/ending cash = Row 216 (Anticipated 15-Day Balance). 1H = mid-month (15th), 2H = end-of-month — matches Cash Tracker column schema. Pipeline lagged 30 days from Notion accrual months, lands in 2H of destination month.
      </div>
    </div>
  )
}
