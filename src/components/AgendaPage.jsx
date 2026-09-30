// MONITOR · AGENDA. The day's agenda for a selected day (default today,
// Chicago): the full calendar on the left, and on the right the Main Mission
// tasks (projects), Side Mission tasks (objectives), and open Maintenance.
// The calendar is also where meetings are run: each event carries a timer
// (Start / Stop, logged to Harvest through meeting_sessions), a "Notes
// captured" chip when a Granola note matched, and a Close out flow that files
// follow-ups as Side Missions (see river/MeetingCloseout.jsx).
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Circle, Wrench, Check, HelpCircle, Play, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { matchNotes, hoursBetween, upsertSession, logToHarvest } from '../lib/meetings'
import MeetingCloseout, { renderMarkdown, CloseoutBlock, friendlyError, fmtHours } from './river/MeetingCloseout'
import LoadoutPanel from './river/LoadoutPanel'
import RecurringPanel from './river/RecurringPanel'
import ReleasePanel from './river/ReleasePanel'
import AmbushPanel from './river/AmbushPanel'
import { equipTask, equipObjective } from '../lib/loadout'
import RelatedDrawer from './river/RelatedDrawer'
import {
  INK, INK2, GRAY, NAVY_DEEP, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, GREEN, RED, MONO, SERIF,
  S, Eyebrow, Label, Panel, RailSection, chiToday, fmtTime, weekday,
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
// Chip-buttons on an event row (timer, close out) share this hairline look.
const chipBtn = (fg = INK2, border = 'rgba(255,255,255,0.16)', extra = {}) => ({
  ...S.chip('transparent', fg), border: `1px solid ${border}`, cursor: 'pointer', fontFamily: MONO, fontWeight: 600,
  fontSize: 9.5, letterSpacing: '0.8px', padding: '2px 9px', lineHeight: '16px', ...extra,
})
const isRunning = (s) => !!(s?.started_at && !s?.stopped_at)
// Attendance for a timed event: closed out, attended (attended_at from the
// timer or Lumen, or a started timer), needs confirmation (ended with no
// trace), or nothing yet (upcoming or live).
const attendanceState = (event, session, nowMs, notes) => {
  if (!event || event.is_all_day) return null
  if (session?.closed_at) return 'closed'
  if (session?.attended_at || session?.started_at || notes) return 'attended'
  const en = event.end_at ? new Date(event.end_at).getTime() : null
  return en != null && en <= nowMs ? 'confirm' : null
}
const CONFIRM_TITLE = 'Not confirmed attended. Start the timer, close it out, or tell Lumen.'
const attendedChip = S.chip('rgba(67,211,146,0.16)', GREEN)
const confirmChip = { ...S.chip('rgba(230,181,79,0.16)', GOLD_BRIGHT), cursor: 'pointer' }
const fmtElapsed = (startedAt, nowMs) => {
  const m = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
}

function CalendarPanel({ events, loading, now, day, refresh }) {
  const nowMs = now.getTime()
  // Per-row error lines, expanded rows, in-flight writes, and the close-out target.
  const [errors, setErrors] = useState({})
  const [open, setOpen] = useState(() => new Set())
  const [busy, setBusy] = useState({})
  const [closing, setClosing] = useState(null)
  // A running timer ticks on its own 30s clock (the page's NOW clock is a minute).
  const [tickMs, setTickMs] = useState(() => Date.now())
  const anyRunning = !!events?.some(e => isRunning(e.session))
  useEffect(() => {
    if (!anyRunning) return
    const t = setInterval(() => setTickMs(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [anyRunning])
  const liveMs = Math.max(nowMs, tickMs)

  const setErr = (id, msg) => setErrors(prev => ({ ...prev, [id]: msg || undefined }))
  const setBusyFor = (id, v) => setBusy(prev => ({ ...prev, [id]: v }))
  const toggleOpen = (id) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  // Stop a running timer: write the span, then log it to Harvest (skipped
  // under ~1 minute). A Harvest failure leaves the session stopped but
  // unlogged and surfaces on the row; a session write failure throws.
  const stopSession = useCallback(async (e) => {
    const s = e.session
    if (!isRunning(s)) return
    const nowIso = new Date().toISOString()
    const hours = hoursBetween(s.started_at, nowIso)
    await upsertSession({ event_id: e.id, day, subject: e.subject || null, stopped_at: nowIso, hours })
    if (hours >= 0.02) {
      try {
        await logToHarvest(e.subject || '(no subject)', hours)
        await upsertSession({ event_id: e.id, harvest_logged: true })
      } catch (err) {
        setErr(e.id, `Stopped at ${fmtHours(hours)} but Harvest did not take it: ${friendlyError(err)}`)
      }
    }
  }, [day])

  const onStart = async (e) => {
    const other = events.find(x => x.id !== e.id && isRunning(x.session))
    if (other) {
      if (!window.confirm(`"${other.subject || '(no subject)'}" is still running. Stop it first?`)) return
    }
    setBusyFor(e.id, true); setErr(e.id, null)
    try {
      if (other) await stopSession(other)
      await upsertSession({ event_id: e.id, day, subject: e.subject || null, started_at: new Date().toISOString() })
    } catch (err) {
      setErr(e.id, friendlyError(err))
    } finally {
      setBusyFor(e.id, false); refresh()
    }
  }
  const onStop = async (e) => {
    setBusyFor(e.id, true); setErr(e.id, null)
    try { await stopSession(e) } catch (err) { setErr(e.id, friendlyError(err)) } finally { setBusyFor(e.id, false); refresh() }
  }
  // The modal stops the timer through the same path, then refreshes on its own.
  const onModalStop = useCallback(async (e) => { await stopSession(e); refresh() }, [stopSession, refresh])
  const onModalCancel = useCallback(() => setClosing(null), [])
  const onModalSaved = useCallback(() => { setClosing(null); refresh() }, [refresh])

  const closingEvent = closing ? (events || []).find(e => e.id === closing) : null
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
        const ses = e.session
        const running = isRunning(ses)
        const stopped = !!ses?.stopped_at
        const closed = !!ses?.closed_at
        const hasCloseout = !!(ses?.special_notes || (Array.isArray(ses?.follow_ups) && ses.follow_ups.length))
        const expandable = !!e.notes || hasCloseout
        const expanded = expandable && open.has(e.id)
        const canClose = !e.is_all_day && !closed && (past || stopped)
        const isBusy = !!busy[e.id]
        const err = errors[e.id]
        const hoursText = ses?.hours != null ? fmtHours(ses.hours) : null
        const attendance = attendanceState(e, ses, nowMs, e.notes)
        return (
          <div key={e.id || i} style={{
            display: 'grid', gridTemplateColumns: '84px 1fr', gap: 14, alignItems: 'flex-start',
            padding: '10px 0 10px 12px', marginLeft: -12,
            borderTop: i ? `1px solid ${PANEL_BORDER}` : 'none',
            borderLeft: `2px solid ${live ? GOLD : running ? GREEN : 'transparent'}`,
            opacity: past && !running ? 0.55 : 1,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: live ? GOLD_BRIGHT : INK2, letterSpacing: '0.4px', paddingTop: 3, lineHeight: 1.5 }}>
              {e.is_all_day ? 'All day' : fmtTime(e.start_at)}
              {!e.is_all_day && e.end_at && <div style={{ color: GRAY, fontSize: 10 }}>to {fmtTime(e.end_at)}</div>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  onClick={expandable ? () => toggleOpen(e.id) : undefined}
                  title={expandable ? (expanded ? 'Hide notes' : 'Show notes') : undefined}
                  style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3, cursor: expandable ? 'pointer' : 'default', minWidth: 0 }}
                >{e.subject || '(no subject)'}</span>
                {/* Attendance leads the chips: closed out or attended (green), or a Confirm prompt once the meeting has ended with no trace. */}
                {(attendance === 'closed' || attendance === 'attended') && (
                  <span style={attendedChip}>
                    <Check size={11} />{attendance === 'closed' ? `Closed out${hoursText ? ` · ${hoursText}` : ''}` : 'Attended'}
                  </span>
                )}
                {attendance === 'confirm' && (
                  <span onClick={() => setClosing(e.id)} title={CONFIRM_TITLE} style={confirmChip}>
                    <HelpCircle size={11} />Confirm
                  </span>
                )}
                {live && <span style={S.chip('rgba(230,181,79,0.18)', GOLD_BRIGHT)}>Now</span>}
                {e.notes && <span onClick={() => toggleOpen(e.id)} style={{ ...S.chip('rgba(169,201,232,0.14)', BLUE), cursor: 'pointer' }}>Notes captured</span>}

                {/* Timer + close-out controls sit at the right and wrap under the subject on narrow widths. */}
                {!e.is_all_day && (
                  <span style={{ display: 'inline-flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    {!ses?.started_at && !closed && (
                      <button disabled={isBusy} onClick={() => onStart(e)} style={chipBtn(INK2, 'rgba(255,255,255,0.16)', { opacity: isBusy ? 0.5 : 1 })}>⏱ Start</button>
                    )}
                    {running && (
                      <button disabled={isBusy} onClick={() => onStop(e)} style={chipBtn(GREEN, GREEN, { opacity: isBusy ? 0.5 : 1 })}>⏹ Stop · {fmtElapsed(ses.started_at, liveMs)}</button>
                    )}
                    {stopped && !closed && (
                      <span style={{ ...S.chip('transparent', GRAY), fontFamily: MONO, fontWeight: 600, fontSize: 9.5, letterSpacing: '0.8px', padding: '2px 4px' }}>
                        {ses.harvest_logged ? `✓ ${hoursText} logged` : `${hoursText} · not logged`}
                      </span>
                    )}
                    {canClose && (
                      <button disabled={isBusy} onClick={() => setClosing(e.id)} style={chipBtn(GOLD_BRIGHT, 'rgba(230,181,79,0.45)', { opacity: isBusy ? 0.5 : 1 })}>Close out</button>
                    )}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: GRAY, marginTop: 3 }}>
                {e.organizer ? e.organizer : 'No organizer'}{n > 0 ? ` · ${n} attendee${n === 1 ? '' : 's'}` : ''}
              </div>
              {err && <div style={{ fontFamily: MONO, fontSize: 10, color: RED, marginTop: 4, letterSpacing: '0.4px', lineHeight: 1.5 }}>{err}</div>}
              {expanded && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderLeft: `2px solid rgba(169,201,232,0.35)`, background: 'rgba(255,255,255,0.025)', borderRadius: '0 8px 8px 0' }}>
                  {e.notes && (
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY }}>GRANOLA · {e.notes.title}</div>
                      {renderMarkdown(e.notes.summary)}
                    </div>
                  )}
                  {hasCloseout && <div style={{ marginTop: e.notes ? 10 : 0 }}><CloseoutBlock session={ses} /></div>}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {closingEvent && (
        <MeetingCloseout event={closingEvent} day={day} onStop={onModalStop} onCancel={onModalCancel} onSaved={onModalSaved} />
      )}
    </Panel>
  )
}

