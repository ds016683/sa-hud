// The mission debrief (David 11/21: "i think it would be pretty fun to have a debref package. what needs to be kept
// and filed, what else needs to happen, does any other comunication need to occur. maybe i could type it in a box
// and then Lumen can recommend closing notes, organization, and any other missions that got blasted out of it").
// It takes the place of the old Mark Mission Complete box. David's words first; Lumen drafts five numbered parts
// from them and the mission's record; nothing is made until David checks it; the Extract marker closes the mission.
import { useEffect, useState } from 'react'
import { Check, X, Sparkles, ArrowLeft, Plus } from 'lucide-react'
import { hudPrompt } from '../../lib/dialog'
import { listLiveFiles } from '../../lib/livefiles'
import { askDebrief } from '../../lib/lumenPanel'
import { ExtractMarker } from './glyphs'
import KindMark from './KindMark'

const PURPLE = '#B4A3E8'
const CSS = `
.db { position: fixed; inset: 0; z-index: 300; background: #0F2334; color: #F3F1EA; overflow-y: auto; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); animation: dbin .2s ease both; }
@keyframes dbin { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.db-in { max-width: 1180px; margin: 0 auto; padding: 30px 44px 70px; }
.db-head { display: flex; align-items: center; gap: 16px; }
.db-head h1 { font: 500 34px/1.15 'Lora', Georgia, serif; letter-spacing: -.012em; margin: 0; flex: 1; min-width: 0; }
.db-count { font: 500 20px 'Lora', Georgia, serif; color: ${PURPLE}; white-space: nowrap; }
.db-star { font: italic 400 19px/1.45 'Lora', Georgia, serif; margin: 14px 0 0; max-width: 90ch; }
.db-q { font: 500 20px 'Lora', Georgia, serif; margin: 26px 0 10px; }
.db textarea { width: 100%; font: 400 16.5px/1.6 'Lora', Georgia, serif; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 14px 16px; resize: vertical; outline: none; box-sizing: border-box; }
.db textarea:focus { border-color: var(--hud-accent, #8ACAFF); }
.db-ask { display: flex; align-items: center; gap: 12px; margin: 16px 0 0; }
.db-ic { width: 34px; height: 34px; border-radius: 99px; border: 1.5px solid var(--c, #8ACAFF); color: var(--c, #8ACAFF); background: transparent; display: inline-grid; place-items: center; cursor: pointer; padding: 0; flex-shrink: 0; transition: background .15s; }
.db-ic:hover:not(:disabled), .db-ic.on { background: color-mix(in srgb, var(--c, #8ACAFF) 20%, transparent); }
.db-ic:disabled { opacity: .5; cursor: wait; }
.db-ic.sm { width: 28px; height: 28px; }
.db-ic.thinking { animation: dbpulse 1.4s ease-in-out infinite; }
@keyframes dbpulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c, #8ACAFF) 55%, transparent) } 50% { box-shadow: 0 0 0 7px transparent } }
.db-band { display: flex; align-items: center; gap: 14px; font: 500 22px 'Lora', Georgia, serif; margin: 34px 0 0; }
.db-band::before { content: ""; width: 26px; height: 2px; background: var(--hud-accent, #8ACAFF); }
.db-band::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,.12); }
.db-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; margin-top: 18px; }
@media (max-width: 1000px) { .db-three { grid-template-columns: 1fr; } }
.db-band + .db-card { margin-top: 18px; }
.db-add { margin-left: auto; }
.db-tally { margin-left: auto; font: 400 13.5px var(--font-sans, 'Instrument Sans', sans-serif); color: rgba(243,241,234,.7); }
.db-files { display: grid; grid-template-columns: 1fr 1fr; column-gap: 34px; }
.db-files .db-r:nth-of-type(2) { border-top: 0; }
@media (max-width: 900px) { .db-files { grid-template-columns: 1fr; } }
.db-two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 18px; }
@media (max-width: 900px) { .db-two { grid-template-columns: 1fr; } }
.db-card { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #11283c; padding: 20px 22px; }
.db-card.wide { margin-top: 22px; }
.db-card h3 { font: 500 19px 'Lora', Georgia, serif; margin: 0 0 12px; display: flex; align-items: center; gap: 10px; }
.db-n { width: 22px; height: 22px; border-radius: 99px; border: 1.3px solid ${PURPLE}; color: ${PURPLE}; font: 600 12.5px var(--font-sans, 'Instrument Sans', sans-serif); display: inline-grid; place-items: center; flex-shrink: 0; }
.db-r { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 14.5px; line-height: 1.35; }
.db-r:first-of-type { border-top: 0; }
.db-r > div { flex: 1; min-width: 0; }
.db-r small { display: block; color: rgba(243,241,234,.7); font-size: 12.5px; margin-top: 2px; }
.db-r.off > div { opacity: .45; }
.db-sw { display: inline-flex; border: 1px solid rgba(255,255,255,.12); border-radius: 99px; overflow: hidden; flex-shrink: 0; }
.db-sw button { font: 500 12.5px var(--font-sans, 'Instrument Sans', sans-serif); padding: 5px 11px; color: rgba(243,241,234,.7); background: transparent; border: 0; cursor: pointer; }
.db-sw button.on { background: color-mix(in srgb, ${PURPLE} 24%, transparent); color: #F3F1EA; }
.db-yn { display: inline-flex; gap: 7px; flex-shrink: 0; }
.db-foot { display: flex; align-items: center; gap: 16px; margin-top: 26px; border-top: 1px solid rgba(255,255,255,.12); padding-top: 20px; }
.db-miles { font: 500 26px 'Lora', Georgia, serif; color: ${PURPLE}; margin-left: auto; }
.db-err { font-size: 13.5px; color: #DE7E6E; }
`
const KEEP = [['file', 'File'], ['keep', 'Keep In Play'], ['drop', 'Drop']]
// A check and an X: on is true (make it), false (leave it), null (not ruled yet, which counts as leave it).
function YN({ on, set }) {
  return (
    <span className="db-yn">
      <button type="button" className={`db-ic sm${on === true ? ' on' : ''}`} style={{ '--c': PURPLE }} title="Yes" aria-label="Yes" aria-pressed={on === true} onClick={() => set(on === true ? null : true)}><Check size={14} /></button>
      <button type="button" className={`db-ic sm${on === false ? ' on' : ''}`} style={{ '--c': '#DE7E6E' }} title="No" aria-label="No" aria-pressed={on === false} onClick={() => set(on === false ? null : false)}><X size={14} /></button>
    </span>
  )
}

