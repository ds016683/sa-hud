// Lumen's mail door: lumen@thirdhorizon.com over Microsoft Graph (app-only).
// Read the inbox, send as Lumen, mark handled. Gated by the tenant's
// Application Access Policy (the app must be scoped to this mailbox) and by
// Mail.Send / Mail.ReadWrite on the app registration.
import { graphToken } from './_sync-core.mjs'

export const LUMEN_MAILBOX = process.env.LUMEN_MAILBOX || 'lumen@thirdhorizon.com'
export const mailAllowed = () => (process.env.LUMEN_MAIL_ALLOWED || 'david.smith@thirdhorizon.com,david.e.smith8@gmail.com').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
const G = 'https://graph.microsoft.com/v1.0'
const box = () => `${G}/users/${encodeURIComponent(LUMEN_MAILBOX)}`

export async function readUnread(limit = 10) {
  const token = await graphToken()
  const r = await fetch(`${box()}/mailFolders/inbox/messages?$filter=isRead eq false&$top=${limit}&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,conversationId,internetMessageId&$orderby=receivedDateTime asc`, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' } })
  if (!r.ok) throw new Error(`lumen inbox -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return (await r.json()).value || []
}

export async function markRead(id) {
  const token = await graphToken()
  const r = await fetch(`${box()}/messages/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) })
  return r.ok
}

export async function sendMail({ to, subject, text, replyToId = null }) {
  const token = await graphToken()
  const recips = (Array.isArray(to) ? to : [to]).map(a => String(a).trim().toLowerCase()).filter(Boolean)
  const blocked = recips.filter(a => !mailAllowed().includes(a))
  if (blocked.length) throw new Error(`recipient not allowed: ${blocked.join(', ')}`)
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  if (replyToId) {
    const r = await fetch(`${box()}/messages/${encodeURIComponent(replyToId)}/reply`, { method: 'POST', headers: H, body: JSON.stringify({ comment: text }) })
    if (!r.ok) throw new Error(`lumen reply -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return { ok: true, replied: true }
  }
  const r = await fetch(`${box()}/sendMail`, { method: 'POST', headers: H, body: JSON.stringify({ message: { subject, body: { contentType: 'Text', content: text }, toRecipients: recips.map(address => ({ emailAddress: { address } })) }, saveToSentItems: true }) })
  if (!r.ok) throw new Error(`lumen send -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return { ok: true, sent: true }
}
