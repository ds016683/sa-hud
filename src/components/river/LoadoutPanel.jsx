// The Board (the Loadout): the one Activity Board, four slots always drawn.
// Slots 1 to 3 carry planned work (Side Missions, Main Mission tasks), one
// Heavy at most, one equipped clock, the free hours shown for the rest of the day. Slot 4
// is the Ad Hoc Slot, Load the Unplanned: the Ambush lives in it (a task or a
// call, typed into the slot itself, one at a time, dispatched when done).
// Empty slots stay visible on purpose (David, 10/7: the structure is the point).
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { GlyphLoadout, GlyphHolster, GlyphStash } from './glyphs'
import { Play, Pause, PackageCheck, Archive, X as XIcon, Zap, Phone, Swords } from 'lucide-react'
import BadgeMedallion from '../BadgeArt'
import RecallModal, { BrainButton } from './Recall'
import YayPage from './YayPage'
import { MILES, baseMiles, colorOf } from '../../lib/summary'
import { upsertSession, logToHarvest, hoursBetween, stopMeetingTimer } from '../../lib/meetings'
import { RECURRING } from './RecurringPanel'
import { Square, Mail, Hash, CalendarCheck, Brain, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DispatchModal } from './AmbushPanel'
import { pockets } from '../../lib/objectives'
import FileAway from './FileAway'
import StillOpen from './StillOpen'
import { fetchLoadout, equip, holster, unload, stash, addImpromptu, fmtClock, SIZES, SLOTS, SLOT_NAMES, hoursOf, chiToday, fetchStash, returnToInventory, equipObjective, STASH_MAX, logBoard, stillOpen } from '../../lib/loadout'
import { ArrowUpToLine, ScrollText, Footprints } from 'lucide-react'
import { loadSteps, CLEAR_AT } from '../../lib/trailsteps'
import ActivityLogModal from './ActivityLog'
import LiveFilesModal, { ClipButton } from './LiveFiles'
import { liveCounts } from '../../lib/livefiles'
import ItemDetail from './ItemDetail'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label, Panel, KIND_COLOR, KindChip, NORTH_STAR_LABEL, LABEL, MUTED, SUCCESS, alpha } from './canon'
import { openCard } from '../../lib/card'

const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${alpha(color, 40)}`}`, background: filled ? color : 'transparent',
  color: filled ? 'var(--hud-on-accent)' : color, cursor: 'pointer',
})

