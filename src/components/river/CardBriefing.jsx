// The Briefing on a card, in three reads (David 11/11, choosing Option B of the mock-ups: "honestly,
// love B a lot ... What if the Trail has two faces, separated by a toggle ... Milestone Pill.... the
// list of Milestones (if the Mission Card itself is not a Milestone). Then, the Trail, historical.
// Then, a final that shows the 'end of the trail' as Polaris and any other things from the
// Milestones or the operation that indicates something else that needs to happen in the distance
// between where we are and where we are trying to go.")
//
//   Milestones         the plan, when the card has milestones (a Mythic). Hidden otherwise.
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
import { Label } from './canon'
import { addStep, toggleStep, removeStep } from '../../lib/objectives'
import { listPages, readPage } from '../../lib/workspace'
import { listBuilds } from '../../lib/lumenPanel'
import { listLiveFiles, isLink, isRequest } from '../../lib/livefiles'
import { readPath, noteSource, sourceLine, blanksIn, excerpt, buildTrail, stamp, dueWords, fireCardEvent } from '../../lib/path'
import { fmtClock } from '../../lib/loadout'
import { hudConfirm } from '../../lib/dialog'

// The Ledger's doors, as one object, so dev/briefing.html can run the page on sample data with no sign-in.
const LEDGER = { addStep, toggleStep, removeStep, listPages, readPage, listBuilds, listLiveFiles, readPath, noteSource }
const READS = ['ms', 'trail', 'end']
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const Check = () => <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.8 5.4 4.2 7.6 8.3 2.6" fill="none" stroke="var(--hud-on-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function CardBriefing({ obj, root, kindLabel, steps = [], kids = [], boardItems = [], loaded = null, due = null, isMilestone = false, isMythic = false, onReload, onTab, onOpenCard, say, api = LEDGER }) {
  const hasMilestones = kids.length > 0 && !isMilestone
  const [read, setRead] = useState(() => { try { const v = localStorage.getItem('hud:briefing:read'); return READS.includes(v) ? v : 'end' } catch { return 'end' } })
  const face = read === 'ms' && !hasMilestones ? 'end' : read
  const pick = (v) => { setRead(v); try { localStorage.setItem('hud:briefing:read', v) } catch { /* private window */ } }

  // What the card holds beside its steps: its Workbench tabs, its built pages, its files, and where each stop came from.
  const [side, setSide] = useState({ tabs: [], latest: null, builds: [], files: [], sources: {} })
  useEffect(() => {
    let on = true
    const run = async () => {
      const [tabs, builds, files, pd] = await Promise.all([
        api.listPages(root).catch(() => []), api.listBuilds(root).catch(() => []),
        api.listLiveFiles({ objectiveId: obj.id }).then(r => r.rows || []).catch(() => []), api.readPath(root),
      ])
      let latest = null
      if (tabs[0] && tabs[0].words > 0) { try { const d = await api.readPage(root, tabs[0].slug); latest = { slug: tabs[0].slug, title: d.title, text: d.text } } catch { /* the tab stays a name on the trail */ } }
      if (on) setSide({ tabs, latest, builds, files, sources: pd.sources || {} })
    }
    run()
    return () => { on = false }
  }, [api, root, obj.id, steps])

  const [closing, setClosing] = useState(null)        // { id, dy }: the stop whose circle was just clicked
  const [justClosed, setJustClosed] = useState([])     // closed in this sitting: they stay on the path, struck, with Reopen
  const [fresh, setFresh] = useState(null)             // the stop that just became the next move
  const [allTrail, setAllTrail] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const openSteps = steps.filter(s => !s.done)
  const shownClosed = steps.filter(s => s.done && justClosed.includes(s.id))
  const openKids = kids.filter(k => k.state !== 'released')
  const openBoard = boardItems.filter(t => t.status !== 'done')
  const stops = [
    ...shownClosed.map(s => ({ key: `s${s.id}`, type: 'step', done: true, text: s.text, step: s })),
    ...openSteps.map(s => ({ key: `s${s.id}`, type: 'step', text: s.text, step: s })),
    ...(isMilestone ? [] : openKids.map(k => ({ key: `k${k.id}`, type: 'milestone', text: k.title, kid: k, n: kids.indexOf(k) + 1 }))),
    ...openBoard.map((t, i) => ({ key: `b${i}`, type: 'board', text: t.label, note: t.status === 'blocked' ? (t.note || 'Blocked') : t.status === 'inmotion' ? 'In motion in a Claude session' : `On the session board ${t.board || ''}`.trim(), blocked: t.status === 'blocked' })),
  ]
  const nextKey = (stops.find(s => !s.done) || {}).key || null
  const total = steps.length + (isMilestone ? 0 : kids.length)
  const closed = steps.filter(s => s.done).length + (isMilestone ? 0 : kids.filter(k => k.state === 'released').length)

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
    if (!await hudConfirm({ title: 'Take this stop off the path?', message: st.text, confirm: 'Take It Off', danger: true })) return
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
    } catch (err) { say(/at most/.test(err.message) ? 'Could not add it: a card holds five stops at most.' : `Could not add it: ${err.message}`) } finally { setBusy(false) }
  }

  const trail = useMemo(() => buildTrail({ obj, kindLabel, steps, children: isMilestone ? [] : kids, files: side.files, tabs: side.tabs, builds: side.builds }), [obj, kindLabel, steps, kids, isMilestone, side])
  const shownTrail = allTrail ? trail : trail.slice(-6)
  const dw = due ? dueWords(due) : null
  const realFiles = side.files.filter(f => !isLink(f) && !isRequest(f))
  const blanks = side.latest ? blanksIn(side.latest.text).length : 0
  const hasSide = total > 0 || !!side.latest || realFiles.length > 0
  const here = `${fmtClock(loaded?.minutes_today || 0)} on the clock today. ${loaded ? (loaded.equipped ? 'The clock is running.' : 'Holstered.') : 'Not on the Board.'}`

  return (
    <div className={`brf-grid${hasSide ? '' : ' solo'}`}>
      <div style={{ minWidth: 0 }}>
        <div className="brf-seg" role="tablist" aria-label="Read">
          {hasMilestones && <button role="tab" aria-selected={face === 'ms'} className={face === 'ms' ? 'on' : ''} onClick={() => pick('ms')}>Milestones<i>{kids.filter(k => k.state === 'released').length} of {kids.length}</i></button>}
          <button role="tab" aria-selected={face === 'trail'} className={face === 'trail' ? 'on' : ''} onClick={() => pick('trail')}>The Trail{trail.length > 0 && <i>{trail.length}</i>}</button>
          <button role="tab" aria-selected={face === 'end'} className={face === 'end' ? 'on' : ''} onClick={() => pick('end')}>End Of The Trail</button>
        </div>

        {face === 'ms' && (
          <div style={{ marginTop: 20 }}>
            <div className="brf-ms">
              {kids.map((k, i) => {
                const done = k.state === 'released', now = !done && k.id === (openKids[0] || {}).id
                return (
                  <button key={k.id} className={`brf-m${done ? ' closed' : now ? ' now' : ''}`} onClick={() => onOpenCard && onOpenCard(k.id)} title="Open this milestone's card">
                    <span className="dot">{done ? '✓' : i + 1}</span>
                    <span><span className="t" style={{ display: 'block' }}>{k.title}</span><span className="s" style={{ display: 'block' }}>{done ? `Closed${k.released_at ? ` ${stamp(k.released_at).split(' · ')[0]}` : ''}` : now ? 'Now' : 'Open'}{!done && k.due_date ? ` · ${dueWords(k.due_date).short}` : ''}</span></span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {face === 'trail' && (
          <>
            <p className="brf-sub">What has come in and what has happened, oldest first.</p>
            <div className="brf-trail">
              {trail.length > shownTrail.length && <div className="brf-ev more" onClick={() => setAllTrail(true)}><div className="what">{trail.length - shownTrail.length} earlier, from {stamp(trail[0].at)}</div></div>}
              {shownTrail.map((ev, i) => <div key={`${ev.at}${i}`} className="brf-ev"><div className="when">{stamp(ev.at)}<span className="kind">{ev.kind}</span></div><div className="what">{ev.text}</div></div>)}
              <div className="brf-ev here"><div className="when">You Are Here</div><div className="what">{here}</div></div>
              <div className="brf-ev go" style={{ paddingBottom: 0 }} onClick={() => pick('end')}><div className="what">See what is left, on End Of The Trail</div></div>
            </div>
          </>
        )}

        {face === 'end' && (
          <>
            <p className="brf-sub">{isMythic ? 'From where you are to Polaris. A Mythic\'s path is its milestones; each one closes on its own card.' : stops.some(s => !s.done) ? 'From where you are to Polaris: what still has to happen. Click a circle when it is done.' : 'From where you are to Polaris. The path fills from what you tell Lumen and what you add here.'}</p>
            <div className="brf-trail">
              {stops.map(s => {
                const isNext = s.key === nextKey, isClosing = s.type === 'step' && closing?.id === s.step.id
                const src = s.type === 'step' ? sourceLine(s.step, side.sources) : null
                return (
                  <div key={s.key} className={`brf-stop${s.done ? ' done' : isNext ? ' next' : ''}${isClosing ? ' closing' : ''}${fresh === s.key && !s.done ? ' fresh' : ''}`}>
                    {s.type === 'step'
                      ? <button className="hit" title={s.done ? 'Reopen it' : 'Click when it is done'} aria-label={`${s.done ? 'Reopen' : 'Mark done'}: ${s.text}`} onClick={(e) => s.done ? reopen(s.step) : close(s.step, e)}><span className="o"><Check /></span></button>
                      : <span className="hit still" title={s.type === 'milestone' ? 'A milestone closes on its own card' : 'This one lives on a session board'}><span className="o" style={s.blocked ? { borderColor: 'var(--hud-warn)' } : undefined} /></span>}
                    {isClosing && <span className="brf-spark" style={{ '--dy': `${closing.dy}px` }} />}
                    {isNext && <div className="when">Next Move</div>}
                    <div className={`what${s.type === 'milestone' ? ' link' : ''}`} onClick={s.type === 'milestone' ? () => onOpenCard && onOpenCard(s.kid.id) : undefined}>{s.text}</div>
                    {s.done && <><span className="when">Closed just now</span><button className="tool" onClick={() => reopen(s.step)}>Reopen</button></>}
                    {!s.done && s.type === 'step' && <div className="src">{src.lead}{src.quote && <> <q>{src.quote}</q></>}<button className="tool gone" onClick={() => drop(s.step)}>Take It Off</button></div>}
                    {s.type === 'milestone' && <div className="src">Milestone {s.n} of {kids.length}{s.kid.due_date ? ` · ${dueWords(s.kid.due_date).short}` : ''}. It closes on its own card.</div>}
                    {s.type === 'board' && <div className="src" style={s.blocked ? { color: 'var(--hud-warn)' } : undefined}>{s.note}</div>}
                  </div>
                )
              })}
              {/* No line to add a stop on a Mythic (David 11/11: "remove the add a stop line on a mythic"): its path is its
                  milestones, each a card of its own, and a step typed here would have paid 10 miles like one. */}
              {!isMythic && steps.length < 5 && (
                <div className="brf-stop">
                  <span className="hit still"><span className="o" style={{ borderStyle: 'dotted' }} /></span>
                  <div className="brf-add"><input value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder={stops.length ? 'Add a stop, in your words' : 'The first stop, in your words'} aria-label="Add a stop" maxLength={300} /></div>
                </div>
              )}
              {dw && <div className={`brf-ev mark${dw.late ? ' late' : ''}`}><div className="when">Target Completion</div><div className="what">{dw.text}{dw.late ? ' (past)' : ''}</div></div>}
              <div className={`brf-ev end${total > 0 && closed === total ? ' lit' : ''}`} style={{ paddingBottom: 0 }}>
                <div className="when">Polaris</div>
                <div className={`what${obj.north_star ? '' : ' empty'}`} onClick={() => onTab('polaris')} title={obj.north_star ? 'Open Polaris' : 'Set Polaris'}>{obj.north_star || 'No Polaris yet. What will be true when this is done?'}</div>
                {total > 0 && closed === total && <div style={{ fontSize: 14, color: 'var(--hud-ink-2)', marginTop: 8 }}>The trail is walked. If the star is true, close it out.</div>}
              </div>
            </div>
          </>
        )}
      </div>

      {hasSide && (
        <div className="brf-side">
          {total > 0 && <div className="brf-card"><div className="n">{closed} of {total}<small>stops closed</small></div><div className="brf-bar"><i style={{ width: `${(100 * closed) / total}%` }} /></div></div>}
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
