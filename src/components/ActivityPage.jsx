// ACTIVITY. A discrete running record of what David did on a selected day,
// merged client-side from the pipes (emails sent, meetings held, Harvest hours,
// Side and Main Missions closed, daily logs, words said to Lumen), sorted by
// time, with a vertical TODAY dashboard beside it. Refreshes every 60s.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { matchNotes } from '../lib/meetings'
import {
  INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, PURPLE, GREEN, RED, MONO, SERIF,
  S, Eyebrow, Label, Stat, Panel, chiToday, chiDayOf, fmtTime, fmtDay,
} from './river/canon'

// ---- Day helpers (Chicago). Timestamp columns are fetched over a generous
// UTC window and then filtered by their Chicago day, so DST never bites.
const shiftDay = (day, n) => {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const windowFor = (day) => ({ lo: shiftDay(day, -1) + 'T00:00:00Z', hi: shiftDay(day, 2) + 'T00:00:00Z' })
const onDay = (iso, day) => !!iso && chiDayOf(iso) === day
const noonOf = (day) => new Date(day + 'T12:00:00').toISOString()

// ---- Kind chips: one color per kind, cool for signal, gold for work done.
const KINDS = {
  'Email':         { color: BLUE },
  'Meeting':       { color: PERIWINKLE },
  'Work':          { color: GOLD },
  'Side Mission':  { color: GREEN },
  'Main Mission':  { color: GOLD_BRIGHT },
  'Discomfort':    { color: RED },
  'Hygiene':       { color: BLUE },
  'Exercise':      { color: GREEN },
  'Sleep':         { color: PERIWINKLE },
  'Thought':       { color: INK2 },
  'Activity':      { color: INK2 },
  'Said to Lumen': { color: PURPLE },
}
const LOG_KIND_LABEL = { discomfort: 'Discomfort', hygiene: 'Hygiene', exercise: 'Exercise', sleep: 'Sleep', note: 'Thought', activity: 'Activity' }

const KindChip = ({ kind }) => {
  const c = (KINDS[kind] || KINDS.Activity).color
  return (
    <span style={{ ...S.chip('transparent', c), border: `1px solid ${c}55`, fontFamily: MONO, fontWeight: 600, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{kind}</span>
  )
}

// Meeting <-> Granola note match lives in lib/meetings (matchNotes), the same
// matcher the Board, Notes, and the River use, so "documented" agrees everywhere.
const truncate = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }

async function fetchDay(day) {
  const { lo, hi } = windowFor(day)
  const q = (p) => p.then(r => { if (r.error) console.warn('activity fetch', r.error.message); return Array.isArray(r.data) ? r.data : [] })
  const [emails, calendar, granola, time, objectives, doneTasks, promotedTasks, projects, logs, workouts, lumen] = await Promise.all([
    q(supabase.from('emails').select('subject,to_names,received_at,day').eq('folder', 'sent').eq('day', day).order('received_at', { ascending: true })),
    q(supabase.from('calendar_events').select('subject,start_at,end_at,attendees,day,is_cancelled').eq('day', day).eq('is_cancelled', false).order('start_at', { ascending: true })),
    q(supabase.from('granola_meetings').select('title,meeting_date,attendees,summary').eq('meeting_date', day)),
    q(supabase.from('time_entries').select('person,client,project,task,hours,notes,spent_date').eq('spent_date', day).ilike('person', '%David%')),
    q(supabase.from('objectives').select('id,title,released_at,released_kind,activated_at,captured_at,deleted_at').is('deleted_at', null).or(`released_at.gte.${lo},activated_at.gte.${lo},captured_at.gte.${lo}`)),
    q(supabase.from('project_tasks').select('id,text,status,released_at,project_id').eq('status', 'done').gte('released_at', lo).lt('released_at', hi)),
    q(supabase.from('project_tasks').select('id,project_id,objective_id').not('objective_id', 'is', null)),
    q(supabase.from('projects').select('id,name')),
    q(supabase.from('daily_logs').select('day,kind,what,value,note,at,source').eq('day', day)),
    q(supabase.from('workouts').select('day,minutes,summary,harvest_entry_id').eq('day', day)),
    q(supabase.from('lumen_messages').select('at,channel,direction,kind,body').eq('direction', 'in').in('channel', ['whatsapp', 'voice']).gte('at', lo).lt('at', hi)),
  ])
  return { emails, calendar, granola, time, objectives, doneTasks, promotedTasks, projects, logs, workouts, lumen }
}

function build(raw, day, nowMs) {
  const rows = []
  const today = chiToday()
  const isToday = day === today
  const isPast = day < today

  // Emails sent
  for (const e of raw.emails) {
    const to = Array.isArray(e.to_names) ? e.to_names.filter(Boolean).join(', ') : ''
    rows.push({ at: e.received_at || noonOf(day), kind: 'Email', text: `Sent: ${e.subject || '(no subject)'}${to ? ` → ${to}` : ''}`, src: 'emails (sent)', fields: { subject: e.subject, to: to || null, received_at: e.received_at } })
  }

  // Meetings held (started so far), with a Granola match as "documented".
  // All-day calendar items (birthdays, holds) are not meetings; the River skips them too.
  const held = raw.calendar.filter(c => !c.is_all_day && c.start_at && (isPast || new Date(c.start_at).getTime() <= nowMs))
  let documented = 0
  const docRows = []
  for (const c of held) {
    const best = matchNotes(c, raw.granola)
    const notes = best ? [best] : []
    const doc = notes.length > 0
    if (doc) documented += 1
    const n = Array.isArray(c.attendees) ? c.attendees.length : 0
    const who = Array.isArray(c.attendees) ? c.attendees.map(a => (a && (a.name || a.email || a)) || '').filter(Boolean).slice(0, 8).join(', ') : ''
    rows.push({ at: c.start_at, kind: 'Meeting', text: c.subject || '(untitled)', meta: n ? `${n} attendee${n === 1 ? '' : 's'}` : null, documented: doc, src: 'calendar_events', fields: { start_at: c.start_at, end_at: c.end_at, organizer: c.organizer, attendees: who || null, granola_match: notes.map(g => g.title).join(' | ') || 'none' } })
    for (const g of notes) docRows.push({ at: c.start_at, kind: 'Meeting', text: g.title, meta: `matches calendar: ${c.subject}`, documented: true, src: 'granola_meetings', fields: { meeting_date: g.meeting_date, attendees: Array.isArray(g.attendees) ? g.attendees.join(', ') : null, summary: truncate(g.summary, 240) || null } })
  }

  // Work logged (Harvest, David's entries)
  let hours = 0
  for (const t of raw.time) {
    const h = Number(t.hours) || 0
    hours += h
    const parts = [t.project, t.task].filter(Boolean)
    rows.push({ at: noonOf(day), kind: 'Work', text: `${parts.join(' · ')}${parts.length ? ' · ' : ''}${h}h`, meta: t.notes ? truncate(t.notes, 160) : (t.client || null), src: 'time_entries (Harvest)', fields: { client: t.client, project: t.project, task: t.task, hours: h, notes: t.notes || null } })
  }

  // Side Missions released today
  for (const o of raw.objectives) {
    if (onDay(o.released_at, day)) rows.push({ at: o.released_at, kind: 'Side Mission', text: `Released: ${o.title}`, meta: o.released_kind && o.released_kind !== 'done' ? o.released_kind : null, src: 'objectives', fields: { id: o.id, released_at: o.released_at, released_kind: o.released_kind || 'done' } })
  }

  // Main Mission tasks done today
  const touched = new Set()
  const touchedWhy = new Map()
  const why = (pid, reason) => { if (!pid) return; touched.add(pid); touchedWhy.set(pid, [...(touchedWhy.get(pid) || []), reason]) }
  const projName = new Map(raw.projects.map(p => [p.id, p.name]))
  for (const t of raw.doneTasks) {
    if (!onDay(t.released_at, day)) continue
    const pname = projName.get(t.project_id) || 'Project'
    why(t.project_id, `task closed: ${t.text}`)
    rows.push({ at: t.released_at, kind: 'Main Mission', text: `${pname}: ${t.text}`, src: 'project_tasks', fields: { id: t.id, project: pname, status: t.status, released_at: t.released_at } })
  }
  // Promotions and activations today, via objectives linked from project_tasks
  const objById = new Map(raw.objectives.map(o => [o.id, o]))
  for (const t of raw.promotedTasks) {
    const o = objById.get(t.objective_id)
    if (!o || !t.project_id) continue
    if (onDay(o.activated_at, day)) why(t.project_id, `task activated: ${o.title}`)
    else if (onDay(o.captured_at, day)) why(t.project_id, `task promoted to the board: ${o.title}`)
  }

  // Thoughts and logs
  for (const l of raw.logs) {
    const kind = LOG_KIND_LABEL[l.kind] || 'Activity'
    const text = [l.what, l.note].filter(Boolean).join(' · ') || (l.value != null ? String(l.value) : '')
    rows.push({ at: l.at || noonOf(day), kind, text, meta: l.value != null && (l.what || l.note) ? String(l.value) : null, src: 'daily_logs', fields: { kind: l.kind, what: l.what, value: l.value, note: l.note, at: l.at, source: l.source } })
  }

  // Said to Lumen
  for (const m of raw.lumen) {
    if (!onDay(m.at, day)) continue
    rows.push({ at: m.at, kind: 'Said to Lumen', text: truncate(m.body, 140), meta: m.channel, src: 'lumen_messages (in)', fields: { channel: m.channel, kind: m.kind, at: m.at, body: truncate(m.body, 400) } })
  }

  rows.sort((a, b) => new Date(a.at) - new Date(b.at))
  const byKind = {}
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1

  // Time on pursuits (9/27 rule): Harvest = Third Horizon work only. Personal
  // Side Missions keep their clock in the Ledger (activity logs with source
  // objective:*), never Harvest. Exercise lives in the workouts record.
  const clocks = raw.logs.filter(l => l.kind === 'activity' && String(l.source || '').startsWith('objective:'))
  const clockRow = (l) => ({ at: l.at || noonOf(day), kind: 'Side Mission', text: `${l.what || 'Side Mission'} · ${Math.round((Number(l.value) || 0) / 6) / 10}h`, meta: l.note, src: 'daily_logs (Side Mission clock)', fields: { minutes: l.value, note: l.note, source: l.source } })
  const personalH = clocks.filter(l => /^personal/.test(l.note || '')).reduce((s, l) => s + (Number(l.value) || 0), 0) / 60
  const workClockH = clocks.filter(l => !/^personal/.test(l.note || '')).reduce((s, l) => s + (Number(l.value) || 0), 0) / 60
  const exerciseH = (raw.workouts || []).reduce((s, w) => s + (Number(w.minutes) || 0), 0) / 60
  const pursuitsH = hours + personalH + workClockH + exerciseH
  const pursuitRows = [
    ...rows.filter(r => r.kind === 'Work'),
    ...clocks.map(clockRow),
    ...(raw.workouts || []).map(w => ({ at: noonOf(day), kind: 'Exercise', text: `Workout · ${Math.round((Number(w.minutes) || 0) / 6) / 10}h`, meta: w.summary, src: 'workouts', fields: { minutes: w.minutes, harvest_entry_id: w.harvest_entry_id } })),
  ]

  // Drill-downs for the Today panel: what each number is made of.
  const drills = {
    pursuits: pursuitRows,
    thirdHorizon: rows.filter(r => r.kind === 'Work'),
    held: rows.filter(r => r.kind === 'Meeting'),
    documented: docRows,
    hours: rows.filter(r => r.kind === 'Work'),
    touched: [...touched].map(pid => ({ at: noonOf(day), kind: 'Main Mission', text: projName.get(pid) || 'Project', meta: (touchedWhy.get(pid) || []).join(' · '), src: 'projects + project_tasks', fields: { project_id: pid } })),
  }

  return {
    rows, byKind, drills,
    stats: { held: held.length, documented, hours: Math.round(hours * 100) / 100, touched: touched.size, pursuits: Math.round(pursuitsH * 100) / 100, share: pursuitsH ? Math.round(hours / pursuitsH * 100) : 0, personal: Math.round(personalH * 100) / 100, exercise: Math.round(exerciseH * 100) / 100 },
    isToday,
  }
}

// ---- UI
function DayControl({ day, onPrev, onNext, canNext }) {
  const btn = (disabled) => ({
    width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent',
    color: disabled ? GRAY : INK, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1,
  })
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button onClick={onPrev} style={btn(false)} aria-label="Previous day"><ChevronLeft size={14} /></button>
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', color: INK2, minWidth: 220, textAlign: 'center' }}>{fmtDay(day)}</span>
      <button onClick={canNext ? onNext : undefined} style={btn(!canNext)} aria-label="Next day" disabled={!canNext}><ChevronRight size={14} /></button>
    </div>
  )
}

function TimelineRow({ r, last }) {
  const c = (KINDS[r.kind] || KINDS.Activity).color
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 14px 1fr', gap: 10, alignItems: 'start' }}>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: GRAY, letterSpacing: '0.6px', paddingTop: 5, textAlign: 'right' }}>{fmtTime(r.at)}</div>
      <div style={{ position: 'relative', alignSelf: 'stretch' }}>
        <div style={{ position: 'absolute', left: 6, top: 8, width: 6, height: 6, borderRadius: 99, background: c, boxShadow: `0 0 0 3px ${c}22` }} />
        {!last && <div style={{ position: 'absolute', left: 8.5, top: 18, bottom: -6, width: 1, background: PANEL_BORDER }} />}
      </div>
      <div style={{ paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <KindChip kind={r.kind} />
          {r.documented && (
            <span title="Documented in Granola" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GREEN, textTransform: 'uppercase' }}>
              <Check size={11} /> documented
            </span>
          )}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: INK, marginTop: 5 }}>{r.text}</div>
        {r.meta && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: GRAY, marginTop: 2 }}>{r.meta}</div>}
      </div>
    </div>
  )
}

