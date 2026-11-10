// The lunch sweep (David 11/10): an order page is scuttled 24 hours after its lunch.
// Vercel calls this hourly with the cron secret; it deletes every expired event's
// config, orders, trail and order sheet and leaves a tombstone with no names in it.
import { sweep } from './lunch.mjs'

export default async function handler(req, res) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  try {
    const scuttled = await sweep()
    return res.status(200).json({ ok: true, scuttled })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) })
  }
}
