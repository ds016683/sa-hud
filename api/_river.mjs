// The River: deterministic badge rules that strike miles into miles_ledger.
// Called by /api/refresh (during the day) and /api/close (closing = true,
// which unlocks Clean Close). Idempotent: every award is upserted on
// (day, badge, key), so re-running never double-counts. Rules mirror
// src/constants/collection.js; the miles live here so the server is canon.

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
async function sb(path) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: hdr() })
  if (!r.ok) throw new Error(`${path.split('?')[0]} -> ${r.status}`)
  return r.json()
}

// The regimen schedule (mirror of src/constants/medications.js) with per-day
// overrides from medication_overrides {day, key, due}.
const MEDS = [
  ['vyvanse-am', { type: 'daily' }], ['vyvanse-pm', { type: 'daily' }],
  ['testosterone', { type: 'weekly', days: [5] }], ['nad', { type: 'every_n_days', n: 2, anchor: '2026-09-26' }],
  ['cjc-blend', { type: 'cycle', on: 2, off: 2, anchor: '2026-09-25' }], ['selank', { type: 'daily', asNeeded: true }],
  ['zepbound', { type: 'every_n_days', n: 14, anchor: '2026-09-26' }],
]
const MED_ALIAS = [
  ['vyvanse-am', /vyvanse.*(am|morning)/], ['vyvanse-pm', /vyvanse.*(pm|afternoon)/], ['testosterone', /testo|trt|clinic/],
  ['nad', /nad|nicotinamide/], ['cjc-blend', /cjc|ipamorelin|blend|build/], ['selank', /selank|semarlak/], ['zepbound', /zepbound|tirzepatide|5 ?mg|biweekly|bi-weekly/],
]
const dayIdx = (day) => new Date(day + 'T12:00:00Z').getUTCDay()
const between = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000)
function dueOn(sch, day) {
  if (sch.type === 'daily') return !sch.asNeeded
  if (sch.type === 'weekly') return sch.days.includes(dayIdx(day))
  if (sch.type === 'cycle') { const d = between(sch.anchor, day); return d >= 0 && (d % (sch.on + sch.off)) < sch.on }
  if (sch.type === 'every_n_days') { const d = between(sch.anchor, day); return d >= 0 && d % sch.n === 0 }
  return false
}
async function medsDue(day) {
  const ov = await sb(`medication_overrides?select=key,due&day=eq.${day}`).catch(() => [])
  const byKey = Object.fromEntries(ov.map(o => [o.key, o.due]))
  const due = MEDS.filter(([k, sch]) => (byKey[k] === true || byKey[k] === false) ? byKey[k] : dueOn(sch, day)).map(([k]) => k)
  return { due }
}

export async function computeRegimen(day) {
  const [{ due }, logs, ov] = await Promise.all([medsDue(day), sb(`daily_logs?select=what,note,at&day=eq.${day}&kind=eq.medication`).catch(() => []), sb(`medication_overrides?select=key,due,note&day=eq.${day}`).catch(() => [])])
  const taken = logs.map(l => ({ key: MED_ALIAS.find(([k, re]) => k === String(l.what || '').toLowerCase() || re.test(String(l.what || '').toLowerCase()))?.[0] || l.what, at: l.at, note: l.note }))
  const takenKeys = new Set(taken.map(t => t.key))
  return { day, due, taken, missing: due.filter(k => !takenKeys.has(k)), moved: ov, all: MEDS.map(([k]) => k) }
}

// Rates (David, 10/8): 100 miles is a balanced, good, productive day. North of
// that is extra effort; south means a conscious decoupling or a distraction.
// Nerf and buff as we go. Days before RATES_FROM keep the rates they were
// struck under.
export const RATES_FROM = '2026-10-08'
export const MILES = {
  'main-mission': 100, 'mission-task': 10, 'bounty': 4, 'contract': 15, 'mythic': 50, 'mythic-task': 10, 'side-mission': 4, 'impromptu': 1,
  'maintenance-bundle': 1, 'cartographer': 2, 'exercise': 5, 'lift': 1, 'sleep': 4,
  'toastmaster': 4, 'full-day': 4, 'work-horse': 10, 'clean-close': 2, 'clean-slack': 10, 'discomforter': 5, 'hygiene': 3, 'hygiene-item': 0.25, 'devotional': 2, 'dose': 0.5, 'regimen': 2,
}
export const MILES_V1 = {
  'main-mission': 10, 'mission-task': 1, 'side-mission': 4, 'impromptu': 1, 'maintenance-bundle': 1, 'cartographer': 2, 'exercise': 5, 'lift': 1, 'sleep': 4,
  'toastmaster': 4, 'full-day': 4, 'work-horse': 10, 'clean-close': 2, 'clean-slack': 10, 'discomforter': 5, 'hygiene': 3, 'hygiene-item': 0.25, 'devotional': 2, 'dose': 0.5, 'regimen': 2,
}
export const MYTHIC_STEPS_MAX = 5

