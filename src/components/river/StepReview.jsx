// Proposed Steps (David 11/17): "you'll set up a little sub page where the system organizes the
// capture of stops by mission. There will be a sample of what lumen proposes to write, organized
// by mission. There should be an accept and reject. If i reject, it asks why. It would be great
// for the system to learn." Nothing on this page is on a card. A step he accepts is kept for the
// trail; a step he rejects, with his reason, is read by Lumen before the next proposal run.
import { useCallback, useEffect, useState } from 'react'
import { Check, X as XIcon, ArrowRight, RefreshCw, Undo2 } from 'lucide-react'
import { loadSteps, ruleStep, captureNow, CLEAR_AT } from '../../lib/trailsteps'
import { openCard } from '../../lib/card'
import { stamp } from '../../lib/path'
import { S, INK, INK2, MUTED, GRAY, PANEL_BORDER, PANEL_BG, LABEL, SUCCESS, RED, SERIF, alpha } from './canon'

// The Ledger's hands, passed in so the dev harness can run the page on sample data.
const LEDGER = { loadSteps, ruleStep, captureNow, openCard }

const btn = (off = false, color = INK2) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap',
  cursor: off ? 'default' : 'pointer', opacity: off ? 0.45 : 1, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color,
})
const SOURCE = { email: 'Sent Email', session: 'Claude Session', slack: 'Slack' }
const VIEWS = [['open', 'To Clear'], ['accept', 'Accepted'], ['reject', 'Rejected']]
const NONE = 'none'

