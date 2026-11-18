// Dev mock-up: the Run panel (RunPanel) in each of its states on made-up data. Nothing is read
// from or written to the Ledger. ?state=idle | running | overtime | debrief | complete picks the state
// (complete is the core face with the Run Complete badge); ?state=analyzing plays the Extract gauge
// and ?state=results opens the results page. The buttons move it through the run in memory.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import RunPanel, { RUN_MINUTES, DEBRIEF_MINUTES } from '../src/components/river/RunPanel'
import RunResults from '../src/components/river/RunResults'
import FocusLock from '../src/components/river/FocusLock'

const min = (m) => new Date(Date.now() + m * 60000).toISOString()
const LOG = (start) => [
  [1, 'hud', 'Clock started on the sample gate', 'Sample Client Renewal'],
  [3, 'mac', 'Keynote: Sample Board Deck', 'Sample Board Deck'],
  [9, 'session', 'Rebuilt the revenue page around the three numbers', 'Sample Board Deck'],
  [14, 'mail', 'Sent the revised terms to the client', 'Sample Client Renewal'],
  [17, 'mac', 'Outlook: Inbox', null],
  [21, 'mail', 'Replied to a vendor about an invoice', null],
  [24, 'sms', 'Text thread with a board member', 'Sample Board Deck'],
  [27, 'slack', 'Answered the data team in the sample channel', 'Sample Client Renewal'],
  [31, 'mac', 'Safari: news site', null],
  [36, 'session', 'Exported the deck to PDF', 'Sample Board Deck'],
  [41, 'hud', 'Gate closed: Send the draft scope', 'Sample Client Renewal'],
].map(([m, source, text, mission]) => ({ at: new Date(new Date(start).getTime() + m * 60000).toISOString(), source, text, mission }))
const HITS = [
  { mission: 'Sample Board Deck', kind: 'Side Mission', minutes: 21, what: 'Revenue page rebuilt, deck exported, one text thread with a board member.' },
  { mission: 'Sample Client Renewal', kind: 'Main Mission', minutes: 13, what: 'Revised terms sent, the data team answered, one gate closed.' },
]
const ROGUE = [{ text: 'Outlook inbox and a vendor invoice reply', minutes: 7 }, { text: 'A news site in Safari', minutes: 4 }]
const SUMMARY = 'Most of this run went where you pointed it. The board deck took 21 minutes and ended with an export, and the client renewal took 13 and closed a gate. Eleven minutes went to the inbox and a news site, in two stretches, both right after a send.'

const make = (state) => {
  if (state === 'idle') return null
  const base = { n: 2, hits: HITS, rogue: ROGUE, summary: SUMMARY, logged: 11, headline: 'The Deck Shipped And A Gate Closed', accomplished: ['Rebuilt the revenue page around the three numbers.', 'Sent the revised terms to the client.', 'Exported the deck to PDF.', 'Closed the gate: Send the draft scope.'], earned: [{ badge: 'run', text: 'Run 2, the full 45 minutes', miles: 10 }, { badge: 'gate', text: 'Gate closed on Sample Client Renewal: Send the draft scope', miles: 7 }] }
  if (state === 'early') { const s = min(-19), x = min(-1); return { ...base, state: 'debrief', started_at: s, ends_at: min(RUN_MINUTES - 19), extracted_at: x, debrief_ends_at: min(DEBRIEF_MINUTES - 1), log: LOG(s), miles: 0, logged: 5, headline: 'Nineteen Minutes, Mostly The Inbox', accomplished: [], earned: [], hits: [{ mission: 'Sample Client Renewal', kind: 'Main Mission', minutes: 6, what: 'One reply on the terms.' }], rogue: [{ text: 'Outlook inbox', minutes: 13 }], summary: 'This run was cut at 19 minutes. Six of them were on the client renewal and thirteen were in the inbox.' } }
  if (state === 'running') { const s = min(-28); return { ...base, state, started_at: s, ends_at: min(RUN_MINUTES - 28), log: LOG(s).filter(e => e.at <= new Date().toISOString()), hits: HITS.slice(0, 2) } }
  if (state === 'overtime') { const s = min(-RUN_MINUTES - 2.2); return { ...base, state, started_at: s, ends_at: min(-2.2), log: LOG(s) } }
  const s = min(-RUN_MINUTES - 5), x = min(-3)
  return { ...base, state, started_at: s, ends_at: min(-5), extracted_at: x, debrief_ends_at: min(DEBRIEF_MINUTES - 3), log: LOG(s), miles: 10 }
}
const STATES = ['idle', 'running', 'overtime', 'debrief', 'complete']

