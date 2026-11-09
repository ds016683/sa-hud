// Side Missions: the queue, one list with facets (David 11/9, Option A).
// The six state tabs are gone. A rail on the left slices the same open list by
// what needs deciding (a target), where an item came from, its domain, who it
// waits on; Group By reads the list by target week, source, domain or person;
// checkboxes and a bulk bar do the triage (Set Target, Nudge, Tag, Hand To,
// Waits On, Release, Bin). States stay in the Ledger as facts Lumen and the
// pulse read; the page shows them as facets, never as places.
// Canon enforced here (docs/CANON.md, docs/CARD-CANON.md): titles in Lora at
// 14.5, labels Title Case 16/600 in LABEL, meta 10.5 and never smaller, chrome
// one color with the accent for selected, overdue in CAUTION, released in
// SUCCESS, GREEN only for the Board, gold on one primary action.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Target, Play, Plus, Trash2, RotateCcw, Check } from 'lucide-react'
import FileAway from './river/FileAway'
import YayPage from './river/YayPage'
import { fetchObjectives, addObjective, route, updateObjective, binObjective, restoreObjective, purgeObjective, reopenObjective, closeOut, pockets, provenance, TAGS } from '../lib/objectives'
import { fetchLoadout, SIZES } from '../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, PANEL_BG, GOLD, BLUE, GREEN, RED, SUCCESS, CAUTION, LABEL, MUTED, NAVY_DEEP, MONO, SERIF, S, Panel, Label, SubLabel, TYPE, chiToday, NORTH_STAR_LABEL, NORTH_STAR_ASK, alpha } from './river/canon'
import { hudConfirm, hudPrompt } from '../lib/dialog'
import { openCard } from '../lib/card'
import { LEDGER_EVENT } from '../lib/lumenPanel'

