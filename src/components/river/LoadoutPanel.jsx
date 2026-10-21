// The Board (the Loadout): the one Activity Board, four slots always drawn.
// Slots 1 to 3 carry planned work (Side Missions, Main Mission tasks), one
// Heavy at most, one equipped clock, the free hours shown for the rest of the day. Slot 4
// is the Ad Hoc Slot, Load the Unplanned: the Ambush lives in it (a task or a
// call, typed into the slot itself, one at a time, dispatched when done).
// Empty slots stay visible on purpose (David, 10/7: the structure is the point).
import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, PackageCheck, Archive, X as XIcon, Zap, Phone, Swords } from 'lucide-react'
import BadgeMedallion from '../BadgeArt'
import RecallModal, { BrainButton } from './Recall'
import YayPage from './YayPage'
import { MILES, colorOf } from '../../lib/summary'
import { upsertSession, logToHarvest, hoursBetween, stopMeetingTimer } from '../../lib/meetings'
import { RECURRING } from './RecurringPanel'
import { Square, Mail, Hash, CalendarCheck, Brain, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DispatchModal } from './AmbushPanel'
import { pockets } from '../../lib/objectives'
import FileAway from './FileAway'
import { fetchLoadout, equip, holster, stash, extract, addImpromptu, fmtClock, SIZES, SLOTS, sizeOf, chiToday, fetchStash, returnToInventory, equipObjective, STASH_MAX, logBoard } from '../../lib/loadout'
import { fileAchieved } from '../../lib/archive'
import { Undo2, ArrowUpToLine, ScrollText, Paperclip } from 'lucide-react'
import ActivityLogModal from './ActivityLog'
import LiveFilesModal, { ClipButton } from './LiveFiles'
import { liveCounts } from '../../lib/livefiles'
import ItemDetail from './ItemDetail'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label, Panel, KIND_COLOR, KindChip, NORTH_STAR_LABEL, LABEL } from './canon'

const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent',
  color: filled ? '#0A1B2B' : color, cursor: 'pointer',
})

const SizeChip = ({ size }) => {
  const s = SIZES[size] || SIZES.light
  return <span style={{ ...S.chip('rgba(255,255,255,0.06)', s.color), border: `1px solid ${s.color}55`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{s.label} · {s.slots} slot{s.slots === 1 ? '' : 's'}</span>
}


function ExtractModal({ item, onClose, onDone }) {
  const [minutes, setMinutes] = useState(Math.round(item.minutes_today) || '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const go = async () => {
    setBusy(true); setErr(null)
    try { if (note.trim()) await fileAchieved(item, note.trim()); const r = await extract(item, { minutes: Number(minutes) || 0, note: note.trim() || null }); onDone(r) }
    catch (e) { setErr(e.message); setBusy(false) }
  }
  const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%', background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Extract</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{item.title}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}><KindChip kind={item.kind} /><SizeChip size={item.size} />{item.personal && <span style={S.chip('rgba(255,255,255,0.06)', INK2)}>personal</span>}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
          <div>
            <Label>Time of activity</Label>
            <input type="number" min="0" value={minutes} onChange={e => setMinutes(e.target.value)} style={field} />
            <div style={{ fontSize: 10.5, color: GRAY, marginTop: 4 }}>minutes · clocked {fmtClock(item.minutes_today)}</div>
          </div>
          <div>
            {item.north_star && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, lineHeight: 1.45, color: INK2, borderLeft: `2px solid ${BLUE}`, paddingLeft: 9, marginBottom: 8 }}>{item.north_star}</div>}
            <Label style={{ color: BLUE }}>Achieved · Is It True? What's Different Now?</Label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="In your words. It lands on the yay page under the star." style={{ ...field, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: GRAY, marginTop: 10 }}>{item.personal ? 'Personal time stays out of Harvest; the clock is kept in the Ledger.' : 'The clock is kept in the Ledger. Harvest is for Third Horizon work you log yourself.'} Miles bank on the next update.</div>
        {err && <div style={{ fontSize: 12, color: RED, marginTop: 8 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btn(INK2)}>Cancel</button>
          <button onClick={go} disabled={busy} style={btn(GOLD, true)}><PackageCheck size={12} /> {busy ? 'Extracting' : 'Extract'}</button>
        </div>
      </div>
    </div>
  )
}

const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
const slotBox = (border, bg = 'rgba(255,255,255,0.03)', dashed = false) => ({
  display: 'flex', flexDirection: 'column', gap: 8, minHeight: 168, padding: '12px 14px', borderRadius: 14,
  border: `1px ${dashed ? 'dashed' : 'solid'} ${border}`, background: bg, minWidth: 0,
})

// Slot notches: three cells, the ones this item occupies lit.
function Notches({ from, span, color }) {
  return <span style={{ display: 'inline-flex', gap: 3 }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 14, height: 5, borderRadius: 2, background: i >= from && i < from + span ? color : 'rgba(255,255,255,0.10)' }} />)}</span>
}

