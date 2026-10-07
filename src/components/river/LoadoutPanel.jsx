// The Board (the Loadout): the one Activity Board, four slots always drawn.
// Slots 1 to 3 carry planned work (Side Missions, Main Mission tasks), one
// Heavy at most, one equipped clock, stamina for the rest of the day. Slot 4
// is the Ad Hoc Slot, Load the Unplanned: the Ambush lives in it (a task or a
// call, typed into the slot itself, one at a time, dispatched when done).
// Empty slots stay visible on purpose (David, 10/7: the structure is the point).
import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, PackageCheck, Archive, X as XIcon, Zap, Phone, Swords } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DispatchModal } from './AmbushPanel'
import { pockets } from '../../lib/objectives'
import FileAway from './FileAway'
import { fetchLoadout, equip, holster, stash, extract, addImpromptu, fmtClock, SIZES, SLOTS } from '../../lib/loadout'
import ItemDetail from './ItemDetail'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label, Panel } from './canon'

const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent',
  color: filled ? '#0A1B2B' : color, cursor: 'pointer',
})

const SizeChip = ({ size }) => {
  const s = SIZES[size] || SIZES.light
  return <span style={{ ...S.chip('rgba(255,255,255,0.06)', s.color), border: `1px solid ${s.color}55`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{s.label} · {s.slots} slot{s.slots === 1 ? '' : 's'}</span>
}

const KIND_COLOR = { 'Side Mission': GREEN, 'Main Mission': GOLD_BRIGHT, 'Impromptu': INK2, 'Session': BLUE }
const KindChip = ({ kind }) => <span style={{ ...S.chip('transparent', KIND_COLOR[kind] || INK2), border: `1px solid ${(KIND_COLOR[kind] || INK2)}55`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{kind}</span>

function ExtractModal({ item, onClose, onDone }) {
  const [minutes, setMinutes] = useState(Math.round(item.minutes_today) || '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const go = async () => {
    setBusy(true); setErr(null)
    try { const r = await extract(item, { minutes: Number(minutes) || 0, note: note.trim() || null }); onDone(r) }
    catch (e) { setErr(e.message); setBusy(false) }
  }
  const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%', background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Extract</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{item.title}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}><KindChip kind={item.kind} /><SizeChip size={item.size} />{item.personal && <span style={S.chip('rgba(255,255,255,0.06)', INK2)}>personal</span>}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
          <div>
            <Label>Time of activity</Label>
            <input type="number" min="0" value={minutes} onChange={e => setMinutes(e.target.value)} style={field} />
            <div style={{ fontSize: 10.5, color: GRAY, marginTop: 4 }}>minutes · clocked {fmtClock(item.minutes_today)}</div>
          </div>
          <div>
            <Label>Anything to file?</Label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="A receipt, a conversation, a note. Leave blank if nothing." style={{ ...field, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: GRAY, marginTop: 10 }}>{item.personal ? 'Personal time stays out of Harvest; the clock is kept in the Ledger.' : 'The clock is kept in the Ledger. Harvest is for Third Horizon work you log yourself.'} Miles bank on the next update.</div>
        {err && <div style={{ fontSize: 12, color: RED, marginTop: 8 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btn(INK2)}>Cancel</button>
          <button onClick={go} disabled={busy} style={btn(GOLD, true)}><PackageCheck size={12} /> {busy ? 'Extracting' : 'Extract'}</button>
        </div>
      </div>
    </div>
  )
}

const CORAL = '#E8836F'
const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
const slotBox = (border, bg = 'rgba(255,255,255,0.03)', dashed = false) => ({
  display: 'flex', flexDirection: 'column', gap: 8, minHeight: 168, padding: '12px 14px', borderRadius: 14,
  border: `1px ${dashed ? 'dashed' : 'solid'} ${border}`, background: bg, minWidth: 0,
})

// Slot notches: three cells, the ones this item occupies lit.
function Notches({ from, span, color }) {
  return <span style={{ display: 'inline-flex', gap: 3 }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 14, height: 5, borderRadius: 2, background: i >= from && i < from + span ? color : 'rgba(255,255,255,0.10)' }} />)}</span>
}

function FilledSlot({ it, n, act, onOpen, onExtract }) {
  const span = it.slots || 1
  return (
    <div style={{ ...slotBox(it.equipped ? GREEN : PANEL_BORDER, it.equipped ? 'rgba(67,211,146,0.07)' : 'rgba(255,255,255,0.03)'), gridColumn: `span ${span}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Notches from={n - 1} span={span} color={SIZES[it.size]?.color || INK2} />
        <Label style={{ marginBottom: 0 }}>{span === 1 ? `Slot ${n}` : `Slots ${n} to ${n + span - 1}`}</Label>
        <span style={{ flex: 1 }} />
        <KindChip kind={it.kind} /><SizeChip size={it.size} />
      </div>
      <div onClick={() => onOpen(it)} title="Open this item: overview, artifacts, sessions, files, notes" style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff', lineHeight: 1.3, cursor: 'pointer', flex: 1 }}>{it.title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {it.project && <span style={S.chip(`${BLUE}22`, BLUE)}>{it.project}</span>}
        {it.personal && <span style={S.chip('rgba(255,255,255,0.06)', INK2)}>personal</span>}
        <span style={{ fontFamily: MONO, fontSize: 10, color: it.equipped ? GREEN : GRAY, letterSpacing: '0.6px' }}>{it.equipped ? 'running · ' : 'holstered · '}{fmtClock(it.minutes_today)}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {it.equipped
          ? <button onClick={() => act(() => holster(it.id), `Timer off (holstered): ${it.title}`)} title="Holster: pause the clock, stays loaded" style={btn(GREEN, true)}><Pause size={11} /> Timer on</button>
          : <button onClick={() => act(() => equip(it.id), `Timer on (equipped): ${it.title}`)} title="Equip: run the clock on this, pause the rest" style={btn(INK2)}><Play size={11} /> Timer off</button>}
        <button onClick={() => act(() => stash(it.id), `Stashed: ${it.title}`)} title="Park it; it stays planned" style={btn(INK2)}><Archive size={11} /> Stash</button>
        <button onClick={() => onExtract(it)} style={btn(GOLD)}><PackageCheck size={11} /> Extract</button>
      </div>
    </div>
  )
}

function EmptySlot({ n }) {
  return (
    <div style={{ ...slotBox('rgba(255,255,255,0.14)', 'transparent', true), justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <Notches from={n - 1} span={1} color="rgba(255,255,255,0.28)" />
      <Label style={{ marginBottom: 0 }}>Slot {n} · empty</Label>
      <div style={{ fontFamily: SERIF, fontSize: 15, color: 'rgba(234,241,248,0.4)' }}>Load from what is due</div>
      <div style={{ fontSize: 11, color: GRAY, lineHeight: 1.5 }}>a Side Mission, a Main Mission task, or tell Lumen</div>
    </div>
  )
}

// The Ad Hoc slot: empty, it takes a task or a call right in the box; loaded,
// it carries the impromptu item with its clock until Dispatch.
function AdHocSlot({ item, act, onDispatch, onOpen, onChanged }) {
  const [mode, setMode] = useState('task')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const start = async () => {
    const t = text.trim(); if (!t || busy) return
    setBusy(true); setErr(null)
    try {
      const r = await addImpromptu(mode === 'call' ? `Call: ${t}` : t, { tags: mode === 'call' ? ['call'] : [] })
      if (!r.ok) setErr(r.reasons.join(' · ')); else { setText(''); onChanged() }
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  if (item) return (
    <div style={slotBox(item.equipped ? GREEN : `${CORAL}99`, item.equipped ? 'rgba(67,211,146,0.07)' : 'rgba(232,131,111,0.06)')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Label style={{ marginBottom: 0, color: CORAL }}>Ad Hoc Slot</Label><span style={{ flex: 1 }} />
        <span style={{ ...S.chip('transparent', CORAL), border: `1px solid ${CORAL}55`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{item.call ? 'Call' : 'Impromptu'}</span>
      </div>
      <div onClick={() => onOpen(item)} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff', lineHeight: 1.3, cursor: 'pointer', flex: 1 }}>
        {item.call ? <Phone size={14} color={CORAL} style={{ marginTop: 3, flexShrink: 0 }} /> : <Zap size={14} color={CORAL} style={{ marginTop: 3, flexShrink: 0 }} />}{item.title}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: item.equipped ? GREEN : GRAY, letterSpacing: '0.6px' }}>{item.equipped ? 'running · ' : 'holstered · '}{fmtClock(item.minutes_today)} · 1 mile on dispatch</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {item.equipped
          ? <button onClick={() => act(() => holster(item.id), `Timer off: ${item.title}`)} style={btn(GREEN, true)}><Pause size={11} /> Timer on</button>
          : <button onClick={() => act(() => equip(item.id), `Timer on: ${item.title}`)} style={btn(INK2)}><Play size={11} /> Timer off</button>}
        <button onClick={() => onDispatch(item)} style={btn(GOLD)}><Swords size={11} /> Dispatch</button>
      </div>
    </div>
  )
  return (
    <div style={slotBox(`${CORAL}66`, 'rgba(232,131,111,0.04)', true)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={12} color={CORAL} /><Label style={{ marginBottom: 0, color: CORAL }}>Ad Hoc Slot</Label>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 15, color: 'rgba(234,241,248,0.6)' }}>Load the Unplanned</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[['task', 'Task'], ['call', 'Call']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{ ...btn(mode === k ? CORAL : INK2, mode === k), padding: '4px 9px' }}>{k === 'call' ? <Phone size={10} /> : <Zap size={10} />} {l}</button>
        ))}
      </div>
      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') start() }} disabled={busy}
        placeholder={mode === 'call' ? 'Who is calling? Enter starts the clock.' : 'What just landed on you? Enter starts the clock.'} style={{ ...field, marginTop: 'auto' }} />
      {err && <div style={{ fontFamily: MONO, fontSize: 9.5, color: RED, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{err}</div>}
    </div>
  )
}

export default function LoadoutPanel({ onChange, refreshKey = 0, onNavigate, bare = false }) {
  const [L, setL] = useState(null)
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(null)
  const [dispatch, setDispatch] = useState(null)
  const [filing, setFiling] = useState(null)
  const [related, setRelated] = useState(null)
  const [projects, setProjects] = useState([])
  const [msg, setMsg] = useState(null)
  const refresh = useCallback(() => fetchLoadout().then(setL).catch(e => console.warn('loadout', e.message)), [])
  useEffect(() => { refresh() }, [refresh, tick, refreshKey])
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30_000); return () => clearInterval(t) }, [])
  useEffect(() => { supabase.from('projects').select('id,name').eq('status', 'active').order('name').then(({ data }) => setProjects(Array.isArray(data) ? data : [])) }, [])

  const bump = () => { setTick(x => x + 1); onChange && onChange() }
  const act = async (fn, after) => {
    try { await fn(); if (after) setMsg(after); bump() }
    catch (e) { setMsg(`Could not do that: ${e.message}`) }
  }
  // Extract gate: a Side Mission carrying artifacts, files, or a board is
  // opened instead so its content is filed away first (the Archive).
  const extractGate = async (it) => {
    if (it.kind === 'Side Mission' || it.kind === 'Impromptu') {
      try { const p = await pockets(it.id); if (p.carrying) { const { data } = await supabase.from('objectives').select('*').eq('id', it.id).limit(1); if (data?.[0]) { setFiling({ o: data[0], p }); return } } } catch { /* fall through */ }
    }
    setOpen(it)
  }

  // Lay the items into the three slots by the slots they take; what does not fit is over capacity.
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
      <style>{`.board-slots { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px } @media (max-width: 980px) { .board-slots { grid-template-columns: repeat(2, minmax(0, 1fr)) } }`}</style>
      {related && <ItemDetail item={{ id: related.id, objective_id: related.id, kind: related.kind, title: related.title, project: related.project, project_id: related.project_id, description: related.description, tags: related.tags, size: related.size }} onClose={() => setRelated(null)} onNavigate={onNavigate} onChange={bump} />}
      {open && <ExtractModal item={open} onClose={() => setOpen(null)} onDone={(r) => { setOpen(null); setMsg(`Extracted: ${open.title} · ${fmtClock(r.minutes)}${r.personal ? ' · personal' : ''}`); bump() }} />}
      {filing && <FileAway objective={filing.o} pockets={filing.p} onClose={() => setFiling(null)} onDone={({ filed, released }) => { setFiling(null); setMsg(`Filed ${filed.length} to the Archive · extracted ${filing.o.title} · ${released.minutes}m`); bump() }} />}
      {dispatch && <DispatchModal item={dispatch} projects={projects} onClose={() => setDispatch(null)} onDone={(r) => { setDispatch(null); setMsg(`Dispatched: ${dispatch.title} · ${fmtClock(r.minutes)}${r.ported.length ? ` · ported ${r.ported.length}` : ' · nothing left'} · 1 mile on the next update`); bump() }} />}
      {!L ? (
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '12px 0' }}>Reading the board</div>
      ) : (
        <>
          <div className="board-slots">
            {layout.placed.map(({ it, n }) => <FilledSlot key={it.id} it={it} n={n} act={act} onOpen={setRelated} onExtract={extractGate} />)}
            {layout.empties.map(n => <EmptySlot key={`empty-${n}`} n={n} />)}
            <AdHocSlot item={L.adhoc[0] || null} act={act} onDispatch={setDispatch} onOpen={setRelated} onChanged={bump} />
          </div>
          {layout.overflow.length > 0 && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', color: RED, textTransform: 'uppercase', marginTop: 8 }}>Over capacity ({L.slots.used}/{SLOTS} slots): {layout.overflow.map(i => `${i.title} · ${SIZES[i.size]?.label}`).join(' · ')}. Stash something.</div>}
          {L.adhoc.length > 1 && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', color: GRAY, textTransform: 'uppercase', marginTop: 8 }}>Also unplanned: {L.adhoc.slice(1).map(i => i.title).join(' · ')} · dispatch the slot to reach them</div>}

          {L.sessions.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 8 }}>
              <Label>Sessions · no slot taken</Label>
              {L.sessions.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', flexWrap: 'wrap' }}>
                  {it.equipped && <span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN, boxShadow: `0 0 0 3px ${GREEN}33` }} />}
                  <span onClick={() => setRelated(it)} style={{ fontSize: 13, color: INK2, flex: 1, minWidth: 200, cursor: 'pointer' }}>{it.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: it.equipped ? GREEN : GRAY, letterSpacing: '0.6px' }}>{it.equipped ? 'running · ' : 'holstered · '}{fmtClock(it.minutes_today)}</span>
                  {it.equipped
                    ? <button onClick={() => act(() => holster(it.id), `Timer off: ${it.title}`)} style={btn(GREEN, true)}><Pause size={11} /> Timer on</button>
                    : <button onClick={() => act(() => equip(it.id), `Timer on: ${it.title}`)} style={btn(INK2)}><Play size={11} /> Timer off</button>}
                  <button onClick={() => act(() => stash(it.id), `Suspended: ${it.title}`)} style={btn(INK2)}><Archive size={11} /> Suspend</button>
                  <button onClick={() => setOpen(it)} style={btn(GOLD)}><PackageCheck size={11} /> Extract</button>
                </div>
              ))}
            </div>
          )}
          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') ? RED : GOLD_BRIGHT, marginTop: 10, textTransform: 'uppercase' }}>{msg}</div>}
        </>
      )}
    </Wrap>
  )
}