const words = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !['the', 'and', 'with', 'for', 'call', 'meeting', 'sync', 'weekly'].includes(w)))
function documented(subject, meetings) {
  const a = words(subject)
  if (!a.size) return false
  return meetings.some(m => {
    const b = words(m.title)
    if (!b.size) return false
    const shared = [...a].filter(w => b.has(w) || [...b].some(x => (x.length >= 4 && w.startsWith(x)) || (w.length >= 4 && x.startsWith(w)))).length
    return shared >= Math.min(2, a.size, b.size)
  })
}

// Compute the day's awards from the Ledger. Returns [{badge, key, miles, evidence}].
export async function computeAwards(day, { closing = false } = {}) {
  const from = `${day}T00:00:00-05:00`, to = `${day}T23:59:59-05:00`
  const [doneTasks, released, stepsDone, taskObjIds, maint, logs, calendar, meetings, time, emails, inboxObjs, doneProjects, sessions, workouts] = await Promise.all([
    sb(`project_tasks?select=id,text,project_id,released_at&status=eq.done&released_at=gte.${from}&released_at=lte.${to}`),
    sb(`objectives?select=id,title,released_at,released_kind,who,state,tags,captured_at,effort&released_at=gte.${from}&released_at=lte.${to}&deleted_at=is.null`),
    sb(`objective_steps?select=id,text,objective_id,done_at&done=eq.true&done_at=gte.${from}&done_at=lte.${to}`).catch(() => []),
    sb(`project_tasks?select=objective_id&objective_id=not.is.null`),
    sb(`maintenance_items?select=id,title&status=eq.done&day=eq.${day}`).catch(() => []),
    sb(`daily_logs?select=kind,what,value,note,at&day=eq.${day}`).catch(() => []),
    sb(`calendar_events?select=id,subject,start_at,end_at,attendees,organizer,is_all_day&day=eq.${day}&is_cancelled=eq.false`),
    sb(`granola_meetings?select=title&meeting_date=eq.${day}`),
    sb(`time_entries?select=person,hours&spent_date=eq.${day}`),
    sb(`emails?select=is_read&folder=eq.inbox&day=eq.${day}`),
    sb(`objectives?select=id&state=eq.inbox&deleted_at=is.null`),
    sb(`projects?select=id,name,status,archived_at,last_activity_at&status=in.(completed,complete,done)`),
    sb(`meeting_sessions?select=event_id,attended_at,started_at,closed_at,notes_meeting_id&day=eq.${day}`).catch(() => []),
    sb(`workouts?select=harvest_entry_id,exercises&day=eq.${day}`).catch(() => []),
  ])
  const linked = new Set(taskObjIds.map(t => t.objective_id))
  const awards = []
  const rates = day >= RATES_FROM ? MILES : MILES_V1
  const v2 = day >= RATES_FROM
  const add = (badge, key, evidence) => { if (rates[badge] == null) return; awards.push({ badge, key: String(key ?? ''), miles: rates[badge], evidence }) }

  const onDay = (ts) => ts && ts >= from && ts <= to
  for (const p of doneProjects) if (onDay(p.archived_at) || onDay(p.last_activity_at)) add('main-mission', p.id, `Main Mission complete: ${p.name}`)
  for (const t of doneTasks) add('mission-task', t.id, `Mission task closed: ${t.text}`)
  for (const o of released) {
    if (o.state === 'released' && o.released_kind === 'done' && !linked.has(o.id) && !(o.tags || []).includes('session')) {
      if ((o.tags || []).includes('impromptu')) add('impromptu', o.id, `Ad Hoc done: ${o.title}`)
      else if (!v2) {
        // Planning rule (9/27, retired 10/8): captured and released the same day paid as impromptu.
        const sameDay = !o.captured_at || o.captured_at >= from
        if (sameDay) add('impromptu', o.id, `Ad Hoc done: ${o.title} (captured and released the same day)`)
        else add('side-mission', o.id, `Side Mission released: ${o.title}`)
      } else {
        // Side Mission types (10/8): Bounty 4, Contract 15, Mythic 50, by the slots it took.
        const e = Number(o.effort) || 1
        const type = e >= 4 ? 'mythic' : e === 3 ? 'contract' : 'bounty'
        add(type, o.id, `${type[0].toUpperCase()}${type.slice(1)} released: ${o.title}`)
      }
    }
    if (o.released_kind === 'foreman' || o.state === 'foreman') add('cartographer', o.id, `Handed off: ${o.title}${o.who ? ` (${o.who})` : ''}`)
  }
  // Mythic tasks (10/8): each step of a Mythic closed today pays like a Main
  // Mission task, the first five steps of that Mythic only.
  if (v2 && stepsDone.length) {
    const objIds = [...new Set(stepsDone.map(st => st.objective_id))]
    const [objs, allSteps] = await Promise.all([
      sb(`objectives?select=id,title,effort&id=in.(${objIds.join(',')})`).catch(() => []),
      sb(`objective_steps?select=id,objective_id,done_at&done=eq.true&objective_id=in.(${objIds.join(',')})&order=done_at.asc`).catch(() => []),
    ])
    const mythics = new Map(objs.filter(o => (Number(o.effort) || 1) >= 4).map(o => [o.id, o]))
    const rank = new Map(); for (const st of allSteps) { const n = (rank.get(st.objective_id) || 0) + 1; rank.set(st.objective_id, n); rank.set(`step:${st.id}`, n) }
    for (const st of stepsDone) {
      const o = mythics.get(st.objective_id); if (!o) continue
      const n = rank.get(`step:${st.id}`) || 99
      if (n <= MYTHIC_STEPS_MAX) add('mythic-task', st.id, `Mythic task ${n} of ${MYTHIC_STEPS_MAX} closed on ${o.title}: ${st.text}`)
    }
  }
  const bundles = Math.floor(maint.length / 5)
  for (let i = 1; i <= bundles; i++) add('maintenance-bundle', i, `Bundle ${i}: ${maint.slice((i - 1) * 5, i * 5).map(m => m.title).join(', ')}`)

  const by = (k) => logs.filter(l => l.kind === k)
  const exMin = by('exercise').reduce((s, l) => s + (Number(l.value) || 0), 0)
  if (exMin >= 45) add('exercise', '', `${Math.round(exMin)} minutes of exercise logged: ${by('exercise').map(l => l.what).filter(Boolean).join(', ') || 'exercise'}`)
  // Lift (9/27): each exercise of three or more sets pays 1 mile, silent.
  for (const w of workouts) for (const [i, x] of (Array.isArray(w.exercises) ? w.exercises : []).entries()) {
    if ((x.sets || []).length >= 3) add('lift', `${w.harvest_entry_id}:${i}`, `Lift: ${x.name}${x.weight_lbs ? ` ${x.weight_lbs} lb` : ''} x ${x.sets.length} sets`)
  }
  const sleepH = Math.max(0, ...by('sleep').map(l => Number(l.value) || 0))
  if (sleepH >= 6) add('sleep', '', `${sleepH} hours of sleep`)
  const disc = by('discomfort')
  if (disc.length >= 3) add('discomforter', '', `Three deliberate discomforts: ${disc.slice(0, 3).map(l => l.what || l.note).filter(Boolean).join('; ')}`)
  // Hygiene: eight daily items, 0.25 each; all eight strike the badge. Free-text
  // "brushed" / "showered" / "whitened" from Lumen map onto the list by keyword.
  const HYG = ['shower', 'brush-am', 'shave', 'brush-mid', 'whiten', 'brush-pm']
  const hygDone = new Set()
  for (const l of by('hygiene')) {
    const w = String(l.what || '').toLowerCase()
    const hourChi = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date(l.at || Date.now())))
    if (HYG.includes(w)) hygDone.add(w)
    else if (w.includes('shower')) hygDone.add('shower')
    else if (w.includes('shave')) hygDone.add('shave')
    else if (w.includes('whiten')) hygDone.add('whiten')
    else if (w.includes('brush') || w.includes('teeth')) hygDone.add(hourChi < 11 ? 'brush-am' : hourChi < 17 ? 'brush-mid' : 'brush-pm')
  }
  for (const k of hygDone) add('hygiene-item', k, `Hygiene: ${k}`)
  if (HYG.every(k => hygDone.has(k))) add('hygiene', '', 'All six hygiene items in one day')
  // Regimen: each logged dose 0.5; all doses due that day strike On Regimen.
  const meds = await medsDue(day)
  const dosesTaken = new Set(by('medication').map(l => String(l.what || '').toLowerCase()).map(w => MED_ALIAS.find(([k, re]) => k === w || re.test(w))?.[0]).filter(Boolean))
  for (const k of dosesTaken) add('dose', k, `Dose: ${k}`)
  if (meds.due.length && meds.due.every(k => dosesTaken.has(k))) add('regimen', '', `All ${meds.due.length} doses due today taken: ${meds.due.join(', ')}`)
  if (by('devotional').length) add('devotional', '', `Morning reflection: ${(by('devotional')[0].note || by('devotional')[0].what || 'done').slice(0, 120)}`)

  // Toastmaster: every real meeting of the day attended, and each one either
  // documented (notes) or closed out. Sessions carry the stamps.
  const now = Date.now()
  const real = calendar.filter(c => !c.is_all_day).filter(c => new Date(c.end_at).getTime() <= now)
  const byEvent = new Map(sessions.map(x => [x.event_id, x]))
  const ok = (c) => {
    const s = byEvent.get(c.id)
    const attended = !!(s && (s.attended_at || s.started_at || s.closed_at || s.notes_meeting_id)) || documented(c.subject, meetings)
    const recorded = !!(s && (s.closed_at || s.notes_meeting_id)) || documented(c.subject, meetings)
    return attended && recorded
  }
  if (real.length >= 1 && real.every(ok) && (closing || real.length === calendar.filter(c => !c.is_all_day).length)) {
    add('toastmaster', '', `${real.length} of ${real.length} meetings attended and documented or closed out: ${real.map(c => c.subject.trim()).join(', ')}`)
  }
  const davidHours = time.filter(t => (t.person || '').startsWith('David')).reduce((s, t) => s + (t.hours || 0), 0)
  if (davidHours >= 6) add('full-day', '', `${Math.round(davidHours * 10) / 10} hours logged in Harvest`)
  if (davidHours > 12) add('work-horse', '', `${Math.round(davidHours * 10) / 10} hours logged in Harvest`)
  if (closing && emails.length && emails.every(e => e.is_read) && inboxObjs.length === 0) {
    add('clean-close', '', `Closed clean: ${emails.length} inbox emails all read, agent inbox at zero, tomorrow reviewed`)
  }
  // Clean Slack (David, 9/28): 10 miles at the close for a Slack fully caught up.
  // Attested by David (the HUD's Slack clean mark or telling Lumen) until the
  // Slack pipe (R11) can verify it. Set deliberately high to move the habit.
  const slackClean = logs.find(l => l.kind === 'activity' && String(l.what || '').toLowerCase() === 'slack-clean')
  if (closing && slackClean) add('clean-slack', '', `Slack clean at the close${slackClean.note ? `: ${slackClean.note}` : ''}`)
  return awards
}

