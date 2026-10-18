// Consent watch (David, 10/18): Jordana has to grant admin consent for
// Mail.ReadWrite on the HUD's Graph app before the Mail button can draft into
// David's mailbox. Every 30 minutes Lumen probes the door himself: he creates
// a tiny draft in David's mailbox and removes it. The first time that works he
// tells David on WhatsApp ("*Urgent Smoke Test Required*"), records it, and
// stops probing. No draft is left behind; nothing is sent.
export const config = { maxDuration: 30 }
import { graphToken, MAILBOX } from './_sync-core.mjs'
import { waSendText, davidNumber } from './_wa.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'

const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' })
const sb = async (path, init = {}) => { const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...hdr(), Prefer: init.method ? 'return=representation' : undefined, ...(init.headers || {}) } }); if (!r.ok) throw new Error(`${path.split('?')[0]} -> ${r.status}`); const t = await r.text(); return t ? JSON.parse(t) : null }
const MARK = 'mail-draft-consent'

export default async function handler(req, res) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  try {
    const done = await sb(`daily_logs?select=id&what=eq.${MARK}&limit=1`)
    if (done.length) return res.status(200).json({ ok: true, state: 'granted earlier; watch retired' })
    const g = await graphToken()
    const H = { Authorization: `Bearer ${g}`, 'Content-Type': 'application/json' }
    const box = `https://graph.microsoft.com/v1.0/users/${MAILBOX}`
    const probe = await fetch(`${box}/messages`, { method: 'POST', headers: H, body: JSON.stringify({ subject: 'HUD draft probe (Lumen removes this)', body: { contentType: 'Text', content: 'probe' }, attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: 'probe.txt', contentType: 'text/plain', contentBytes: Buffer.from('probe').toString('base64') }] }) })
    if (probe.status === 403) return res.status(200).json({ ok: true, state: 'waiting on admin consent' })
    if (!probe.ok) return res.status(200).json({ ok: false, state: `graph ${probe.status}`, detail: (await probe.text()).slice(0, 160) })
    const msg = await probe.json()
    await fetch(`${box}/messages/${encodeURIComponent(msg.id)}`, { method: 'DELETE', headers: H }).catch(() => {})
    const now = new Date().toISOString()
    const text = `*Urgent Smoke Test Required*\n\nJordana's consent landed: the HUD can now draft into your Outlook. I just created and removed a test draft in your mailbox to prove it; nothing was sent.\n\nPlease smoke-test it now so it doesn't sit in the wild: open any item's Mission Briefing on the HUD, Production Files, and press Mail on a file. A new Outlook draft should open with that file attached. Tell me "mail works" or paste what you see, and I'll close the board item.`
    let wa = null, err = null
    try { wa = await waSendText(davidNumber(), text) } catch (e) { err = String(e.message || e) }
    await sb('lumen_messages', { method: 'POST', body: JSON.stringify({ at: now, direction: 'out', channel: 'whatsapp', kind: 'text', body: text, external_id: wa || null, meta: { via: 'consent-watch', error: err } }) }).catch(() => {})
    await sb('daily_logs', { method: 'POST', body: JSON.stringify({ day: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), what: MARK, kind: 'note', source: 'lumen', note: `Mail.ReadWrite consent confirmed by probe at ${now}; David pinged on WhatsApp${err ? ` (send failed: ${err})` : ''}`, at: now }) }).catch(() => {})
    await sb('daily_logs', { method: 'POST', body: JSON.stringify({ day: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), what: 'board', kind: 'note', source: 'lumen', note: 'Mail on live files: Graph consent landed; Lumen asked David for the smoke test', at: now }) }).catch(() => {})
    return res.status(200).json({ ok: true, state: 'granted; David pinged', sent: !err, error: err })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