// The clock, isolated (David 11/7): its own strip under the facts, nothing else in it. A ring dial fills against the
// item's hour budget for the day (a Bounty's hour, a Contract's four, a Mythic's eight), the clock reads in serif like the
// other figures on the card, and the state word says Running (green, the one thing green means here) or Holstered.
const CLOCK_RING = 22
// Click the strip to toggle the clock (David 11/7): running stops it, paused starts it and stops any other.
function ClockStrip({ minutes = 0, hours = 1, running = false, onToggle }) {
  const [hot, setHot] = useState(false)
  const r = (CLOCK_RING - 3) / 2, c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, (Number(minutes) || 0) / Math.max(hours * 60, 1)))
  const tone = running ? GREEN : LABEL
  const edge = running ? alpha(GREEN, hot ? 75 : 45) : alpha(BLUE, hot ? 55 : 22)
  return (
    <div role="button" tabIndex={0} aria-pressed={running} onClick={onToggle} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.() } }} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      title={running ? 'Stop the clock' : 'Start the clock on this item; any other clock stops'}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 12px 5px 7px', borderRadius: 999, border: `1px solid ${edge}`, background: running ? alpha(GREEN, hot ? 10 : 6) : hot ? alpha(BLUE, 6) : 'transparent', cursor: 'pointer', userSelect: 'none', transition: 'border-color 0.15s, background 0.15s' }}>
      <svg width={CLOCK_RING} height={CLOCK_RING} viewBox={`0 0 ${CLOCK_RING} ${CLOCK_RING}`} style={{ flexShrink: 0 }}>
        <circle cx={CLOCK_RING / 2} cy={CLOCK_RING / 2} r={r} fill="none" stroke={alpha(INK2, 22)} strokeWidth={2} />
        <circle cx={CLOCK_RING / 2} cy={CLOCK_RING / 2} r={r} fill="none" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${CLOCK_RING / 2} ${CLOCK_RING / 2})`} style={{ transition: 'stroke-dasharray 0.6s' }} />
        <circle cx={CLOCK_RING / 2} cy={CLOCK_RING / 2} r={2.6} fill={tone} style={running ? { animation: 'hudClockPulse 1.6s ease-in-out infinite' } : undefined} />
      </svg>
      <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 15, color: INK, lineHeight: 1 }}>{fmtClock(minutes)}</span>
      <span style={{ fontSize: 11.5, color: MUTED, lineHeight: 1, whiteSpace: 'nowrap' }}>of {hours}h</span>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: running ? GREEN : MUTED, lineHeight: 1, whiteSpace: 'nowrap' }}>{running ? 'Running' : 'Paused'}</span>
      {running && <style>{'@keyframes hudClockPulse{0%,100%{opacity:1}50%{opacity:.3}}'}</style>}
    </div>
  )
}

// The verbs (David 11/7): loaded is equipped, so there are three, as glyphs at the bottom left in the Marathon map idiom
// (a reticle ring, an arrow, ticks): Holster sends the item back to its repository, Stash holds it on the board, Extract
// closes it and banks the miles. Lumen keeps the bottom right. Chrome is one color at rest, Extract the one gold action.
// Extract is the Marathon exfil marker (David 11/7, from his frame): a peaked badge with a bold up-arrow. The marker is the
// button's own shape, gold outline and arrow at rest, gold fill with the arrow in navy on hover, so it keeps the house palette.
export function ExtractMarker({ title, onClick, size = 34 }) {
  const [hot, setHot] = useState(false)
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{ width: size, height: size, padding: 0, border: 'none', background: 'transparent', color: GOLD, display: 'inline-grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', transition: 'filter 0.15s', filter: hot ? `drop-shadow(0 0 4px ${alpha(GOLD, 55)})` : 'none' }}>
        <path d="M12 1.6 22 9.3v11.1a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 20.4V9.3Z" fill={hot ? GOLD : alpha(GOLD, 8)} stroke={GOLD} strokeWidth={1.5} strokeLinejoin="round" style={{ transition: 'fill 0.15s' }} />
        <path d="M12 18.2V8.4M7.9 12.2 12 8.1l4.1 4.1" fill="none" stroke={hot ? 'var(--hud-on-accent)' : GOLD} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.15s' }} />
      </svg>
    </button>
  )
}
export function IconVerb({ color = INK2, title, onClick, children }) {
  const [hot, setHot] = useState(false)
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{ width: 32, height: 32, borderRadius: 99, border: `1px solid ${alpha(color, hot ? 85 : 40)}`, background: hot ? alpha(color, 10) : 'transparent', color, display: 'inline-grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'border-color 0.15s, background 0.15s' }}>
      {children}
    </button>
  )
}
function VerbRow({ verbs, tail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {verbs}
      <span style={{ flex: 1 }} />
      {tail}
    </div>
  )
}

const SizeChip = ({ size }) => {
  const s = SIZES[size] || SIZES.light
  return <span style={{ ...S.chip('rgba(255,255,255,0.06)', s.color), border: `1px solid ${alpha(s.color, 33)}`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{s.label} · {s.slots} slot{s.slots === 1 ? '' : 's'}</span>
}


const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
// An empty slot reads as empty: a neutral dashed edge, no fill, gray words (David 11/17: "kill the green hue").
const EMPTY_EDGE = 'rgba(234,241,248,0.18)'
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

function MeetingSlot({ it, act }) {
  const ends = it.ends_at ? new Date(it.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : null
  return (
    <div style={{ ...slotBox(BLUE, 'rgba(169,201,232,0.08)'), gridColumn: 'span 1' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BadgeMedallion id="toastmaster" size={50} color={BLUE} />
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: INK, lineHeight: 1.25 }}>In a meeting</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: BLUE }}>Meeting</div>
        </div>
        <span className="ld-slot-tag">Utility</span>
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

export function FilledSlot({ it, n, act, onOpen, onExtract, onRecall, dropFromStash }) {
  const span = it.slots || 1
  const color = KIND_COLOR[it.kind] || INK2
  const main = it.kind === 'Main Mission'
  const gates = it.steps || []
  const gatesDone = gates.filter(g => g.done).length
  const gate = gates.find(g => !g.done) || null
  // Any mission can carry gates (David 11/16), and any closed gate pays (11/17).
  const sizeLabel = it.size === 'heavy' ? 'Mythic' : it.size === 'medium' ? 'Contract' : 'Bounty'
  // The face says which gate this is, then the mission's count in two plain numbers and a bar (David 11/17:
  // "a clean, crisp way to put gates accomplished, gates remaining").
  const typeLine = main ? `Main Mission${it.task_n ? ` · Gate ${it.task_n}` : ''}` : `${it.kind} · ${sizeLabel}`
  const meter = main ? (it.task_total ? { closed: it.task_closed || 0, total: it.task_total } : null) : gates.length ? { closed: gatesDone, total: gates.length } : null
  const task = main ? (it.task_text || it.title) : gates.length ? (gate ? gate.text : 'Every gate closed. Extract.') : null
  const miles = main ? { n: MILES.gate, sub: 'on close' } : { n: baseMiles(it.size), sub: gatesDone ? `on close · ${MILES.gate * gatesDone} banked on gates` : 'on close' }
  const due = fmtDue(it.due_date)
  const late = it.due_date && it.due_date < new Date().toISOString().slice(0, 10)
  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData('text/plain', dragPayload('loadout', it.id)); e.dataTransfer.effectAllowed = 'move' }} onDragOver={e => { if (dropFromStash) e.preventDefault() }} onDrop={e => { const d = readDrag(e); if (d.kind === 'stash' && dropFromStash) { e.preventDefault(); dropFromStash(d.id) } }} title="Drag to the Stash" className={it.equipped ? 'ld-running' : undefined} style={{ ...slotBox(it.equipped ? GREEN : `${alpha(BLUE, 40)}`, it.equipped ? 'rgba(169,201,232,0.08)' : 'rgba(169,201,232,0.035)'), gridColumn: `span ${span}`, cursor: 'grab' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BadgeMedallion id={badgeFor(it)} size={50} color={colorOf(it.kind, it.size)} />
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
          <div onClick={() => onOpen(it)} title={main ? (it.project || 'Main Mission') : it.title} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: INK, lineHeight: 1.25, cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{main ? (it.project || 'Main Mission') : it.title}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color, lineHeight: 1.35, whiteSpace: 'nowrap' }}>{typeLine}{it.personal ? ' · Personal' : ''}</div>
          {meter && (
            <div title={`${meter.closed} of ${meter.total} gates closed`} style={{ marginTop: 3 }}>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.3 }}><b style={{ color: INK, fontWeight: 600 }}>{meter.closed}</b> Closed <span style={{ color: GRAY }}>·</span> <b style={{ color: INK, fontWeight: 600 }}>{meter.total - meter.closed}</b> Open</div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(234,241,248,0.12)', marginTop: 5, overflow: 'hidden' }}><div style={{ width: `${meter.total ? (100 * meter.closed) / meter.total : 0}%`, height: '100%', borderRadius: 99, background: SUCCESS }} /></div>
            </div>
          )}
        </div>
        <span className="ld-slot-tag">{SLOT_NAMES[n - 1] || ''}</span>
      </div>
      {task
        ? <div onClick={() => onOpen(it)} title={task} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.28, cursor: 'pointer', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task}</div>
        : <div style={{ flex: 1 }} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${PANEL_BORDER}`, borderBottom: `1px solid ${PANEL_BORDER}` }}>
        <Fact label="Miles"><span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>{miles.n}</span><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, marginLeft: 5 }}>{miles.sub}</span></Fact>
        <div style={{ borderLeft: `1px solid ${PANEL_BORDER}`, paddingLeft: 12 }}><Fact label="Due">{due ? <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: late ? RED : INK }}>{due}{late ? <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', marginLeft: 5 }}>overdue</span> : null}</span> : <span style={{ fontSize: 13, color: GRAY }}>none set</span>}</Fact></div>
      </div>
      <ClockStrip minutes={it.minutes_today} hours={hoursOf(it)} running={!!it.equipped} onToggle={() => act(() => it.equipped ? holster(it.id) : equip(it.id), it.equipped ? `Clock stopped: ${it.title}` : `Clock running: ${it.title}`)} />
      <VerbRow
        verbs={[
          <IconVerb key="holster" title="Holster · Back to the Mission Board" onClick={() => act(() => unload(it.id), `Holstered: ${it.title}`)}><GlyphHolster /></IconVerb>,
          <IconVerb key="stash" title="Stash · hold it on the board" onClick={() => act(() => stash(it.id), `Stashed: ${it.title}`)}><GlyphStash /></IconVerb>,
          <ExtractMarker key="extract" title="Extract · close it, bank the miles" onClick={() => onExtract(it)} />,
        ]}
        tail={<BrainButton onClick={() => onRecall(it)} />}
      />
    </div>
  )
}

