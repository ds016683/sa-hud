// Lumen's pulse: the Friend speaks first. Runs every 30 minutes by cron and
// decides, deterministically, whether there is something worth saying:
//   morning  the day's read, once, first run after 7:00 AM Chicago
//   close    the Minting summary, once, after the day's Daily Report exists
//   nudge    follow-ups landing within two days, once per item per day
//   orders   standing orders whose next_at has arrived
// The WORDS come from the brain (think), the DECISION to speak is code.
// WhatsApp only delivers free-form business messages inside 24 hours of
// David's last message; outside that window a template is used if one is
// configured, otherwise the pulse records a skip and stays quiet.
// GET with Authorization: Bearer CRON_SECRET (cron) or ?key=MCP_TOKEN (manual).
// ?kind=morning|close|nudge|orders|sweep (default sweep = everything due)
// ?dry=1 composes and reports without sending or recording.

export const config = { maxDuration: 120 }

import { sb, sbWrite, chiToday } from './_ledger.mjs'
import { think, remember } from './_lumen-brain.mjs'
import { waSendText, waSendTemplate, davidNumber } from './_wa.mjs'

const chiHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date()))
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

async function windowOpen() {
  const since = new Date(Date.now() - 23.5 * 3600e3).toISOString()
  const rows = await sb(`lumen_messages?select=id&channel=eq.whatsapp&direction=eq.in&at=gte.${since}&limit=1`)
  return rows.length > 0
}
async function alreadySent(kind, day, extra) {
  const q = `lumen_messages?select=id&channel=eq.pulse&direction=eq.out&meta->>kind=eq.${kind}&meta->>day=eq.${day}${extra ? `&meta->>item=eq.${encodeURIComponent(extra)}` : ''}&limit=1`
  return (await sb(q)).length > 0
}

const LABEL = { morning: 'morning read', close: 'day summary', nudge: 'follow-up reminder', order: 'standing-order note' }
function knockLabel(kind, day) {
  const d = new Date(`${day}T12:00:00Z`)
  const pretty = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d)
  return `${LABEL[kind] || 'note'} for ${pretty}`
}

// Compose through the brain so the pulse has Lumen's voice, then deliver.
// Window open: send the text. Window closed: send the knock template and park
// the text as pending; the WhatsApp door flushes pending pulses when he replies.
async function say({ kind, day, item, instruction, dry }) {
  const text = await think({ channel: 'pulse', text: instruction, spoken: false })
  if (dry) return { kind, item, would_send: text }
  const open = await windowOpen()
  let via = 'text', id = null, skipped = null
  try {
    if (open) id = await waSendText(davidNumber(), text)
    else { via = 'knock'; id = await waSendTemplate(davidNumber(), knockLabel(kind, day)) }
  } catch (e) { skipped = String(e.message || e) }
  await remember({ channel: 'pulse', direction: 'out', kind: skipped ? 'system' : 'text', body: text, external_id: id, meta: { kind, day, item: item || null, via, skipped, pending: via === 'knock' && !skipped } })
  return { kind, item, sent: !skipped, via, skipped, text }
}

// Called by the WhatsApp door on every inbound message: deliver anything that
// was knocked for but not yet sent, oldest first, then clear the flag.
export async function flushPending(to) {
  const rows = await sb(`lumen_messages?select=id,body,meta&channel=eq.pulse&direction=eq.out&meta->>pending=eq.true&order=id.asc&limit=10`)
  const sent = []
  for (const r of rows) {
    try {
      const id = await waSendText(to, r.body)
      await sbWrite('PATCH', `lumen_messages?id=eq.${r.id}`, { meta: { ...(r.meta || {}), pending: false, delivered_id: id, delivered_at: new Date().toISOString() } }, 'return=minimal')
      sent.push(r.meta?.kind || 'pulse')
    } catch (e) { console.error('pulse: flush failed', e.message) }
  }
  return sent
}

