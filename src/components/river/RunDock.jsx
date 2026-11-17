// The Run on the Board (David 11/17): "a new option on the board (maybe down with all of our buttons,
// but very distinct and bigger than the others)". This holds the live run for RunPanel: it reads the
// run when the Board opens, looks again every 20 seconds while one is on, and sends the verbs.
import { useCallback, useEffect, useState } from 'react'
import RunPanel from './RunPanel'
import { readRun, runVerb } from '../../lib/runs'
import { hudConfirm } from '../../lib/dialog'

const LEDGER = { readRun, runVerb }

export default function RunDock({ refreshKey = 0, onChange, api = LEDGER }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const load = useCallback(async () => { try { setData(await api.readRun()) } catch (e) { setError(`Could not read the run: ${e.message}`) } }, [api])
  useEffect(() => { Promise.resolve().then(load) }, [load, refreshKey])
  const state = data?.run?.state || 'idle'
  const on = state === 'running' || state === 'debrief'
  useEffect(() => { if (!on) return undefined; const t = setInterval(load, 20000); return () => clearInterval(t) }, [on, load])

  const verb = async (action, more) => {
    if (busy) return
    setBusy(true); setError(null)
    try { setData(await api.runVerb(action, more)); onChange && onChange() } catch (e) { setError(`That did not go through: ${e.message}`) } finally { setBusy(false) }
  }
  const walk = async () => { if (await hudConfirm({ title: 'Walk away from this run?', message: 'It ends now with no miles. The log so far is kept.', confirm: 'Walk Away', danger: true })) verb('walk') }
  if (!data) return null
  // A run that was walked away from, or yesterday's, leaves the panel ready for the next one.
  const run = data.run && ['running', 'debrief', 'filed'].includes(data.run.state) ? data.run : null
  return <RunPanel key={run ? `${run.id}:${run.state}` : 'idle'} run={run} today={data.today} busy={busy} error={error} onStart={() => verb('start')} onExtract={() => verb('extract')} onFile={(word) => verb('file', { word })} onWalkAway={walk} />
}
