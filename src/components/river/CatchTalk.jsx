// Reconciling one Item (David 11/22: "The action is reconciling, where i direct lumen to do something with it... equip it
// as an ad hoc, use it build a mythic, close it was irrelevant"; and "this item needed to go to another mission, likely as
// another gate or a piece of data. but that's a decision that gets made in the reconciliation container itself").
// Earlier (11/21) the panel began as a quick word with Lumen about one catch (David 11/21: "a way to click an item and have a quick discussion with lumen
// about what to do with it"). The catch, where it came from, a box to talk it through, and what it can become. Nothing
// is made until David presses one of the three: make it a Bounty, mark it done, or throw it out with a reason.
import { useEffect, useState } from 'react'
import { Check, X, Send, Target, Zap, Gem, MountainSnow, Lightbulb } from 'lucide-react'
import { askLumen } from '../../lib/lumenPanel'
import { addObjective } from '../../lib/objectives'
import { ruleCommitment } from '../../lib/commitments'
import { addImpromptu } from '../../lib/loadout'
import { parkIdea } from '../../lib/ideas'
import { loadMissions, sendToMission } from '../../lib/items'
import { hudPrompt } from '../../lib/dialog'

const PURPLE = '#B4A3E8', BLUE = '#8ACAFF', RED = '#DE7E6E'
const CSS = `
.ct-veil { position: fixed; inset: 0; z-index: 320; background: rgba(5,14,24,.78); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 20px; color: #F3F1EA; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); }
.ct { width: min(680px, 100%); max-height: 88vh; overflow-y: auto; background: #0F2334; border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 24px 26px 20px; box-shadow: 0 30px 90px rgba(0,0,0,.55); }
.ct h2 { font: 500 23px/1.3 'Lora', Georgia, serif; margin: 0; }
.ct-src { font-size: 13.5px; color: rgba(243,241,234,.66); margin-top: 6px; line-height: 1.5; }
.ct-q { font: italic 400 15px/1.55 'Lora', Georgia, serif; color: rgba(243,241,234,.78); border-left: 2px solid rgba(138,202,255,.5); padding-left: 12px; margin: 14px 0 0; white-space: pre-wrap; }
.ct-say { display: flex; gap: 10px; align-items: flex-end; margin-top: 18px; }
.ct textarea { flex: 1; font: 400 15.5px/1.55 'Lora', Georgia, serif; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); border-radius: 12px; padding: 11px 13px; resize: vertical; outline: none; }
.ct textarea:focus { border-color: ${BLUE}; }
.ct-ic { width: 40px; height: 40px; border-radius: 99px; border: 1.5px solid var(--c, ${BLUE}); color: var(--c, ${BLUE}); background: transparent; display: inline-grid; place-items: center; cursor: pointer; padding: 0; flex-shrink: 0; }
.ct-ic:hover:not(:disabled) { background: color-mix(in srgb, var(--c, ${BLUE}) 18%, transparent); }
.ct-ic:disabled { opacity: .5; cursor: wait; }
.ct-turn { margin-top: 14px; font-size: 14.5px; line-height: 1.6; }
.ct-turn.me { color: rgba(243,241,234,.7); }
.ct-turn.lu { font: 400 15.5px/1.6 'Lora', Georgia, serif; white-space: pre-wrap; }
.ct-foot { display: flex; gap: 10px; justify-content: flex-end; align-items: center; margin-top: 20px; border-top: 1px solid rgba(255,255,255,.12); padding-top: 14px; }
.ct-pick { margin-top: 16px; border-top: 1px solid rgba(255,255,255,.12); padding-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 14px; }
.ct-pick select { font: 400 15px/1.3 inherit; font-family: inherit; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 8px 10px; min-width: 240px; color-scheme: dark; }
.ct-as { display: inline-flex; border: 1px solid rgba(255,255,255,.14); border-radius: 10px; overflow: hidden; }
.ct-as button { font: inherit; background: transparent; color: rgba(243,241,234,.7); border: 0; padding: 8px 14px; cursor: pointer; }
.ct-as button.on { background: rgba(138,202,255,.16); color: #F3F1EA; }
.ct-done { margin-top: 12px; font-size: 14px; color: #57BE97; }
.ct-err { color: ${RED}; font-size: 13.5px; margin-right: auto; }
`
const dayOf = (d) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''

