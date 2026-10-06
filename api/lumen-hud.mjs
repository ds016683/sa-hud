// Lumen in the HUD: a text turn from the Command Center itself (the Morning
// Protocol's reply strip first). Same brain, same thread as WhatsApp and the
// voice doors (channel 'hud'), so Lumen remembers it everywhere and can act
// with his tools while David clicks through the HUD.
//   POST {text, where?}  -> { reply }
// Auth: David's own Supabase session (Authorization: Bearer <access token>),
// or CRON_SECRET for probes. No audio; the HUD shows the words.
export const config = { maxDuration: 300 }

import { think, remember } from './_lumen-brain.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

async function authorized(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return false
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true
  const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
  if (!who.ok) return false
  return (await who.json()).id === DAVID
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' })
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const text = String(body.text || '').trim()
  if (!text) return res.status(400).json({ error: 'text required' })
  const where = String(body.where || 'HUD').slice(0, 80)
  await remember({ channel: 'hud', direction: 'in', kind: 'text', body: text, meta: { where } })
  let reply
  try {
    reply = await think({ channel: 'hud', spoken: false, text: `[${where}] ${text}` })
  } catch (e) {
    reply = `I hit a wall on that one: ${String(e.message || e).slice(0, 160)}`
  }
  await remember({ channel: 'hud', direction: 'out', kind: 'text', body: reply, meta: { where } })
  return res.status(200).json({ reply })
}
