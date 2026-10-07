// Side Missions: the queue. Capture, size, date, park, follow up, delegate,
// release. The board job (what am I on, what is the clock) lives on the
// Loadout; Play here equips through the same fit rules. Every row opens the
// Side Mission object (ItemDetail): overview, steps, artifacts, session
// boards, files, notes. Rebuilt 10/7 from the 2,400-line original.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Target, Play, Plus, Bell, Hourglass, ArrowUpRight, Inbox as InboxIcon, Flag, Trash2, RotateCcw, ExternalLink, Check } from 'lucide-react'
import ItemDetail from './river/ItemDetail'
import FileAway from './river/FileAway'
import { fetchObjectives, addObjective, route, binObjective, restoreObjective, purgeObjective, reopenObjective, closeOut, pockets, provenance, realmOf, STATE, TAGS, sizeOf } from '../lib/objectives'
import { fetchLoadout, SIZES } from '../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, PURPLE, MONO, S, Panel, Label, chiToday } from './river/canon'

const btn = (color = INK2, filled = false, extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra,
})
const field = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
const chip = (fg, border = `${fg}55`) => ({ ...S.chip('transparent', fg), border: `1px solid ${border}`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' })
const fmtDay = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const CONTAINERS = ['inbox', 'follow_up', 'waiting', 'foreman', 'parked', 'released', 'bin']
const ICON = { inbox: InboxIcon, follow_up: Bell, waiting: Hourglass, foreman: ArrowUpRight, parked: Flag, released: Check, bin: Trash2 }

function SizePills({ value, onChange, small = false }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {Object.entries(SIZES).map(([k, s]) => <button key={k} onClick={() => onChange(k)} title={s.sub} style={{ ...btn(value === k ? s.color : INK2, value === k), padding: small ? '3px 7px' : '5px 9px' }}>{s.label}{small ? '' : ` · ${s.slots}`}</button>)}
    </div>
  )
}

function AddForm({ onAdded }) {
  const [title, setTitle] = useState('')
  const [size, setSize] = useState('light')
  const [personal, setPersonal] = useState(false)
  const [tags, setTags] = useState([])
  const [due, setDue] = useState('')
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async (state = 'parked') => {
    if (!title.trim() || busy) return
    setBusy(true); setErr(null)
    try {
      const r = await addObjective({ title, size, personal, tags, due_date: due || null, state })
      if (r.refused) setErr(`Captured in the queue; it would not fit on the Board: ${r.refused.join(' · ')}`)
      setTitle(''); setDue(''); setTags([]); onAdded(r)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <Panel heading="New Side Mission" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit('parked') }} placeholder="What is the mission? Enter puts it in the queue." style={{ ...field, flex: 1, minWidth: 260 }} />
        <SizePills value={size} onChange={setSize} />
        <button onClick={() => setPersonal(p => !p)} style={btn(personal ? GOLD : INK2, personal)}>{personal ? 'Personal' : 'Third Horizon'}</button>
        <button onClick={() => setMore(m => !m)} style={btn(INK2)}>{more ? 'less' : 'more'}</button>
        <button onClick={() => submit('parked')} disabled={busy || !title.trim()} style={btn(BLUE, true, { opacity: title.trim() ? 1 : 0.5 })}><Plus size={11} /> Queue</button>
        <button onClick={() => submit('active')} disabled={busy || !title.trim()} style={btn(GREEN, true, { opacity: title.trim() ? 1 : 0.5 })}><Play size={11} /> Load now</button>
      </div>
      {more && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <Label style={{ marginBottom: 0 }}>Due</Label><input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ ...field, fontFamily: MONO, fontSize: 12 }} />
          <Label style={{ marginBottom: 0, marginLeft: 8 }}>Domain</Label>
          {TAGS.domain.map(t => <button key={t.id} onClick={() => setTags(ts => ts.includes(t.id) ? ts.filter(x => x !== t.id) : [...ts, t.id])} style={{ ...btn(tags.includes(t.id) ? BLUE : INK2, tags.includes(t.id)), padding: '3px 8px' }}>{t.label}</button>)}
        </div>
      )}
      {err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', color: RED, textTransform: 'uppercase', marginTop: 8 }}>{err}</div>}
    </Panel>
  )
}

