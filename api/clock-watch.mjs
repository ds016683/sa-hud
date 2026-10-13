// Dormant clocks holster themselves (David, 10/13: a clock ran all night).
// Every 15 minutes: if the one running Loadout clock has had no word from
// David for two hours (no WhatsApp message in, no Loadout action), stop it at
// his last word plus ten minutes, the same grace the session clock uses.
// A clock also stops at midnight Chicago, whatever happened.
export const config = { maxDuration: 30 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' })
const sb = async (path, init = {}) => { const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...hdr(), ...(init.headers || {}) } }); if (!r.ok) throw new Error(`${path.split('?')[0]} ${r.status}`); const t = await r.text(); return t ? JSON.parse(t) : null }
const DORMANT_MS = 120 * 60e3, GRACE_MS = 10 * 60e3
const chiDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

export default async function handler(req, res) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  try {
    const running = await sb('clocks?select=id,objective_id,day,started_at&stopped_at=is.null')
    if (!running.length) return res.status(200).json({ ok: true, running: 0 })
    const now = Date.now()
    const [lastIn] = await sb('lumen_messages?select=at&direction=eq.in&order=at.desc&limit=1')
    const [lastAct] = await sb('clocks?select=started_at&order=started_at.desc&limit=1')
    const lastWord = Math.max(...[lastIn?.at, lastAct?.started_at].filter(Boolean).map(x => new Date(x).getTime()))
    const out = []
    for (const c of running) {
      const started = new Date(c.started_at).getTime()
      const last = Math.max(started, lastWord)
      const pastMidnight = chiDay(now) !== chiDay(c.started_at)
      if (now - last < DORMANT_MS && !pastMidnight) { out.push({ id: c.id, kept: true, idle_min: Math.round((now - last) / 60000) }); continue }
      const stopAt = Math.min(now, last + GRACE_MS)
      const minutes = Math.max(1, Math.round((stopAt - started) / 60000))
      await sb(`clocks?id=eq.${c.id}`, { method: 'PATCH', body: JSON.stringify({ stopped_at: new Date(stopAt).toISOString(), minutes, note: pastMidnight ? 'holstered at midnight (clock-watch)' : 'holstered after two quiet hours (clock-watch)' }), headers: { Prefer: 'return=minimal' } })
      out.push({ id: c.id, objective_id: c.objective_id, stopped: true, minutes, why: pastMidnight ? 'midnight' : 'dormant' })
    }
    return res.status(200).json({ ok: true, clocks: out })
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }) }
}
