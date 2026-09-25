// Maintenance: the upkeep of a life. Four pillars (Health, Hygiene, Spiritual,
// Family) on the maintenance_items table, plus a Health dashboard that reads
// daily_logs (sleep, exercise, medication, diet). Five items done in a day
// strike a Maintenance Bundle.
import { useState, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { S, Eyebrow, Panel, Stat, Label, GRAY, INK2, GOLD, GREEN, BLUE, PURPLE, PERIWINKLE, RED, PANEL_BORDER, MONO, chiToday } from './river/canon'

// ---------- constants ----------
const TOP_PILLS = [
  { id: 'health', label: 'Health' },
  { id: 'hygiene', label: 'Hygiene' },
  { id: 'spiritual', label: 'Spiritual' },
  { id: 'family', label: 'Family' },
]
const HEALTH_PILLS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'exercise', label: 'Exercise' },
  { id: 'medication', label: 'Medication' },
  { id: 'diet', label: 'Diet' },
]
// Which stored categories roll up under each pill. Older rows may say
// 'content', 'exercise', 'other'; exercise reads as Health, the rest as Family.
const PILL_CATS = {
  health: ['health', 'exercise'],
  hygiene: ['hygiene'],
  spiritual: ['spiritual'],
  family: ['family', 'content', 'other'],
}
const CAT_COLOR = { health: GOLD, exercise: GOLD, hygiene: GREEN, spiritual: PURPLE, family: PERIWINKLE, content: BLUE, other: BLUE }
const CAT_LABEL = { health: 'Health', exercise: 'Exercise', hygiene: 'Hygiene', spiritual: 'Spiritual', family: 'Family', content: 'Content', other: 'Other' }

const CTRL = { fontSize: 12, padding: '7px 10px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: '#EAF1F8' }
const BTN = { ...CTRL, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }
const ERR_STYLE = { color: RED, fontFamily: MONO, fontSize: 11, margin: '8px 0' }

// ---------- helpers ----------
const readLS = (k, fallback) => { try { return localStorage.getItem(k) || fallback } catch { return fallback } }
const writeLS = (k, v) => { try { localStorage.setItem(k, v) } catch { /* no-op */ } }

// Chicago day string shifted back n days.
const chiDayMinus = (n) => {
  const [y, m, d] = chiToday().split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d - n, 12))
  return t.toISOString().slice(0, 10)
}
const last14 = () => Array.from({ length: 14 }, (_, i) => chiDayMinus(i))
// Monday-start week containing today (Chicago).
const weekStart = () => {
  const today = chiToday()
  const dow = new Date(today + 'T12:00:00').getDay() // 0 Sun .. 6 Sat
  const back = (dow + 6) % 7
  return chiDayMinus(back)
}
const shortDay = (day) => day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
const num = (v) => (v === null || v === undefined || v === '') ? null : Number(v)
const fmtNum = (v) => v === null ? '' : (Number.isInteger(v) ? String(v) : v.toFixed(1))

// Translate database errors into one friendly line. Never throw.
const friendly = (error, table) => {
  const m = String(error?.message || error || '')
  if (/check constraint|violates check/i.test(m)) {
    return table === 'daily_logs'
      ? 'Kind not enabled in the database yet (run the 9/25 SQL).'
      : 'Category not enabled in the database yet (run the 9/25 SQL).'
  }
  if (/row-level security|policy/i.test(m)) return `Writes to ${table} are not permitted yet (run the 9/25 SQL).`
  if (/relation .* does not exist|schema cache/i.test(m)) return `The ${table} table is not created yet (run sql/2026-09-23-river.sql).`
  return m || 'Something went wrong.'
}