// ---- chrome ---------------------------------------------------------------------
// One button shape, the canon Pill: ink outline at rest, accent fill when on.
const pill = (on = false, extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
  padding: '5px 12px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
  border: `1px solid ${on ? BLUE : PANEL_BORDER}`, background: on ? BLUE : 'transparent', color: on ? NAVY_DEEP : INK2, ...extra,
})
const primary = { ...S.btnPrimary, borderRadius: 999, fontWeight: 600 }
const field = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: TYPE.body, fontFamily: 'inherit', boxSizing: 'border-box' }
const meta = { fontFamily: MONO, fontSize: TYPE.meta, letterSpacing: '1px', textTransform: 'uppercase' }
const fmtDay = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const fmtTarget = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
const plusDays = (n, from = chiToday()) => { const d = new Date(from + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const weekEnd = (day) => { const d = new Date(day + 'T12:00:00'); const dow = d.getDay(); d.setDate(d.getDate() + (7 - dow) % 7); return d.toISOString().slice(0, 10) }

// One clear mark: the words Target Completion, then the date in ink. Caution once it
// passes (flagged, per the card palette), the off gray when none is set.
function TargetMark({ date, late }) {
  const tone = !date ? GRAY : late ? CAUTION : LABEL
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, padding: '3px 9px', border: `1px solid ${alpha(tone, 40)}`, borderRadius: 6 }}>
      <span style={{ ...meta, color: tone }}>Target Completion</span>
      <span style={{ fontSize: TYPE.body, fontWeight: 500, color: !date ? GRAY : late ? CAUTION : INK }}>{date ? fmtTarget(date) : 'Not Set'}{late ? ' · Overdue' : ''}</span>
    </span>
  )
}
const Tag = ({ children, color = LABEL }) => <span style={{ ...meta, color, border: `1px solid ${alpha(color, 33)}`, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{children}</span>

// ---- facets ---------------------------------------------------------------------
const DOMAIN_IDS = TAGS.domain.map(t => t.id)
const DOMAIN_LABEL = Object.fromEntries(TAGS.domain.map(t => [t.id, t.label]))
const personOf = (o) => String(o.who || o.stakeholder || '').trim() || null
const domainOf = (o) => (o.tags || []).find(t => DOMAIN_IDS.includes(t)) || null
const isStashed = (o) => (o.tags || []).includes('stashed')
const VIEWS = [
  ['open', 'All Open', (o) => o.state !== 'released'],
  ['target', 'Needs A Target', (o) => o.state !== 'released' && !o.due_date],
  ['dated', 'Dated', (o) => o.state !== 'released' && !!o.due_date],
  ['overdue', 'Overdue', (o, today) => o.state !== 'released' && !!o.due_date && o.due_date < today],
  ['nudge', 'Nudge Due', (o, today) => o.state === 'follow_up' && !!o.follow_up_date && o.follow_up_date <= today],
  ['board', 'On The Board', (o) => o.state === 'active'],
  ['stashed', 'Stashed', (o) => o.state === 'parked' && isStashed(o)],
  ['waiting', 'Waiting On Someone', (o) => o.state === 'waiting'],
  ['handed', 'Handed Off', (o) => o.state === 'foreman'],
  ['inbox', 'New From Lumen', (o) => o.state === 'inbox'],
  ['released', 'Released', (o) => o.state === 'released'],
]
const VIEW = Object.fromEntries(VIEWS.map(v => [v[0], v]))
const GROUPS = [['week', 'Target Week'], ['source', 'Source'], ['domain', 'Domain'], ['person', 'Person']]

function groupKey(o, by, today) {
  if (by === 'source') return provenance(o).label
  if (by === 'domain') return domainOf(o) ? DOMAIN_LABEL[domainOf(o)] : 'Untagged'
  if (by === 'person') return personOf(o) || 'No One Named'
  if (!o.due_date) return 'No Target'
  if (o.due_date < today) return 'Overdue'
  if (o.due_date <= weekEnd(today)) return 'This Week'
  if (o.due_date <= weekEnd(plusDays(7, today))) return 'Next Week'
  return 'Later'
}
const WEEK_ORDER = ['Overdue', 'This Week', 'Next Week', 'Later', 'No Target']

// ---- the add form -----------------------------------------------------------------
function AddForm({ onAdded }) {
  const [title, setTitle] = useState('')
  const [size, setSize] = useState('light')
  const [personal, setPersonal] = useState(false)
  const [tags, setTags] = useState([])
  const [due, setDue] = useState('')
  const [star, setStar] = useState('')
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async (state = 'parked') => {
    if (!title.trim() || busy) return
    setBusy(true); setErr(null)
    try {
      const r = await addObjective({ title, size, personal, tags, due_date: due || null, state, north_star: star })
      if (r.refused) setErr(`Captured in the queue; it would not fit on the Board: ${r.refused.join(' · ')}`)
      setTitle(''); setDue(''); setTags([]); setStar(''); setMore(false); onAdded(r)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <Panel heading="New Side Mission" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit('parked') }} placeholder="What is the mission? Enter puts it in the queue." style={{ ...field, flex: 1, minWidth: 260 }} />
        <div style={{ display: 'inline-flex', gap: 4 }}>
          {Object.entries(SIZES).map(([k, s]) => <button key={k} onClick={() => setSize(k)} title={s.sub} style={pill(size === k)}>{s.label} · {s.slots}</button>)}
        </div>
        <button onClick={() => setPersonal(p => !p)} style={pill(personal)}>{personal ? 'Personal' : 'Third Horizon'}</button>
        <button onClick={() => setMore(m => !m)} style={pill(more)}>{more ? 'Less' : 'More'}</button>
        <button onClick={() => submit('active')} disabled={busy || !title.trim()} style={pill(false, { opacity: title.trim() ? 1 : 0.5 })}><Play size={11} /> Load Now</button>
        <button onClick={() => submit('parked')} disabled={busy || !title.trim()} style={{ ...primary, opacity: title.trim() ? 1 : 0.5 }}><Plus size={12} /> Queue</button>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        <Label style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>{NORTH_STAR_LABEL}</Label>
        <input value={star} onChange={e => setStar(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit('parked') }} placeholder={NORTH_STAR_ASK} style={{ ...field, flex: 1, minWidth: 260 }} />
      </div>
      {more && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <Label style={{ marginBottom: 0 }}>Target Completion</Label><input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ ...field, width: 160 }} />
          <Label style={{ marginBottom: 0, marginLeft: 8 }}>Domain</Label>
          {TAGS.domain.map(t => <button key={t.id} onClick={() => setTags(ts => ts.includes(t.id) ? ts.filter(x => x !== t.id) : [...ts, t.id])} style={pill(tags.includes(t.id))}>{t.label}</button>)}
        </div>
      )}
      {err && <div style={{ fontSize: TYPE.body, color: RED, marginTop: 8 }}>{err}</div>}
    </Panel>
  )
}

