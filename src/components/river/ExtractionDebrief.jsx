// The extraction debrief (David 11/21): "we want an extraction debrief. the system knows a lot about the task by the
// time we're here. it should do a final pass on everything and build the mission narrative. What was the objective
// (polaris)? can the system confirm that it was done? what does this system need to see to confirm? what else needs
// to happen now? has the system verified that it's done."
//
// The pop-up opens, the system does its final pass (api/_extract.mjs) and Lumen comes back with the Polaris, the
// narrative, a verdict per gate with what it saw and what it would need to see, the loose ends, who is owed word,
// the missions that came out of it, and the files sorted. The plus adds David's context and it runs again. Every line
// that would make or move something carries a check that starts off; the foot says what Extract will do, and Extract
// does only that. The readiness score is Lumen's read of the record; the extraction is David's.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X, Sparkles, Plus, Eye, EyeOff, CircleAlert } from 'lucide-react'
import { hudPrompt } from '../../lib/dialog'
import { askExtraction } from '../../lib/lumenPanel'
import { ExtractMarker } from './glyphs'
import KindMark from './KindMark'

const PURPLE = '#B4A3E8', GREEN = '#7FC8A9', RED = '#DE7E6E', LABEL = '#7FA8D4'
const CSS = `
.xd-veil { position: fixed; inset: 0; z-index: 300; background: rgba(5,14,24,.78); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 20px; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); color: #F3F1EA; }
.xd { width: min(1120px, 100%); max-height: 92vh; overflow-y: auto; background: #0F2334; border: 1px solid rgba(255,255,255,.14); border-radius: 18px; box-shadow: 0 30px 90px rgba(0,0,0,.55); animation: xdin .2s ease both; }
@keyframes xdin { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.xd-in { padding: 24px 28px 22px; }
.xd-head { display: flex; align-items: center; gap: 14px; }
.xd-head h1 { font: 500 28px/1.15 'Lora', Georgia, serif; letter-spacing: -.012em; margin: 0; flex: 1; min-width: 0; }
.xd-count { font: 500 17px 'Lora', Georgia, serif; color: ${PURPLE}; white-space: nowrap; }
.xd textarea { width: 100%; font: 400 15.5px/1.6 'Lora', Georgia, serif; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 12px 14px; resize: vertical; outline: none; box-sizing: border-box; }
.xd textarea:focus { border-color: var(--hud-accent, #8ACAFF); }
.xd-ic { width: 34px; height: 34px; border-radius: 99px; border: 1.5px solid var(--c, #8ACAFF); color: var(--c, #8ACAFF); background: transparent; display: inline-grid; place-items: center; cursor: pointer; padding: 0; flex-shrink: 0; transition: background .15s; }
.xd-ic:hover:not(:disabled), .xd-ic.on { background: color-mix(in srgb, var(--c, #8ACAFF) 20%, transparent); }
.xd-ic:disabled { opacity: .5; cursor: wait; }
.xd-ic.sm { width: 28px; height: 28px; }
.xd-ic.thinking { animation: xdpulse 1.4s ease-in-out infinite; cursor: default; }
@keyframes xdpulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c, #8ACAFF) 55%, transparent) } 50% { box-shadow: 0 0 0 8px transparent } }
.xd-band { display: flex; align-items: center; gap: 12px; font: 500 19px 'Lora', Georgia, serif; margin: 22px 0 0; }
.xd-band::before { content: ""; width: 22px; height: 2px; background: var(--hud-accent, #8ACAFF); }
.xd-band::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,.12); order: 1; }
.xd-band > * { order: 2; }
.xd-facts { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-top: 12px; }
.xd-fact { font-size: 13.5px; line-height: 1.3; padding: 6px 11px; border: 1px solid rgba(255,255,255,.12); border-radius: 99px; color: rgba(243,241,234,.86); display: inline-flex; align-items: center; gap: 7px; }
.xd-fact b { font-weight: 600; color: #F3F1EA; }
.xd-fact.bad { border-color: color-mix(in srgb, ${RED} 50%, transparent); }
.xd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 14px; }
.xd-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 900px) { .xd-grid, .xd-grid.three { grid-template-columns: 1fr; } }
.xd-card { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #11283c; padding: 16px 18px; min-width: 0; }
.xd-card.full { margin-top: 14px; }
.xd-card h3 { font: 500 17px 'Lora', Georgia, serif; margin: 0 0 8px; display: flex; align-items: center; gap: 9px; }
.xd-n { width: 21px; height: 21px; border-radius: 99px; border: 1.3px solid ${PURPLE}; color: ${PURPLE}; font: 600 12px var(--font-sans, 'Instrument Sans', sans-serif); display: inline-grid; place-items: center; flex-shrink: 0; }
.xd-pol { display: flex; gap: 18px; align-items: flex-start; }
.xd-pol > div:first-child { flex: 1; min-width: 0; font: 400 16.5px/1.55 'Lora', Georgia, serif; }
.xd-pol small, .xd-src { display: block; color: rgba(243,241,234,.65); font: 400 13px/1.4 var(--font-sans, 'Instrument Sans', sans-serif); margin-top: 6px; }
.xd-ring { width: 92px; height: 92px; flex-shrink: 0; position: relative; display: grid; place-items: center; }
.xd-ring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.xd-ring b { font: 500 26px 'Lora', Georgia, serif; }
.xd-ring span { position: absolute; bottom: -20px; left: 0; right: 0; text-align: center; font-size: 12.5px; color: rgba(243,241,234,.7); white-space: nowrap; }
.xd-v { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 3px 10px; border-radius: 99px; border: 1px solid var(--c); color: var(--c); white-space: nowrap; }
.xd-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 6px; }
.xd-table th { text-align: left; font-weight: 500; color: ${LABEL}; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,.12); vertical-align: bottom; }
.xd-table td { padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,.07); vertical-align: top; line-height: 1.4; }
.xd-table ul { margin: 0; padding-left: 16px; color: rgba(243,241,234,.86); }
.xd-table li { margin: 1px 0; }
.xd-table .need { color: rgba(243,241,234,.86); }
.xd-r { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 14.5px; line-height: 1.35; }
.xd-r:first-of-type { border-top: 0; }
.xd-r > div { flex: 1; min-width: 0; }
.xd-r small { display: block; color: rgba(243,241,234,.7); font-size: 12.5px; margin-top: 2px; }
.xd-r.off > div { opacity: .45; }
.xd-sw { display: inline-flex; border: 1px solid rgba(255,255,255,.12); border-radius: 99px; overflow: hidden; flex-shrink: 0; }
.xd-sw button { font: 500 12.5px var(--font-sans, 'Instrument Sans', sans-serif); padding: 4px 10px; color: rgba(243,241,234,.7); background: transparent; border: 0; cursor: pointer; }
.xd-sw button.on { background: color-mix(in srgb, ${PURPLE} 24%, transparent); color: #F3F1EA; }
.xd-yn { display: inline-flex; gap: 7px; flex-shrink: 0; }
.xd-end { margin-left: auto; display: inline-flex; align-items: center; gap: 10px; }
.xd-tally { font: 400 13px var(--font-sans, 'Instrument Sans', sans-serif); color: rgba(243,241,234,.7); }
.xd-files { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; }
.xd-files .xd-r:nth-of-type(2) { border-top: 0; }
@media (max-width: 900px) { .xd-files { grid-template-columns: 1fr; } }
.xd-ctx { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid rgba(138,202,255,.35); border-radius: 12px; background: rgba(138,202,255,.06); font: 400 15px/1.55 'Lora', Georgia, serif; margin-top: 10px; }
.xd-ctx > div { flex: 1; white-space: pre-wrap; }
.xd-foot { position: sticky; bottom: 0; display: flex; align-items: center; gap: 16px; padding: 14px 28px; border-top: 1px solid rgba(255,255,255,.14); background: #0D1D2C; border-radius: 0 0 18px 18px; }
.xd-will { flex: 1; min-width: 0; font-size: 14.5px; line-height: 1.5; color: rgba(243,241,234,.86); }
.xd-will b { font-weight: 600; color: #F3F1EA; }
.xd-miles { font: 500 22px 'Lora', Georgia, serif; color: ${PURPLE}; white-space: nowrap; }
.xd-err { font-size: 13.5px; color: ${RED}; }
.xd-empty { font-size: 13.5px; color: rgba(243,241,234,.6); padding: 6px 0; }
`
const KEEP = [['file', 'File'], ['keep', 'Keep In Play'], ['drop', 'Drop']]
const KINDS = ['Bounty', 'Contract', 'Mythic', 'Main Mission']
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const VERDICT = { confirmed: { word: 'Confirmed', c: GREEN, Icon: Check }, not_confirmed: { word: 'Not Confirmed', c: RED, Icon: X }, cannot_see: { word: 'Cannot See', c: LABEL, Icon: EyeOff } }