// ---------- small components ----------
function PillRow({ options, value, onPick, small = false, style }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', ...style }}>
      {options.map(o => {
        const on = value === o.id
        return (
          <button key={o.id} onClick={() => onPick(o.id)} style={{
            fontSize: small ? 10 : 11, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO,
            padding: small ? '5px 11px' : '7px 14px', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${on ? 'rgba(230,181,79,0.6)' : PANEL_BORDER}`,
            background: on ? 'rgba(230,181,79,0.12)' : 'rgba(255,255,255,0.03)',
            color: on ? GOLD : '#EAF1F8',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

function ErrLine({ msg }) { return msg ? <div style={ERR_STYLE}>{msg}</div> : null }

// A list of maintenance_items filtered to a set of categories, with the
// add / done / drop controls. `insertCat` is the category new rows receive.
function ItemList({ items, cats, insertCat, onChanged, title, blank }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState(null)
  const mine = items.filter(i => cats.includes(i.category))
  const open = mine.filter(i => i.status === 'open')
  const doneToday = mine.filter(i => i.status === 'done' && i.day === chiToday())

  const add = async () => {
    if (!text.trim()) return
    const { error } = await supabase.from('maintenance_items').insert({ title: text.trim(), category: insertCat, status: 'open' })
    if (error) { setErr(friendly(error, 'maintenance_items')); return }
    setErr(null); setText(''); onChanged()
  }
  const done = async (id) => {
    const { error } = await supabase.from('maintenance_items').update({ status: 'done', day: chiToday(), done_at: new Date().toISOString() }).eq('id', id)
    if (error) { setErr(friendly(error, 'maintenance_items')); return }
    setErr(null); onChanged()
  }
  const drop = async (id) => {
    const { error } = await supabase.from('maintenance_items').update({ status: 'dropped' }).eq('id', id)
    if (error) { setErr(friendly(error, 'maintenance_items')); return }
    setErr(null); onChanged()
  }

  return (
    <Panel title={title}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Add an item" style={{ ...CTRL, flex: '1 1 220px' }} />
        <button onClick={add} style={{ ...BTN, borderColor: 'rgba(230,181,79,0.5)', color: GOLD }}><Plus size={14} /> Add</button>
      </div>
      <ErrLine msg={err} />
      {open.length === 0 && <div style={{ color: GRAY, fontSize: 13 }}>{blank}</div>}
      {open.map(i => (
        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}` }}>
          <span style={S.chip(`${CAT_COLOR[i.category] || GRAY}22`, CAT_COLOR[i.category] || GRAY)}>{CAT_LABEL[i.category] || i.category}</span>
          <span style={{ flex: 1, fontSize: 13.5, color: INK2 }}>{i.title}{i.cadence && <span style={{ color: GRAY, fontSize: 11, marginLeft: 8 }}>{i.cadence}</span>}</span>
          <button onClick={() => done(i.id)} title="Done today" style={{ ...BTN, color: GREEN, padding: '4px 8px' }}><Check size={14} /></button>
          <button onClick={() => drop(i.id)} title="Drop" style={{ ...BTN, color: GRAY, padding: '4px 8px' }}><X size={14} /></button>
        </div>
      ))}
      {doneToday.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Label>done today · {doneToday.length}</Label>
          {doneToday.map(i => (
            <div key={i.id} style={{ display: 'flex', gap: 10, padding: '4px 0', fontSize: 13, color: INK2 }}><Check size={14} color={GREEN} /> {i.title}</div>
          ))}
        </div>
      )}
    </Panel>
  )
}

