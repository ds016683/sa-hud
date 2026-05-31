// src/components/BankingActivity.jsx
// Live banking view: account cards (current + available balance) + transaction list.
// Reads from finance.balances_plaid + finance.transactions_plaid (scope='th')
// or finance_personal.balances + finance_personal.transactions (scope='personal').
import { useState, useEffect } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const fmtUSD = (n) => {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  loading: { display: 'flex', alignItems: 'center', gap: 8, color: '#647A9B', padding: 24, justifyContent: 'center' },
  error: { display: 'flex', alignItems: 'center', gap: 8, color: '#A8341E', background: '#FEEAE5', padding: 12, borderRadius: 8, border: '1px solid #F5C2B6' },
  empty: { padding: 24, color: '#647A9B', textAlign: 'center', background: 'white', borderRadius: 10, border: '1px solid #E4EBF3' },
  accountGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  card: {
    background: 'white', borderRadius: 10, padding: 16, border: '1px solid #E4EBF3',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  cardActive: { borderColor: '#009DE0', boxShadow: '0 0 0 2px rgba(0,157,224,0.15)' },
  cardName: { fontSize: 13, fontWeight: 700, color: '#0F1E37', marginBottom: 2 },
  cardSub: { fontSize: 10, color: '#647A9B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  balRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  balLabel: { fontSize: 11, color: '#647A9B' },
  balCurrent: { fontSize: 22, fontWeight: 700, color: '#0F1E37' },
  balAvail: { fontSize: 13, color: '#1B7F3A', fontWeight: 600 },
  txWrap: { background: 'white', borderRadius: 10, border: '1px solid #E4EBF3', overflow: 'hidden' },
  txHeader: {
    padding: '12px 16px', background: '#F6F9FC', borderBottom: '1px solid #E4EBF3',
    fontSize: 11, color: '#647A9B', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  txRow: {
    display: 'grid', gridTemplateColumns: '70px 1fr 110px 100px', alignItems: 'center',
    padding: '10px 16px', borderBottom: '1px solid #F0F4F8', gap: 12, fontSize: 13,
  },
  txDate: { color: '#647A9B', fontSize: 11, fontWeight: 600 },
  txMerchant: { color: '#0F1E37', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  txCat: { fontSize: 10, color: '#647A9B', background: '#F0F4F8', padding: '3px 8px', borderRadius: 999, justifySelf: 'start' },
  txAmt: (positive) => ({
    textAlign: 'right', fontWeight: 700, color: positive ? '#1B7F3A' : '#0F1E37',
    fontVariantNumeric: 'tabular-nums',
  }),
  filterBar: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  chip: (active) => ({
    padding: '4px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
    background: active ? '#0F1E37' : 'white', color: active ? 'white' : '#334E85',
    border: `1px solid ${active ? '#0F1E37' : '#CBD8E8'}`, fontWeight: 600,
  }),
}

export default function BankingActivity({ scope = 'th' }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [txs, setTxs] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('all') // 'all' or plaid_account_id

  useEffect(() => { fetchData() }, [scope])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const balTable = scope === 'th' ? 'balances_plaid' : 'balances'
      const txTable = scope === 'th' ? 'transactions_plaid' : 'transactions'
      const schemaName = scope === 'th' ? 'finance' : 'finance_personal'

      const [balRes, txRes] = await Promise.all([
        supabase.schema(schemaName).from(balTable).select('*').order('current_balance', { ascending: false }),
        supabase.schema(schemaName).from(txTable).select('*').order('occurred_on', { ascending: false }).limit(500),
      ])

      if (balRes.error) throw new Error(`balances: ${balRes.error.message}`)
      if (txRes.error) throw new Error(`transactions: ${txRes.error.message}`)

      setAccounts(balRes.data ?? [])
      setTxs(txRes.data ?? [])
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={S.loading}><Loader2 size={16} className="spin" /> Loading banking activity…</div>
  }
  if (error) {
    return <div style={S.error}><AlertCircle size={16} /> {error}</div>
  }
  if (accounts.length === 0) {
    return <div style={S.empty}>No linked accounts yet. Click [Link Account] to connect a bank.</div>
  }

  const totalCurrent = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0)
  const totalAvail = accounts.reduce((s, a) => s + (Number(a.available_balance ?? a.current_balance) || 0), 0)

  const filteredTxs = selectedAccount === 'all'
    ? txs
    : txs.filter(t => t.plaid_account_id === selectedAccount)

  return (
    <div style={S.wrap}>
      {/* Total card */}
      <div style={{ ...S.card, background: '#0F1E37', color: 'white', cursor: 'default' }}>
        <div style={{ ...S.cardSub, color: 'rgba(255,255,255,0.5)' }}>Total · {accounts.length} account{accounts.length > 1 ? 's' : ''}</div>
        <div style={S.balRow}>
          <span style={{ ...S.balLabel, color: 'rgba(255,255,255,0.6)' }}>Current</span>
          <span style={{ ...S.balCurrent, color: 'white' }}>{fmtUSD(totalCurrent)}</span>
        </div>
        <div style={S.balRow}>
          <span style={{ ...S.balLabel, color: 'rgba(255,255,255,0.6)' }}>Available</span>
          <span style={{ ...S.balAvail, color: '#7CE5A1' }}>{fmtUSD(totalAvail)}</span>
        </div>
      </div>

      {/* Account cards */}
      <div style={S.accountGrid}>
        {accounts.map(a => {
          const active = selectedAccount === a.plaid_account_id
          return (
            <div
              key={a.plaid_account_id}
              style={{ ...S.card, ...(active ? S.cardActive : {}) }}
              onClick={() => setSelectedAccount(active ? 'all' : a.plaid_account_id)}
            >
              <div style={S.cardName}>{a.account_name}</div>
              <div style={S.cardSub}>{a.institution} · {a.account_type}</div>
              <div style={S.balRow}>
                <span style={S.balLabel}>Current</span>
                <span style={S.balCurrent}>{fmtUSD(a.current_balance)}</span>
              </div>
              <div style={S.balRow}>
                <span style={S.balLabel}>Available</span>
                <span style={S.balAvail}>{fmtUSD(a.available_balance ?? a.current_balance)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Transactions */}
      <div style={S.txWrap}>
        <div style={S.txHeader}>
          <span>Transactions {selectedAccount !== 'all' && '· filtered'}</span>
          <div style={S.filterBar}>
            <span style={S.chip(selectedAccount === 'all')} onClick={() => setSelectedAccount('all')}>All</span>
            <span style={{ color: '#647A9B', fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>
              {filteredTxs.length} shown
            </span>
          </div>
        </div>
        {filteredTxs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#647A9B', fontSize: 13 }}>
            No transactions{selectedAccount !== 'all' ? ' for this account' : ''}.
          </div>
        ) : (
          filteredTxs.map(tx => {
            const amt = Number(tx.amount) || 0
            const positive = amt > 0
            return (
              <div key={tx.plaid_transaction_id} style={S.txRow}>
                <div style={S.txDate}>{fmtDate(tx.occurred_on)}</div>
                <div style={S.txMerchant} title={tx.memo}>
                  {tx.merchant || tx.memo || '(unknown)'}
                </div>
                <div>
                  {tx.category && <span style={S.txCat}>{tx.category}</span>}
                </div>
                <div style={S.txAmt(positive)}>
                  {positive ? <ArrowUpCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> : <ArrowDownCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: '#A8341E' }} />}
                  {fmtUSD(amt)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