function Row({ o, container, loadItem, onOpen, onRoute, onDone, onBin, onRestore, onPurge, onReopen }) {
  const size = sizeOf(o); const prov = provenance(o); const today = chiToday()
  const late = o.due_date && o.due_date < today
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}`, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div onClick={() => onOpen(o)} style={{ fontSize: 14, color: INK, cursor: 'pointer', lineHeight: 1.35 }}>{o.title}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 5 }}>
          <span style={chip(SIZES[size].color)}>{SIZES[size].label}</span>
          <span style={chip(realmOf(o) === 'personal' ? GOLD : PURPLE)}>{realmOf(o) === 'personal' ? 'Personal' : 'Third Horizon'}</span>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: GRAY }}>{prov.label}</span>
          {o.due_date && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: late ? RED : GRAY }}>due {fmtDay(o.due_date)}{late ? ' · overdue' : ''}</span>}
          {container === 'follow_up' && o.follow_up_date && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: o.follow_up_date <= today ? '#E0985C' : GRAY }}>follow up {fmtDay(o.follow_up_date)}</span>}
          {container === 'released' && o.released_at && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: GRAY }}>released {fmtDay(o.released_at.slice(0, 10))}{o.released_kind && o.released_kind !== 'done' ? ` · ${o.released_kind}` : ''}</span>}
          {loadItem && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: loadItem.equipped ? GREEN : BLUE }}>{loadItem.equipped ? 'on the Board · running' : 'on the Board · holstered'}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {container === 'bin' ? (
          <>
            <button onClick={() => onRestore(o)} style={btn(INK2)}><RotateCcw size={10} /> Restore</button>
            <button onClick={() => onPurge(o)} style={btn(RED)}><Trash2 size={10} /> Purge</button>
          </>
        ) : container === 'released' ? (
          <>
            <button onClick={() => onOpen(o)} style={btn(INK2)}><ExternalLink size={10} /> Open</button>
            <button onClick={() => onReopen(o)} style={btn(INK2)}><RotateCcw size={10} /> Reopen</button>
          </>
        ) : (
          <>
            {!loadItem && <button onClick={() => onRoute(o, 'active')} title="Load onto the Board" style={btn(GREEN)}><Play size={10} /> Load</button>}
            {CONTAINERS.filter(c => !['released', 'bin', container].includes(c)).map(c => { const I = ICON[c]; return <button key={c} onClick={() => onRoute(o, c)} title={STATE[c].label} style={{ ...btn(INK2), padding: '5px 7px' }}><I size={10} /></button> })}
            <button onClick={() => onDone(o)} title="Done: close it out" style={btn(GOLD)}><Check size={10} /> Done</button>
            <button onClick={() => onBin(o)} title="Bin" style={{ ...btn(INK2), padding: '5px 7px' }}><Trash2 size={10} /></button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SideMissionsPage({ onNavigate }) {
  const [rows, setRows] = useState(null)
  const [L, setL] = useState(null)
  const [container, setContainer] = useState(() => { try { return localStorage.getItem('sm-container') || 'parked' } catch { return 'parked' } })
  const [open, setOpen] = useState(null)
  const [filing, setFiling] = useState(null)
  const [msg, setMsg] = useState(null)
  const [filter, setFilter] = useState('')
  const [range, setRange] = useState(7)
  const refresh = useCallback(() => Promise.all([fetchObjectives(), fetchLoadout()]).then(([r, l]) => { setRows(r); setL(l) }).catch(e => setMsg(`Could not read: ${e.message}`)), [])
  useEffect(() => { Promise.resolve().then(refresh) }, [refresh])
  const pick = (c) => { setContainer(c); try { localStorage.setItem('sm-container', c) } catch { /* no-op */ } }

  const live = useMemo(() => (rows || []).filter(o => !o.deleted_at), [rows])
  const bin = useMemo(() => (rows || []).filter(o => o.deleted_at), [rows])
  const active = live.filter(o => o.state === 'active' && !(o.tags || []).includes('session'))
  const counts = Object.fromEntries(CONTAINERS.map(c => [c, c === 'bin' ? bin.length : c === 'released' ? live.filter(o => o.state === 'released').length : live.filter(o => o.state === c).length]))
  const since = new Date(); since.setDate(since.getDate() - range)
  const shown = (container === 'bin' ? bin : live.filter(o => o.state === container))
    .filter(o => container !== 'released' || range === 0 || (o.released_at && new Date(o.released_at) >= since))
    .filter(o => !filter || o.title.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => container === 'released' ? String(b.released_at).localeCompare(String(a.released_at)) : container === 'follow_up' ? String(a.follow_up_date || '9').localeCompare(String(b.follow_up_date || '9')) : String(a.due_date || '9').localeCompare(String(b.due_date || '9')) || String(b.captured_at).localeCompare(String(a.captured_at)))
  const loadItemFor = (o) => L?.items.find(i => i.id === o.id) || null

  const act = async (fn, after) => { try { const r = await fn(); if (r && r.ok === false) { setMsg(`Will not fit: ${r.reasons.join(' · ')}`); return } if (after) setMsg(after); await refresh() } catch (e) { setMsg(`Could not do that: ${e.message}`) } }
  const onDone = async (o) => {
    try {
      const p = await pockets(o.id)
      if (p.carrying) { setFiling({ o, p }); return }
      if (p.openSteps.length && !window.confirm(`${p.openSteps.length} step(s) still open. Close it out anyway?`)) return
      const r = await closeOut(o)
      setMsg(`Released: ${o.title} · ${r.minutes}m${r.personal ? ' · personal' : ''} · miles on the next update`); await refresh()
    } catch (e) { setMsg(`Could not close it out: ${e.message}`) }
  }

  const toItem = (o) => ({ id: o.id, objective_id: o.id, kind: (o.tags || []).includes('impromptu') ? 'Impromptu' : 'Side Mission', title: o.title, description: o.description, tags: o.tags, size: sizeOf(o), objective: o })

  return (
    <div style={S.page}>
      {open && <ItemDetail item={toItem(open)} onClose={() => { setOpen(null); refresh() }} onNavigate={onNavigate} onChange={refresh} />}
      {filing && <FileAway objective={filing.o} pockets={filing.p} onClose={() => setFiling(null)} onDone={({ filed, released }) => { setFiling(null); setMsg(`Filed ${filed.length} to the Archive and released ${filing.o.title} · ${released.minutes}m`); refresh() }} />}
      <div style={{ marginBottom: 18 }}>
        <h1 style={S.h1}><Target size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />Side Missions</h1>
        <div style={S.sub}>the queue · what is loaded runs on the Board</div>
      </div>

      <AddForm onAdded={() => refresh()} />

      {active.length > 0 && (
        <Panel heading="On the Board" style={{ marginBottom: 12 }}>
          {active.map(o => <Row key={o.id} o={o} container="active" loadItem={loadItemFor(o)} onOpen={setOpen} onRoute={(x, c) => act(() => route(x.id, c), `${x.title} → ${STATE[c].label}`)} onDone={onDone} onBin={(x) => act(() => binObjective(x.id), `Binned: ${x.title}`)} />)}
          {onNavigate && <div style={{ marginTop: 8 }}><button onClick={() => onNavigate('agenda')} style={btn(BLUE)}>Open the Board →</button></div>}
        </Panel>
      )}

      <Panel style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {CONTAINERS.map(c => { const I = ICON[c]; const col = c === 'bin' ? INK2 : STATE[c].color; return (
            <button key={c} onClick={() => pick(c)} style={{ ...btn(container === c ? col : INK2, container === c), padding: '6px 12px' }}><I size={11} /> {c === 'bin' ? 'Bin' : STATE[c].label}{counts[c] ? ` · ${counts[c]}` : ''}</button>
          ) })}
          <span style={{ flex: 1 }} />
          {container === 'released' && [7, 30, 0].map(r => <button key={r} onClick={() => setRange(r)} style={{ ...btn(range === r ? BLUE : INK2, range === r), padding: '4px 8px' }}>{r === 0 ? 'all' : `${r}d`}</button>)}
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter" style={{ ...field, width: 160, padding: '6px 10px', fontSize: 12 }} />
        </div>
        <div style={{ marginTop: 10 }}>
          {!rows && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading the queue</div>}
          {rows && shown.length === 0 && <div style={{ fontSize: 13, color: GRAY, padding: '12px 0' }}>{container === 'released' ? `Nothing released in the last ${range || 'all'} days.` : container === 'bin' ? 'The bin is empty.' : `Nothing in ${STATE[container].label}.`}</div>}
          {shown.map(o => (
            <Row key={o.id} o={o} container={container} loadItem={loadItemFor(o)} onOpen={setOpen}
              onRoute={(x, c) => act(() => route(x.id, c), c === 'active' ? `Loaded: ${x.title}` : `${x.title} → ${STATE[c].label}`)}
              onDone={onDone} onBin={(x) => act(() => binObjective(x.id), `Binned: ${x.title}`)}
              onRestore={(x) => act(() => restoreObjective(x.id), `Restored: ${x.title}`)} onPurge={(x) => { if (window.confirm(`Purge "${x.title}" for good?`)) act(() => purgeObjective(x.id), 'Purged') }}
              onReopen={(x) => act(() => reopenObjective(x.id), `Back in the queue: ${x.title}`)} />
          ))}
        </div>
        {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') || msg.startsWith('Will not') ? RED : GOLD_BRIGHT, textTransform: 'uppercase', marginTop: 12 }}>{msg}</div>}
      </Panel>
      <div style={S.source}>SOURCES · objectives · objective_steps · clocks · project-files/objectives · session_boards</div>
    </div>
  )
}
