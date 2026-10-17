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
      let roles = []
      try { roles = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).roles || [] } catch { /* opaque token */ }
      throw new Error(`Outlook refused to create the draft in ${MAILBOX} (403). The app token carries Graph roles [${roles.join(', ') || 'none readable'}]; drafting needs Mail.ReadWrite (application) with admin consent. Entra: App registrations, the Lumen app, API permissions, Add a permission, Microsoft Graph, Application permissions, Mail.ReadWrite, then Grant admin consent.`)
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