// ---- a row ----------------------------------------------------------------------------
function Row({ o, view, loadItem, selected, onSelect, onOpen, onLoad, onDone, onBin, onRestore, onPurge, onReopen }) {
  const today = chiToday()
  const late = o.state !== 'released' && o.due_date && o.due_date < today
  const person = personOf(o)
  const released = view === 'released'
  const binned = view === 'bin'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
      {!binned && !released && (
        <button onClick={() => onSelect(o.id)} aria-label="select" style={{ width: 16, height: 16, flex: 'none', borderRadius: 4, border: `1px solid ${selected ? BLUE : INK2}`, background: selected ? BLUE : 'transparent', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected && <Check size={11} color={NAVY_DEEP} strokeWidth={3} />}
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div onClick={() => onOpen(o)} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, color: INK, cursor: 'pointer', lineHeight: 1.3, letterSpacing: '-0.005em' }}>{o.title}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
          {released
            ? <span style={{ ...meta, color: SUCCESS }}>Released {fmtDay(String(o.released_at || '').slice(0, 10))}{o.released_kind && o.released_kind !== 'done' ? ` · ${o.released_kind === 'foreman' ? 'Handed Off' : o.released_kind}` : ''}</span>
            : <TargetMark date={o.due_date} late={late} />}
          {o.state === 'waiting' && <Tag>Waits On · {person || 'Unnamed'}</Tag>}
          {o.state === 'foreman' && <Tag>Handed To · {person || 'Unnamed'}</Tag>}
          {o.state === 'follow_up' && o.follow_up_date && <Tag color={o.follow_up_date <= today ? CAUTION : LABEL}>Nudge · {fmtDay(o.follow_up_date)}</Tag>}
          {o.state === 'inbox' && <Tag>New From Lumen</Tag>}
          {loadItem && <span style={{ ...meta, color: GREEN }}>{loadItem.equipped ? 'On The Board · Running' : 'On The Board · Holstered'}</span>}
          {!loadItem && o.state === 'parked' && isStashed(o) && <span style={{ ...meta, color: MUTED }}>Stashed</span>}
          <span style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.3 }}>{provenance(o).label}{provenance(o).detail && provenance(o).label !== 'Added by hand' ? ` · ${provenance(o).detail}` : ''}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {binned ? (
          <>
            <button onClick={() => onRestore(o)} style={pill()}><RotateCcw size={10} /> Restore</button>
            <button onClick={() => onPurge(o)} style={pill()}><Trash2 size={10} /> Purge</button>
          </>
        ) : released ? (
          <button onClick={() => onReopen(o)} style={pill()}><RotateCcw size={10} /> Reopen</button>
        ) : (
          <>
            {!loadItem && <button onClick={() => onLoad(o)} title="Load onto the Board" style={pill()}><Play size={10} /> Load</button>}
            <button onClick={() => onDone(o)} title="Done: close it out" style={pill()}><Check size={10} /> Done</button>
            <button onClick={() => onBin(o)} title="Bin" style={{ ...pill(), padding: '5px 8px' }}><Trash2 size={10} /></button>
          </>
        )}
      </div>
    </div>
  )
}

// ---- the rail -------------------------------------------------------------------------
function Facet({ on, off = false, children, count, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, width: '100%', textAlign: 'left', padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: TYPE.body, background: on ? PANEL_BG : 'transparent', color: off && !on ? GRAY : on ? INK : INK2 }}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ ...meta, letterSpacing: '0.6px', color: off && !on ? GRAY : MUTED }}>{count}</span>
    </button>
  )
}

