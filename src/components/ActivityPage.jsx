// ACTIVITY. A discrete running record of what David did on a selected day,
// merged client-side from the pipes (emails sent, meetings held, Harvest hours,
// Side and Main Missions closed, daily logs, words said to Lumen), sorted by
// time, with a vertical TODAY dashboard beside it. Refreshes every 60s.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
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

// Meeting <-> Granola note match: same title, or two or more shared words.
const STOP = new Set(['the', 'and', 'with', 'for', 'of', 'a', 'an', 'to', 'on', 'in', 'at', 'call', 'meeting', 'sync', 're', 'w', 'x', 'vs'])
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w))
const titlesMatch = (a, b) => {
  const A = String(a || '').trim().toLowerCase(), B = String(b || '').trim().toLowerCase()
  if (!A || !B) return false
  if (A === B) return true
  const wb = new Set(words(B))
  return words(A).filter(w => wb.has(w)).length >= 2
}

const truncate = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }

async function fetchDay(day) {
  const { lo, hi } = windowFor(day)
  const q = (p) => p.then(r => { if (r.error) console.warn('activity fetch', r.error.message); return Array.isArray(r.data) ? r.data : [] })
  const [emails, calendar, granola, time, objectives, doneTasks, promotedTasks, projects, logs, lumen] = await Promise.all([
    q(supabase.from('emails').select('subject,to_names,received_at,day').eq('folder', 'sent').eq('day', day).order('received_at', { ascending: true })),
    q(supabase.from('calendar_events').select('subject,start_at,end_at,attendees,day,is_cancelled').eq('day', day).eq('is_cancelled', false).order('start_at', { ascending: true })),
    q(supabase.from('granola_meetings').select('title,meeting_date,attendees,summary').eq('meeting_date', day)),
    q(supabase.from('time_entries').select('person,client,project,task,hours,notes,spent_date').eq('spent_date', day).ilike('person', '%David%')),
    q(supabase.from('objectives').select('id,title,released_at,released_kind,activated_at,captured_at,deleted_at').is('deleted_at', null).or(`released_at.gte.${lo},activated_at.gte.${lo},captured_at.gte.${lo}`)),
    q(supabase.from('project_tasks').select('id,text,status,released_at,project_id').eq('status', 'done').gte('released_at', lo).lt('released_at', hi)),
    q(supabase.from('project_tasks').select('id,project_id,objective_id').not('objective_id', 'is', null)),
    q(supabase.from('projects').select('id,name')),
    q(supabase.from('daily_logs').select('day,kind,what,value,note,at').eq('day', day)),
    q(supabase.from('lumen_messages').select('at,channel,direction,kind,body').eq('direction', 'in').in('channel', ['whatsapp', 'voice']).gte('at', lo).lt('at', hi)),
  ])
  return { emails, calendar, granola, time, objectives, doneTasks, promotedTasks, projects, logs, lumen }
}

function build(raw, day, nowMs) {
  const rows = []
  const today = chiToday()
  const isToday = day === today
  const isPast = day < today

  // Emails sent
  for (const e of raw.emails) {
    const to = Array.isArray(e.to_names) ? e.to_names.filter(Boolean).join(', ') : ''
    rows.push({ at: e.received_at || noonOf(day), kind: 'Email', text: `Sent: ${e.subject || '(no subject)'}${to ? ` → ${to}` : ''}` })
  }

  // Meetings held (started so far), with a Granola match as "documented"
  const held = raw.calendar.filter(c => c.start_at && (isPast || new Date(c.start_at).getTime() <= nowMs))
  let documented = 0
  for (const c of held) {
    const doc = raw.granola.some(g => titlesMatch(g.title, c.subject))
    if (doc) documented += 1
    const n = Array.isArray(c.attendees) ? c.attendees.length : 0
    rows.push({ at: c.start_at, kind: 'Meeting', text: c.subject || '(untitled)', meta: n ? `${n} attendee${n === 1 ? '' : 's'}` : null, documented: doc })
  }

  // Work logged (Harvest, David's entries)
  let hours = 0
  for (const t of raw.time) {
    const h = Number(t.hours) || 0
    hours += h
    const parts = [t.project, t.task].filter(Boolean)
    rows.push({ at: noonOf(day), kind: 'Work', text: `${parts.join(' · ')}${parts.length ? ' · ' : ''}${h}h`, meta: t.notes ? truncate(t.notes, 160) : (t.client || null) })
  }

  // Side Missions released today
  for (const o of raw.objectives) {
    if (onDay(o.released_at, day)) rows.push({ at: o.released_at, kind: 'Side Mission', text: `Released: ${o.title}`, meta: o.released_kind && o.released_kind !== 'done' ? o.released_kind : null })
  }

  // Main Mission tasks done today
  const touched = new Set()
  const projName = new Map(raw.projects.map(p => [p.id, p.name]))
  for (const t of raw.doneTasks) {
    if (!onDay(t.released_at, day)) continue
    const pname = projName.get(t.project_id) || 'Project'
    if (t.project_id) touched.add(t.project_id)
    rows.push({ at: t.released_at, kind: 'Main Mission', text: `${pname}: ${t.text}` })
  }
  // Promotions and activations today, via objectives linked from project_tasks
  const objById = new Map(raw.objectives.map(o => [o.id, o]))
  for (const t of raw.promotedTasks) {
    const o = objById.get(t.objective_id)
    if (!o || !t.project_id) continue
    if (onDay(o.activated_at, day) || onDay(o.captured_at, day)) touched.add(t.project_id)
  }

  // Thoughts and logs
  for (const l of raw.logs) {
    const kind = LOG_KIND_LABEL[l.kind] || 'Activity'
    const text = [l.what, l.note].filter(Boolean).join(' · ') || (l.value != null ? String(l.value) : '')
    rows.push({ at: l.at || noonOf(day), kind, text, meta: l.value != null && (l.what || l.note) ? String(l.value) : null })
  }

  // Said to Lumen
  for (const m of raw.lumen) {
    if (!onDay(m.at, day)) continue
    rows.push({ at: m.at, kind: 'Said to Lumen', text: truncate(m.body, 140), meta: m.channel })
  }

  rows.sort((a, b) => new Date(a.at) - new Date(b.at))
  const byKind = {}
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1

  return {
    rows, byKind,
    stats: { held: held.length, documented, hours: Math.round(hours * 100) / 100, touched: touched.size },
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

export default function ActivityPage() {
  const [day, setDay] = useState(chiToday)
  const [raw, setRaw] = useState(null)
  const [tick, setTick] = useState(0)
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
              <Stat v={view ? view.stats.held : '·'} l="Meetings held" />
              <Stat v={view ? view.stats.documented : '·'} l="Meetings documented" color={view && view.stats.documented > 0 ? GREEN : '#fff'} />
              <Stat v={view ? `${view.stats.hours}h` : '·'} l="Hours logged" color={GOLD} />
              <Stat v={view ? view.stats.touched : '·'} l="Main Missions touched" color={GOLD_BRIGHT} />
            </div>
          </Panel>
          <Panel title="By kind" style={{ marginBottom: 0 }}>
            {view && Object.keys(view.byKind).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.keys(KINDS).filter(k => view.byKind[k]).map(k => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <KindChip kind={k} />
                    <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff' }}>{view.byKind[k]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Label style={{ marginBottom: 0 }}>Nothing yet</Label>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
