// MONITOR · AGENDA. The day's agenda for a selected day (default today,
// Chicago): the full calendar on the left, and on the right the Main Mission
// tasks (projects), Side Mission tasks (objectives), and open Maintenance.
// The calendar is also where meetings are run: each event carries a timer
// (Start / Stop, logged to Harvest through meeting_sessions), a "Notes
// captured" chip when a Granola note matched, and a Close out flow that files
// follow-ups as Side Missions (see river/MeetingCloseout.jsx).
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Check, HelpCircle, Play, Pause, X as XIcon } from 'lucide-react'
import { supabase, reportSoft } from '../lib/supabase'
import { matchNotes, hoursBetween, upsertSession, logToHarvest } from '../lib/meetings'
import MeetingCloseout, { renderMarkdown, CloseoutBlock, friendlyError, fmtHours } from './river/MeetingCloseout'
import LoadoutPanel from './river/LoadoutPanel'
import RecurringPanel from './river/RecurringPanel'
import ReleasePanel from './river/ReleasePanel'
import ProtocolsPanel from './river/MorningProtocol'
import { fetchLoadout, startWithRoom, holster, sizeOf, SIZES } from '../lib/loadout'
import ItemDetail from './river/ItemDetail'
import {
  INK, INK2, GRAY, NAVY_DEEP, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, PURPLE, GREEN, RED, MONO, SERIF,
  S, Eyebrow, Label, Panel, chiToday, fmtTime, weekday, alpha } from './river/canon'
