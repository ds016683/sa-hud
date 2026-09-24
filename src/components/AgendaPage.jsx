// MONITOR · AGENDA. The day's agenda for a selected day (default today,
// Chicago): the full calendar on the left, and on the right the Main Mission
// tasks (projects), Side Mission tasks (objectives), and open Maintenance.
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Circle, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INK, INK2, GRAY, NAVY_DEEP, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, GREEN, RED, MONO, SERIF,
  S, Eyebrow, Panel, chiToday, fmtTime, weekday,
} from './river/canon'

const fmtFullDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''
const fmtShortDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const addDays = (day, n) => {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
const attendeeCount = (a) => {
  if (a == null) return 0
  if (Array.isArray(a)) return a.length
  if (typeof a === 'string') {
    if (/^\s*\[/.test(a)) { try { const p = JSON.parse(a); if (Array.isArray(p)) return p.length } catch { /* fall through */ } }
    return a.split(/[;,]/).filter(s => s.trim()).length
  }
  if (typeof a === 'object') return Object.keys(a).length
  return 0
}

const CATEGORY_TONE = {
  content: ['rgba(169,201,232,0.14)', BLUE],
  hygiene: ['rgba(67,211,146,0.14)', GREEN],
  exercise: ['rgba(230,181,79,0.16)', GOLD],
  other: ['rgba(255,255,255,0.08)', GRAY],
}

const navBtn = (extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  height: 30, minWidth: 30, padding: '0 10px', borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.16)', background: 'transparent',
  color: 'rgba(234,241,248,0.7)', cursor: 'pointer', fontFamily: MONO,
  fontSize: 10.5, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600,
  ...extra,
})

const Empty = ({ children }) => <div style={{ fontSize: 13, color: GRAY, lineHeight: 1.6 }}>{children}</div>
const DueTag = ({ due, day, prefix = 'Due' }) => {
  if (!due) return null
  const late = due < day
  return (
    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: late ? RED : GRAY, marginLeft: 8, whiteSpace: 'nowrap' }}>
      {prefix} {fmtShortDay(due)}{late ? ' · overdue' : due === day ? ' · today' : ''}
    </span>
  )
}

// ---- Calendar -------------------------------------------------------------
function CalendarPanel({ events, loading, now }) {
  const nowMs = now.getTime()
  return (
    <Panel title="Full daily calendar" style={{ marginBottom: 0, height: '100%' }}>
      {loading && !events && <Empty>Loading…</Empty>}
      {events && events.length === 0 && <Empty>Open day. Nothing on the calendar.</Empty>}
      {events && events.map((e, i) => {
        const s = e.start_at ? new Date(e.start_at).getTime() : null
        const en = e.end_at ? new Date(e.end_at).getTime() : null
        const live = s != null && en != null && s <= nowMs && nowMs < en
        const past = en != null && en <= nowMs
        const n = attendeeCount(e.attendees)
        return (
          <div key={e.id || i} style={{
            display: 'grid', gridTemplateColumns: '84px 1fr', gap: 14, alignItems: 'flex-start',
            padding: '10px 0 10px 12px', marginLeft: -12,
            borderTop: i ? `1px solid ${PANEL_BORDER}` : 'none',
            borderLeft: `2px solid ${live ? GOLD : 'transparent'}`,
            opacity: past ? 0.55 : 1,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: live ? GOLD_BRIGHT : INK2, letterSpacing: '0.4px', paddingTop: 3, lineHeight: 1.5 }}>
              {e.is_all_day ? 'All day' : fmtTime(e.start_at)}
              {!e.is_all_day && e.end_at && <div style={{ color: GRAY, fontSize: 10 }}>to {fmtTime(e.end_at)}</div>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{e.subject || '(no subject)'}</span>
                {live && <span style={S.chip('rgba(230,181,79,0.18)', GOLD_BRIGHT)}>Now</span>}
              </div>
              <div style={{ fontSize: 11.5, color: GRAY, marginTop: 3 }}>
                {e.organizer ? e.organizer : 'No organizer'}{n > 0 ? ` · ${n} attendee${n === 1 ? '' : 's'}` : ''}
              </div>
            </div>
          </div>
        )
      })}
    </Panel>
  )
}

// ---- Main Mission (project tasks) --------------------------------------------
const CAP = 40
function MainMissionPanel({ tasks, projects, loading, day }) {
  if (loading && !tasks) return <Panel title="Main Mission tasks" style={{ marginBottom: 0 }}><Empty>Loading…</Empty></Panel>
  const byId = new Map((projects || []).map(p => [p.id, p]))
  const rows = (tasks || []).map(t => ({ ...t, project: byId.get(t.project_id) }))
  rows.sort((a, b) => {
    const pa = (a.project?.name || 'zzz').toLowerCase(), pb = (b.project?.name || 'zzz').toLowerCase()
    if (pa !== pb) return pa < pb ? -1 : 1
    return String(a.due_date || '9999').localeCompare(String(b.due_date || '9999'))
  })
  const shown = rows.slice(0, CAP)
  const more = rows.length - shown.length
  const groups = []
  for (const t of shown) {
    const name = t.project?.name || 'Unassigned'
    const g = groups[groups.length - 1]
    if (g && g.name === name) g.items.push(t); else groups.push({ name, key: t.project?.key, items: [t] })
  }
  return (
    <Panel title="Main Mission tasks" style={{ marginBottom: 0 }}>
      {rows.length === 0 && <Empty>Nothing due on the projects today.</Empty>}
      {groups.map((g) => (
        <div key={g.name} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{g.name}</span>
            {g.key && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.2px', color: PERIWINKLE, textTransform: 'uppercase' }}>{g.key}</span>}
          </div>
          {g.items.map((t) => {
            const late = t.due_date && t.due_date < day
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '4px 0' }}>
                <Circle size={13} style={{ color: late ? RED : t.status === 'blocked' ? RED : 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 13, lineHeight: 1.5, color: INK, minWidth: 0 }}>
                  {t.text}
                  {t.status === 'promoted' && <span style={{ ...S.chip('rgba(230,181,79,0.16)', GOLD), marginLeft: 8, fontSize: 8.5, padding: '1px 6px' }}>Promoted</span>}
                  {t.status === 'blocked' && <span style={{ ...S.chip('rgba(232,131,111,0.16)', RED), marginLeft: 8, fontSize: 8.5, padding: '1px 6px' }}>Blocked</span>}
                  <DueTag due={t.due_date} day={day} />
                </span>
              </div>
            )
          })}
        </div>
      ))}
      {more > 0 && <div style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '1px' }}>+{more} more</div>}
    </Panel>
  )
}

