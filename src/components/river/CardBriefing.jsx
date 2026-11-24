// The Briefing on a card, in three reads (David 11/11, choosing Option B of the mock-ups: "honestly,
// love B a lot ... What if the Trail has two faces, separated by a toggle ... Milestone Pill.... the
// list of Milestones (if the Mission Card itself is not a Milestone). Then, the Trail, historical.
// Then, a final that shows the 'end of the trail' as Polaris and any other things from the
// Milestones or the operation that indicates something else that needs to happen in the distance
// between where we are and where we are trying to go.")
//
//   Gates         the plan, when the card has gates (a Mythic). Hidden otherwise.
//   The Trail          what has come in and what has happened, oldest first, ending at You Are Here.
//   End Of The Trail   from here to Polaris: the stops still open, the target date, Polaris at the end.
//
// The stops (David 11/11): "i need a way to interact with the circles.... like click them when
// they're done. when i do something like that the lumen chat window should be able to notice and
// ask a question (push) ... when i click something on the path ahead indicating its been done, i
// should get a little animation or something." A stop is a step on the card. Click its circle and
// it closes with a flourish, the next move steps forward, and the Lumen panel is told (lib/path
// fireCardEvent), so Lumen asks his one question.
//
// Where stops come from (David 11/11): "shouldn't really be guess work. should be coming out of the
// work with lumen ... he should only be pulling the things i'm telling him. the card should always
// start as very very baasic, until i actually start doing things." So nothing here is suggested or
// inferred. A new card shows an empty path and a line to type the first stop on. Every stop says
// where it came from. Lumen's guessed next steps (the recall door) are gone from this page.
import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { ChevronDown, ChevronRight, Pencil, X as XMark } from 'lucide-react'
import { Label } from './canon'
import { addStep, toggleStep, removeStep, renameStep, setStepOrder } from '../../lib/objectives'
import { listPages, readPage } from '../../lib/workspace'
import { listBuilds } from '../../lib/lumenPanel'
import { listLiveFiles, isLink, isRequest } from '../../lib/livefiles'
import { readPath, noteSource, savePathSteps, sourceLine, blanksIn, excerpt, buildTrail, stamp, dueWords, fireCardEvent } from '../../lib/path'
import { fmtClock, equipObjective } from '../../lib/loadout'
import GatePage, { GateGlyph } from './GatePage'
import { ExtractMarker } from './glyphs'
import { openCard } from '../../lib/card'
import { hudConfirm, hudPrompt } from '../../lib/dialog'
import GateDebrief from './GateDebrief'
import { AwardYay } from './AwardYay'
import { fileEntry } from '../../lib/archive'
import { markPlayed } from '../../lib/yay'

// The Ledger's doors, as one object, so dev/briefing.html can run the page on sample data with no sign-in.
const LEDGER = { addStep, toggleStep, removeStep, setStepOrder, listPages, readPage, listBuilds, listLiveFiles, readPath, noteSource, savePathSteps }
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const NONE = []

