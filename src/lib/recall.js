// The brain on a card: ask the recall door what the system has, and hand off
// to Lumen on WhatsApp when it does not ring a bell.
import { supabase } from './supabase'
async function auth() { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('not signed in'); return { Authorization: `Bearer ${session.access_token}` } }
export async function recall({ objective_id = null, task_id = null }) {
  const h = await auth()
  const qs = new URLSearchParams({ ...(objective_id ? { objective_id } : {}), ...(task_id ? { task_id } : {}) }).toString()
  const r = await fetch(`/api/recall?${qs}`, { headers: h, cache: 'no-store' })
  const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || `recall ${r.status}`)
  return j
}
export async function askLumen({ objective_id = null, task_id = null }) {
  const h = await auth()
  const r = await fetch('/api/recall', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ objective_id, task_id, ask: true }) })
  const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || `recall ${r.status}`)
  return j
}
