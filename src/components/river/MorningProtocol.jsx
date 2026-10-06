// Protocols (David, 10/6): the Morning Protocol is the first thing he does,
// a guided click-through of six steps under one timer. The Evening Protocol
// card is the placeholder for the real close of the day (next).
//
//   1 Wake read    yesterday's landing, Lumen's morning read, today's calendar
//   2 Body         morning hygiene, the doses due, devotional: tap to log
//   3 Lights       E-mail, Slack, Bill Pay; queue E-mail Refresh for launch
//   4 Follow-ups   due today or overdue: do today, push, or drop
//   5 Load out     fill the three slots (one Heavy) from what is due
//   6 Launch       pick the first clock; the protocol timer stops
//
// One timer: meeting_sessions adhoc:<day>:morning-protocol, logged to Harvest
// as Business Administration when he launches (same door as Recurring). The
// finish also writes daily_logs what 'morning-protocol' (minutes) so the
// planning light and the River can see it ran. No miles for the timer.
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Check, Sunrise, Moon, Play, Rocket } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { upsertSession, logToHarvest, hoursBetween } from '../../lib/meetings'
import { fetchLoadout, equipObjective, equipTask, equip, fmtClock, chiToday, SIZES, SLOTS, HEAVY_MAX } from '../../lib/loadout'
import { HYGIENE_ITEMS } from '../../constants/hygiene'
import { MEDICATIONS, dueOn } from '../../constants/medications'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, GREEN, RED, BLUE, MONO, SERIF, S, Label, Panel, fmtTime } from './canon'

export const MORNING_SLUG = 'morning-protocol'
const eid = (day) => `adhoc:${day}:${MORNING_SLUG}`
const STEPS = [
  { id: 'read', title: 'Wake read', sub: 'yesterday landed, today ahead' },
  { id: 'body', title: 'Body', sub: 'log what is done' },
  { id: 'lights', title: 'Lights', sub: 'what needs tending' },
  { id: 'followups', title: 'Follow-ups', sub: 'due today: do, push, drop' },
  { id: 'loadout', title: 'Load out', sub: 'three slots, one Heavy' },
  { id: 'launch', title: 'Launch', sub: 'the first clock starts' },
]
const MORNING_HYGIENE = ['shower', 'brush-am', 'shave']
const MORNING_MEDS = (day) => MEDICATIONS.filter(m => ['morning', 'any', 'Friday'].includes(m.when) && dueOn(m, day))

const yesterdayOf = (day) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) }
const plusDays = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const rows = (p) => p.then(r => { if (r.error) console.warn('protocol', r.error.message); return Array.isArray(r.data) ? r.data : [] })

const btn = (color = INK2, filled = false, extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase',
  padding: '8px 14px', borderRadius: 10, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent',
  color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra,
})
const tile = (on, color = GREEN) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, minWidth: 180, flex: '1 1 180px', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
  border: `1px solid ${on ? color : PANEL_BORDER}`, background: on ? `${color}14` : 'rgba(255,255,255,0.03)', color: INK,
})
const LEVEL = { green: GREEN, gold: GOLD, red: RED, gray: 'rgba(234,241,248,0.25)' }
const lightRule = (kind, L) => {
  if (kind === 'email') { const n = L?.email?.unread; if (n == null) return { level: 'gray', text: 'inbox count unavailable' }; return n >= 125 ? { level: 'red', blink: true, text: `${n} unread · overlooked?` } : n >= 50 ? { level: 'red', text: `${n} unread · critical` } : n >= 20 ? { level: 'gold', text: `${n} unread · maintenance required` } : { level: 'green', text: `${n} unread` } }
  if (kind === 'slack') { const n = L?.slack?.unread; if (n == null) return { level: 'gray', text: 'no Slack count yet' }; return n >= 35 ? { level: 'red', blink: true, text: `${n} unread · overlooked?` } : n >= 20 ? { level: 'red', text: `${n} unread · critical` } : n >= 5 ? { level: 'gold', text: `${n} unread · maintenance required` } : { level: 'green', text: `${n} unread` } }
  if (kind === 'bill') { const d = L?.bill_pay?.days; if (d == null) return { level: 'gold', text: 'no Bill Pay on record yet' }; return d >= 15 ? { level: 'red', blink: true, text: `${d} days since Bill Pay · overlooked?` } : d >= 12 ? { level: 'red', text: `${d} days · critical` } : d >= 8 ? { level: 'gold', text: `${d} days · due` } : { level: 'green', text: `${d} day${d === 1 ? '' : 's'} since Bill Pay` } }
  return { level: 'gray', text: '' }
}

