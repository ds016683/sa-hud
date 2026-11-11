// A draft in David's Outlook (11/10). One maker for every door that drafts: the
// Mail button on a Live File, and Lumen's draft_email. Nothing here sends. The
// message lands in Drafts with its recipients, its words and its attachments,
// and David reads it and presses Send himself.
//   createDraft({ to, cc, subject, body, files: [{ name, mime, bytes }], replyTo, replyAll })
//   -> { id, webLink, subject, to, cc, attachments: [{ name, size }] }
// Graph: files under 3 MB ride inline, bigger ones through an upload session.
// A reply (replyTo = a message id) is made with createReply so the thread and
// the quoted message come along; body is typed above the quote.
import { graphToken, MAILBOX } from './_sync-core.mjs'

const INLINE_MAX = 3 * 1024 * 1024
const CHUNK = 3 * 1024 * 1024

// "Rich King <rich@x.com>, a@b.com; c@d.com" or an array of those -> Graph recipients.
export function recipients(v) {
  const parts = (Array.isArray(v) ? v : String(v || '').split(/[,;\n]+/)).map(s => String(s || '').trim()).filter(Boolean)
  const out = [], bad = []
  for (const p of parts) {
    const m = p.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>$/) || p.match(/^()([^<>\s]+@[^<>\s]+\.[^<>\s]+)$/)
    if (!m) { bad.push(p); continue }
    const name = m[1].trim().replace(/^["']|["']$/g, '')
    out.push({ emailAddress: name ? { address: m[2], name } : { address: m[2] } })
  }
  return { list: out, bad }
}

export async function createDraft({ to = [], cc = [], subject = '', body = '', files = [], replyTo = null, replyAll = false }) {
  const token = await graphToken()
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const box = `https://graph.microsoft.com/v1.0/users/${MAILBOX}`
  const To = recipients(to), Cc = recipients(cc)
  if (To.bad.length || Cc.bad.length) throw new Error(`not an email address: ${[...To.bad, ...Cc.bad].join(', ')}`)
  const refused = async (made) => {
    const text = (await made.text()).slice(0, 200)
    if (made.status === 403) {
      let roles = [], app = ''
      try { const c = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); roles = c.roles || []; app = c.appid || c.azp || '' } catch { /* opaque token */ }
      return new Error(`Outlook refused to create the draft in ${MAILBOX} (403). The HUD's Graph app ${app ? `(client ${app.slice(0, 8)}…) ` : ''}carries roles [${roles.join(', ') || 'none readable'}]; drafting needs Mail.ReadWrite (application) with admin consent. Jordana can grant it in Entra: App registrations, the HUD app, API permissions, Add Microsoft Graph application permission Mail.ReadWrite, Grant admin consent.`)
    }
    return new Error(`draft -> ${made.status}: ${text}`)
  }
  let msg
  if (replyTo) {
    const made = await fetch(`${box}/messages/${encodeURIComponent(replyTo)}/${replyAll ? 'createReplyAll' : 'createReply'}`, { method: 'POST', headers: H, body: JSON.stringify(body ? { comment: body } : {}) })
    if (!made.ok) throw await refused(made)
    msg = await made.json()
    const patch = {}
    if (To.list.length) patch.toRecipients = To.list
    if (Cc.list.length) patch.ccRecipients = Cc.list
    if (subject) patch.subject = subject
    if (Object.keys(patch).length) {
      const up = await fetch(`${box}/messages/${encodeURIComponent(msg.id)}`, { method: 'PATCH', headers: H, body: JSON.stringify(patch) })
      if (!up.ok) throw new Error(`draft update -> ${up.status}: ${(await up.text()).slice(0, 200)}`)
      msg = { ...msg, ...(await up.json()) }
    }
  } else {
    const made = await fetch(`${box}/messages`, { method: 'POST', headers: H, body: JSON.stringify({ subject, body: { contentType: 'Text', content: body || '' }, toRecipients: To.list, ccRecipients: Cc.list }) })
    if (!made.ok) throw await refused(made)
    msg = await made.json()
  }
  const attached = []
  for (const f of files) {
    const bytes = Buffer.isBuffer(f.bytes) ? f.bytes : Buffer.from(f.bytes)
    const mime = f.mime || 'application/octet-stream'
    if (bytes.length <= INLINE_MAX) {
      const a = await fetch(`${box}/messages/${encodeURIComponent(msg.id)}/attachments`, { method: 'POST', headers: H, body: JSON.stringify({ '@odata.type': '#microsoft.graph.fileAttachment', name: f.name, contentType: mime, contentBytes: bytes.toString('base64') }) })
      if (!a.ok) throw new Error(`attach ${f.name} -> ${a.status}: ${(await a.text()).slice(0, 200)}`)
    } else {
      const us = await fetch(`${box}/messages/${encodeURIComponent(msg.id)}/attachments/createUploadSession`, { method: 'POST', headers: H, body: JSON.stringify({ AttachmentItem: { attachmentType: 'file', name: f.name, size: bytes.length, contentType: mime } }) })
      if (!us.ok) throw new Error(`upload session -> ${us.status}: ${(await us.text()).slice(0, 200)}`)
      const { uploadUrl } = await us.json()
      for (let off = 0; off < bytes.length; off += CHUNK) {
        const end = Math.min(off + CHUNK, bytes.length)
        const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Length': String(end - off), 'Content-Range': `bytes ${off}-${end - 1}/${bytes.length}` }, body: bytes.subarray(off, end) })
        if (!put.ok && put.status !== 201 && put.status !== 200) throw new Error(`upload chunk -> ${put.status}: ${(await put.text()).slice(0, 200)}`)
      }
    }
    attached.push({ name: f.name, size: bytes.length })
  }
  return { id: msg.id, webLink: msg.webLink, subject: msg.subject || subject, to: To.list.map(r => r.emailAddress.address), cc: Cc.list.map(r => r.emailAddress.address), attachments: attached }
}
