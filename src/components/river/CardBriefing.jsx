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
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Label } from './canon'
import { addStep, toggleStep, removeStep, setStepOrder, addMissionGate } from '../../lib/objectives'
import { listPages, readPage } from '../../lib/workspace'
import { listBuilds } from '../../lib/lumenPanel'
import { listLiveFiles, isLink, isRequest } from '../../lib/livefiles'
import { readPath, noteSource, savePathSteps, sourceLine, blanksIn, excerpt, buildTrail, stamp, dueWords, fireCardEvent } from '../../lib/path'
import { fmtClock } from '../../lib/loadout'
import { hudConfirm, hudPrompt } from '../../lib/dialog'

// The Ledger's doors, as one object, so dev/briefing.html can run the page on sample data with no sign-in.
const LEDGER = { addStep, toggleStep, removeStep, setStepOrder, addMissionGate, listPages, readPage, listBuilds, listLiveFiles, readPath, noteSource, savePathSteps }
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const Check = () => <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.8 5.4 4.2 7.6 8.3 2.6" fill="none" stroke="var(--hud-on-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function CardBriefing({ obj, root, kindLabel, steps = [], kids = [], boardItems = [], loaded = null, due = null, isGate = false, missionGates = [], mission = null, onOpenMission, onReload, onTab, onOpenCard, say, api = LEDGER }) {
  // One line (David 11/17, on the two boxed reads: "one line, but make what is before or after collapsable
  // and expandable and the default view is where we are now, with the path forward expanded ... and the
  // trail behind collpased"). Every card opens that way; the folds are not kept between visits.
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
  const [justClosed, setJustClosed] = useState([])     // closed in this sitting: they stay on the path, struck, with Reopen
  const [fresh, setFresh] = useState(null)             // the stop that just became the next move
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  // By hand (David 11/17): "a little icon for a step and then an icon for a gate that i could drag to the
  // location of the line, where then a little modal pops up".
  const [drag, setDrag] = useState(null)               // 'step' | 'gate' while one is being dragged
  const [over, setOver] = useState(null)               // the place on the line it is over

  const openSteps = steps.filter(s => !s.done)
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
  for (const ps of side.psteps.filter(x => !x.done)) {
    const item = { key: ps.id, type: 'pstep', text: ps.text, ps }, at = stops.findIndex(x => x.key === ps.after)
    if (ps.after === '^') stops.unshift(item); else if (at >= 0) stops.splice(at + 1, 0, item); else stops.push(item)
  }
  const nextKey = (stops.find(s => !s.done && s.type !== 'mission' && s.type !== 'pstep') || {}).key || null
  const total = steps.length + (isGate ? 0 : kids.length)
  const closed = steps.filter(s => s.done).length + (isGate ? 0 : kids.filter(k => k.state === 'released').length)
  const thisGate = missionGates.find(g => g.current) || null

  const close = async (st, e) => {
    if (closing || busy) return
    const el = e.currentTarget.closest('.brf-stop'), nextEl = el?.nextElementSibling
    setClosing({ id: st.id, dy: nextEl ? nextEl.offsetTop - el.offsetTop - 10 : 50 })
    const remaining = openSteps.filter(x => x.id !== st.id)
    try {
      // the flourish plays while the Ledger takes the mark
      await Promise.all([api.toggleStep(st.id, true), wait(780)])
      setJustClosed(j => [...j, st.id]); setFresh(remaining[0] ? `s${remaining[0].id}` : null)
      await onReload()
      fireCardEvent({ item: { kind: 'objective', id: obj.id }, event: { kind: 'stop_closed', text: st.text, open: [...remaining.map(x => x.text), ...openKids.map(k => k.title)] } })
    } catch (err) { say(`Could not close it: ${err.message}`) } finally { setClosing(null) }
  }
  const reopen = async (st) => {
    if (busy) return
    setBusy(true)
    try { await api.toggleStep(st.id, false); setJustClosed(j => j.filter(id => id !== st.id)); await onReload() } catch (err) { say(`Could not reopen it: ${err.message}`) } finally { setBusy(false) }
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

  const trail = useMemo(() => buildTrail({ obj, kindLabel, steps, children: isGate ? [] : kids, files: side.files, tabs: side.tabs, builds: side.builds, psteps: side.psteps }), [obj, kindLabel, steps, kids, isGate, side])

  const savePsteps = async (fn) => { const doc = await api.savePathSteps(root, fn); setSide(x => ({ ...x, psteps: doc.steps || [] })) }
  // Set a step or a gate on the line. part is 'b' (the trail back; David's word for it, 11/17) or 'a' (the path forward); i is the place
  // it goes before (the trail's own index behind, the stop's ahead); none means the end of the line. A click
  // on the icon, with no drag, is the end too.
  const place = async (kind, part = 'a', i = null) => {
    setDrag(null); setOver(null)
    if (busy) return
    const onTrail = kind === 'step' && part === 'b'
    if (!onTrail) setAheadOpen(true)
    const n = mission ? Math.max(0, ...missionGates.map(g => g.n)) + 1 : null
    const ask = kind === 'gate'
      ? (mission
        ? { title: `A New Gate On ${mission.name}`, message: `A gate belongs to the mission, so this one goes on ${mission.name} as gate ${n}. What must be true?`, placeholder: 'What must be true', confirm: 'Add The Gate' }
        : { title: 'A New Gate', message: 'What must be true for this mission to close. A gate pays 7 miles when it closes.', placeholder: 'What must be true', confirm: 'Add The Gate' })
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
      } else if (mission) {
        await api.addMissionGate(mission.id, n, text)
        say(`Added to ${mission.name} as gate ${n}.`)
        await onReload()
      } else {
        const row = await api.addStep(obj.id, text, steps.length)
        if (row?.id != null) {
          await api.noteSource(root, row.id, { by: 'david', where: 'card' }).catch(() => {})
          // it goes ahead of the first open gate at or after where it was dropped
          const ahead = i == null ? null : stops.slice(i).find(x => x.type === 'step' && !x.done)
          if (ahead) { const ids = steps.map(x => x.id); ids.splice(ids.indexOf(ahead.step.id), 0, row.id); await api.setStepOrder(ids) }
        }
        await onReload()
      }
    } catch (err) { say(`Could not add it: ${err.message}`) } finally { setBusy(false) }
  }
  const finishStep = async (ps) => { try { await savePsteps(list => list.map(x => x.id === ps.id ? { ...x, done: true, at: new Date().toISOString() } : x)) } catch (err) { say(`Could not mark it: ${err.message}`) } }
  const dropStep = async (id, text) => {
    if (!await hudConfirm({ title: 'Take this step off the line?', message: text, confirm: 'Take It Off', danger: true })) return
    try { await savePsteps(list => list.filter(x => x.id !== id)) } catch (err) { say(`Could not take it off: ${err.message}`) }
  }
  // A place on the line takes a drop: a step anywhere, a gate only on the path forward.
  const takes = (part) => !!drag && (part === 'a' || drag === 'step')
  const dropAt = (part, i) => takes(part) ? { onDragOver: (e) => { e.preventDefault(); if (over !== `${part}${i}`) setOver(`${part}${i}`) }, onDrop: (e) => { e.preventDefault(); place(drag, part, i) } } : {}
  const zone = (part, i) => takes(part) ? <div key={`z${part}${i}`} className={`brf-drop${over === `${part}${i}` ? ' over' : ''}`} {...dropAt(part, i)}>{over === `${part}${i}` && <span>Set The {drag === 'gate' ? 'Gate' : 'Step'} Here</span>}</div> : null
  const fold = (open, toggle) => ({ role: 'button', tabIndex: 0, 'aria-expanded': open, onClick: toggle, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } } })
  const pickUp = (kind) => ({
    draggable: true, role: 'button', tabIndex: 0,
    // the line changes a moment after the drag starts, so the browser keeps hold of what is being dragged
    onDragStart: (e) => { e.dataTransfer.setData('text/plain', `hud-trail:${kind}`); e.dataTransfer.effectAllowed = 'copy'; setTimeout(() => setDrag(kind), 0) },
    onDragEnd: () => { setDrag(null); setOver(null) },
    onClick: () => place(kind), onKeyDown: (e) => { if (e.key === 'Enter') place(kind) },
  })
  const dw = due ? dueWords(due) : null
  const realFiles = side.files.filter(f => !isLink(f) && !isRequest(f))
  const blanks = side.latest ? blanksIn(side.latest.text).length : 0
  const hasSide = total > 0 || !!side.latest || realFiles.length > 0
  const here = `${fmtClock(loaded?.minutes_today || 0)} on the clock today. ${loaded ? (loaded.equipped ? 'The clock is running.' : 'Holstered.') : 'Not on the Board.'}`

  return (
    <div className={`brf-grid${hasSide ? '' : ' solo'}`}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 500, fontSize: 20, color: 'var(--hud-ink)' }}>The Trail</div>
          <span style={{ flex: 1 }} />
          <div className="brf-tray">
            <span className="pick step" title="Drag a step onto the line, or click to set it at the end" {...pickUp('step')}><i className="m" />Step</span>
            <span className="pick gate" title="Drag a gate onto the path forward, or click to set it at the end" {...pickUp('gate')}><i className="m" />Gate</span>
            <span className="hint">Drag onto the line</span>
          </div>
        </div>
        <p className="brf-sub">{mission ? `${thisGate ? `This is gate ${thisGate.n} of ${missionGates.length}` : 'This is a gate'} on ${mission.name}. ` : ''}The trail back, where you are, and the path forward to Polaris.</p>
        <div className="brf-trail">
          <div className="brf-ev fold" {...fold(behindOpen, () => setBehindOpen(o => !o))} {...dropAt('b', trail.length)}>
            <span className="chev">{behindOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
            <div className="what">The Trail Back<i>{trail.length} {trail.length === 1 ? 'line' : 'lines'}{!behindOpen && trail.length > 0 ? `, from ${stamp(trail[0].at)}` : ''}</i></div>
          </div>
          {behindOpen && trail.map((ev, i) => [
            zone('b', i),
            <div key={`${ev.at}${i}`} className={`brf-ev${ev.gate ? ' gate' : ''}`} {...dropAt('b', i + 1)}><div className="when">{stamp(ev.at)}<span className="kind">{ev.kind}</span></div><div className="what">{ev.text}{ev.pid && <button className="brf-tool" onClick={() => dropStep(ev.pid, ev.text)}>Take It Off</button>}</div></div>,
          ])}
          {zone('b', trail.length)}
          <div className="brf-ev here" {...dropAt('b', trail.length)}><div className="when">You Are Here</div><div className="what">{here}</div></div>
          <div className="brf-ev fold" {...fold(aheadOpen, () => setAheadOpen(o => !o))} {...dropAt('a', null)}>
            <span className="chev">{aheadOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
            <div className="what">The Path Forward<i>{stops.filter(x => !x.done).length} open</i></div>
          </div>
              {aheadOpen && stops.map((s, si) => {
                const isNext = s.key === nextKey || (s.type === 'mission' && s.gate.current && !nextKey), isClosing = s.type === 'step' && closing?.id === s.step.id
                const src = s.type === 'step' ? sourceLine(s.step, side.sources) : null
                if (s.type === 'pstep') return [
                  zone('a', si),
                  <div key={s.key} className="brf-stop pstep" {...dropAt('a', si + 1)}>
                    <button className="hit" title="Click when it is done" aria-label={`Mark done: ${s.text}`} onClick={() => finishStep(s.ps)}><span className="o"><Check /></span></button>
                    <div className="what">{s.text}</div>
                    <div className="src">A step, from you, {stamp(s.ps.made_at)}<button className="tool gone" onClick={() => dropStep(s.ps.id, s.text)}>Take It Off</button></div>
                  </div>,
                ]
                return [
                  zone('a', si),
                  <div key={s.key} className={`brf-stop${s.done ? ' done' : isNext ? ' next' : ''}${isClosing ? ' closing' : ''}${fresh === s.key && !s.done ? ' fresh' : ''}`} {...dropAt('a', si + 1)}>
                    {s.type === 'step'
                      ? <button className="hit" title={s.done ? 'Reopen it' : 'Click when it is done'} aria-label={`${s.done ? 'Reopen' : 'Mark done'}: ${s.text}`} onClick={(e) => s.done ? reopen(s.step) : close(s.step, e)}><span className="o"><Check /></span></button>
                      : <span className="hit still" title={s.type === 'gate' ? 'This gate closes on its own card' : s.type === 'mission' ? 'This gate closes on the mission\'s page, or on its own card once it is on the Board' : 'This one lives on a session board'}><span className="o" style={s.blocked ? { borderColor: 'var(--hud-warn)' } : undefined} /></span>}
                    {isClosing && <span className="brf-spark" style={{ '--dy': `${closing.dy}px` }} />}
                    {isNext && <div className="when">{s.type === 'mission' ? 'This Gate' : 'Next Move'}</div>}
                    <div className={`what${s.type === 'gate' ? ' link' : ''}`} onClick={s.type === 'gate' ? () => onOpenCard && onOpenCard(s.kid.id) : undefined}>{s.text}</div>
                    {s.done && <><span className="when">Closed just now</span><button className="tool" onClick={() => reopen(s.step)}>Reopen</button></>}
                    {!s.done && s.type === 'step' && <div className="src">{src.lead}{src.quote && <> <q>{src.quote}</q></>}<button className="tool gone" onClick={() => drop(s.step)}>Take It Off</button></div>}
                    {s.type === 'gate' && <div className="src">Gate {s.n} of {kids.length}{s.kid.due_date ? ` · ${dueWords(s.kid.due_date).short}` : ''}. It closes on its own card.</div>}
                    {s.type === 'mission' && <div className="src">Gate {s.gate.n} of {missionGates.length} on {mission?.name || 'the mission'}</div>}
                    {s.type === 'board' && <div className="src" style={s.blocked ? { color: 'var(--hud-warn)' } : undefined}>{s.note}</div>}
                  </div>,
                ]
              })}
              {aheadOpen && zone('a', stops.length)}
              {/* Any mission takes as many gates as it needs (David 11/16), a Mythic included (11/17: one card for every mission). */}
              {aheadOpen && mission && onOpenMission && <div className="brf-ev go" onClick={onOpenMission}><div className="what">Every gate's story is on the mission's trail: open {mission.name}</div></div>}
              {aheadOpen && !mission && (
                <div className="brf-stop">
                  <span className="hit still"><span className="o" style={{ borderStyle: 'dotted' }} /></span>
                  <div className="brf-add"><input value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder={stops.length ? 'Add a gate: what must be true' : 'The first gate: what must be true'} aria-label="Add a gate" maxLength={300} /></div>
                </div>
              )}
              {dw && <div className={`brf-ev mark${dw.late ? ' late' : ''}`}><div className="when">Target Completion</div><div className="what">{dw.text}{dw.late ? ' (past)' : ''}</div></div>}
              <div className={`brf-ev end${total > 0 && closed === total ? ' lit' : ''}`} style={{ paddingBottom: 0 }}>
                <div className="when">Polaris</div>
                <div className={`what${obj.north_star || mission?.polaris ? '' : ' empty'}`} onClick={() => onTab('polaris')} title={obj.north_star ? 'Open Polaris' : 'Set Polaris'}>{obj.north_star || mission?.polaris || 'No Polaris yet. What will be true when this is done?'}</div>
                {total > 0 && closed === total && <div style={{ fontSize: 14, color: 'var(--hud-ink-2)', marginTop: 8 }}>The trail is walked. If the star is true, close it out.</div>}
              </div>
        </div>
      </div>

      {hasSide && (
        <div className="brf-side">
          {total > 0 && <div className="brf-card"><div className="n">{closed} of {total}<small>gates closed</small></div><div className="brf-bar"><i style={{ width: `${(100 * closed) / total}%` }} /></div></div>}
          {side.latest && (
            <div className="brf-card lead">
              <Label style={{ marginBottom: 2 }}>On The Workbench</Label>
              <div className="q">"{excerpt(side.latest.text)}"</div>
              <div className="f">{side.latest.title}{blanks > 0 && <> · <b>{blanks} {blanks === 1 ? 'blank' : 'blanks'} open</b></>}</div>
              <div style={{ marginTop: 12 }}><button className="brf-chip" onClick={() => onTab('workbench')}>Open The Workbench</button></div>
            </div>
          )}
          {realFiles.length > 0 && (
            <div className="brf-card">
              <Label style={{ marginBottom: 2 }}>Files</Label>
              {realFiles.slice(0, 3).map(f => <div key={f.id} className="brf-row" onClick={() => onTab('files')}><b>{f.name}</b><span>{stamp(f.created_at).split(' · ')[0]}</span></div>)}
              {realFiles.length > 3 && <div className="brf-row" onClick={() => onTab('files')}><b>{realFiles.length - 3} more</b></div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
