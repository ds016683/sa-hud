// Health feed: sleep and movement into the Ledger, from whichever device David
// wears. One door, several senders.
//
//   POST /api/health   Authorization: Bearer HEALTH_TOKEN (falls back to CRON_SECRET)
//
// Accepts either of:
//   1. Health Auto Export (iPhone bridge for Apple Watch / HealthKit), its
//      "REST API" automation payload: { data: { metrics: [{ name, units, data: [...] }] } }
//      Sleep Analysis rows carry asleep / inBed (hours) and, on newer versions,
//      core / deep / rem / awake plus sleepStart / sleepEnd. Step Count rows carry qty.
//   2. A plain record (Fitbit pull, a manual note, anything else):
//      { source: 'fitbit'|'apple'|'manual', day: 'YYYY-MM-DD', sleep_hours, in_bed_hours,
//        stages: { deep, rem, core, awake }, sleep_start, sleep_end, steps, resting_hr, hrv }
//
// Writes daily_logs rows: kind 'sleep' (value = hours asleep; the Sleep badge
// reads the day's max) and kind 'activity' what 'steps' (value = steps). One
// row per day and source, updated in place when the sender resends.
import { sb, sbWrite, chiToday } from './_ledger.mjs'

const h2 = (x) => Math.round((Number(x) || 0) * 100) / 100

function authorized(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() || String((req.query || {}).key || '')
  const want = process.env.HEALTH_TOKEN || process.env.CRON_SECRET
  return !!want && token === want
}

// The sleep "day" is the morning you woke up: a night that ends 2026-09-28
// 06:40 belongs to 2026-09-28. Health Auto Export dates the row by the sleep
// end already; a plain record says its day outright.
function dayOf(str) {
  if (!str) return chiToday()
  const m = String(str).match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : chiToday()
}

function fromHealthAutoExport(body) {
  const metrics = body?.data?.metrics
  if (!Array.isArray(metrics)) return null
  const out = []
  const pick = (names) => metrics.filter(m => names.includes(String(m.name || '').toLowerCase()))
  for (const m of pick(['sleep_analysis', 'sleep analysis'])) {
    for (const r of m.data || []) {
      const asleep = r.asleep ?? r.totalSleep ?? (r.core != null ? (Number(r.core) + Number(r.deep || 0) + Number(r.rem || 0)) : null)
      if (asleep == null) continue
      out.push({
        source: 'apple', day: dayOf(r.sleepEnd || r.date), sleep_hours: h2(asleep), in_bed_hours: r.inBed != null ? h2(r.inBed) : null,
        stages: { deep: r.deep, rem: r.rem, core: r.core, awake: r.awake }, sleep_start: r.sleepStart || null, sleep_end: r.sleepEnd || null,
      })
    }
  }
  for (const m of pick(['step_count', 'step count', 'steps'])) {
    for (const r of m.data || []) if (r.qty != null) out.push({ source: 'apple', day: dayOf(r.date), steps: Math.round(Number(r.qty)) })
  }
  for (const m of pick(['resting_heart_rate', 'resting heart rate'])) {
    for (const r of m.data || []) if (r.qty != null) out.push({ source: 'apple', day: dayOf(r.date), resting_hr: Math.round(Number(r.qty)) })
  }
  for (const m of pick(['heart_rate_variability', 'heart rate variability'])) {
    for (const r of m.data || []) if (r.qty != null) out.push({ source: 'apple', day: dayOf(r.date), hrv: Math.round(Number(r.qty)) })
  }
  return out
}

function fromPlain(body) {
  const rows = Array.isArray(body) ? body : Array.isArray(body?.records) ? body.records : [body]
  return rows.filter(r => r && (r.sleep_hours != null || r.steps != null || r.resting_hr != null || r.hrv != null)).map(r => ({
    source: String(r.source || 'manual').toLowerCase(), day: dayOf(r.day), sleep_hours: r.sleep_hours != null ? h2(r.sleep_hours) : undefined,
    in_bed_hours: r.in_bed_hours != null ? h2(r.in_bed_hours) : null, stages: r.stages || null, sleep_start: r.sleep_start || null, sleep_end: r.sleep_end || null,
    steps: r.steps != null ? Math.round(Number(r.steps)) : undefined, resting_hr: r.resting_hr, hrv: r.hrv,
  }))
}

const clock = (iso) => { const m = String(iso || '').match(/(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : null }

// One row per (day, kind, source): update if present, insert if not.
async function upsertLog(day, kind, what, value, note, source) {
  const cur = await sb(`daily_logs?select=id&day=eq.${day}&kind=eq.${kind}&source=eq.${encodeURIComponent(source)}&limit=1`).catch(() => [])
  if (cur.length) { await sbWrite('PATCH', `daily_logs?id=eq.${cur[0].id}`, { what, value, note }, 'return=minimal'); return 'updated' }
  await sbWrite('POST', 'daily_logs', { day, kind, what, value, note, source, at: new Date().toISOString() }, 'return=minimal')
  return 'inserted'
}

export async function ingest(records) {
  const done = []
  // Merge records that describe the same day and source (sleep + steps arrive as separate rows).
  const byKey = new Map()
  for (const r of records) {
    const k = `${r.day}|${r.source}`
    byKey.set(k, { ...(byKey.get(k) || {}), ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) })
  }
  for (const r of byKey.values()) {
    const src = `health:${r.source}`
    if (r.sleep_hours != null) {
      const st = r.stages || {}
      const parts = [`asleep ${r.sleep_hours}h`, r.in_bed_hours != null ? `in bed ${r.in_bed_hours}h` : null,
        st.deep != null ? `deep ${h2(st.deep)}` : null, st.rem != null ? `rem ${h2(st.rem)}` : null, st.core != null ? `core ${h2(st.core)}` : null, st.awake != null ? `awake ${h2(st.awake)}` : null,
        r.sleep_start && r.sleep_end ? `${clock(r.sleep_start)} to ${clock(r.sleep_end)}` : null, `source ${r.source}`].filter(Boolean)
      done.push({ day: r.day, kind: 'sleep', value: r.sleep_hours, result: await upsertLog(r.day, 'sleep', 'sleep', r.sleep_hours, parts.join(' · '), src) })
    }
    if (r.steps != null) done.push({ day: r.day, kind: 'steps', value: r.steps, result: await upsertLog(r.day, 'activity', 'steps', r.steps, `${r.steps.toLocaleString('en-US')} steps · source ${r.source}`, `${src}:steps`) })
    if (r.resting_hr != null || r.hrv != null) {
      const bits = [r.resting_hr != null ? `resting HR ${r.resting_hr}` : null, r.hrv != null ? `HRV ${r.hrv} ms` : null].filter(Boolean)
      done.push({ day: r.day, kind: 'heart', result: await upsertLog(r.day, 'activity', 'heart', r.resting_hr ?? r.hrv, `${bits.join(' · ')} · source ${r.source}`, `${src}:heart`) })
    }
  }
  return done
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ ok: true, door: 'health', accepts: ['Health Auto Export REST payload', 'plain {source, day, sleep_hours, steps, ...}'], auth: 'Bearer HEALTH_TOKEN' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' })
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'bad json' }) } }
  const records = fromHealthAutoExport(body) || fromPlain(body)
  if (!records.length) return res.status(400).json({ ok: false, error: 'nothing recognisable: send a Health Auto Export payload or {source, day, sleep_hours, steps}' })
  try {
    const done = await ingest(records)
    return res.status(200).json({ ok: true, wrote: done })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e).slice(0, 200) })
  }
}
