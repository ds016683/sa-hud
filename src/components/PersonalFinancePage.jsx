import { useState, useEffect, useMemo } from 'react'
import { Wallet, Calendar, ListChecks, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PlaidActionsBar from './PlaidActionsBar'

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

export default function PersonalFinancePage() {
  const [view, setView] = useState('overview')   // 'overview' | 'transactions' | 'bills'
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
      </div>

      {/* OVERVIEW */}
      {view === 'overview' && (
        <>
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>Net Snapshot</div>
              <div style={S.cardSub}>{currentBalances.length} account{currentBalances.length === 1 ? '' : 's'} tracked</div>
            </div>
            <div style={S.metricGrid}>
              <div style={S.metricCard}>
                <div style={S.metricLabel}>Assets</div>
                <div style={{ ...S.metricValue, ...S.metricPositive }}>{fmtMoney(totals.assets)}</div>
                <div style={S.metricSub}>Checking, savings, investments</div>
              </div>
              <div style={S.metricCard}>
                <div style={S.metricLabel}>Liabilities</div>
                <div style={{ ...S.metricValue, ...S.metricNegative }}>{fmtMoney(totals.liabilities)}</div>
                <div style={S.metricSub}>Credit cards, loans</div>
              </div>
              <div style={S.metricCard}>
                <div style={S.metricLabel}>Net</div>
                <div style={{ ...S.metricValue, ...(totals.net >= 0 ? S.metricPositive : S.metricNegative) }}>
                  {fmtMoney(totals.net)}
                </div>
                <div style={S.metricSub}>Assets − Liabilities</div>
              </div>
              <div style={S.metricCard}>
                <div style={S.metricLabel}>Upcoming 30 days</div>
                <div style={S.metricValue}>{fmtMoney(upcomingTotal)}</div>
                <div style={S.metricSub}>
                  {upcoming30.length} bill{upcoming30.length === 1 ? '' : 's'}
                  {overdueCount > 0 && <span style={{ color: '#A02323', fontWeight: 700 }}> · {overdueCount} overdue</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>Account Balances</div>
              <div style={S.cardSub}>most recent per account</div>
            </div>
            {currentBalances.length === 0 ? (
              <div style={S.empty}>
                No balances yet. Ask mr-ledger in <code>#personal-ledger</code> to log your first account.
              </div>
            ) : (
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Account</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Institution</th>
                      <th style={S.thNum}>Balance</th>
                      <th style={S.th}>As of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBalances
                      .slice()
                      .sort((a, b) => (parseFloat(b.current_balance) || 0) - (parseFloat(a.current_balance) || 0))
                      .map(r => (
                        <tr key={r.id}>
                          <td style={S.tdLabel}>{r.account_name}</td>
                          <td style={S.td}>{r.account_type}</td>
                          <td style={S.td}>{r.institution || '—'}</td>
                          <td style={{ ...S.tdNum, color: (r.account_type === 'credit' || r.account_type === 'loan') ? '#A02323' : '#002C77' }}>
                            {fmtMoney(r.current_balance, { cents: true })}
                          </td>
                          <td style={S.td}>{fmtDate(r.as_of)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
      {view === 'bills' && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Upcoming Bills</div>
            <div style={S.cardSub}>{bills.length} total · sorted by due date</div>
          </div>
          {bills.length === 0 ? (
            <div style={S.empty}>
              No bills scheduled. Ask mr-ledger in <code>#personal-ledger</code> to add upcoming bills.
            </div>
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
                    <th style={S.th}>Recurring</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => {
                    const d = daysUntil(b.due_on)
                    const effectiveStatus = (b.status !== 'paid' && d !== null && d < 0) ? 'overdue' : b.status
                    return (
                      <tr key={b.id}>
                        <td style={S.td}>
                          <div>{fmtDate(b.due_on)}</div>
                          <div style={{ fontSize: 10, color: d < 0 ? '#A02323' : d <= 7 ? '#9A6400' : '#8096B2', marginTop: 2 }}>
                            {d === null ? '' : d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `in ${d}d`}
                          </div>
                        </td>
                        <td style={S.tdLabel}>{b.payee}</td>
                        <td style={S.td}>{b.category || '—'}</td>
                        <td style={S.tdNum}>{b.amount_due == null ? <em style={{ color: '#8096B2' }}>variable</em> : fmtMoney(b.amount_due, { cents: true })}</td>
                        <td style={S.td}>{b.account_to_pay || '—'}</td>
                        <td style={S.td}><span style={S.statusChip(effectiveStatus)}>{effectiveStatus}</span></td>
                        <td style={S.td}>{b.recurring ? (b.recur_cadence || 'yes') : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