// Strike the day's awards into the ledger (upsert) and return the day's totals.
export async function strikeDay(day, opts = {}) {
  const awards = await computeAwards(day, opts)
  if (awards.length) {
    const rows = awards.map(a => ({ day, badge: a.badge, key: a.key, miles: a.miles, evidence: a.evidence, source: opts.closing ? 'close' : 'refresh' }))
    // awarded_at is the moment the mile was first earned. A re-strike must not
    // move it, so existing rows are patched (miles, evidence) and only new
    // rows are inserted.
    const existing = await sb(`miles_ledger?select=id,badge,key,miles,evidence&day=eq.${day}`)
    const seen = new Map(existing.map(e => [`${e.badge}|${e.key}`, e]))
    const fresh = rows.filter(r => !seen.has(`${r.badge}|${r.key}`))
    if (fresh.length) {
      const r = await fetch(`${URL_BASE}/rest/v1/miles_ledger?on_conflict=day,badge,key`, {
        method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(fresh),
      })
      if (!r.ok) throw new Error(`miles_ledger insert -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
    }
    for (const r of rows) {
      const e = seen.get(`${r.badge}|${r.key}`)
      if (e && (Number(e.miles) !== Number(r.miles) || e.evidence !== r.evidence)) {
        await fetch(`${URL_BASE}/rest/v1/miles_ledger?id=eq.${e.id}`, { method: 'PATCH', headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ miles: r.miles, evidence: r.evidence, source: r.source }) }).catch(() => {})
      }
    }
  }
  const ledger = await sb(`miles_ledger?select=badge,miles,evidence&day=eq.${day}&order=id.asc`)
  const dayMiles = Math.round(ledger.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100
  const totalRows = await sb(`miles_ledger?select=miles`)
  const total = Math.round(totalRows.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100
  const badges = [...new Set(ledger.map(r => r.badge))]
  const evidence = {}
  for (const r of ledger) evidence[r.badge] = evidence[r.badge] ? `${evidence[r.badge]} · ${r.evidence}` : r.evidence
  return { day, badges, badge_evidence: evidence, miles: dayMiles, total }
}
