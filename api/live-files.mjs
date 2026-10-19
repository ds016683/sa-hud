// Live Files door (David, 10/17). One op so far:
//   POST { action: 'draft', id }  or  { action: 'draft', bucket, path, name }
//   -> creates a draft in David's Outlook with the file attached and returns
//      { webLink } so the HUD can open it. Nothing is sent; he finishes the
//      note in Outlook. Graph: small files inline (under 3 MB), bigger ones
//      through an upload session.
import { authorized } from './lumen-hud.mjs'
import { graphToken, MAILBOX } from './_sync-core.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const enc = (p) => String(p).split('/').map(encodeURIComponent).join('/')
const INLINE_MAX = 3 * 1024 * 1024
const CHUNK = 3 * 1024 * 1024

async function fileRow(body) {
  if (body.id) {
    const r = await fetch(`${URL_BASE}/rest/v1/live_files?select=id,name,bucket,path,mime,size,note&id=eq.${encodeURIComponent(body.id)}&limit=1`, { headers: { ...hdr(), 'Content-Type': 'application/json' } })
    const rows = r.ok ? await r.json() : []
    if (!rows.length) throw new Error('no such live file')
    return rows[0]
  }
  if (!body.path) throw new Error('id or path required')
  return { name: body.name || String(body.path).split('/').pop(), bucket: body.bucket || 'project-files', path: body.path, mime: body.mime || null, note: null }
}

async function download(f) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${f.bucket}/${enc(f.path)}`, { headers: hdr() })
  if (!r.ok) throw new Error(`storage read -> ${r.status}`)
  return { bytes: Buffer.from(await r.arrayBuffer()), mime: f.mime || r.headers.get('content-type') || 'application/octet-stream' }
}

async function draftWithFile(f) {
  const token = await graphToken()
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const box = `https://graph.microsoft.com/v1.0/users/${MAILBOX}`
  const { bytes, mime } = await download(f)
  const subject = f.name.replace(/\.[A-Za-z0-9]+$/, '')
  const message = { subject, body: { contentType: 'Text', content: f.note ? `${f.note}\n\n` : '' }, toRecipients: [] }
  if (bytes.length <= INLINE_MAX) message.attachments = [{ '@odata.type': '#microsoft.graph.fileAttachment', name: f.name, contentType: mime, contentBytes: bytes.toString('base64') }]
  const made = await fetch(`${box}/messages`, { method: 'POST', headers: H, body: JSON.stringify(message) })
  if (!made.ok) {
    const text = (await made.text()).slice(0, 200)
    if (made.status === 403) {
      let roles = [], app = ''
      try { const c = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); roles = c.roles || []; app = c.appid || c.azp || '' } catch { /* opaque token */ }
      throw new Error(`Outlook refused to create the draft in ${MAILBOX} (403). The HUD's Graph app ${app ? `(client ${app.slice(0, 8)}…) ` : ''}carries roles [${roles.join(', ') || 'none readable'}]; drafting needs Mail.ReadWrite (application) with admin consent. Entra: App registrations, the Lumen app, API permissions, Add a permission, Microsoft Graph, Application permissions, Mail.ReadWrite, then Grant admin consent.`)
    }
    throw new Error(`draft -> ${made.status}: ${text}`)
  }
  const msg = await made.json()
  if (bytes.length > INLINE_MAX) {
    const us = await fetch(`${box}/messages/${encodeURIComponent(msg.id)}/attachments/createUploadSession`, { method: 'POST', headers: H, body: JSON.stringify({ AttachmentItem: { attachmentType: 'file', name: f.name, size: bytes.length, contentType: mime } }) })
    if (!us.ok) throw new Error(`upload session -> ${us.status}: ${(await us.text()).slice(0, 200)}`)
    const { uploadUrl } = await us.json()
    for (let off = 0; off < bytes.length; off += CHUNK) {
      const end = Math.min(off + CHUNK, bytes.length)
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Length': String(end - off), 'Content-Range': `bytes ${off}-${end - 1}/${bytes.length}` }, body: bytes.subarray(off, end) })
      if (!put.ok && put.status !== 201 && put.status !== 200) throw new Error(`upload chunk -> ${put.status}: ${(await put.text()).slice(0, 200)}`)
    }
  }
  return { id: msg.id, webLink: msg.webLink, subject, size: bytes.length }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' })
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  try {
    const body = req.body || {}
    if (body.action === 'put') {
      // The HUD's own upload path: bytes come base64 in the body, go up with the service key
      // (no storage policy in the way), and the index row is written here. Under 4.5 MB.
      const name = String(body.name || 'file').replace(/[^A-Za-z0-9._ -]/g, '_')
      const bytes = Buffer.from(String(body.content_base64 || ''), 'base64')
      if (!bytes.length) return res.status(400).json({ error: 'empty file' })
      const root = body.objective_id ? `objectives/${body.objective_id}/files` : body.project_id ? String(body.project_id) : 'live'
      const path = `${root}/${name}`
      const up = await fetch(`${URL_BASE}/storage/v1/object/project-files/${enc(path)}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': body.mime || 'application/octet-stream', 'x-upsert': 'true' }, body: bytes })
      if (!up.ok) return res.status(502).json({ error: `storage -> ${up.status}: ${(await up.text()).slice(0, 160)}` })
      const stem = (n) => String(n || '').replace(/\.[^.]+$/, '').replace(/[\s_.-]*(v|ver|version)\s*\d+[a-z]?$/i, '').replace(/[\s_.-]*\(\d+\)$/, '').replace(/[\s_.-]+$/, '').trim().toLowerCase()
      const ext = (n) => (String(n || '').split('.').pop() || '').toLowerCase()
      const inRootR = await fetch(`${URL_BASE}/rest/v1/live_files?select=id,name,version&path=like.${encodeURIComponent(root + '/%')}&superseded_by=is.null&filed_at=is.null`, { headers: { ...hdr(), 'Content-Type': 'application/json' } })
      const inRoot = inRootR.ok ? await inRootR.json() : []
      const prior = inRoot.filter(r => stem(r.name) === stem(name) && ext(r.name) === ext(name)).sort((a, b) => (b.version || 1) - (a.version || 1))
      const row = { user_id: '9d28e8cf-3e35-48d9-a029-1327bd37fdd4', name, bucket: 'project-files', path, size: bytes.length, mime: body.mime || null, objective_id: body.objective_id || null, project_id: body.project_id || null, note: body.note || null, source: body.source || 'david', version: prior.length ? (prior[0].version || 1) + 1 : 1 }
      const ins = await fetch(`${URL_BASE}/rest/v1/live_files`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(row) })
      if (!ins.ok) return res.status(502).json({ error: `index -> ${ins.status}: ${(await ins.text()).slice(0, 160)}` })
      const made = (await ins.json())[0]
      for (const pr of prior) await fetch(`${URL_BASE}/rest/v1/live_files?id=eq.${pr.id}`, { method: 'PATCH', headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ superseded_by: made.id }) })
      return res.status(200).json({ ok: true, row: made })
    }
    if (body.action === 'draft') {
      const f = await fileRow(body)
      const out = await draftWithFile(f)
      return res.status(200).json({ ok: true, ...out, name: f.name })
    }
    return res.status(400).json({ error: 'unknown action' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
