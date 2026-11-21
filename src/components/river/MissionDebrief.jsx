// The mission debrief (David 11/21). Third form, in his words: "same boxes, try a different format one more time. it
// comes as a pop up, not a separate page. Lumen briefs, pre-populates. if he doesn't KNOW a thing, he doesn't say a
// thing. then, a plus button for me to add context. then, finally, processing it all to do any closing tasks (like
// settting up new tasks or something) everything as authorized. nothing goes anywhere in the system on close
// without my blessing."
//
// So: the pop-up opens and Lumen fills the five boxes from the mission's record alone. The plus adds David's context
// and Lumen briefs again with it. Every line that would make or move something carries a check that starts off;
// the foot says exactly what Extract will do, and Extract does only that.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X, Sparkles, Plus } from 'lucide-react'
import { hudPrompt } from '../../lib/dialog'
import { listLiveFiles } from '../../lib/livefiles'
import { askDebrief } from '../../lib/lumenPanel'
import { ExtractMarker } from './glyphs'
import KindMark from './KindMark'

const PURPLE = '#B4A3E8'
const CSS = `
.db-veil { position: fixed; inset: 0; z-index: 300; background: rgba(5,14,24,.78); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 20px; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); color: #F3F1EA; }
.db { width: min(1080px, 100%); max-height: 92vh; overflow-y: auto; background: #0F2334; border: 1px solid rgba(255,255,255,.14); border-radius: 18px; box-shadow: 0 30px 90px rgba(0,0,0,.55); animation: dbin .2s ease both; }
@keyframes dbin { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.db-in { padding: 24px 28px 22px; }
.db-head { display: flex; align-items: center; gap: 14px; }
.db-head h1 { font: 500 28px/1.15 'Lora', Georgia, serif; letter-spacing: -.012em; margin: 0; flex: 1; min-width: 0; }
.db-count { font: 500 17px 'Lora', Georgia, serif; color: ${PURPLE}; white-space: nowrap; }
.db textarea { width: 100%; font: 400 15.5px/1.6 'Lora', Georgia, serif; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 12px 14px; resize: vertical; outline: none; box-sizing: border-box; }
.db textarea:focus { border-color: var(--hud-accent, #8ACAFF); }
.db-ic { width: 34px; height: 34px; border-radius: 99px; border: 1.5px solid var(--c, #8ACAFF); color: var(--c, #8ACAFF); background: transparent; display: inline-grid; place-items: center; cursor: pointer; padding: 0; flex-shrink: 0; transition: background .15s; }
.db-ic:hover:not(:disabled), .db-ic.on { background: color-mix(in srgb, var(--c, #8ACAFF) 20%, transparent); }
.db-ic:disabled { opacity: .5; cursor: wait; }
.db-ic.sm { width: 28px; height: 28px; }
.db-ic.big { width: 44px; height: 44px; }
.db-ic.thinking { animation: dbpulse 1.4s ease-in-out infinite; cursor: default; }
@keyframes dbpulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c, #8ACAFF) 55%, transparent) } 50% { box-shadow: 0 0 0 8px transparent } }
.db-band { display: flex; align-items: center; gap: 12px; font: 500 19px 'Lora', Georgia, serif; margin: 22px 0 0; }
.db-band::before { content: ""; width: 22px; height: 2px; background: var(--hud-accent, #8ACAFF); }
.db-band::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,.12); order: 1; }
.db-band > * { order: 2; }
.db-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 14px; }
.db-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 900px) { .db-grid, .db-grid.three { grid-template-columns: 1fr; } }
.db-card { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #11283c; padding: 16px 18px; min-width: 0; }
.db-card.full { margin-top: 14px; }
.db-card h3 { font: 500 17px 'Lora', Georgia, serif; margin: 0 0 8px; display: flex; align-items: center; gap: 9px; }
.db-n { width: 21px; height: 21px; border-radius: 99px; border: 1.3px solid ${PURPLE}; color: ${PURPLE}; font: 600 12px var(--font-sans, 'Instrument Sans', sans-serif); display: inline-grid; place-items: center; flex-shrink: 0; }
.db-r { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 14.5px; line-height: 1.35; }
.db-r:first-of-type { border-top: 0; }
.db-r > div { flex: 1; min-width: 0; }
.db-r small { display: block; color: rgba(243,241,234,.7); font-size: 12.5px; margin-top: 2px; }
.db-r.off > div { opacity: .45; }
.db-sw { display: inline-flex; border: 1px solid rgba(255,255,255,.12); border-radius: 99px; overflow: hidden; flex-shrink: 0; }
.db-sw button { font: 500 12.5px var(--font-sans, 'Instrument Sans', sans-serif); padding: 4px 10px; color: rgba(243,241,234,.7); background: transparent; border: 0; cursor: pointer; }
.db-sw button.on { background: color-mix(in srgb, ${PURPLE} 24%, transparent); color: #F3F1EA; }
.db-yn { display: inline-flex; gap: 7px; flex-shrink: 0; }
.db-end { margin-left: auto; display: inline-flex; align-items: center; gap: 10px; }
.db-tally { font: 400 13px var(--font-sans, 'Instrument Sans', sans-serif); color: rgba(243,241,234,.7); }
.db-files { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; }
.db-files .db-r:nth-of-type(2) { border-top: 0; }
@media (max-width: 900px) { .db-files { grid-template-columns: 1fr; } }
.db-ctx { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid rgba(138,202,255,.35); border-radius: 12px; background: rgba(138,202,255,.06); font: 400 15px/1.55 'Lora', Georgia, serif; margin-top: 10px; }
.db-ctx > div { flex: 1; white-space: pre-wrap; }
.db-foot { position: sticky; bottom: 0; display: flex; align-items: center; gap: 16px; padding: 14px 28px; border-top: 1px solid rgba(255,255,255,.14); background: #0D1D2C; border-radius: 0 0 18px 18px; }
.db-will { flex: 1; min-width: 0; font-size: 14.5px; line-height: 1.5; color: rgba(243,241,234,.86); }
.db-miles { font: 500 22px 'Lora', Georgia, serif; color: ${PURPLE}; white-space: nowrap; }
.db-err { font-size: 13.5px; color: #DE7E6E; }
`
const KEEP = [['file', 'File'], ['keep', 'Keep In Play'], ['drop', 'Drop']]
const KINDS = ['Bounty', 'Contract', 'Mythic', 'Main Mission']
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
// His blessing on one line: a check makes it, an X sets it aside. It starts unruled, which makes nothing.
function YN({ on, set }) {
  return (
    <span className="db-yn">
      <button type="button" className={`db-ic sm${on === true ? ' on' : ''}`} style={{ '--c': PURPLE }} title="Yes" aria-label="Yes" aria-pressed={on === true} onClick={() => set(on === true ? null : true)}><Check size={14} /></button>
      <button type="button" className={`db-ic sm${on === false ? ' on' : ''}`} style={{ '--c': '#DE7E6E' }} title="No" aria-label="No" aria-pressed={on === false} onClick={() => set(on === false ? null : false)}><X size={14} /></button>
    </span>
  )
}

