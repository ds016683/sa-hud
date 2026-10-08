// Today's Game Plan: Lumen builds the day as data (JSON), the HUD renders it,
// David adjusts it in words and the data is rewritten. Saved at
// project-files/plans/<day>.json so every surface reads the same plan.
//   GET  ?day=YYYY-MM-DD                         -> { plan } or 404
//   POST {day, mode:'build'|'adjust'|'reconcile', instruction?, plan?} -> { plan, note }
//   POST {day, mode:'note', text}                -> remembers a HUD note in Lumen's thread (so WhatsApp knows)
// Auth: David's session or CRON_SECRET (see lumen-hud).
export const config = { maxDuration: 300 }

import { think, remember } from './_lumen-brain.mjs'
import { authorized } from './lumen-hud.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const path = (day) => `plans/${day}.json`
async function readPlan(day) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path(day)}?cb=${Date.now()}`, { headers: { ...hdr(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  return r.ok ? r.json() : null
}
async function writePlan(day, plan) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path(day)}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(plan, null, 1) })
  if (!r.ok) throw new Error(`plan save ${r.status}: ${(await r.text()).slice(0, 160)}`)
}
const SCHEMA = `{"day":"YYYY-MM-DD","summary":"two sentences on the shape of the day","blocks":[{"start":"HH:MM","end":"HH:MM","title":"...","kind":"meeting|work|admin|travel|break","ref":{"type":"event|objective|task","id":"..."}|null,"note":"optional one line"}],"priorities":[{"rank":1,"title":"...","ref":{"type":"objective|task","id":"..."}|null,"size":"light|medium|heavy","block":"HH:MM"|null,"why":"one line"}],"parked":["titles pushed to another day"],"watch":["things to keep an eye on today"]}`
const parseJson = (text) => { const a = text.indexOf('{'), b = text.lastIndexOf('}'); if (a < 0 || b < 0) throw new Error('no JSON in the reply'); return JSON.parse(text.slice(a, b + 1)) }

export default async function handler(req, res) {
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  const q = req.query || {}
  if (req.method === 'GET') { const plan = await readPlan(String(q.day || '')); return plan ? res.status(200).json({ plan }) : res.status(404).json({ error: 'no plan yet' }) }
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' })
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const day = String(body.day || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'day required' })
  const mode = String(body.mode || 'build')
  if (mode === 'note') {
    await remember({ channel: 'hud', direction: 'in', kind: 'text', body: String(body.text || '').slice(0, 2000), meta: { where: 'Morning Protocol', note: true } })
    return res.status(200).json({ ok: true })
  }
  const current = body.plan || (await readPlan(day))
  const base = `[HUD · Today's Game Plan · ${mode}] Chicago day ${day}. Use get_today (calendar, must-dos), get_loadout (what is already loaded), get_objectives (follow-ups due, parked Side Missions with dates), and get_projects if you need task ids. Also use what David told you this morning in this thread (his answers in the Digest step) as the strongest signal for priorities. Build the plan as DATA: reply with ONE JSON object and nothing else, no prose before or after, exactly this shape: ${SCHEMA}. Rules: every meeting on the calendar is a block of kind meeting with ref type event and its id; put focused work into the free gaps between meetings as blocks of kind work, each tied to a priority; respect the Board (three slots, Sidearm 1, Primary 2, Ordnance 3; the day ends at 6 PM Chicago); at most five priorities, each with a one-line why; park what does not fit. Times are Chicago, 24-hour HH:MM.`
  const instr = mode === 'build'
    ? base
    : mode === 'adjust'
      ? `${base}\n\nThe current plan is:\n${JSON.stringify(current || {})}\n\nDavid says: "${String(body.instruction || '').slice(0, 1000)}". Apply exactly what he asked (move, drop, add, re-rank) and keep everything else as it was. Reply with the full updated JSON object only.`
      : `${base}\n\nThe plan David set this morning is:\n${JSON.stringify(current || {})}\n\nDavid has finished the Systems Check (inbox, Slack, bills) and says he is done. Reconcile: check get_today and get_objectives again for anything new since the plan was made (new meetings, moved meetings, new follow-ups, things he mentioned in this thread) and decide whether the shape of the day changed. Reply with the full JSON object only, and put a one-sentence verdict in "summary" that starts with either "No change:" or "Changed:" followed by what moved.`
  let text
  try { text = await think({ channel: 'hud', spoken: false, text: instr }) } catch (e) { return res.status(502).json({ error: `brain: ${String(e.message || e).slice(0, 200)}` }) }
  let plan
  try { plan = parseJson(text) } catch (e) { return res.status(200).json({ error: `Lumen did not return a plan I could read (${e.message})`, raw: String(text).slice(0, 1200) }) }
  plan.day = day; plan.mode = mode; plan.updated_at = new Date().toISOString()
  try { await writePlan(day, plan) } catch (e) { return res.status(200).json({ plan, warning: e.message }) }
  return res.status(200).json({ plan })
}