// ---- the overlay ------------------------------------------------------------
function Protocol({ day, session, onClose, onFinished, onChange }) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [now, setNow] = useState(() => Date.now())
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  // Data for the steps
  const [read, setRead] = useState(null)
  const [yday, setYday] = useState(null)
  const [events, setEvents] = useState([])
  const [logs, setLogs] = useState([])
  const [lights, setLights] = useState(null)
  const [startEmail, setStartEmail] = useState(false)
  const [emailDecided, setEmailDecided] = useState(false)
  const [followups, setFollowups] = useState([])
  const [queueCount, setQueueCount] = useState(0)
  const [picks, setPicks] = useState([])          // follow-ups marked "today"
  const [L, setL] = useState(null)                 // the loadout
  const [tasks, setTasks] = useState([])           // Main Mission candidates
  const [parked, setParked] = useState([])         // dated Side Mission candidates
  const [projects, setProjects] = useState(new Map())
  const [first, setFirst] = useState(null)         // objective id to equip at launch, or 'email'

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const elapsed = session?.started_at ? (now - new Date(session.started_at).getTime()) / 60000 + ((Number(session.hours) || 0) * 60) : 0

  const yd = yesterdayOf(day)
  const loadAll = useCallback(async () => {
    const [m, ml, ev, lg, fu, fuAll, pt, pj, pk, lo] = await Promise.all([
      rows(supabase.from('lumen_messages').select('body,at,meta').eq('channel', 'pulse').eq('direction', 'out').eq('kind', 'text').contains('meta', { kind: 'morning', day }).order('at', { ascending: false }).limit(1)),
      rows(supabase.from('miles_ledger').select('miles,badge,key').eq('day', yd)),
      rows(supabase.from('calendar_events').select('id,subject,start_at,end_at,is_all_day').eq('day', day).eq('is_cancelled', false).order('start_at')),
      rows(supabase.from('daily_logs').select('id,kind,what,at').eq('day', day).in('kind', ['hygiene', 'medication', 'devotional'])),
      rows(supabase.from('objectives').select('id,title,follow_up_date,effort,tags,description').eq('state', 'follow_up').is('deleted_at', null).lte('follow_up_date', day).order('follow_up_date')),
      rows(supabase.from('objectives').select('id').eq('state', 'follow_up').is('deleted_at', null)),
      rows(supabase.from('project_tasks').select('id,text,status,due_date,project_id,objective_id').in('status', ['open', 'promoted']).or(`due_date.lte.${plusDays(day, 1)},status.eq.promoted`).order('due_date')),
      rows(supabase.from('projects').select('id,name,status')),
      rows(supabase.from('objectives').select('id,title,due_date,start_date,effort,tags').eq('state', 'parked').is('deleted_at', null).or(`due_date.lte.${plusDays(day, 1)},start_date.lte.${day}`).order('due_date')),
      fetchLoadout(),
    ])
    setRead(m[0] || null); setYday({ miles: ml.reduce((s, r) => s + (Number(r.miles) || 0), 0), badges: [...new Set(ml.map(r => r.badge))] })
    setEvents(ev); setLogs(lg); setFollowups(fu); setQueueCount(fuAll.length)
    const pmap = new Map(pj.map(p => [p.id, p])); setProjects(pmap)
    setTasks(pt.filter(t => (pmap.get(t.project_id)?.status || 'active') === 'active'))
    setParked(pk); setL(lo)
    if (!first && lo.equipped) setFirst(lo.equipped.id)
    try {
      const { data: { session: auth } } = await supabase.auth.getSession()
      if (auth) { const r = await fetch('/api/lights', { headers: { Authorization: `Bearer ${auth.access_token}` }, cache: 'no-store' }); if (r.ok) { const j = await r.json(); setLights(j); if (!emailDecided) { const lv = lightRule('email', j).level; setStartEmail(lv === 'gold' || lv === 'red') } } }
    } catch { /* lights stay gray */ }
  }, [day, yd, first, emailDecided])
  useEffect(() => { loadAll() }, [loadAll])

  const go = (n) => { setDir(n > step ? 1 : -1); setStep(Math.max(0, Math.min(STEPS.length - 1, n))); setMsg(null) }

  // Body: tap toggles a daily_logs row.
  const logged = (kind, what) => logs.find(l => l.kind === kind && l.what === what)
  const toggleLog = async (kind, what) => {
    const row = logged(kind, what)
    try {
      if (row) await supabase.from('daily_logs').delete().eq('id', row.id)
      else { const { error } = await supabase.from('daily_logs').insert({ day, kind, what, note: 'Morning Protocol', source: 'hud', at: new Date().toISOString() }); if (error) throw new Error(error.message) }
      setLogs(await rows(supabase.from('daily_logs').select('id,kind,what,at').eq('day', day).in('kind', ['hygiene', 'medication', 'devotional'])))
      onChange && onChange()
    } catch (e) { setMsg(`Could not log: ${e.message}`) }
  }

  // Follow-ups: today (becomes a Load out candidate), push, drop.
  const pushFollow = async (o, n) => {
    const { error } = await supabase.from('objectives').update({ follow_up_date: plusDays(day, n) }).eq('id', o.id)
    if (error) { setMsg(`Could not push: ${error.message}`); return }
    setFollowups(f => f.filter(x => x.id !== o.id)); setMsg(`${o.title}: pushed to ${plusDays(day, n)}`)
  }
  const dropFollow = async (o) => {
    const { error } = await supabase.from('objectives').update({ deleted_at: new Date().toISOString() }).eq('id', o.id)
    if (error) { setMsg(`Could not drop: ${error.message}`); return }
    setFollowups(f => f.filter(x => x.id !== o.id)); setQueueCount(c => Math.max(0, c - 1)); setMsg(`${o.title}: dropped`)
  }
  const todayFollow = async (o) => {
    const { error } = await supabase.from('objectives').update({ due_date: day, follow_up_date: day }).eq('id', o.id)
    if (error) { setMsg(`Could not mark it: ${error.message}`); return }
    setFollowups(f => f.filter(x => x.id !== o.id)); setPicks(p => [...p, o]); setMsg(`${o.title}: today · load it in the next step`)
  }

  // Load out: activate without a clock; Launch picks the clock.
  const refreshLoadout = async () => { const lo = await fetchLoadout(); setL(lo); return lo }
  const loadObjective = async (o) => {
    setBusy(true)
    try {
      const r = await equipObjective(o.id, { clock: false })
      if (!r.ok) { setMsg(`Will not fit: ${r.reasons.join(' · ')}`); return }
      setPicks(p => p.filter(x => x.id !== o.id)); setParked(p => p.filter(x => x.id !== o.id))
      const lo = await refreshLoadout(); if (!first) setFirst(o.id); setMsg(`${r.title} loaded (${lo.slots.used}/${SLOTS})`)
    } catch (e) { setMsg(`Could not load: ${e.message}`) } finally { setBusy(false) }
  }
  const loadTask = async (t) => {
    setBusy(true)
    try {
      const r = await equipTask(t, projects.get(t.project_id)?.name, { clock: false })
      if (!r.ok) { setMsg(`Will not fit: ${r.reasons.join(' · ')}`); return }
      setTasks(ts => ts.filter(x => x.id !== t.id))
      const lo = await refreshLoadout(); if (!first && r.id) setFirst(r.id); setMsg(`${r.title} loaded (${lo.slots.used}/${SLOTS})`)
    } catch (e) { setMsg(`Could not load: ${e.message}`) } finally { setBusy(false) }
  }

  // Launch: stop the protocol timer, log it, start the first clock.
  const launch = async () => {
    setBusy(true)
    try {
      const stopped = new Date().toISOString()
      const span = session?.started_at ? Math.max(0.01, hoursBetween(session.started_at, stopped)) : 0.01
      const hours = Math.round(((Number(session?.hours) || 0) + span) * 100) / 100
      let logged = false
      try { await logToHarvest('Morning Protocol', Math.round(span * 100) / 100); logged = true } catch (e) { setMsg(`Harvest did not take the protocol time: ${e.message}`) }
      await upsertSession({ event_id: eid(day), day, subject: 'Morning Protocol', started_at: session?.started_at || stopped, stopped_at: stopped, hours, harvest_logged: logged || !!session?.harvest_logged })
      await supabase.from('daily_logs').insert({ day, kind: 'activity', what: MORNING_SLUG, value: Math.round(span * 60), note: `Morning Protocol · ${L?.slots?.used ?? 0} loaded${first === 'email' ? ' · E-mail Refresh first' : ''}`, source: 'hud', at: stopped })
      if (first === 'email' || (startEmail && first == null)) {
        await upsertSession({ event_id: `adhoc:${day}:email-refresh`, day, subject: 'E-mail Refresh', started_at: new Date().toISOString(), stopped_at: null })
      } else if (first) {
        await equip(first)
      }
      onFinished({ minutes: Math.round(span * 60) })
    } catch (e) { setMsg(`Launch failed: ${e.message}`); setBusy(false) }
  }

  const board = L?.board || []
  const firstMeeting = events.find(e => !e.is_all_day)
  const meds = useMemo(() => MORNING_MEDS(day), [day])
  const cur = STEPS[step]

  const content = () => {
    if (cur.id === 'read') return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div><Label>Yesterday</Label><div style={{ fontFamily: SERIF, fontSize: 30, color: '#fff', lineHeight: 1.1 }}>{yday ? `${yday.miles} mi` : '…'}</div><div style={{ fontSize: 11, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>{yday?.badges?.length ? yday.badges.filter(b => b).slice(0, 6).join(' · ') : 'no badges'}</div></div>
          <div><Label>Today</Label><div style={{ fontFamily: SERIF, fontSize: 30, color: '#fff', lineHeight: 1.1 }}>{events.filter(e => !e.is_all_day).length} meetings</div><div style={{ fontSize: 11, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>{firstMeeting ? `first at ${fmtTime(firstMeeting.start_at)} · ${firstMeeting.subject}` : 'open calendar'}</div></div>
          <div><Label>Stamina</Label><div style={{ fontFamily: SERIF, fontSize: 30, color: '#fff', lineHeight: 1.1 }}>{L ? `${L.stamina.free}h` : '…'}</div><div style={{ fontSize: 11, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>free before 6 PM · {L ? `${L.stamina.meetingsLeft}h of meetings` : ''}</div></div>
        </div>
        <Panel style={{ marginBottom: 0 }}>
          <Label>Lumen's morning read{read ? ` · ${fmtTime(read.at)}` : ''}</Label>
          <div style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.6, color: INK, marginTop: 6, whiteSpace: 'pre-wrap' }}>{read ? read.body : 'Lumen has not spoken yet this morning. His read lands at 7:12.'}</div>
        </Panel>
      </div>
    )
    if (cur.id === 'body') return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div><Label>Hygiene</Label><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {HYGIENE_ITEMS.filter(h => MORNING_HYGIENE.includes(h.key)).map(h => { const on = !!logged('hygiene', h.key); return <button key={h.key} onClick={() => toggleLog('hygiene', h.key)} style={tile(on)}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>{on ? <Check size={13} color={GREEN} /> : <span style={{ width: 13, height: 13, borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)' }} />}{h.label}</span><span style={{ fontFamily: MONO, fontSize: 10, color: on ? GREEN : GRAY, letterSpacing: '0.6px' }}>{on ? `logged ${fmtTime(logged('hygiene', h.key).at)} · 0.25 mi` : 'tap when done'}</span></button> })}
        </div></div>
        <div><Label>Doses due this morning</Label><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {meds.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Nothing due this morning.</div>}
          {meds.map(m => { const on = !!logged('medication', m.key); return <button key={m.key} onClick={() => toggleLog('medication', m.key)} style={tile(on, GOLD)}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>{on ? <Check size={13} color={GOLD} /> : <span style={{ width: 13, height: 13, borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)' }} />}{m.label}</span><span style={{ fontFamily: MONO, fontSize: 10, color: on ? GOLD : GRAY, letterSpacing: '0.6px' }}>{on ? `logged ${fmtTime(logged('medication', m.key).at)} · 0.5 mi` : m.dose}</span></button> })}
        </div></div>
        <div><Label>Spiritual</Label><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {(() => { const on = !!logged('devotional', 'devotional'); return <button onClick={() => toggleLog('devotional', 'devotional')} style={tile(on, BLUE)}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>{on ? <Check size={13} color={BLUE} /> : <span style={{ width: 13, height: 13, borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)' }} />}Devotional</span><span style={{ fontFamily: MONO, fontSize: 10, color: on ? BLUE : GRAY, letterSpacing: '0.6px' }}>{on ? `logged ${fmtTime(logged('devotional', 'devotional').at)}` : 'tap when done'}</span></button> })()}
        </div></div>
      </div>
    )
    if (cur.id === 'lights') return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['email', 'E-mail'], ['slack', 'Slack'], ['bill', 'Bill Pay']].map(([k, label]) => { const r = lightRule(k, lights); const c = LEVEL[r.level]; return (
            <div key={k} style={{ ...tile(false), cursor: 'default', borderColor: `${c}66` }}>
              <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', fontSize: 13.5 }}><span className={r.blink ? 'mp-blink' : ''} style={{ width: 10, height: 10, borderRadius: 99, background: c, boxShadow: r.level === 'gray' ? 'none' : `0 0 0 3px ${c}33, 0 0 10px ${c}66` }} />{label}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{lights ? r.text : 'reading…'}</span>
            </div>) })}
        </div>
        <button onClick={() => { setStartEmail(v => !v); setEmailDecided(true) }} style={{ ...tile(startEmail, GOLD), flex: '0 1 auto', minWidth: 0 }}>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>{startEmail ? <Check size={13} color={GOLD} /> : <span style={{ width: 13, height: 13, borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)' }} />}Start E-mail Refresh at launch</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{startEmail ? 'the first clock of the day is the inbox' : 'go straight to the loadout instead'}</span>
        </button>
      </div>
    )
    if (cur.id === 'followups') return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 12, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>{followups.length} due today or overdue · {queueCount} in the follow-up queue in all</div>
        {followups.length === 0 && <Panel style={{ marginBottom: 0 }}><div style={{ fontSize: 13.5, color: INK2 }}>Nothing due. {picks.length ? `${picks.length} marked for today, waiting in Load out.` : 'Clean slate.'}</div></Panel>}
        {followups.map(o => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}><div style={{ fontSize: 14, color: INK }}>{o.title}</div><div style={{ fontFamily: MONO, fontSize: 10, color: o.follow_up_date < day ? RED : GRAY, letterSpacing: '0.6px', marginTop: 2 }}>{o.follow_up_date < day ? `overdue since ${o.follow_up_date}` : 'due today'}</div></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => todayFollow(o)} style={btn(GREEN)}>Today</button>
              <button onClick={() => pushFollow(o, 1)} style={btn(INK2)}>+1d</button>
              <button onClick={() => pushFollow(o, 3)} style={btn(INK2)}>+3d</button>
              <button onClick={() => pushFollow(o, 7)} style={btn(INK2)}>+1w</button>
              <button onClick={() => dropFollow(o)} style={btn(RED)}>Drop</button>
            </div>
          </div>
        ))}
      </div>
    )
    if (cur.id === 'loadout') {
      const cands = [
        ...picks.map(o => ({ key: `o:${o.id}`, title: o.title, kind: 'Side Mission · today', size: SIZES[(Number(o.effort) || 1) >= 4 ? 'heavy' : (Number(o.effort) || 1) === 3 ? 'medium' : 'light'].label, act: () => loadObjective(o) })),
        ...tasks.filter(t => !board.some(b => b.id === t.objective_id)).map(t => ({ key: `t:${t.id}`, title: t.text, kind: `${projects.get(t.project_id)?.name || 'Main Mission'}${t.due_date ? ` · due ${t.due_date}` : ''}`, size: 'Light', act: () => loadTask(t) })),
        ...parked.map(o => ({ key: `p:${o.id}`, title: o.title, kind: `Side Mission${o.due_date ? ` · due ${o.due_date}` : ''}`, size: SIZES[(Number(o.effort) || 1) >= 4 ? 'heavy' : (Number(o.effort) || 1) === 3 ? 'medium' : 'light'].label, act: () => loadObjective(o) })),
      ]
      return (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div><Label>Slots</Label><div style={{ fontFamily: SERIF, fontSize: 26, color: '#fff' }}>{L ? `${L.slots.used} / ${SLOTS}` : '…'}</div></div>
            <div><Label>Heavy</Label><div style={{ fontFamily: SERIF, fontSize: 26, color: '#fff' }}>{L ? `${L.heavy.used} / ${HEAVY_MAX}` : '…'}</div></div>
            <div><Label>Stamina</Label><div style={{ fontFamily: SERIF, fontSize: 26, color: L && L.stamina.loaded > L.stamina.free && !L.stamina.afterHours ? RED : '#fff' }}>{L ? `${L.stamina.loaded}h / ${L.stamina.free}h` : '…'}</div></div>
          </div>
          <div><Label>Loaded</Label>
            {board.length === 0 && <div style={{ fontSize: 13, color: GRAY, marginTop: 6 }}>Nothing loaded yet.</div>}
            {board.map(i => <div key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}` }}><Check size={13} color={GREEN} /><span style={{ fontSize: 14, color: INK, flex: 1 }}>{i.title}</span><span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, letterSpacing: '1px', textTransform: 'uppercase' }}>{i.kind} · {SIZES[i.size].label}</span></div>)}
          </div>
          <div><Label>Due and ready</Label>
            {cands.length === 0 && <div style={{ fontSize: 13, color: GRAY, marginTop: 6 }}>Nothing else is dated for today. Pull from the Board below after launch if you want more.</div>}
            {cands.map(c => <div key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}` }}><span style={{ fontSize: 14, color: INK, flex: 1, minWidth: 200 }}>{c.title}</span><span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, letterSpacing: '1px', textTransform: 'uppercase' }}>{c.kind} · {c.size}</span><button disabled={busy} onClick={c.act} style={btn(GOLD)}>Load</button></div>)}
          </div>
        </div>
      )
    }
    // launch
    const options = [...(startEmail ? [{ id: 'email', title: 'E-mail Refresh', sub: 'Recurring · Business Administration' }] : []), ...board.map(i => ({ id: i.id, title: i.title, sub: `${i.kind} · ${SIZES[i.size].label}` }))]
    const sel = first ?? (startEmail ? 'email' : board[0]?.id) ?? null
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.6 }}>{board.length} loaded · {logs.length} logged · protocol {fmtClock(elapsed)}. Pick the first clock and launch.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {options.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Nothing to equip. Launch stops the protocol timer and leaves the Board open.</div>}
          {options.map(o => <button key={o.id} onClick={() => setFirst(o.id)} style={tile(sel === o.id, GOLD)}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>{sel === o.id ? <Play size={13} color={GOLD} fill={GOLD} /> : <Play size={13} color={INK2} />}{o.title}</span><span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{o.sub}</span></button>)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, overflowY: 'auto', background: 'linear-gradient(180deg, #0F2A40 0%, #0A1B2B 100%)' }}>
      <style>{`
        @keyframes mp-in-r { from { opacity: 0; transform: translateX(28px) } to { opacity: 1; transform: none } }
        @keyframes mp-in-l { from { opacity: 0; transform: translateX(-28px) } to { opacity: 1; transform: none } }
        @keyframes mp-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(248,199,97,0.55) } 50% { box-shadow: 0 0 0 9px rgba(248,199,97,0) } }
        @keyframes mp-blink { 0%,100% { opacity: 1 } 50% { opacity: .15 } }
        .mp-step-r { animation: mp-in-r .34s cubic-bezier(.2,.7,.2,1) both } .mp-step-l { animation: mp-in-l .34s cubic-bezier(.2,.7,.2,1) both }
        .mp-dot-now { animation: mp-pulse 1.6s ease-out infinite } .mp-blink { animation: mp-blink 1s ease-in-out infinite }
      `}</style>
      <div style={{ ...S.page, padding: '18px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
          <button onClick={onClose} style={btn(INK2)}><ArrowLeft size={13} /> Board</button>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GOLD }}>Morning Protocol · running {fmtClock(elapsed)}</div>
        </div>
        {/* progress rail */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => { const done = i < step, nowS = i === step; const c = done ? GREEN : nowS ? GOLD_BRIGHT : 'rgba(255,255,255,0.18)'; return (
            <button key={s.id} onClick={() => go(i)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ height: 3, borderRadius: 2, background: c, transition: 'background .4s' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
                <span className={nowS ? 'mp-dot-now' : ''} style={{ width: 9, height: 9, borderRadius: 99, background: c, flex: '0 0 9px' }} />
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: done || nowS ? INK : GRAY }}>{i + 1} · {s.title}</span>
              </div>
            </button>) })}
        </div>
        <div key={step} className={dir > 0 ? 'mp-step-r' : 'mp-step-l'}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.6px', textTransform: 'uppercase', color: GRAY }}>Step {step + 1} of {STEPS.length}</div>
          <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 32, color: '#fff', margin: '6px 0 2px', letterSpacing: '-0.01em' }}>{cur.title}</h2>
          <div style={{ fontSize: 13, color: GRAY, marginBottom: 22 }}>{cur.sub}</div>
          {content()}
        </div>
        {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') || msg.startsWith('Will not') || msg.startsWith('Launch failed') || msg.startsWith('Harvest') ? RED : GOLD, textTransform: 'uppercase', marginTop: 16 }}>{msg}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 30 }}>
          <button onClick={() => go(step - 1)} disabled={step === 0} style={btn(INK2, false, { opacity: step === 0 ? 0.35 : 1 })}><ArrowLeft size={13} /> Back</button>
          {step < STEPS.length - 1
            ? <button onClick={() => go(step + 1)} style={btn(GOLD_BRIGHT, true)}>Next <ArrowRight size={13} /></button>
            : <button onClick={launch} disabled={busy} style={btn(GOLD_BRIGHT, true)}><Rocket size={13} /> Launch</button>}
        </div>
      </div>
    </div>
  )
}

