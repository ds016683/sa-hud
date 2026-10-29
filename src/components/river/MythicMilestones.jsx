// Mythic milestones (David, 10/29): "Gateways should be called Milestones and
// have the same structural treatment as a Milestone card for a mission." The
// rows read like the Main Mission page's MilestoneRow: a serif number, the
// title, chips, the done-when, Open and the hand of buttons. Each milestone is
// an objective of its own (parent_id = the Mythic), so Open gives it the full
// card with the five pills. Five at most, 10 miles each on close; the Mythic
// itself pays 50 at its release.
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { addMilestone, closeMilestone, reopenMilestone, removeMilestone, updateObjective, MYTHIC_MILESTONES_MAX } from '../../lib/objectives'
import { INK, INK2, GRAY, GOLD, SUCCESS, RED, MYTHIC, MONO, SERIF, PANEL_BORDER, LABEL, S, Label, alpha } from './canon'
import { hudPrompt, hudConfirm } from '../../lib/dialog'

const Chip = ({ color, children }) => <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color, border: `1px solid ${alpha(color, 40)}`, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>{children}</span>
const ghost = (color) => ({ ...S.btnGhost, padding: '4px 9px', fontSize: 10, ...(color ? { color, borderColor: alpha(color, 40) } : {}) })
const fmtDay = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

function Row({ n, m, onOpen, onChanged, setMsg }) {
  const open = m.state !== 'released'
  const [busy, setBusy] = useState(false)
  const act = async (fn, ok) => { setBusy(true); try { await fn(); setMsg(ok || null); onChanged && await onChanged() } catch (e) { setMsg(`Could not: ${e.message}`) } finally { setBusy(false) } }
  const rename = async () => { const t = await hudPrompt('Milestone', m.title); if (!t?.trim() || t.trim() === m.title) return; act(() => updateObjective(m.id, { title: t.trim().slice(0, 200) })) }
  const doneWhen = async () => { const t = await hudPrompt('Done when…', m.description || ''); if (t === null) return; act(() => updateObjective(m.id, { description: t.trim() || null })) }
  const close = async () => { if (!await hudConfirm(`Close milestone ${n}? 10 miles on the next update.`)) return; act(() => closeMilestone(m.id), `Milestone ${n} closed · 10 miles on the next update`) }
  const reopen = () => act(() => reopenMilestone(m.id), `Milestone ${n} reopened`)
  const remove = async () => { if (!await hudConfirm('Delete this milestone?')) return; act(() => removeMilestone(m.id), 'Milestone deleted') }
  return (
    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '12px 0', opacity: open ? 1 : 0.55 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, lineHeight: 1, color: open ? MYTHIC : SUCCESS, width: 26, flexShrink: 0, paddingTop: 2 }}>{n}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span onClick={() => onOpen(m, n)} title="Open this milestone" style={{ fontSize: 15, lineHeight: 1.4, color: open ? INK : GRAY, textDecoration: open ? 'none' : 'line-through', cursor: 'pointer', flex: 1, minWidth: 220 }}>{m.title}</span>
            {!open && <Chip color={SUCCESS}>closed{m.released_at ? ` ${fmtDay(m.released_at)}` : ''} · 10 mi</Chip>}
            {open && <Chip color={MYTHIC}>milestone {n} of {MYTHIC_MILESTONES_MAX}</Chip>}
          </div>
          {m.description && <div style={{ fontSize: 12.5, color: INK2, marginTop: 3, lineHeight: 1.5 }}>Done when: {m.description}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={() => onOpen(m, n)} style={ghost()}>Open</button>
            {open && <button onClick={doneWhen} disabled={busy} style={ghost()}>Done when</button>}
            {open && <button onClick={rename} disabled={busy} style={ghost()}>Rename</button>}
            {open
              ? <button onClick={close} disabled={busy} style={ghost(GOLD)}>Close · 10 mi</button>
              : <button onClick={reopen} disabled={busy} style={ghost()}>Reopen</button>}
            <button onClick={remove} disabled={busy} title="Delete" style={{ background: 'transparent', border: 'none', color: alpha(INK, 25), cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MythicMilestones({ parent, milestones, onChanged, onOpen }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const list = milestones || []
  const closed = list.filter(m => m.state === 'released').length
  const pct = list.length ? Math.round((closed / list.length) * 100) : 0
  const add = async () => {
    const t = text.trim(); if (!t) return
    setBusy(true)
    try { await addMilestone(parent, t); setText(''); setMsg(null); onChanged && await onChanged() } catch (e) { setMsg(`Could not: ${e.message}`) } finally { setBusy(false) }
  }
  return (
    <div>
      <Label style={{ color: MYTHIC }}>Milestones · 10 Miles Each, Five At Most</Label>
      {list.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0 8px' }}>
          <span style={{ flex: 1, height: 5, borderRadius: 99, background: alpha(INK, 8), overflow: 'hidden' }}><span style={{ display: 'block', width: `${pct}%`, height: '100%', background: MYTHIC }} /></span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL }}>{closed} of {list.length} closed</span>
        </div>
      )}
      {!list.length && <div style={{ fontSize: 13, color: GRAY, padding: '6px 0' }}>No milestones yet. Add the first one below: a thing that will be verifiably true.</div>}
      {list.map((m, i) => <Row key={m.id} n={i + 1} m={m} onOpen={onOpen} onChanged={onChanged} setMsg={setMsg} />)}
      {list.length < MYTHIC_MILESTONES_MAX && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: list.length ? `1px solid ${PANEL_BORDER}` : 'none', paddingTop: list.length ? 12 : 0 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder={`milestone ${list.length + 1} of ${MYTHIC_MILESTONES_MAX}: something that can be seen to have happened`} style={{ ...S.input, flex: 1 }} />
          <button onClick={add} disabled={busy || !text.trim()} style={S.btnPrimary}><Plus size={12} /> Milestone</button>
        </div>
      )}
      {list.length >= MYTHIC_MILESTONES_MAX && <div style={{ fontSize: 12, color: GRAY, marginTop: 8 }}>Five milestones is the limit for a Mythic. A sixth means this is a Main Mission.</div>}
      {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD, marginTop: 8 }}>{msg}</div>}
    </div>
  )
}