// Compact 14-day table. `cols` = [{ key, label, render(row) }]; rows are one per day.
function LogTable14({ cols, rows, blank = 'No logs in the last 14 days.' }) {
  const any = rows.some(r => cols.some(c => c.key !== 'day' && c.render(r)))
  if (!any) return <div style={{ color: GRAY, fontSize: 13 }}>{blank}</div>
  const th = { textAlign: 'left', fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: GRAY, padding: '4px 8px 6px 0', fontWeight: 500, whiteSpace: 'nowrap' }
  const td = { fontSize: 12.5, color: INK2, padding: '5px 8px 5px 0', borderTop: `1px solid ${PANEL_BORDER}`, verticalAlign: 'top' }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{cols.map(c => <th key={c.key} style={th}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.day}>
              {cols.map(c => <td key={c.key} style={{ ...td, whiteSpace: c.key === 'day' ? 'nowrap' : 'normal', color: c.key === 'day' ? '#EAF1F8' : INK2 }}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Quick-add form for a daily_logs kind. `fields` = [{ key: 'value'|'what'|'note', placeholder, type, width }].
function QuickAdd({ kind, fields, onAdded, hint }) {
  const [vals, setVals] = useState({})
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setVals(p => ({ ...p, [k]: v }))
  const submit = async () => {
    const row = { day: chiToday(), kind, source: 'hud' }
    let has = false
    for (const f of fields) {
      const v = (vals[f.key] ?? '').toString().trim()
      if (!v) continue
      has = true
      row[f.key] = f.key === 'value' ? Number(v) : v
    }
    if (!has) return
    if (row.value !== undefined && Number.isNaN(row.value)) { setErr('Enter a number.'); return }
    setBusy(true)
    const { error } = await supabase.from('daily_logs').insert(row)
    setBusy(false)
    if (error) { setErr(friendly(error, 'daily_logs')); return }
    setErr(null); setVals({}); onAdded()
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {fields.map(f => (
          <input key={f.key} type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} min={f.type === 'number' ? 0 : undefined}
            value={vals[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={f.placeholder} style={{ ...CTRL, flex: f.width || '1 1 160px' }} />
        ))}
        <button onClick={submit} disabled={busy} style={{ ...BTN, borderColor: 'rgba(230,181,79,0.5)', color: GOLD, opacity: busy ? 0.6 : 1 }}><Plus size={14} /> Log</button>
      </div>
      <ErrLine msg={err} />
      {hint && <div style={{ ...S.source, marginTop: 8 }}>{hint}</div>}
    </div>
  )
}

function Placeholder({ title, copy }) {
  return (
    <Panel title={title}>
      <div style={{ color: GRAY, fontSize: 13 }}>{copy}</div>
      <Label style={{ marginTop: 10 }}>placeholder</Label>
    </Panel>
  )
}

// ---------- log shaping ----------
// Group the 14-day logs by day; one row per day, newest first.
const byDay = (logs) => {
  const days = last14()
  const map = Object.fromEntries(days.map(d => [d, { day: d, sleep: [], exercise: [], medication: [], diet: [] }]))
  for (const l of logs) {
    const r = map[l.day]
    if (!r || !r[l.kind]) continue
    r[l.kind].push(l)
  }
  return days.map(d => map[d])
}
const sumVal = (arr) => arr.reduce((a, l) => a + (num(l.value) || 0), 0)
const joinWhat = (arr) => arr.map(l => l.what).filter(Boolean).join(', ')
const joinNote = (arr) => arr.map(l => l.note).filter(Boolean).join(' · ')

// ---------- health views ----------
function HealthOverview({ rows, logs, items, onChanged }) {
  const today = chiToday(), yday = chiDayMinus(1), ws = weekStart()
  const sleepRow = rows.find(r => r.day === today && r.sleep.length) || rows.find(r => r.day === yday && r.sleep.length)
  const sleepLast = sleepRow ? sumVal(sleepRow.sleep) : null
  const weekEx = logs.filter(l => l.kind === 'exercise' && l.day >= ws)
  const exMin = sumVal(weekEx)
  const exDays = new Set(weekEx.map(l => l.day)).size
  const medDays = new Set(logs.filter(l => l.kind === 'medication' && l.day >= ws).map(l => l.day)).size
  const healthOpen = items.filter(i => PILL_CATS.health.includes(i.category) && i.status === 'open').length

  const cols = [
    { key: 'day', label: 'Day', render: r => shortDay(r.day) },
    { key: 'sleep', label: 'Sleep h', render: r => r.sleep.length ? fmtNum(sumVal(r.sleep)) : '' },
    { key: 'exmin', label: 'Ex min', render: r => r.exercise.length ? fmtNum(sumVal(r.exercise)) : '' },
    { key: 'exwhat', label: 'Exercise', render: r => joinWhat(r.exercise) },
    { key: 'med', label: 'Med', render: r => r.medication.length ? <Check size={13} color={GREEN} /> : '' },
    { key: 'diet', label: 'Diet', render: r => [joinWhat(r.diet), joinNote(r.diet)].filter(Boolean).join(' · ') },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, margin: '0 0 18px' }}>
        <Stat v={sleepLast === null ? '·' : fmtNum(sleepLast)} l="sleep last night, hours" />
        <Stat v={fmtNum(exMin)} l="exercise minutes this week" color={GOLD} />
        <Stat v={exDays} l="exercise days this week" color={GOLD} />
        <Stat v={`${medDays}/7`} l="medication adherence this week" color={GREEN} />
        <Stat v={healthOpen} l="health items open" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        <Panel title="Last 14 days" style={{ marginBottom: 0 }}>
          <LogTable14 cols={cols} rows={rows} />
        </Panel>
        <ItemList items={items} cats={PILL_CATS.health} insertCat="health" onChanged={onChanged} title="Health items" blank="Nothing here yet. Add the first item above." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginTop: 12 }}>
        <Placeholder title="Fitness tracker" copy="Tracker data lands here when the feed is connected." />
        <Placeholder title="Scans" copy="Scan images and readings land here." />
      </div>
    </>
  )
}

function SleepView({ rows, onChanged }) {
  const cols = [
    { key: 'day', label: 'Day', render: r => shortDay(r.day) },
    { key: 'hours', label: 'Hours', render: r => r.sleep.length ? fmtNum(sumVal(r.sleep)) : '' },
    { key: 'note', label: 'Note', render: r => joinNote(r.sleep) },
  ]
  return (
    <>
      <Panel title="Log sleep">
        <QuickAdd kind="sleep" onAdded={onChanged} hint="Or tell Lumen: slept 7 hours."
          fields={[{ key: 'value', type: 'number', placeholder: 'Hours', width: '0 1 110px' }, { key: 'note', placeholder: 'Note (optional)' }]} />
      </Panel>
      <Panel title="Last 14 days"><LogTable14 cols={cols} rows={rows} blank="No sleep logged in the last 14 days." /></Panel>
    </>
  )
}

function ExerciseView({ rows, logs, onChanged }) {
  const ws = weekStart()
  const weekMin = sumVal(logs.filter(l => l.kind === 'exercise' && l.day >= ws))
  const cols = [
    { key: 'day', label: 'Day', render: r => shortDay(r.day) },
    { key: 'min', label: 'Minutes', render: r => r.exercise.length ? fmtNum(sumVal(r.exercise)) : '' },
    { key: 'what', label: 'What', render: r => joinWhat(r.exercise) },
    { key: 'note', label: 'Note', render: r => joinNote(r.exercise) },
  ]
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, margin: '0 0 18px' }}>
        <Stat v={fmtNum(weekMin)} l="minutes this week (Mon start)" color={GOLD} />
      </div>
      <Panel title="Log exercise">
        <QuickAdd kind="exercise" onAdded={onChanged} hint="Or tell Lumen: ran 40 minutes."
          fields={[{ key: 'value', type: 'number', placeholder: 'Minutes', width: '0 1 110px' }, { key: 'what', placeholder: 'What (run, lift, walk)' }, { key: 'note', placeholder: 'Note (optional)' }]} />
      </Panel>
      <Panel title="Last 14 days"><LogTable14 cols={cols} rows={rows} blank="No exercise logged in the last 14 days." /></Panel>
    </>
  )
}