// ---- Side Mission (objectives) --------------------------------------------
function SideMissionPanel({ objectives, loading, day }) {
  if (loading && !objectives) return <Panel title="Side Missions" style={{ marginBottom: 0 }}><Empty>Loading…</Empty></Panel>
  const rows = [...(objectives || [])].sort((a, b) => {
    const aa = a.state === 'active' ? 0 : 1, ba = b.state === 'active' ? 0 : 1
    if (aa !== ba) return aa - ba
    if (aa === 0) return String(a.activated_at || '').localeCompare(String(b.activated_at || ''))
    return String(a.due_date || a.follow_up_date || '9999').localeCompare(String(b.due_date || b.follow_up_date || '9999'))
  })
  return (
    <Panel title="Side Missions" style={{ marginBottom: 0 }}>
      {rows.length === 0 && <Empty>No objectives calling today.</Empty>}
      {rows.map((o) => {
        const active = o.state === 'active'
        return (
          <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '5px 0' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6,
              background: active ? GREEN : 'transparent',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.3)',
              boxShadow: active ? '0 0 8px rgba(67,211,146,0.5)' : 'none',
            }} />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: INK, minWidth: 0 }}>
              {o.title}
              {o.is_emergency && <span style={{ ...S.chip('rgba(232,131,111,0.18)', RED), marginLeft: 8, fontSize: 8.5, padding: '1px 6px' }}>Emergency</span>}
              {!active && (
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, marginLeft: 8 }}>
                  {o.state === 'follow_up' ? 'follow up' : o.state}
                </span>
              )}
              {o.due_date && <DueTag due={o.due_date} day={day} />}
              {!o.due_date && o.follow_up_date && <DueTag due={o.follow_up_date} day={day} prefix="Follow up" />}
            </span>
          </div>
        )
      })}
    </Panel>
  )
}

// ---- Maintenance ------------------------------------------------------------
function MaintenancePanel({ items, loading }) {
  if (loading && !items) return <Panel title="Open Maintenance" style={{ marginBottom: 0 }}><Empty>Loading…</Empty></Panel>
  return (
    <Panel title="Open Maintenance" style={{ marginBottom: 0 }}>
      {(!items || items.length === 0) && <Empty>No maintenance items yet. They arrive downstream.</Empty>}
      {(items || []).map((m) => {
        const [bg, fg] = CATEGORY_TONE[m.category] || CATEGORY_TONE.other
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '5px 0' }}>
            <Wrench size={12} style={{ color: GRAY, flexShrink: 0, marginTop: 4 }} />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: INK, minWidth: 0 }}>
              {m.title}
              {m.category && <span style={{ ...S.chip(bg, fg), marginLeft: 8, fontSize: 8.5, padding: '1px 6px' }}>{m.category}</span>}
              {m.cadence && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, marginLeft: 8 }}>{m.cadence}</span>}
            </span>
          </div>
        )
      })}
    </Panel>
  )
}