export default function StepReview({ api = LEDGER, onNavigate }) {
  const [data, setData] = useState(null)
  const [view, setView] = useState('open')
  const [asking, setAsking] = useState(null)      // the step being rejected: its id
  const [why, setWhy] = useState('')
  const [busy, setBusy] = useState(null)          // a step id, or 'capture'
  const [err, setErr] = useState(null)
  const [said, setSaid] = useState(null)
  const [showLeft, setShowLeft] = useState(false)

  const load = useCallback(async () => { try { setData(await api.loadSteps()) } catch (e) { setErr(e.message) } }, [api])
  useEffect(() => { Promise.resolve().then(load) }, [load])

  const rule = async (p, verdict, reason = '') => {
    if (busy) return
    setBusy(p.id); setErr(null)
    try { const rulings = await api.ruleStep(p.id, verdict, reason); setData(d => ({ ...d, rulings })); setAsking(null); setWhy('') }
    catch (e) { setErr(`Could not save that ruling: ${e.message}`) } finally { setBusy(null) }
  }
  const capture = async () => {
    if (busy) return
    setBusy('capture'); setErr(null); setSaid('Lumen is reading what is new. This takes up to a minute.')
    try { const out = await api.captureNow(); setSaid(out.events ? `Read ${out.events} new ${out.events === 1 ? 'event' : 'events'}: ${out.added} proposed, ${out.skipped} left out.` : 'Nothing new since the last capture.'); await load() }
    catch (e) { setSaid(null); setErr(`The capture did not run: ${e.message}`) } finally { setBusy(null) }
  }

  if (!data) return <div style={S.page}><h1 style={S.h1}>Proposed Steps</h1><div style={{ fontSize: 14, color: MUTED, marginTop: 14 }}>{err || 'Reading the proposed steps.'}</div></div>

  const verdictOf = (p) => data.rulings[p.id]?.verdict || 'open'
  const counts = { open: 0, accept: 0, reject: 0 }
  for (const p of data.proposals) counts[verdictOf(p)] = (counts[verdictOf(p)] || 0) + 1
  const shown = data.proposals.filter(p => verdictOf(p) === view)
  const groups = new Map()
  for (const p of shown) { const k = p.mission ? p.mission.id : NONE; if (!groups.has(k)) groups.set(k, { mission: p.mission, rows: [] }); groups.get(k).rows.push(p) }
  const ordered = [...groups.entries()].sort(([a, ga], [b, gb]) => a === NONE ? 1 : b === NONE ? -1 : String(ga.mission.title).localeCompare(String(gb.mission.title)))
  for (const [, g] of ordered) g.rows.sort((a, b) => String(a.at).localeCompare(String(b.at)))
  const toMission = (m) => m.kind === 'Main Mission' ? onNavigate?.('main-missions', [m.id]) : api.openCard(m.id)

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={S.h1}>Proposed Steps</h1>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: INK2, margin: '8px 0 0', maxWidth: 760 }}>
            The small steps between a mission&rsquo;s gates, as Lumen would write them from what you did: the mail you sent, what you wrote in Slack and the work a Claude session closed. Nothing here is on a card. Accept keeps a step for the trail. Reject asks why, and Lumen reads your reasons before he proposes again.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={capture} disabled={!!busy} style={btn(!!busy)}><RefreshCw size={13} /> {busy === 'capture' ? 'Capturing' : 'Capture Now'}</button>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>{data.ran_at ? `Last capture ${stamp(data.ran_at)}` : 'No capture has run yet'}</div>
        </div>
      </div>

      {counts.open >= CLEAR_AT && (
        <div style={{ marginTop: 18, padding: '11px 14px', border: `1px solid ${alpha(RED, 45)}`, borderRadius: 10, fontSize: 14, lineHeight: 1.5, color: INK }}>
          {counts.open} steps are waiting. At {CLEAR_AT} or more, Lumen and every Claude session remind you on each turn until this list is under {CLEAR_AT}.
        </div>
      )}
      {said && <div style={{ fontSize: 13.5, color: INK2, marginTop: 14 }}>{said}</div>}
      {err && <div style={{ fontSize: 13.5, color: RED, marginTop: 14 }}>{err}</div>}

      <div role="tablist" style={{ display: 'inline-flex', gap: 4, padding: 4, border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, background: PANEL_BG, margin: '22px 0 6px' }}>
        {VIEWS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => { setView(id); setAsking(null) }} style={{ fontSize: 14, fontWeight: 600, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${view === id ? PANEL_BORDER : 'transparent'}`, background: view === id ? 'rgba(255,255,255,0.07)' : 'transparent', color: view === id ? INK : INK2 }}>
            {label} <span style={{ color: MUTED, fontWeight: 500, marginLeft: 4 }}>{counts[id] || 0}</span>
          </button>
        ))}
      </div>

      {!shown.length && (
        <div style={{ fontSize: 14, color: MUTED, marginTop: 18 }}>
          {view === 'open' ? (data.ran_at ? 'Nothing to clear.' : 'Nothing proposed yet.') : view === 'accept' ? 'Nothing accepted yet.' : 'Nothing rejected yet.'}
        </div>
      )}

      {ordered.map(([key, g]) => (
        <section key={key} style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, letterSpacing: '-0.01em', color: INK, margin: 0 }}>{g.mission ? g.mission.title : 'No Mission Matched'}</h2>
            <span style={{ fontSize: 13, color: LABEL, fontWeight: 600 }}>{g.mission ? g.mission.kind : 'Work Lumen Could Not Place'}</span>
            <span style={{ fontSize: 13, color: MUTED }}>{g.rows.length} {g.rows.length === 1 ? 'step' : 'steps'}</span>
            {g.mission && <button onClick={() => toMission(g.mission)} style={{ ...btn(), padding: '4px 10px', fontSize: 12.5 }}>Open Mission <ArrowRight size={12} /></button>}
          </div>
          <div style={{ marginTop: 12, borderLeft: `1.5px solid ${PANEL_BORDER}`, marginLeft: 4 }}>
            {g.rows.map(p => {
              const r = data.rulings[p.id]
              return (
                <div key={p.id} style={{ position: 'relative', padding: '8px 0 12px 20px' }}>
                  <span style={{ position: 'absolute', left: -4.5, top: 15, width: 7, height: 7, borderRadius: 99, background: r?.verdict === 'accept' ? SUCCESS : 'var(--hud-surface)', border: `1.5px solid ${r?.verdict === 'accept' ? SUCCESS : r?.verdict === 'reject' ? GRAY : 'rgba(234,241,248,0.55)'}` }} />
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 12.5, color: MUTED }}>{stamp(p.at)} <span style={{ color: LABEL, marginLeft: 6 }}>{SOURCE[p.source] || p.source}</span></div>
                      <div style={{ fontSize: 15.5, lineHeight: 1.45, color: r?.verdict === 'reject' ? INK2 : INK, margin: '2px 0 0', textDecoration: r?.verdict === 'reject' ? 'line-through' : 'none' }}>{p.text}</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: MUTED, marginTop: 3 }}>From: {p.basis}</div>
                      {r?.verdict === 'reject' && <div style={{ fontSize: 13, lineHeight: 1.45, color: INK2, marginTop: 5 }}>{r.why ? `Your reason: ${r.why}` : 'No reason given.'}</div>}
                    </div>
                    {!r && asking !== p.id && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => rule(p, 'accept')} disabled={busy === p.id} style={btn(busy === p.id, INK)}><Check size={13} /> Accept</button>
                        <button onClick={() => { setAsking(p.id); setWhy('') }} disabled={busy === p.id} style={btn(busy === p.id)}><XIcon size={13} /> Reject</button>
                      </div>
                    )}
                    {r && <button onClick={() => rule(p, null)} disabled={busy === p.id} style={btn(busy === p.id)}><Undo2 size={13} /> Take It Back</button>}
                  </div>
                  {asking === p.id && (
                    <form onSubmit={(e) => { e.preventDefault(); rule(p, 'reject', why) }} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input autoFocus value={why} onChange={e => setWhy(e.target.value)} placeholder="Why? Lumen reads this before he proposes again." aria-label="Why this step is rejected" style={{ flex: 1, minWidth: 260, fontSize: 14, padding: '8px 11px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.04)', color: INK, outline: 'none' }} />
                      <button type="submit" disabled={busy === p.id} style={btn(busy === p.id, INK)}>{busy === p.id ? 'Saving' : 'Reject'}</button>
                      <button type="button" onClick={() => setAsking(null)} style={btn()}>Cancel</button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {view === 'open' && data.skipped.length > 0 && (
        <section style={{ marginTop: 34, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 16 }}>
          <button onClick={() => setShowLeft(v => !v)} style={{ ...btn(), border: 'none', padding: 0, fontSize: 14 }}>{showLeft ? 'Hide' : 'Show'} What Lumen Left Out · {data.skipped.length}</button>
          {showLeft && (
            <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Events he read and did not count as a step.</div>
              {[...data.skipped].reverse().slice(0, 60).map(s => <div key={s.ref} style={{ fontSize: 13, lineHeight: 1.45, color: INK2 }}><span style={{ color: MUTED }}>{stamp(s.at)} · {SOURCE[s.source] || s.source} · </span>{s.basis}</div>)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
