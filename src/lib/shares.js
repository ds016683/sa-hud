// Private shares, owned by a mission: a page on the HUD's domain behind an
// access code. Records live at project-files/_shares/<slug>.json; the page and
// its files at project-files/<project_id>/shares/<slug>/. Archiving a mission
// archives its shares, which retires their codes.
import { supabase } from './supabase'

const BUCKET = 'project-files'
export const shareUrl = (slug) => `${window.location.origin}/s/${slug}`

async function readJson(path) {
  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
  if (error) throw new Error(error.message)
  const res = await fetch(`${signed.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`read ${res.status}`)
  return res.json()
}

export async function listShares(projectId) {
  const { data, error } = await supabase.storage.from(BUCKET).list('_shares', { limit: 200 })
  if (error) throw new Error(error.message)
  const recs = await Promise.all((data || []).filter(f => f.name.endsWith('.json')).map(f => readJson(`_shares/${f.name}`).catch(() => null)))
  return recs.filter(r => r && (!projectId || r.project_id === projectId)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}

export async function writeShare(rec) {
  const body = JSON.stringify({ ...rec, updated_at: new Date().toISOString() }, null, 1)
  const { error } = await supabase.storage.from(BUCKET).upload(`_shares/${rec.slug}.json`, new Blob([body], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}

export async function archiveShare(rec, archived = true) {
  await writeShare({ ...rec, active: !archived, archived_at: archived ? new Date().toISOString() : null })
}

export async function archiveSharesFor(projectId) {
  const recs = await listShares(projectId)
  for (const r of recs) if (r.active) await archiveShare(r, true)
  return recs.length
}

export const newCode = () => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}