function SampleSlot({ title, of, slot, live = false }) {
  return (
    <div style={{ border: `1.5px solid ${live ? 'var(--hud-pos)' : 'var(--hud-border)'}`, borderRadius: 14, padding: '16px 18px', minHeight: 96, background: 'var(--hud-fill)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--hud-ink-2)' }}><span>{of || 'Empty'}</span><span>{slot}</span></div>
      <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, marginTop: 8 }}>{title}</div>
      {live && <div style={{ fontSize: 12.5, color: 'var(--hud-pos)', marginTop: 8 }}>The clock is running</div>}
    </div>
  )
}

function Mock() {
  const first = new URLSearchParams(location.search).get('state')
  const start = STATES.includes(first) ? first : first === 'analyzing' ? 'overtime' : first === 'results' || first === 'early' ? 'debrief' : 'idle'
  const [state, setState] = useState(start)
  const [run, setRun] = useState(() => start === 'idle' || start === 'complete' ? null : { ...make(first === 'early' ? 'early' : start), ...(new URLSearchParams(location.search).get('focus') === '1' ? { focus: { title: 'Sample Proposal For A Pilot', mission: 'Sample Client Renewal' } } : {}) })
  // The results veil, as RunDock holds it: { pending } through Extract, { run } from the badge.
  const [results, setResults] = useState(first === 'results' || first === 'early' ? { pending: false } : null)
  const [focused, setFocused] = useState(new URLSearchParams(location.search).get('focus') === '1')
  const FOCUS = { title: 'Sample Proposal For A Pilot', mission: 'Sample Client Renewal' }
  const go = (s, f = focused) => { setFocused(f); setState(s); setRun(s === 'idle' || s === 'complete' ? null : { ...make(s), ...(f ? { focus: FOCUS } : {}) }) }
  const extract = () => { setResults({ pending: true }); setTimeout(() => { go('debrief'); setResults({ pending: false }) }, 7000) }
  const done = state === 'complete'
  // As RunDock holds it: a run waiting on its report keeps the veil up.
  const veil = results || (state === 'debrief' ? { pending: false } : null)
  return (
    <div className="sa-dark sa-app" style={{ minHeight: '100vh', padding: '24px 28px 60px', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--hud-ink-2)' }}>Mock-up, made-up data. State:</span>
          {STATES.map(s => <button key={s} onClick={() => go(s)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--hud-border)', background: s === state ? 'var(--hud-fill-2)' : 'transparent', color: 'var(--hud-ink)' }}>{s[0].toUpperCase() + s.slice(1)}</button>)}
        </div>
        <RunPanel key={state} run={run} today={{ runs: done ? 2 : 1, miles: done ? 20 : 10 }} onStart={() => go('running', false)} onStartFocused={() => go('running', true)} onExtract={extract} onWalkAway={() => go('idle', false)} onResults={() => setResults({ run: { ...make('debrief'), state: 'filed', word: 'The deck is where it needed to be. The inbox pull after each send is the thing to watch.' } })} />
        {/* The rest of the Board, as it would sit under a Focused Run: the one thing stays lit, the rest is locked. */}
        <div style={{ marginTop: 22, display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <SampleSlot title="Sample Proposal For A Pilot" of="Main Mission · Gate 3" slot="Primary" live={focused && state === 'running'} />
            <FocusLock on={focused && (state === 'running' || state === 'overtime')} label="Locked"><SampleSlot title="Sample Board Deck" of="Side Mission" slot="Secondary" /></FocusLock>
            <FocusLock on={focused && (state === 'running' || state === 'overtime')} label="Locked"><SampleSlot title="" of="" slot="Utility" /></FocusLock>
          </div>
          <FocusLock on={focused && (state === 'running' || state === 'overtime')} label="Console And Stash Are Locked For The Focused Run">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{['Morning', 'E-mail Refresh', 'Slack Review', 'Bill Pay', 'Thinking', 'Travel', 'Gaming'].map(l => <div key={l} style={{ width: 96, textAlign: 'center', fontSize: 12 }}><div style={{ width: 80, height: 80, margin: '0 auto 6px', borderRadius: 20, border: '1px solid var(--hud-border)', background: 'rgba(255,255,255,0.035)' }} />{l}</div>)}</div>
          </FocusLock>
        </div>
        {veil && <RunResults run={veil.run || (veil.pending ? null : run)} pending={!!veil.pending} closeLabel="Back To The Board" onFile={() => { setResults(null); go('complete') }} onClose={() => setResults(null)} />}
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><Mock /></StrictMode>)
