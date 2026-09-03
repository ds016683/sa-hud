// GET/POST /api/sync — run the four Ledger pipes now (Granola, Email,
// Calendar, Harvest). Called by the Vercel cron every 30 minutes and by the
// Run Update flow before composing. Auth: Vercel cron (CRON_SECRET bearer)
// or David's Supabase session token.

import { syncAll } from './_sync-core.mjs'

export const config = { maxDuration: 300 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

export default async function handler(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  let allowed = false
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) allowed = true
  if (!allowed && token) {
    const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
    if (who.ok && (await who.json()).id === DAVID) allowed = true
  }
  if (!allowed) return res.status(401).json({ error: 'unauthorized' })

  const results = await syncAll()
  const anyFail = Object.values(results).some(r => !r.ok)
  return res.status(anyFail ? 207 : 200).json({ at: new Date().toISOString(), ...results })
}