// The slot card (David, 10/12, alternative C): the badge top left in the
// cannon color; beside it the mission, the kind, and the type line (MMT 2 of
// 10, Mythic · gate 3 of 5, Bounty · N/A); then the task as the biggest line;
// miles and due; the clock and the actions; the brain at bottom right.
// Drag and drop (David, 10/16): a card drags from the Loadout into the Stash; a Stash row drags onto the Loadout. Native HTML5 drag, one JSON payload.
const dragPayload = (kind, id) => JSON.stringify({ kind, id })
const readDrag = (e) => { try { return JSON.parse(e.dataTransfer.getData('text/plain') || '{}') } catch { return {} } }
const badgeFor = (it) => it.meeting ? 'toastmaster' : it.kind === 'Main Mission' ? 'mission-task' : it.kind === 'Ad Hoc' ? 'impromptu' : it.size === 'heavy' ? 'mythic' : it.size === 'medium' ? 'contract' : 'bounty'
const fmtDue = (d) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
const Fact = ({ label, children }) => <div style={{ padding: '7px 0' }}><div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.3px', textTransform: 'uppercase', color: LABEL, marginBottom: 2 }}>{label}</div>{children}</div>

function MeetingSlot({ it, n, act }) {
  const ends = it.ends_at ? new Date(it.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : null
  return (
    <div style={{ ...slotBox(BLUE, 'rgba(169,201,232,0.08)'), gridColumn: 'span 1' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BadgeMedallion id="toastmaster" size={50} color={BLUE} />
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: INK, lineHeight: 1.25 }}>In a meeting</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE }}>Meeting</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.1px', textTransform: 'uppercase', color: LABEL }}>1 slot while it runs</div>
        </div>
        <Notches from={n - 1} span={1} color={BLUE} />
      </div>
      <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.28, flex: 1 }}>{it.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${PANEL_BORDER}`, borderBottom: `1px solid ${PANEL_BORDER}` }}>
        <Fact label="Logs to"><span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>Harvest</span></Fact>
        <div style={{ borderLeft: `1px solid ${PANEL_BORDER}`, paddingLeft: 12 }}><Fact label="Ends">{ends ? <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>{ends}</span> : <span style={{ fontSize: 13, color: GRAY }}>open</span>}</Fact></div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN, letterSpacing: '0.6px', marginRight: 2 }}>running · {fmtClock(it.minutes_today)}</span>
        <button onClick={() => act(() => stopMeetingTimer({ id: it.event_id, subject: it.title }, { started_at: it.running_since, hours: 0 }, chiToday()), `Meeting stopped: ${it.title}`)} style={btn(GREEN, true)}><Square size={11} /> Stop</button>
      </div>
    </div>
  )
}

function FilledSlot({ it, n, act, onOpen, onExtract, onRecall, dropFromStash, clips = 0, onFiles }) {
  const span = it.slots || 1
  const color = KIND_COLOR[it.kind] || INK2
  const main = it.kind === 'Main Mission'
  const gates = it.steps || []
  const gatesDone = gates.filter(g => g.done).length
  const gate = gates.find(g => !g.done) || null
  const typeLine = main ? (it.task_n ? `MMT ${it.task_n} of ${it.task_total}` : 'Mission task')
    : it.size === 'heavy' ? `Mythic · gate ${Math.min(gatesDone + 1, Math.max(gates.length, 1))} of ${gates.length || 5}${gates.length ? ` · ${gates.map(g => g.done ? '✓' : '○').join(' ')}` : ''}`
    : it.size === 'medium' ? 'Contract · N/A' : 'Bounty · N/A'
  const task = main ? (it.task_text || it.title) : it.size === 'heavy' ? (gate ? gate.text : gates.length ? 'Every gate closed. Extract.' : 'No gates yet. Tell Lumen the gates.') : null
  const miles = main ? { n: MILES.mmt, sub: 'on close' } : it.size === 'heavy' ? { n: MILES.gate * Math.min(gatesDone, MILES.gatesPaid), sub: `of ${MILES.mythic + MILES.gate * MILES.gatesPaid} banked` } : it.size === 'medium' ? { n: MILES.contract, sub: 'on close' } : { n: MILES.bounty, sub: 'on close' }
  const due = fmtDue(it.due_date)
  const late = it.due_date && it.due_date < new Date().toISOString().slice(0, 10)
  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData('text/plain', dragPayload('loadout', it.id)); e.dataTransfer.effectAllowed = 'move' }} onDragOver={e => { if (dropFromStash) e.preventDefault() }} onDrop={e => { const d = readDrag(e); if (d.kind === 'stash' && dropFromStash) { e.preventDefault(); dropFromStash(d.id) } }} title="Drag to the Stash" style={{ ...slotBox(it.equipped ? BLUE : `${BLUE}66`, it.equipped ? 'rgba(169,201,232,0.08)' : 'rgba(169,201,232,0.035)'), gridColumn: `span ${span}`, cursor: 'grab' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BadgeMedallion id={badgeFor(it)} size={50} color={colorOf(it.kind, it.size)} />
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
          <div onClick={() => onOpen(it)} title={main ? (it.project || 'Main Mission') : it.title} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: INK, lineHeight: 1.25, cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{main ? (it.project || 'Main Mission') : it.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color }}>{it.kind}{it.personal ? ' · personal' : ''}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.1px', textTransform: 'uppercase', color: LABEL }}>{typeLine}</div>
        </div>
        <Notches from={n - 1} span={span} color={SIZES[it.size]?.color || INK2} />
      </div>
      {task
        ? <div onClick={() => onOpen(it)} title={task} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.28, cursor: 'pointer', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task}</div>
        : <div style={{ flex: 1 }} />}
      <div title={it.north_star ? `${NORTH_STAR_LABEL}: ${it.north_star}` : NORTH_STAR_LABEL} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, lineHeight: 1.45, color: it.north_star ? INK2 : GRAY, borderLeft: `2px solid ${it.north_star ? BLUE : PANEL_BORDER}`, paddingLeft: 9, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.north_star || 'No star yet.'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${PANEL_BORDER}`, borderBottom: `1px solid ${PANEL_BORDER}` }}>
        <Fact label="Miles"><span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>{miles.n}</span><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, marginLeft: 5 }}>{miles.sub}</span></Fact>
        <div style={{ borderLeft: `1px solid ${PANEL_BORDER}`, paddingLeft: 12 }}><Fact label="Due">{due ? <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: late ? RED : INK }}>{due}{late ? <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', marginLeft: 5 }}>overdue</span> : null}</span> : <span style={{ fontSize: 13, color: GRAY }}>none set</span>}</Fact></div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: it.equipped ? GREEN : GRAY, letterSpacing: '0.6px', marginRight: 2 }}>{it.equipped ? 'running · ' : 'holstered · '}{fmtClock(it.minutes_today)}</span>
        {it.equipped
          ? <button onClick={() => act(() => holster(it.id), `Timer off (holstered): ${it.title}`)} title="Holster: pause the clock, stays loaded" style={btn(GREEN, true)}><Pause size={11} /> Timer on</button>
          : <button onClick={() => act(() => equip(it.id), `Timer on (equipped): ${it.title}`)} title="Equip: run the clock on this, pause the rest" style={btn(INK2)}><Play size={11} /> Timer off</button>}
        <button onClick={() => act(() => stash(it.id), `Stashed: ${it.title}`)} title="Park it; it stays planned" style={btn(INK2)}><Archive size={11} /> Stash</button>
        <button onClick={() => onExtract(it)} style={btn(GOLD)}><PackageCheck size={11} /> Extract</button>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>{onFiles && <ClipButton count={clips} onClick={() => onFiles(it)} />}<BrainButton onClick={() => onRecall(it)} /></span>
      </div>
    </div>
  )
}

