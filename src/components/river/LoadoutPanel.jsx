// The Loadout: the one Activity Board. Lives at the top of the Board page.
// Three slots, one equipped clock, stamina for the rest of the day. Every
// active item, whatever its origin (Side Mission, Main Mission task,
// impromptu), gets the same Equip / Holster / Extract hands.
import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, PackageCheck, Archive, X as XIcon } from 'lucide-react'
import { fetchLoadout, equip, holster, stash, extract, fmtClock, SIZES, SLOTS, HEAVY_MAX } from '../../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Eyebrow, Label, Panel } from './canon'

const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent',
  color: filled ? '#0A1B2B' : color, cursor: 'pointer',
})

const SizeChip = ({ size }) => {
  const s = SIZES[size] || SIZES.light
  return <span style={{ ...S.chip('rgba(255,255,255,0.06)', s.color), border: `1px solid ${s.color}55`, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{s.label} · {s.hours}h</span>
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

export default function LoadoutPanel({ onChange }) {
  const [L, setL] = useState(null)
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(null)
  const [msg, setMsg] = useState(null)
  const refresh = useCallback(() => fetchLoadout().then(setL).catch(e => console.warn('loadout', e.message)), [])
  useEffect(() => { refresh() }, [refresh, tick])
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30_000); return () => clearInterval(t) }, [])

  const act = async (fn, after) => {
    try { await fn(); if (after) setMsg(after); setTick(x => x + 1); onChange && onChange() }
    catch (e) { setMsg(`Could not do that: ${e.message}`) }
  }

  const stamina = L ? L.stamina : null
  const over = stamina && !stamina.afterHours && stamina.loaded > stamina.free
  const pct = stamina && stamina.free > 0 ? Math.min(100, Math.round(stamina.loaded / stamina.free * 100)) : (stamina && stamina.loaded > 0 ? 100 : 0)

  return (
    <Panel title="Loadout" style={{ marginBottom: 12 }}>
      {open && <ExtractModal item={open} onClose={() => setOpen(null)} onDone={(r) => { setOpen(null); setMsg(`Extracted: ${open.title} · ${fmtClock(r.minutes)}${r.personal ? ' · personal' : ''}`); setTick(x => x + 1); onChange && onChange() }} />}
      {!L ? (
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '12px 0' }}>Reading the loadout</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div style={{ borderLeft: `2px solid ${BLUE}55`, paddingLeft: 12 }}>
              <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: L.slots.used > SLOTS ? RED : '#fff', lineHeight: 1.1 }}>{L.slots.used} / {SLOTS}</div>
              <div style={{ fontSize: 11, color: GRAY, marginTop: 3 }}>Slots loaded · {L.heavy.used}/{HEAVY_MAX} Heavy</div>
            </div>
            <div style={{ borderLeft: `2px solid ${BLUE}55`, paddingLeft: 12 }}>
              <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: L.equipped ? GREEN : '#fff', lineHeight: 1.1 }}>{L.equipped ? fmtClock(L.equipped.minutes_today) : 'None'}</div>
              <div style={{ fontSize: 11, color: GRAY, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{L.equipped ? `Equipped · ${L.equipped.title}` : 'Nothing equipped'}</div>
            </div>
            <div style={{ borderLeft: `2px solid ${BLUE}55`, paddingLeft: 12 }}>
              <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: over ? RED : GOLD, lineHeight: 1.1 }}>{stamina.loaded}h / {stamina.free}h</div>
              <div style={{ fontSize: 11, color: GRAY, marginTop: 3 }}>{stamina.afterHours ? 'Stamina · after 6 PM, not enforced' : `Stamina · loaded vs free before 6 PM${stamina.meetingsLeft ? ` · ${stamina.meetingsLeft}h of meetings left` : ''}`}</div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginTop: 8, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: over ? RED : GOLD }} /></div>
            </div>
          </div>

          {L.items.length === 0 ? (
            <div style={{ fontSize: 12.5, color: INK2, padding: '6px 0' }}>Nothing loaded. Equip something from Side Missions or a Main Mission, or tell Lumen what you're on.</div>
          ) : L.items.map((it, i) => (
            <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${PANEL_BORDER}`, opacity: it.session ? 0.7 : 1 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {it.equipped && <span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN, boxShadow: `0 0 0 3px ${GREEN}33`, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13.5, color: INK, lineHeight: 1.4 }}>{it.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5, alignItems: 'center' }}>
                  <KindChip kind={it.kind} />
                  <SizeChip size={it.size} />
                  {it.project && <span style={S.chip(`${BLUE}22`, BLUE)}>{it.project}</span>}
                  {it.personal && <span style={S.chip('rgba(255,255,255,0.06)', INK2)}>personal</span>}
                  <span style={{ fontFamily: MONO, fontSize: 10, color: it.equipped ? GREEN : GRAY, letterSpacing: '0.6px' }}>{it.equipped ? 'running · ' : 'holstered · '}{fmtClock(it.minutes_today)} today</span>
                </div>
              </div>
              {!it.session && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {it.equipped
                    ? <button onClick={() => act(() => holster(it.id), `Timer off (holstered): ${it.title}`)} title="Holster: pause the clock, stays loaded" style={btn(GREEN, true)}><Pause size={11} /> Timer on</button>
                    : <button onClick={() => act(() => equip(it.id), `Timer on (equipped): ${it.title}`)} title="Equip: run the clock on this, pause the rest" style={btn(INK2)}><Play size={11} /> Timer off</button>}
                  <button onClick={() => act(() => stash(it.id), `Stashed: ${it.title}`)} title="Park it; it stays planned" style={btn(INK2)}><Archive size={11} /> Stash</button>
                  <button onClick={() => setOpen(it)} style={btn(GOLD)}><PackageCheck size={11} /> Extract</button>
                </div>
              )}
            </div>
          ))}
          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GOLD_BRIGHT, marginTop: 10, textTransform: 'uppercase' }}>{msg}</div>}
          <div style={{ fontSize: 11, color: GRAY, marginTop: 12, lineHeight: 1.6 }}>
            <span style={{ color: INK2 }}>Timer</span> runs one clock at a time (turning one on holsters the rest) ·{' '}
            <span style={{ color: INK2 }}>Stash</span> takes it off the board and back to the plan, clock kept ·{' '}
            <span style={{ color: INK2 }}>Extract</span> is done: time of activity, anything to file, miles on the next update.
            <br />Three slots, one Heavy at most. Over the limit, stash something first. Bigger than Heavy is a Main Mission.
          </div>
        </>
      )}
    </Panel>
  )
}