// onDone({ achieved, closeOpen, fileThem, files, drop, make }) closes the mission; make is what David checked.
// drafter and lister can be handed in (dev/mission-debrief.html runs this on sample data).
export default function MissionDebrief({ project, tasks, onClose, onDone, drafter = askDebrief, lister = listLiveFiles }) {
  const [words, setWords] = useState('')
  const [files, setFiles] = useState(null)
  const [pick, setPick] = useState({})            // file id -> 'file' | 'keep' | 'drop'
  const [why, setWhy] = useState({})              // file id -> Lumen's few words
  const [notes, setNotes] = useState('')
  const [yes, setYes] = useState({})              // 'todo:0' | 'hear:1' | 'mission:2' -> true | false
  // The three lists of What Comes Next: Lumen's lines, and any David adds himself with the plus (those start checked).
  const [todo, setTodo] = useState([])
  const [hear, setHear] = useState([])
  const [missions, setMissions] = useState([])
  const KINDS = ['Bounty', 'Contract', 'Mythic', 'Main Mission']
  const addOwn = async (key) => {
    const t = String(await hudPrompt({ title: key === 'todo' ? 'Still To Happen' : key === 'hear' ? 'Who Should Hear' : 'A Mission That Came Out Of This One' }) || '').replace(/\s+/g, ' ').trim()
    if (!t) return
    const list = key === 'todo' ? todo : key === 'hear' ? hear : missions
    const item = key === 'todo' ? { text: t, own: true } : key === 'hear' ? { who: t, own: true } : { title: t, kind: 'Bounty', own: true }
    ;(key === 'todo' ? setTodo : key === 'hear' ? setHear : setMissions)([...list, item])
    setYes(y => ({ ...y, [`${key === 'missions' ? 'mission' : key}:${list.length}`]: true }))
  }
  const [closeOpen, setCloseOpen] = useState(false)
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const openTasks = (tasks || []).filter(t => t.status !== 'done')
  const closed = (tasks || []).length - openTasks.length
  useEffect(() => {
    let on = true
    const oids = (tasks || []).map(t => t.objective_id).filter(Boolean)
    Promise.all([lister({ projectId: project.id }).catch(() => ({ rows: [] })), ...oids.map(id => lister({ objectiveId: id }).catch(() => ({ rows: [] })))])
      .then(rs => { if (!on) return; const seen = new Set(); const all = rs.flatMap(r => r.rows || []).filter(f => !seen.has(f.id) && seen.add(f.id)); setFiles(all); setPick(Object.fromEntries(all.map(f => [f.id, 'file']))) })
    return () => { on = false }
  }, [project.id, tasks, lister])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !busy) onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose, busy])
  const ask = async () => {
    if (!words.trim()) { setErr('Your words first. One sentence is enough.'); return }
    setAsking(true); setErr(null)
    try {
      const d = await drafter({ projectId: project.id, words: words.trim(), files: (files || []).map(f => ({ id: f.id, name: f.name, note: f.note || '' })) })
      setNotes(d.closing_notes || '')
      setPick(p => ({ ...p, ...Object.fromEntries((d.files || []).map(f => [f.id, f.keep])) }))
      setWhy(Object.fromEntries((d.files || []).map(f => [f.id, f.why])))
      // Lumen's lines replace his earlier ones; what David added by hand stays, still checked.
      const keep = (list, fresh) => [...fresh, ...list.filter(x => x.own)]
      const nt = keep(todo, d.still_to_happen || []), nh = keep(hear, d.who_should_hear || []), nm = keep(missions, d.missions || [])
      setTodo(nt); setHear(nh); setMissions(nm)
      const y = {}; nt.forEach((x, i) => { if (x.own) y[`todo:${i}`] = true }); nh.forEach((x, i) => { if (x.own) y[`hear:${i}`] = true }); nm.forEach((x, i) => { if (x.own) y[`mission:${i}`] = true })
      setYes(y)
    } catch (e) { setErr(`Lumen could not draft it: ${e.message}`) } finally { setAsking(false) }
  }
  const go = async () => {
    if (busy) return
    if (!words.trim()) { setErr('Your words first. One sentence is enough.'); return }
    setBusy(true); setErr(null)
    const picked = (key, list) => (list || []).filter((_, i) => yes[`${key}:${i}`] === true)
    try {
      await onDone({
        achieved: words.trim(), notes: notes.trim(), closeOpen,
        fileThem: true, files: (files || []).filter(f => pick[f.id] === 'file'), drop: (files || []).filter(f => pick[f.id] === 'drop'),
        make: { todo: picked('todo', todo), hear: picked('hear', hear), missions: picked('mission', missions) },
      })
    } catch (e) { setErr(e?.message || String(e)); setBusy(false) }
  }
  const set = (k) => (v) => setYes(y => ({ ...y, [k]: v }))
  return (
    <div className="db" role="dialog" aria-label={`Debrief: ${project.name}`}>
      <style>{CSS}</style>
      <div className="db-in">
        <div className="db-head">
          <button type="button" className="db-ic" title="Not Yet" aria-label="Not yet, back to the mission" onClick={onClose} disabled={busy}><ArrowLeft size={17} /></button>
          <KindMark kind="Main Mission" size={52} color={PURPLE} />
          <h1>{project.name}</h1>
          <span className="db-count">{closed} Of {(tasks || []).length} Gates</span>
        </div>
        {project.description && <div className="db-star">{project.description}</div>}

        {/* The order is the order of a debrief (David 11/21: "right functionaliy and domains but maybe not the best sequence"):
            what happened, what comes next, what gets put away. */}
        <div className="db-band">What Happened</div>
        <div className="db-two">
          <div className="db-card">
            <h3>Is It True? What Is Different Now?</h3>
            <textarea rows={7} value={words} onChange={e => setWords(e.target.value)} autoFocus aria-label="In your words" />
            <div className="db-ask">
              <button type="button" className={`db-ic${asking ? ' thinking' : ''}`} title="Lumen's Debrief" aria-label="Ask Lumen for the debrief" onClick={ask} disabled={asking || busy}><Sparkles size={16} /></button>
              {err && <span className="db-err">{err}</span>}
            </div>
          </div>
          <div className="db-card">
            <h3><span className="db-n">1</span>Closing Notes</h3>
            <textarea rows={9} value={notes} onChange={e => setNotes(e.target.value)} aria-label="Closing notes" style={{ fontSize: 15.5 }} />
          </div>
        </div>

        <div className="db-band">What Comes Next</div>
        <div className="db-three">
          <div className="db-card">
            <h3><span className="db-n">2</span>Still To Happen<button type="button" className="db-ic sm db-add" title="Add One" aria-label="Add something still to happen" onClick={() => addOwn('todo')}><Plus size={14} /></button></h3>
            {todo.map((x, i) => <div key={i} className={`db-r${yes[`todo:${i}`] === false ? ' off' : ''}`}><div>{x.text}{x.why && <small>{x.why}</small>}</div><YN on={yes[`todo:${i}`] ?? null} set={set(`todo:${i}`)} /></div>)}
          </div>
          <div className="db-card">
            <h3><span className="db-n">3</span>Missions That Came Out Of This One<button type="button" className="db-ic sm db-add" title="Add One" aria-label="Add a mission" onClick={() => addOwn('missions')}><Plus size={14} /></button></h3>
            {missions.map((x, i) => <div key={i} className={`db-r${yes[`mission:${i}`] === false ? ' off' : ''}`}><button type="button" title={`${x.kind} · Click To Change`} aria-label={`Kind: ${x.kind}. Click to change`} onClick={() => setMissions(ms => ms.map((m, k) => k === i ? { ...m, kind: KINDS[(KINDS.indexOf(m.kind) + 1) % KINDS.length] } : m))} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'inline-flex' }}><KindMark kind={x.kind} size={30} color={PURPLE} /></button><div>{x.title}<small>{x.kind}{x.why ? ` · ${x.why}` : ''}</small></div><YN on={yes[`mission:${i}`] ?? null} set={set(`mission:${i}`)} /></div>)}
          </div>
          <div className="db-card">
            <h3><span className="db-n">4</span>Who Should Hear<button type="button" className="db-ic sm db-add" title="Add One" aria-label="Add someone who should hear" onClick={() => addOwn('hear')}><Plus size={14} /></button></h3>
            {hear.map((x, i) => <div key={i} className={`db-r${yes[`hear:${i}`] === false ? ' off' : ''}`}><div>{x.who}{x.why && <small>{x.why}</small>}</div><YN on={yes[`hear:${i}`] ?? null} set={set(`hear:${i}`)} /></div>)}
          </div>
        </div>

        <div className="db-band">What Gets Put Away</div>
        <div className="db-card">
          <h3><span className="db-n">5</span>Keep And File<span className="db-tally">{KEEP.map(([k, l]) => `${(files || []).filter(f => pick[f.id] === k).length} ${l}`).join(' · ')}</span></h3>
          <div className="db-files">
            {(files || []).map(f => (
              <div key={f.id} className="db-r">
                <div title={f.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}{why[f.id] && <small style={{ whiteSpace: 'normal' }}>{why[f.id]}</small>}</div>
                <span className="db-sw" role="group" aria-label={`What to do with ${f.name}`}>{KEEP.map(([k, l]) => <button key={k} type="button" className={pick[f.id] === k ? 'on' : ''} aria-pressed={pick[f.id] === k} onClick={() => setPick(p => ({ ...p, [f.id]: k }))}>{l}</button>)}</span>
              </div>
            ))}
          </div>
        </div>
        {openTasks.length > 0 && (
          <div className="db-card wide">
            <h3>{openTasks.length} {openTasks.length === 1 ? 'Gate' : 'Gates'} Still Open</h3>
            {openTasks.map(t => <div key={t.id} className="db-r"><div>{String(t.text).replace(/^\s*(?:gate\s+)?\d+\s*[·.:)-]\s*/i, '')}</div></div>)}
            <div className="db-r"><div>Extract Them With The Mission<small>Each pays its gate. Left off, they stay open on the closed mission.</small></div><YN on={closeOpen ? true : false} set={(v) => setCloseOpen(v === true)} /></div>
          </div>
        )}

        <div className="db-foot">
          <span className="db-miles">+100 Miles</span>
          <ExtractMarker size={46} color={PURPLE} title={busy ? 'Extracting' : 'Extract The Mission · 100 Miles'} onClick={go} />
        </div>
      </div>
    </div>
  )
}
