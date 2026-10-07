// Lights for the Recurring cards: the numbers behind green / gold / red.
//   GET /api/lights   Authorization: Bearer <David's session token | CRON_SECRET>
//
//   email.unread      live Inbox unread count from Graph (David's mailbox)
//   slack.unread      latest count the Ledger holds (daily_logs what 'slack-unread'),
//                     or a live sum when SLACK_USER_TOKEN exists (the Slack pipe, R11)
//   bill_pay.days     days since the last Bill Pay timer stopped (null = none on record)
//   planning.done     a Daily Planning timer ran today
import { graphToken, MAILBOX } from './_sync-core.mjs'
import { sb, chiToday } from './_ledger.mjs'

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

async function emailUnread() {
  const token = await graphToken()
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/mailFolders/inbox?$select=unreadItemCount,totalItemCount`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`graph inbox -> ${res.status}`)
  const d = await res.json()
  return { unread: d.unreadItemCount, total: d.totalItemCount, source: 'graph' }
}

async function slackUnread() {
  // The Slack pipe (api/slack-sync.mjs, every 5 minutes) writes the unread
  // total to daily_logs with source 'slack'; a hand-set value has source 'hud'.
  const rows = await sb(`daily_logs?select=value,at,source&what=eq.slack-unread&order=at.desc&limit=1`)
  return rows.length ? { unread: Number(rows[0].value), source: rows[0].source === 'slack' ? 'slack' : 'ledger', as_of: rows[0].at } : { unread: null, source: 'none' }
}

async function billPay() {
  const rows = await sb(`meeting_sessions?select=day,stopped_at,hours&event_id=like.adhoc:*:bill-pay&stopped_at=not.is.null&order=stopped_at.desc&limit=1`)
  if (!rows.length) return { days: null, last: null }
  const last = rows[0]
  const days = Math.floor((Date.now() - new Date(last.stopped_at).getTime()) / 86400e3)
  return { days, last: last.day, hours: last.hours }
}

async function planning() {
  const day = chiToday()
  // Planning is the Morning Protocol since 10/6; the old Daily Planning timer still counts.
  const rows = await sb(`meeting_sessions?select=event_id,started_at,stopped_at,hours&day=eq.${day}&or=(event_id.eq.adhoc:${day}:morning-protocol,event_id.eq.adhoc:${day}:daily-planning)`)
  return { done: rows.some(r => !!r.stopped_at), running: rows.some(r => r.started_at && !r.stopped_at) }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET' })
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  const settle = async (p) => { try { return await p } catch (e) { return { error: String(e.message || e).slice(0, 120) } } }
  const [email, slack, bill_pay, plan] = await Promise.all([settle(emailUnread()), settle(slackUnread()), settle(billPay()), settle(planning())])
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ at: new Date().toISOString(), email, slack, bill_pay, planning: plan })
}
