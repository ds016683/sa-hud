// The File Cabinet: David's personal file structure in the private 'files'
// bucket (the same store Lumen files into). Two realms plus the intake:
//   Personal/…        Third Horizon/…        inbox/<day>/ (what Lumen received)
// Folders are objects too (a .keep marker), so an empty folder can exist.
import { supabase } from './supabase'

export const BUCKET = 'files'
export const REALMS = ['Personal', 'Third Horizon']
export const SEED = {
  'Personal': ['Vehicles', 'Home', 'Finance', 'Receipts', 'Health', 'Family', 'Legal', 'Travel', 'Reading'],
  'Third Horizon': ['Clients', 'Finance', 'Receipts', 'HR', 'Legal', 'Decks', 'Board', 'Research'],
}
const KEEP = '.keep'
const norm = (p) => String(p || '').replace(/^\/+|\/+$/g, '')

export async function list(prefix = '') {
  const { data, error } = await supabase.storage.from(BUCKET).list(norm(prefix), { limit: 500, sortBy: { column: 'name', order: 'asc' } })
  if (error) throw new Error(error.message)
  const folders = [], files = []
  for (const f of data || []) {
    if (f.name === KEEP) continue
    const path = norm(`${norm(prefix)}/${f.name}`)
    if (f.id === null) folders.push({ name: f.name, path })
    else files.push({ name: f.name, path, size: f.metadata?.size || 0, type: f.metadata?.mimetype || '', updated_at: f.updated_at })
  }
  return { folders, files }
}
export async function openUrl(path) { const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(norm(path), 600); if (error) throw new Error(error.message); return data.signedUrl }
export async function upload(folder, file) {
  const name = String(file.name || 'file').replace(/[^A-Za-z0-9._ ()-]/g, '_')
  const { error } = await supabase.storage.from(BUCKET).upload(norm(`${norm(folder)}/${name}`), file, { upsert: true })
  if (error) throw new Error(error.message)
  return norm(`${norm(folder)}/${name}`)
}
export async function makeFolder(path) {
  const { error } = await supabase.storage.from(BUCKET).upload(norm(`${norm(path)}/${KEEP}`), new Blob([''], { type: 'text/plain' }), { upsert: true })
  if (error) throw new Error(error.message)
}
export async function move(from, to) {
  const { error } = await supabase.storage.from(BUCKET).move(norm(from), norm(to))
  if (error) throw new Error(error.message)
}
export async function remove(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([norm(path)])
  if (error) throw new Error(error.message)
}
// Every path under a prefix, a few levels deep (for search and for moving folders).
export async function walk(prefix = '', depth = 4) {
  const out = []
  const go = async (pre, d) => {
    const { folders, files } = await list(pre)
    for (const f of files) out.push(f)
    if (d > 0) for (const fo of folders) await go(fo.path, d - 1)
  }
  await go(prefix, depth)
  return out
}
export async function seedStructure() {
  for (const realm of REALMS) { await makeFolder(realm); for (const sub of SEED[realm]) await makeFolder(`${realm}/${sub}`) }
}
export const fmtSize = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n > 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`