// =============================================================================
export default function AgendaPage() {
  const [day, setDay] = useState(chiToday)
  const [events, setEvents] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [projects, setProjects] = useState([])
  const [objectives, setObjectives] = useState(null)
  const [maintenance, setMaintenance] = useState(null)
  const [now, setNow] = useState(() => new Date())
  // Loading is derived: a null list means the fetch for this day is in flight.
  const loading = events === null || tasks === null || objectives === null || maintenance === null

  // The NOW highlight rides a minute clock.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Refresh on day change. The pull is guarded so a stale day never lands
  // after a faster one.
  useEffect(() => {
    let alive = true
    const d = day
    const horizon = addDays(d, 2)
    const pull = async () => {
      let ev, pt, pj, ob, mt
      try {
        ;[ev, pt, pj, ob, mt] = await Promise.all([
          supabase.from('calendar_events').select('*').eq('day', d).eq('is_cancelled', false).order('start_at', { ascending: true }),
          supabase.from('project_tasks').select('id,text,status,due_date,project_id,objective_id').in('status', ['open', 'promoted', 'blocked']),
          supabase.from('projects').select('id,name,key'),
          supabase.from('objectives').select('id,title,state,due_date,activated_at,is_emergency,deleted_at,follow_up_date').is('deleted_at', null).in('state', ['active', 'parked', 'waiting', 'follow_up']),
          supabase.from('maintenance_items').select('*').eq('status', 'open'),
        ])
      } catch {
        ev = pt = pj = ob = mt = { error: true }
      }
      if (!alive) return
      setEvents(ev.error ? [] : (ev.data || []))
      setProjects(pj.error ? [] : (pj.data || []))
      setTasks(pt.error ? [] : (pt.data || []).filter(t => t.status === 'promoted' || (t.due_date && t.due_date <= d)))
      setObjectives(ob.error ? [] : (ob.data || []).filter(o =>
        o.state === 'active' || (o.due_date && o.due_date <= d) || (o.follow_up_date && o.follow_up_date <= horizon)))
      // The maintenance table is new and may not exist yet; an error reads as empty.
      setMaintenance(mt.error ? [] : (mt.data || []))
    }
    pull()
    return () => { alive = false }
  }, [day])

  // Day change clears the lists so each panel shows its loading state.
  const go = (d) => { setEvents(null); setTasks(null); setObjectives(null); setMaintenance(null); setDay(d) }

  const today = chiToday()
  return (
    <div style={S.page}>
      <style>{`
        .agenda-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 12px; align-items: start; }
        .agenda-side { display: flex; flex-direction: column; gap: 12px; }
        @media (max-width: 1000px) { .agenda-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <Eyebrow>Agenda</Eyebrow>
          <h1 style={S.h1}><CalendarDays size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />{weekday(day)}&rsquo;s Agenda</h1>
          <div style={S.sub}>{fmtFullDay(day)}{day === today ? ' · today' : ''} · Chicago</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => go(addDays(day, -1))} title="Previous day" style={navBtn({ padding: 0 })}><ChevronLeft size={14} /></button>
          <button onClick={() => go(today)} disabled={day === today} style={navBtn({
            background: day === today ? BLUE : 'transparent', color: day === today ? NAVY_DEEP : 'rgba(234,241,248,0.7)',
            borderColor: day === today ? BLUE : 'rgba(255,255,255,0.16)', cursor: day === today ? 'default' : 'pointer',
          })}>Today</button>
          <button onClick={() => go(addDays(day, 1))} title="Next day" style={navBtn({ padding: 0 })}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="agenda-grid">
        <div className="agenda-cal">
          <CalendarPanel events={events} loading={loading} now={now} />
        </div>
        <div className="agenda-side">
          <MainMissionPanel tasks={tasks} projects={projects} loading={loading} day={day} />
          <SideMissionPanel objectives={objectives} loading={loading} day={day} />
          <MaintenancePanel items={maintenance} loading={loading} />
        </div>
      </div>
      <div style={{ ...S.source, marginTop: 14 }}>
        SOURCES · calendar_events · project_tasks + projects · objectives · maintenance_items
      </div>
    </div>
  )
}