// The drag (David 11/17: "the step button to drag is a little janky. is there a different package you can
// use to drive that?"). It runs on dnd-kit now, not the browser's own drag: the icon follows the pointer
// from the first move, the nearest place on the line lights without the line shifting, and it works by touch.
// A place is a hairline between two lines of the trail; it only listens while something it takes is in the air.
function Pick({ kind, title, onPlace }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `pick:${kind}`, data: { kind } })
  return <span ref={setNodeRef} className={`pick ${kind}`} title={title} style={{ opacity: isDragging ? 0.35 : 1 }} {...attributes} {...listeners} onClick={onPlace} onKeyDown={(e) => { if (e.key === 'Enter') onPlace() }}><b className="plus">+</b><i className="m" />{kind === 'gate' ? 'Gate' : 'Step'}</span>
}
// One tile on the side of the card: its name, a headline, one line under it, and where it leads.
function Tile({ label, big, unit, none = false, detail = null, bar = null, go = null, onGo }) {
  return (
    <div className={`brf-tile${go ? ' go' : ''}`} onClick={onGo} role={go ? 'button' : undefined} tabIndex={go ? 0 : undefined} onKeyDown={go ? (e) => { if (e.key === 'Enter') onGo() } : undefined} title={go || undefined}>
      <Label style={{ marginBottom: 0 }}>{label}</Label>
      <div className={`big${none ? ' none' : ''}`}>{big}<small>{unit}</small></div>
      <div className="line">{none ? 'Nothing to report thus far.' : detail}</div>
      {bar != null && <div className="brf-bar"><i style={{ width: `${100 * bar}%` }} /></div>}
      {go && <div className="to">{go}</div>}
    </div>
  )
}
function Place({ id, part, i, on, word }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { part, i }, disabled: !on })
  return <div ref={setNodeRef} className={`brf-place${isOver ? ' over' : ''}`} aria-hidden="true">{isOver && <span>{word}</span>}</div>
}
// The place nearest the pointer, up or down the line, while the pointer is over the trail's column.
const nearestPlace = ({ droppableContainers, droppableRects, pointerCoordinates }) => {
  if (!pointerCoordinates) return []
  let best = null
  for (const c of droppableContainers) {
    const r = droppableRects.get(c.id)
    if (!r || pointerCoordinates.x < r.left - 80 || pointerCoordinates.x > r.right + 40) continue
    const d = Math.abs(pointerCoordinates.y - r.top)
    if (!best || d < best.d) best = { c, d }
  }
  return best && best.d < 90 ? [{ id: best.c.id, data: { droppableContainer: best.c, value: best.d } }] : []
}
const Check = () => <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.8 5.4 4.2 7.6 8.3 2.6" fill="none" stroke="var(--hud-on-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>

// One template for every card (David 11/17, on the Main Mission page: "wouldn't this card look like the one
// we've been building out?"). A Side Mission, a gate's card and a Main Mission all draw this. The Main Mission
// page hands it its gates as the steps, plus the few things only it has:
//   hereText      the line for You Are Here (a mission has no clock of its own)
//   nextStepId    which open gate is the Next Move (the one on the Board, not simply the first)
//   stopExtra     (step, { takeOff }) => what sits under an open gate in place of its source line
//   extraTrail    lines for The Trail Back that come from elsewhere (each gate card's own story)
//   confirmClose  (step) => true to go on closing it;  onClosed (step) after it closed
//   onExtract     (step): the card hands a gate's Extract to its owner (the mission page runs the gate debrief)
// notesCount: how many notes the card holds, for the Notes box on its side (any card).
// sideFoot: what sits under the four tiles (the card's Loadout, Holster, Stash switch).
export default function CardBriefing({ tone = null, obj, root, kindLabel, steps = [], kids = [], boardItems = [], loaded = null, due = null, isGate = false, missionGates = [], mission = null, onOpenMission, onReload, onTab, onOpenCard, say, api = LEDGER, hereText = null, nextStepId = null, stopExtra = null, extraTrail = NONE, confirmClose = null, onClosed = null, onExtract = null, notesCount = null, sideFoot = null }) {
  // One line (David 11/17, on the two boxed reads: "one line, but make what is before or after collapsable
  // and expandable and the default view is where we are now, with the path forward expanded ... and the
  // trail behind collpased"). Every card opens that way; the folds are not kept between visits.
  // A gate holds no gates of its own (David 11/17: "we don't need the ability to annotate gates inside a gate
  // itself. but yes, each gate having its own trail and steps being added on the trail and having an
  // isolated work bench"). So a gate's card takes steps only; a mission's card takes both.
  const takesGates = !mission && !isGate
  const [behindOpen, setBehindOpen] = useState(false)
  const [aheadOpen, setAheadOpen] = useState(true)

  // What the card holds beside its steps: its Workbench tabs, its built pages, its files, and where each stop came from.
  const [side, setSide] = useState({ tabs: [], latest: null, builds: [], files: [], sources: {}, psteps: [] })
  useEffect(() => {
    let on = true
    const run = async () => {
      const [tabs, builds, files, pd] = await Promise.all([
        api.listPages(root).catch(() => []), api.listBuilds(root).catch(() => []),
        api.listLiveFiles({ objectiveId: obj.id }).then(r => r.rows || []).catch(() => []), api.readPath(root),
      ])
      let latest = null
      if (tabs[0] && tabs[0].words > 0) { try { const d = await api.readPage(root, tabs[0].slug); latest = { slug: tabs[0].slug, title: d.title, text: d.text } } catch { /* the tab stays a name on the trail */ } }
      if (on) setSide({ tabs, latest, builds, files, sources: pd.sources || {}, psteps: pd.steps || [] })
    }
    run()
    return () => { on = false }
  }, [api, root, obj.id, steps])

  const [closing, setClosing] = useState(null)        // { id, dy }: the stop whose circle was just clicked
  // Open a gate (David 11/19): its words, or the gate button beside them, open the gate's own page (river/GatePage.jsx).
  // A gate with its own card always opens that card's full page, from every door (David 11/23: "why do i have two
  // different access gates for a gate page?"); only a gate with no card opens the lighter page here.
  // The circle is the only thing on the trail that closes it.
  const [gateId, setGateId] = useState(null)
  const [madeGate, setMadeGate] = useState(null)       // the gate just set on the trail, until the card's list carries it
  const [justClosed, setJustClosed] = useState([])     // closed in this sitting: they stay on the path, struck, with Reopen
  const [fresh, setFresh] = useState(null)             // the stop that just became the next move
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  // By hand (David 11/17): "a little icon for a step and then an icon for a gate that i could drag to the
  // location of the line, where then a little modal pops up".
  const [drag, setDrag] = useState(null)               // 'step' | 'gate' while one is being dragged
  const dragged = useRef(false)                        // a drag just ended: the click that follows it is not a click
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const openSteps = steps.filter(s => !s.done)
  // A gate on a Side Mission's card extracts through the gate debrief, the way a Main Mission's does (David 11/24:
  // "i didn't get a debrief again"). A gate card's own steps and a dev harness's sample data keep the plain close.
  const debriefs = !onExtract && !isGate && api === LEDGER
  const [debriefOf, setDebriefOf] = useState(null)
  const [gateYay, setGateYay] = useState(null)
  const finishDebrief = async (st, record) => {
    await api.toggleStep(st.id, true)
    if (record) await fileEntry({ realm: (obj.tags || []).includes('personal') ? 'personal' : 'third-horizon', source_kind: 'objective', source_id: obj.id, source_title: obj.title, tags: ['gate'], kind: 'summary', title: `Gate ${gateN(st)} · ${st.text}`, summary: record, body: { achieved: record, gate_step_id: st.id } }).catch(e => console.warn('gate record', e.message))
    // The gate is closed in the Ledger by here. The card's refresh is not waited on past a few seconds.
    setJustClosed(j => [...j, st.id]); await Promise.race([Promise.resolve(onReload()).catch(() => {}), wait(6000)])
    try { if (onClosed) onClosed(st); else fireCardEvent({ item: { kind: 'objective', id: obj.id }, event: { kind: 'stop_closed', text: st.text, open: openSteps.filter(x => x.id !== st.id).map(x => x.text) } }) } catch (e) { console.warn('card event', e.message) }
    return { minutes: 0 }
  }
  // A Side Mission's gates are numbered by their place on the line, the way the gate page numbers them (David 11/24);
  // a Main Mission's gates keep the number the Ledger gives them. A gate card's own steps are not gates of their own.
  const gateN = (st) => st.n != null ? st.n : isGate ? null : (steps.findIndex(x => x.id === st.id) + 1) || null
  const shownClosed = steps.filter(s => s.done && justClosed.includes(s.id))
  const openKids = kids.filter(k => k.state !== 'released')
  const openBoard = boardItems.filter(t => t.status !== 'done')
  const baseStops = [
    ...shownClosed.map(s => ({ key: `s${s.id}`, type: 'step', done: true, text: s.text, step: s })),
    ...openSteps.map(s => ({ key: `s${s.id}`, type: 'step', text: s.text, step: s })),
    ...(isGate ? [] : openKids.map(k => ({ key: `k${k.id}`, type: 'gate', text: k.title, kid: k, n: kids.indexOf(k) + 1 }))),
    // A Main Mission gate's card tells its own story (David 11/17: "each gate probably needs its own story,
    // that feeds the meta story"): the one stop from the mission is this gate. The other gates are on the mission's trail.
    ...missionGates.filter(g => g.current && !g.done).map(g => ({ key: `g${g.id}`, type: 'mission', text: g.text, gate: g })),
    ...openBoard.map((t, i) => ({ key: `b${i}`, type: 'board', text: t.label, note: t.status === 'blocked' ? (t.note || 'Blocked') : t.status === 'inmotion' ? 'In motion in a Claude session' : `On the session board ${t.board || ''}`.trim(), blocked: t.status === 'blocked' })),
  ]
  // The card's own steps still ahead take their places among the gates: each sits after the stop it was dropped behind.
  const stops = [...baseStops]
  for (const ps of side.psteps.filter(x => !x.done && !x.vetted)) {
    const item = { key: ps.id, type: 'pstep', text: ps.text, ps }, at = stops.findIndex(x => x.key === ps.after)
    if (ps.after === '^') stops.unshift(item); else if (at >= 0) stops.splice(at + 1, 0, item); else stops.push(item)
  }
  const nextKey = (nextStepId != null && stops.some(s => s.key === `s${nextStepId}` && !s.done)) ? `s${nextStepId}` : (stops.find(s => !s.done && s.type !== 'mission' && s.type !== 'pstep') || {}).key || null
  const total = steps.length + (isGate ? 0 : kids.length)
  const closed = steps.filter(s => s.done).length + (isGate ? 0 : kids.filter(k => k.state === 'released').length)
  const thisGate = missionGates.find(g => g.current) || null

  const close = async (st, e) => {
    if (closing || busy) return
    const el = e.currentTarget.closest('.brf-stop'), nextEl = el?.nextElementSibling
    if (confirmClose && !(await confirmClose(st))) return
    setClosing({ id: st.id, dy: nextEl ? nextEl.offsetTop - el.offsetTop - 10 : 50 })
    const remaining = openSteps.filter(x => x.id !== st.id)
    try {
      // the flourish plays while the Ledger takes the mark
      await Promise.all([api.toggleStep(st.id, true), wait(780)])
      setJustClosed(j => [...j, st.id]); setFresh(remaining[0] ? `s${remaining[0].id}` : null)
      await onReload()
      if (onClosed) onClosed(st)
      else fireCardEvent({ item: { kind: 'objective', id: obj.id }, event: { kind: 'stop_closed', text: st.text, open: [...remaining.map(x => x.text), ...openKids.map(k => k.title)] } })
    } catch (err) { say(`Could not close it: ${err.message}`) } finally { setClosing(null) }
  }
  const reopen = async (st) => {
    if (busy) return
    setBusy(true)
    try { await api.toggleStep(st.id, false); setJustClosed(j => j.filter(id => id !== st.id)); await onReload() } catch (err) { say(`Could not reopen it: ${err.message}`) } finally { setBusy(false) }
  }
  // A gate's words can be changed where they are read (David 11/19).
  const rename = async (st) => {
    const text = String(await hudPrompt({ title: 'Gate', value: st.text }) || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    if (!text || text === st.text) return
    try { await (api.renameStep || renameStep)(st.id, text); await onReload() } catch (err) { say(`Could not rename it: ${err.message}`) }
  }
  // Close a gate from its own page: the same mark the circle makes, without the trail's flourish.
  const finishGate = async (st) => {
    if (busy) return
    if (onExtract) { setGateId(null); onExtract(st); return }
    if (debriefs) { setGateId(null); setDebriefOf(st); return }
    if (!await hudConfirm({ title: 'Extract This Gate?', message: st.text, confirm: 'Extract' })) return
    if (confirmClose && !(await confirmClose(st))) return
    setBusy(true)
    try {
      await api.toggleStep(st.id, true); setJustClosed(j => [...j, st.id]); await onReload()
      if (onClosed) onClosed(st)
      else fireCardEvent({ item: { kind: 'objective', id: obj.id }, event: { kind: 'stop_closed', text: st.text, open: openSteps.filter(x => x.id !== st.id).map(x => x.text) } })
    } catch (err) { say(`Could not close it: ${err.message}`) } finally { setBusy(false) }
  }
  const loadMission = async () => {
    try { const r = await equipObjective(obj.id); if (r && r.ok === false) say((r.reasons || []).join(' ') || 'It did not load.'); else { say('Loaded.'); await onReload() } } catch (err) { say(`Could not load it: ${err.message}`) }
  }
  const drop = async (st) => {
    if (!await hudConfirm({ title: 'Take this gate off the path?', message: st.text, confirm: 'Take It Off', danger: true })) return
    try { await api.removeStep(st.id); await onReload() } catch (err) { say(`Could not take it off: ${err.message}`) }
  }
  const add = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const row = await api.addStep(obj.id, text, steps.length)
      if (row?.id != null) await api.noteSource(root, row.id, { by: 'david', where: 'card' }).catch(() => {})
      setDraft(''); await onReload()
    } catch (err) { say(`Could not add it: ${err.message}`) } finally { setBusy(false) }
  }

  const trail = useMemo(() => {
    const own = buildTrail({ obj, kindLabel, steps, children: isGate ? [] : kids, files: side.files, tabs: side.tabs, builds: side.builds, psteps: side.psteps })
    return extraTrail.length ? [...own, ...extraTrail].sort((a, b) => String(a.at).localeCompare(String(b.at))) : own
  }, [obj, kindLabel, steps, kids, isGate, side, extraTrail])

  const savePsteps = async (fn) => { const doc = await api.savePathSteps(root, fn); setSide(x => ({ ...x, psteps: doc.steps || [] })) }
  // Set a step or a gate on the line. part is 'b' (the trail back; David's word for it, 11/17) or 'a' (the path forward); i is the place
  // it goes before (the trail's own index behind, the stop's ahead); none means the end of the line. A click
  // on the icon, with no drag, is the end too.
  const place = async (kind, part = 'a', i = null) => {
    setDrag(null)
    if (busy) return
    const onTrail = kind === 'step' && part === 'b'
    if (!onTrail) setAheadOpen(true)
    if (kind === 'gate' && !takesGates) return
    const ask = kind === 'gate'
      ? { title: 'A New Gate', message: 'What must be true for this mission to close. A gate pays 7 miles when it closes.', placeholder: 'What must be true', confirm: 'Add The Gate' }
      : onTrail
        ? { title: 'A Step On The Trail', message: 'What you did, in a line. It lands where you set it.', placeholder: 'What you did', confirm: 'Add The Step' }
        : { title: 'A Step Ahead', message: 'What is to be done, in a line. Click its circle when it is done and it moves to The Trail.', placeholder: 'What is to be done', confirm: 'Add The Step' }
    const text = String(await hudPrompt(ask) || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    if (!text) return
    setBusy(true)
    try {
      const now = new Date().toISOString()
      if (kind === 'step') {
        const row = { id: `p${Date.now().toString(36)}`, text, by: 'david', made_at: now }
        if (onTrail) {
          // between the line before and the line after; past the last line it is now
          const next = i == null ? null : trail[i] || null, prev = i == null ? null : trail[i - 1] || null
          const t = (ev) => new Date(ev.at).getTime()
          const at = !next ? now : new Date(prev ? (t(prev) + t(next)) / 2 : t(next) - 60000).toISOString()
          await savePsteps(list => [...list, { ...row, done: true, at }])
        } else await savePsteps(list => [...list, { ...row, done: false, at: null, after: i == null ? null : i === 0 ? '^' : stops[i - 1].key }])
      } else {
        const row = await api.addStep(obj.id, text, steps.length)
        if (row?.id != null) {
          await api.noteSource(root, row.id, { by: 'david', where: 'card' }).catch(() => {})
          // it goes ahead of the first open gate at or after where it was dropped
          const ahead = i == null ? null : stops.slice(i).find(x => x.type === 'step' && !x.done)
          if (ahead) { const ids = steps.map(x => x.id); ids.splice(ids.indexOf(ahead.step.id), 0, row.id); await api.setStepOrder(ids) }
        }
        await onReload()
        // a gate set on the trail opens on its own page (David 11/23: "not opening a new gate after i create one")
        if (row?.id != null) { setMadeGate(row); setGateId(row.id) }
      }
    } catch (err) { say(`Could not add it: ${err.message}`) } finally { setBusy(false) }
  }
  const finishStep = async (ps) => { try { await savePsteps(list => list.map(x => x.id === ps.id ? { ...x, done: true, at: new Date().toISOString() } : x)) } catch (err) { say(`Could not mark it: ${err.message}`) } }
  const dropStep = async (id, text) => {
    if (!await hudConfirm({ title: 'Take this step off the line?', message: text, confirm: 'Take It Off', danger: true })) return
    try { await savePsteps(list => list.filter(x => x.id !== id)) } catch (err) { say(`Could not take it off: ${err.message}`) }
  }
  // A place on the line takes a drop: a step anywhere, a gate only on the path forward.
  const takes = (part) => !!drag && (drag === 'step' || (part === 'a' && takesGates))
  const spot = (part, i) => <Place key={`p${part}${i}`} id={`${part}:${i}`} part={part} i={i} on={takes(part)} word={`Set The ${drag === 'gate' ? 'Gate' : 'Step'} Here`} />
  const fold = (open, toggle) => ({ role: 'button', tabIndex: 0, 'aria-expanded': open, onClick: toggle, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } } })
  const click = (kind) => () => { if (!dragged.current) place(kind) }
  const dragEnd = (e) => {
    const kind = e.active?.data?.current?.kind, to = e.over?.data?.current
    setDrag(null); setTimeout(() => { dragged.current = false }, 0)
    if (kind && to) place(kind, to.part, to.i)
  }
  const dw = due ? dueWords(due) : null
  const realFiles = side.files.filter(f => !isLink(f) && !isRequest(f))
  const blanks = side.latest ? blanksIn(side.latest.text).length : 0
  const mySteps = side.psteps.length, myStepsDone = side.psteps.filter(x => x.done).length, myStepsVetted = side.psteps.filter(x => x.vetted && !x.done).length
  const here = hereText || `${fmtClock(loaded?.minutes_today || 0)} on the clock today. ${loaded ? (loaded.equipped ? 'The clock is running.' : 'On the Loadout, clock off.') : 'Not on the Loadout.'}`

  return (
    <DndContext sensors={sensors} collisionDetection={nearestPlace} onDragStart={(e) => { dragged.current = true; setDrag(e.active?.data?.current?.kind || null) }} onDragEnd={dragEnd} onDragCancel={() => { setDrag(null); setTimeout(() => { dragged.current = false }, 0) }}>
    <div className="brf-grid">
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 500, fontSize: 20, color: 'var(--hud-ink)' }}>The Trail</div>
          {/* At the top of the trail, off the line, with a plus and no instructions (David 11/17: "I'll know to drag it"). */}
          <div className="brf-tray">
            <Pick kind="step" title="Drag a step onto the line, or click to set it at the end" onPlace={click('step')} />
            {takesGates && <Pick kind="gate" title="Drag a gate onto the path forward, or click to set it at the end" onPlace={click('gate')} />}
          </div>
        </div>
        <p className="brf-sub">{mission ? `${thisGate ? `This is gate ${thisGate.n} of ${missionGates.length}` : 'This is a gate'} on ${mission.name}. ` : ''}The trail back, where you are, and the path forward to Polaris.</p>
        <div className="brf-trail">
          <div className="brf-ev fold" {...fold(behindOpen, () => setBehindOpen(o => !o))}>
            <span className="chev">{behindOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
            <div className="what">The Trail Back<i>{trail.length} {trail.length === 1 ? 'line' : 'lines'}{!behindOpen && trail.length > 0 ? `, from ${stamp(trail[0].at)}` : ''}</i></div>
          </div>
          {behindOpen && trail.map((ev, i) => [
            spot('b', i),
            <div key={`${ev.at}${i}`} className={`brf-ev${ev.gate ? ' gate' : ''}${ev.vetted ? ' vetted' : ''}`}><div className="when">{stamp(ev.at)}<span className="kind">{ev.kind}</span></div><div className="what">{ev.text}{ev.pid && <button className="brf-tool" onClick={() => dropStep(ev.pid, ev.text)}>Take It Off</button>}</div>{ev.note && <div className="note" title={ev.note}>{ev.note}</div>}{ev.of && <div className="brf-of" onClick={() => onOpenCard && ev.of.objective_id && onOpenCard(ev.of.objective_id)} title="Open this gate's card">On Gate {ev.of.n}: {ev.of.text}</div>}</div>,
          ])}
          {spot('b', trail.length)}
          <div className="brf-ev here"><div className="when">You Are Here</div><div className="what">{here}</div></div>
          <div className="brf-ev fold" {...fold(aheadOpen, () => setAheadOpen(o => !o))}>
            <span className="chev">{aheadOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
            <div className="what">The Path Forward<i>{stops.filter(x => !x.done).length} open</i></div>
          </div>
              {aheadOpen && stops.map((s, si) => {
                const isNext = s.key === nextKey || (s.type === 'mission' && s.gate.current && !nextKey), isClosing = s.type === 'step' && closing?.id === s.step.id
                const src = s.type === 'step' ? sourceLine(s.step, side.sources) : null
                if (s.type === 'pstep') return [
                  spot('a', si),
                  <div key={s.key} className="brf-stop pstep">
                    <button className="hit" title="Click when it is done" aria-label={`Mark done: ${s.text}`} onClick={() => finishStep(s.ps)}><span className="o"><Check /></span></button>
                    <div className="what">{s.text}</div>
                    <div className="src">A step, from you, {stamp(s.ps.made_at)}<button className="tool gone" onClick={() => dropStep(s.ps.id, s.text)}>Take It Off</button></div>
                  </div>,
                ]
                return [
                  spot('a', si),
                  <div key={s.key} className={`brf-stop${s.done ? ' done' : isNext ? ' next' : ''}${isClosing ? ' closing' : ''}${fresh === s.key && !s.done ? ' fresh' : ''}`}>
                    {s.type === 'step'
                      ? <button className="hit" title={s.done ? 'Reopen it' : 'Mark it done (click the gate\'s words to open it)'} aria-label={`${s.done ? 'Reopen' : 'Mark done'}: ${s.text}`} onClick={(e) => s.done ? reopen(s.step) : close(s.step, e)}><span className="o"><Check /></span></button>
                      : <span className="hit still" title={s.type === 'gate' ? 'This gate closes on its own card' : s.type === 'mission' ? 'This gate closes on the mission\'s page, or on its own card once it is on the Board' : 'This one lives on a session board'}><span className="o" style={s.blocked ? { borderColor: 'var(--hud-warn)' } : undefined} /></span>}
                    {isClosing && <span className="brf-spark" style={{ '--dy': `${closing.dy}px` }} />}
                    {isNext && <div className="when">{s.type === 'mission' ? `Gate ${s.gate.n} · This Gate` : 'Next Move'}</div>}
                    <div className={`what${s.type === 'gate' || (s.type === 'step' && !s.done) ? ' link' : ''}`} title={s.type === 'step' && !s.done ? 'Open this gate' : undefined} onClick={s.type === 'gate' ? () => onOpenCard && onOpenCard(s.kid.id) : s.type === 'step' && !s.done ? () => (s.step.objective_id && s.step.objective_id !== obj.id ? openCard(s.step.objective_id) : setGateId(s.step.id)) : undefined}>{s.type === 'step' && gateN(s.step) != null && <span className="gn">Gate {gateN(s.step)}</span>}{s.text}{!s.done && (s.type === 'step' || s.type === 'gate') && <span style={{ display: 'inline-flex', gap: 7, marginLeft: 12, verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}><button className="gp-ic sm" style={tone ? { '--c': tone } : undefined} title="Open The Gate" aria-label={`Open the gate: ${s.text}`} onClick={() => s.type === 'gate' ? (onOpenCard && onOpenCard(s.kid.id)) : (s.step.objective_id && s.step.objective_id !== obj.id ? openCard(s.step.objective_id) : setGateId(s.step.id))}><GateGlyph size={13} /></button>{s.type === 'step' && <ExtractMarker size={28} color={tone || '#8ACAFF'} title="Extract · Close This Gate, Bank The Miles" onClick={(e) => { if (onExtract) { onExtract(s.step); return } if (debriefs) { setDebriefOf(s.step); return } const ev = { currentTarget: e.currentTarget }; hudConfirm({ title: 'Extract This Gate?', message: s.text, confirm: 'Extract' }).then(ok => { if (ok) close(s.step, ev) }) }} />}</span>}</div>
                    {s.done && <><span className="when">Closed just now</span><button className="tool" onClick={() => reopen(s.step)}>Reopen</button></>}
                    {!s.done && s.type === 'step' && (stopExtra ? stopExtra(s.step, { takeOff: () => drop(s.step) }) : <div className="src">{src.lead}{src.quote && <> <q>{src.quote}</q></>}<span className="gt-set" style={{ marginLeft: 10, verticalAlign: 'middle' }}><button className="gt-ic" title="Rename" aria-label={`Rename: ${s.text}`} onClick={() => rename(s.step)}><Pencil size={13} /></button><button className="gt-ic del" title="Take It Off" aria-label={`Take off: ${s.text}`} onClick={() => drop(s.step)}><XMark size={14} /></button></span></div>)}
                    {s.type === 'gate' && <div className="src">Gate {s.n} of {kids.length}{s.kid.due_date ? ` · ${dueWords(s.kid.due_date).short}` : ''}. It closes on its own card.</div>}
                    {/* The title is a few words; the rest of what came in with the gate reads here (David 11/18: "Other data goes into the briefing"). */}
                    {s.type === 'mission' && s.gate.details && <div className="more">{s.gate.details}</div>}
                    {s.type === 'mission' && <div className="src">Gate {s.gate.n} of {missionGates.length} on {mission?.name || 'the mission'}</div>}
                    {s.type === 'board' && <div className="src" style={s.blocked ? { color: 'var(--hud-warn)' } : undefined}>{s.note}</div>}
                  </div>,
                ]
              })}
              {aheadOpen ? spot('a', stops.length) : spot('a', null)}
              {/* Any mission takes as many gates as it needs (David 11/16), a Mythic included (11/17: one card for every mission). */}
              {aheadOpen && mission && onOpenMission && <div className="brf-ev go" onClick={onOpenMission}><div className="what">Every gate's story is on the mission's trail: open {mission.name}</div></div>}
              {aheadOpen && takesGates && (
                <div className="brf-stop">
                  <span className="hit still"><span className="o" style={{ borderStyle: 'dotted' }} /></span>
                  <div className="brf-add"><input value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder={stops.length ? 'Add a gate: what must be true' : 'The first gate: what must be true'} aria-label="Add a gate" maxLength={300} /></div>
                </div>
              )}
              {dw && <div className={`brf-ev mark${dw.late ? ' late' : ''}`}><div className="when">Target Completion</div><div className="what">{dw.text}{dw.late ? ' (past)' : ''}</div></div>}
              <div className={`brf-ev end${total > 0 && closed === total ? ' lit' : ''}`} style={{ paddingBottom: 0, cursor: 'pointer' }} onClick={() => onTab('polaris')} title={obj.north_star ? 'Open Polaris' : 'Set Polaris'}>
                <div className="when">Polaris</div>
                <div className={`what${obj.north_star || mission?.polaris ? '' : ' empty'}`}>{obj.north_star || mission?.polaris || 'No Polaris yet. What will be true when this is done?'}</div>
                {total > 0 && closed === total && <div style={{ fontSize: 14, color: 'var(--hud-ink-2)', marginTop: 8 }}>The trail is walked. If the star is true, close it out.</div>}
              </div>
        </div>
      </div>

      {/* The side of the card always shows (David 11/17: "I liked the gates thing ... love workbench too. and files."),
          as four tiles of one size, each led by a headline ("symmetric and carry some kind of headline.... even a giant
          0 or N/A or Nothing to Report Thus Far"). The count stays put; the other three open what they name. */}
      <div style={{ minWidth: 0 }}>
      <div className="brf-side">
        {takesGates
          ? <Tile label="Gates" big={total > 0 ? `${closed}` : '0'} unit={total > 0 ? `of ${total} closed` : 'gates'} none={total === 0} bar={total > 0 ? closed / total : null} />
          : <Tile label="Steps" big={mySteps > 0 ? `${myStepsDone}` : '0'} unit={mySteps > 0 ? `of ${mySteps} done` : 'steps'} none={mySteps === 0} detail={myStepsVetted ? `${myStepsVetted} archived as vetted.` : null} bar={mySteps > 0 ? myStepsDone / mySteps : null} />}
        <Tile label="On The Workbench" big={side.tabs.length + side.builds.length} unit={side.tabs.length + side.builds.length === 1 ? 'tab' : 'tabs'} none={!side.latest && side.tabs.length + side.builds.length === 0} go="Open The Workbench" onGo={() => onTab('workbench')}
          detail={side.latest ? <>"{excerpt(side.latest.text, 110)}"{blanks > 0 && <> · <b>{blanks} {blanks === 1 ? 'blank' : 'blanks'} open</b></>}</> : side.builds.length ? side.builds.slice(0, 3).map(b => b.title || b.slug).join(' · ') : side.tabs.length ? 'Nothing written yet.' : null} />
        <Tile label="Files" big={realFiles.length} unit={realFiles.length === 1 ? 'file' : 'files'} none={realFiles.length === 0} go="Open Files" onGo={() => onTab('files')}
          detail={realFiles[0] ? <>{realFiles[0].name}{realFiles.length > 1 && <> and {realFiles.length - 1} more</>}</> : null} />
        <Tile label="Notes" big={notesCount || 0} unit={notesCount === 1 ? 'note' : 'notes'} none={!notesCount} go="Open Notes" onGo={() => onTab('notes')} />
      </div>
      {sideFoot}
      </div>
    </div>
    {/* What is in the air: the same icon, following the pointer. */}
    <DragOverlay dropAnimation={null}>{drag ? <div className="brf-tray"><span className={`pick ${drag} held`}><i className="m" />{drag === 'gate' ? 'Gate' : 'Step'}</span></div> : null}</DragOverlay>
    {(() => { const g = gateId != null ? (steps.find(x => x.id === gateId) || (madeGate?.id === gateId ? madeGate : null)) : null; return g ? (
      <GatePage benchRoot={g.objective_id ? `objectives/${g.objective_id}` : null} tone={tone} filesFor={kindLabel !== 'Main Mission' ? obj.id : null} filesNote={kindLabel === 'Main Mission' ? { text: 'This gate has no card of its own, so it keeps no files. Files for it sit on the mission.', label: 'The Mission\'s Files', go: onTab ? () => { setGateId(null); onTab('files') } : null } : null} gate={g} gates={steps} root={root} missionTitle={obj.title || mission?.name || kindLabel} source={side.sources[String(g.id)] || null}
        onClose={() => setGateId(null)} onPick={(x) => { if (x.objective_id) { setGateId(null); openCard(x.objective_id) } else setGateId(x.id) }} onRename={rename} onExtract={finishGate}
        onLoad={kindLabel !== 'Main Mission' ? loadMission : null} />
    ) : null })()}
    {debriefOf && (
      <GateDebrief item={{ id: null, step_id: debriefOf.id, objective_id: obj.id, title: `Gate ${gateN(debriefOf)} · ${debriefOf.text}` }} tone={tone || undefined}
        onClose={() => setDebriefOf(null)} finish={(record) => finishDebrief(debriefOf, record)}
        onDone={(r, info) => { setDebriefOf(null); setGateYay(info || {}) }} />
    )}
    {gateYay && (
      <AwardYay title="Gate Extracted" sub={gateYay.gate ? `Gate ${gateYay.gate.n} · ${gateYay.gate.text}` : obj.title} awards={[{ badge: 'gate', n: 1, miles: 7 }]} banked={null}
        done={(gateYay.did || []).slice(0, 6).map(x => ({ tag: x.tag, color: '#B4A3E8', text: x.text }))}
        go={gateYay.next ? `Gate ${gateYay.next.n} · ${gateYay.next.text}` : 'Back To The Card'}
        onContinue={() => { if (gateYay.gate?.id != null) markPlayed(gateYay.gate.id); const nx = gateYay.next; setGateYay(null); if (nx && nx.step_id != null) setGateId(nx.step_id) }}
        lead={gateYay.next ? <GateGlyph size={17} /> : null} />
    )}
    </DndContext>
  )
}