function EmptySlot({ n, dropFromStash }) {
  const [over, setOver] = useState(false)
  return (
    <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { setOver(false); const d = readDrag(e); if (d.kind === 'stash' && dropFromStash) { e.preventDefault(); dropFromStash(d.id) } }}
      style={{ ...slotBox(over ? GREEN : `${GREEN}99`, over ? 'rgba(67,211,146,0.12)' : 'rgba(67,211,146,0.03)', true), justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <Notches from={n - 1} span={1} color={`${GREEN}88`} />
      <Label style={{ marginBottom: 0, color: GREEN }}>Slot {n} · empty</Label>
      <div style={{ fontFamily: SERIF, fontSize: 15, color: 'rgba(234,241,248,0.4)' }}>Load from what is due</div>
      <div style={{ fontSize: 11, color: GRAY, lineHeight: 1.5 }}>a Side Mission, a Main Mission task, or tell Lumen</div>
    </div>
  )
}

// The Ad Hoc slot: empty, it takes a task or a call right in the box; loaded,
// it carries the impromptu item with its clock until Dispatch.
function AdHocSlot({ item, act, onDispatch, onOpen, onChanged, onRecall }) {
  const [mode, setMode] = useState('task')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const start = async () => {
    const t = text.trim(); if (!t || busy) return
    setBusy(true); setErr(null)
    try {
      const r = await addImpromptu(mode === 'call' ? `Call: ${t}` : t, { tags: mode === 'call' ? ['call'] : [] })
      if (!r.ok) setErr(r.reasons.join(' · ')); else { setText(''); onChanged() }
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  // Loaded: the same shape as the other cards (badge, kind, type, the thing
  // itself, a facts strip, clock and actions), lettered in baby blue (David, 10/14).
  if (item) {
    const since = item.activated_at ? new Date(item.activated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : null
    return (
      <div style={{ ...slotBox(item.equipped ? BLUE : `${BLUE}66`, item.equipped ? 'rgba(169,201,232,0.08)' : 'rgba(169,201,232,0.035)'), minHeight: 0, flex: '1 1 auto' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <BadgeMedallion id="impromptu" size={50} color={BLUE} />
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: INK, lineHeight: 1.25 }}>The Unplanned</div>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE }}>Ad Hoc</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.1px', textTransform: 'uppercase', color: LABEL }}>{item.call ? 'Call' : 'Task'} · its own slot</div>
          </div>
          {item.call ? <Phone size={14} color={BLUE} /> : <Zap size={14} color={BLUE} />}
        </div>
        <div onClick={() => onOpen(item)} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.28, cursor: 'pointer', flex: 1 }}>{item.title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${PANEL_BORDER}`, borderBottom: `1px solid ${PANEL_BORDER}` }}>
          <Fact label="Miles"><span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>1</span><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, marginLeft: 5 }}>on dispatch</span></Fact>
          <div style={{ borderLeft: `1px solid ${PANEL_BORDER}`, paddingLeft: 12 }}><Fact label="Landed">{since ? <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>{since}</span> : <span style={{ fontSize: 13, color: GRAY }}>today</span>}</Fact></div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: item.equipped ? GREEN : GRAY, letterSpacing: '0.6px', marginRight: 2 }}>{item.equipped ? 'running · ' : 'holstered · '}{fmtClock(item.minutes_today)}</span>
          {item.equipped
            ? <button onClick={() => act(() => holster(item.id), `Timer off: ${item.title}`)} style={btn(GREEN, true)}><Pause size={11} /> Timer on</button>
            : <button onClick={() => act(() => equip(item.id), `Timer on: ${item.title}`)} style={btn(INK2)}><Play size={11} /> Timer off</button>}
          <button onClick={() => onDispatch(item)} style={btn(GOLD)}><Swords size={11} /> Dispatch</button>
          <span style={{ marginLeft: 'auto' }}><BrainButton onClick={() => onRecall(item)} /></span>
        </div>
      </div>
    )
  }
  return (
    <div style={{ ...slotBox(`${GREEN}99`, 'rgba(67,211,146,0.03)', true), minHeight: 0, flex: '1 1 auto' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BadgeMedallion id="impromptu" size={50} color={BLUE} earned={false} />
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: 'rgba(234,241,248,0.7)', lineHeight: 1.25 }}>Load the Unplanned</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE }}>Ad Hoc Slot</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.1px', textTransform: 'uppercase', color: LABEL }}>a task or a call · 1 mile</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
        {[['task', 'Task'], ['call', 'Call']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{ ...btn(mode === k ? BLUE : INK2, mode === k), padding: '4px 9px' }}>{k === 'call' ? <Phone size={10} /> : <Zap size={10} />} {l}</button>
        ))}
      </div>
      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') start() }} disabled={busy}
        placeholder={mode === 'call' ? 'Who is calling? Enter starts the clock.' : 'What just landed on you? Enter starts the clock.'} style={field} />
      {err && <div style={{ fontFamily: MONO, fontSize: 9.5, color: RED, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{err}</div>}
    </div>
  )
}

// The Stash (David, 10/14): a stack of ten thin rows beside the Loadout.
// Each row is the item's vitals as a header: badge, title, kind, type. Click
// opens its page. Load puts it on the Loadout; Return sends it to the
// Missions Inventory.
function StashStack({ items, act, onOpen, dropFromLoadout }) {
  const rows = [...(items || []).slice(0, STASH_MAX)]
  while (rows.length < STASH_MAX) rows.push(null)
  const [over, setOver] = useState(false)
  return (
    <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { setOver(false); const d = readDrag(e); if (d.kind === 'loadout' && dropFromLoadout) { e.preventDefault(); dropFromLoadout(d.id) } }}
      style={{ ...slotBox(over ? BLUE : `${BLUE}44`, over ? 'rgba(169,201,232,0.10)' : 'rgba(169,201,232,0.025)'), minHeight: 0, gap: 6, padding: '12px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Label style={{ marginBottom: 0, color: BLUE }}>Stash</Label><span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY }}>{(items || []).length} of {STASH_MAX}</span>
      </div>
      <div style={{ display: 'grid', gap: 4, flex: 1 }}>
        {rows.map((it, i) => it ? (
          <div key={it.id} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', dragPayload('stash', it.id)); e.dataTransfer.effectAllowed = 'move' }} title="Drag onto the Loadout" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, border: `1px solid ${BLUE}55`, background: 'rgba(169,201,232,0.06)', minWidth: 0, cursor: 'grab' }}>
            <BadgeMedallion id={badgeFor(it)} size={20} color={colorOf(it.kind, it.size)} />
            <div onClick={() => onOpen(it)} title={`${it.title}${it.north_star ? ` · ${it.north_star}` : ''}`} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'grid', gap: 0 }}>
              <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 12.5, color: INK, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.kind === 'Main Mission' ? (it.task_text || it.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '') : it.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase', color: colorOf(it.kind, it.size), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.kind === 'Main Mission' ? `Main Mission · ${it.project || ''}` : `${it.kind} · ${SIZES[it.size]?.label || ''}`}</div>
            </div>
            <button onClick={() => act(async () => { const r = await equipObjective(it.id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, `Loaded: ${it.title} · timer on`)} title="Load onto the Loadout" style={{ ...btn(BLUE), padding: '3px 6px' }}><ArrowUpToLine size={10} /></button>
            <button onClick={() => act(() => returnToInventory(it.id), `Returned to the inventory: ${it.title}`)} title="Return to the Missions Inventory" style={{ ...btn(INK2), padding: '3px 6px' }}><Undo2 size={10} /></button>
          </div>
        ) : (
          <div key={`empty-${i}`} style={{ height: 30, borderRadius: 8, border: `1px dashed ${GREEN}55`, display: 'flex', alignItems: 'center', paddingLeft: 10, fontFamily: MONO, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase', color: `${GREEN}99` }}>{i + 1}</div>
        ))}
      </div>
    </div>
  )
}

// The Stash peek (David, 10/16): a light preview of a stashed item, not the
// whole Briefing. Vitals, the star, the back story's first lines, and the
// three moves: Load, Return, Open the Briefing.
function StashPeek({ it, act, onClose, onOpenFull, clips = 0, onFiles }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const color = colorOf(it.kind, it.size)
  const title = it.kind === 'Main Mission' ? (it.task_text || it.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '') : it.title
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 270, background: 'rgba(5,16,28,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px, 100%)', background: '#0F2338', border: `1px solid ${color}55`, borderRadius: 14, padding: '22px 24px', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <BadgeMedallion id={badgeFor(it)} size={48} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, color: '#fff', lineHeight: 1.2 }}>{it.kind === 'Main Mission' ? (it.project || 'Main Mission') : it.kind}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color }}>{it.kind === 'Main Mission' ? `Main Mission${(it.task_text || '').match(/^\s*(\d+)\s*[·.:)-]/) ? ` · Milestone ${(it.task_text || '').match(/^\s*(\d+)\s*[·.:)-]/)[1]}` : ' · Milestone'}` : `${it.kind} · ${SIZES[it.size]?.label || ''}`}</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: LABEL }}>in the Stash</span>
            </div>
            <div style={{ fontSize: 15.5, lineHeight: 1.4, color: INK, marginTop: 10 }}>{title}</div>
          </div>
          {onFiles && <ClipButton count={clips} onClick={() => onFiles(it)} />}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer' }}><XIcon size={16} /></button>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, lineHeight: 1.45, color: it.north_star ? INK2 : GRAY, borderLeft: `2px solid ${it.north_star ? BLUE : PANEL_BORDER}`, paddingLeft: 10 }}>{it.north_star || 'No star yet.'}</div>
        {it.description && <div style={{ fontSize: 13, lineHeight: 1.55, color: INK2, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.description}</div>}
        <div style={{ display: 'flex', gap: 18, fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, flexWrap: 'wrap' }}>
          <span>{it.slots} slot{it.slots === 1 ? '' : 's'}</span>
          <span>{it.kind === 'Main Mission' ? MILES.mmt : it.kind === 'Ad Hoc' ? MILES.adhoc : it.size === 'heavy' ? `${MILES.mythic} + gates` : it.size === 'medium' ? MILES.contract : MILES.bounty} mi on close</span>
          {it.due_date && <span>due {new Date(`${it.due_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
          <button onClick={() => { onClose(); act(async () => { const r = await equipObjective(it.id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, `Loaded: ${it.title} · timer on`) }} style={btn(BLUE, true)}><ArrowUpToLine size={11} /> Load onto the Loadout</button>
          <button onClick={() => { onClose(); act(() => returnToInventory(it.id), `Returned to the inventory: ${it.title}`) }} style={btn(INK2)}><Undo2 size={11} /> Return to the inventory</button>
          <span style={{ flex: 1 }} />
          <button onClick={() => { onClose(); onOpenFull(it) }} style={btn(GOLD)}>Open the Briefing</button>
        </div>
      </div>
    </div>
  )
}

// The Routine slot (David, 10/13): the bottom half of the right column. It
// shows the one recurring thing that is on right now (a Console chore, a
// timer Lumen started by hand) with its clock and a Stop, and when nothing
// is on, the chores you can start from here.
const ROUTINE_ICON = { 'email-refresh': Mail, 'slack-review': Hash, 'calendar-sweep': CalendarCheck, 'thinking': Brain, 'text-review': MessageSquare }
function RoutineSlot({ tick, onChanged }) {
  const [running, setRunning] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [msg, setMsg] = useState(null)
  const day = chiToday()
  const pull = useCallback(async () => {
    setNow(Date.now())
    const { data } = await supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at,hours,special_notes').eq('day', day).like('event_id', 'adhoc:%').is('stopped_at', null).not('started_at', 'is', null).order('started_at', { ascending: true })
    setRunning(Array.isArray(data) && data.length ? data[0] : null)
  }, [day])
  useEffect(() => { pull() }, [pull, tick])
  const slugOf = (eid) => String(eid || '').split(':').slice(2).join(':')
  const chore = running ? RECURRING.find(r => `adhoc:${day}:${r.slug}` === running.event_id) : null
  const mins = running ? ((Number(running.hours) || 0) * 60) + (now - new Date(running.started_at).getTime()) / 60000 : 0
  const stop = async () => {
    if (!running) return
    try {
      const stoppedIso = new Date().toISOString()
      const span = Math.max(0.01, hoursBetween(running.started_at, stoppedIso))
      const hours = Math.round(((Number(running.hours) || 0) + span) * 100) / 100
      const personal = running.special_notes === 'personal'
      let logged = false
      if (!personal) { try { await logToHarvest(running.subject, Math.round(span * 100) / 100); logged = true } catch (e) { setMsg(`Stopped; Harvest did not take it: ${e.message}`) } }
      await upsertSession({ event_id: running.event_id, day, subject: running.subject, started_at: running.started_at, stopped_at: stoppedIso, hours, harvest_logged: logged })
      if (logged) setMsg(`${running.subject}: ${fmtClock(span * 60)} logged to Harvest`)
      await pull(); onChanged && onChanged()
    } catch (e) { setMsg(`Could not stop: ${e.message}`) }
  }
  const Icon = chore ? (ROUTINE_ICON[chore.slug] || Zap) : Zap
  // Concurrent chores (Travel, David 10/18): the clock runs while he does other things. No card; a discreet strip.
  if (running && chore?.concurrent) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${GREEN}55`, borderRadius: 10, background: 'rgba(67,211,146,0.05)', flex: '0 0 auto' }}>
      <style>{`@keyframes trvpulse { 0%,100% { opacity: 1 } 50% { opacity: .2 } } .trv-pulse { animation: trvpulse 1.6s ease-in-out infinite }`}</style>
      <span className="trv-pulse" style={{ width: 7, height: 7, borderRadius: 99, background: GREEN, flexShrink: 0 }} />
      <Icon size={13} color={GREEN} />
      <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{running.subject}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN, letterSpacing: '0.6px', marginLeft: 'auto' }}>{fmtClock(mins)}</span>
      <button onClick={stop} title="Stop the travel clock" style={{ ...btn(GREEN), padding: '3px 7px' }}><Square size={10} /> Stop</button>
      {msg && <span style={{ fontFamily: MONO, fontSize: 9.5, color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{msg}</span>}
    </div>
  )
  if (running) return (
    <div style={{ ...slotBox(BLUE, 'rgba(169,201,232,0.08)'), minHeight: 0, flex: '0 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={12} color={GREEN} /><Label style={{ marginBottom: 0, color: GREEN }}>Routine · on</Label><span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN, letterSpacing: '0.6px' }}>running · {fmtClock(mins)}</span>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff', lineHeight: 1.3, flex: 1 }}>{running.subject}</div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, letterSpacing: '0.6px' }}>{chore ? 'Console chore' : `started by ${slugOf(running.event_id).includes('-') ? 'Lumen' : 'hand'}`}{running.special_notes === 'personal' ? ' · personal' : ' · logs to Harvest on stop'}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={stop} style={btn(GREEN, true)}><Square size={11} /> Stop</button>
      </div>
      {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{msg}</div>}
    </div>
  )
  return (
    <div style={{ ...slotBox(`${GREEN}99`, 'rgba(67,211,146,0.03)', true), minHeight: 0, flex: '0 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Label style={{ marginBottom: 0, color: GREEN }}>Routine · nothing on</Label>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 15, color: 'rgba(234,241,248,0.6)' }}>Nothing recurring is on</div>
      <div style={{ fontSize: 11, color: GRAY, lineHeight: 1.5 }}>Start one from the Console below, or tell Lumen. It shows up here with its clock.</div>
      {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, color: RED, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{msg}</div>}
    </div>
  )
}

export default function LoadoutPanel({ onChange, refreshKey = 0, onNavigate, bare = false }) {
  const [L, setL] = useState(null)
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(null)
  const [dispatch, setDispatch] = useState(null)
  const [filing, setFiling] = useState(null)
  const [related, setRelated] = useState(null)
  const [projects, setProjects] = useState([])
  const [msg, setMsg] = useState(null)
  const [recallOf, setRecallOf] = useState(null)
  const [yay, setYay] = useState(null)
  const [held, setHeld] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  const [peek, setPeek] = useState(null)
  const [filesOpen, setFilesOpen] = useState(null)   // null | { objectiveId, title } | {}
  const [clips, setClips] = useState({})
  const refresh = useCallback(() => Promise.all([fetchLoadout().then(setL), fetchStash().then(setHeld), liveCounts().then(setClips)]).catch(e => console.warn('loadout', e.message)), [])
  useEffect(() => { refresh() }, [refresh, tick, refreshKey])
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30_000); return () => clearInterval(t) }, [])
  useEffect(() => { supabase.from('projects').select('id,name').eq('status', 'active').order('name').then(({ data }) => setProjects(Array.isArray(data) ? data : [])) }, [])

  const bump = () => { setTick(x => x + 1); onChange && onChange() }
  const act = async (fn, after) => {
    try { await fn(); if (after) { setMsg(after); logBoard(after) } bump() }
    catch (e) { setMsg(`Could not do that: ${e.message}`) }
  }
  // Extract gate: a Side Mission carrying artifacts, files, or a board is
  // opened instead so its content is filed away first (the Archive).
  const extractGate = async (it) => {
    if (it.kind === 'Side Mission' || it.kind === 'Ad Hoc') {
      try { const p = await pockets(it.id); if (p.carrying) { const { data } = await supabase.from('objectives').select('*').eq('id', it.id).limit(1); if (data?.[0]) { setFiling({ o: data[0], p }); return } } } catch { /* fall through */ }
    }
    setOpen(it)
  }

  // Lay the items into the three slots by the slots they take; what does not fit is over capacity.
  const layout = (() => {
    const placed = [], overflow = [], empties = []; let pos = 0
    for (const it of (L?.board || [])) { const w = it.slots || 1; if (pos + w <= SLOTS) { placed.push({ it, n: pos + 1 }); pos += w } else overflow.push(it) }
    while (pos < SLOTS) { empties.push(pos + 1); pos++ }
    return { placed, overflow, empties }
  })()
  const Wrap = bare ? 'div' : Panel
  const wrapStyle = bare ? {} : { marginBottom: 0 }

  return (
    <Wrap style={wrapStyle}>
      <style>{`.board-slots { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(0, 0.8fr); gap: 10px } @media (max-width: 980px) { .board-slots { grid-template-columns: repeat(2, minmax(0, 1fr)) } }`}</style>
      {related && <ItemDetail item={{ id: related.id, objective_id: related.id, kind: related.kind, title: related.title, project: related.project, project_id: related.project_id, description: related.description, tags: related.tags, size: related.size }} onClose={() => setRelated(null)} onNavigate={onNavigate} onChange={bump} />}
      {open && <ExtractModal item={open} onClose={() => setOpen(null)} onDone={(r) => { const id = open.id, session = open.session; setOpen(null); setMsg(`Extracted: ${open.title} · ${fmtClock(r.minutes)}${r.personal ? ' · personal' : ''}`); logBoard(`Extracted: ${open.title} · ${fmtClock(r.minutes)}`); bump(); if (!session) setYay(id) }} />}
      {filing && <FileAway objective={filing.o} pockets={filing.p} onClose={() => setFiling(null)} onDone={({ filed, released }) => { const id = filing.o.id; setFiling(null); setMsg(`Filed ${filed.length} to the Archive · extracted ${filing.o.title} · ${released.minutes}m`); logBoard(`Extracted: ${filing.o.title} · filed ${filed.length} to the Archive`); bump(); setYay(id) }} />}
      {recallOf && <RecallModal objectiveId={recallOf.id} taskId={recallOf.task_id || null} title={recallOf.title} onClose={() => setRecallOf(null)} />}
      {logOpen && <ActivityLogModal onClose={() => setLogOpen(false)} />}
      {filesOpen && <LiveFilesModal onClose={() => setFilesOpen(null)} filter={filesOpen.objectiveId ? filesOpen : null} items={[...(L?.items || []).filter(x => !x.meeting).map(x => ({ ...x, stashed: false })), ...held.map(x => ({ ...x, stashed: true }))]} onChanged={refresh} />}
      {peek && <StashPeek it={peek} act={act} clips={clips[peek.id] || 0} onFiles={(x) => { setPeek(null); setFilesOpen({ objectiveId: x.id, title: x.kind === 'Main Mission' ? (x.task_text || x.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '') : x.title }) }} onClose={() => setPeek(null)} onOpenFull={(it) => setRelated({ id: it.id, objective_id: it.id, kind: it.kind, title: it.title, project: it.project, description: it.description, tags: it.tags, size: it.size })} />}
      {yay && <YayPage objectiveId={yay} fresh onClose={() => setYay(null)} onOpenMission={(o) => { setYay(null); setRelated({ id: o.id, objective_id: o.id, kind: (o.tags || []).includes('impromptu') ? 'Ad Hoc' : 'Side Mission', title: o.title, description: o.description, tags: o.tags, size: sizeOf(o) }) }} />}
      {dispatch && <DispatchModal item={dispatch} projects={projects} onClose={() => setDispatch(null)} onDone={(r) => { setDispatch(null); setMsg(`Dispatched: ${dispatch.title} · ${fmtClock(r.minutes)}${r.ported.length ? ` · ported ${r.ported.length}` : ' · nothing left'} · 1 mile on the next update`); logBoard(`Dispatched: ${dispatch.title} · ${fmtClock(r.minutes)}`); bump() }} />}
      {!L ? (
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, padding: '12px 0' }}>Reading the board</div>
      ) : (
        <>
          <div className="board-slots">
            {layout.placed.map(({ it, n }) => it.meeting ? <MeetingSlot key={it.id} it={it} n={n} act={act} /> : <FilledSlot key={it.id} it={it} n={n} act={act} onOpen={setRelated} onExtract={extractGate} onRecall={setRecallOf} clips={clips[it.id] || 0} onFiles={(x) => setFilesOpen({ objectiveId: x.id, title: x.kind === 'Main Mission' ? (x.task_text || x.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '') : x.title })} dropFromStash={(id) => act(async () => { const r = await equipObjective(id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, 'Loaded from the Stash · timer on')} />)}
            {layout.empties.map(n => <EmptySlot key={`empty-${n}`} n={n} dropFromStash={(id) => act(async () => { const r = await equipObjective(id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, 'Loaded from the Stash · timer on')} />)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, alignSelf: 'stretch' }}>
              <AdHocSlot item={L.adhoc[0] || null} act={act} onDispatch={setDispatch} onOpen={setRelated} onChanged={bump} onRecall={setRecallOf} />
              <RoutineSlot tick={tick} onChanged={bump} />
            </div>
            <StashStack items={held} act={act} onOpen={setPeek} dropFromLoadout={(id) => act(() => stash(id), 'Stashed from the Loadout')} />
          </div>
          {(layout.overflow.length > 0 || L.adhoc.length > 1) && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 8 }}>
              {layout.overflow.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', flexWrap: 'wrap' }}>
                  <span onClick={() => setRelated(it)} style={{ fontSize: 13, color: INK2, flex: 1, minWidth: 200, cursor: 'pointer' }}>{it.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{SIZES[it.size]?.label} · no slot free</span>
                  <button onClick={() => act(() => stash(it.id), `Stashed: ${it.title}`)} style={btn(INK2)}><Archive size={11} /> Stash</button>
                </div>
              ))}
              {L.adhoc.slice(1).map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', flexWrap: 'wrap' }}>
                  <span onClick={() => setRelated(it)} style={{ fontSize: 13, color: INK2, flex: 1, minWidth: 200, cursor: 'pointer' }}>{it.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>Ad Hoc · waiting for the slot</span>
                </div>
              ))}
            </div>
          )}

          {L.sessions.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 8 }}>
              <Label>Sessions · no slot taken</Label>
              {L.sessions.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', flexWrap: 'wrap' }}>
                  {it.equipped && <span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN, boxShadow: `0 0 0 3px ${GREEN}33` }} />}
                  <span onClick={() => setRelated(it)} style={{ fontSize: 13, color: INK2, flex: 1, minWidth: 200, cursor: 'pointer' }}>{it.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: it.equipped ? GREEN : GRAY, letterSpacing: '0.6px' }}>{it.equipped ? 'running · ' : 'holstered · '}{fmtClock(it.minutes_today)}</span>
                  {it.equipped
                    ? <button onClick={() => act(() => holster(it.id), `Timer off: ${it.title}`)} style={btn(GREEN, true)}><Pause size={11} /> Timer on</button>
                    : <button onClick={() => act(() => equip(it.id), `Timer on: ${it.title}`)} style={btn(INK2)}><Play size={11} /> Timer off</button>}
                  <button onClick={() => act(() => stash(it.id), `Suspended: ${it.title}`)} style={btn(INK2)}><Archive size={11} /> Suspend</button>
                  <button onClick={() => setOpen(it)} style={btn(GOLD)}><PackageCheck size={11} /> Extract</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setLogOpen(true)} style={btn(BLUE)}><ScrollText size={11} /> Activity Log</button>
            <button onClick={() => setFilesOpen({})} style={btn(BLUE)}><Paperclip size={11} /> Live Files{Object.values(clips).reduce((a, b) => a + b, 0) ? ` · ${Object.values(clips).reduce((a, b) => a + b, 0)}` : ''}</button>
            {msg && msg.startsWith('Could not') && <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: RED, textTransform: 'uppercase' }}>{msg}</span>}
          </div>
        </>
      )}
    </Wrap>
  )
}