function Verdict({ v }) {
  const d = VERDICT[v] || VERDICT.cannot_see
  return <span className="xd-v" style={{ '--c': d.c }}><d.Icon size={13} />{d.word}</span>
}
// His blessing on one line: a check makes it, an X sets it aside. It starts unruled, which makes nothing.
function YN({ on, set }) {
  return (
    <span className="xd-yn">
      <button type="button" className={`xd-ic sm${on === true ? ' on' : ''}`} style={{ '--c': PURPLE }} title="Yes" aria-label="Yes" aria-pressed={on === true} onClick={() => set(on === true ? null : true)}><Check size={14} /></button>
      <button type="button" className={`xd-ic sm${on === false ? ' on' : ''}`} style={{ '--c': RED }} title="No" aria-label="No" aria-pressed={on === false} onClick={() => set(on === false ? null : false)}><X size={14} /></button>
    </span>
  )
}
function Ring({ value, verdict }) {
  const c = (VERDICT[verdict] || VERDICT.cannot_see).c
  const r = 40, len = 2 * Math.PI * r, on = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="xd-ring" title={`Readiness ${on} of 100`} aria-label={`Readiness ${on} of 100`}>
      <svg width="92" height="92" viewBox="0 0 92 92"><circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" /><circle cx="46" cy="46" r={r} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${len * on / 100} ${len}`} /></svg>
      <b style={{ color: c }}>{on}</b>
      <span>Readiness</span>
    </div>
  )
}

