// The Dashboard (David 11/18: "if what we've been working on is my 'board' then i need a dashboard ... my calendar.
// Maybe the Proposed Steps and Activity log ... i want to see the days earned badges and the unearned ones, gray. and
// if i've earned a badge either the maximum number of times or 3 or more times, i want the color of the badge to be
// purple."). The page under the Board: the day's calendar across the top, Proposed Steps beside Commitments, the
// Activity Log with its miles down the right, and the day's badges behind a selector. Each section opens with its
// tag; the tag's far end carries a light for the section's state and nothing written.
import { sayLogged } from './river/LoggedPop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Play, Square, Video, Check, X as XIcon, Plus, Tag, ScrollText, Lightbulb } from 'lucide-react'
import { parkIdea } from '../lib/ideas'
import { supabase } from '../lib/supabase'
import { startMeetingTimer, stopMeetingTimer, matchNotes } from '../lib/meetings'
import { loadSteps, ruleStep } from '../lib/trailsteps'
import { loadCommitments, addCommitment, ruleCommitment } from '../lib/commitments'
import { hudPrompt } from '../lib/dialog'
import CatchTalk from './river/CatchTalk'
import { useDayRecord } from './river/ActivityLog'
import BadgeMedallion from './BadgeArt'
import { BADGES } from '../constants/collection'
import { S, SectionTag, INK, INK2, GRAY, MUTED, SERIF, RED, chiToday, fmtTime, weekday } from './river/canon'

const PURPLE = '#B4A3E8', BLUE = '#8ACAFF', GREEN = '#57BE97', YELLOW = '#F8C761'
const LINE = 'rgba(255,255,255,0.07)'
const fullDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const names = (a) => (Array.isArray(a) ? a : []).map(x => typeof x === 'string' ? x : x?.name || x?.email || '').filter(Boolean)

// A section's light: green is fine, yellow is building, red is off. The reason is on hover.
const TONE = { green: GREEN, yellow: YELLOW, red: RED }
const Light = ({ level, why }) => <span title={why} aria-label={why} className={`dash-light${level === 'red' ? ' fast' : ''}`} style={{ '--c': TONE[level] }} />
const Round = ({ title, color = BLUE, onClick, size = 34, children, className }) => <button onClick={onClick} title={title} aria-label={title} className={className} style={{ width: size, height: size, borderRadius: 99, display: 'grid', placeItems: 'center', background: 'transparent', border: `1.5px solid ${color}`, color, cursor: 'pointer', flexShrink: 0, padding: 0 }}>{children}</button>
const Row = ({ first, cols, children, style }) => <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 16, alignItems: 'center', padding: '12px 0', borderTop: first ? 'none' : `1px solid ${LINE}`, ...style }}>{children}</div>

function Veil({ title, sub, onClose, children }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 280, background: 'rgba(6,16,26,0.78)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 32 }}>
      <div role="dialog" aria-label={title} onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '86vh', overflowY: 'auto', background: '#0F2334', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, padding: '26px 30px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div><div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, lineHeight: 1.2, color: INK }}>{title}</div>{sub && <div style={{ fontSize: 14, color: INK2, marginTop: 6 }}>{sub}</div>}</div>
          <button onClick={onClose} style={quiet}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}
const quiet = { fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, color: INK, background: 'transparent', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 999, padding: '7px 15px', cursor: 'pointer' }

// A log line's tag follows the Protocol readout and the Board, in their words and colors.
const tagOf = (r) => r.kind === 'Meeting' ? ['In Meeting', BLUE] : r.kind === 'Main Mission' ? ['In Mission', PURPLE] : r.kind === 'Side Mission' ? ['In Mission', PURPLE] : r.kind === 'Email' ? ['Comms', BLUE] : r.kind === 'Said to Lumen' ? ['Lumen', PURPLE] : null
// The day's badges: the catalog less the retired ones and the small counters. Once a day is the maximum for a badge
// that cannot repeat; a run's is four.
const BADGE_IDS = Object.keys(BADGES).filter(id => !BADGES[id].legacy && !['lift', 'hygiene-item', 'dose'].includes(id))
const badgeColor = (id, n) => !n ? null : (n >= 3 || n >= (BADGES[id].repeatable ? (id === 'run' ? 4 : Infinity) : 1)) ? PURPLE : BLUE

