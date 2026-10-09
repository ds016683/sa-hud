// The File Cabinet door: the HUD reads and writes the private 'files' bucket
// through here with David's session (the bucket has no policies for the
// browser role; Lumen and this door use the service key). Ops:
//   GET  ?op=list&prefix=            -> { folders:[{name,path}], files:[{name,path,size,type,updated_at}] }
//   GET  ?op=walk&prefix=&depth=4    -> { files:[...] } every file under the prefix
//   GET  ?op=url&path=               -> { url } (signed, 10 minutes)
//   POST ?op=upload&path=  (raw body, Content-Type = the file's type) -> { ok, path }
//   POST ?op=mkdir  {path} | ?op=move {from,to} | ?op=remove {path}
export const config = { maxDuration: 60, api: { bodyParser: false } }

import { authorized } from './lumen-hud.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const BUCKET = 'files'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const norm = (p) => String(p || '').replace(/^\/+|\/+$/g, '').replace(/\.\.+/g, '')
const enc = (p) => norm(p).split('/').map(encodeURIComponent).join('/')
function readRaw(req) { return new Promise((resolve, reject) => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject) }) }

async function list(prefix) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: norm(prefix), limit: 1000, sortBy: { column: 'name', order: 'asc' } }) })
  if (!r.ok) throw new Error(`list ${r.status}`)
  const rows = await r.json(); const pre = norm(prefix)
  const folders = [], files = []
  for (const f of rows) {
    if (f.name === '.keep') continue
    const path = pre ? `${pre}/${f.name}` : f.name
    if (f.id === null) folders.push({ name: f.name, path })
    else files.push({ name: f.name, path, size: f.metadata?.size || 0, type: f.metadata?.mimetype || '', updated_at: f.updated_at })
  }
  return { folders, files }
}

export default async function handler(req, res) {
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  const q = req.query || {}; const op = String(q.op || '')
  try {
    if (req.method === 'GET') {
      if (op === 'list') return res.status(200).json(await list(q.prefix))
      if (op === 'walk') {
        const out = []; const depth = Math.min(6, Number(q.depth) || 4)
        const go = async (pre, d) => { const { folders, files } = await list(pre); out.push(...files); if (d > 0) for (const fo of folders) await go(fo.path, d - 1) }
        await go(q.prefix, depth); return res.status(200).json({ files: out })
      }
      if (op === 'url') {
        const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}/${enc(q.path)}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 600 }) })
        if (!r.ok) return res.status(404).json({ error: `no such file (${r.status})` })
        // The signed path comes back with raw spaces; rebuild it with encoded segments so CSS and <img> accept it.
        const j = await r.json(); const token = String(j.signedURL || '').split('?token=')[1] || ''
        return res.status(200).json({ url: `${URL_BASE}/storage/v1/object/sign/${BUCKET}/${enc(q.path)}?token=${token}` })
      }
      return res.status(400).json({ error: 'op' })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' })
    const raw = await readRaw(req)
    if (op === 'upload') {
      const path = norm(q.path); if (!path) return res.status(400).json({ error: 'path' })
      const r = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${enc(path)}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': String(req.headers['content-type'] || 'application/octet-stream'), 'x-upsert': 'true' }, body: raw })
      if (!r.ok) return res.status(502).json({ error: `upload ${r.status}: ${(await r.text()).slice(0, 160)}` })
      return res.status(200).json({ ok: true, path })
    }
    const body = JSON.parse(raw.toString('utf8') || '{}')
    if (op === 'mkdir') {
      const path = norm(body.path); if (!path) return res.status(400).json({ error: 'path' })
      const r = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${enc(path)}/.keep`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'text/plain', 'x-upsert': 'true' }, body: '' })
      return r.ok ? res.status(200).json({ ok: true, path }) : res.status(502).json({ error: `mkdir ${r.status}` })
    }
    if (op === 'move') {
      const r = await fetch(`${URL_BASE}/storage/v1/object/move`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify({ bucketId: BUCKET, sourceKey: norm(body.from), destinationKey: norm(body.to) }) })
      return r.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: `move ${r.status}: ${(await r.text()).slice(0, 160)}` })
    }
    if (op === 'remove') {
      const r = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${enc(body.path)}`, { method: 'DELETE', headers: hdr() })
      return r.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: `remove ${r.status}` })
    }
    return res.status(400).json({ error: 'op' })
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }) }
}