export default async function handler(req, res) {
  const q = req.query || {}
  const bearer = (req.headers.authorization || '').replace(/^Bearer /, '')
  const isCron = process.env.CRON_SECRET && bearer === process.env.CRON_SECRET
  if (!isCron && q.key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
  const dry = q.dry === '1'
  const kind = q.kind || 'sweep'
  const TODAY = chiToday()
  const out = []

  try {
    // ---- morning read
    if ((kind === 'sweep' && chiHour() >= 7 && chiHour() < 11) || kind === 'morning') {
      if (dry || !(await alreadySent('morning', TODAY))) {
        out.push(await say({ kind: 'morning', day: TODAY, dry, instruction:
          `[PULSE] It is morning in Chicago and David has not messaged yet. Give him the day's read in your own words: use get_today for the calendar and must-dos, get_objectives for anything active or in follow_up, and get_day for yesterday's close (miles, grade, badges) if it exists. Four to six short sentences, no lists, no headers. Lead with what matters most. End with one question only if there is a real decision for him today.` }))
      }
    }
    // ---- close summary (after the Daily Report for yesterday exists)
    if (kind === 'sweep' || kind === 'close') {
      const y = plusDays(-1)
      const closed = await sb(`daily_performance?select=day,scorecard&day=eq.${y}&model=eq.Daily%20Report&order=generated_at.desc&limit=1`)
      if (closed.length && closed[0].scorecard?.closed_at && (dry || !(await alreadySent('close', y)))) {
        const sc = closed[0].scorecard
        out.push(await say({ kind: 'close', day: y, dry, instruction:
          `[PULSE] Yesterday (${y}) is closed and canon: ${sc.miles} miles, badges ${JSON.stringify(sc.badges || [])}, signal ${sc.signal?.score ?? 'n/a'}%. Use get_day for ${y} to see what actually happened. Tell David how the day landed in two to four sentences, in your voice, no lists. Name one thing that was genuinely good and, only if true, one thing that slipped. No cheerleading.` }))
      }
    }
    // ---- follow-up nudges (two days out, once per item per day)
    if (kind === 'sweep' || kind === 'nudge') {
      const horizon = plusDays(2)
      const due = await sb(`objectives?select=title,follow_up_date&state=eq.follow_up&deleted_at=is.null&follow_up_date=lte.${horizon}&order=follow_up_date.asc`)
      for (const o of due) {
        if (!dry && await alreadySent('nudge', TODAY, o.title)) continue
        out.push(await say({ kind: 'nudge', day: TODAY, item: o.title, dry, instruction:
          `[PULSE] A follow-up is coming due: "${o.title}" on ${o.follow_up_date} (today is ${TODAY}). Nudge David in one or two sentences, the way a friend would, and ask what he wants done with it: do it now, push the date, or drop it. If he answers, you can move it with move_objective.` }))
      }
    }
    // ---- standing orders
    if (kind === 'sweep' || kind === 'orders') {
      const now = new Date().toISOString()
      const orders = await sb(`standing_orders?select=id,text,cadence,next_at&active=eq.true&next_at=lte.${now}&order=next_at.asc&limit=5`)
      for (const o of orders) {
        out.push(await say({ kind: 'order', day: TODAY, item: String(o.id), dry, instruction:
          `[PULSE] A standing order David gave you has come due: "${o.text}" (cadence: ${o.cadence || 'once'}). Do what it asks, using tools if needed, and message him accordingly in your voice, briefly.` }))
        if (!dry) {
          const next = new Date(o.next_at || now)
          const cad = String(o.cadence || '').toLowerCase()
          if (cad.includes('daily')) next.setDate(next.getDate() + 1)
          else if (cad.includes('week')) next.setDate(next.getDate() + 7)
          const patch = (cad.includes('daily') || cad.includes('week')) ? { last_fired_at: now, next_at: next.toISOString() } : { last_fired_at: now, active: false }
          await sbWrite('PATCH', `standing_orders?id=eq.${o.id}`, patch, 'return=minimal')
        }
      }
    }
  } catch (e) {
    console.error('pulse failed:', e)
    return res.status(500).json({ error: String(e.message || e), partial: out })
  }
  return res.status(200).json({ at: new Date().toISOString(), today: TODAY, chicago_hour: chiHour(), dry, window_open: await windowOpen(), actions: out })
}
