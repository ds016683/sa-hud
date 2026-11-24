// The gate debrief (David 11/21): a smaller version of the mission's debrief, for one gate. "what we should be doing
// is determining what information should be pulled up inot the main mission page itself (artifacts, files, notes) and
// determining if anything with the mission changed as a result of that particular gate. did teh gate change the
// nature of the mission. but similar construct, yay page, and then some tooling indicator for get back to work."
//
// The pop-up opens and Lumen briefs from the gate's record: a verdict, a closing note, what on the gate belongs up on
// the mission, and whether the gate changed the mission. The plus adds David's context and it runs again. Every line
// that would move or change something starts unblessed; the foot says what Extract will do; Extract does only that.
// A change to the Polaris or to a gate is only ever a proposal here: his check is what makes it.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X, Sparkles, Plus, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hudPrompt } from '../../lib/dialog'
import { askGateDebrief } from '../../lib/lumenPanel'
import { extract as extractItem } from '../../lib/loadout'
import { fileAchieved } from '../../lib/archive'
import { routeItem } from '../../lib/commitments'
import { ExtractMarker } from './glyphs'
import { GateGlyph } from './GatePage'

const PURPLE = '#B4A3E8', GREEN = '#7FC8A9', RED = '#DE7E6E', AMBER = '#8ACAFF'
const CSS = `
.gd-veil { position: fixed; inset: 0; z-index: 320; background: rgba(5,14,24,.78); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 20px; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); color: #F3F1EA; }
.gd { width: min(980px, 100%); max-height: 92vh; overflow-y: auto; background: #0F2334; border: 1px solid rgba(255,255,255,.14); border-radius: 18px; box-shadow: 0 30px 90px rgba(0,0,0,.55); animation: gdin .2s ease both; }
@keyframes gdin { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.gd-in { padding: 24px 28px 20px; }
.gd-head { display: flex; align-items: center; gap: 14px; }
.gd-head h1 { font: 500 26px/1.2 'Lora', Georgia, serif; letter-spacing: -.012em; margin: 0; flex: 1; min-width: 0; }
.gd-head h1 span { color: var(--t); }
.gd-head small { display: block; font: 400 13.5px var(--font-sans, 'Instrument Sans', sans-serif); color: rgba(243,241,234,.7); margin-top: 3px; letter-spacing: 0; }
.gd textarea { width: 100%; font: 400 15.5px/1.6 'Lora', Georgia, serif; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 12px 14px; resize: vertical; outline: none; box-sizing: border-box; }
.gd-ic { width: 34px; height: 34px; border-radius: 99px; border: 1.5px solid var(--c, #8ACAFF); color: var(--c, #8ACAFF); background: transparent; display: inline-grid; place-items: center; cursor: pointer; padding: 0; flex-shrink: 0; transition: background .15s; }
.gd-ic:hover:not(:disabled), .gd-ic.on { background: color-mix(in srgb, var(--c, #8ACAFF) 20%, transparent); }
.gd-ic:disabled { opacity: .5; cursor: wait; }
.gd-ic.sm { width: 28px; height: 28px; }
.gd-ic.big { width: 50px; height: 50px; cursor: default; background: color-mix(in srgb, var(--c) 10%, transparent); }
.gd-ic.thinking { animation: gdpulse 1.4s ease-in-out infinite; cursor: default; }
@keyframes gdpulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c, #8ACAFF) 55%, transparent) } 50% { box-shadow: 0 0 0 8px transparent } }
.gd-band { display: flex; align-items: center; gap: 12px; font: 500 19px 'Lora', Georgia, serif; margin: 20px 0 0; }
.gd-band::before { content: ""; width: 22px; height: 2px; background: var(--hud-accent, #8ACAFF); }
.gd-band::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,.12); order: 1; }
.gd-band > * { order: 2; }
.gd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 14px; }
@media (max-width: 860px) { .gd-grid { grid-template-columns: 1fr; } }
.gd-card { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #11283c; padding: 16px 18px; min-width: 0; }
.gd-card.full { margin-top: 14px; }
.gd-card h3 { font: 500 17px 'Lora', Georgia, serif; margin: 0 0 8px; display: flex; align-items: center; gap: 9px; }
.gd-n { width: 21px; height: 21px; border-radius: 99px; border: 1.3px solid ${PURPLE}; color: ${PURPLE}; font: 600 12px var(--font-sans, 'Instrument Sans', sans-serif); display: inline-grid; place-items: center; flex-shrink: 0; }
.gd-v { margin-left: auto; font: 600 12.5px var(--font-sans, 'Instrument Sans', sans-serif); color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); border-radius: 99px; padding: 3px 11px; }
.gd-p { font-size: 14.5px; line-height: 1.55; color: rgba(243,241,234,.88); margin: 0; }
.gd-p + .gd-p { margin-top: 8px; color: rgba(243,241,234,.7); }
.gd-r { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 14.5px; line-height: 1.35; }
.gd-r:first-of-type { border-top: 0; }
.gd-r > div { flex: 1; min-width: 0; }
.gd-r small { display: block; color: rgba(243,241,234,.7); font-size: 12.5px; margin-top: 2px; }
.gd-r.off > div { opacity: .45; }
.gd-k { font-size: 12.5px; color: var(--t); margin-right: 8px; white-space: nowrap; }
.gd-yn { display: inline-flex; gap: 7px; flex-shrink: 0; }
.gd-edit { align-items: flex-start; } .gd-r.gd-edit > .gd-yn { flex: none; padding-top: 4px; }
.gd-edit input, .gd-edit textarea { display: block; width: 100%; box-sizing: border-box; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 8px 11px; outline: none; }
.gd-edit input { font: 500 15.5px/1.35 'Lora', Georgia, serif; }
.gd-edit textarea { font: 400 13.5px/1.5 inherit; font-family: inherit; margin-top: 7px; resize: vertical; }
.gd-edit input:focus, .gd-edit textarea:focus { border-color: #8ACAFF; }
.gd-ctx { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid rgba(138,202,255,.35); border-radius: 12px; background: rgba(138,202,255,.06); font: 400 15px/1.55 'Lora', Georgia, serif; margin-top: 10px; }
.gd-ctx > div { flex: 1; white-space: pre-wrap; }
.gd-foot { position: sticky; bottom: 0; display: flex; align-items: center; gap: 16px; padding: 14px 28px; border-top: 1px solid rgba(255,255,255,.14); background: #0D1D2C; border-radius: 0 0 18px 18px; }
.gd-will { flex: 1; min-width: 0; font-size: 14.5px; line-height: 1.5; color: rgba(243,241,234,.86); }
.gd-miles { font: 500 22px 'Lora', Georgia, serif; color: var(--t); white-space: nowrap; }
.gd-err { font-size: 13.5px; color: ${RED}; margin-top: 10px; }
`
const VERDICT = { confirmed: ['Confirmed', GREEN], not_confirmed: ['Not Confirmed', RED], cannot_see: ['Cannot See It', AMBER] }
const CHANGE = { polaris: 'Polaris', reword_gate: 'Reword', new_gate: 'New Gate' }
// A step of the Extract that does not answer is named, not waited on forever (David 11/24: "i keep clicking the extract
// button and nothing is working").
const within = (p, what, ms = 25000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`${what} did not answer. Nothing more was done; try Extract again.`)), ms))])
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
function YN({ on, set }) {
  return (
    <span className="gd-yn">
      <button type="button" className={`gd-ic sm${on === true ? ' on' : ''}`} style={{ '--c': PURPLE }} title="Yes" aria-label="Yes" aria-pressed={on === true} onClick={() => set(on === true ? null : true)}><Check size={14} /></button>
      <button type="button" className={`gd-ic sm${on === false ? ' on' : ''}`} style={{ '--c': RED }} title="No" aria-label="No" aria-pressed={on === false} onClick={() => set(on === false ? null : false)}><X size={14} /></button>
    </span>
  )
}
// Copy one object in the Ledger's storage. A copy that is already there is left as it is.
async function copyObject(from, to, { optional = false } = {}) {
  const { error } = await supabase.storage.from('project-files').copy(from, to)
  if (error && !/exist|duplicate/i.test(error.message) && !(optional && /not.?found/i.test(error.message))) throw new Error(error.message)
}

