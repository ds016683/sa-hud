// Lumen's mail door: lumen@thirdhorizon.com over Microsoft Graph (app-only).
// Read the inbox, send as Lumen, mark handled. Gated by the tenant's
// Application Access Policy (the app must be scoped to this mailbox) and by
// Mail.Send / Mail.ReadWrite on the app registration.
import { graphToken as davidAppToken } from './_sync-core.mjs'

// Lumen's mailbox is read by its OWN app registration (openclaw-mail-lumen:
// Mail.Read, Mail.ReadWrite, Mail.Send to internal TH addresses), scoped by
// tenant policy to lumen@. When LUMEN_MAIL_CLIENT_ID/SECRET are set we use it;
// otherwise we fall back to David's mail app (which the policy blocks).
async function graphToken() {
  const id = process.env.LUMEN_MAIL_CLIENT_ID, secret = process.env.LUMEN_MAIL_CLIENT_SECRET
  if (!id || !secret) return davidAppToken()
  const body = new URLSearchParams({ client_id: id, client_secret: secret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
  const res = await fetch(`https://login.microsoftonline.com/${process.env.LUMEN_MAIL_TENANT_ID || process.env.M365_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', body })
  if (!res.ok) { const t = await res.text().catch(() => ''); const code = (t.match(/AADSTS\d+/) || [])[0] || ''; throw new Error(`lumen mail token -> ${res.status} ${code} ${(JSON.parse(t || '{}').error_description || '').split('.')[0].slice(0, 160)}`) }
  return (await res.json()).access_token
}
export const __token = () => graphToken()
export const mailAppConfigured = () => !!(process.env.LUMEN_MAIL_CLIENT_ID && process.env.LUMEN_MAIL_CLIENT_SECRET)

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
