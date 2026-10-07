// Slack pipe: David's Slack stream into the Ledger (public.slack_messages),
// ported 10/7 from the old Lumen box's Mr. Pulse ingest so the stream
// survives the estate teardown. Reads as David (user token) so it sees his
// channels, groups, DMs and group DMs. Idempotent: rows upsert on id
// (team:channel:ts); each channel resumes from its newest stored ts, a
// never-seen channel backfills 7 days. Threads with replies are followed.
// Also writes the unread total (channels active in the last 14 days) to
// daily_logs what 'slack-unread' (source 'slack') when it changes, which is
// what the Slack light on the Board reads.
//   GET  Authorization: Bearer CRON_SECRET   (cron every 5 minutes)
//   ?dry=1 reads and reports, writes nothing
// Env: SLACK_USER_TOKEN (xoxp, David), SLACK_USER_ID, SUPABASE_SERVICE_KEY, CRON_SECRET
export const config = { maxDuration: 300 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const KEY = () => process.env.SUPABASE_SERVICE_KEY
const hdr = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })
const SLACK = 'https://slack.com/api'
const BACKFILL_DAYS = 7, PER_CHANNEL = 200, UNREAD_WINDOW_DAYS = 14, BATCH = 4
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

async function sb(path) { const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: hdr() }); if (!r.ok) throw new Error(`ledger ${r.status} ${path.slice(0, 60)}`); return r.json() }
async function sbUpsert(table, rows) {
  if (!rows.length) return
  const r = await fetch(`${URL_BASE}/rest/v1/${table}`, { method: 'POST', headers: { ...hdr(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) })
  if (!r.ok) throw new Error(`ledger upsert ${r.status}: ${(await r.text()).slice(0, 200)}`)
}
async function slack(method, params, token) {
  const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)]))
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${SLACK}/${method}?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.status === 429) { await sleep((Number(r.headers.get('retry-after')) || 3) * 1000); continue }
    const j = await r.json().catch(() => ({ ok: false, error: 'bad json' }))
    if (!j.ok && j.error === 'ratelimited') { await sleep(3000); continue }
    return j
  }
  return { ok: false, error: 'ratelimited' }
}