// onDone({ achieved, notes, closeOpen, fileThem, files, drop, make }) closes the mission and makes only what was blessed.
// drafter and lister can be handed in (dev/mission-debrief.html runs this on sample data).
export default function MissionDebrief({ project, tasks, onClose, onDone, drafter = askDebrief, lister = listLiveFiles }) {
  const [files, setFiles] = useState(null)
  const [pick, setPick] = useState({})            // file id -> 'file' | 'keep' | 'drop' (Lumen's sorting, his to change)
  const [why, setWhy] = useState({})
  const [sortOk, setSortOk] = useState(null)      // his blessing on the sorting as a whole; off, every file stays in play
  const [notes, setNotes] = useState('')
  const [todo, setTodo] = useState([])
  const [hear, setHear] = useState([])
  const [missions, setMissions] = useState([])
  const [yes, setYes] = useState({})              // 'todo:<text>' | 'hear:<who>' | 'mission:<title>' -> true | false
  const [ctx, setCtx] = useState([])              // what David added
  const [closeOpen, setCloseOpen] = useState(false)
  const [asking, setAsking] = useState(false)
  const [briefed, setBriefed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const openTasks = (tasks || []).filter(t => t.status !== 'done')
  const closed = (tasks || []).length - openTasks.length
  const run = useRef(0)

  const brief = useCallback(async (fileRows, context) => {
    const me = ++run.current
    setAsking(true); setErr(null)
    try {
      const d = await drafter({ projectId: project.id, words: context.join('\n\n'), files: (fileRows || []).map(f => ({ id: f.id, name: f.name, note: f.note || '' })) })
      if (me !== run.current) return
      setNotes(d.closing_notes || '')
      setPick(p => ({ ...p, ...Object.fromEntries((d.files || []).map(f => [f.id, f.keep])) }))
      setWhy(Object.fromEntries((d.files || []).map(f => [f.id, f.why])))
      setTodo(d.still_to_happen || []); setHear(d.who_should_hear || []); setMissions(d.missions || [])
      setBriefed(true)
    } catch (e) { if (me === run.current) setErr(`Lumen could not brief it: ${e.message}`) } finally { if (me === run.current) setAsking(false) }
  }, [drafter, project.id])

  // Open: read what is in play, then Lumen briefs from the record alone.
  useEffect(() => {
    let on = true
    const oids = (tasks || []).map(t => t.objective_id).filter(Boolean)
    Promise.all([lister({ projectId: project.id }).catch(() => ({ rows: [] })), ...oids.map(id => lister({ objectiveId: id }).catch(() => ({ rows: [] })))])
      .then(rs => { if (!on) return; const seen = new Set(); const all = rs.flatMap(r => r.rows || []).filter(f => !seen.has(f.id) && seen.add(f.id)); setFiles(all); setPick(Object.fromEntries(all.map(f => [f.id, 'keep']))); brief(all, []) })
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !busy && !e.defaultPrevented) onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose, busy])

  const addContext = async () => {
    const t = String(await hudPrompt({ title: 'Your Context', multiline: true }) || '').trim()
    if (!t) return
    const next = [...ctx, t]; setCtx(next); brief(files, next)
  }
  const dropContext = (i) => { const next = ctx.filter((_, k) => k !== i); setCtx(next); brief(files, next) }
  const set = (k) => (v) => setYes(y => ({ ...y, [k]: v }))
  const blessed = { todo: todo.filter(x => yes[`todo:${x.text}`] === true), hear: hear.filter(x => yes[`hear:${x.who}`] === true), missions: missions.filter(x => yes[`mission:${x.title}`] === true) }
  const toFile = sortOk === true ? (files || []).filter(f => pick[f.id] === 'file') : []
  const toDrop = sortOk === true ? (files || []).filter(f => pick[f.id] === 'drop') : []
  // Exactly what Extract will do, said before he presses it.
  const will = [
    blessed.todo.length + blessed.hear.length ? plural(blessed.todo.length + blessed.hear.length, 'Bounty Made', 'Bounties Made') : null,
    blessed.missions.length ? plural(blessed.missions.length, 'Mission Made', 'Missions Made') : null,
    toFile.length ? plural(toFile.length, 'File Filed', 'Files Filed') : null,
    toDrop.length ? plural(toDrop.length, 'File Dropped', 'Files Dropped') : null,
    closeOpen && openTasks.length ? plural(openTasks.length, 'Open Gate Extracted', 'Open Gates Extracted') : null,
  ].filter(Boolean)

  const go = async () => {
    if (busy || asking) return
    setBusy(true); setErr(null)
    try {
      await onDone({ achieved: ctx.join('\n\n').trim() || notes.trim(), notes: ctx.length ? notes.trim() : '', closeOpen, fileThem: true, files: toFile, drop: toDrop, make: blessed })
    } catch (e) { setErr(e?.message || String(e)); setBusy(false) }
  }
  const tally = KEEP.map(([k, l]) => `${(files || []).filter(f => pick[f.id] === k).length} ${l}`).join(' · ')
  return (
    <div className="db-veil" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <style>{CSS}</style>
      <div className="db" role="dialog" aria-modal="true" aria-label={`Debrief: ${project.name}`}>
        <div className="db-in">
          <div className="db-head">
            <KindMark kind="Main Mission" size={46} color={PURPLE} />
            <h1>{project.name}</h1>
            <span className="db-count">{closed} Of {(tasks || []).length} Gates</span>
            <button type="button" className="db-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Not Yet" aria-label="Not yet, back to the mission" onClick={onClose} disabled={busy}><X size={14} /></button>
          </div>

          <div className="db-band">Lumen's Brief
            <span className={`db-ic sm${asking ? ' thinking' : ''}`} title={asking ? 'Lumen Is Reading The Record' : 'Lumen Has Briefed'} aria-label={asking ? 'Lumen is reading the record' : 'Lumen has briefed'}><Sparkles size={14} /></span>
          </div>
          {err && <div className="db-err" style={{ marginTop: 10 }}>{err}</div>}
          <div className="db-card full">
            <h3><span className="db-n">1</span>Closing Notes</h3>
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} aria-label="Closing notes" />
          </div>
          <div className="db-grid three">
            <div className="db-card">
              <h3><span className="db-n">2</span>Still To Happen</h3>
              {todo.map((x, i) => <div key={i} className={`db-r${yes[`todo:${x.text}`] === false ? ' off' : ''}`}><div>{x.text}{x.why && <small>{x.why}</small>}</div><YN on={yes[`todo:${x.text}`] ?? null} set={set(`todo:${x.text}`)} /></div>)}
            </div>
            <div className="db-card">
              <h3><span className="db-n">3</span>Missions That Came Out Of This One</h3>
              {missions.map((x, i) => <div key={i} className={`db-r${yes[`mission:${x.title}`] === false ? ' off' : ''}`}><button type="button" title={`${x.kind} · Click To Change`} aria-label={`Kind: ${x.kind}. Click to change`} onClick={() => setMissions(ms => ms.map((m, k) => k === i ? { ...m, kind: KINDS[(KINDS.indexOf(m.kind) + 1) % KINDS.length] } : m))} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'inline-flex' }}><KindMark kind={x.kind} size={30} color={PURPLE} /></button><div>{x.title}<small>{x.kind}{x.why ? ` · ${x.why}` : ''}</small></div><YN on={yes[`mission:${x.title}`] ?? null} set={set(`mission:${x.title}`)} /></div>)}
            </div>
            <div className="db-card">
              <h3><span className="db-n">4</span>Who Should Hear</h3>
              {hear.map((x, i) => <div key={i} className={`db-r${yes[`hear:${x.who}`] === false ? ' off' : ''}`}><div>{x.who}{x.why && <small>{x.why}</small>}</div><YN on={yes[`hear:${x.who}`] ?? null} set={set(`hear:${x.who}`)} /></div>)}
            </div>
          </div>
          <div className="db-card full">
            <h3><span className="db-n">5</span>Keep And File<span className="db-end"><span className="db-tally">{tally}</span><YN on={sortOk} set={setSortOk} /></span></h3>
            <div className="db-files">
              {(files || []).map(f => (
                <div key={f.id} className={`db-r${sortOk === true ? '' : ' off'}`}>
                  <div title={f.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}{why[f.id] && <small style={{ whiteSpace: 'normal' }}>{why[f.id]}</small>}</div>
                  <span className="db-sw" role="group" aria-label={`What to do with ${f.name}`}>{KEEP.map(([k, l]) => <button key={k} type="button" className={pick[f.id] === k ? 'on' : ''} aria-pressed={pick[f.id] === k} onClick={() => setPick(p => ({ ...p, [f.id]: k }))}>{l}</button>)}</span>
                </div>
              ))}
            </div>
          </div>
          {openTasks.length > 0 && (
            <div className="db-card full">
              <h3>{plural(openTasks.length, 'Gate', 'Gates')} Still Open<span className="db-end"><YN on={closeOpen ? true : null} set={(v) => setCloseOpen(v === true)} /></span></h3>
              {openTasks.map(t => <div key={t.id} className="db-r"><div>{String(t.text).replace(/^\s*(?:gate\s+)?\d+\s*[·.:)-]\s*/i, '')}</div></div>)}
            </div>
          )}

          <div className="db-band">Your Context
            <button type="button" className="db-ic" title="Add Context" aria-label="Add your context" onClick={addContext} disabled={busy}><Plus size={17} /></button>
          </div>
          {ctx.map((c, i) => <div key={i} className="db-ctx"><div>{c}</div><button type="button" className="db-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Take It Out" aria-label="Take this context out" onClick={() => dropContext(i)}><X size={13} /></button></div>)}
        </div>
        <div className="db-foot">
          <div className="db-will">{briefed || err ? (will.length ? will.join(' · ') : 'The Mission Closes. Nothing Else Is Made Or Moved.') : null}</div>
          <span className="db-miles">+100 Miles</span>
          <ExtractMarker size={44} color={PURPLE} title={busy ? 'Extracting' : 'Extract The Mission · 100 Miles'} onClick={go} />
        </div>
      </div>
    </div>
  )
}