function MedicationView({ rows, onChanged }) {
  const cols = [
    { key: 'day', label: 'Day', render: r => shortDay(r.day) },
    { key: 'what', label: 'Medication', render: r => joinWhat(r.medication) },
    { key: 'note', label: 'Note', render: r => joinNote(r.medication) },
  ]
  return (
    <>
      <Panel title="Log medication">
        <div style={{ ...S.source, marginTop: 0, marginBottom: 10 }}>Regimen to be defined.</div>
        <QuickAdd kind="medication" onAdded={onChanged}
          fields={[{ key: 'what', placeholder: 'Medication' }, { key: 'note', placeholder: 'Note (optional)' }]} />
      </Panel>
      <Panel title="Last 14 days"><LogTable14 cols={cols} rows={rows} blank="No medication logged in the last 14 days." /></Panel>
    </>
  )
}

function DietView({ rows, onChanged }) {
  const cols = [
    { key: 'day', label: 'Day', render: r => shortDay(r.day) },
    { key: 'what', label: 'What', render: r => joinWhat(r.diet) },
    { key: 'note', label: 'Note', render: r => joinNote(r.diet) },
  ]
  return (
    <>
      <Panel title="Log diet">
        <div style={{ ...S.source, marginTop: 0, marginBottom: 10 }}>Diet plan to be defined.</div>
        <QuickAdd kind="diet" onAdded={onChanged}
          fields={[{ key: 'what', placeholder: 'What you ate' }, { key: 'note', placeholder: 'Note (optional)' }]} />
      </Panel>
      <Panel title="Last 14 days"><LogTable14 cols={cols} rows={rows} blank="No diet logged in the last 14 days." /></Panel>
    </>
  )
}