export default function SideMissionsPage({ onNavigate }) {
  const [rows, setRows] = useState(null)
  const [L, setL] = useState(null)
  const [view, setView] = useState(() => { try { return VIEW[localStorage.getItem('sm-view')] ? localStorage.getItem('sm-view') : 'open' } catch { return 'open' } })
  const [source, setSource] = useState(null)
  const [domain, setDomain] = useState(null)
  const [person, setPerson] = useState(null)
  const [groupBy, setGroupBy] = useState(() => { try { return localStorage.getItem('sm-group') || 'week' } catch { return 'week' } })
  const [filter, setFilter] = useState('')
  const [range, setRange] = useState(30)
  const [sel, setSel] = useState(() => new Set())
  const [filing, setFiling] = useState(null)
  const [yay, setYay] = useState(null)
  const [msg, setMsg] = useState(null)
  const [dateAsk, setDateAsk] = useState(null)   // 'target' | 'nudge' while the bulk date input is open
  const [tagAsk, setTagAsk] = useState(false)
  const refresh = useCallback(() => Promise.all([fetchObjectives(), fetchLoadout()]).then(([r, l]) => { setRows(r); setL(l) }).catch(e => setMsg(`Could not read: ${e.message}`)), [])
  useEffect(() => { Promise.resolve().then(refresh) }, [refresh])
  // A card edit (Target Completion, a route, a hand-off) shows on the row without a reload.
  useEffect(() => { const h = () => { refresh() }; window.addEventListener(LEDGER_EVENT, h); return () => window.removeEventListener(LEDGER_EVENT, h) }, [refresh])
  const pickView = (v) => { setView(v); setSel(new Set()); try { localStorage.setItem('sm-view', v) } catch { /* no-op */ } }
  const pickGroup = (g) => { setGroupBy(g); try { localStorage.setItem('sm-group', g) } catch { /* no-op */ } }
  const today = chiToday()

  // Side Missions only (David 10/26): a promoted milestone is a Main Mission's item and a
  // session item is the Board's; neither belongs on this page.
  const live = useMemo(() => (rows || []).filter(o => !o.deleted_at && !(o.tags || []).includes('mission-task') && !(o.tags || []).includes('session')), [rows])
  const bin = useMemo(() => (rows || []).filter(o => o.deleted_at), [rows])
  const open = useMemo(() => live.filter(o => o.state !== 'released'), [live])
  const active = open.filter(o => o.state === 'active')

  // The rail counts read against the current view, so a facet says how many of what you see.
  const inView = useMemo(() => view === 'bin' ? bin : live.filter(o => VIEW[view][2](o, today)), [view, bin, live, today])
  const sources = useMemo(() => { const m = new Map(); inView.forEach(o => { const k = provenance(o).label; m.set(k, (m.get(k) || 0) + 1) }); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [inView])
  const domains = useMemo(() => { const m = new Map(); inView.forEach(o => { const k = domainOf(o) || 'untagged'; m.set(k, (m.get(k) || 0) + 1) }); return [...DOMAIN_IDS.map(id => [id, m.get(id) || 0]).filter(x => x[1] > 0), ...(m.get('untagged') ? [['untagged', m.get('untagged')]] : [])] }, [inView])
  const people = useMemo(() => { const m = new Map(); inView.forEach(o => { const k = personOf(o); if (k) m.set(k, (m.get(k) || 0) + 1) }); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) }, [inView])
  const viewCount = (v) => v === 'bin' ? bin.length : live.filter(o => VIEW[v][2](o, today)).length

  const since = new Date(); since.setDate(since.getDate() - range)
  const shown = inView
    .filter(o => !source || provenance(o).label === source)
    .filter(o => !domain || (domain === 'untagged' ? !domainOf(o) : domainOf(o) === domain))
    .filter(o => !person || personOf(o) === person)
    .filter(o => view !== 'released' || range === 0 || (o.released_at && new Date(o.released_at) >= since))
    .filter(o => !filter || o.title.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => view === 'released' ? String(b.released_at).localeCompare(String(a.released_at)) : String(a.due_date || '9').localeCompare(String(b.due_date || '9')) || String(b.captured_at).localeCompare(String(a.captured_at)))
  const grouped = useMemo(() => {
    if (view === 'released' || view === 'bin') return [[null, shown]]
    const m = new Map(); shown.forEach(o => { const k = groupKey(o, groupBy, today); if (!m.has(k)) m.set(k, []); m.get(k).push(o) })
    const keys = [...m.keys()].sort((a, b) => groupBy === 'week' ? WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b) : m.get(b).length - m.get(a).length)
    return keys.map(k => [k, m.get(k)])
  }, [shown, groupBy, view, today])
  const loadItemFor = (o) => L?.items.find(i => i.id === o.id) || null

  const act = async (fn, after) => { try { const r = await fn(); if (r && r.ok === false) { setMsg(`Will not fit: ${r.reasons.join(' · ')}`); return } if (after) setMsg(after); await refresh() } catch (e) { setMsg(`Could not do that: ${e.message}`) } }
  // What a release pays (David 10/26): say it plainly, then the yay page.
  const paysLine = (o) => { if ((o.tags || []).includes('impromptu')) return 'Ad Hoc · 1 mile at the close'; const e = Number(o.effort) || 1; return e >= 4 ? 'Mythic · 50 miles at the close' : e === 3 ? 'Contract · 15 miles at the close' : 'Bounty · 4 miles at the close' }
  const onDone = async (o) => {
    try {
      const p = await pockets(o.id)
      if (p.carrying) { setFiling({ o, p }); return }
      if (p.openSteps.length && !await hudConfirm(`${p.openSteps.length} step(s) still open. Close it out anyway?`)) return
      const r = await closeOut(o)
      setMsg(`Released: ${o.title}${r.minutes ? ` · ${r.minutes} minutes on the clock` : ''}${r.personal ? ' · personal' : ''} · ${paysLine(o)}`); await refresh(); setYay(o.id)
    } catch (e) { setMsg(`Could not close it out: ${e.message}`) }
  }

  // ---- bulk ----------------------------------------------------------------------------
  const picked = shown.filter(o => sel.has(o.id))
  const toggle = (id) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const clear = () => { setSel(new Set()); setDateAsk(null); setTagAsk(false) }
  const each = async (fn, label) => {
    let ok = 0, failed = 0
    for (const o of picked) { try { await fn(o); ok++ } catch { failed++ } }
    setMsg(`${label}: ${ok} ${ok === 1 ? 'item' : 'items'}${failed ? ` · ${failed} did not take` : ''}`)
    clear(); await refresh()
  }
  const setDate = (kind, value) => each(o => kind === 'target' ? updateObjective(o.id, { due_date: value || null }) : updateObjective(o.id, { follow_up_date: value || null, ...(value && o.state === 'parked' ? { state: 'follow_up' } : {}) }), kind === 'target' ? (value ? `Target Completion ${fmtTarget(value)}` : 'Target Completion cleared') : (value ? `Nudge ${fmtDay(value)}` : 'Nudge cleared'))
  const tagAll = (id) => each(o => updateObjective(o.id, { tags: [...new Set([...(o.tags || []), id])] }), `Tagged ${DOMAIN_LABEL[id]}`)
  const untagAll = (id) => each(o => updateObjective(o.id, { tags: (o.tags || []).filter(t => t !== id) }), `Untagged ${DOMAIN_LABEL[id]}`)
  const handTo = async (state) => {
    const who = await hudPrompt(state === 'foreman' ? 'Hand it to whom?' : 'Waiting on whom?', '')
    if (!who) return
    await each(async o => { await route(o.id, state); await updateObjective(o.id, { who: String(who).trim().slice(0, 120) }) }, state === 'foreman' ? `Handed to ${who}` : `Waiting on ${who}`)
  }
  const takeBack = () => each(o => route(o.id, 'parked').then(() => updateObjective(o.id, { who: null })), 'Back in the queue')
  const releaseAll = async () => {
    if (!await hudConfirm(`Release ${picked.length} ${picked.length === 1 ? 'item' : 'items'}? Anything carrying files is skipped and stays for its own close-out.`)) return
    let ok = 0, skipped = 0
    for (const o of picked) { try { const p = await pockets(o.id); if (p.carrying) { skipped++; continue } await closeOut(o); ok++ } catch { skipped++ } }
    setMsg(`Released ${ok}${skipped ? ` · ${skipped} skipped (carrying files or steps, close them one at a time)` : ''}`); clear(); await refresh()
  }
  const binAll = async () => { if (!await hudConfirm(`Bin ${picked.length} ${picked.length === 1 ? 'item' : 'items'}? The Bin keeps them until you purge.`)) return; each(o => binObjective(o.id), 'Binned') }

  const summary = `${open.length} open · ${open.filter(o => !o.due_date).length} need a target · ${open.filter(o => o.due_date && o.due_date < today).length} overdue · ${active.length} on the Board`

  return (
    <div style={S.page}>
      {filing && <FileAway objective={filing.o} pockets={filing.p} onClose={() => setFiling(null)} onDone={({ filed, released }) => { const id = filing.o.id; const line = paysLine(filing.o); setFiling(null); setMsg(`Filed ${filed.length} to the Archive and released ${filing.o.title}${released.minutes ? ` · ${released.minutes} minutes on the clock` : ''} · ${line}`); refresh(); setYay(id) }} />}
      {yay && <YayPage objectiveId={yay} fresh onClose={() => setYay(null)} />}
      <div style={{ marginBottom: 18 }}>
        <h1 style={S.h1}><Target size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />Side Missions</h1>
        <div style={{ fontFamily: SERIF, fontSize: 19, color: INK, marginTop: 8, lineHeight: 1.3 }}>{rows ? summary : 'Reading the queue'}</div>
      </div>

      <AddForm onAdded={() => refresh()} />

      {active.length > 0 && (
        <Panel heading="On the Board" style={{ marginBottom: 12 }}>
          {active.map(o => <Row key={o.id} o={o} view="open" loadItem={loadItemFor(o)} selected={false} onSelect={() => {}} onOpen={(o) => openCard(o.id)} onLoad={() => {}} onDone={onDone} onBin={(x) => act(() => binObjective(x.id), `Binned: ${x.title}`)} />)}
          {onNavigate && <div style={{ marginTop: 10 }}><button onClick={() => onNavigate('agenda')} style={pill()}>Open the Board →</button></div>}
        </Panel>
      )}

      <Panel style={{ marginBottom: 12 }}>
        <div className="sm-grid" style={{ display: 'grid', gridTemplateColumns: '216px minmax(0, 1fr)', gap: 22 }}>
          {/* the rail */}
          <div>
            <Label>View</Label>
            {VIEWS.map(([k, label]) => { const n = viewCount(k); if (!n && !['open', 'target', 'released'].includes(k)) return null; return <Facet key={k} on={view === k} off={!n} count={n} onClick={() => pickView(k)}>{label}</Facet> })}
            <Facet on={view === 'bin'} off={!bin.length} count={bin.length} onClick={() => pickView('bin')}>Bin</Facet>
            {sources.length > 0 && <>
              <Label style={{ marginTop: 18 }}>Source</Label>
              <Facet on={!source} count={inView.length} onClick={() => setSource(null)}>Every Source</Facet>
              {sources.map(([k, n]) => <Facet key={k} on={source === k} count={n} onClick={() => setSource(source === k ? null : k)}>{k}</Facet>)}
            </>}
            {domains.length > 0 && <>
              <Label style={{ marginTop: 18 }}>Domain</Label>
              <Facet on={!domain} count={inView.length} onClick={() => setDomain(null)}>Every Domain</Facet>
              {domains.map(([k, n]) => <Facet key={k} on={domain === k} count={n} onClick={() => setDomain(domain === k ? null : k)}>{k === 'untagged' ? 'Untagged' : DOMAIN_LABEL[k]}</Facet>)}
            </>}
            {people.length > 0 && <>
              <Label style={{ marginTop: 18 }}>Person</Label>
              {people.map(([k, n]) => <Facet key={k} on={person === k} count={n} onClick={() => setPerson(person === k ? null : k)}>{k}</Facet>)}
            </>}
          </div>

          {/* the list */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {view !== 'released' && view !== 'bin' && <>
                <Label style={{ marginBottom: 0, marginRight: 4 }}>Group By</Label>
                {GROUPS.map(([k, label]) => <button key={k} onClick={() => pickGroup(k)} style={pill(groupBy === k)}>{label}</button>)}
              </>}
              {view === 'released' && <>
                <Label style={{ marginBottom: 0, marginRight: 4 }}>Released In The Last</Label>
                {[7, 30, 0].map(r => <button key={r} onClick={() => setRange(r)} style={pill(range === r)}>{r === 0 ? 'All Time' : `${r} Days`}</button>)}
              </>}
              <span style={{ flex: 1 }} />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by title" style={{ ...field, width: 190, padding: '6px 10px' }} />
            </div>

            {picked.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: '9px 12px', marginTop: 12 }}>
                <SubLabel style={{ marginBottom: 0, color: INK }}>{picked.length} Selected</SubLabel>
                {dateAsk
                  ? <>
                      <Label style={{ marginBottom: 0 }}>{dateAsk === 'target' ? 'Target Completion' : 'Nudge On'}</Label>
                      <input type="date" autoFocus onChange={e => { if (e.target.value) setDate(dateAsk, e.target.value) }} style={{ ...field, width: 160, padding: '5px 10px' }} />
                      {dateAsk === 'target' && <>
                        <button onClick={() => setDate('target', today)} style={pill()}>Today</button>
                        <button onClick={() => setDate('target', weekEnd(today) === today ? plusDays(7, today) : weekEnd(today) < plusDays(5, today) ? weekEnd(today) : plusDays(5, today))} style={pill()}>This Week</button>
                        <button onClick={() => setDate('target', plusDays(7, today))} style={pill()}>Next Week</button>
                      </>}
                      <button onClick={() => setDate(dateAsk, null)} style={pill()}>Clear It</button>
                      <button onClick={() => setDateAsk(null)} style={pill()}>Cancel</button>
                    </>
                  : tagAsk
                    ? <>
                        <Label style={{ marginBottom: 0 }}>Domain</Label>
                        {TAGS.domain.map(t => { const all = picked.every(o => (o.tags || []).includes(t.id)); return <button key={t.id} onClick={() => all ? untagAll(t.id) : tagAll(t.id)} style={pill(all)}>{t.label}</button> })}
                        <button onClick={() => setTagAsk(false)} style={pill()}>Cancel</button>
                      </>
                    : <>
                        <button onClick={() => setDateAsk('target')} style={pill(true)}>Set Target</button>
                        <button onClick={() => setDateAsk('nudge')} style={pill()}>Nudge</button>
                        <button onClick={() => setTagAsk(true)} style={pill()}>Tag</button>
                        <button onClick={() => handTo('foreman')} style={pill()}>Hand To</button>
                        <button onClick={() => handTo('waiting')} style={pill()}>Waits On</button>
                        {picked.some(o => ['waiting', 'foreman', 'follow_up', 'inbox'].includes(o.state)) && <button onClick={takeBack} style={pill()}>Back To Queue</button>}
                        <button onClick={releaseAll} style={pill()}>Release</button>
                        <button onClick={binAll} style={pill()}>Bin</button>
                        <span style={{ flex: 1 }} />
                        <button onClick={clear} style={pill()}>Clear</button>
                      </>}
              </div>
            )}

            {!rows && <div style={{ fontSize: TYPE.body, color: MUTED, padding: '14px 0' }}>Reading the queue</div>}
            {rows && shown.length === 0 && <div style={{ fontSize: TYPE.body, color: GRAY, padding: '14px 0' }}>{view === 'bin' ? 'The bin is empty.' : view === 'released' ? `Nothing released in the last ${range || 'all'} days.` : 'Nothing here.'}</div>}
            {grouped.map(([k, list]) => (
              <div key={k || 'all'} style={{ marginTop: 14 }}>
                {k && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
                    <SubLabel style={{ marginBottom: 0 }}>{k}</SubLabel>
                    <span style={{ ...meta, letterSpacing: '0.6px', color: MUTED }}>{list.length}</span>
                    <span style={{ flex: 1 }} />
                    <button onClick={() => setSel(s => { const n = new Set(s); const all = list.every(o => n.has(o.id)); list.forEach(o => all ? n.delete(o.id) : n.add(o.id)); return n })} style={{ ...pill(), padding: '3px 9px' }}>{list.every(o => sel.has(o.id)) ? 'None' : 'Select All'}</button>
                  </div>
                )}
                {list.map(o => (
                  <Row key={o.id} o={o} view={view} loadItem={loadItemFor(o)} selected={sel.has(o.id)} onSelect={toggle} onOpen={(o) => openCard(o.id)}
                    onLoad={(x) => act(() => route(x.id, 'active'), `Loaded: ${x.title}`)}
                    onDone={onDone} onBin={(x) => act(() => binObjective(x.id), `Binned: ${x.title}`)}
                    onRestore={(x) => act(() => restoreObjective(x.id), `Restored: ${x.title}`)} onPurge={async (x) => { if (await hudConfirm(`Purge "${x.title}" for good?`)) act(() => purgeObjective(x.id), 'Purged') }}
                    onReopen={(x) => act(() => reopenObjective(x.id), `Back in the queue: ${x.title}`)} />
                ))}
              </div>
            ))}
            {msg && <div style={{ fontSize: TYPE.body, color: msg.startsWith('Could not') || msg.startsWith('Will not') ? RED : MUTED, marginTop: 14 }}>{msg}</div>}
          </div>
        </div>
      </Panel>
      <div style={S.source}>SOURCES · objectives · objective_steps · clocks · project-files/objectives · session_boards</div>
      <style>{`@media (max-width: 820px) { .sm-grid { grid-template-columns: 1fr !important } }`}</style>
    </div>
  )
}
