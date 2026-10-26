import { useState, useEffect, useMemo, Component } from 'react'
import { Wallet, Calendar, ListChecks, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight, BarChart2, Check, Clock, ChevronDown, ChevronRight, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PlaidActionsBar from './PlaidActionsBar'
import { BLUE, GOLD, GREEN, SUCCESS, INK, INK2, NAVY_DEEP, PANEL_BG, PANEL_BORDER, PURPLE, RED, alpha } from './river/canon'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: alpha(RED, 15), border: `1px solid ${alpha(RED, 40)}`, borderRadius: 12, margin: 16, fontFamily: 'monospace', fontSize: 13, color: RED }}>
          <strong>Render error — show this to mr-ledger:</strong>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error?.message}\n\n{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'inherit' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  h1: { fontSize: 20, fontWeight: 700, color: INK, margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
  sub: { fontSize: 13, color: INK2, margin: '2px 0 0' },
  scopeBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: PANEL_BG, color: INK2, fontSize: 11, fontWeight: 600, border: `1px solid ${PANEL_BORDER}`, letterSpacing: '0.04em' },
  syncPill: (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999,
    background: status === 'ok' ? alpha(GREEN, 15) : status === 'pending' ? alpha(GOLD, 15) : alpha(RED, 15),
    color: status === 'ok' ? GREEN : status === 'pending' ? GOLD : RED,
    fontSize: 11, fontWeight: 600, border: `1px solid ${status === 'ok' ? alpha(GREEN, 40) : status === 'pending' ? alpha(GOLD, 40) : alpha(RED, 40)}`,
  }),

  pillRow: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  pill: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 9999, border: '1px solid',
    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: active ? 600 : 500,
    background: active ? INK : NAVY_DEEP,
    color: active ? NAVY_DEEP : INK2,
    borderColor: active ? INK : PANEL_BORDER,
    transition: 'all 0.15s',
  }),

  card: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, boxShadow: 'none', overflow: 'hidden', marginBottom: 20 },
  cardHeader: { padding: '14px 16px', borderBottom: `1px solid ${PANEL_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cardHeaderClickable: { padding: '14px 16px', borderBottom: `1px solid ${PANEL_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, cursor: 'pointer', userSelect: 'none' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 },
  cardSub: { fontSize: 11, color: INK2 },

  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: 16 },
  metricCard: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: 14 },
  metricLabel: { fontSize: 11, color: INK2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: 700, color: INK },
  metricSub: { fontSize: 11, color: INK2, marginTop: 4 },
  metricNegative: { color: RED },
  metricPositive: { color: GREEN },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '10px 12px', background: PANEL_BG, borderBottom: `2px solid ${PANEL_BORDER}`, color: INK2, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  thNum: { textAlign: 'right', padding: '10px 12px', background: PANEL_BG, borderBottom: `2px solid ${PANEL_BORDER}`, color: INK2, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  td: { padding: '8px 12px', borderBottom: `1px solid ${PANEL_BG}`, color: INK },
  tdNum: { padding: '8px 12px', borderBottom: `1px solid ${PANEL_BG}`, color: INK, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  tdLabel: { padding: '8px 12px', borderBottom: `1px solid ${PANEL_BG}`, color: INK, fontWeight: 600 },
  rowMuted: { color: INK2 },

  empty: { padding: 40, textAlign: 'center', color: INK2, fontSize: 13 },
  errorBox: { padding: 16, background: alpha(RED, 15), border: `1px solid ${alpha(RED, 40)}`, borderRadius: 10, color: RED, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  statusChip: (status) => {
    const map = {
      pending: { bg: alpha(GOLD, 15), fg: GOLD, border: alpha(GOLD, 40) },
      scheduled: { bg: PANEL_BG, fg: INK, border: alpha(BLUE, 40) },
      paid: { bg: alpha(SUCCESS, 15), fg: SUCCESS, border: alpha(SUCCESS, 40) },
      overdue: { bg: alpha(RED, 15), fg: RED, border: alpha(RED, 40) },
      upcoming: { bg: alpha(PURPLE, 15), fg: PURPLE, border: alpha(PURPLE, 40) },
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

// ─── Account display config ───────────────────────────────────────────────────
const ACCOUNT_INFO = {
  'Family Bill Pay': { display: 'Family Bill Pay',      mask: '9122' },
  'Avery Checking':  { display: 'Family Subscriptions', mask: '3265' },
  'Hudson Checking': { display: 'Family Spending',      mask: '2933' },
}

const KNOWN_SUBSCRIPTIONS = [
  { payee: 'Netflix',        category: 'Entertainment', amount: 25.99,  acct: '9122', cadence: 'monthly', flag: 'move-acct', note: 'Move billing to •3265' },
  { payee: 'Hulu',           category: 'Entertainment', amount: 89.99,  acct: '9122', cadence: 'monthly', flag: 'move-acct', note: 'Move billing to •3265' },
  { payee: 'Sony PlayStation', category: 'Entertainment', amount: 104.19, acct: '9122', cadence: 'monthly', flag: 'verify', note: 'Verify if truly recurring' },
  { payee: 'Blizzard',       category: 'Entertainment', amount: 16.34,  acct: '9122', cadence: 'monthly', flag: null, note: null },
  { payee: 'Brain.fm',       category: 'Entertainment', amount: 14.99,  acct: '9122', cadence: 'monthly', flag: null, note: null },
  { payee: 'Boosteroid',     category: 'Entertainment', amount: 14.89,  acct: '9122', cadence: 'monthly', flag: 'cancel', note: 'Cancel' },
  { payee: 'Vocalize.fm',    category: 'Entertainment', amount: 9.99,   acct: '9122', cadence: 'monthly', flag: 'cancel', note: 'Cancel' },
  { payee: 'Apple',          category: 'Tech / AI',     amount: 45.20,  acct: '9122', cadence: 'irregular', flag: 'move-acct', note: 'Not recurring — move charges to •2933' },
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
  { payee: 'Microsoft',      category: 'Tech / AI',     amount: 34.33,  acct: '9122', cadence: 'monthly',  flag: 'investigate', note: 'Charge unknown — investigate' },
  { payee: 'Verizon',        category: 'Utilities',     amount: 672.00, acct: '9122', cadence: 'monthly',  flag: 'hold', note: 'Hold — pulling billing downstream' },
  { payee: 'Canva',          category: 'Tech / AI',     amount: 15.00,  acct: '3265', cadence: 'monthly',  flag: null, note: null },
  { payee: 'Gameday Men\'s Health', category: 'Health', amount: 241.50, acct: '9122', cadence: 'monthly',  flag: null, note: '2 charges/month at different dates' },
  { payee: 'Greenlight',     category: 'Family',        amount: 150.00, acct: '2933', cadence: 'weekly',   flag: null, note: '$50/kid × 3 kids, due each Sunday' },
]

const FLAG_STYLE = {
  'th-reimb':    { bg: alpha(BLUE, 15), fg: BLUE, label: 'TH REIMB' },
  'move-acct':   { bg: alpha(GOLD, 15), fg: GOLD, label: 'MOVE ACCT' },
  'cancel':      { bg: alpha(RED, 15), fg: RED, label: 'CANCEL' },
  'verify':      { bg: alpha(PURPLE, 15), fg: PURPLE, label: 'VERIFY' },
  'investigate': { bg: alpha(GOLD, 15), fg: GOLD, label: 'INVESTIGATE' },
  'hold':        { bg: PANEL_BG, fg: INK2, label: 'HOLD' },
}

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

function cycleKey(cadence, dateStr) {
  const d = new Date(dateStr)
  if (cadence === 'quarterly') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
  if (cadence === 'annual') return `${d.getFullYear()}`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function currentCycleKey(cadence) { return cycleKey(cadence, new Date()) }
function cycleLabel(cadence) {
  const now = new Date()
  if (cadence === 'quarterly') return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
  if (cadence === 'annual') return `${now.getFullYear()}`
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ─── TH Reimbursement Panel ───────────────────────────────────────────────────
function THReimbursementPanel() {
  const [cache, setCache]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [lineExp, setLineExp]   = useState(false)
  const [err, setErr]           = useState(null)

  const fetchCache = async () => {
    try {
      const { data, error } = await supabase
        .schema('finance_personal')
        .from('harvest_reimbursement_cache')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      setCache(data || null)
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchCache() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setErr(null)
    // Call edge function to pull fresh data from Harvest, then re-read cache
    try {
      const res = await fetch(
        'https://cmuvomnmaoseccxpeuxq.supabase.co/functions/v1/harvest-expense-sync',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: '2026-05-01', to: '2026-05-31', label: 'May 2026' }),
        }
      )
      if (!res.ok) throw new Error(`Edge fn returned ${res.status}`)
    } catch {
      // Edge fn may not be deployed yet — fall back to re-reading cache
    }
    await fetchCache()
  }

  // Group line items by client
  const byClient = useMemo(() => {
    if (!cache?.line_items) return {}
    const map = {}
    for (const item of cache.line_items) {
      if (!map[item.client]) map[item.client] = { total: 0, items: [] }
      map[item.client].total += item.amount
      map[item.client].items.push(item)
    }
    return map
  }, [cache])

  return (
    <div style={{ ...S.card, border: `1px solid ${alpha(BLUE, 40)}`, background: PANEL_BG }}>
      {/* Header */}
      <div style={{ ...S.cardHeader, borderBottom: expanded ? `1px solid ${PANEL_BORDER}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={S.cardTitle}>
            <DollarSign size={13} style={{ color: BLUE }} />
            TH Reimbursement
          </div>
          {cache && (
            <span style={{ fontSize: 11, color: INK2 }}>{cache.period_label} · {cache.expense_count} expenses</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
            background: alpha(BLUE, 15), color: BLUE, border: `1px solid ${alpha(BLUE, 40)}`
          }}>NOT INCLUDED IN BALANCES</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Pull fresh data from Harvest"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', border: `1px solid ${alpha(BLUE, 40)}`, borderRadius: 8,
              background: PANEL_BG, color: BLUE, fontSize: 11, cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={11} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          {/* Expand/collapse */}
          <button
            onClick={() => setExpanded(p => !p)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, background: PANEL_BG, color: INK2, fontSize: 11, cursor: 'pointer' }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {expanded ? 'Collapse' : 'Details'}
          </button>
          {/* Headline number */}
          {!loading && cache && (
            <span style={{ fontSize: 22, fontWeight: 700, color: BLUE, fontVariantNumeric: 'tabular-nums', marginLeft: 8 }}>
              {fmtMoney(cache.total_billable, { cents: true })}
            </span>
          )}
          {loading && <span style={{ fontSize: 13, color: INK2 }}>loading…</span>}
        </div>
      </div>

      {/* Body — only visible when expanded */}
      {expanded && (
        <div style={{ padding: 16 }}>
          {err && (
            <div style={{ ...S.errorBox, marginBottom: 12 }}>
              <AlertCircle size={16} />{err}
            </div>
          )}
          {!cache ? (
            <div style={S.empty}>No Harvest data cached yet. Hit Refresh to pull.</div>
          ) : (
            <>
              {/* Summary strip */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ ...S.metricCard, flex: 1, minWidth: 160 }}>
                  <div style={S.metricLabel}>Anticipated Reimbursement</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: BLUE, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMoney(cache.total_billable, { cents: true })}
                  </div>
                  <div style={{ fontSize: 11, color: INK2, marginTop: 4 }}>{cache.period_label} · billable expenses only · not in your balances</div>
                </div>
                <div style={{ ...S.metricCard, flex: 1, minWidth: 160 }}>
                  <div style={S.metricLabel}>Expense Count</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: INK2 }}>{cache.expense_count}</div>
                  <div style={S.metricSub}>billable line items logged in Harvest</div>
                </div>
                <div style={{ ...S.metricCard, flex: 1, minWidth: 160 }}>
                  <div style={S.metricLabel}>Data As Of</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: INK2 }}>{fmtTime(cache.fetched_at)}</div>
                  <div style={S.metricSub}>last Harvest sync · daily at 6 AM CT</div>
                </div>
              </div>

              {/* By-client breakdown */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: INK2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>By Client</div>
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Client</th>
                        <th style={S.thNum}>Amount</th>
                        <th style={S.thNum}>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byClient)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([client, data]) => (
                          <tr key={client}>
                            <td style={S.tdLabel}>{client}</td>
                            <td style={S.tdNum}>{fmtMoney(data.total, { cents: true })}</td>
                            <td style={{ ...S.tdNum, color: INK2 }}>{data.items.length}</td>
                          </tr>
                        ))}
                      <tr style={{ background: PANEL_BG, fontWeight: 700, borderTop: `2px solid ${alpha(BLUE, 40)}` }}>
                        <td style={{ ...S.tdLabel, color: BLUE }}>Total</td>
                        <td style={{ ...S.tdNum, color: BLUE, fontWeight: 700 }}>{fmtMoney(cache.total_billable, { cents: true })}</td>
                        <td style={{ ...S.tdNum, color: INK2 }}>{cache.expense_count}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Line items toggle */}
              <button
                onClick={() => setLineExp(p => !p)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, background: PANEL_BG, color: INK2, fontSize: 12, cursor: 'pointer', marginBottom: 8 }}
              >
                {lineExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {lineExp ? 'Hide' : 'Show'} all {cache.expense_count} line items
              </button>

              {lineExp && (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Client</th>
                        <th style={S.th}>Category</th>
                        <th style={S.thNum}>Amount</th>
                        <th style={S.th}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cache.line_items || []).map((item, i) => (
                        <tr key={i}>
                          <td style={S.td}>{fmtDate(item.date)}</td>
                          <td style={S.tdLabel}>{item.client}</td>
                          <td style={S.td}>{item.category}</td>
                          <td style={S.tdNum}>{fmtMoney(item.amount, { cents: true })}</td>
                          <td style={{ ...S.td, color: INK2, maxWidth: 260, whiteSpace: 'normal' }}>{item.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BillsTab({ bills }) {
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
                  <th style={S.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cycleStatus).map(([payee, cs]) => {
                  const b = cs.latest
                  const d = daysUntil(b.due_on)
                  const effectiveStatus = cs.cleared ? 'paid' : (b.status !== 'paid' && d !== null && d < 0) ? 'overdue' : b.status
                  return (
                    <tr key={payee} style={cs.cleared ? { background: alpha(SUCCESS, 15) } : {}}>
                      <td style={S.tdLabel}>
                        {cs.cleared && <Check size={13} style={{ color: SUCCESS, marginRight: 5, verticalAlign: 'middle' }} />}
                        {payee}
                      </td>
                      <td style={S.td}>{cs.cadence}</td>
                      <td style={S.td}>{cycleLabel(cs.cadence)}</td>
                      <td style={S.td}>
                        {cs.cleared
                          ? <span style={{ color: SUCCESS, fontWeight: 700, fontSize: 12 }}>✓ Cleared</span>
                          : <span style={{ color: effectiveStatus === 'overdue' ? RED : GOLD, fontWeight: 600, fontSize: 12 }}>Pending</span>
                        }
                      </td>
                      <td style={S.tdNum}>{b.amount_due == null ? <em style={{ color: INK2 }}>variable</em> : fmtMoney(b.amount_due, { cents: true })}</td>
                      <td style={S.td}>
                        <div>{fmtDate(b.due_on)}</div>
                        {!cs.cleared && d !== null && (
                          <div style={{ fontSize: 10, color: d < 0 ? RED : d <= 7 ? GOLD : INK2, marginTop: 2 }}>
                            {d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `in ${d}d`}
                          </div>
                        )}
                      </td>
                      <td style={S.td}><span style={S.statusChip(effectiveStatus)}>{effectiveStatus}</span></td>
                      <td style={{ ...S.td, ...S.rowMuted, fontSize: 11 }}>{b.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {oneOffBills.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>One-Off Bills</div>
          </div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Due</th><th style={S.th}>Payee</th>
                <th style={S.thNum}>Amount</th><th style={S.th}>Status</th><th style={S.th}>Notes</th>
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
                      <td style={{ ...S.td, fontSize: 11, color: INK2 }}>{b.notes || '—'}</td>
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

  const actualByBucket = useMemo(() => {
    const map = {}
    for (const tx of transactions) {
      const d = new Date(tx.occurred_on)
      if (d < monthStart) continue
      const amt = parseFloat(tx.amount) || 0
      if (amt >= 0) continue
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
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Monthly Budget · {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
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

      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Budget Line Items</div>
          <div style={S.cardSub}>From family spending spreadsheet — edit via #personal-ledger</div>
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Category</th><th style={S.th}>Bucket</th><th style={S.thNum}>Monthly Budget</th></tr></thead>
            <tbody>
              {MONTHLY_BUDGET.map((r, i) => (
                <tr key={i}><td style={S.tdLabel}>{r.category}</td><td style={S.td}>{r.bucket}</td><td style={S.tdNum}>{fmtMoney(r.amount, { cents: true })}</td></tr>
              ))}
              <tr style={{ background: PANEL_BG, fontWeight: 700 }}>
                <td style={{ ...S.tdLabel, fontWeight: 700 }} colSpan={2}>Total</td>
                <td style={{ ...S.tdNum, fontWeight: 700 }}>{fmtMoney(totalBudget, { cents: true })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>MTD Spend by Bucket</div>
          <div style={S.cardSub}>Plaid actuals this month — budget column is the envelope total from above</div>
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Bucket</th><th style={S.thNum}>Budgeted</th><th style={S.thNum}>MTD Actual</th><th style={S.thNum}>Remaining</th></tr></thead>
            <tbody>
              {allBuckets.map(bucket => {
                const budgeted = budgetByBucket[bucket] || 0
                const actual = actualByBucket[bucket] || 0
                const remaining = budgeted - actual
                return (
                  <tr key={bucket}>
                    <td style={S.tdLabel}>{bucket}</td>
                    <td style={S.tdNum}>{budgeted ? fmtMoney(budgeted, { cents: true }) : '—'}</td>
                    <td style={{ ...S.tdNum, color: actual > budgeted && budgeted > 0 ? RED : INK, fontWeight: actual > budgeted && budgeted > 0 ? 700 : 400 }}>
                      {actual ? fmtMoney(actual, { cents: true }) : '—'}
                    </td>
                    <td style={{ ...S.tdNum, color: remaining < 0 ? RED : remaining < budgeted * 0.2 ? GOLD : GREEN, fontWeight: 600 }}>
                      {budgeted ? fmtMoney(remaining, { cents: true }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...S.card, background: overdueCount > 0 ? alpha(RED, 15) : NAVY_DEEP }}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Bills Due Next 30 Days</div>
          <div style={S.cardSub}>
            {upcoming30.length} bill{upcoming30.length !== 1 ? 's' : ''} · {fmtMoney(upcomingTotal, { cents: true })} total
            {overdueCount > 0 && <span style={{ color: RED, fontWeight: 700 }}> · {overdueCount} overdue</span>}
          </div>
        </div>
        {upcoming30.length === 0 ? (
          <div style={S.empty}>No bills due in the next 30 days.</div>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Due</th><th style={S.th}>Payee</th><th style={S.th}>Category</th>
                <th style={S.thNum}>Amount</th><th style={S.th}>Pay From</th><th style={S.th}>Status</th>
              </tr></thead>
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
                        <div style={{ fontSize: 10, color: d < 0 ? RED : d <= 7 ? GOLD : INK2, marginTop: 2 }}>
                          {d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `in ${d}d`}
                        </div>
                      </td>
                      <td style={S.tdLabel}>{b.payee}</td>
                      <td style={S.td}>{b.category || '—'}</td>
                      <td style={S.tdNum}>{b.amount_due == null ? <em style={{ color: INK2 }}>variable</em> : fmtMoney(b.amount_due, { cents: true })}</td>
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

      <div style={S.card}>
        <div style={{ ...S.cardHeaderClickable, borderBottom: showAllRecurring ? `1px solid ${PANEL_BORDER}` : 'none' }} onClick={() => setShowAllRecurring(p => !p)}>
          <div style={S.cardTitle}>All Recurring Bills &amp; Payments</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.cardSub}>{KNOWN_SUBSCRIPTIONS.length} subscriptions tracked</div>
            <span style={{ fontSize: 16, color: INK2 }}>{showAllRecurring ? '▲' : '▼'}</span>
          </div>
        </div>
        {showAllRecurring && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Payee</th><th style={S.th}>Type</th><th style={S.th}>Category</th>
                <th style={S.thNum}>Amount</th><th style={S.th}>Account</th><th style={S.th}>Cadence</th><th style={S.th}>Notes</th>
              </tr></thead>
              <tbody>
                {KNOWN_SUBSCRIPTIONS.map((s, i) => {
                  const fs = s.flag ? FLAG_STYLE[s.flag] : null
                  return (
                    <tr key={`sub-${i}`} style={s.flag === 'cancel' ? { background: alpha(RED, 15) } : s.flag === 'th-reimb' ? { background: PANEL_BG } : {}}>
                      <td style={S.tdLabel}>{s.payee}</td>
                      <td style={S.td}><span style={{ fontSize: 10, fontWeight: 700, color: PURPLE, background: alpha(PURPLE, 15), padding: '2px 6px', borderRadius: 4 }}>SUB</span></td>
                      <td style={S.td}>{s.category}</td>
                      <td style={S.tdNum}>{fmtMoney(s.amount, { cents: true })}</td>
                      <td style={S.td}>••{s.acct}</td>
                      <td style={S.td}>{s.cadence}</td>
                      <td style={S.td}>
                        {fs && <span style={{ fontSize: 10, fontWeight: 700, color: fs.fg, background: fs.bg, padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{fs.label}</span>}
                        <span style={{ color: INK2, fontSize: 11 }}>{s.note || ''}</span>
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
  const [view, setView]             = useState('overview')
  const [balances, setBalances]     = useState([])
  const [transactions, setTransactions] = useState([])
  const [bills, setBills]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [err, setErr]               = useState(null)
  const [lastLoad, setLastLoad]     = useState(null)
  const [checksExpanded, setChecksExpanded] = useState(true)

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
    let assets = 0, liabilities = 0
    for (const r of currentBalances) {
      const amt = parseFloat(r.current_balance) || 0
      if (r.account_type === 'credit' || r.account_type === 'loan') liabilities += amt
      else assets += amt
    }
    return { assets, liabilities, net: assets - liabilities }
  }, [currentBalances])

  const upcoming30 = useMemo(() => bills.filter(b => {
    const d = daysUntil(b.due_on)
    return b.status !== 'paid' && d !== null && d <= 30 && d >= -30
  }), [bills])

  const upcomingTotal = useMemo(() => upcoming30.reduce((acc, b) => acc + (parseFloat(b.amount_due) || 0), 0), [upcoming30])
  const overdueCount = useMemo(() => bills.filter(b => b.status !== 'paid' && daysUntil(b.due_on) < 0).length, [bills])

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
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, background: PANEL_BG, color: INK2, fontSize: 12, cursor: 'pointer' }}
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
            <div style={{ fontSize: 11, marginTop: 6, color: RED }}>
              If this says "permission denied", confirm RLS on finance_personal allows your email.
            </div>
          </div>
        </div>
      )}

      <div style={S.pillRow}>
        <button style={S.pill(view === 'overview')} onClick={() => setView('overview')}><Wallet size={13} /> Overview</button>
        <button style={S.pill(view === 'transactions')} onClick={() => setView('transactions')}><ListChecks size={13} /> Transactions</button>
        <button style={S.pill(view === 'bills')} onClick={() => setView('bills')}><Calendar size={13} /> Upcoming Bills</button>
        <button style={S.pill(view === 'budget')} onClick={() => setView('budget')}><BarChart2 size={13} /> Budget</button>
      </div>

      {/* OVERVIEW */}
      {view === 'overview' && (
        <>
          {/* Family Account Balances */}
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
                    const scheduledOut = bills
                      .filter(b => b.status === 'scheduled' && b.account_to_pay === r.account_name)
                      .reduce((sum, b) => sum + (parseFloat(b.amount_due) || 0), 0)
                    const adjusted = (avail ?? posted) - scheduledOut
                    const bankPending = avail !== null ? Math.abs(avail - posted) : 0
                    const isAdjusted = scheduledOut > 0
                    return (
                      <div key={r.id} style={{ ...S.metricCard, borderLeft: `3px solid ${INK}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 12 }}>{displayName}</div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: INK2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                            Adjusted{isAdjusted ? ` (−${fmtMoney(scheduledOut, { cents: true })} scheduled)` : ''}
                          </div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: adjusted < 0 ? RED : GREEN, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtMoney(adjusted, { cents: true })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: INK2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Available</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: INK2, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(avail ?? posted, { cents: true })}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: INK2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Posted</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: INK2, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(posted, { cents: true })}</div>
                          </div>
                          {bankPending >= 1 && (
                            <div>
                              <div style={{ fontSize: 10, color: GOLD, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Bank Pending</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: GOLD, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(bankPending, { cents: true })}</div>
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 10, color: INK2 }}>{r.institution} · as of {fmtDate(r.as_of)}</div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Pending Checks — COLLAPSIBLE */}
          {(() => {
            const pending = bills.filter(b => b.status === 'scheduled')
            if (pending.length === 0) return null
            const total = pending.reduce((s, b) => s + (parseFloat(b.amount_due) || 0), 0)
            return (
              <div style={S.card}>
                <div
                  style={{ ...S.cardHeaderClickable, borderBottom: checksExpanded ? `1px solid ${PANEL_BORDER}` : 'none' }}
                  onClick={() => setChecksExpanded(p => !p)}
                >
                  <div style={S.cardTitle}>
                    <Clock size={13} style={{ marginRight: 2 }} />
                    Pending Checks
                    {checksExpanded ? <ChevronDown size={14} style={{ marginLeft: 4, color: INK2 }} /> : <ChevronRight size={14} style={{ marginLeft: 4, color: INK2 }} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={S.cardSub}>{pending.length} outstanding</div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(total, { cents: true })}
                    </span>
                  </div>
                </div>
                {checksExpanded && (
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
                          .slice().sort((a, b) => new Date(a.due_on) - new Date(b.due_on))
                          .map(b => {
                            const d = daysUntil(b.due_on)
                            const payInfo = Object.entries(ACCOUNT_INFO).find(([k]) => k === b.account_to_pay)
                            const payDisplay = payInfo ? `${payInfo[1].display} ••${payInfo[1].mask}` : (b.account_to_pay || '—')
                            const checkNum = (b.notes || '').match(/Check (\d+)/i)?.[0] || b.notes || '—'
                            return (
                              <tr key={b.id}>
                                <td style={{ ...S.tdLabel, fontFamily: 'monospace' }}>{checkNum}</td>
                                <td style={S.tdLabel}>{b.payee}</td>
                                <td style={S.td}>
                                  <div>{fmtDate(b.due_on)}</div>
                                  <div style={{ fontSize: 10, color: d < 0 ? RED : d <= 7 ? GOLD : INK2, marginTop: 2 }}>
                                    {d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `in ${d}d`}
                                  </div>
                                </td>
                                <td style={S.tdNum}>{fmtMoney(b.amount_due, { cents: true })}</td>
                                <td style={S.td}>{payDisplay}</td>
                              </tr>
                            )
                          })}
                        <tr style={{ background: PANEL_BG, fontWeight: 700, borderTop: `2px solid ${PANEL_BORDER}` }}>
                          <td style={{ ...S.tdLabel, fontWeight: 700 }} colSpan={3}>Total Outstanding</td>
                          <td style={{ ...S.tdNum, fontWeight: 700, color: INK }}>{fmtMoney(total, { cents: true })}</td>
                          <td style={S.td} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

          {/* TH Reimbursement Feed */}
          <THReimbursementPanel />
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
            <div style={S.empty}>No transactions yet.</div>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead><tr>
                  <th style={S.th}>Date</th><th style={S.th}>Merchant</th><th style={S.th}>Category</th>
                  <th style={S.th}>Account</th><th style={S.thNum}>Amount</th><th style={S.th}>Memo</th>
                </tr></thead>
                <tbody>
                  {transactions.map(r => {
                    const amt = parseFloat(r.amount) || 0
                    return (
                      <tr key={r.id}>
                        <td style={S.td}>{fmtDate(r.occurred_on)}</td>
                        <td style={S.tdLabel}>{r.merchant || '—'}</td>
                        <td style={S.td}>{r.category || '—'}</td>
                        <td style={S.td}>{r.account_name}</td>
                        <td style={{ ...S.tdNum, color: amt < 0 ? RED : GREEN, fontWeight: 600 }}>
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

      {view === 'bills' && <BillsTab bills={bills} />}
      {view === 'budget' && <BudgetTab transactions={transactions} bills={bills} upcoming30={upcoming30} upcomingTotal={upcomingTotal} overdueCount={overdueCount} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
    </ErrorBoundary>
  )
}
