// src/components/PlaidActionsBar.jsx
// Top-right action bar: [Link Account] + [Sync Transactions].
// scope prop is the default for the scope-picker modal that appears after a successful Link.
// Sync syncs ALL linked accounts (both scopes) regardless of which page invoked it.
import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Link as LinkIcon, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'

const FN_BASE = `${supabaseUrl}/functions/v1`

const S = {
  wrap: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 10, color: '#647A9B', lineHeight: 1.3, marginRight: 4 },
  metaOk: { color: '#1B7F3A' },
  metaErr: { color: '#A8341E', display: 'inline-flex', alignItems: 'center', gap: 4 },
  btn: (primary) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', border: `1px solid ${primary ? '#009DE0' : '#CBD8E8'}`,
    borderRadius: 8,
    background: primary ? '#009DE0' : 'white',
    color: primary ? 'white' : '#334E85',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }),
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,30,55,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: 'white', borderRadius: 12, padding: 24, maxWidth: 440, width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalH: { margin: 0, fontSize: 18, color: '#0F1E37', fontWeight: 700 },
  modalSub: { fontSize: 12, color: '#647A9B', marginTop: 6, marginBottom: 20, lineHeight: 1.5 },
  scopeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  scopeBtn: (color) => ({
    padding: 18, border: `2px solid ${color}`, borderRadius: 10,
    background: 'white', color, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  }),
  cancel: {
    marginTop: 12, width: '100%', padding: 8, background: 'transparent', border: 'none',
    color: '#647A9B', fontSize: 12, cursor: 'pointer',
  },
}

export default function PlaidActionsBar({ scope = 'personal', onSyncComplete }) {
  const [linkToken, setLinkToken] = useState(null)
  const [linking, setLinking] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [lastSyncSummary, setLastSyncSummary] = useState(null)
  const [error, setError] = useState(null)
  const [pendingPublicToken, setPendingPublicToken] = useState(null)
  const [pendingInstitution, setPendingInstitution] = useState(null)
  const [showScopeModal, setShowScopeModal] = useState(false)

  useEffect(() => { fetchLastSyncedAt() }, [])

  async function fetchLastSyncedAt() {
    const { data } = await supabase
      .schema('finance_personal')
      .from('plaid_items')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false, nullsFirst: false })
      .limit(1)
    if (data?.[0]?.last_synced_at) setLastSyncedAt(data[0].last_synced_at)
  }

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
    }
  }

  async function startLink() {
    setError(null)
    setLinking(true)
    try {
      const r = await fetch(`${FN_BASE}/plaid-link-token`, {
        method: 'POST', headers: await authHeaders(), body: '{}',
      })
      const data = await r.json()
      if (!r.ok || !data.link_token) throw new Error(data.error || `HTTP ${r.status}`)
      setLinkToken(data.link_token)
    } catch (e) {
      setError(String(e.message || e))
      setLinking(false)
    }
  }

  const onPlaidSuccess = useCallback((public_token, metadata) => {
    setPendingPublicToken(public_token)
    setPendingInstitution(metadata.institution)
    setShowScopeModal(true)
    setLinking(false)
    setLinkToken(null)
  }, [])

  const onPlaidExit = useCallback(() => {
    setLinking(false)
    setLinkToken(null)
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  })

  useEffect(() => {
    if (linkToken && ready) open()
  }, [linkToken, ready, open])

  async function confirmScope(chosenScope) {
    setShowScopeModal(false)
    setSyncing(true)
    try {
      const r = await fetch(`${FN_BASE}/plaid-exchange`, {
        method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({
          public_token: pendingPublicToken,
          scope: chosenScope,
          institution: pendingInstitution,
        }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`)
      await runSync()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setSyncing(false)
      setPendingPublicToken(null)
      setPendingInstitution(null)
    }
  }

  async function runSync() {
    setError(null)
    setSyncing(true)
    setLastSyncSummary(null)
    try {
      const r = await fetch(`${FN_BASE}/plaid-sync`, {
        method: 'POST', headers: await authHeaders(), body: '{}',
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      setLastSyncSummary(data)
      setLastSyncedAt(data.synced_at || new Date().toISOString())
      onSyncComplete?.(data)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <div style={S.wrap}>
        <div style={S.meta}>
          <span>{lastSyncedAt ? `Last synced ${timeAgo(lastSyncedAt)}` : 'Never synced'}</span>
          {lastSyncSummary && (
            <span style={S.metaOk}>✓ {lastSyncSummary.items_synced || 0} item(s), {lastSyncSummary.transactions_added || 0} new tx</span>
          )}
          {error && (
            <span style={S.metaErr}><AlertCircle size={11} /> {error.length > 50 ? error.slice(0, 50) + '…' : error}</span>
          )}
        </div>

        <button
          onClick={startLink}
          disabled={linking || syncing}
          style={{ ...S.btn(false), ...(linking || syncing ? S.btnDisabled : {}) }}
          title="Link a new bank account via Plaid"
        >
          {linking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <LinkIcon size={13} />}
          Link Account
        </button>

        <button
          onClick={runSync}
          disabled={syncing || linking}
          style={{ ...S.btn(true), ...(syncing || linking ? S.btnDisabled : {}) }}
          title="Sync all linked accounts (personal + TH)"
        >
          {syncing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
          Sync Transactions
        </button>
      </div>

      {showScopeModal && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <h3 style={S.modalH}>
              Where does {pendingInstitution?.name || 'this account'} belong?
            </h3>
            <p style={S.modalSub}>
              All accounts at this institution will be saved to the chosen scope. If you have both
              personal and TH accounts at the same bank, link them separately.
            </p>
            <div style={S.scopeGrid}>
              <button onClick={() => confirmScope('personal')} style={S.scopeBtn('#334E85')}>Personal</button>
              <button onClick={() => confirmScope('th')} style={S.scopeBtn('#009DE0')}>Third Horizon</button>
            </div>
            <button
              onClick={() => { setShowScopeModal(false); setPendingPublicToken(null) }}
              style={S.cancel}
            >Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
