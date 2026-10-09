// The File Cabinet: David's personal file structure in the private 'files'
// bucket (the same store Lumen files into). The browser has no policies on
// that bucket, so everything goes through /api/cabinet with his session.
//   Personal/…        Third Horizon/…        inbox/<day>/ (what Lumen received)
import { supabase } from './supabase'

export const BUCKET = 'files'
export const REALMS = ['Personal', 'Third Horizon']
export const SEED = {
  'Personal': ['Vehicles', 'Home', 'Finance', 'Receipts', 'Health', 'Family', 'Legal', 'Travel', 'Reading'],
  'Third Horizon': ['Clients', 'Finance', 'Receipts', 'HR', 'Legal', 'Decks', 'Board', 'Research'],
}
const norm = (p) => String(p || '').replace(/^\/+|\/+$/g, '')
async function auth() { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('not signed in'); return { Authorization: `Bearer ${session.access_token}` } }
async function call(op, { params = {}, body = null, raw = null, type = null } = {}) {
  const h = await auth()
  const qs = new URLSearchParams({ op, ...params }).toString()
  const init = body ? { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : raw ? { method: 'POST', headers: { ...h, 'Content-Type': type || 'application/octet-stream' }, body: raw } : { headers: h, cache: 'no-store' }
  const r = await fetch(`/api/cabinet?${qs}`, init)
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j.error || `cabinet ${r.status}`)
  return j
}

export const list = (prefix = '') => call('list', { params: { prefix: norm(prefix) } })
export const openUrl = async (path) => (await call('url', { params: { path: norm(path) } })).url
export async function upload(folder, file) {
  const name = String(file.name || 'file').replace(/[^A-Za-z0-9._ ()-]/g, '_')
  const path = norm(`${norm(folder)}/${name}`)
  await call('upload', { params: { path }, raw: file, type: file.type || 'application/octet-stream' })
  return path
}
export const makeFolder = (path) => call('mkdir', { body: { path: norm(path) } })
export const move = (from, to) => call('move', { body: { from: norm(from), to: norm(to) } })
export const remove = (path) => call('remove', { body: { path: norm(path) } })
export const walk = async (prefix = '', depth = 4) => (await call('walk', { params: { prefix: norm(prefix), depth } })).files
export async function seedStructure() { for (const realm of REALMS) { await makeFolder(realm); for (const sub of SEED[realm]) await makeFolder(`${realm}/${sub}`) } }
export const fmtSize = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n > 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`
