// Proposed steps: the capture run and the count of what waits on David.
//   GET  ?count=1   -> { pending, clear_at }           how many proposed steps wait on his ruling
//   GET             -> { events, added, skipped, pending }   the scheduled run (Vercel cron arrives as GET)
//   POST            -> the same run, from Capture Now on the Proposed Steps page
// Auth: David's session or CRON_SECRET (see lumen-hud). Nothing here writes to a card.
export const config = { maxDuration: 300 }

import { authorized } from './lumen-hud.mjs'
import { MODEL } from './_lumen-brain.mjs'
import { capture, readSteps, pendingOf, CLEAR_AT } from './_trail.mjs'

export default async function handler(req, res) {
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' })
  try {
    if (req.method === 'GET' && (req.query || {}).count != null) return res.status(200).json({ pending: pendingOf(await readSteps()).length, clear_at: CLEAR_AT })
    return res.status(200).json({ ...(await capture({ model: MODEL() })), clear_at: CLEAR_AT })
  } catch (e) { return res.status(502).json({ error: String(e.message || e).slice(0, 300) }) }
}