// ---- Main Mission (project tasks) --------------------------------------------
// Priority: P1 overdue (most overdue first), P2 due today, P3 on the board
// (promoted), P4 due in the next two days. Click a task for its back story.
const CAP = 40
const priorityOf = (t, day) => {
  if (t.due_date && t.due_date < day) return 1
  if (t.due_date === day) return 2
  if (t.status === 'promoted') return 3
  return 4
}
const PRIORITY = { 1: { label: 'P1 · overdue', color: RED }, 2: { label: 'P2 · due today', color: GOLD }, 3: { label: 'P3 · on the board', color: GREEN }, 4: { label: 'P4 · coming up', color: GRAY } }

function fmtStamp(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
}

function TaskBackstory({ t, objective, day, onClose, onEquip, onRelated, busy, note }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const pr = PRIORITY[priorityOf(t, day)]
  const rows = [
    ['Main Mission', `${t.project?.name || 'Unassigned'}${t.project?.key ? ` · ${t.project.key}` : ''}`],
    ['Status', t.status + (objective ? ` · on the board as ${objective.state}` : '')],
    ['Due', t.due_date ? `${t.due_date}${t.due_date < day ? ' · overdue' : t.due_date === day ? ' · today' : ''}` : 'no date'],
    ['Captured', fmtStamp(t.created_at)],
    ['Last touched', fmtStamp(t.updated_at)],
    ['Source', t.source || null],
    ['Session', t.session_ref || null],
    ['On the board since', objective?.activated_at ? fmtStamp(objective.activated_at) : null],
  ].filter(([, v]) => v)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '100%', maxHeight: '82vh', overflowY: 'auto', background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Main Mission task</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{t.text}</div>
            <div style={{ marginTop: 8 }}><span style={{ ...S.chip('transparent', pr.color), border: `1px solid ${pr.color}55`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{pr.label}</span></div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 14, rowGap: 5 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', color: GRAY, textTransform: 'uppercase', paddingTop: 2 }}>{k}</span>
              <span style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>{v}</span>
            </div>
          ))}
        </div>
        {(t.notes || objective?.description) && (
          <div style={{ marginTop: 14 }}>
            <Label>Back story</Label>
            {t.notes && <div style={{ fontSize: 13, color: INK, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{t.notes}</div>}
            {objective?.description && <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: t.notes ? 8 : 0 }}>{objective.description}</div>}
          </div>
        )}
        {!t.notes && !objective?.description && <div style={{ fontSize: 12, color: GRAY, marginTop: 14 }}>No back story on this task yet. Notes added on the project page or by Lumen show here.</div>}
        {note && <div style={{ fontSize: 12, color: note.startsWith('Could') || note.startsWith('No room') ? RED : GREEN, marginTop: 12 }}>{note}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onRelated} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer' }}>Related: artifacts · sessions · files</button>
          <button onClick={onEquip} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 8, border: `1px solid ${GREEN}`, background: GREEN, color: '#0A1B2B', cursor: 'pointer' }}>
            <Play size={11} /> {objective?.state === 'active' ? 'Timer on' : 'Load and start timer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MainMissionPanel({ tasks, projects, objectives, loading, day, refresh, onNavigate }) {
  const [open, setOpen] = useState(null)
  const [related, setRelated] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  if (loading && !tasks) return <Panel title="Main Mission tasks" style={{ marginBottom: 0 }}><Empty>Loading…</Empty></Panel>
  const byId = new Map((projects || []).map(p => [p.id, p]))
  const objById = new Map((objectives || []).map(o => [o.id, o]))
  const rows = (tasks || []).map(t => ({ ...t, project: byId.get(t.project_id), pr: priorityOf(t, day) }))
  rows.sort((a, b) => {
    if (a.pr !== b.pr) return a.pr - b.pr
    const da = String(a.due_date || '9999'), db = String(b.due_date || '9999')
    if (da !== db) return da.localeCompare(db)
    return (a.project?.name || 'zzz').localeCompare(b.project?.name || 'zzz')
  })
  const shown = rows.slice(0, CAP)
  const more = rows.length - shown.length
  const counts = rows.reduce((m, t) => { m[t.pr] = (m[t.pr] || 0) + 1; return m }, {})
  const doEquip = async (t) => {
    setBusy(true); setNote(null)
    try {
      const r = await equipTask(t, t.project?.name)
      if (r.ok) { setNote(`Timer on: ${r.title}`); refresh && refresh() }
      else setNote(`No room on the loadout: ${r.reasons.join('; ')}`)
    } catch (e) { setNote(`Could not load it: ${e.message}`) }
    setBusy(false)
  }
  return (
    <Panel title="Main Mission tasks" style={{ marginBottom: 0 }}>
      {open && <TaskBackstory t={open} objective={objById.get(open.objective_id)} day={day} onClose={() => { setOpen(null); setNote(null) }} onEquip={() => doEquip(open)} onRelated={() => { setRelated({ id: open.objective_id || open.id, title: open.text, kind: 'Main Mission', project: open.project?.name || null, project_id: open.project_id, description: open.notes || null }); setOpen(null) }} busy={busy} note={note} />}
      {related && <RelatedDrawer item={related} onClose={() => setRelated(null)} onNavigate={onNavigate} />}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[1, 2, 3, 4].filter(p => counts[p]).map(p => (
            <span key={p} style={{ ...S.chip('transparent', PRIORITY[p].color), border: `1px solid ${PRIORITY[p].color}55`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{PRIORITY[p].label} · {counts[p]}</span>
          ))}
        </div>
      )}
      {rows.length === 0 && <Empty>Nothing due or overdue on the projects, nothing promoted to the board.</Empty>}
      {shown.map((t) => {
        const pr = PRIORITY[t.pr]
        const obj = objById.get(t.objective_id)
        return (
          <div key={t.id} onClick={() => setOpen(t)} title="Back story" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '6px 6px', margin: '0 -6px', borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <Circle size={13} style={{ color: pr.color, flexShrink: 0, marginTop: 3 }} />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: INK, minWidth: 0, flex: 1 }}>
              {t.text}
              <span style={{ display: 'block', marginTop: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1.2px', color: PERIWINKLE, textTransform: 'uppercase' }}>{t.project?.name || 'Unassigned'}</span>
                <span style={{ ...S.chip('transparent', pr.color), marginLeft: 8, fontSize: 8.5, padding: '1px 6px', border: `1px solid ${pr.color}44` }}>{pr.label}</span>
                {obj?.state === 'active' && <span style={{ ...S.chip('rgba(67,211,146,0.14)', GREEN), marginLeft: 6, fontSize: 8.5, padding: '1px 6px' }}>Loaded</span>}
                {t.status === 'blocked' && <span style={{ ...S.chip('rgba(232,131,111,0.16)', RED), marginLeft: 6, fontSize: 8.5, padding: '1px 6px' }}>Blocked</span>}
                <DueTag due={t.due_date} day={day} />
              </span>
            </span>
            <button onClick={(e) => { e.stopPropagation(); doEquip(t) }} title="Load it and start the timer" style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: obj?.state === 'active' ? GREEN : INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={11} />
            </button>
          </div>
        )
      })}
      {more > 0 && <div style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '1px' }}>+{more} more</div>}
      {note && !open && <div style={{ fontSize: 11.5, color: note.startsWith('Could') || note.startsWith('No room') ? RED : GREEN, marginTop: 8 }}>{note}</div>}
    </Panel>
  )
}