// What a number is made of: the rows behind a stat or a kind, with the table
// each one came from and the fields that fed it. Info and QC in one place.
function RecordModal({ title, subtitle, items, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 250, cursor: 'pointer',
      background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 640, width: '100%', maxHeight: '82vh', overflowY: 'auto', cursor: 'default',
        background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>What feeds this</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XIcon size={14} />
          </button>
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.length === 0 && <div style={{ fontSize: 12.5, color: GRAY }}>No records behind this yet.</div>}
          {items.map((r, i) => (
            <div key={i} style={{ border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: GRAY, letterSpacing: '0.6px' }}>{fmtTime(r.at)}</span>
                <KindChip kind={r.kind} />
                {r.documented && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GREEN, textTransform: 'uppercase' }}><Check size={11} /> documented</span>}
                <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY, textTransform: 'uppercase' }}>{r.src || 'derived'}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: INK, marginTop: 6 }}>{r.text}</div>
              {r.meta && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: GRAY, marginTop: 2 }}>{r.meta}</div>}
              {r.fields && (
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 12, rowGap: 3 }}>
                  {Object.entries(r.fields).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', color: GRAY }}>{k}</span>
                      <span style={{ fontSize: 11.5, color: INK2, lineHeight: 1.45, wordBreak: 'break-word' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Label style={{ marginBottom: 0 }}>{items.length} record{items.length === 1 ? '' : 's'}</Label>
        </div>
      </div>
    </div>
  )
}

const Clickable = ({ onClick, children, title }) => (
  <div role="button" tabIndex={0} title={title || 'Show the records behind this'} onClick={onClick} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    style={{ cursor: 'pointer', borderRadius: 8, margin: '-4px -6px', padding: '4px 6px', transition: 'background 120ms' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
    {children}
  </div>
)

export default function ActivityPage() {
  const [day, setDay] = useState(chiToday)
  const [raw, setRaw] = useState(null)
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(null) // { title, subtitle, items }
  // Loading is derived: the raw we hold is stamped with the day it was fetched for.
  const loading = !raw || raw.forDay !== day

  useEffect(() => {
    let alive = true
    fetchDay(day).then(r => { if (alive) setRaw({ ...r, forDay: day, fetchedAt: Date.now() }) })
    return () => { alive = false }
  }, [day, tick])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const view = useMemo(() => raw && raw.forDay === day ? build(raw, day, raw.fetchedAt) : null, [raw, day])
  const today = chiToday()
  const canNext = day < today

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <Eyebrow>Activity</Eyebrow>
          <h1 style={S.h1}>The record</h1>
          <p style={S.sub}>what was done · in the order it was done</p>
        </div>
        <DayControl day={day} onPrev={() => setDay(d => shiftDay(d, -1))} onNext={() => setDay(d => shiftDay(d, 1))} canNext={canNext} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', gap: 16, alignItems: 'start' }}>
        <Panel title={view?.isToday ? 'Timeline · today' : `Timeline · ${day}`} style={{ marginBottom: 0 }}>
          {loading && !view ? (
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '18px 0' }}>Reading the pipes</div>
          ) : view && view.rows.length === 0 ? (
            <div style={{ padding: '26px 0 16px' }}>
              <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>Quiet so far.</div>
              <div style={{ fontSize: 12.5, color: GRAY, marginTop: 4 }}>The record fills as the day moves.</div>
            </div>
          ) : (
            <div style={{ paddingTop: 6 }}>
              {view.rows.map((r, i) => <TimelineRow key={i} r={r} last={i === view.rows.length - 1} />)}
            </div>
          )}
          <div style={S.source}>{view ? `${view.rows.length} entr${view.rows.length === 1 ? 'y' : 'ies'} · refreshes every minute` : ''}</div>
        </Panel>

        <div>
          <Panel title="Today" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gap: 18 }}>
              <Clickable onClick={() => view && setOpen({ title: 'Meetings held', subtitle: 'Calendar events that have started, all-day items excluded', items: view.drills.held })}>
                <Stat v={view ? view.stats.held : '·'} l="Meetings held" />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Meetings documented', subtitle: 'Granola notes matched to a held meeting by title', items: view.drills.documented })}>
                <Stat v={view ? view.stats.documented : '·'} l="Meetings documented" color={view && view.stats.documented > 0 ? GREEN : '#fff'} />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Hours on pursuits', subtitle: 'Third Horizon work (Harvest) + personal Side Mission clocks + exercise', items: view.drills.pursuits })}>
                <Stat v={view ? `${view.stats.pursuits}h` : '·'} l="Hours on pursuits" color={GOLD} />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Third Horizon hours', subtitle: `David's Harvest entries for the day · ${view ? view.stats.share : 0}% of pursuit time`, items: view.drills.thirdHorizon })}>
                <Stat v={view ? `${view.stats.hours}h` : '·'} l={view ? `Third Horizon · ${view.stats.share}% of pursuits` : 'Third Horizon'} color={GOLD} />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Main Missions touched', subtitle: 'Projects with a task closed, activated, or promoted today', items: view.drills.touched })}>
                <Stat v={view ? view.stats.touched : '·'} l="Main Missions touched" color={GOLD_BRIGHT} />
              </Clickable>
            </div>
          </Panel>
          <Panel title="By kind" style={{ marginBottom: 0 }}>
            {view && Object.keys(view.byKind).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.keys(KINDS).filter(k => view.byKind[k]).map(k => (
                  <Clickable key={k} onClick={() => setOpen({ title: k, subtitle: 'Every record of this kind in the day', items: view.rows.filter(r => r.kind === k) })}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <KindChip kind={k} />
                      <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff' }}>{view.byKind[k]}</span>
                    </div>
                  </Clickable>
                ))}
              </div>
            ) : (
              <Label style={{ marginBottom: 0 }}>Nothing yet</Label>
            )}
          </Panel>
        </div>
      </div>
      {open && <RecordModal title={open.title} subtitle={open.subtitle} items={open.items} onClose={() => setOpen(null)} />}
    </div>
  )
}
