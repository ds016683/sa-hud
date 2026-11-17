// Proposed steps (David 11/17): the small steps between a mission's gates, proposed by Lumen
// from what David did, held off every card until he rules on them. The capture writes
// proposals.json; this file reads both and is the only writer of rulings.json. See api/_trail.mjs.
import { supabase } from './supabase'

const BUCKET = 'project-files'
const PROPOSALS = 'trail-steps/proposals.json'
const RULINGS = 'trail-steps/rulings.json'
export const CLEAR_AT = 15

async function readJson(path) {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
    if (error || !data?.signedUrl) return null
    const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
    return res.ok ? await res.json() : null
  } catch { return null }
}
const rulingsOf = (d) => (d && typeof d.rulings === 'object' && d.rulings) ? d.rulings : {}

// { proposals, skipped, ran_at, rulings }: everything the page shows.
export async function loadSteps() {
  const [p, r] = await Promise.all([readJson(PROPOSALS), readJson(RULINGS)])
  return { proposals: Array.isArray(p?.proposals) ? p.proposals : [], skipped: Array.isArray(p?.skipped) ? p.skipped : [], ran_at: p?.ran_at || null, rulings: rulingsOf(r) }
}

// verdict: 'accept' | 'reject' | null (null takes the ruling back). Returns the rulings as saved.
export async function ruleStep(id, verdict, why = '') {
  const rulings = { ...rulingsOf(await readJson(RULINGS)) }
  if (verdict) rulings[id] = { verdict, why: String(why || '').trim().slice(0, 500), at: new Date().toISOString() }
  else delete rulings[id]
  const { error } = await supabase.storage.from(BUCKET).upload(RULINGS, new Blob([JSON.stringify({ v: 1, rulings })], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
  return rulings
}

// Run the capture now: Lumen reads what is new and proposes. { events, added, skipped, pending }.
export async function captureNow() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const res = await fetch('/api/trail-steps', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || `capture ${res.status}`)
  return out
}
