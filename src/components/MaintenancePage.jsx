// Maintenance: the small recurring upkeep of a life (content, hygiene,
// exercise, other). Five done in a day strike a Maintenance Bundle (0.2 mi).
// Content arrives downstream; this is the board they land on.
import { useState, useEffect, useCallback } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { S, Eyebrow, Panel, Stat, GRAY, INK2, GOLD, GREEN, BLUE, PURPLE, PANEL_BORDER, MONO, chiToday } from './river/canon'

const CATS = { content: { label: 'Content', color: BLUE }, hygiene: { label: 'Hygiene', color: GREEN }, exercise: { label: 'Exercise', color: GOLD }, other: { label: 'Other', color: PURPLE } }

export default function MaintenancePage() {
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('content')
  const [err, setErr] = useState(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('maintenance_items').select('*').order('created_at', { ascending: false }).limit(300)
    if (error) { setErr(error.message); return }
    setItems(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!title.trim()) return
    const { error } = await supabase.from('maintenance_items').insert({ title: title.trim(), category: cat, status: 'open' })
    if (error) { setErr(error.message); return }
    setTitle(''); load()
  }
  const done = async (id) => {
    await supabase.from('maintenance_items').update({ status: 'done', day: chiToday(), done_at: new Date().toISOString() }).eq('id', id); load()
  }
  const drop = async (id) => { await supabase.from('maintenance_items').update({ status: 'dropped' }).eq('id', id); load() }

  const open = items.filter(i => i.status === 'open')
  const doneToday = items.filter(i => i.status === 'done' && i.day === chiToday())
  const ctrl = { fontSize: 12, padding: '7px 10px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: '#EAF1F8' }

  return (
    <div style={S.page}>
      <Eyebrow>MISSION BOARD · MAINTENANCE</Eyebrow>
      <h1 style={S.h1}>Maintenance</h1>
      <p style={S.sub}>five done in a day strike a bundle · content arrives downstream</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, margin: '18px 0' }}>
        <Stat v={open.length} l="open items" />
        <Stat v={doneToday.length} l="done today" color={GREEN} />
        <Stat v={Math.floor(doneToday.length / 5)} l="bundles struck today" color={GOLD} />
      </div>
      {err && <div style={{ color: '#E8836F', fontFamily: MONO, fontSize: 11, marginBottom: 10 }}>{err.includes('maintenance_items') ? 'The maintenance table is not created yet (run sql/2026-09-23-river.sql).' : err}</div>}
      <Panel title="Add an item">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="e.g. Post the weekly LinkedIn note" style={{ ...ctrl, flex: '1 1 260px' }} />
          <select value={cat} onChange={e => setCat(e.target.value)} style={ctrl}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <button onClick={add} style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderColor: 'rgba(230,181,79,0.5)', color: GOLD }}><Plus size={14} /> Add</button>
        </div>
      </Panel>
      <Panel title={`Open · ${open.length}`}>
        {open.length === 0 && <div style={{ color: GRAY, fontSize: 13 }}>No maintenance items yet. They arrive downstream, or add one above.</div>}
        {open.map(i => (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}` }}>
            <span style={S.chip(`${CATS[i.category]?.color || GRAY}22`, CATS[i.category]?.color || GRAY)}>{CATS[i.category]?.label || i.category}</span>
            <span style={{ flex: 1, fontSize: 13.5, color: INK2 }}>{i.title}{i.cadence && <span style={{ color: GRAY, fontSize: 11, marginLeft: 8 }}>{i.cadence}</span>}</span>
            <button onClick={() => done(i.id)} title="Done today" style={{ ...ctrl, cursor: 'pointer', color: GREEN, padding: '4px 8px' }}><Check size={14} /></button>
            <button onClick={() => drop(i.id)} title="Drop" style={{ ...ctrl, cursor: 'pointer', color: GRAY, padding: '4px 8px' }}><X size={14} /></button>
          </div>
        ))}
      </Panel>
      <Panel title={`Done today · ${doneToday.length}`}>
        {doneToday.length === 0 ? <div style={{ color: GRAY, fontSize: 13 }}>Nothing yet today.</div> : doneToday.map(i => (
          <div key={i.id} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 13, color: INK2 }}><Check size={14} color={GREEN} /> {i.title}</div>
        ))}
      </Panel>
    </div>
  )
}
