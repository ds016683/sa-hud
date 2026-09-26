// Today's medication regimen: every MEDICATIONS item as a row, state read from
// daily_logs (kind 'medication', `what` = medication key) and medication_overrides
// (per-day reschedules). Due rows take a click to log; not-due rows gray out but
// still log if he took a dose anyway (counts 0.5 mi, not toward the badge).
// "move" opens a tiny inline reschedule: Not today / Today instead / Clear.
// A 14-day taken/due strip sits under the rows.
import { useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MEDICATIONS, dueOn } from '../../constants/medications'
import { S, Panel, Label, GRAY, INK2, GOLD, GREEN, RED, PERIWINKLE, PANEL_BORDER, MONO, chiToday, fmtTime } from './canon'

const CTRL = { fontSize: 12, padding: '7px 10px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: '#EAF1F8' }
const BTN = { ...CTRL, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }
const TEXT_BTN = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, color: GRAY, padding: '2px 4px', letterSpacing: '0.06em' }
const OV_ERR = 'Overrides table not created yet (run the 9/26 SQL).'

const ovKey = (day, key) => `${day}|${key}`
// Map of `${day}|${key}` -> override row, for fast lookups.
const overrideMap = (overrides) => {
  const m = {}
  for (const o of overrides || []) m[ovKey(o.day, o.key)] = o
  return m
}
// The override's due flag (true/false) or undefined when there is none.
const ovDue = (m, day, key) => {
  const o = m[ovKey(day, key)]
  return o && (o.due === true || o.due === false) ? o.due : undefined
}

// Row control: an empty ring when unchecked, a green check when done.
function Ring({ on }) {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: 999, flex: '0 0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${on ? GREEN : 'rgba(255,255,255,0.25)'}`, background: on ? `${GREEN}22` : 'transparent',
    }}>{on && <Check size={12} color={GREEN} />}</span>
  )
}