// ---------- page ----------
export default function MaintenancePage() {
  const [pill, setPill] = useState(() => readLS('maint-pill', 'health'))
  const [hpill, setHpill] = useState(() => readLS('maint-health', 'overview'))
  const pickPill = (id) => { setPill(id); writeLS('maint-pill', id) }
  const pickH = (id) => { setHpill(id); writeLS('maint-health', id) }

  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [loadErr, setLoadErr] = useState(null)
  const [tick, setTick] = useState(0)
  const refresh = () => setTick(t => t + 1)

  useEffect(() => {
    let alive = true
    const since = chiDayMinus(13)
    Promise.all([
      supabase.from('maintenance_items').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('daily_logs').select('day,kind,what,value,note,at').gte('day', since).order('at', { ascending: true }).limit(1000),
    ]).then(([it, lg]) => {
      if (!alive) return
      const errs = []
      if (it.error) errs.push(friendly(it.error, 'maintenance_items')); else setItems(it.data || [])
      if (lg.error) errs.push(friendly(lg.error, 'daily_logs')); else setLogs(lg.data || [])
      setLoadErr(errs.length ? errs.join(' ') : null)
    }).catch(e => { if (alive) setLoadErr(friendly(e, 'maintenance_items')) })
    return () => { alive = false }
  }, [tick])

  const rows = byDay(logs)
  const doneToday = items.filter(i => i.status === 'done' && i.day === chiToday()).length

  const renderHealth = () => {
    switch (hpill) {
      case 'sleep': return <SleepView rows={rows} onChanged={refresh} />
      case 'exercise': return <ExerciseView rows={rows} logs={logs} onChanged={refresh} />
      case 'medication': return <MedicationView rows={rows} onChanged={refresh} />
      case 'diet': return <DietView rows={rows} onChanged={refresh} />
      default: return <HealthOverview rows={rows} logs={logs} items={items} onChanged={refresh} />
    }
  }

  const label = TOP_PILLS.find(p => p.id === pill)?.label || 'Items'

  return (
    <div style={S.page}>
      <Eyebrow>MISSION BOARD · MAINTENANCE</Eyebrow>
      <h1 style={S.h1}>Maintenance</h1>
      <p style={S.sub}>the upkeep of a life · five items done in a day strike a bundle</p>
      <PillRow options={TOP_PILLS} value={pill} onPick={pickPill} style={{ margin: '18px 0 14px' }} />
      {pill === 'health' && <PillRow options={HEALTH_PILLS} value={hpill} onPick={pickH} small style={{ margin: '0 0 22px' }} />}
      {pill !== 'health' && <div style={{ height: 8 }} />}
      <ErrLine msg={loadErr} />
      {doneToday > 0 && <div style={{ ...S.source, marginTop: 0, marginBottom: 12 }}>{doneToday} done today · {Math.floor(doneToday / 5)} bundle{Math.floor(doneToday / 5) === 1 ? '' : 's'} struck</div>}
      {pill === 'health'
        ? renderHealth()
        : <ItemList items={items} cats={PILL_CATS[pill] || [pill]} insertCat={pill} onChanged={refresh} title={`${label} · open`} blank="Nothing here yet. Add the first item above." />}
    </div>
  )
}