export function EmptySlot({ n, dropFromStash }) {
  const [over, setOver] = useState(false)
  return (
    <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { setOver(false); const d = readDrag(e); if (d.kind === 'stash' && dropFromStash) { e.preventDefault(); dropFromStash(d.id) } }}
      style={{ ...slotBox(over ? BLUE : EMPTY_EDGE, over ? 'rgba(169,201,232,0.08)' : 'transparent', true), position: 'relative', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <span className="ld-slot-tag" style={{ position: 'absolute', top: 12, right: 14 }}>{SLOT_NAMES[n - 1] || `Slot ${n}`}</span>
      <div title="Load a mission from the Stash or the Mission Board, or tell Lumen" style={{ fontSize: 14, fontWeight: 600, color: GRAY }}>Empty</div>
    </div>
  )
}

// The Ad Hoc slot: empty, it takes a task or a call right in the box; loaded,
// it carries the impromptu item with its clock until Dispatch.
export function AdHocSlot({ item, act, onDispatch, onOpen, onChanged, onRecall }) {
  const [mode, setMode] = useState('task')
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const start = async () => {
    const t = text.trim(); if (!t || busy) return
    setBusy(true); setErr(null)
    try {
      const r = await addImpromptu(mode === 'call' ? `Call: ${t}` : t, { tags: mode === 'call' ? ['call'] : [] })
      if (!r.ok) setErr(r.reasons.join(' · ')); else { setText(''); setOpen(false); onChanged() }
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  // Loaded: the same shape as the other cards (badge, kind, type, the thing
  // itself, a facts strip, clock and actions), lettered in baby blue (David, 10/14).
  if (item) {
    const since = item.activated_at ? new Date(item.activated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : null
    return (
      <div className={item.equipped ? 'ld-running' : undefined} style={{ ...slotBox(item.equipped ? GREEN : `${alpha(BLUE, 40)}`, item.equipped ? 'rgba(169,201,232,0.08)' : 'rgba(169,201,232,0.035)'), minHeight: 0, flex: '1 1 auto' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <BadgeMedallion id="impromptu" size={50} color={BLUE} />
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: INK, lineHeight: 1.25 }}>The Unplanned</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: BLUE }}>{item.call ? 'Phone Call' : 'Non-Mission Task'}</div>
          </div>
          <span className="ld-slot-tag">Utility</span>
        </div>
        <div onClick={() => onOpen(item)} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.28, cursor: 'pointer', flex: 1 }}>{item.title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${PANEL_BORDER}`, borderBottom: `1px solid ${PANEL_BORDER}` }}>
          <Fact label="Miles"><span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>1</span><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, marginLeft: 5 }}>on dispatch</span></Fact>
          <div style={{ borderLeft: `1px solid ${PANEL_BORDER}`, paddingLeft: 12 }}><Fact label="Landed">{since ? <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: INK }}>{since}</span> : <span style={{ fontSize: 13, color: GRAY }}>today</span>}</Fact></div>
        </div>
        <ClockStrip minutes={item.minutes_today} hours={hoursOf(item)} running={!!item.equipped} onToggle={() => act(() => item.equipped ? holster(item.id) : equip(item.id), item.equipped ? `Clock stopped: ${item.title}` : `Clock running: ${item.title}`)} />
        <VerbRow
          verbs={[<IconVerb key="dispatch" color={GOLD} title="Dispatch · done, 1 mile" onClick={() => onDispatch(item)}><Swords size={14} /></IconVerb>]}
          tail={<BrainButton onClick={() => onRecall(item)} />}
        />
      </div>
    )
  }
  // Empty: the Utility slot's own face (David 11/17: "the unplanned should have buttons below too. one is for
  // a phone call. another is for a non-mission task. they award the same miles").
  return (
    <div style={{ ...slotBox(EMPTY_EDGE, 'transparent', true), position: 'relative', flex: '1 1 auto' }}>
      <span className="ld-slot-tag" style={{ position: 'absolute', top: 12, right: 14 }}>Utility</span>
      <div title="Runs a Console button (E-mail, Slack Review, Bill Pay and the rest) or the unplanned: a phone call or a non-mission task, 1 mile each" style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, color: GRAY }}>Empty</div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['call', 'Phone Call'], ['task', 'Non-Mission Task']].map(([k, l]) => (
            <button key={k} className="ld-btn" onClick={() => { setMode(k); setOpen(true); setErr(null) }} style={open && mode === k ? { borderColor: BLUE, background: 'rgba(169,201,232,0.10)' } : undefined}>{k === 'call' ? <Phone size={15} /> : <Zap size={15} />} {l}</button>
          ))}
        </div>
        {open && <input autoFocus value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') start(); if (e.key === 'Escape') setOpen(false) }} disabled={busy}
          placeholder={mode === 'call' ? 'Who is it? Enter starts the clock.' : 'What landed on you? Enter starts the clock.'} aria-label={mode === 'call' ? 'Who the call is with' : 'The non-mission task'} style={field} />}
        {err && <div style={{ fontSize: 12.5, color: RED }}>{err}</div>}
      </div>
    </div>
  )
}

// The Stash (David, 10/14): a stack of ten thin rows beside the Loadout.
// Each row is the item's vitals as a header: badge, title, kind, type. Click
// opens its page. Load puts it on the Loadout; Return sends it to the
// Missions Inventory.
function StashStack({ items, act, onOpen, dropFromLoadout, wide = false, column = false }) {
  const tall = wide || column
  const rows = [...(items || []).slice(0, STASH_MAX)]
  while (rows.length < STASH_MAX) rows.push(null)
  const [over, setOver] = useState(false)
  return (
    <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { setOver(false); const d = readDrag(e); if (d.kind === 'loadout' && dropFromLoadout) { e.preventDefault(); dropFromLoadout(d.id) } }}
      style={{ ...slotBox(over ? BLUE : `${alpha(BLUE, 27)}`, over ? 'rgba(169,201,232,0.10)' : 'rgba(169,201,232,0.025)'), minHeight: 0, gap: tall ? 8 : 6, padding: tall ? '14px 14px' : '12px 12px', boxSizing: 'border-box', alignSelf: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Label style={{ marginBottom: 0, color: BLUE }}>Stash</Label><span style={{ flex: 1 }} />
        
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY }}>{(items || []).length} of {STASH_MAX}</span>
      </div>
      <div style={{ display: 'grid', gap: wide ? 8 : 4, flex: 1, gridTemplateColumns: wide ? 'repeat(auto-fill, minmax(230px, 1fr))' : undefined, alignContent: 'start' }}>
        {rows.map((it, i) => it ? (
          <div key={it.id} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', dragPayload('stash', it.id)); e.dataTransfer.effectAllowed = 'move' }} style={{ display: 'flex', alignItems: 'center', gap: 8, height: tall ? 64 : undefined, boxSizing: 'border-box', padding: tall ? '8px 10px' : '4px 8px', borderRadius: 8, border: `1px solid ${alpha(BLUE, 33)}`, background: 'rgba(169,201,232,0.06)', minWidth: 0, cursor: 'grab' }}>
            <BadgeMedallion id={badgeFor(it)} size={20} color={colorOf(it.kind, it.size)} />
            <div onClick={() => onOpen(it)} title={`${it.title}${it.north_star ? ` · ${it.north_star}` : ''}`} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'grid', gap: 0 }}>
              <div style={tall ? { fontFamily: SERIF, fontWeight: 500, fontSize: 13.5, color: INK, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : { fontFamily: SERIF, fontWeight: 500, fontSize: 12.5, color: INK, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.kind === 'Main Mission' ? (it.task_text || it.title).replace(/^\s*(?:gate\s+)?\d+\s*[·.:)-]\s*/i, '') : it.title}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase', color: colorOf(it.kind, it.size), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.kind === 'Main Mission' ? `Main Mission · ${it.project || ''}` : `${it.kind} · ${SIZES[it.size]?.label || ''}`}</div>
            </div>
            <button onClick={() => act(async () => { const r = await equipObjective(it.id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, `Loaded: ${it.title} · timer on`)} title="Load onto the Loadout" style={{ ...btn(BLUE), padding: '3px 6px' }}><ArrowUpToLine size={10} /></button>
            {/* The far right is the Holster, as on a Loadout slot (David 11/17: "one that returns the mission to the holster"). */}
            <button onClick={() => act(() => returnToInventory(it.id), `Holstered: ${it.title}`)} title="Holster · Back to the Mission Board" aria-label={`Holster ${it.title}`} style={{ ...btn(INK2), padding: '3px 6px' }}><GlyphHolster size={12} /></button>
          </div>
        ) : (
          <div key={`empty-${i}`} style={{ height: tall ? 64 : 30, boxSizing: 'border-box', borderRadius: 8, border: `1px dashed ${alpha(GREEN, 33)}`, display: 'flex', alignItems: 'center', paddingLeft: 10, fontFamily: MONO, fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase', color: `${alpha(GREEN, 60)}` }}>{i + 1}</div>
        ))}
      </div>
    </div>
  )
}

// The Stash peek (David, 10/16): a light preview of a stashed item, not the whole Briefing. Refreshed 11/17 onto
// the card's look: the gate's number rides with its title, the mission under it, the facts as figures, the three
// round marks the card and the Board slot carry (the Stash lit, since that is where it is), and one gold door.
const GATE_NO = /^\s*(?:gate\s+)?(\d+)\s*[·.:)-]\s*/i
const SYSTEM_NOTE = /^(Promoted from project|Ad Hoc from a Claude session)/i
export function StashPeek({ it, act, onClose, onOpenFull, clips = 0, onFiles }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const color = colorOf(it.kind, it.size)
  const main = it.kind === 'Main Mission'
  const raw = main ? (it.task_text || it.title) : it.title
  const gate = main ? (GATE_NO.exec(raw) || [])[1] : null
  const title = main ? raw.replace(GATE_NO, '') : raw
  const of = main ? `${it.project || 'Main Mission'} · Main Mission` : [it.kind, SIZES[it.size]?.label].filter(Boolean).join(' · ')
  const miles = main ? MILES.gate : it.kind === 'Ad Hoc' ? MILES.adhoc : baseMiles(it.size)
  const note = it.description && !SYSTEM_NOTE.test(it.description) ? it.description : null
  const due = it.due_date ? new Date(`${it.due_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
  const load = () => { onClose(); act(async () => { const r = await equipObjective(it.id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, `Loaded: ${it.title} · timer on`) }
  const back = () => { onClose(); act(() => returnToInventory(it.id), `Holstered: ${it.title}`) }
  return (
    <div className="peek-veil" onClick={onClose}>
      <div className="peek" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} style={{ '--peek': color }}>
        <button className="peek-x" onClick={onClose} aria-label="Close" title="Close"><XIcon size={16} /></button>
        <div className="peek-head">
          <BadgeMedallion id={badgeFor(it)} size={54} color={color} />
          <div style={{ minWidth: 0 }}>
            <h3>{gate && <span className="gn">Gate {gate} · </span>}{title}</h3>
            <div className="of">{of}</div>
          </div>
        </div>
        {it.north_star && <div className="peek-star">{it.north_star}</div>}
        {note && <div className="peek-note">{note}</div>}
        <div className="peek-facts">
          <div><b>{it.slots}</b><span>Slot{it.slots === 1 ? '' : 's'}</span></div>
          <div><b>{miles}</b><span>Mile{miles === 1 ? '' : 's'} On Close{!main && (it.steps || []).length ? ', Plus Gates' : ''}</span></div>
          {onFiles && <button onClick={() => onFiles(it)} title="Open its files"><b className={clips ? '' : 'none'}>{clips}</b><span>File{clips === 1 ? '' : 's'}</span></button>}
          {due && <div><b className="date">{due}</b><span>Target Completion</span></div>}
        </div>
        <div className="peek-foot">
          <div className="brf-where" role="group" aria-label="Where this card is" style={{ marginTop: 0 }}>
            <button aria-label="Load onto the Loadout, clock on" title="Load · Onto the Loadout, clock on" onClick={load}><GlyphLoadout size={17} /></button>
            <button aria-label="Holster, back to the Mission Board" title="Holster · Back to the Mission Board" onClick={back}><GlyphHolster size={17} /></button>
            <button className="on" aria-pressed="true" aria-label="In the Stash" title="In the Stash"><GlyphStash size={17} /></button>
          </div>
          <span className="peek-place">In The Stash</span>
          <button className="peek-open" onClick={() => { onClose(); onOpenFull(it) }}>Open The Briefing</button>
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
function RoutineSlot({ tick, onChanged, onState }) {
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
  useEffect(() => { onState && onState(!!running) }, [running, onState])
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${alpha(GREEN, 33)}`, borderRadius: 10, background: 'rgba(67,211,146,0.05)', flex: '0 0 auto' }}>
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
    <div className="ld-running" style={{ ...slotBox(GREEN, 'rgba(169,201,232,0.08)'), minHeight: 0, flex: '0 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} color={GREEN} /><span style={{ fontSize: 12.5, fontWeight: 600, color: GREEN }}>Running · {fmtClock(mins)}</span><span style={{ flex: 1 }} />
        <span className="ld-slot-tag">Utility</span>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff', lineHeight: 1.3, flex: 1 }}>{running.subject}</div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, letterSpacing: '0.6px' }}>{chore ? 'Console chore' : `started by ${slugOf(running.event_id).includes('-') ? 'Lumen' : 'hand'}`}{running.special_notes === 'personal' ? ' · personal' : ' · logs to Harvest on stop'}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={stop} style={btn(GREEN, true)}><Square size={11} /> Stop</button>
      </div>
      {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{msg}</div>}
    </div>
  )
  // Nothing on: the Utility slot's empty face says so (David 11/17).
  return msg ? <div style={{ fontSize: 12.5, color: RED }}>{msg}</div> : null
}

export default function LoadoutPanel({ onChange, refreshKey = 0, bare = false }) {
  // Proposed Steps waiting on David (11/17): the count on the Loadout's button, read when the Board opens or refreshes.
  const [stepsWaiting, setStepsWaiting] = useState(null)
  const [routineOn, setRoutineOn] = useState(false)
  useEffect(() => { let on = true; loadSteps().then(d => { if (on) setStepsWaiting(d.proposals.filter(p => !d.rulings[p.id]).length) }).catch(() => {}); return () => { on = false } }, [refreshKey])
  const toSteps = () => { try { window.history.pushState({ page: 'main-missions' }, '', '#/main-missions/steps') } catch { /* no-op */ } window.dispatchEvent(new PopStateEvent('popstate')) }
  const [L, setL] = useState(null)
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(null)
  const [dispatch, setDispatch] = useState(null)
  const [filing, setFiling] = useState(null)
  const [blocked, setBlocked] = useState(null)   // { it, open }: an Extract refused because the item still has something open
  const [projects, setProjects] = useState([])
  const [msg, setMsg] = useState(null)
  const [recallOf, setRecallOf] = useState(null)
  const [yay, setYay] = useState(null)
  const [held, setHeld] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  const [peek, setPeek] = useState(null)
  const [filesOpen, setFilesOpen] = useState(null)   // null | { objectiveId, title } | {}
  const [clips, setClips] = useState({})
  // The Stash lives on the Console when the page offers the mount (David 10/25).
  const [stashNode, setStashNode] = useState(null)
  useEffect(() => { const n = document.getElementById('console-stash'); if (n) setStashNode(n) }, [])
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
    // Nothing extracts with something still open (David 11/16): the refusal lists it.
    try { const still = await stillOpen(it.id); if (still.count) { setBlocked({ it, open: still }); return } } catch { /* the Extract itself refuses */ }
    if (it.kind === 'Side Mission' || it.kind === 'Ad Hoc') {
      try { const p = await pockets(it.id); if (p.carrying) { const { data } = await supabase.from('objectives').select('*').eq('id', it.id).limit(1); if (data?.[0]) { setFiling({ o: data[0], p }); return } } } catch { /* fall through */ }
    }
    setOpen(it)
  }

  // Lay the missions into Primary and Secondary, one each (David 11/17); what does not fit is over capacity.
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
      <style>{`.board-slots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px } @media (max-width: 980px) { .board-slots { grid-template-columns: repeat(2, minmax(0, 1fr)) } }`}</style>
      {blocked && <StillOpen mission={blocked.it} open={blocked.open} onClose={() => { setBlocked(null); bump() }} onReady={() => { const it = blocked.it; setBlocked(null); extractGate(it) }} />}
      {open && <YayPage objectiveId={open.id} onClose={() => setOpen(null)} extract={{ item: open, onDone: (r) => { setMsg(`Extracted: ${open.title} · ${fmtClock(r.minutes)}${r.personal ? ' · personal' : ''}`); logBoard(`Extracted: ${open.title} · ${fmtClock(r.minutes)}`); bump() } }} />}
      {filing && <FileAway objective={filing.o} pockets={filing.p} onClose={() => setFiling(null)} onDone={({ filed, released }) => { const id = filing.o.id; setFiling(null); setMsg(`Filed ${filed.length} to the Archive · extracted ${filing.o.title} · ${released.minutes}m`); logBoard(`Extracted: ${filing.o.title} · filed ${filed.length} to the Archive`); bump(); setYay(id) }} />}
      {recallOf && <RecallModal objectiveId={recallOf.id} taskId={recallOf.task_id || null} title={recallOf.title} onClose={() => setRecallOf(null)} />}
      {logOpen && <ActivityLogModal onClose={() => setLogOpen(false)} />}
      {filesOpen && <LiveFilesModal onClose={() => setFilesOpen(null)} filter={filesOpen.objectiveId ? filesOpen : null} items={[...(L?.items || []).filter(x => !x.meeting).map(x => ({ ...x, stashed: false })), ...held.map(x => ({ ...x, stashed: true }))]} onChanged={refresh} />}
      {peek && <StashPeek it={peek} act={act} clips={clips[peek.id] || 0} onFiles={(x) => { setPeek(null); setFilesOpen({ objectiveId: x.id, title: x.kind === 'Main Mission' ? (x.task_text || x.title).replace(/^\s*(?:gate\s+)?\d+\s*[·.:)-]\s*/i, '') : x.title }) }} onClose={() => setPeek(null)} onOpenFull={(it) => openCard(it.id)} />}
      {yay && <YayPage objectiveId={yay} fresh onClose={() => setYay(null)} onOpenMission={(o) => { setYay(null); openCard(o.id) }} />}
      {dispatch && <DispatchModal item={dispatch} projects={projects} onClose={() => setDispatch(null)} onDone={(r) => { setDispatch(null); setMsg(`Dispatched: ${dispatch.title} · ${fmtClock(r.minutes)}${r.ported.length ? ` · ported ${r.ported.length}` : ' · nothing left'} · 1 mile on the next update`); logBoard(`Dispatched: ${dispatch.title} · ${fmtClock(r.minutes)}`); bump() }} />}
      {!L ? (
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, padding: '12px 0' }}>Reading the board</div>
      ) : (
        <>
          <div className="board-slots">
            {layout.placed.map(({ it, n }) => <FilledSlot key={it.id} it={it} n={n} act={act} onOpen={(it) => openCard(it.id)} onExtract={extractGate} onRecall={setRecallOf} dropFromStash={(id) => act(async () => { const r = await equipObjective(id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, 'Loaded from the Stash · timer on')} />)}
            {layout.empties.map(n => <EmptySlot key={`empty-${n}`} n={n} dropFromStash={(id) => act(async () => { const r = await equipObjective(id, { clock: true, ignoreStamina: true }); if (!r.ok) throw new Error(r.reasons.join(' · ')) }, 'Loaded from the Stash · timer on')} />)}
            {/* The Utility slot (David 11/17): a Console button, a meeting, or the unplanned. Never a mission. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, alignSelf: 'stretch' }}>
              {(L.meetings || []).map(it => <MeetingSlot key={it.id} it={it} act={act} />)}
              <RoutineSlot tick={tick} onChanged={bump} onState={setRoutineOn} />
              {(L.adhoc[0] || (!routineOn && !(L.meetings || []).length)) && <AdHocSlot item={L.adhoc[0] || null} act={act} onDispatch={setDispatch} onOpen={(it) => openCard(it.id)} onChanged={bump} onRecall={setRecallOf} />}
            </div>
            {!stashNode && <StashStack items={held} act={act} onOpen={setPeek} dropFromLoadout={(id) => act(() => stash(id), 'Stashed from the Loadout')} />}
          </div>
          {stashNode && createPortal(<StashStack column items={held} act={act} onOpen={setPeek} dropFromLoadout={(id) => act(() => stash(id), 'Stashed from the Loadout')} />, stashNode)}
          {(layout.overflow.length > 0 || L.adhoc.length > 1) && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 8 }}>
              {layout.overflow.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', flexWrap: 'wrap' }}>
                  <span onClick={() => openCard(it.id)} style={{ fontSize: 13, color: INK2, flex: 1, minWidth: 200, cursor: 'pointer' }}>{it.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{SIZES[it.size]?.label} · no slot free</span>
                  <button onClick={() => act(() => stash(it.id), `Stashed: ${it.title}`)} style={btn(INK2)}><Archive size={11} /> Stash</button>
                </div>
              ))}
              {L.adhoc.slice(1).map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', flexWrap: 'wrap' }}>
                  <span onClick={() => openCard(it.id)} style={{ fontSize: 13, color: INK2, flex: 1, minWidth: 200, cursor: 'pointer' }}>{it.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>Ad Hoc · waiting for the slot</span>
                </div>
              ))}
            </div>
          )}

          {/* Sessions holder removed from the Board (David 10/25); a session's item still carries its clock on the Activity Board. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {/* The Loadout's two doors (David 11/17): the Activity Log and the Proposed Steps waiting on his ruling. Live Files and Live Protocols left this row on his word. */}
            <button className="ld-btn" onClick={() => setLogOpen(true)}><ScrollText size={15} /> Activity Log</button>
            {/* At 15 or more waiting the button pulses red, and faster for every ten past that (David 11/17: "red pulse might
                be better? Faster ever extra 10 over i am"): 2.4s at 15, 1.8s at 25, 1.2s at 35, 0.6s from 45. */}
            <button className={`ld-btn${stepsWaiting >= CLEAR_AT ? ' over' : ''}`} style={stepsWaiting >= CLEAR_AT ? { animationDuration: `${Math.max(0.6, 2.4 - 0.6 * Math.floor((stepsWaiting - CLEAR_AT) / 10))}s` } : undefined} onClick={toSteps} title={stepsWaiting >= CLEAR_AT ? `${stepsWaiting} proposed steps are waiting on your Accept or Reject` : "What Lumen proposes to write on each mission's trail, waiting for Accept or Reject"}><Footprints size={15} /> Proposed Steps{stepsWaiting !== null && <span className={`n${stepsWaiting >= CLEAR_AT ? ' over' : ''}`}>{stepsWaiting}</span>}</button>
            {msg && msg.startsWith('Could not') && <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: RED, textTransform: 'uppercase' }}>{msg}</span>}
          </div>
        </>
      )}
    </Wrap>
  )
}
