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
// ?kind=morning|close|nudge|meetings|notes|mail|signals|orders|sweep
// (default sweep = everything due; close and nudge are manual only since 10/6,
// their content rides in the morning read)
// ?dry=1 composes and reports without sending or recording.

export const config = { maxDuration: 120 }

import { sb, sbWrite, chiToday } from './_ledger.mjs'
import { think, remember, alreadySeen } from './_lumen-brain.mjs'
import { readUnread, markRead, sendMail, mailAllowed } from './_mail.mjs'
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
// Quiet hours (David 10/6: the proactive stream had become noise): nothing
// leaves before 7 AM or after 9 PM Chicago, and a composition that comes back
// as SILENT is recorded but never sent.
const QUIET_START = 21, QUIET_END = 7
const quiet = () => chiHour() >= QUIET_START || chiHour() < QUIET_END
async function say({ kind, day, item, instruction, dry }) {
  if (!dry && quiet()) return { kind, item, sent: false, skipped: 'quiet hours' }
  const text = await think({ channel: 'pulse', text: instruction, spoken: false })
  if (dry) return { kind, item, would_send: text }
  if (/^\s*\[?SILENT\]?\s*$/i.test(text || '')) {
    await remember({ channel: 'pulse', direction: 'out', kind: 'system', body: text, meta: { kind, day, item: item || null, via: 'silent', skipped: 'silent' } })
    return { kind, item, sent: false, skipped: 'silent' }
  }
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
          `[PULSE] It is morning in Chicago and David has not messaged yet. This is the ONE proactive message of the morning, so it carries everything: use get_day for yesterday's close (miles, badges, signal) and say how the day landed in one sentence; use get_today for the calendar and must-dos; use get_objectives and fold the follow-ups that are overdue or due within two days into ONE sentence as a digest (how many, and the two most pressing by name). Never list them one by one and never send them as separate messages later. Four to six short sentences, no lists, no headers. Lead with what matters most. Do not ask him what to do about follow-ups or overdue items: he handles those himself in the Morning Protocol on the HUD right after reading this. End with one question only if there is a real decision today that the board cannot settle; otherwise end on a statement.` }))
      }
    }
    // ---- close summary: folded into the morning read (10/6); manual only.
    if (kind === 'close') {
      const y = plusDays(-1)
      const closed = await sb(`daily_performance?select=day,scorecard&day=eq.${y}&model=eq.Daily%20Report&order=generated_at.desc&limit=1`)
      if (closed.length && closed[0].scorecard?.closed_at && (dry || !(await alreadySent('close', y)))) {
        const sc = closed[0].scorecard
        out.push(await say({ kind: 'close', day: y, dry, instruction:
          `[PULSE] Yesterday (${y}) is closed and canon: ${sc.miles} miles, badges ${JSON.stringify(sc.badges || [])}, signal ${sc.signal?.score ?? 'n/a'}%. Use get_day for ${y} to see what actually happened. Tell David how the day landed in two to four sentences, in your voice, no lists. Name one thing that was genuinely good and, only if true, one thing that slipped. No cheerleading.` }))
      }
    }
    // ---- follow-up nudges: folded into the morning digest (10/6); manual only.
    // Per-item nudges were 44 messages in 8 days and David stopped answering.
    if (kind === 'nudge') {
      const horizon = plusDays(2)
      const due = await sb(`objectives?select=title,follow_up_date&state=eq.follow_up&deleted_at=is.null&follow_up_date=lte.${horizon}&order=follow_up_date.asc`)
      // Backoff: once when it comes due, again after 2 days, then 4, then weekly.
      // The same overdue item must not knock every single morning.
      for (const o of due) {
        const prior = await sb(`lumen_messages?select=meta&channel=eq.pulse&direction=eq.out&meta->>kind=eq.nudge&meta->>item=eq.${encodeURIComponent(o.title)}&order=id.desc&limit=20`).catch(() => [])
        const lastDay = prior.length ? String(prior[0].meta?.day || '') : null
        const gap = lastDay ? Math.round((new Date(TODAY) - new Date(lastDay)) / 86400e3) : 99
        const wait = prior.length === 0 ? 0 : Math.min(7, 2 ** prior.length)
        if (!dry && (gap < wait || await alreadySent('nudge', TODAY, o.title))) continue
        const nth = prior.length + 1
        out.push(await say({ kind: 'nudge', day: TODAY, item: o.title, dry, instruction:
          `[PULSE] A follow-up is ${o.follow_up_date < TODAY ? 'overdue' : 'coming due'}: "${o.title}" (date ${o.follow_up_date}, today ${TODAY}). This is nudge number ${nth}${nth >= 3 ? ', so keep it to one line and ask him plainly to re-date it or drop it; do not sell it' : ''}. One or two sentences, the way a friend would, and ask what he wants: do it now, push the date, or drop it. If he answers, move it with move_objective or set_due.` }))
      }
    }
    // ---- meeting close-outs: ONE evening message for the day's unclosed
    // meetings (10/6; the per-meeting ask 20 minutes after each one was 32
    // messages in 8 days, 5 answered). First sweep at or after 7 PM Chicago.
    // This goes away once the Evening Protocol in the HUD does the close-out.
    if ((kind === 'sweep' && chiHour() >= 19 && chiHour() < 21) || kind === 'meetings') {
      const cutoff = new Date(Date.now() - 20 * 60e3).toISOString()
      const [events, sessions] = await Promise.all([
        sb(`calendar_events?select=id,subject,start_at,end_at,attendees&day=eq.${TODAY}&is_cancelled=eq.false&is_all_day=eq.false&end_at=lte.${cutoff}&order=start_at.asc`),
        sb(`meeting_sessions?select=event_id,closed_at,attended_at,started_at,hours,notes_meeting_id&day=eq.${TODAY}`).catch(() => []),
      ])
      const byEvent = new Map(sessions.map(x => [x.event_id, x]))
      const open = events.filter(e => !byEvent.get(e.id)?.closed_at)
      if (open.length && (dry || !(await alreadySent('meetings', TODAY)))) {
        const lines = open.map(e => { const s = byEvent.get(e.id); const attended = !!(s?.attended_at || s?.started_at || s?.notes_meeting_id); return `"${e.subject}"${attended ? (s?.notes_meeting_id ? ' (attended, notes captured)' : ' (attended)') : ' (no sign he attended)'}` })
        out.push(await say({ kind: 'meetings', day: TODAY, dry, instruction:
          `[PULSE] Evening. ${open.length} of today's meetings ${open.length === 1 ? 'is' : 'are'} not closed out: ${lines.join('; ')}. In ONE short message, name them and ask David to reply once with anything worth keeping (follow-ups, notes) or "none" to close them all as attended. When he answers, use close_meeting per meeting (follow-ups as a list, notes as special_notes); meetings he says he skipped, leave open and say so. Do not ask separate questions per meeting.` }))
      }
    }
    // ---- agenda from notes: when a meeting's Granola notes land, Lumen reads
    // them once and touches the board (follow-ups, dates), then tells David.
    if (kind === 'sweep' || kind === 'notes') {
      const sessions = await sb(`meeting_sessions?select=event_id,subject,notes_meeting_id,notes_summary,closed_at,agenda_touched_at&day=eq.${TODAY}&notes_meeting_id=not.is.null&agenda_touched_at=is.null&limit=4`).catch(() => [])
      for (const ses of sessions) {
        if (!dry) await sbWrite('PATCH', `meeting_sessions?event_id=eq.${encodeURIComponent(ses.event_id)}`, { agenda_touched_at: new Date().toISOString() }, 'return=minimal')
        out.push(await say({ kind: 'notes', day: TODAY, item: ses.event_id, dry, instruction:
          `[PULSE] Granola notes just landed for today's meeting "${ses.subject}". Here they are:\n\n${String(ses.notes_summary || '').slice(0, 6000)}\n\nWork the board from them: for each action item that is David's (not someone else's), add_objective in state follow_up with a sensible follow_up_date (a week out unless the notes name a date) and description "From ${ses.subject} notes"; if the notes move a deadline on something already on his board (check get_objectives), use set_due. Skip anything already on the board. Then, ONLY if you added or moved something, message David two or three plain sentences: what you put on the board from this meeting, any date you moved, and nothing else. If there was nothing for him to do, reply with exactly the single word SILENT and nothing else; it will not be sent.` }))
      }
    }
    // ---- mail: unread messages in lumen@ from David are conversation turns;
    // Lumen answers from its own address. Anything else is left unread.
    if (kind === 'sweep' || kind === 'mail') {
      let msgs = []
      try { msgs = await readUnread(10) } catch (e) { out.push({ kind: 'mail', skipped: String(e.message || e).slice(0, 160) }) }
      for (const m of msgs) {
        const from = String(m.from?.emailAddress?.address || '').toLowerCase()
        if (!mailAllowed().includes(from)) continue
        if (await alreadySeen('email', m.id)) continue
        const text = `Subject: ${m.subject || '(no subject)'}\n\n${String(m.body?.content || m.bodyPreview || '').trim().slice(0, 8000)}`
        if (dry) { out.push({ kind: 'mail', item: m.subject, would_answer: text.slice(0, 200) }); continue }
        await remember({ channel: 'email', direction: 'in', kind: 'text', body: text, external_id: m.id, meta: { from, subject: m.subject, conversation: m.conversationId } })
        let reply
        try { reply = await think({ channel: 'email', text, spoken: false }) } catch (e) { reply = `I hit a wall answering this one: ${String(e.message || e).slice(0, 120)}` }
        try { await sendMail({ to: from, subject: `Re: ${m.subject || ''}`.trim(), text: reply, replyToId: m.id }) } catch (e) { out.push({ kind: 'mail', item: m.subject, skipped: String(e.message || e).slice(0, 160) }); continue }
        await markRead(m.id).catch(() => null)
        await remember({ channel: 'email', direction: 'out', kind: 'text', body: reply, meta: { to: from, subject: m.subject } })
        out.push({ kind: 'mail', item: m.subject, sent: true })
      }
    }
    // ---- meeting signals: email today that touches an upcoming meeting
    // (can't make it, running late, move it). Ask David once per meeting.
    if ((kind === 'sweep' && chiHour() >= 6 && chiHour() < 21) || kind === 'signals') {
      const soon = new Date(Date.now() + 4 * 3600e3).toISOString()
      const [events, mails] = await Promise.all([
        sb(`calendar_events?select=id,subject,start_at,end_at,attendees&day=eq.${TODAY}&is_cancelled=eq.false&is_all_day=eq.false&end_at=gte.${new Date().toISOString()}&start_at=lte.${soon}&order=start_at.asc`),
        sb(`emails?select=subject,from_name,preview,received_at&day=eq.${TODAY}&folder=eq.inbox&order=received_at.desc&limit=60`),
      ])
      const SIG = /(can'?t|cannot|won'?t be able|unable to)\s+(make|join|attend)|running late|need to (move|push|reschedule)|reschedul|conflict|have to (drop|skip|miss)|not going to make/i
      const w = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2)
      for (const e of events) {
        if (!dry && await alreadySent('signal', TODAY, e.id)) continue
        const subj = w(e.subject)
        const names = (Array.isArray(e.attendees) ? e.attendees : []).map(a => String(a).split(' ')[0].toLowerCase()).filter(n => n.length > 2)
        const hits = mails.filter(m => {
          const text = `${m.subject || ''} ${m.preview || ''}`
          if (!SIG.test(text)) return false
          const tw = w(text)
          const mentionsMeeting = subj.some(t => tw.includes(t)) || names.some(n => tw.includes(n))
          return mentionsMeeting
        })
        if (!hits.length) continue
        const startT = new Date(e.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
        out.push(await say({ kind: 'signal', day: TODAY, item: e.id, dry, instruction:
          `[PULSE] Email today looks like it affects "${e.subject}" at ${startT}: ${hits.slice(0, 3).map(h => `${h.from_name || 'someone'}: "${(h.preview || h.subject || '').slice(0, 160)}"`).join(' | ')}. Tell David in one or two sentences who cannot make it or what is being asked, then ask what he wants: keep as is, shorten (say to what), move, or cancel. When he answers, use update_meeting. Do not decide for him.` }))
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