export default function DashboardPage({ onNavigate }) {
  const day = chiToday()
  const [view, setView] = useState('Today')
  const [now, setNow] = useState(() => Date.now())
  const [cal, setCal] = useState(null)        // { events, sessions, notes }
  const [steps, setSteps] = useState(null)    // pending proposals
  const [commits, setCommits] = useState(null)
  const [miles, setMiles] = useState([])
  const [tagged, setTagged] = useState(false)
  const [open, setOpen] = useState(null)      // { kind: 'meeting' | 'notes', e }
  const [err, setErr] = useState(null)
  const { view: log } = useDayRecord(day)

  const load = useCallback(async () => {
    const [ev, ms, gm, ml] = await Promise.all([
      supabase.from('calendar_events').select('*').eq('day', day).eq('is_cancelled', false).order('start_at', { ascending: true }),
      supabase.from('meeting_sessions').select('*').eq('day', day),
      supabase.from('granola_meetings').select('id,title,meeting_date,attendees,summary').eq('meeting_date', day),
      supabase.from('miles_ledger').select('id,badge,miles,evidence,awarded_at').eq('day', day).order('awarded_at', { ascending: true }),
    ])
    const sessions = new Map((ms.data || []).map(s => [s.event_id, s]))
    setCal((ev.data || []).filter(e => !e.is_all_day).map(e => ({ ...e, session: sessions.get(e.id) || null, notes: matchNotes(e, gm.data || []) })))
    setMiles(ml.data || [])
    const st = await loadSteps().catch(() => null)
    setSteps(st ? st.proposals.filter(p => !st.rulings[p.id]) : [])
    setCommits(await loadCommitments().catch(() => []))
  }, [day])
  useEffect(() => { Promise.resolve().then(load).catch(e => setErr(e.message)) }, [load])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); const r = setInterval(() => load().catch(() => null), 90_000); return () => { clearInterval(t); clearInterval(r) } }, [load])
  const [talk, setTalk] = useState(null)   // the catch being talked through with Lumen
  const act = async (fn) => { try { setErr(null); await fn(); await load() } catch (e) { setErr(e.message) } }

  // The lights.
  const calLight = useMemo(() => {
    const missed = (cal || []).filter(e => new Date(e.end_at).getTime() < now && !e.session?.started_at && !e.session?.attended_at && !e.notes)
    return missed.length ? { level: 'red', why: `${missed.length} past meeting${missed.length === 1 ? '' : 's'} with no start and no notes` } : { level: 'green', why: 'On cadence: every past meeting was started or has notes' }
  }, [cal, now])
  const rows = useMemo(() => {
    const a = (log?.rows || []).map(r => ({ at: r.at, text: r.text, meta: r.meta, tag: tagOf(r), recorded: !!r.documented, miles: 0 }))
    const b = miles.map(m => ({ at: m.awarded_at, text: `${BADGES[m.badge]?.label || m.badge}${m.evidence ? `: ${m.evidence}` : ''}`, meta: null, tag: m.badge === 'run' ? ['Run', PURPLE] : null, recorded: false, miles: Number(m.miles) || 0 }))
    return [...a, ...b].filter(r => r.at).sort((x, y) => String(y.at).localeCompare(String(x.at)))
  }, [log, miles])
  const logLight = useMemo(() => {
    const last = rows[0] ? new Date(rows[0].at).getTime() : null
    const quiet = last ? Math.round((now - last) / 60000) : null
    return quiet != null && quiet > 30 ? { level: 'red', why: `Nothing logged for ${quiet} minutes` } : { level: 'green', why: quiet == null ? 'Nothing logged yet today' : `Last line ${quiet} minute${quiet === 1 ? '' : 's'} ago` }
  }, [rows, now])
  const n = steps ? steps.length : 0
  const stepsLight = { level: n >= 15 ? 'red' : n >= 10 ? 'yellow' : 'green', why: `${n} proposed step${n === 1 ? '' : 's'} waiting` }
  const openCommits = (commits || []).filter(c => c.state === 'open')
  const late = openCommits.filter(c => c.by && c.by < day)
  const commitLight = { level: late.length ? 'red' : 'green', why: late.length ? `${late.length} past ${late.length === 1 ? 'its' : 'their'} date` : `${openCommits.length} open, none late` }
  const shown = rows.filter(r => !tagged || r.tag)
  const earned = miles.reduce((m, r) => { m[r.badge] = (m[r.badge] || 0) + 1; return m }, {})
  const byDay = (d) => !d ? 'No Date' : d < day ? `Was Due ${new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : d === day ? 'By Today' : `By ${new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
  const push = async () => {
    const what = await hudPrompt({ title: 'Add A Commitment', message: 'What did you say you would do?', placeholder: 'Send the revised dates' })
    if (!what || !what.trim()) return
    const by = await hudPrompt({ title: 'By When?', message: 'A date as YYYY-MM-DD, or leave it empty.', placeholder: day })
    await act(() => addCommitment({ what, by: by && /^\d{4}-\d{2}-\d{2}$/.test(by.trim()) ? by.trim() : null }))
  }

  return (
    <div style={S.page}>
      <style>{`.dash-light { width: 11px; height: 11px; border-radius: 99px; background: var(--c); display: inline-block; animation: dashlite 2.6s ease-in-out infinite } .dash-light.fast { animation-duration: 1.1s } @keyframes dashlite { 0%,100% { box-shadow: 0 0 0 0 transparent } 50% { box-shadow: 0 0 12px 3px color-mix(in srgb, var(--c) 60%, transparent) } } .dash-pulse { animation: dashpulse 2s ease-in-out infinite } @keyframes dashpulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 55%, transparent) } 50% { box-shadow: 0 0 0 7px transparent } } @media (max-width: 980px) { .dash-pair { grid-template-columns: 1fr !important } }`}</style>
      <h1 style={{ ...S.h1, fontSize: 38, lineHeight: 1.1 }}>{weekday(day)}&rsquo;s Dashboard</h1>
      <div style={{ fontSize: 15.5, color: INK2, marginTop: 8 }}>{fullDay(day)} · Chicago</div>
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, margin: '18px 0 30px' }}>
        {['Today', 'Badges'].map(v => <button key={v} onClick={() => setView(v)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 500, border: 0, borderRadius: 999, padding: '7px 18px', cursor: 'pointer', color: view === v ? '#0D1D2C' : INK2, background: view === v ? BLUE : 'transparent' }}>{v}</button>)}
      </div>
      {err && <div style={{ fontSize: 13.5, color: RED, marginBottom: 14 }}>{err}</div>}

      {view === 'Today' ? (
        <>
          <section style={{ marginBottom: 46 }}>
            <SectionTag name="Calendar"><Light {...calLight} /></SectionTag>
            {(cal || []).map((e, i) => {
              const s = new Date(e.start_at).getTime(), en = new Date(e.end_at).getTime()
              const running = !!(e.session?.started_at && !e.session?.stopped_at)
              const past = en <= now && !running, live = s <= now && now < en
              const who = names(e.attendees)
              return (
                <Row key={e.id} first={i === 0} cols="36px 170px minmax(0, 1fr) auto" style={live || running ? { boxShadow: `inset 2px 0 0 ${GREEN}`, paddingLeft: 14, marginLeft: -14 } : undefined}>
                  {running
                    ? <Round title="On now · stop the meeting's clock" color={GREEN} className="dash-pulse" onClick={() => act(async () => { const r = await stopMeetingTimer(e, e.session, day); sayLogged({ title: e.subject, minutes: (r.hours || 0) * 60, where: r.logged ? 'Harvest' : 'Your Day' }) })}><Video size={14} /></Round>
                    : <Round title="Start the meeting's clock" color={past ? 'rgba(243,241,234,0.22)' : BLUE} onClick={() => act(() => startMeetingTimer(e, day))}><Play size={13} fill="currentColor" style={{ marginLeft: 2, color: past ? GRAY : BLUE }} /></Round>}
                  <span style={{ fontSize: 14, color: past ? GRAY : INK2, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(e.start_at)} to {fmtTime(e.end_at)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div onClick={() => setOpen({ kind: 'meeting', e })} title="Open the preview" style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, lineHeight: 1.3, color: past ? GRAY : INK, cursor: 'pointer' }}>{e.subject || '(No Subject)'}</div>
                    <div style={{ fontSize: 13, color: past ? GRAY : MUTED, marginTop: 2 }}>{who.length} {who.length === 1 ? 'Person' : 'People'}{e.organizer ? ` · ${e.organizer} Set It Up` : ''}</div>
                  </div>
                  <span style={{ fontSize: 13, color: live || running ? GREEN : MUTED, display: 'inline-flex', alignItems: 'center' }}>
                    {e.notes ? <Round title="The notes are in · open them" color={PURPLE} size={30} className="dash-pulse" onClick={() => setOpen({ kind: 'notes', e })}><ScrollText size={14} /></Round> : running || live ? 'Now' : past ? 'Done' : ''}
                  </span>
                </Row>
              )
            })}
          </section>

          <div className="dash-pair" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', columnGap: 56, alignItems: 'start', marginBottom: 46 }}>
            <section>
              <SectionTag name="Proposed Steps" style={{ minHeight: 30 }}><Light {...stepsLight} /></SectionTag>
              {(steps || []).map((p, i) => (
                <Row key={p.id} first={i === 0} cols="minmax(0, 1fr) auto">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16.5, lineHeight: 1.3, color: INK }}>{p.mission?.title || 'No Mission'}<span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: BLUE, marginLeft: 10, whiteSpace: 'nowrap' }}>{p.mission?.kind || ''}</span></div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.45, color: INK2, marginTop: 3 }}>{p.text}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Round title="Accept" color={PURPLE} onClick={() => act(() => ruleStep(p.id, 'accept'))}><Check size={16} /></Round>
                    <Round title="Reject" color="rgba(243,241,234,0.44)" onClick={() => act(() => ruleStep(p.id, 'reject'))}><XIcon size={16} /></Round>
                  </div>
                </Row>
              ))}
            </section>
            <section>
              <SectionTag name="Items" style={{ minHeight: 30 }}><Light {...commitLight} /><Round title="Add one yourself" size={30} onClick={push}><Plus size={15} /></Round></SectionTag>
              {openCommits.map((c, i) => (
                <Row key={c.id} first={i === 0} cols="minmax(0, 1fr) auto">
                  <div style={{ minWidth: 0, cursor: 'pointer' }} role="button" tabIndex={0} title="Reconcile It With Lumen" onClick={() => setTalk(c)} onKeyDown={e => { if (e.key === 'Enter') setTalk(c) }}>
                    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16.5, lineHeight: 1.3, color: INK }}>{c.what}<span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: c.by && c.by < day ? RED : BLUE, marginLeft: 10, whiteSpace: 'nowrap' }}>{byDay(c.by)}</span></div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.45, color: INK2, marginTop: 3 }}>{c.source === 'catch' ? [c.heard, c.where].filter(Boolean).join(' · ') : (c.heard || `You added this yourself, ${fmtTime(c.at)}`)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Round title="Done" color={PURPLE} onClick={() => act(() => ruleCommitment(c.id, 'done'))}><Check size={16} /></Round>
                    <Round title="Send To The Ideas Board" color={BLUE} onClick={() => act(() => parkIdea({ text: c.what, src: 'recon', where: c.where || 'Items', catchId: c.id }))}><Lightbulb size={16} /></Round>
                    <Round title="Close As Irrelevant" color="rgba(243,241,234,0.44)" onClick={async () => { const why = await hudPrompt({ title: 'Why Is It Irrelevant?', placeholder: 'A few words; Lumen learns from it' }); if (why !== null) act(() => ruleCommitment(c.id, 'dropped', why || null)) }}><XIcon size={16} /></Round>
                  </div>
                </Row>
              ))}
            </section>
          </div>

          <section>
            <SectionTag name="Activity Log"><Light {...logLight} /><Round title="Show only the lines that carry a tag" size={30} color={tagged ? BLUE : 'rgba(255,255,255,0.2)'} onClick={() => setTagged(!tagged)}><Tag size={14} color={BLUE} /></Round></SectionTag>
            {shown.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '72px 14px minmax(0, 1fr) 54px', columnGap: 10, alignItems: 'start' }}>
                <span style={{ fontSize: 13, color: MUTED, textAlign: 'right', paddingTop: 3, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(r.at)}</span>
                <span style={{ position: 'relative', alignSelf: 'stretch' }}>
                  <i style={{ position: 'absolute', left: 3, top: 7, width: 8, height: 8, borderRadius: 99, background: r.tag ? r.tag[1] : 'rgba(243,241,234,0.4)' }} />
                  {i < shown.length - 1 && <b style={{ position: 'absolute', left: 6.5, top: 20, bottom: -4, width: 1, background: 'rgba(255,255,255,0.12)' }} />}
                </span>
                <div style={{ paddingBottom: 15, minWidth: 0 }}>
                  {r.tag && <span style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 500, color: r.tag[1], border: `1px solid color-mix(in srgb, ${r.tag[1]} 45%, transparent)`, borderRadius: 999, padding: '2px 10px', marginBottom: 5 }}>{r.tag[0]}</span>}
                  <div style={{ fontSize: 14.5, lineHeight: 1.45, color: INK }}>{r.text}{r.recorded && <span title="Recorded in Granola" style={{ display: 'inline-grid', placeItems: 'center', width: 20, height: 20, borderRadius: 6, marginLeft: 8, verticalAlign: -4, background: '#1F3B2C', border: `1px solid ${GREEN}`, color: '#8FE3BD', fontSize: 11, fontWeight: 700 }}>G</span>}</div>
                  {r.meta && <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{r.meta}</div>}
                </div>
                <span style={{ textAlign: 'right', fontFamily: SERIF, fontWeight: 500, fontSize: 15, color: PURPLE, paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{r.miles ? `+${r.miles}` : ''}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', paddingTop: 10, borderTop: `1px solid ${LINE}` }}><span /><b style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, color: PURPLE }}>+{shown.reduce((a, r) => a + r.miles, 0)}</b></div>
          </section>
        </>
      ) : (
        <section>
          <SectionTag name="Badges" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '26px 14px' }}>
            {BADGE_IDS.map(id => {
              const k = earned[id] || 0
              return (
                <div key={id} title={BADGES[id].desc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                  <BadgeMedallion id={id} size={58} earned={!!k} color={badgeColor(id, k)} glow={!!k} />
                  <div style={{ fontSize: 13, lineHeight: 1.3, color: k ? INK : GRAY }}>{BADGES[id].label}</div>
                  {k ? <div style={{ fontSize: 12.5, color: INK2, marginTop: -4 }}>{k > 1 ? `${k} Times · ` : ''}{Math.round(BADGES[id].miles * k * 100) / 100} mi</div> : null}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {open?.kind === 'meeting' && (
        <Veil title={open.e.subject} sub={`${fmtTime(open.e.start_at)} to ${fmtTime(open.e.end_at)}`} onClose={() => setOpen(null)}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 17, color: INK, margin: '4px 0 9px' }}>Who Is There · {names(open.e.attendees).length}</div>
          {names(open.e.attendees).map((w, k) => <div key={k} style={{ fontSize: 14.5, lineHeight: 1.6, color: INK }}>{w}{open.e.organizer && w === open.e.organizer ? <span style={{ color: MUTED }}> · Set It Up</span> : null}</div>)}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
            <button onClick={() => { const e = open.e; setOpen(null); act(() => startMeetingTimer(e, day)) }} style={{ ...quiet, display: 'inline-flex', alignItems: 'center', gap: 10, color: BLUE, borderColor: BLUE, fontWeight: 600, padding: '10px 20px' }}><Play size={14} fill="currentColor" />Start</button>
          </div>
        </Veil>
      )}
      {open?.kind === 'notes' && (
        <Veil title={open.e.subject} sub={`${fmtTime(open.e.start_at)} to ${fmtTime(open.e.end_at)} · Notes`} onClose={() => setOpen(null)}>
          <div style={{ fontSize: 14.5, lineHeight: 1.6, color: INK, whiteSpace: 'pre-wrap' }}>{open.e.notes?.summary || 'The notes are in, with no summary yet.'}</div>
          {onNavigate && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 16, borderTop: `1px solid ${LINE}` }}><button onClick={() => { setOpen(null); onNavigate('notes') }} style={quiet}>Open The Full Notes</button></div>}
        </Veil>
      )}
      {talk && <CatchTalk c={talk} onClose={() => setTalk(null)} onRuled={() => { setTalk(null); load() }} />}
    </div>
  )
}