import { hudPrompt, hudConfirm } from '../lib/dialog'

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
// Cancel (David 10/21): "If a meeting was canceled, I get credit for the meeting
// unless I am the one that canceled it." The session carries the marker in
// special_notes ("Canceled by them: ..." / "Canceled by me: ..."); the River reads it.
export const cancelledBy = (session) => { const m = String(session?.special_notes || '').match(/^Canceled by (them|me)/i); return m ? m[1].toLowerCase() : null }
const attendanceState = (event, session, nowMs, notes) => {
  if (!event || event.is_all_day) return null
  const cb = cancelledBy(session)
  if (cb) return cb === 'me' ? 'cancelled-me' : 'cancelled-them'
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

function CalendarPanel({events, loading, now, day, refresh, onOpenEvent }) {
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
      if (!await hudConfirm(`"${other.subject || '(no subject)'}" is still running. Stop it first?`)) return
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
  const onCancel = async (e) => {
    const mine = await hudConfirm(`Was it you who canceled "${e.subject || '(no subject)'}"?\n\nOK = I canceled it (no credit). Cancel = they canceled it (I get credit for the meeting).`)
    const reason = await hudPrompt(`Why was "${e.subject || '(no subject)'}" canceled?`, '')
    if (reason === null) return
    setBusyFor(e.id, true); setErr(e.id, null)
    try {
      const now = new Date().toISOString()
      const line = `Canceled by ${mine ? 'me' : 'them'}: ${reason.trim() || '(no reason given)'}`
      await upsertSession({ event_id: e.id, day, subject: e.subject || null, closed_at: now, attended_at: mine ? null : now, special_notes: [line, e.session?.special_notes].filter(Boolean).join('\n\n') })
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
    <Panel heading="Full daily calendar" style={{ marginBottom: 0, height: '100%' }}>
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
                >{e.subject || '(no subject)'}</span>{onOpenEvent && <button onClick={() => onOpenEvent(e)} title="Open this meeting: overview, notes, links" style={{ marginLeft: 8, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: GRAY, cursor: 'pointer' }}>open</button>}
                {/* Attendance leads the chips: closed out or attended (green), or a Confirm prompt once the meeting has ended with no trace. */}
                {(attendance === 'closed' || attendance === 'attended') && (
                  <span style={attendedChip}>
                    <Check size={11} />{attendance === 'closed' ? `Closed out${hoursText ? ` · ${hoursText}` : ''}` : 'Attended'}
                  </span>
                )}
                {attendance === 'cancelled-them' && <span style={attendedChip} title="Canceled by the other side; credited as attended"><Check size={11} />Canceled · credited</span>}
                {attendance === 'cancelled-me' && <span style={S.chip('rgba(234,241,248,0.08)', GRAY)} title="Canceled by David; no credit">Canceled · by me</span>}
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
                      <button disabled={isBusy} onClick={() => onCancel(e)} title="The meeting was canceled: say by whom and why. Canceled by them credits the meeting; canceled by you does not." style={chipBtn(GRAY, 'rgba(255,255,255,0.12)', { opacity: isBusy ? 0.5 : 1 })}>✕ Cancel</button>
                    )}
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
// ---- Today's Work Priorities, and the queue under it (David, 10/14) -------
// The priorities are the plan Lumen built in the Morning Protocol (what David
// set out to do today), with Start and Stop. Under them, the rest: every Main
// Mission task and Side Mission calling, names only, most overdue first, each
// with its descriptor. Loaded items live on the Loadout above, not here.
const stripNum = (t) => String(t || '').replace(/^\s*\d+\s*[·.:)-]\s*/, '')
const daysLate = (due, day) => due ? Math.round((new Date(day + 'T12:00:00') - new Date(due + 'T12:00:00')) / 864e5) : null
const whenText = (due, day) => { const n = daysLate(due, day); if (n === null) return null; if (n > 0) return `${n} day${n === 1 ? '' : 's'} overdue`; if (n === 0) return 'due today'; return `due ${fmtShortDay(due)}` }
const Tag = ({ color, children }) => <span style={{ ...S.chip('transparent', color), border: `1px solid ${alpha(color, 33)}`, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px', padding: '1px 7px', whiteSpace: 'nowrap' }}>{children}</span>

function WorkPanel({ tasks, projects, objectives, loading, day, refresh, refreshKey, onNavigate, isToday }) {
  const [plan, setPlan] = useState(undefined)
  const [L, setL] = useState(null)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    let on = true
    const pull = async () => {
      try {
        const lo = await fetchLoadout(); if (on) setL(lo)
        if (!isToday) { if (on) setPlan(null); return }
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { if (on) setPlan(null); return }
        const r = await fetch(`/api/lumen-plan?day=${day}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
        const j = r.ok ? await r.json() : null
        if (on) setPlan(j?.plan || null)
      } catch { if (on) setPlan(null) }
    }
    pull()
    return () => { on = false }
  }, [day, refreshKey, isToday])
  const board = L?.board || []
  const byProj = new Map((projects || []).map(p => [p.id, p]))
  const prios = plan?.priorities || []
  const prioIds = new Set(prios.flatMap(p => p.ref ? [String(p.ref.id)] : []))
  const loadedItem = (ref) => ref ? (board.find(b => String(b.id) === String(ref.id)) || board.find(b => ref.type === 'task' && String(b.task_id) === String(ref.id)) || board.find(b => ref.type === 'objective' && b.title === String(ref.id)) || null) : null
  const tagOf = (row) => row.kind === 'Main Mission' ? { text: `Main Mission · ${row.project || 'unassigned'}`, color: PURPLE } : { text: `Side Mission · ${SIZES[row.size]?.label || 'Bounty'}`, color: SIZES[row.size]?.color || GOLD }
  const start = async (ref, title, row) => {
    setBusy(true); setNote(null)
    try {
      const r = ref.type === 'task' ? await startWithRoom({ type: 'task', id: row?.raw?.objective_id || ref.id, task: row?.raw || (tasks || []).find(t => t.id === ref.id) }, { projectName: row?.project }) : await startWithRoom({ type: 'objective', id: ref.id })
      if (!r.ok) { setNote(`Will not fit: ${(r.reasons || []).join(' · ')}`); reportSoft(`start ${title}`, `refused: ${(r.reasons || []).join(' · ')}`); return }
      setNote(`${title} started${r.stashed?.length ? ` · stashed ${r.stashed.join(', ')}` : ''}`); refresh && refresh()
    } catch (e) { setNote(`Could not start: ${e.message}`); reportSoft(`start ${title}`, e) } finally { setBusy(false) }
  }
  const stop = async (id, title) => { setBusy(true); try { await holster(id); setNote(`${title} holstered`); refresh && refresh() } catch (e) { setNote(`Could not stop: ${e.message}`) } finally { setBusy(false) } }
  const StartStop = ({ refx, title, row }) => { const it = loadedItem(refx); return it?.equipped
    ? <button disabled={busy} onClick={() => stop(it.id, title)} title="Stop the clock" style={chipBtn(GREEN, GREEN, { background: GREEN, color: 'var(--hud-on-accent)' })}><Pause size={10} /> Stop</button>
    : <button disabled={busy} onClick={() => start(refx, title, row)} title="Load it and start the clock" style={chipBtn(GREEN, `${alpha(GREEN, 40)}`)}><Play size={10} /> Start</button> }
  // The queue: everything else calling, most overdue first.
  const activeObj = new Set((objectives || []).filter(o => o.state === 'active').map(o => o.id))
  const queue = [
    ...(tasks || []).filter(t => !prioIds.has(String(t.id)) && !(t.objective_id && activeObj.has(t.objective_id))).map(t => ({ id: `t:${t.id}`, kind: 'Main Mission', title: stripNum(t.text), project: byProj.get(t.project_id)?.name || null, due: t.due_date || null, ref: { type: 'task', id: t.id }, raw: t, blocked: t.status === 'blocked' })),
    ...(objectives || []).filter(o => o.state !== 'active' && !(o.tags || []).includes('stashed') && !prioIds.has(String(o.id))).map(o => ({ id: `o:${o.id}`, kind: (o.tags || []).includes('impromptu') ? 'Ad Hoc' : 'Side Mission', size: sizeOf(o), title: o.title, project: null, due: o.due_date || o.follow_up_date || null, ref: { type: 'objective', id: o.id }, raw: o, state: o.state })),
  ].sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')))
  const shown = showAll ? queue : queue.slice(0, 10)
  const openRow = (row) => row.kind === 'Main Mission'
    ? setOpen({ id: row.raw.objective_id || row.raw.id, objective_id: row.raw.objective_id || null, task_id: row.raw.id, kind: 'Main Mission', title: row.title, project: row.project, project_id: row.raw.project_id, description: row.raw.notes })
    : setOpen({ id: row.raw.id, objective_id: row.raw.id, kind: row.kind, title: row.raw.title, description: row.raw.description, tags: row.raw.tags, size: row.size, objective: row.raw })
  if (loading && !tasks) return <Panel heading="Today's Work Priorities" style={{ marginBottom: 0 }}><Empty>Loading…</Empty></Panel>
  return (
    <Panel heading="Today's Work Priorities" style={{ marginBottom: 0 }}>
      {open && <ItemDetail item={open} onClose={() => { setOpen(null); refresh && refresh() }} onNavigate={onNavigate} onChange={refresh} />}
      {note && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', color: note.startsWith('Could') || note.startsWith('Will not') ? RED : GREEN, marginBottom: 10 }}>{note}</div>}
      {plan === undefined && isToday && <Empty>Reading today's plan…</Empty>}
      {plan === null && isToday && <Empty>No plan yet. The Morning Protocol builds it from your answers, the calendar, and what you picked.</Empty>}
      {prios.map(p => { const tag = p.ref?.type === 'task' ? { text: 'Main Mission', color: PURPLE } : { text: `Side Mission · ${SIZES[p.size]?.label || 'Bounty'}`, color: SIZES[p.size]?.color || GOLD }; const it = loadedItem(p.ref); return (
        <div key={`${p.rank}-${p.title}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
          <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: GOLD, width: 18, flexShrink: 0, lineHeight: 1.1 }}>{p.rank}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.4 }}>{p.title}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
              <Tag color={tag.color}>{tag.text}</Tag>
              {p.block && <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, letterSpacing: '0.6px' }}>at {p.block}</span>}
              {it && <Tag color={GREEN}>{it.equipped ? 'running' : 'loaded'}</Tag>}
            </div>
          </div>
          {p.ref && <StartStop refx={p.ref} title={p.title} />}
        </div>) })}
      {queue.length > 0 && (
        <div style={{ marginTop: prios.length ? 16 : 4 }}>
          <Label>The Queue · {queue.length} calling · most overdue first</Label>
          {shown.map(row => { const tag = tagOf(row); const when = whenText(row.due, day); const late = daysLate(row.due, day) > 0; return (
            <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div onClick={() => openRow(row)} title="Open" style={{ fontSize: 13.5, color: INK, lineHeight: 1.4, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
                  <Tag color={tag.color}>{tag.text}</Tag>
                  {when && <span style={{ fontFamily: MONO, fontSize: 9.5, color: late ? RED : GRAY, letterSpacing: '0.6px' }}>{when}</span>}
                  {row.blocked && <Tag color={RED}>blocked</Tag>}
                </div>
              </div>
              <StartStop refx={row.ref} title={row.title} row={row} />
            </div>) })}
          {queue.length > 10 && <button onClick={() => setShowAll(x => !x)} style={{ ...chipBtn(INK2), marginTop: 8 }}>{showAll ? 'Fewer' : `+${queue.length - 10} more`}</button>}
        </div>
      )}
      {!prios.length && !queue.length && <Empty>Nothing calling today.</Empty>}
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
  const [openEvent, setOpenEvent] = useState(null)
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
          <Panel heading="Loadout" style={{ marginBottom: 12 }}>
            <LoadoutPanel bare onChange={refresh} refreshKey={refreshKey} onNavigate={onNavigate} />
          </Panel>
          <Panel heading="Console" style={{ marginBottom: 12 }}>
            {/* The Stash (David 10/25): off the Loadout, a tall column down the Console's right side; the instrument
                groups wrap into two tight rows beside it. LoadoutPanel renders the Stash here through a portal. */}
            <ConsoleRunProvider tick={refreshKey}>
            <div className="console-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 30, alignItems: 'start' }}>
              <div className="console-row" style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-around', rowGap: 30, alignContent: 'flex-start', padding: '6px 0' }}>
                <ProtocolsPanel onChange={refresh} onNavigate={onNavigate} />
                <RecurringPanel onChange={refresh} />
                <ReleasePanel onChange={refresh} />
              </div>
              <div id="console-stash" style={{ minWidth: 0 }} />
            </div>
            </ConsoleRunProvider>
            <style>{`@media (max-width: 980px) { .console-grid { grid-template-columns: minmax(0, 1fr) !important } }`}</style>
          </Panel>
        </>
      )}

      <div className="agenda-grid">
        <div className="agenda-cal">
          {openEvent && <ItemDetail item={{ id: openEvent.id, kind: 'Event', title: openEvent.subject || '(no subject)', event: { start_at: openEvent.start_at, end_at: openEvent.end_at, attendees: openEvent.attendees, organizer: openEvent.organizer, notes: openEvent.notes || null } }} onClose={() => setOpenEvent(null)} onNavigate={onNavigate} initialTab={openEvent.notes ? 'notes' : 'overview'} />}
          <CalendarPanel events={calEvents} loading={loading} now={now} day={day} refresh={refresh} onOpenEvent={setOpenEvent} />
        </div>
        <div className="agenda-side">
          <WorkPanel tasks={tasks} projects={projects} objectives={objectives} loading={loading} day={day} refresh={refresh} refreshKey={refreshKey} onNavigate={onNavigate} isToday={day === today} />
        </div>
      </div>
      <div style={{ ...S.source, marginTop: 14 }}>
        SOURCES · clocks · calendar_events · granola_meetings · meeting_sessions · project_tasks + projects · objectives · the day's plan
      </div>
    </div>
  )
}