// ---- Side Mission (objectives) --------------------------------------------
function SideMissionPanel({ objectives, loading, day, refresh }) {
  const [note, setNote] = useState(null)
  if (loading && !objectives) return <Panel title="Side Missions" style={{ marginBottom: 0 }}><Empty>Loading…</Empty></Panel>
  const doEquip = async (o) => {
    setNote(null)
    try { const r = await equipObjective(o.id); setNote(r.ok ? `Timer on: ${r.title}` : `No room on the loadout: ${r.reasons.join('; ')}`); if (r.ok && refresh) refresh() }
    catch (e) { setNote(`Could not load it: ${e.message}`) }
  }
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
            <button onClick={() => doEquip(o)} title={active ? 'Timer on' : 'Load it and start the timer'} style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: active ? GREEN : INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto' }}>
              <Play size={11} />
            </button>
          </div>
        )
      })}
      {note && <div style={{ fontSize: 11.5, color: note.startsWith('Could') || note.startsWith('No room') ? RED : GREEN, marginTop: 8 }}>{note}</div>}
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
export default function AgendaPage({ onNavigate } = {}) {
  const [day, setDay] = useState(chiToday)
  const [events, setEvents] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [projects, setProjects] = useState([])
  const [objectives, setObjectives] = useState(null)
  const [maintenance, setMaintenance] = useState(null)
  // Granola notes and meeting sessions for the day (both tolerant: an error reads as empty).
  const [meetings, setMeetings] = useState([])
  const [sessions, setSessions] = useState([])
  // Bumped after any write so the day's data re-pulls without clearing the panels.
  const [refreshKey, setRefreshKey] = useState(0)
  const [allObjectives, setAllObjectives] = useState([])
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])
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
      let ev, pt, pj, ob, mt, gm, ms
      try {
        ;[ev, pt, pj, ob, mt, gm, ms] = await Promise.all([
          supabase.from('calendar_events').select('*').eq('day', d).eq('is_cancelled', false).order('start_at', { ascending: true }),
          supabase.from('project_tasks').select('id,text,status,due_date,project_id,objective_id,notes,source,session_ref,created_at,updated_at').in('status', ['open', 'promoted', 'blocked']),
          supabase.from('projects').select('id,name,key'),
          supabase.from('objectives').select('id,title,state,due_date,activated_at,is_emergency,deleted_at,follow_up_date,description,captured_at,tags').is('deleted_at', null).in('state', ['active', 'parked', 'waiting', 'follow_up']),
          supabase.from('maintenance_items').select('*').eq('status', 'open'),
          supabase.from('granola_meetings').select('id,title,meeting_date,attendees,summary').eq('meeting_date', d),
          // meeting_sessions may not exist yet; its error reads as empty.
          supabase.from('meeting_sessions').select('*').eq('day', d),
        ])
      } catch {
        ev = pt = pj = ob = mt = gm = ms = { error: true }
      }
      if (!alive) return
      setMeetings(gm.error ? [] : (gm.data || []))
      setSessions(ms.error ? [] : (ms.data || []))
      setEvents(ev.error ? [] : (ev.data || []))
      setProjects(pj.error ? [] : (pj.data || []))
      setTasks(pt.error ? [] : (pt.data || []).filter(t => t.status === 'promoted' || (t.due_date && t.due_date <= addDays(d, 2))))
      setAllObjectives(ob.error ? [] : (ob.data || []))
      setObjectives(ob.error ? [] : (ob.data || []).filter(o =>
        o.state === 'active' || (o.due_date && o.due_date <= d) || (o.follow_up_date && o.follow_up_date <= horizon)))
      // The maintenance table is new and may not exist yet; an error reads as empty.
      setMaintenance(mt.error ? [] : (mt.data || []))
    }
    pull()
    return () => { alive = false }
  }, [day, refreshKey])

  // Day change clears the lists so each panel shows its loading state.
  const go = (d) => { setEvents(null); setTasks(null); setObjectives(null); setMaintenance(null); setMeetings([]); setSessions([]); setDay(d) }

  // Each event carries its matched Granola note and its session row, if any.
  const sessionByEvent = new Map(sessions.map(s => [s.event_id, s]))
  const calEvents = events ? events.map(e => ({ ...e, notes: matchNotes(e, meetings), session: sessionByEvent.get(e.id) })) : events

  const today = chiToday()
  return (
    <div style={S.page}>
      <style>{`
        .agenda-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 12px; align-items: start; }
        .agenda-side { display: flex; flex-direction: column; gap: 12px; }
        @media (max-width: 1000px) { .agenda-grid { grid-template-columns: 1fr; } }
        @media (max-width: 900px) { .rail-section { grid-template-columns: 1fr !important; gap: 8px !important; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <Eyebrow>Board</Eyebrow>
          <h1 style={S.h1}><CalendarDays size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />{weekday(day)}&rsquo;s Board</h1>
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

      {day === today && (
        <>
          <RailSection title="Loadout">
            <LoadoutPanel onChange={refresh} refreshKey={refreshKey} onNavigate={onNavigate} />
          </RailSection>
          <RailSection title="Ambush">
            <AmbushPanel onChange={refresh} />
          </RailSection>
          <RailSection title="Recurring">
            <RecurringPanel onChange={refresh} />
          </RailSection>
          <RailSection title="Release">
            <ReleasePanel onChange={refresh} />
          </RailSection>
        </>
      )}

      <div className="agenda-grid">
        <div className="agenda-cal">
          <CalendarPanel events={calEvents} loading={loading} now={now} day={day} refresh={refresh} />
        </div>
        <div className="agenda-side">
          <MainMissionPanel tasks={tasks} projects={projects} objectives={allObjectives} loading={loading} day={day} refresh={refresh} onNavigate={onNavigate} />
          <SideMissionPanel objectives={objectives} loading={loading} day={day} refresh={refresh} />
          <MaintenancePanel items={maintenance} loading={loading} />
        </div>
      </div>
      <div style={{ ...S.source, marginTop: 14 }}>
        SOURCES · clocks · calendar_events · granola_meetings · meeting_sessions · project_tasks + projects · objectives · maintenance_items
      </div>
    </div>
  )
}
