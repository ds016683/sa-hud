// Today's hygiene checklist: the eight HYGIENE_ITEMS as rows, state read from
// daily_logs (kind 'hygiene', `what` = item key). Clicking an unchecked row
// opens an inline prompt; saving inserts the log. Checked rows show the time,
// the note, and an undo for rows this HUD wrote. A 14-day strip sits under it.
import { useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { HYGIENE_ITEMS } from '../../constants/hygiene'
import { S, Panel, Label, GRAY, INK2, GOLD, GREEN, RED, PANEL_BORDER, MONO, chiToday, fmtTime } from './canon'

const CTRL = { fontSize: 12, padding: '7px 10px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: '#EAF1F8' }
const BTN = { ...CTRL, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }
const TOTAL = HYGIENE_ITEMS.length

// Row control: an empty ring when unchecked, a green check when done.
function CheckBox({ on }) {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: 999, flex: '0 0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${on ? GREEN : 'rgba(255,255,255,0.25)'}`, background: on ? `${GREEN}22` : 'transparent',
    }}>{on && <Check size={12} color={GREEN} />}</span>
  )
}

// `logs` = daily_logs rows for the window (any kind); `days` = 14 day strings,
// newest first; `keyOf(log)` maps a hygiene log to an item key (or null);
// `friendly(error, table)` translates database errors.
export default function HygieneChecklist({ logs, days, keyOf, friendly, onChanged }) {
  const [openKey, setOpenKey] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const today = chiToday()
  const hyg = logs.filter(l => l.kind === 'hygiene')

  // Today's first matching log per item key.
  const todayByKey = {}
  for (const l of hyg) {
    if (l.day !== today) continue
    const k = keyOf(l)
    if (k && !todayByKey[k]) todayByKey[k] = l
  }
  const n = Object.keys(todayByKey).length
  const countFor = (day) => new Set(hyg.filter(l => l.day === day).map(keyOf).filter(Boolean)).size

  const open = (key) => { setOpenKey(key === openKey ? null : key); setText(''); setErr(null) }
  const save = async (item, noteOverride) => {
    const note = (noteOverride ?? text).trim()
    setBusy(true)
    const { error } = await supabase.from('daily_logs').insert({ day: today, kind: 'hygiene', what: item.key, note: note || null, source: 'hud' })
    setBusy(false)
    if (error) { setErr(friendly(error, 'daily_logs')); return }
    setOpenKey(null); setText(''); setErr(null); onChanged()
  }
  const undo = async (row) => {
    if (!row?.id || row.source !== 'hud') return
    const { error } = await supabase.from('daily_logs').delete().eq('id', row.id)
    if (error) {
      setErr(/row-level security|policy/i.test(String(error.message || '')) ? 'Undo needs a delete policy on daily_logs (not in the SQL yet).' : friendly(error, 'daily_logs'))
      return
    }
    setErr(null); onChanged()
  }

  const strip = [...days].reverse()

  return (
    <Panel title="Hygiene · today">
      <div style={{ fontSize: 13, color: INK2, marginBottom: 12 }}>
        <span style={{ color: n === TOTAL ? GOLD : '#EAF1F8', fontWeight: 600 }}>{n} of {TOTAL} today</span>
        <span style={{ color: GRAY }}> · 0.25 mi each · all eight strike Hygiene (3 mi)</span>
      </div>
      {err && <div style={{ color: RED, fontFamily: MONO, fontSize: 11, margin: '0 0 8px' }}>{err}</div>}

      {HYGIENE_ITEMS.map(item => {
        const row = todayByKey[item.key]
        const done = Boolean(row)
        const isOpen = openKey === item.key
        return (
          <div key={item.key} style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}>
            <div
              role={done ? undefined : 'button'} tabIndex={done ? undefined : 0}
              onClick={() => !done && open(item.key)}
              onKeyDown={e => !done && (e.key === 'Enter' || e.key === ' ') && open(item.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', cursor: done ? 'default' : 'pointer' }}
            >
              <CheckBox on={done} />
              <span style={{ flex: 1, fontSize: 13.5, color: done ? INK2 : '#EAF1F8' }}>
                {item.label}
                {item.optional && <span style={{ color: GRAY, fontSize: 11, marginLeft: 8 }}>optional</span>}
              </span>
              {done && (
                <>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: GRAY, whiteSpace: 'nowrap' }}>{fmtTime(row.at)}</span>
                  {row.note && <span style={{ fontSize: 12, color: GRAY, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.note}</span>}
                  {row.source === 'hud' && row.id && (
                    <button onClick={() => undo(row)} title="Undo" style={{ ...BTN, color: GRAY, padding: '3px 7px', fontSize: 10, fontFamily: MONO }}><RotateCcw size={11} /> undo</button>
                  )}
                </>
              )}
            </div>
            {isOpen && !done && (
              <div style={{ padding: '0 0 12px 28px' }}>
                <div style={{ fontSize: 12.5, color: INK2, marginBottom: 8 }}>{item.prompt}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input autoFocus value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && save(item)}
                    placeholder="Note" style={{ ...CTRL, flex: '1 1 220px' }} />
                  <button onClick={() => save(item)} disabled={busy} style={{ ...BTN, borderColor: 'rgba(67,211,146,0.5)', color: GREEN, opacity: busy ? 0.6 : 1 }}><Check size={14} /> Save</button>
                  {item.optional && (
                    <button onClick={() => save(item, 'none today')} disabled={busy} style={{ ...BTN, color: INK2, opacity: busy ? 0.6 : 1 }}>None today</button>
                  )}
                  <button onClick={() => setOpenKey(null)} style={{ ...BTN, color: GRAY }}><X size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 14 }}>
        <Label>last 14 days</Label>
        <div style={{ display: 'flex', gap: 4 }}>
          {strip.map(d => {
            const c = countFor(d)
            const full = c === TOTAL
            const isToday = d === today
            return (
              <div key={d} title={d} style={{
                flex: 1, minWidth: 0, textAlign: 'center', padding: '5px 0 4px', borderRadius: 6,
                border: `1px solid ${full ? 'rgba(230,181,79,0.6)' : isToday ? 'rgba(255,255,255,0.22)' : PANEL_BORDER}`,
                background: full ? 'rgba(230,181,79,0.14)' : c > 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
              }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: full ? GOLD : c > 0 ? INK2 : GRAY, whiteSpace: 'nowrap' }}>{c}/{TOTAL}</div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: GRAY, marginTop: 2 }}>{Number(d.slice(8, 10))}</div>
              </div>
            )
          })}
        </div>
        <div style={S.source}>Or tell Lumen: showered, brushed, shaved. Peptide items count with none today.</div>
      </div>
    </Panel>
  )
}