// item: the gate's card on the close-out (id, title, minutes_today ...). onDone(result, info) after the gate is extracted;
// info carries what was done and the next gate, for the yay. drafter and closer can be handed in for a dev harness.
// A gate with no card of its own (item.task_id, item.project_id, no id) is read from its task and its Workbench on the
// mission card, and finish(record) closes it (the mission page's own close) in place of the card's Extract.
export default function GateDebrief({ item, tone = PURPLE, onClose, onDone, drafter = askGateDebrief, closer = null, finish = null }) {
  const [d, setD] = useState(null)
  const [note, setNote] = useState('')
  const [yes, setYes] = useState({})              // 'up:<key>' | 'chg:<i>' -> true | false
  const [ctx, setCtx] = useState([])
  const [asking, setAsking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [stage, setStage] = useState('')
  const run = useRef(0)
  const brief = useCallback(async (context) => {
    const me = ++run.current
    setAsking(true); setErr(null)
    try { const out = await drafter({ objectiveId: item.id || null, taskId: item.id ? null : item.task_id, stepId: item.step_id ?? null, words: context.join('\n\n') }); if (me !== run.current) return; setD(out); setNote(out.closing_note || '') }
    catch (e) { if (me === run.current) setErr(`Lumen could not brief it: ${e.message}`) } finally { if (me === run.current) setAsking(false) }
  }, [drafter, item.id, item.task_id, item.step_id])
  useEffect(() => { Promise.resolve().then(() => brief([])) }, [brief])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !busy && !e.defaultPrevented) onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose, busy])
  const addContext = async () => {
    const t = String(await hudPrompt({ title: 'Your Context', multiline: true }) || '').trim()
    if (!t) return
    const next = [...ctx, t]; setCtx(next); brief(next)
  }
  const dropContext = (i) => { const next = ctx.filter((_, k) => k !== i); setCtx(next); brief(next) }
  const set = (k) => (v) => setYes(y => ({ ...y, [k]: v }))
  const items = (d?.items || []).filter(x => !x.on_mission)
  const up = items.filter(x => yes[`up:${x.key}`] === true)
  const chg = (d?.changes || []).filter((_, i) => yes[`chg:${i}`] === true)
  // His own words on an Item before it routes (David 11/22: "a little inline modal on the extract card so i can change the
  // description or title"). recEdit[i] holds what he changed; ed is the row open for editing.
  const [recEdit, setRecEdit] = useState({})
  const [ed, setEd] = useState(null)   // { i, what, why }
  const recs = (d?.reconcile || []).map((r, i) => ({ ...r, ...(recEdit[i] || {}) }))
  const rec = recs.filter((_, i) => yes[`rec:${i}`] === true)
  const will = [
    up.length ? plural(up.length, 'Piece Pulled Up To The Mission', 'Pieces Pulled Up To The Mission') : null,
    chg.some(c => c.kind === 'polaris') ? 'The Polaris Changed' : null,
    chg.filter(c => c.kind === 'reword_gate').length ? plural(chg.filter(c => c.kind === 'reword_gate').length, 'Gate Reworded', 'Gates Reworded') : null,
    chg.filter(c => c.kind === 'new_gate').length ? plural(chg.filter(c => c.kind === 'new_gate').length, 'Gate Added', 'Gates Added') : null,
    rec.length ? plural(rec.length, 'Item Routed To Reconcile', 'Items Routed To Reconcile') : null,
  ].filter(Boolean)

  const go = async () => {
    if (busy || asking) return
    setBusy(true); setErr(null); setStage('Extracting')
    const words = ctx.join('\n\n').trim(), record = [words, note.trim()].filter(Boolean).join('\n\n')
    try {
      if (closer) { await closer({ up, chg, record }); return }
      const pid = d?.mission?.id, root = item.id ? `objectives/${item.id}` : `${item.project_id}/gates/${item.task_id}`
      // What he blessed, and only that. Each is its own step; one that fails is named and the gate stays open.
      for (const x of up) {
        const [kind, id] = [x.key.slice(0, x.key.indexOf(':')), x.key.slice(x.key.indexOf(':') + 1)]
        if (kind === 'file') { const { error } = await supabase.from('live_files').update({ project_id: pid }).eq('id', id); if (error) throw new Error(`${x.name}: ${error.message}`) }
        else if (kind === 'tab') await copyObject(`${root}/workspace/${id}.json`, `${pid}/workspace/${id}.json`)
        // A built tab goes up with what David entered in it (its kept state, when it has one).
        else if (kind === 'build') { await copyObject(`${root}/build/${id}.html`, `${pid}/build/${id}.html`); await copyObject(`${root}/build/${id}.json`, `${pid}/build/${id}.json`); await copyObject(`${root}/build/${id}.state.json`, `${pid}/build/${id}.state.json`, { optional: true }) }
      }
      let top = d?.top || 0
      // A Side Mission's gate: the mission is the card, its gates the card's lines.
      for (const c of d?.side ? chg : []) {
        if (c.kind === 'polaris') { const { error } = await supabase.from('objectives').update({ north_star: c.text }).eq('id', pid); if (error) throw new Error(`Polaris: ${error.message}`) }
        else if (c.kind === 'reword_gate') { const { error } = await supabase.from('objective_steps').update({ text: c.text }).eq('id', c.task_id); if (error) throw new Error(`Gate ${c.n}: ${error.message}`) }
        else if (c.kind === 'new_gate') { top += 1; const { error } = await supabase.from('objective_steps').insert({ objective_id: pid, text: c.text.slice(0, 300), position: top - 1 }); if (error) throw new Error(`New gate: ${error.message}`) }
      }
      for (const c of d?.side ? [] : chg) {
        if (c.kind === 'polaris') { const { error } = await supabase.from('projects').update({ description: c.text }).eq('id', pid); if (error) throw new Error(`Polaris: ${error.message}`) }
        else if (c.kind === 'reword_gate') { const { error } = await supabase.from('project_tasks').update({ text: `${c.n} · ${c.text}` }).eq('id', c.task_id); if (error) throw new Error(`Gate ${c.n}: ${error.message}`) }
        else if (c.kind === 'new_gate') { top += 1; const { error } = await supabase.from('project_tasks').insert({ project_id: pid, text: `${top} · ${c.text}`, status: 'open', done: false, source: 'debrief', notes: `From the debrief of Gate ${d.gate.n}, ${d.gate.text}. ${c.why || ''}`.trim() }); if (error) throw new Error(`New gate: ${error.message}`) }
      }
      if (rec.length) setStage('Routing To Reconcile')
      for (const r of rec) await within(routeItem({ what: r.what, heard: r.why, where: `Gate ${d.gate.n} · ${d.gate.text}`, source: 'debrief' }), 'The Reconcile list')
      setStage('Closing The Gate')
      let r
      if (finish) r = await within(finish(record), 'The Ledger', 40000)
      else { if (record) await fileAchieved(item, record).catch(() => {}); r = await extractItem(item, { minutes: 0, note: record || null }) }
      onDone(r, { gate: d?.gate || null, mission: d?.mission || null, next: d?.next || null, did: [...up.map(x => ({ tag: 'Up', text: x.name })), ...chg.map(c => ({ tag: CHANGE[c.kind], text: c.kind === 'reword_gate' ? `Gate ${c.n}: ${c.text}` : c.text })), ...rec.map(x => ({ tag: 'Routed', text: x.what }))] })
    } catch (e) { setErr(e?.message || String(e)); setBusy(false) }
  }
  const v = d ? VERDICT[d.verification.verdict] : null
  return (
    <div className="gd-veil" style={{ '--t': tone }} onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <style>{CSS}</style>
      <div className="gd" role="dialog" aria-modal="true" aria-label={`Gate debrief: ${item.title}`}>
        <div className="gd-in">
          <div className="gd-head">
            <span className="gd-ic big" style={{ '--c': tone }}><GateGlyph size={25} /></span>
            <h1>{d ? <><span>Gate {d.gate.n} ·</span> {d.gate.text}<small>{d.mission.name}</small></> : String(item.title || '').replace(/^\s*(?:gate\s+)?(\d+)\s*[·.:)-]\s*/i, 'Gate $1 · ')}</h1>
            <span className={`gd-ic sm${asking ? ' thinking' : ''}`} title={asking ? 'Lumen Is Reading The Gate' : 'Lumen Has Briefed'} aria-label={asking ? 'Lumen is reading the gate' : 'Lumen has briefed'}><Sparkles size={14} /></span>
            <button type="button" className="gd-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Not Yet" aria-label="Not yet, back to the gate" onClick={onClose} disabled={busy}><X size={14} /></button>
          </div>
          {err && <div className="gd-err">{err}</div>}

          <div className="gd-grid">
            <div className="gd-card">
              <h3><span className="gd-n">1</span>Verification{v && <span className="gd-v" style={{ '--c': v[1] }}>{v[0]}</span>}</h3>
              {d && <p className="gd-p">{d.verification.saw}</p>}
              {d && d.verification.need && <p className="gd-p">{d.verification.need}</p>}
              {d && (d.proofs || []).length > 0 && <p className="gd-p" style={{ fontSize: 13 }}>{(d.proofs || []).length === 1 ? 'Proof filed by a session' : `${d.proofs.length} proofs filed by sessions`}, last {d.proofs[d.proofs.length - 1].at}{d.proofs[d.proofs.length - 1].build ? `, build ${d.proofs[d.proofs.length - 1].build}` : ''}.</p>}
            </div>
            <div className="gd-card">
              <h3><span className="gd-n">2</span>Closing Note</h3>
              <textarea rows={7} value={note} onChange={e => setNote(e.target.value)} aria-label="Closing note" />
            </div>
          </div>
          <div className="gd-card full" style={d?.side ? { display: 'none' } : undefined}>
            <h3><span className="gd-n">3</span>What Goes Up To The Mission</h3>
            {items.map(x => <div key={x.key} className={`gd-r${yes[`up:${x.key}`] === false ? ' off' : ''}`}><div><span className="gd-k">{x.kind}</span>{x.name}{x.why && <small>{x.pull ? 'Lumen: Up' : 'Lumen: Stays'} · {x.why}</small>}</div><YN on={yes[`up:${x.key}`] ?? null} set={set(`up:${x.key}`)} /></div>)}
          </div>
          <div className="gd-card full">
            <h3><span className="gd-n">{d?.side ? 3 : 4}</span>Did This Gate Change The Mission</h3>
            {(d?.changes || []).map((c, i) => <div key={i} className={`gd-r${yes[`chg:${i}`] === false ? ' off' : ''}`}><div><span className="gd-k">{CHANGE[c.kind]}{c.kind === 'reword_gate' ? ` · Gate ${c.n}` : ''}</span>{c.text}{(c.from || c.why) && <small>{c.from ? `Was: ${c.from}. ` : ''}{c.why}</small>}</div><YN on={yes[`chg:${i}`] ?? null} set={set(`chg:${i}`)} /></div>)}
          </div>

          {(d?.reconcile || []).length > 0 && (
            <div className="gd-card full">
              <h3><span className="gd-n">{d?.side ? 4 : 5}</span>Things To Reconcile</h3>
              {recs.map((r, i) => ed && ed.i === i ? (
                <div key={i} className="gd-r gd-edit">
                  <div>
                    <input value={ed.what} onChange={e => setEd({ ...ed, what: e.target.value })} aria-label="Title" placeholder="Title" autoFocus onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEd(null) } }} />
                    <textarea rows={2} value={ed.why} onChange={e => setEd({ ...ed, why: e.target.value })} aria-label="Description" placeholder="Description" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEd(null) } }} />
                  </div>
                  <div className="gd-yn">
                    <button type="button" className="gd-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Leave It" aria-label="Leave it as it was" onClick={() => setEd(null)}><X size={13} /></button>
                    <button type="button" className="gd-ic sm" title="Keep These Words" aria-label="Keep these words" onClick={() => { const what = ed.what.replace(/\s+/g, ' ').trim(); if (what) setRecEdit(x => ({ ...x, [i]: { what: what.slice(0, 300), why: ed.why.trim().slice(0, 300) } })); setEd(null) }}><Check size={13} /></button>
                  </div>
                </div>
              ) : (
                <div key={i} className={`gd-r${yes[`rec:${i}`] === false ? ' off' : ''}`}><div>{r.what}{r.why && <small>{r.why}</small>}</div><span className="gd-yn"><button type="button" className="gd-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Change The Title Or Description" aria-label="Change the title or description" onClick={() => setEd({ i, what: r.what, why: r.why || '' })}><Pencil size={13} /></button><YN on={yes[`rec:${i}`] ?? null} set={set(`rec:${i}`)} /></span></div>
              ))}
            </div>
          )}

          <div className="gd-band">Your Context
            <button type="button" className="gd-ic" title="Add Context" aria-label="Add your context" onClick={addContext} disabled={busy}><Plus size={17} /></button>
          </div>
          {ctx.map((c, i) => <div key={i} className="gd-ctx"><div>{c}</div><button type="button" className="gd-ic sm" style={{ '--c': 'rgba(243,241,234,.6)' }} title="Take It Out" aria-label="Take this context out" onClick={() => dropContext(i)}><X size={13} /></button></div>)}
        </div>
        <div className="gd-foot">
          <div className="gd-will" style={err ? { color: RED } : undefined}>{err ? err : asking ? 'Lumen Is Reading The Gate. Extract Opens When The Brief Is In.' : busy ? stage : d ? (will.length ? will.join(' · ') : 'The Gate Closes. Nothing Else Is Moved Or Changed.') : null}</div>
          <span className="gd-miles">+7 Miles</span>
          <span style={{ display: 'inline-flex', opacity: busy || asking ? 0.4 : 1, transition: 'opacity .15s' }}><ExtractMarker size={44} color={tone} title={asking ? 'Lumen Is Still Reading The Gate' : busy ? 'Extracting' : 'Extract The Gate · 7 Miles'} onClick={go} /></span>
        </div>
      </div>
    </div>
  )
}