// `logs` = daily_logs rows for the window (any kind); `overrides` =
// medication_overrides rows for the window (empty when the table is missing);
// `days` = 14 day strings, newest first; `friendly(error, table)` translates
// database errors.
export default function RegimenChecklist({ logs, overrides, days, friendly, onChanged }) {
  const [openKey, setOpenKey] = useState(null)   // row with the dose prompt open
  const [moveKey, setMoveKey] = useState(null)   // row with the move menu open
  const [text, setText] = useState('')
  const [moveNote, setMoveNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const today = chiToday()
  const meds = logs.filter(l => l.kind === 'medication')
  const ovm = overrideMap(overrides)

  const takenOn = (day, key) => meds.find(l => l.day === day && l.what === key)
  const isDue = (med, day) => !med.schedule.asNeeded && dueOn(med, day, ovDue(ovm, day, med.key))
  // { due, taken } for a day: as-needed items never count toward due.
  const tally = (day) => {
    let due = 0, taken = 0
    for (const m of MEDICATIONS) {
      if (!isDue(m, day)) continue
      due++
      if (takenOn(day, m.key)) taken++
    }
    return { due, taken }
  }
  const { due: M, taken: N } = tally(today)
  const extra = MEDICATIONS.filter(m => !isDue(m, today) && takenOn(today, m.key)).length

  const openDose = (med) => {
    const next = openKey === med.key ? null : med.key
    setOpenKey(next); setMoveKey(null); setText(next ? (med.dose || '') : ''); setErr(null)
  }
  const openMove = (med) => {
    const next = moveKey === med.key ? null : med.key
    setMoveKey(next); setOpenKey(null); setMoveNote(''); setErr(null)
  }
  const save = async (med) => {
    const note = text.trim()
    setBusy(true)
    const { error } = await supabase.from('daily_logs').insert({ day: today, kind: 'medication', what: med.key, note: note || null, source: 'hud' })
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
  // Upsert an override for today on (day, key). `due` null clears it (dueOn
  // treats a non-boolean as no override).
  const setOverride = async (med, due) => {
    setBusy(true)
    const { error } = await supabase.from('medication_overrides')
      .upsert({ day: today, key: med.key, due, note: moveNote.trim() || null }, { onConflict: 'day,key' })
    setBusy(false)
    if (error) { setErr(OV_ERR); return }
    setMoveKey(null); setMoveNote(''); setErr(null); onChanged()
  }

  const strip = [...days].reverse()
  const allDue = M > 0 && N === M

  return (
    <Panel title="Medication · today">
      <div style={{ fontSize: 13, color: INK2, marginBottom: 12 }}>
        <span style={{ color: allDue ? GOLD : '#EAF1F8', fontWeight: 600 }}>{N} of {M} due today</span>
        <span style={{ color: GRAY }}> · 0.5 mi per dose · all due doses strike On Regimen (2 mi)</span>
        {extra > 0 && <span style={{ color: GRAY }}> · {extra} extra</span>}
      </div>
      {err && <div style={{ color: RED, fontFamily: MONO, fontSize: 11, margin: '0 0 8px' }}>{err}</div>}

      {MEDICATIONS.map(med => {
        const row = takenOn(today, med.key)
        const taken = Boolean(row)
        const asNeeded = Boolean(med.schedule.asNeeded)
        const due = isDue(med, today)
        const ov = ovm[ovKey(today, med.key)]
        const moved = Boolean(ov) && (ov.due === true || ov.due === false)
        const promptOpen = openKey === med.key
        const menuOpen = moveKey === med.key
        const dim = !taken && !due
        return (
          <div key={med.key} style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', opacity: dim ? 0.45 : 1 }}>
              <div
                role={taken ? undefined : 'button'} tabIndex={taken ? undefined : 0}
                onClick={() => !taken && openDose(med)}
                onKeyDown={e => !taken && (e.key === 'Enter' || e.key === ' ') && openDose(med)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: taken ? 'default' : 'pointer' }}
              >
                <Ring on={taken} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, color: taken ? INK2 : '#EAF1F8' }}>{med.label}</span>
                    {asNeeded && <span style={S.chip('rgba(255,255,255,0.06)', GRAY)}>as needed</span>}
                    {!asNeeded && !due && !taken && <span style={S.chip('rgba(255,255,255,0.06)', GRAY)}>not today</span>}
                    {moved && <span title={ov.note || undefined} style={S.chip(`${PERIWINKLE}22`, PERIWINKLE)}>moved</span>}
                  </div>
                  <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>{[med.dose, med.route, med.when].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
              {taken && (
                <>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: GRAY, whiteSpace: 'nowrap' }}>{fmtTime(row.at)}</span>
                  {row.note && <span style={{ fontSize: 12, color: GRAY, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.note}</span>}
                  {row.source === 'hud' && row.id && (
                    <button onClick={() => undo(row)} title="Undo" style={{ ...BTN, color: GRAY, padding: '3px 7px', fontSize: 10, fontFamily: MONO }}><RotateCcw size={11} /> undo</button>
                  )}
                </>
              )}
              {!asNeeded && (
                <button onClick={() => openMove(med)} title="Reschedule for today" style={{ ...TEXT_BTN, color: menuOpen ? PERIWINKLE : GRAY }}>move</button>
              )}
            </div>
            {promptOpen && !taken && (
              <div style={{ padding: '0 0 12px 28px' }}>
                <div style={{ fontSize: 12.5, color: INK2, marginBottom: 8 }}>{due ? 'Log this dose.' : 'Not due today. Log it anyway if you took it (counts 0.5 mi, not toward the badge).'}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input autoFocus value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && save(med)}
                    placeholder="Note" style={{ ...CTRL, flex: '1 1 220px' }} />
                  <button onClick={() => save(med)} disabled={busy} style={{ ...BTN, borderColor: 'rgba(67,211,146,0.5)', color: GREEN, opacity: busy ? 0.6 : 1 }}><Check size={14} /> Save</button>
                  <button onClick={() => setOpenKey(null)} style={{ ...BTN, color: GRAY }}><X size={14} /></button>
                </div>
              </div>
            )}
            {menuOpen && (
              <div style={{ padding: '0 0 12px 28px' }}>
                <div style={{ fontSize: 12.5, color: INK2, marginBottom: 8 }}>
                  Move this dose for {today}.{moved && ov.note ? <span style={{ color: GRAY }}> Current note: {ov.note}</span> : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={moveNote} onChange={e => setMoveNote(e.target.value)} placeholder="Note (optional)" style={{ ...CTRL, flex: '1 1 200px' }} />
                  <button onClick={() => setOverride(med, false)} disabled={busy} style={{ ...BTN, color: due ? '#EAF1F8' : GRAY, opacity: busy ? 0.6 : 1 }}>Not today</button>
                  <button onClick={() => setOverride(med, true)} disabled={busy} style={{ ...BTN, borderColor: `${PERIWINKLE}80`, color: PERIWINKLE, opacity: busy ? 0.6 : 1 }}>Today instead</button>
                  {moved && <button onClick={() => setOverride(med, null)} disabled={busy} style={{ ...BTN, color: GRAY, opacity: busy ? 0.6 : 1 }}>Clear override</button>}
                  <button onClick={() => setMoveKey(null)} style={{ ...BTN, color: GRAY }}><X size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 14 }}>
        <Label>last 14 days · taken/due</Label>
        <div style={{ display: 'flex', gap: 4 }}>
          {strip.map(d => {
            const t = tally(d)
            const full = t.due > 0 && t.taken === t.due
            const isToday = d === today
            return (
              <div key={d} title={d} style={{
                flex: 1, minWidth: 0, textAlign: 'center', padding: '5px 0 4px', borderRadius: 6,
                border: `1px solid ${full ? 'rgba(230,181,79,0.6)' : isToday ? 'rgba(255,255,255,0.22)' : PANEL_BORDER}`,
                background: full ? 'rgba(230,181,79,0.14)' : t.taken > 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
              }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: full ? GOLD : t.taken > 0 ? INK2 : GRAY, whiteSpace: 'nowrap' }}>{t.taken}/{t.due}</div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: GRAY, marginTop: 2 }}>{Number(d.slice(8, 10))}</div>
              </div>
            )
          })}
        </div>
        <div style={S.source}>Or tell Lumen: took my morning Vyvanse. Doses on off days count 0.5 mi but not toward the badge.</div>
      </div>
    </Panel>
  )
}