// ---- the Board row ----------------------------------------------------------
export default function ProtocolsPanel({ onChange }) {
  const day = chiToday()
  const [session, setSession] = useState(null)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('meeting_sessions').select('event_id,started_at,stopped_at,hours,harvest_logged').eq('event_id', eid(day)).limit(1)
    setSession(Array.isArray(data) && data[0] ? data[0] : null)
  }, [day])
  useEffect(() => { Promise.resolve().then(refresh) }, [refresh])

  const running = !!(session?.started_at && !session?.stopped_at)
  const done = !!(session?.stopped_at)
  const start = async () => {
    try {
      if (!running) {
        const { data } = await supabase.from('meeting_sessions').select('event_id,started_at,stopped_at').eq('day', day).like('event_id', 'adhoc:%').is('stopped_at', null).not('started_at', 'is', null)
        const other = (data || []).find(s => s.event_id !== eid(day))
        if (other) { setMsg(`${other.event_id.split(':').pop()} is running. Stop it first.`); return }
        await upsertSession({ event_id: eid(day), day, subject: 'Morning Protocol', started_at: new Date().toISOString(), stopped_at: null, hours: session?.hours || 0 })
        await refresh()
      }
      setOpen(true)
    } catch (e) { setMsg(`Could not start: ${e.message}`) }
  }
  const finished = async ({ minutes }) => { setOpen(false); setMsg(`Launched · protocol ${fmtClock(minutes)}`); await refresh(); onChange && onChange() }

  const liveMin = running ? (now - new Date(session.started_at).getTime()) / 60000 + (Number(session.hours) || 0) * 60 : (Number(session?.hours) || 0) * 60
  return (
    <Panel style={{ marginBottom: 0 }}>
      {open && <Protocol day={day} session={session} onClose={() => { setOpen(false); refresh() }} onFinished={finished} onChange={onChange} />}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={start} style={{ ...tile(running || done, running ? GOLD : GREEN), minWidth: 230, flex: '0 1 300px' }}>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}><Sunrise size={14} color={done ? GREEN : GOLD} />Morning Protocol</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: running ? GOLD : done ? GREEN : GRAY }}>
            {running ? `running · ${fmtClock(liveMin)} · tap to resume` : done ? `launched ${fmtTime(session.stopped_at)} · ${fmtClock(liveMin)}` : 'tap to begin the day'}
          </span>
        </button>
        <div style={{ ...tile(false), minWidth: 230, flex: '0 1 300px', cursor: 'default', opacity: 0.6 }}>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}><Moon size={14} color={BLUE} />Evening Protocol</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: GRAY }}>next · the real close of the day</span>
        </div>
      </div>
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') ? RED : GOLD, textTransform: 'uppercase', marginTop: 10 }}>{msg}</div>}
    </Panel>
  )
}
