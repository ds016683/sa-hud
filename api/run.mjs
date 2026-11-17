// The Run's door (see _run.mjs).
//   GET                 the minute's look (the schedule arrives as GET); does nothing unless a run is on
//   GET  ?state=1       -> { run, today }                 what the Board shows
//   POST { action }     start | extract | file { word } | walk | mac { app, title }
// Auth: David's session or CRON_SECRET (the Mac watcher uses the secret).
export const config = { maxDuration: 300 }

import { authorized } from './lumen-hud.mjs'
import { MODEL } from './_lumen-brain.mjs'
import { strikeDay } from './_river.mjs'
import { runState, startRun, tick, extractRun, fileRun, walkAway, macSample } from './_run.mjs'

const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export default async function handler(req, res) {
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  try {
    if (req.method === 'GET') {
      if ((req.query || {}).state != null) return res.status(200).json(await runState())
      return res.status(200).json(await tick())
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' })
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const action = String(body.action || '')
    if (action === 'mac') return res.status(200).json(await macSample({ app: body.app, title: body.title, probe: !!body.probe }))
    if (action === 'start') await startRun()
    else if (action === 'extract') await extractRun({ model: MODEL() })
    else if (action === 'file') { const run = await fileRun({ word: body.word }); if (run.miles > 0) await strikeDay(chiToday()).catch(() => null) }
    else if (action === 'walk') await walkAway()
    else return res.status(400).json({ error: 'action: start | extract | file | walk | mac' })
    return res.status(200).json(await runState())
  } catch (e) { return res.status(409).json({ error: String(e.message || e).slice(0, 300) }) }
}
