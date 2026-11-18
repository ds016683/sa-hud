// The Run on the Board (David 11/17): "a new option on the board (maybe down with all of our buttons,
// but very distinct and bigger than the others)". This holds the live run for RunPanel: it reads the
// run when the Board opens, looks again every 20 seconds while one is on, and sends the verbs.
import { useCallback, useEffect, useState } from 'react'
import RunPanel from './RunPanel'
import RunResults from './RunResults'
import { readRun, runVerb } from '../../lib/runs'
import { hudConfirm } from '../../lib/dialog'
import { fetchLoadout } from '../../lib/loadout'
import { setFocusHold } from '../../lib/focus'
import { INK, INK2, MUTED, PANEL_BORDER, SERIF } from './canon'

const LEDGER = { readRun, runVerb }

// onRun: told the focused run that is running (or null), so the Board can lock everything but its one thing.
export default function RunDock({ refreshKey = 0, onChange, onRun, api = LEDGER }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // The results veil: { pending } while Extract is in flight and then on that run, { run } from the badge.
  const [results, setResults] = useState(null)
  // A Focused Run with more than one item on the Board and no clock running asks which one.
  const [picking, setPicking] = useState(null)
  const load = useCallback(async () => { try { setData(await api.readRun()) } catch (e) { setError(`Could not read the run: ${e.message}`) } }, [api])
  useEffect(() => { Promise.resolve().then(load) }, [load, refreshKey])
  const state = data?.run?.state || 'idle'
  const on = state === 'running' || state === 'debrief'
  useEffect(() => { if (!on) return undefined; const t = setInterval(load, 20000); return () => clearInterval(t) }, [on, load])

  const verb = async (action, more) => {
    if (busy) return
    setBusy(true); setError(null)
    if (action === 'extract') setResults({ pending: true })
    try {
      setData(await api.runVerb(action, more))
      if (action === 'extract') setResults({ pending: false })
      if (action === 'file') setResults(null)      // filed: the veil closes and the panel is ready for the next run
      onChange && onChange()
    } catch (e) { if (action === 'extract') setResults(null); setError(`That did not go through: ${e.message}`) } finally { setBusy(false) }
  }
  useEffect(() => { const r = data?.run; const held = r && r.state === 'running' && r.focus ? r : null; setFocusHold(held ? held.focus : null); onRun && onRun(held) }, [data, onRun])
  // The one thing: whatever has the clock, or the only item on the Board, or David's pick.
  const startFocused = async () => {
    if (busy) return
    setError(null)
    try {
      const L = await fetchLoadout()
      const board = [...(L.board || []), ...(L.adhoc || [])]
      if (!board.length) { setError('Nothing is on the Board. Load the one thing first, then start a Focused Run.'); return }
      const one = board.find(i => i.equipped) || (board.length === 1 ? board[0] : null)
      if (one) return verb('start', { focus: { objective_id: one.id } })
      setPicking(board)
    } catch (e) { setError(`Could not read the Board: ${e.message}`) }
  }
  const walk = async () => { if (await hudConfirm({ title: 'Walk away from this run?', message: 'It ends now with no miles. The log so far is kept.', confirm: 'Walk Away', danger: true })) verb('walk') }
  if (!data) return null
  // A filed run hands the panel back to its core face, with the Run Complete badge; so does a run
  // that was walked away from, or yesterday's.
  const run = data.run && ['running', 'debrief'].includes(data.run.state) ? data.run : null
  const filed = data.run && data.run.state === 'filed' ? data.run : null
  // A run waiting on its report keeps the veil up, here or after a reload: the debrief is done in it.
  const veil = results || (data.run && data.run.state === 'debrief' ? { pending: false } : null)
  const seen = veil && (veil.run || (veil.pending ? null : data.run))
  return (
    <>
      <RunPanel key={run ? `${run.id}:${run.state}` : 'idle'} run={run} today={data.today} busy={busy} error={veil ? null : error} onStart={() => verb('start')} onStartFocused={startFocused} onExtract={() => verb('extract')} onWalkAway={walk} onResults={filed ? () => setResults({ run: filed }) : undefined} />
      {picking && (
        <div onClick={() => setPicking(null)} style={{ position: 'fixed', inset: 0, zIndex: 240, background: 'rgba(8,20,32,0.86)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div role="dialog" aria-label="Pick the one thing" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 16, padding: '24px 26px' }}>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, color: INK }}>Which One Thing?</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: INK2, marginTop: 6 }}>A Focused Run keeps one item on the Board with its clock running. The rest is holstered and comes back when the run ends.</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
              {picking.map(i => (
                <button key={i.id} onClick={() => { setPicking(null); verb('start', { focus: { objective_id: i.id } }) }} style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', padding: '12px 14px', borderRadius: 11, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.04)', color: INK }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{i.title}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{i.project ? `${i.project} · ` : ''}{i.kind}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button onClick={() => setPicking(null)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2 }}>Cancel</button></div>
          </div>
        </div>
      )}
      {veil && (veil.pending || seen) && <RunResults run={seen} pending={!!veil.pending} busy={busy} error={error} closeLabel="Back To The Board" onFile={(word) => verb('file', { word })} onClose={() => setResults(null)} />}
    </>
  )
}