// onDone({ achieved, notes, closeOpen, fileThem, files, drop, make }) closes the mission and makes only what was blessed.
export default function ExtractionDebrief({ project, tasks, onClose, onDone, drafter = askExtraction }) {
  const [d, setD] = useState(null)                // the debrief as it came back
  const [narrative, setNarrative] = useState('')
  const [pick, setPick] = useState({})            // file id -> 'file' | 'keep' | 'drop' (Lumen's sorting, his to change)
  const [sortOk, setSortOk] = useState(null)      // his blessing on the sorting as a whole; off, every file stays in play
  const [yes, setYes] = useState({})              // 'todo:<text>' | 'hear:<who>' | 'mission:<title>' -> true | false
  const [missions, setMissions] = useState([])
  const [ctx, setCtx] = useState([])              // what David added
  const [closeOpen, setCloseOpen] = useState(false)
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const openTasks = (tasks || []).filter(t => t.status !== 'done')
  const closed = (tasks || []).length - openTasks.length
  const run = useRef(0)

  const brief = useCallback(async (context) => {
    const me = ++run.current
    setAsking(true); setErr(null)
    try {
      const x = await drafter({ projectId: project.id, words: context.join('\n\n') })
      if (me !== run.current) return
      setD(x); setNarrative(x.narrative || ''); setMissions(x.missions || [])
      setPick(Object.fromEntries((x.file_rows || []).map(f => [f.id, ((x.files || []).find(s => s.id === f.id) || {}).keep || 'keep'])))
    } catch (e) { if (me === run.current) setErr(`The final pass did not finish: ${e.message}`) } finally { if (me === run.current) setAsking(false) }
  }, [drafter, project.id])

  useEffect(() => { brief([]) }, [brief])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !busy && !e.defaultPrevented) onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose, busy])

  const addContext = async () => {
    const t = String(await hudPrompt({ title: 'Your Context', multiline: true }) || '').trim()
    if (!t) return
    const next = [...ctx, t]; setCtx(next); brief(next)
  }
  const dropContext = (i) => { const next = ctx.filter((_, k) => k !== i); setCtx(next); brief(next) }
  const set = (k) => (v) => setYes(y => ({ ...y, [k]: v }))
  const files = d?.file_rows || []
  const why = Object.fromEntries((d?.files || []).map(f => [f.id, f.why]))
  const todo = d?.what_now || [], hear = d?.who_should_hear || []
  const blessed = { todo: todo.filter(x => yes[`todo:${x.text}`] === true), hear: hear.filter(x => yes[`hear:${x.who}`] === true), missions: missions.filter(x => yes[`mission:${x.title}`] === true) }
  const toFile = sortOk === true ? files.filter(f => pick[f.id] === 'file') : []
  const toDrop = sortOk === true ? files.filter(f => pick[f.id] === 'drop') : []
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
      const record = [narrative.trim(), d?.overall?.basis ? `Verdict at extraction: ${VERDICT[d.overall.verdict]?.word || 'Cannot See'}, readiness ${d.overall.readiness} of 100. ${d.overall.basis}` : ''].filter(Boolean).join('\n\n')
      await onDone({ achieved: record, notes: ctx.join('\n\n').trim(), closeOpen, fileThem: true, files: toFile, drop: toDrop, make: blessed })
    } catch (e) { setErr(e?.message || String(e)); setBusy(false) }
  }
  const f = d?.facts
  const tally = KEEP.map(([k, l]) => `${files.filter(x => pick[x.id] === k).length} ${l}`).join(' · ')
  return (
    <div className="xd-veil" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <style>{CSS}</style>
      <div className="xd" role="dialog" aria-modal="true" aria-label={`Extraction debrief: ${project.name}`}>
        <div className="xd-in">
          <div className="xd-head">
            <KindMark kind="Main Mission" size={46} color={PURPLE} />
            <h1>{project.name}</h1>
            <span className="xd-count">{closed} Of {(tasks || []).length} Gates</span>
            <button type="button" className="xd-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Not Yet" aria-label="Not yet, back to the mission" onClick={onClose} disabled={busy}><X size={14} /></button>
          </div>

          <div className="xd-band">What The System Saw
            <span className={`xd-ic sm${asking ? ' thinking' : ''}`} title={asking ? 'The Final Pass Is Running' : 'The Final Pass Is Done'} aria-label={asking ? 'The final pass is running' : 'The final pass is done'}><Eye size={14} /></span>
          </div>
          {err && <div className="xd-err" style={{ marginTop: 10 }}>{err}</div>}
          {asking && !d && <div className="xd-empty">Reading every gate, card, tab, file, link, board and thread on the mission, then checking what still answers.</div>}
          {f && (
            <div className="xd-facts">
              <span className={`xd-fact${f.gates.open.length ? ' bad' : ''}`}><b>{f.gates.closed} Of {f.gates.total}</b> Gates Closed</span>
              {f.links.total > 0 && <span className={`xd-fact${f.links.alive < f.links.total ? ' bad' : ''}`}><b>{f.links.alive} Of {f.links.total}</b> Links Answer</span>}
              <span className="xd-fact"><b>{f.files.documents}</b> Documents · <b>{f.files.links}</b> Links In Play</span>
              <span className="xd-fact"><b>{f.tabs.total}</b> Workbench Tabs</span>
              {f.boards.map((b, i) => <span key={i} className="xd-fact"><b>{b.done} Of {b.total}</b> Session Items Done · {b.updated}</span>)}
              <span className="xd-fact"><b>{f.closing_words}</b> Closing Notes · <b>{f.thread}</b> Thread Lines · <b>{f.meetings}</b> Meetings</span>
              <span className="xd-fact">{f.first_day} To {f.last_day}</span>
            </div>
          )}

          <div className="xd-band">Lumen's Debrief
            <span className={`xd-ic sm${asking ? ' thinking' : ''}`} title={asking ? 'Lumen Is Reading The Record' : 'Lumen Has Briefed'} aria-label={asking ? 'Lumen is reading the record' : 'Lumen has briefed'}><Sparkles size={14} /></span>
          </div>
          <div className="xd-card full">
            <h3><span className="xd-n">1</span>Polaris{d && <span className="xd-end"><Verdict v={d.overall.verdict} /></span>}</h3>
            <div className="xd-pol">
              <div>{d ? d.polaris.statement || <span className="xd-empty">No Polaris is written on the card.</span> : <span className="xd-empty">…</span>}{d?.polaris.source && <small>From {d.polaris.source}</small>}{d?.overall.basis && <small>{d.overall.basis}</small>}</div>
              {d && <Ring value={d.overall.readiness} verdict={d.overall.verdict} />}
            </div>
          </div>
          <div className="xd-card full">
            <h3><span className="xd-n">2</span>The Mission Narrative</h3>
            <textarea rows={5} value={narrative} onChange={e => setNarrative(e.target.value)} aria-label="The mission narrative, filed as its record" placeholder={asking ? 'Lumen is writing it from the record.' : ''} />
          </div>
          <div className="xd-card full">
            <h3><span className="xd-n">3</span>Verification</h3>
            {d && d.verification.length > 0 ? (
              <table className="xd-table"><thead><tr><th style={{ width: '20%' }}>Gate</th><th style={{ width: '20%' }}>Done When</th><th>What The System Saw</th><th style={{ width: 130 }}>Verdict</th><th style={{ width: '20%' }}>What It Needs To See</th></tr></thead>
                <tbody>{d.verification.map((v, i) => <tr key={i}><td>{v.gate}</td><td>{v.done_when}</td><td>{v.saw.length ? <ul>{v.saw.map((s, k) => <li key={k}>{s}</li>)}</ul> : <span className="xd-empty">Nothing on record</span>}</td><td><Verdict v={v.verdict} /></td><td className="need">{v.verdict === 'confirmed' ? '' : v.needs}</td></tr>)}</tbody></table>
            ) : <div className="xd-empty">{asking ? '…' : 'No gates to verify.'}</div>}
            {d && d.needs_to_see.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ font: "500 15px 'Lora', Georgia, serif", display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 4px' }}><CircleAlert size={15} color={LABEL} />What The System Would Need To See</div>
                {d.needs_to_see.map((x, i) => <div key={i} className="xd-r"><div>{x.what}{x.how && <small>{x.how}</small>}</div></div>)}
              </div>
            )}
          </div>
          <div className="xd-grid three">
            <div className="xd-card">
              <h3><span className="xd-n">4</span>What Needs To Happen Now</h3>
              {todo.length === 0 && d && <div className="xd-empty">Nothing on record is left open.</div>}
              {todo.map((x, i) => <div key={i} className={`xd-r${yes[`todo:${x.text}`] === false ? ' off' : ''}`}><div>{x.text}{x.why && <small>{x.why}</small>}</div><YN on={yes[`todo:${x.text}`] ?? null} set={set(`todo:${x.text}`)} /></div>)}
            </div>
            <div className="xd-card">
              <h3><span className="xd-n">5</span>Missions That Came Out Of This One</h3>
              {missions.length === 0 && d && <div className="xd-empty">None named in the record.</div>}
              {missions.map((x, i) => <div key={i} className={`xd-r${yes[`mission:${x.title}`] === false ? ' off' : ''}`}><button type="button" title={`${x.kind} · Click To Change`} aria-label={`Kind: ${x.kind}. Click to change`} onClick={() => setMissions(ms => ms.map((m, k) => k === i ? { ...m, kind: KINDS[(KINDS.indexOf(m.kind) + 1) % KINDS.length] } : m))} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'inline-flex' }}><KindMark kind={x.kind} size={30} color={PURPLE} /></button><div>{x.title}<small>{x.kind}{x.why ? ` · ${x.why}` : ''}</small></div><YN on={yes[`mission:${x.title}`] ?? null} set={set(`mission:${x.title}`)} /></div>)}
            </div>
            <div className="xd-card">
              <h3><span className="xd-n">6</span>Who Should Hear</h3>
              {hear.length === 0 && d && <div className="xd-empty">No one named in the record is owed word.</div>}
              {hear.map((x, i) => <div key={i} className={`xd-r${yes[`hear:${x.who}`] === false ? ' off' : ''}`}><div>{x.who}{x.why && <small>{x.why}</small>}</div><YN on={yes[`hear:${x.who}`] ?? null} set={set(`hear:${x.who}`)} /></div>)}
            </div>
          </div>
          <div className="xd-card full">
            <h3><span className="xd-n">7</span>Keep And File<span className="xd-end"><span className="xd-tally">{tally}</span><YN on={sortOk} set={setSortOk} /></span></h3>
            <div className="xd-files">
              {files.map(x => (
                <div key={x.id} className={`xd-r${sortOk === true ? '' : ' off'}`}>
                  <div title={x.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}{x.probe && <span className="xd-v" style={{ '--c': x.probe.ok ? GREEN : RED, marginLeft: 8, fontSize: 11.5, padding: '1px 7px' }}>{x.probe.ok ? 'Answers' : 'No Answer'}</span>}{why[x.id] && <small style={{ whiteSpace: 'normal' }}>{why[x.id]}</small>}</div>
                  <span className="xd-sw" role="group" aria-label={`What to do with ${x.name}`}>{KEEP.map(([k, l]) => <button key={k} type="button" className={pick[x.id] === k ? 'on' : ''} aria-pressed={pick[x.id] === k} onClick={() => setPick(p => ({ ...p, [x.id]: k }))}>{l}</button>)}</span>
                </div>
              ))}
            </div>
          </div>
          {openTasks.length > 0 && (
            <div className="xd-card full">
              <h3>{plural(openTasks.length, 'Gate', 'Gates')} Still Open<span className="xd-end"><YN on={closeOpen ? true : null} set={(v) => setCloseOpen(v === true)} /></span></h3>
              {openTasks.map(t => <div key={t.id} className="xd-r"><div>{String(t.text).replace(/^\s*(?:gate\s+)?\d+\s*[·.:)-]\s*/i, '')}</div></div>)}
            </div>
          )}

          <div className="xd-band">Your Context
            <button type="button" className="xd-ic" title="Add Context" aria-label="Add your context" onClick={addContext} disabled={busy}><Plus size={17} /></button>
          </div>
          {ctx.map((c, i) => <div key={i} className="xd-ctx"><div>{c}</div><button type="button" className="xd-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Take It Out" aria-label="Take this context out" onClick={() => dropContext(i)}><X size={13} /></button></div>)}
        </div>
        <div className="xd-foot">
          <div className="xd-will">
            {d && <><b>{VERDICT[d.overall.verdict]?.word || 'Cannot See'}</b>, readiness {d.overall.readiness} of 100. </>}
            {d || err ? (will.length ? will.join(' · ') : 'The Mission Closes. Nothing Else Is Made Or Moved.') : null}
          </div>
          <span className="xd-miles">+100 Miles</span>
          <ExtractMarker size={44} color={PURPLE} title={busy ? 'Extracting' : 'Extract The Mission · 100 Miles'} onClick={go} />
        </div>
      </div>
    </div>
  )
}