const channelType = (c) => c.is_im ? 'im' : c.is_mpim ? 'mpim' : (c.is_group || c.is_private) ? 'group' : 'channel'
const MENTION = /<@([UW][A-Z0-9]+)>/g
const preview = (t) => String(t || '').replace(/<@[UW][A-Z0-9]+>/g, '@user').replace(/<#[CG][A-Z0-9]+\|([^>]+)>/g, '#$1').replace(/<([^|>]+)\|([^>]+)>/g, '$2').replace(/<([^>]+)>/g, '$1').replace(/\s+/g, ' ').trim().slice(0, 256)
const mentionsDavid = (text, ctype, me) => (me && [...String(text || '').matchAll(MENTION)].some(m => m[1] === me)) || ctype === 'im' || ctype === 'mpim' || /<!(channel|here|everyone)>/.test(text || '')
const epochOf = (iso) => new Date(iso).getTime() / 1000

export default async function handler(req, res) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!process.env.CRON_SECRET || bearer !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  const token = process.env.SLACK_USER_TOKEN
  if (!token) return res.status(500).json({ error: 'SLACK_USER_TOKEN not set' })
  const dry = (req.query || {}).dry === '1'
  const me = process.env.SLACK_USER_ID || ''
  const t0 = Date.now()
  const users = new Map()
  const userName = async (id) => {
    if (!id) return ''
    if (!/^[UW]/.test(id)) return id
    if (users.has(id)) return users.get(id)
    const r = await slack('users.info', { user: id }, token)
    const n = r.ok ? (r.user?.profile?.display_name || r.user?.profile?.real_name || r.user?.name || id) : id
    users.set(id, n); return n
  }
  try {
    const who = await slack('auth.test', {}, token)
    if (!who.ok) return res.status(502).json({ error: `auth.test: ${who.error}` })
    const teamId = who.team_id, teamName = who.team, domain = String(who.url || '').replace(/\/$/, '')
    // Every conversation David is in.
    const convs = []
    for (let cursor = ''; ;) {
      const r = await slack('users.conversations', { types: 'public_channel,private_channel,mpim,im', exclude_archived: 'true', limit: 200, cursor }, token)
      if (!r.ok) throw new Error(`users.conversations: ${r.error}`)
      convs.push(...(r.channels || []))
      cursor = r.response_metadata?.next_cursor || ''
      if (!cursor) break
    }
    const stats = { conversations: convs.length, new: 0, mentions: 0, dms: 0, errors: [], channelsTouched: [] }
    const floor = Date.now() / 1000 - BACKFILL_DAYS * 86400
    const toRow = async (m, c, ctype, cname) => {
      if (!m.ts) return null
      if (m.subtype === 'channel_join' || m.subtype === 'channel_leave') return null
      if (m.subtype === 'bot_message' && m.bot_id && !m.text) return null
      const uid = m.user || m.bot_id || ''
      const text = m.text || ''
      return {
        id: `${teamId}:${c.id}:${m.ts}`, workspace_id: teamId, workspace_name: teamName,
        channel_id: c.id, channel_name: cname, channel_type: ctype,
        thread_ts: m.thread_ts && m.thread_ts !== m.ts ? m.thread_ts : null,
        user_id: uid || null, user_name: /^[UW]/.test(uid) ? await userName(uid) : (m.username || uid || 'bot'),
        ts: new Date(Number(m.ts) * 1000).toISOString(), text, body_preview: preview(text),
        has_mention: mentionsDavid(text, ctype, me), has_files: !!(m.files && m.files.length),
        permalink: domain ? `${domain}/archives/${c.id}/p${String(m.ts).replace('.', '')}` : '', raw: m,
      }
    }
    const one = async (c) => {
      try {
        const ctype = channelType(c)
        const cname = c.is_im ? `DM:${await userName(c.user)}` : (c.name || c.id)
        const last = await sb(`slack_messages?select=ts&channel_id=eq.${c.id}&order=ts.desc&limit=1`)
        const oldest = last.length ? epochOf(last[0].ts) : floor
        const msgs = []
        for (let cursor = ''; msgs.length < PER_CHANNEL;) {
          const r = await slack('conversations.history', { channel: c.id, oldest: oldest.toFixed(6), inclusive: 'false', limit: Math.min(200, PER_CHANNEL - msgs.length), cursor }, token)
          if (!r.ok) { if (r.error !== 'channel_not_found') stats.errors.push(`${c.id}: ${r.error}`); break }
          msgs.push(...(r.messages || []))
          cursor = r.response_metadata?.next_cursor || ''
          if (!r.has_more || !cursor) break
        }
        const rows = []
        for (const m of msgs) {
          const row = await toRow(m, c, ctype, cname); if (row) rows.push(row)
          if (m.thread_ts === m.ts && (m.reply_count || 0) > 0) {
            const rep = await slack('conversations.replies', { channel: c.id, ts: m.ts, limit: 200 }, token)
            for (const r2 of (rep.ok ? rep.messages : [])) { if (r2.ts === m.ts || Number(r2.ts) <= oldest) continue; const rr = await toRow(r2, c, ctype, cname); if (rr) rows.push(rr) }
          }
        }
        if (rows.length) {
          if (!dry) await sbUpsert('slack_messages', rows)
          stats.new += rows.length; stats.mentions += rows.filter(r => r.has_mention).length; stats.dms += rows.filter(r => r.channel_type === 'im' || r.channel_type === 'mpim').length
          stats.channelsTouched.push(`${cname} +${rows.length}`)
        }
      } catch (e) { stats.errors.push(`${c.id}: ${String(e.message || e).slice(0, 100)}`) }
    }
    for (let i = 0; i < convs.length; i += BATCH) await Promise.all(convs.slice(i, i + BATCH).map(one))

    // Unread: channels with any activity in the window (the rest are quiet).
    const since = new Date(Date.now() - UNREAD_WINDOW_DAYS * 86400e3).toISOString()
    const active = [...new Set((await sb(`slack_messages?select=channel_id&ts=gte.${since}&limit=5000`)).map(r => r.channel_id))]
    let unread = 0, counted = 0
    for (let i = 0; i < active.length; i += BATCH) {
      await Promise.all(active.slice(i, i + BATCH).map(async (id) => {
        const info = await slack('conversations.info', { channel: id }, token)
        if (info.ok) { unread += Number(info.channel?.unread_count_display || 0); counted++ }
      }))
    }
    const prev = await sb(`daily_logs?select=value,at&what=eq.slack-unread&order=at.desc&limit=1`)
    const changed = !prev.length || Number(prev[0].value) !== unread
    if (changed && !dry) {
      await fetch(`${URL_BASE}/rest/v1/daily_logs`, { method: 'POST', headers: { ...hdr(), Prefer: 'return=minimal' }, body: JSON.stringify({ day: chiToday(), kind: 'activity', what: 'slack-unread', value: unread, note: `slack pipe · ${counted} active conversations`, source: 'slack', at: new Date().toISOString() }) })
    }
    return res.status(200).json({ at: new Date().toISOString(), dry, ms: Date.now() - t0, ...stats, unread, unread_channels_counted: counted, unread_written: changed && !dry })
  } catch (e) {
    console.error('slack-sync failed:', e)
    return res.status(500).json({ error: String(e.message || e) })
  }
}
