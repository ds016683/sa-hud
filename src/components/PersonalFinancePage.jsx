import { useState, useEffect, useMemo, Component } from 'react'
import { Wallet, Calendar, ListChecks, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight, BarChart2, Check, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PlaidActionsBar from './PlaidActionsBar'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#FCE8E8', border: '1px solid #F2B5B5', borderRadius: 12, margin: 16, fontFamily: 'monospace', fontSize: 13, color: '#A02323' }}>
          <strong>Render error — show this to mr-ledger:</strong>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error?.message}\n\n{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

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

  card: { background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 20 },
  cardHeader: { padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#002C77', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 },
  cardSub: { fontSize: 11, color: '#8096B2' },

  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: 16 },
  metricCard: { background: '#F7FAFD', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 },
  metricLabel: { fontSize: 11, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: 700, color: '#002C77' },
  metricSub: { fontSize: 11, color: '#565656', marginTop: 4 },
  metricNegative: { color: '#A02323' },
  metricPositive: { color: '#1E7C3A' },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  thNum: { textAlign: 'right', padding: '10px 12px', background: '#F7FAFD', borderBottom: '2px solid #E2E8F0', color: '#334E85', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  td: { padding: '8px 12px', borderBottom: '1px solid #F0F4F9', color: '#1A2B47' },
  tdNum: { padding: '8px 12px', borderBottom: '1px solid #F0F4F9', color: '#1A2B47', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  tdLabel: { padding: '8px 12px', borderBottom: '1px solid #F0F4F9', color: '#002C77', fontWeight: 600 },
  rowMuted: { color: '#8096B2' },

  empty: { padding: 40, textAlign: 'center', color: '#8096B2', fontSize: 13 },
  errorBox: { padding: 16, background: '#FCE8E8', border: '1px solid #F2B5B5', borderRadius: 10, color: '#A02323', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  statusChip: (status) => {
    const map = {
      pending: { bg: '#FFF4E0', fg: '#9A6400', border: '#F2D592' },
      scheduled: { bg: '#E6F0FA', fg: '#1F4E8C', border: '#B5CFEC' },
      paid: { bg: '#E6F4EA', fg: '#1E7C3A', border: '#B7E1C2' },
      overdue: { bg: '#FCE8E8', fg: '#A02323', border: '#F2B5B5' },
    }
    const c = map[status] || map.pending
    return { display: 'inline-block', padding: '2px 8px', borderRadius: 9999, background: c.bg, color: c.fg, border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }
  },
}

function fmtMoney(n, opts = {}) {
  if (n === null || n === undefined || n === '') return '—'
  const num = typeof n === 'number' ? n : parseFloat(n)
  if (Number.isNaN(num)) return '—'
  const sign = num < 0 ? '-' : ''
  const abs = Math.abs(num)
  const str = '$' + abs.toLocaleString('en-US', { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 })
  return sign + str
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.round((due - today) / 86400000)
}

// ─── Account display config (Plaid name → display label + mask) ───
const ACCOUNT_INFO = {
  'Family Bill Pay': { display: 'Family Bill Pay',      mask: '9122' },
  'Avery Checking':  { display: 'Family Subscriptions', mask: '3265' },
  'Hudson Checking': { display: 'Family Spending',      mask: '2933' },
}

// flag values: 'th-reimb' | 'move-acct' | 'cancel' | 'verify' | 'investigate' | 'hold' | null
const KNOWN_SUBSCRIPTIONS = [
  // Family Subscriptions — should live on •3265
  { payee: 'Netflix',        category: 'Entertainment', amount: 25.99,  acct: '9122', cadence: 'monthly', flag: 'move-acct', note: 'Move billing to •3265' },
  { payee: 'Hulu',           category: 'Entertainment', amount: 89.99,  acct: '9122', cadence: 'monthly', flag: 'move-acct', note: 'Move billing to •3265' },
  { payee: 'Sony PlayStation', category: 'Entertainment', amount: 104.19, acct: '9122', cadence: 'monthly', flag: 'verify', note: 'Verify if truly recurring' },
  { payee: 'Blizzard',       category: 'Entertainment', amount: 16.34,  acct: '9122', cadence: 'monthly', flag: null, note: null },
  { payee: 'Brain.fm',       category: 'Entertainment', amount: 14.99,  acct: '9122', cadence: 'monthly', flag: null, note: null },
  // Needs cancellation
  { payee: 'Boosteroid',     category: 'Entertainment', amount: 14.89,  acct: '9122', cadence: 'monthly', flag: 'cancel', note: 'Cancel' },
  { payee: 'Vocalize.fm',    category: 'Entertainment', amount: 9.99,   acct: '9122', cadence: 'monthly', flag: 'cancel', note: 'Cancel' },
  // Apple — move to •2933
  { payee: 'Apple',          category: 'Tech / AI',     amount: 45.20,  acct: '9122', cadence: 'irregular', flag: 'move-acct', note: 'Not recurring — move charges to •2933' },
  // TH Reimbursable — moving to new credit card
  { payee: 'OpenRouter',     category: 'Tech / AI',     amount: 105.93, acct: '9122', cadence: 'irregular', flag: 'th-reimb', note: 'TH reimbursable — usage-based, moving to CC' },
  { payee: 'Anthropic',      category: 'Tech / AI',     amount: 78.19,  acct: '9122', cadence: 'irregular', flag: 'th-reimb', note: 'TH reimbursable — usage-based, moving to CC' },
  { payee: 'PhantomBuster',  category: 'Tech / AI',     amount: 69.00,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC; close soon' },
  { payee: 'Hostinger',      category: 'Tech / AI',     amount: 55.99,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC; consolidate accounts' },
  { payee: 'Supabase',       category: 'Tech / AI',     amount: 50.02,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'Vercel',         category: 'Tech / AI',     amount: 25.00,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'Granola',        category: 'Tech / AI',     amount: 35.00,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'ElevenLabs',     category: 'Tech / AI',     amount: 22.00,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'Firecrawl',      category: 'Tech / AI',     amount: 19.00,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'Anaconda',       category: 'Tech / AI',     amount: 15.00,  acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'Discord',        category: 'Tech / AI',     amount: 8.62,   acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'Tello',          category: 'Telecom',       amount: 9.78,   acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  { payee: 'Fly.io',         category: 'Tech / AI',     amount: 5.68,   acct: '9122', cadence: 'monthly',  flag: 'th-reimb', note: 'TH reimbursable — moving to CC' },
  // Investigate
  { payee: 'Microsoft',      category: 'Tech / AI',     amount: 34.33,  acct: '9122', cadence: 'monthly',  flag: 'investigate', note: 'Charge unknown — investigate' },
  // Utilities
  { payee: 'Verizon',        category: 'Utilities',     amount: 672.00, acct: '9122', cadence: 'monthly',  flag: 'hold', note: 'Hold — pulling billing downstream' },
  { payee: 'Canva',          category: 'Tech / AI',     amount: 15.00,  acct: '3265', cadence: 'monthly',  flag: null, note: null },
  // Health
  { payee: 'Gameday Men\'s Health', category: 'Health', amount: 241.50, acct: '9122', cadence: 'monthly',  flag: null, note: '2 charges/month at different dates' },
  // Family
  { payee: 'Greenlight',     category: 'Family',        amount: 150.00, acct: '2933', cadence: 'weekly',   flag: null, note: '$50/kid × 3 kids, due each Sunday' },
]

const FLAG_STYLE = {
  'th-reimb':    { bg: '#E8F4FF', fg: '#1A5C99', label: 'TH REIMB' },
  'move-acct':   { bg: '#FFF0D6', fg: '#8A5000', label: 'MOVE ACCT' },
  'cancel':      { bg: '#FCE8E8', fg: '#A02323', label: 'CANCEL' },
  'verify':      { bg: '#F0E6FF', fg: '#5B2D8E', label: 'VERIFY' },
  'investigate': { bg: '#FFF4E0', fg: '#9A6400', label: 'INVESTIGATE' },
  'hold':        { bg: '#F0F4F9', fg: '#334E85', label: 'HOLD' },
}

// ─── Monthly budget from family spending spreadsheet (June 2026 baseline) ───
const MONTHLY_BUDGET = [
  { category: 'Mortgage',                 bucket: 'Housing',     amount: 12000 },
  { category: 'DVC',                      bucket: 'Housing',     amount: 1200  },
  { category: 'Comed',                    bucket: 'Utilities',   amount: 400   },
  { category: 'Nicor',                    bucket: 'Utilities',   amount: 200   },
  { category: 'Vivint',                   bucket: 'Utilities',   amount: 78.25 },
  { category: 'Village of Western Springs', bucket: 'Utilities', amount: 400   },
  { category: 'Family Budget',            bucket: 'Living',      amount: 10000 },
  { category: 'Agata (housekeeper)',      bucket: 'Living',      amount: 3500  },
  { category: 'Sara Hawkins',             bucket: 'Living',      amount: 1000  },
  { category: 'GLP',                      bucket: 'Health',      amount: 1000  },
  { category: 'Lifetime Fitness',         bucket: 'Health',      amount: 250   },
  { category: 'Allstate',                 bucket: 'Insurance',   amount: 500   },
  { category: 'Verizon',                  bucket: 'Telecom',     amount: 200   },
  { category: 'iPass',                    bucket: 'Transport',   amount: 150   },
]

const MONTHLY_INCOME = [
  { source: 'Income (GP)',  amount: 45500  },
  { source: 'Dacia',        amount: 2083.33 },
]

const PLAID_TO_BUCKET = {
  FOOD_AND_DRINK:       'Living',
  GENERAL_MERCHANDISE:  'Living',
  GENERAL_SERVICES:     'Living',
  ENTERTAINMENT:        'Living',
  MEDICAL:              'Health',
  TRANSPORTATION:       'Transport',
  TRAVEL:               'Transport',
  UTILITIES:            'Utilities',
  RENT_AND_UTILITIES:   'Utilities',
  HOME_IMPROVEMENT:     'Housing',
  INSURANCE:            'Insurance',
  PERSONAL_CARE:        'Health',
  INCOME:               'Income',
  TRANSFER_IN:          'Income',
  TRANSFER_OUT:         'Transfer',
}

// ── Billing cycle helpers ──
function cycleKey(cadence, dateStr) {
  const d = new Date(dateStr)
  if (cadence === 'quarterly') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
  if (cadence === 'annual') return `${d.getFullYear()}`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // monthly default
}
function currentCycleKey(cadence) {
  return cycleKey(cadence, new Date())
}
function cycleLabel(cadence) {
  const now = new Date()
  if (cadence === 'quarterly') {
    const q = Math.floor(now.getMonth() / 3) + 1
    return `Q${q} ${now.getFullYear()}`
  }
  if (cadence === 'annual') return `${now.getFullYear()}`
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function BillsTab({ bills }) {
  // Deduplicate by payee — show one row per recurring bill with cycle cleared status
  // Non-recurring bills show as individual rows
  const recurringPayees = useMemo(() => {
    const map = new Map()
    for (const b of bills) {
      if (!b.recurring) continue
      if (!map.has(b.payee)) map.set(b.payee, [])
      map.get(b.payee).push(b)
    }
    return map
  }, [bills])

  const oneOffBills = useMemo(() => bills.filter(b => !b.recurring), [bills])

  // For each recurring payee: is the current cycle cleared?
  const cycleStatus = useMemo(() => {
    const result = {}
    recurringPayees.forEach((rows, payee) => {
      const cadence = rows[0].recur_cadence || 'monthly'
      const key = currentCycleKey(cadence)
      const paidThisCycle = rows.some(b => b.status === 'paid' && cycleKey(cadence, b.due_on) === key)
      const latestRow = rows.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      result[payee] = { cadence, key, cleared: paidThisCycle, latest: latestRow }
    })
    return result
  }, [recurringPayees])

  return (
    <>
      {/* Recurring Bills — one row per payee with cycle status */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Recurring Bills</div>
          <div style={S.cardSub}>one row per bill · cycle status shown</div>
        </div>
        {recurringPayees.size === 0 ? (
          <div style={S.empty}>No recurring bills logged yet.</div>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Payee</th>
                  <th style={S.th}>Cadence</th>
                  <th style={S.th}>Current Period</th>
                  <th style={S.th}>This Cycle</th>
                  <th style={S.thNum}>Amount Due</th>
                  <th style={S.th}>Due Date</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Check #</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cycleStatus).map(([payee, cs]) => {
                  const b = cs.latest
                  const d = daysUntil(b.due_on)
                  const effectiveStatus = cs.cleared ? 'paid' : (b.status !== 'paid' && d !== null && d < 0) ? 'overdue' : b.status
                  const payInfo = Object.entries(ACCOUNT_INFO).find(([k]) => k === b.account_to_pay)
                  const payDisplay = payInfo ? `••${payInfo[1].mask}` : (b.account_to_pay || '—')
                  return (
                    <tr key={payee} style={cs.cleared ? { background: '#F4FBF6' } : {}}>
                      <td style={S.tdLabel}>
                        {cs.cleared && <Check size={13} style={{ color: '#1E7C3A', marginRight: 5, verticalAlign: 'middle' }} />}
                        {payee}
                      </td>
                      <td style={S.td}>{cs.cadence}</td>
                      <td style={S.td}>{cycleLabel(cs.cadence)}</td>
                      <td style={S.td}>
                        {cs.cleared
                          ? <span style={{ color: '#1E7C3A', fontWeight: 700, fontSize: 12 }}>✓ Cleared</span>
                          : <span style={{ color: effectiveStatus === 'overdue' ? '#A02323' : '#9A6400', fontWeight: 600, fontSize: 12 }}>Pending</span>
                        }
                      </td>
                      <td style={S.tdNum}>{b.amount_due == null ? <em style={{ color: '#8096B2' }}>variable</em> : fmtMoney(b.amount_due, { cents: true })}</td>
                      <td style={S.td}>
                        <div>{fmtDate(b.due_on)}</div>
                        {!cs.cleared && d !== null && (
                          <div style={{ fontSize: 10, color: d < 0 ? '#A02323' : d <= 7 ? '#9A6400' : '#8096B2', marginTop: 2 }}>
                            {d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `in ${d}d`}
                          </div>
                        )}
                      </td>
                      <td style={S.td}><span style={S.statusChip(effectiveStatus)}>{effectiveStatus}</span></td>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{b.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* One-off bills */}
      {oneOffBills.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>One-Off Bills</div>
          </div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Due</th><th style={S.th}>Payee</th>
                <th style={S.thNum}>Amount</th><th style={S.th}>Status</th>
              </tr></thead>
              <tbody>
                {oneOffBills.map(b => {
                  const d = daysUntil(b.due_on)
                  const effectiveStatus = (b.status !== 'paid' && d !== null && d < 0) ? 'overdue' : b.status
                  return (
                    <tr key={b.id}>
                      <td style={S.td}>{fmtDate(b.due_on)}</td>
                      <td style={S.tdLabel}>{b.payee}</td>
                      <td style={S.tdNum}>{fmtMoney(b.amount_due, { cents: true })}</td>
                      <td style={S.td}><span style={S.statusChip(effectiveStatus)}>{effectiveStatus}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function BudgetTab({ transactions, bills, upcoming30, upcomingTotal, overdueCount }) {
  const [showAllRecurring, setShowAllRecurring] = useState(false)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // MTD actual spend by Plaid category bucket
  const actualByBucket = useMemo(() => {
    const map = {}
    for (const tx of transactions) {
      const d = new Date(tx.occurred_on)
      if (d < monthStart) continue
      const amt = parseFloat(tx.amount) || 0
      if (amt >= 0) continue // skip income/credits
      const bucket = PLAID_TO_BUCKET[tx.category] || 'Other'
      map[bucket] = (map[bucket] || 0) + Math.abs(amt)
    }
    return map
  }, [transactions])

  const totalBudget = MONTHLY_BUDGET.reduce((s, r) => s + r.amount, 0)
  const totalIncome = MONTHLY_INCOME.reduce((s, r) => s + r.amount, 0)
  const budgetByBucket = MONTHLY_BUDGET.reduce((m, r) => { m[r.bucket] = (m[r.bucket] || 0) + r.amount; return m }, {})

  const allBuckets = [...new Set([...Object.keys(budgetByBucket), ...Object.keys(actualByBucket).filter(k => k !== 'Income' && k !== 'Transfer')])]

  return (
    <>
      {/* Income vs Expense summary */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Monthly Budget · {monthLabel}</div>
          <div style={S.cardSub}>Derived from family spending spreadsheet + Plaid actuals</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: 16 }}>
          <div style={S.metricCard}>
            <div style={S.metricLabel}>Monthly Income</div>
            <div style={{ ...S.metricValue, ...S.metricPositive }}>{fmtMoney(totalIncome)}</div>
            <div style={S.metricSub}>GP + Dacia</div>
          </div>
          <div style={S.metricCard}>
            <div style={S.metricLabel}>Budgeted Expenses</div>
            <div style={{ ...S.metricValue, ...S.metricNegative }}>{fmtMoney(totalBudget)}</div>
            <div style={S.metricSub}>{MONTHLY_BUDGET.length} line items</div>
          </div>
          <div style={S.metricCard}>
            <div style={S.metricLabel}>Budgeted Surplus</div>
            <div style={{ ...S.metricValue, ...(totalIncome - totalBudget >= 0 ? S.metricPositive : S.metricNegative) }}>
              {fmtMoney(totalIncome - totalBudget)}
            </div>
            <div style={S.metricSub}>Income − Expenses</div>
          </div>
        </div>
      </div>

      {/* Budget line items */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Budget Line Items</div>
          <div style={S.cardSub}>From family spending spreadsheet — edit via #personal-ledger</div>
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Category</th>
                <th style={S.th}>Bucket</th>
                <th style={S.thNum}>Monthly Budget</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_BUDGET.map((r, i) => (
                <tr key={i}>
                  <td style={S.tdLabel}>{r.category}</td>
                  <td style={S.td}>{r.bucket}</td>
                  <td style={S.tdNum}>{fmtMoney(r.amount, { cents: true })}</td>
                </tr>
              ))}
              <tr style={{ background: '#F7FAFD', fontWeight: 700 }}>
                <td style={{ ...S.tdLabel, fontWeight: 700 }} colSpan={2}>Total</td>
                <td style={{ ...S.tdNum, fontWeight: 700 }}>{fmtMoney(totalBudget, { cents: true })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MTD actuals by bucket */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>MTD Spend by Bucket</div>
          <div style={S.cardSub}>Plaid actuals this month — budget column is the envelope total from above</div>
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Bucket</th>
                <th style={S.thNum}>Budgeted</th>
                <th style={S.thNum}>MTD Actual</th>
                <th style={S.thNum}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {allBuckets.map(bucket => {
                const budgeted = budgetByBucket[bucket] || 0
                const actual = actualByBucket[bucket] || 0
                const remaining = budgeted - actual
                return (
                  <tr key={bucket}>
                    <td style={S.tdLabel}>{bucket}</td>
                    <td style={S.tdNum}>{budgeted ? fmtMoney(budgeted, { cents: true }) : '—'}</td>
                    <td style={{ ...S.tdNum, color: actual > budgeted && budgeted > 0 ? '#A02323' : '#1A2B47', fontWeight: actual > budgeted && budgeted > 0 ? 700 : 400 }}>
                      {actual ? fmtMoney(actual, { cents: true }) : '—'}
                    </td>
                    <td style={{ ...S.tdNum, color: remaining < 0 ? '#A02323' : remaining < budgeted * 0.2 ? '#9A6400' : '#1E7C3A', fontWeight: 600 }}>
                      {budgeted ? fmtMoney(remaining, { cents: true }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Bills Due Next 30 Days */}
      <div style={{ ...S.card, background: overdueCount > 0 ? '#FFF8F8' : 'white' }}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Bills Due Next 30 Days</div>
          <div style={S.cardSub}>
            {upcoming30.length} bill{upcoming30.length !== 1 ? 's' : ''} · {fmtMoney(upcomingTotal, { cents: true })} total
            {overdueCount > 0 && <span style={{ color: '#A02323', fontWeight: 700 }}> · {overdueCount} overdue</span>}
          </div>
        </div>
        {upcoming30.length === 0 ? (
          <div style={S.empty}>No bills due in the next 30 days.</div>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Due</th>
                  <th style={S.th}>Payee</th>
                  <th style={S.th}>Category</th>
                  <th style={S.thNum}>Amount</th>
                  <th style={S.th}>Pay From</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming30.map(b => {
                  const d = daysUntil(b.due_on)
                  const effectiveStatus = (b.status !== 'paid' && d !== null && d < 0) ? 'overdue' : b.status
                  const payInfo = Object.entries(ACCOUNT_INFO).find(([k]) => k === b.account_to_pay)
                  const payDisplay = payInfo ? `${payInfo[1].display} ••${payInfo[1].mask}` : (b.account_to_pay || '—')
                  return (
                    <tr key={b.id}>
                      <td style={S.td}>
                        <div>{fmtDate(b.due_on)}</div>
                        <div style={{ fontSize: 10, color: d < 0 ? '#A02323' : d <= 7 ? '#9A6400' : '#8096B2', marginTop: 2 }}>
                          {d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `in ${d}d`}
                        </div>
                      </td>
                      <td style={S.tdLabel}>{b.payee}</td>
                      <td style={S.td}>{b.category || '—'}</td>
                      <td style={S.tdNum}>{b.amount_due == null ? <em style={{ color: '#8096B2' }}>variable</em> : fmtMoney(b.amount_due, { cents: true })}</td>
                      <td style={S.td}>{payDisplay}</td>
                      <td style={S.td}><span style={S.statusChip(effectiveStatus)}>{effectiveStatus}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Recurring Bills & Payments — toggle */}
      <div style={S.card}>
        <div
          style={{ ...S.cardHeader, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setShowAllRecurring(p => !p)}
        >
          <div style={S.cardTitle}>All Recurring Bills &amp; Payments</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.cardSub}>
              {bills.filter(b => b.recurring).length} bills · {KNOWN_SUBSCRIPTIONS.length} subscriptions
            </div>
            <span style={{ fontSize: 16, color: '#334E85' }}>{showAllRecurring ? '▲' : '▼'}</span>
          </div>
        </div>
        {showAllRecurring && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Payee</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Category</th>
                  <th style={S.thNum}>Amount</th>
                  <th style={S.th}>Account</th>
                  <th style={S.th}>Cadence</th>
                  <th style={S.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {/* Bills from DB */}
                {bills.filter(b => b.recurring).map(b => {
                  const payInfo = Object.entries(ACCOUNT_INFO).find(([k]) => k === b.account_to_pay)
                  const payDisplay = payInfo ? `••${payInfo[1].mask}` : (b.account_to_pay || '—')
                  return (
                    <tr key={b.id}>
                      <td style={S.tdLabel}>{b.payee}</td>
                      <td style={S.td}><span style={{ fontSize: 10, fontWeight: 700, color: '#1F4E8C', background: '#E6F0FA', padding: '2px 6px', borderRadius: 4 }}>BILL</span></td>
                      <td style={S.td}>{b.category || '—'}</td>
                      <td style={S.tdNum}>{b.amount_due == null ? <em style={{ color: '#8096B2' }}>variable</em> : fmtMoney(b.amount_due, { cents: true })}</td>
                      <td style={S.td}>{payDisplay}</td>
                      <td style={S.td}>{b.recur_cadence || 'monthly'}</td>
                      <td style={{ ...S.td, ...S.rowMuted }}>—</td>
                    </tr>
                  )
                })}
                {/* Known subscriptions from Plaid analysis */}
                {KNOWN_SUBSCRIPTIONS.map((s, i) => {
                  const fs = s.flag ? FLAG_STYLE[s.flag] : null
                  return (
                    <tr key={`sub-${i}`} style={s.flag === 'cancel' ? { background: '#FFF8F8' } : s.flag === 'th-reimb' ? { background: '#F7FBFF' } : {}}>
                      <td style={S.tdLabel}>{s.payee}</td>
                      <td style={S.td}><span style={{ fontSize: 10, fontWeight: 700, color: '#5B2D8E', background: '#F0E6FF', padding: '2px 6px', borderRadius: 4 }}>SUB</span></td>
                      <td style={S.td}>{s.category}</td>
                      <td style={S.tdNum}>{s.amount == null ? <em style={{ color: '#8096B2' }}>variable</em> : fmtMoney(s.amount, { cents: true })}</td>
                      <td style={S.td}>••{s.acct}</td>
                      <td style={S.td}>{s.cadence}</td>
                      <td style={S.td}>
                        {fs && <span style={{ fontSize: 10, fontWeight: 700, color: fs.fg, background: fs.bg, padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{fs.label}</span>}
                        <span style={{ color: '#565656', fontSize: 11 }}>{s.note || ''}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export default function PersonalFinancePage() {
  const [view, setView] = useState('overview')   // 'overview' | 'transactions' | 'bills' | 'budget'
  const [balances, setBalances] = useState([])
  const [transactions, setTransactions] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [lastLoad, setLastLoad] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    setErr(null)
    try {
      const [b, t, u] = await Promise.all([
        supabase.schema('finance_personal').from('balances').select('*').order('as_of', { ascending: false }),
        supabase.schema('finance_personal').from('transactions').select('*').order('occurred_on', { ascending: false }).limit(200),
        supabase.schema('finance_personal').from('upcoming_bills').select('*').order('due_on', { ascending: true }),
      ])
      if (b.error) throw b.error
      if (t.error) throw t.error
      if (u.error) throw u.error
      setBalances(b.data || [])
      setTransactions(t.data || [])
      setBills(u.data || [])
      setLastLoad(new Date())
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Aggregate: only keep latest balance per account_name
  const currentBalances = useMemo(() => {
    const map = new Map()
    for (const row of balances) {
      const existing = map.get(row.account_name)
      if (!existing || new Date(row.as_of) > new Date(existing.as_of)) {
        map.set(row.account_name, row)
      }
    }
    return Array.from(map.values())
  }, [balances])

  const totals = useMemo(() => {
    let assets = 0
    let liabilities = 0
    for (const r of currentBalances) {
      const amt = parseFloat(r.current_balance) || 0
      if (r.account_type === 'credit' || r.account_type === 'loan') liabilities += amt
      else assets += amt
    }
    return { assets, liabilities, net: assets - liabilities }
  }, [currentBalances])

  const upcoming30 = useMemo(() => {
    return bills.filter(b => {
      const d = daysUntil(b.due_on)
      return b.status !== 'paid' && d !== null && d <= 30 && d >= -30
    })
  }, [bills])

  const upcomingTotal = useMemo(
    () => upcoming30.reduce((acc, b) => acc + (parseFloat(b.amount_due) || 0), 0),
    [upcoming30]
  )

  const overdueCount = useMemo(
    () => bills.filter(b => b.status !== 'paid' && daysUntil(b.due_on) < 0).length,
    [bills]
  )

  const syncStatus = err ? 'err' : lastLoad ? 'ok' : 'pending'

  return (
    <ErrorBoundary>
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <h1 style={S.h1}><Wallet size={20} /> Personal Finance</h1>
          <div style={S.sub}>David's personal ledger — written by mr-ledger-personal · #personal-ledger</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.scopeBadge}>SCOPE · PERSONAL</span>
          <span style={S.syncPill(syncStatus)}>
            {syncStatus === 'ok' ? `synced ${fmtTime(lastLoad)}` : syncStatus === 'pending' ? 'loading…' : 'error'}
          </span>
          <button
            onClick={fetchAll}
            disabled={loading}
            title="Refresh"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: '1px solid #CBD8E8', borderRadius: 8, background: 'white', color: '#334E85', fontSize: 12, cursor: 'pointer' }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <PlaidActionsBar scope="personal" onSyncComplete={fetchAll} />
        </div>
      </div>

      {err && (
        <div style={S.errorBox}>
          <AlertCircle size={18} />
          <div>
            <strong>Read error.</strong> {err}
            <div style={{ fontSize: 11, marginTop: 6, color: '#7B2323' }}>
              If this says "permission denied", confirm RLS on finance_personal allows your email.
            </div>
          </div>
        </div>
      )}

      <div style={S.pillRow}>
        <button style={S.pill(view === 'overview')} onClick={() => setView('overview')}>
          <Wallet size={13} /> Overview
        </button>
        <button style={S.pill(view === 'transactions')} onClick={() => setView('transactions')}>
          <ListChecks size={13} /> Transactions
        </button>
        <button style={S.pill(view === 'bills')} onClick={() => setView('bills')}>
          <Calendar size={13} /> Upcoming Bills
        </button>
        <button style={S.pill(view === 'budget')} onClick={() => setView('budget')}>
          <BarChart2 size={13} /> Budget
        </button>
      </div>

      {/* OVERVIEW */}
      {view === 'overview' && (
        <>
          {/* Family Account Balances — one card per account */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>Family Accounts</div>
              <div style={S.cardSub}>{currentBalances.length} account{currentBalances.length === 1 ? '' : 's'} · {lastLoad ? `synced ${fmtTime(lastLoad)}` : 'loading'}</div>
            </div>
            {currentBalances.length === 0 ? (
              <div style={S.empty}>No balances yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, padding: 16 }}>
                {currentBalances
                  .slice()
                  .sort((a, b) => (parseFloat(b.available_balance ?? b.current_balance) || 0) - (parseFloat(a.available_balance ?? a.current_balance) || 0))
                  .map(r => {
                    const info = ACCOUNT_INFO[r.account_name] || {}
                    const displayName = info.display ? `${info.display} ••${info.mask}` : r.account_name
                    const avail = r.available_balance != null ? parseFloat(r.available_balance) : null
                    const posted = parseFloat(r.current_balance) || 0
                    // Adjusted = available minus scheduled bills not yet cleared by Plaid
                    const scheduledOut = bills
                      .filter(b => b.status === 'scheduled' && b.account_to_pay === r.account_name)
                      .reduce((sum, b) => sum + (parseFloat(b.amount_due) || 0), 0)
                    const adjusted = (avail ?? posted) - scheduledOut
                    const bankPending = avail !== null ? Math.abs(avail - posted) : 0
                    const isAdjusted = scheduledOut > 0
                    return (
                      <div key={r.id} style={{ ...S.metricCard, borderLeft: '3px solid #002C77' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#002C77', marginBottom: 12 }}>{displayName}</div>

                        {/* Adjusted — headline number */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                            Adjusted{isAdjusted ? ` (−${fmtMoney(scheduledOut, { cents: true })} scheduled)` : ''}
                          </div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: adjusted < 0 ? '#A02323' : '#1E7C3A', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtMoney(adjusted, { cents: true })}
                          </div>
                        </div>

                        {/* Available + Posted side by side */}
                        <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Available</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#334E85', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(avail ?? posted, { cents: true })}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Posted</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#334E85', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(posted, { cents: true })}</div>
                          </div>
                          {bankPending >= 1 && (
                            <div>
                              <div style={{ fontSize: 10, color: '#9A6400', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Bank Pending</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#9A6400', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(bankPending, { cents: true })}</div>
                            </div>
                          )}
                        </div>

                        <div style={{ marginTop: 8, fontSize: 10, color: '#8096B2' }}>{r.institution} · as of {fmtDate(r.as_of)}</div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

        {/* Pending Checks */}
        {(() => {
          const pending = bills.filter(b => b.status === 'scheduled')
          if (pending.length === 0) return null
          return (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}><Clock size={13} style={{ marginRight: 4 }} />Pending Checks</div>
                <div style={S.cardSub}>{pending.length} outstanding · {fmtMoney(pending.reduce((s,b) => s + (parseFloat(b.amount_due)||0), 0), { cents: true })} total</div>
              </div>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Check #</th>
                      <th style={S.th}>Payee</th>
                      <th style={S.th}>Due</th>
                      <th style={S.thNum}>Amount</th>
                      <th style={S.th}>Pay From</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending
                      .slice().sort((a,b) => new Date(a.due_on) - new Date(b.due_on))
                      .map(b => {
                        const d = daysUntil(b.due_on)
                        const payInfo = Object.entries(ACCOUNT_INFO).find(([k]) => k === b.account_to_pay)
                        const payDisplay = payInfo ? `${payInfo[1].display} ••${payInfo[1].mask}` : (b.account_to_pay || '—')
                        return (
                          <tr key={b.id}>
                            <td style={{ ...S.tdLabel, fontFamily: 'monospace' }}>{b.notes || '—'}</td>
                            <td style={S.tdLabel}>{b.payee}</td>
                            <td style={S.td}>
                              <div>{fmtDate(b.due_on)}</div>
                              <div style={{ fontSize: 10, color: d < 0 ? '#A02323' : d <= 7 ? '#9A6400' : '#8096B2', marginTop: 2 }}>
                                {d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `in ${d}d`}
                              </div>
                            </td>
                            <td style={S.tdNum}>{fmtMoney(b.amount_due, { cents: true })}</td>
                            <td style={S.td}>{payDisplay}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}
        </>
      )}

      {/* TRANSACTIONS */}
      {view === 'transactions' && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Recent Transactions</div>
            <div style={S.cardSub}>last 200 · most recent first</div>
          </div>
          {transactions.length === 0 ? (
            <div style={S.empty}>
              No transactions yet. mr-ledger-personal will log them here as they happen.
            </div>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Merchant</th>
                    <th style={S.th}>Category</th>
                    <th style={S.th}>Account</th>
                    <th style={S.thNum}>Amount</th>
                    <th style={S.th}>Memo</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(r => {
                    const amt = parseFloat(r.amount) || 0
                    return (
                      <tr key={r.id}>
                        <td style={S.td}>{fmtDate(r.occurred_on)}</td>
                        <td style={S.tdLabel}>{r.merchant || '—'}</td>
                        <td style={S.td}>{r.category || '—'}</td>
                        <td style={S.td}>{r.account_name}</td>
                        <td style={{ ...S.tdNum, color: amt < 0 ? '#A02323' : '#1E7C3A', fontWeight: 600 }}>
                          {amt < 0 ? <ArrowDownRight size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} /> : <ArrowUpRight size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />}
                          {fmtMoney(amt, { cents: true })}
                        </td>
                        <td style={{ ...S.td, ...S.rowMuted, maxWidth: 240, whiteSpace: 'normal' }}>{r.memo || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* BILLS */}
      {view === 'bills' && <BillsTab bills={bills} />}

      {/* BUDGET */}
      {view === 'budget' && <BudgetTab transactions={transactions} bills={bills} upcoming30={upcoming30} upcomingTotal={upcomingTotal} overdueCount={overdueCount} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
    </ErrorBoundary>
  )
}