export default function CatchTalk({ c, onClose, onRuled }) {
  const [say, setSay] = useState('')
  const [turns, setTurns] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !e.defaultPrevented && !busy) onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose, busy])
  const send = async () => {
    const t = say.trim(); if (!t || busy) return
    setBusy(true); setErr(null); setTurns(x => [...x, { me: true, text: t }]); setSay('')
    try {
      const framed = `About one Item on my reconcile list: "${c.what}"${c.by ? `, due ${c.by}` : ''}. You caught it because: ${c.heard || 'not recorded'}${c.where ? `, from ${c.where}` : ''}.${c.quote ? ` What I wrote: "${c.quote}".` : ''} Talk it through with me briefly: what it is, and where it belongs (an Ad Hoc, a Bounty, a Mythic, a gate or data on one of my missions, the Ideas Board, or closed). Name the mission if it belongs on one. Do not make or change anything unless I ask you to. Me: ${t}`
      const reply = await askLumen({ text: framed, where: 'Items', item: c.item && c.item.id ? c.item : null })
      setTurns(x => [...x, { me: false, text: reply }])
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const rule = async (fn) => { if (busy) return; setBusy(true); setErr(null); try { await fn(); onRuled() } catch (e) { setErr(e.message); setBusy(false) } }
  const bounty = () => rule(async () => { await addObjective({ title: c.what, size: 'light', tags: ['third-horizon'], description: `From a catch${c.where ? ` in ${c.where}` : ''}. ${c.heard || ''}`.trim(), due_date: c.by || null }); await ruleCommitment(c.id, 'made') })
  const adhoc = () => rule(async () => { const r = await addImpromptu(c.what); if (!r.ok) throw new Error(r.reasons.join(' ')); await ruleCommitment(c.id, 'made', null, { made: 'adhoc' }) })
  const mythic = () => rule(async () => { await addObjective({ title: c.what, size: 'heavy', tags: ['third-horizon'], description: `From an Item${c.where ? ` in ${c.where}` : ''}. ${c.heard || ''}`.trim(), due_date: c.by || null }); await ruleCommitment(c.id, 'made', null, { made: 'mythic' }) })
  const idea = () => rule(() => parkIdea({ text: c.what, src: 'recon', where: c.where || 'Items', catchId: c.id }))
  const [pick, setPick] = useState(null)   // { missions, id, as }
  const openPick = async () => { if (pick) { setPick(null); return } try { const ms = await loadMissions(); setPick({ missions: ms, id: ms[0]?.id || '', as: 'gate' }) } catch (e) { setErr(e.message) } }
  const send2 = () => rule(async () => { const m = pick.missions.find(x => x.id === pick.id); if (!m) throw new Error('pick a mission'); const r = await sendToMission(c, m, pick.as); await ruleCommitment(c.id, 'routed', null, { to: { mission: m.name, project_id: m.id, as: pick.as, n: r.n || null } }) })
  const drop = () => rule(async () => { const why = await hudPrompt({ title: 'Why Is It Irrelevant?', placeholder: 'A few words; Lumen learns from it' }); if (why === null) throw new Error('kept'); await ruleCommitment(c.id, 'dropped', why || null) }).catch(() => {})
  return (
    <div className="ct-veil" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <style>{CSS}</style>
      <div className="ct" role="dialog" aria-modal="true" aria-label={`Item: ${c.what}`}>
        <h2>{c.what}</h2>
        <div className="ct-src">{[c.heard, c.where, c.by ? `Due ${dayOf(c.by)}` : null].filter(Boolean).join(' · ')}</div>
        {c.quote && <div className="ct-q">{c.quote}</div>}
        {turns.map((t, i) => <div key={i} className={`ct-turn ${t.me ? 'me' : 'lu'}`}>{t.text}</div>)}
        <div className="ct-say">
          <textarea rows={2} value={say} onChange={e => setSay(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} aria-label="Talk it through with Lumen" autoFocus />
          <button type="button" className="ct-ic" title="Ask Lumen" aria-label="Ask Lumen" onClick={send} disabled={busy}><Send size={16} /></button>
        </div>
        {pick && (
          <div className="ct-pick">
            <select value={pick.id} onChange={e => setPick({ ...pick, id: e.target.value })} aria-label="Which mission">{pick.missions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <span className="ct-as" role="group" aria-label="As what">{[['gate', 'As A Gate'], ['data', 'As Data']].map(([k, l]) => <button key={k} type="button" className={pick.as === k ? 'on' : ''} onClick={() => setPick({ ...pick, as: k })}>{l}</button>)}</span>
            <button type="button" className="ct-ic" style={{ '--c': PURPLE, marginLeft: 'auto' }} title="Send It" aria-label="Send it to that mission" onClick={send2} disabled={busy}><Check size={17} /></button>
          </div>
        )}
        <div className="ct-foot">
          {err && err !== 'kept' && <span className="ct-err">{err}</span>}
          <button type="button" className="ct-ic" style={{ '--c': BLUE }} title="Equip As Ad Hoc" aria-label="Equip it as an Ad Hoc item" onClick={adhoc} disabled={busy}><Zap size={17} /></button>
          <button type="button" className="ct-ic" style={{ '--c': BLUE }} title="Make It A Bounty" aria-label="Make it a Bounty" onClick={bounty} disabled={busy}><Target size={17} /></button>
          <button type="button" className="ct-ic" style={{ '--c': BLUE }} title="Build A Mythic" aria-label="Build a Mythic from it" onClick={mythic} disabled={busy}><Gem size={17} /></button>
          <button type="button" className="ct-ic" style={{ '--c': BLUE, ...(pick ? { background: 'rgba(138,202,255,.18)' } : {}) }} title="Send To A Mission" aria-label="Send it to a mission" onClick={openPick} disabled={busy}><MountainSnow size={17} /></button>
          <button type="button" className="ct-ic" style={{ '--c': BLUE }} title="Send To The Ideas Board" aria-label="Send it to the Ideas Board" onClick={idea} disabled={busy}><Lightbulb size={17} /></button>
          <button type="button" className="ct-ic" style={{ '--c': PURPLE }} title="Done" aria-label="Done" onClick={() => rule(() => ruleCommitment(c.id, 'done'))} disabled={busy}><Check size={17} /></button>
          <button type="button" className="ct-ic" style={{ '--c': RED }} title="Close As Irrelevant" aria-label="Close it as irrelevant" onClick={drop} disabled={busy}><X size={17} /></button>
        </div>
      </div>
    </div>
  )
}
