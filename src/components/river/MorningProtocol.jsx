// Protocols (David, 10/6): the Morning Protocol is the first thing he does,
// a guided click-through of six steps under one timer. The Evening Protocol
// card is the placeholder for the real close of the day (next).
//
//   1 Gateway          a song from the curated library, over the coffee
//   2 Body             morning hygiene and the doses due, one at a time
//   3 Morning Reflection  the reflection, written and logged (the devotional badge)
//   4 Today's Digest   yesterday landed, today's calendar, Lumen's read and his questions
//   5 Today's Game Plan  Lumen builds the day as data from the answers; adjust it in words
//   6 Systems Check    the lights, now or later, timers inside the protocol, then reconcile
//   7 Launch           pick the first clock; the protocol timer stops
//
// One timer: meeting_sessions adhoc:<day>:morning-protocol, logged to Harvest
// as Business Administration when he launches (same door as Recurring). The
// finish also writes daily_logs what 'morning-protocol' (minutes) so the
// planning light and the River can see it ran. No miles for the timer.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ArrowLeft, ArrowRight, Check, Sunrise, Moon, Play, Pause, Square, Rocket, Send, ExternalLink, SkipForward, SkipBack, RotateCcw, Mic, Music, Sparkles, RefreshCw, ListMusic, X as XIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { upsertSession, logToHarvest, hoursBetween } from '../../lib/meetings'
import { fetchLoadout, equipObjective, equipTask, equip, fmtClock, chiToday, SIZES, SLOTS } from '../../lib/loadout'
import { HYGIENE_ITEMS } from '../../constants/hygiene'
import { GATEWAY_PLAYLIST } from '../../constants/gateway'
import { MEDICATIONS, dueOn } from '../../constants/medications'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, GREEN, RED, BLUE, MONO, SERIF, S, Label as BaseLabel, Panel, fmtTime } from './canon'

// Protocol labels read in the baby blue (David, 10/8).
const Label = ({ children, style }) => <BaseLabel style={{ color: BLUE, ...style }}>{children}</BaseLabel>
const READ = { fontFamily: SERIF, fontWeight: 500, fontSize: 16.5, lineHeight: 1.65, letterSpacing: '-0.01em', color: INK }
import { Instrument, InstrumentGroup, groupMsg } from './Instrument'

export const MORNING_SLUG = 'morning-protocol'
const eid = (day) => `adhoc:${day}:${MORNING_SLUG}`
const STEPS = [
  { id: 'gateway', title: 'Gateway', sub: 'a song for the coffee' },
  { id: 'body', title: 'Body', sub: 'log what is done' },
  { id: 'reflection', title: 'Morning Reflection', sub: 'before the day, the spring' },
  { id: 'digest', title: "Today's Digest", sub: 'yesterday landed, today ahead, his questions' },
  { id: 'plan', title: "Today's Game Plan", sub: 'the day as data, adjusted in words' },
  { id: 'systems', title: 'Systems Check', sub: 'the lights, now or later, then reconcile' },
  { id: 'launch', title: 'Launch', sub: 'the first clock starts' },
]
const MORNING_HYGIENE = ['shower', 'brush-am', 'shave']
const MORNING_MEDS = (day) => MEDICATIONS.filter(m => ['morning', 'any', 'Friday'].includes(m.when) && dueOn(m, day))

const yesterdayOf = (day) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) }
const plusDays = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const rows = (p) => p.then(r => { if (r.error) console.warn('protocol', r.error.message); return Array.isArray(r.data) ? r.data : [] })

const btn = (color = INK2, filled = false, extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase',
  padding: '8px 14px', borderRadius: 10, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent',
  color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra,
})
const tile = (on, color = GREEN) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, minWidth: 180, flex: '1 1 180px', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
  border: `1px solid ${on ? color : PANEL_BORDER}`, background: on ? `${color}14` : 'rgba(255,255,255,0.03)', color: INK,
})
const LEVEL = { green: GREEN, gold: GOLD, red: RED, gray: 'rgba(234,241,248,0.25)' }
const lightRule = (kind, L) => {
  if (kind === 'email') { const n = L?.email?.unread; if (n == null) return { level: 'gray', text: 'inbox count unavailable' }; return n >= 125 ? { level: 'red', blink: true, text: `${n} unread · overlooked?` } : n >= 50 ? { level: 'red', text: `${n} unread · critical` } : n >= 20 ? { level: 'gold', text: `${n} unread · maintenance required` } : { level: 'green', text: `${n} unread` } }
  if (kind === 'slack') { const n = L?.slack?.unread; if (n == null) return { level: 'gray', text: 'no Slack count yet' }; return n >= 35 ? { level: 'red', blink: true, text: `${n} unread · overlooked?` } : n >= 20 ? { level: 'red', text: `${n} unread · critical` } : n >= 5 ? { level: 'gold', text: `${n} unread · maintenance required` } : { level: 'green', text: `${n} unread` } }
  if (kind === 'bill') { const d = L?.bill_pay?.days; if (d == null) return { level: 'gold', text: 'no Bill Pay on record yet' }; return d >= 15 ? { level: 'red', blink: true, text: `${d} days since Bill Pay · overlooked?` } : d >= 12 ? { level: 'red', text: `${d} days · critical` } : d >= 8 ? { level: 'gold', text: `${d} days · due` } : { level: 'green', text: `${d} day${d === 1 ? '' : 's'} since Bill Pay` } }
  return { level: 'gray', text: '' }
}

// Systems Check: rough minutes to bring each light back to green.
const workToGreen = (kind, L) => {
  if (kind === 'email') { const n = L?.email?.unread; if (n == null) return null; return n < 20 ? 0 : Math.round((n - 15) * 0.5) }
  if (kind === 'slack') { const n = L?.slack?.unread; if (n == null) return null; return n < 5 ? 0 : Math.round((n - 3) * 0.7) }
  if (kind === 'bill') { const d = L?.bill_pay?.days; if (d == null) return 20; return d < 8 ? 0 : 20 }
  return null
}
const SYSTEMS = [{ key: 'email', slug: 'email-refresh', label: 'E-mail Refresh' }, { key: 'slack', slug: 'slack-review', label: 'Slack Review' }, { key: 'bill', slug: 'bill-pay', label: 'Bill Pay' }]

// Protocol lights (David, 10/7), Chicago time. The outline breathes while
// the protocol is still owed: Morning green 5:00 to 6:30, gold to 8:00, red
// after; Evening green 6:00 PM to 10:00, gold to 11:30, red after (through
// the night until the close). Done, the light goes out.
const chiMinutes = (ms) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value])); return (Number(p.hour) % 24) * 60 + Number(p.minute) }
export function protocolLight(which, ms = Date.now()) {
  const m = chiMinutes(ms)
  if (which === 'morning') {
    if (m < 5 * 60) return null
    if (m < 6 * 60 + 30) return { level: 'green', text: 'Morning Protocol · the window is open (5:00 to 6:30)' }
    if (m < 8 * 60) return { level: 'gold', text: 'Morning Protocol · running late (6:30 to 8:00)' }
    return { level: 'red', blink: m >= 10 * 60, text: 'Morning Protocol · overdue (after 8:00)' }
  }
  if (m >= 18 * 60 && m < 22 * 60) return { level: 'green', text: 'Evening Protocol · the window is open (6:00 to 10:00 PM)' }
  if (m >= 22 * 60 && m < 23 * 60 + 30) return { level: 'gold', text: 'Evening Protocol · running late (10:00 to 11:30 PM)' }
  if (m >= 23 * 60 + 30 || m < 5 * 60) return { level: 'red', blink: m < 5 * 60, text: 'Evening Protocol · overdue (after 11:30 PM)' }
  return null
}

const stepKey = (day) => `mp-step:${day}`
const readStep = (day) => { try { const v = Number(localStorage.getItem(stepKey(day))); return Number.isFinite(v) ? Math.max(0, Math.min(STEPS.length - 1, v)) : 0 } catch { return 0 } }
const writeStep = (day, n) => { try { localStorage.setItem(stepKey(day), String(n)) } catch { /* no-op */ } }
const authHeader = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('not signed in'); return { Authorization: `Bearer ${session.access_token}` } }

// ---- Lumen in the protocol -------------------------------------------------------
// Pinned under every step: David answers Lumen or asks for something, typed or
// spoken (hold the mic; the clip goes to Whisper, then to the brain). Same
// thread as WhatsApp (channel 'hud'), so what he says here is read in
// everywhere; the step data reloads after each reply.
function LumenStrip({ day, where, onReplied, prompt }) {
  const [thread, setThread] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [rec, setRec] = useState(null)
  const [err, setErr] = useState(null)
  const chunks = useRef([])
  const pull = useCallback(async () => {
    const since = new Date(day + 'T05:00:00Z').toISOString()
    setThread(await rows(supabase.from('lumen_messages').select('id,at,direction,body,kind').eq('channel', 'hud').neq('kind', 'system').gte('at', since).order('id', { ascending: true }).limit(60)))
  }, [day])
  useEffect(() => { Promise.resolve().then(pull) }, [pull])
  const post = async (payload, headers) => {
    setBusy(true); setErr(null)
    try {
      const h = await authHeader()
      const r = await fetch(`/api/lumen-hud?where=${encodeURIComponent(where)}`, { method: 'POST', headers: { ...h, ...headers }, body: payload })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.error) throw new Error(j.error || `lumen ${r.status}`)
      await pull(); onReplied && onReplied()
    } catch (e) { setErr(`Lumen did not answer: ${e.message}`) } finally { setBusy(false) }
  }
  const send = () => { const t = text.trim(); if (!t || busy) return; setText(''); setThread(th => [...th, { id: `tmp-${Date.now()}`, at: new Date().toISOString(), direction: 'in', body: t }]); post(JSON.stringify({ text: t, where }), { 'Content-Type': 'application/json' }) }
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '')
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' }); setRec(null); if (blob.size < 2000) { setErr('Nothing heard'); return } setThread(th => [...th, { id: `tmp-${Date.now()}`, at: new Date().toISOString(), direction: 'in', body: '(voice note, transcribing…)', kind: 'audio' }]); post(blob, { 'Content-Type': blob.type }) }
      mr.start(); setRec(mr)
    } catch (e) { setErr(`Microphone: ${e.message}`) }
  }
  const stopRec = () => { try { rec && rec.stop() } catch { /* no-op */ } }
  const last = thread.slice(-6)
  return (
    <Panel style={{ marginBottom: 0, marginTop: 26, borderColor: 'rgba(169,201,232,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Label style={{ marginBottom: 0 }}>Lumen · same thread as WhatsApp</Label>{prompt && <span style={{ fontSize: 11.5, color: GRAY }}>{prompt}</span>}</div>
      {last.length > 0 && (
        <div style={{ display: 'grid', gap: 6, margin: '10px 0 4px' }}>
          {last.map(m => <div key={m.id} style={{ fontSize: 13.5, lineHeight: 1.6, color: m.direction === 'in' ? INK2 : INK, fontFamily: m.direction === 'in' ? 'inherit' : SERIF, fontWeight: m.direction === 'in' ? 400 : 500, paddingLeft: m.direction === 'in' ? 0 : 12, borderLeft: m.direction === 'in' ? 'none' : `2px solid ${BLUE}66`, whiteSpace: 'pre-wrap' }}><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY, marginRight: 8 }}>{m.direction === 'in' ? (m.kind === 'audio' ? 'YOU · VOICE' : 'YOU') : 'LUMEN'} · {fmtTime(m.at)}</span>{m.body}</div>)}
        </div>
      )}
      {busy && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: BLUE, textTransform: 'uppercase', margin: '8px 0 4px' }} className="mp-blink">Lumen is working…</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder="Answer him, or ask for something. Enter sends." disabled={busy || !!rec}
          style={{ flex: 1, fontSize: 13.5, padding: '10px 12px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: INK }} />
        {rec
          ? <button onClick={stopRec} className="mp-blink" style={btn(RED, true)}><Square size={12} /> Stop</button>
          : <button onClick={startRec} disabled={busy} title="Talk to him; tap again to send" style={btn(BLUE, false, { opacity: busy ? 0.5 : 1 })}><Mic size={12} /> Talk</button>}
        <button onClick={send} disabled={busy || !text.trim()} style={btn(BLUE, false, { opacity: busy || !text.trim() ? 0.5 : 1 })}><Send size={12} /> Send</button>
      </div>
      {err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: RED, textTransform: 'uppercase', marginTop: 8 }}>{err}</div>}
    </Panel>
  )
}

// ---- the Gateway player -----------------------------------------------------------
// A small player pinned to the corner of the protocol: the curated tracks
// that David owns play here (signed URLs from the project-files bucket), so
// the music follows him from Gateway through Launch. Links-only tracks open
// in Apple Music instead.
function GatewayPlayer({ index, onIndex, onPlayed }) {
  const audio = useRef(null)
  const [src, setSrc] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [list, setList] = useState(false)
  const [err, setErr] = useState(null)
  const playable = GATEWAY_PLAYLIST.map((t, i) => ({ ...t, i })).filter(t => t.file)
  const track = GATEWAY_PLAYLIST[index] || null
  useEffect(() => {
    let alive = true
    Promise.resolve().then(() => { if (alive) { setSrc(null); setErr(null) } })
    if (!track?.file) return
    supabase.storage.from('project-files').createSignedUrl(`gateway/${track.file}`, 3600).then(({ data, error }) => { if (!alive) return; if (error || !data?.signedUrl) setErr('track not found in the bucket'); else setSrc(data.signedUrl) })
    return () => { alive = false }
  }, [track?.file])
  useEffect(() => { if (src && audio.current) { audio.current.play().then(() => { setPlaying(true); onPlayed && onPlayed(track) }).catch(() => setPlaying(false)) } }, [src]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!track) return null
  const step = (d) => { if (!playable.length) return; const pos = playable.findIndex(t => t.i === index); const next = playable[(pos + d + playable.length) % playable.length]; onIndex(next.i) }
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {}); else { a.pause(); setPlaying(false) } }
  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 260, width: 300, borderRadius: 14, border: `1px solid ${GOLD}55`, background: 'rgba(16,39,59,0.96)', boxShadow: '0 12px 40px rgba(0,0,0,0.45)', padding: '12px 14px' }}>
      {src && <audio ref={audio} src={src} onEnded={() => step(1)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Music size={14} color={GOLD} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, letterSpacing: '0.6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}{err ? ` · ${err}` : !track.file ? ' · opens in Apple Music' : playing ? ' · playing' : ' · paused'}</div>
        </div>
        <button onClick={() => setList(l => !l)} title="Tracks" style={{ ...btn(INK2), padding: '5px 7px' }}><ListMusic size={12} /></button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
        <button onClick={() => step(-1)} disabled={playable.length < 2} style={{ ...btn(INK2), padding: '6px 9px' }}><SkipBack size={12} /></button>
        {track.file
          ? <button onClick={toggle} style={{ ...btn(GOLD, true), padding: '6px 14px' }}>{playing ? <Pause size={12} /> : <Play size={12} />}</button>
          : <button onClick={() => track.url && window.open(track.url, '_blank', 'noopener')} style={{ ...btn(GOLD, true), padding: '6px 14px' }}><ExternalLink size={12} /></button>}
        <button onClick={() => step(1)} disabled={playable.length < 2} style={{ ...btn(INK2), padding: '6px 9px' }}><SkipForward size={12} /></button>
      </div>
      {list && (
        <div style={{ marginTop: 10, maxHeight: 220, overflowY: 'auto', borderTop: `1px solid ${PANEL_BORDER}` }}>
          {GATEWAY_PLAYLIST.map((t, i) => (
            <button key={`${t.title}-${i}`} onClick={() => { onIndex(i); setList(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 2px', background: 'transparent', border: 'none', borderBottom: `1px solid ${PANEL_BORDER}`, color: i === index ? GOLD : INK, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: GRAY }}>{t.file ? 'plays here' : 'link'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- the overlay ------------------------------------------------------------
function Protocol({ day, session, onClose, onFinished, onChange, onNavigate }) {
  const [step, setStep] = useState(() => readStep(day))
  const [dir, setDir] = useState(1)
  const [skipped, setSkipped] = useState(() => new Set())
  const advanceRef = useRef(false)
  const [now, setNow] = useState(() => Date.now())
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  // Data for the steps
  const [read, setRead] = useState(null)
  const [yday, setYday] = useState(null)
  const [events, setEvents] = useState([])
  const [logs, setLogs] = useState([])
  const [lights, setLights] = useState(null)
  const [followups, setFollowups] = useState([])
  const [queueCount, setQueueCount] = useState(0)
  const [L, setL] = useState(null)
  const [projects, setProjects] = useState(new Map())
  const [first, setFirst] = useState(null)
  const [song, setSong] = useState('')
  const [reflection, setReflection] = useState('')
  const [plan, setPlan] = useState(undefined)      // undefined = not loaded, null = none yet
  const [planBusy, setPlanBusy] = useState(false)
  const [adjust, setAdjust] = useState('')
  const [sysChoice, setSysChoice] = useState(null) // 'now' | 'later'
  const [sessions, setSessions] = useState([])     // adhoc timers today
  const [reconcile, setReconcile] = useState(null)
  const [trackIndex, setTrackIndex] = useState(null)  // the Gateway player

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const elapsed = session?.started_at ? (now - new Date(session.started_at).getTime()) / 60000 + ((Number(session.hours) || 0) * 60) : 0

  const yd = yesterdayOf(day)
  const loadAll = useCallback(async () => {
    const [m, ml, ev, lg, fu, fuAll, pj, lo, ss] = await Promise.all([
      rows(supabase.from('lumen_messages').select('body,at,meta').eq('channel', 'pulse').eq('direction', 'out').eq('kind', 'text').contains('meta', { kind: 'morning', day }).order('at', { ascending: false }).limit(1)),
      rows(supabase.from('miles_ledger').select('miles,badge,key').eq('day', yd)),
      rows(supabase.from('calendar_events').select('id,subject,start_at,end_at,is_all_day').eq('day', day).eq('is_cancelled', false).order('start_at')),
      rows(supabase.from('daily_logs').select('id,kind,what,at,note').eq('day', day).in('kind', ['hygiene', 'medication', 'devotional', 'gateway'])),
      rows(supabase.from('objectives').select('id,title,follow_up_date,effort,tags,description').eq('state', 'follow_up').is('deleted_at', null).lte('follow_up_date', day).order('follow_up_date')),
      rows(supabase.from('objectives').select('id').eq('state', 'follow_up').is('deleted_at', null)),
      rows(supabase.from('projects').select('id,name,status')),
      fetchLoadout(),
      rows(supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at,hours').eq('day', day).like('event_id', 'adhoc:%')),
    ])
    setRead(m[0] || null); setYday({ miles: ml.reduce((s, r) => s + (Number(r.miles) || 0), 0), badges: [...new Set(ml.map(r => r.badge))] })
    setEvents(ev); setLogs(lg); setFollowups(fu); setQueueCount(fuAll.length); setProjects(new Map(pj.map(p => [p.id, p]))); setL(lo); setSessions(ss)
    if (!first && lo.equipped) setFirst(lo.equipped.id)
    try {
      const h = await authHeader()
      const r = await fetch('/api/lights', { headers: h, cache: 'no-store' }); if (r.ok) setLights(await r.json())
      if (plan === undefined) { const pr = await fetch(`/api/lumen-plan?day=${day}`, { headers: h, cache: 'no-store' }); setPlan(pr.ok ? (await pr.json()).plan : null) }
    } catch { /* lights stay gray */ }
  }, [day, yd, first, plan])
  useEffect(() => { loadAll() }, [loadAll])

  const go = useCallback((n) => { const to = Math.max(0, Math.min(STEPS.length - 1, n)); setDir(to > step ? 1 : -1); setStep(to); writeStep(day, to); setMsg(null) }, [step, day])
  const cur = STEPS[step]

  // ---- logs (body, reflection, gateway)
  const logged = (kind, what) => logs.find(l => l.kind === kind && l.what === what)
  const reloadLogs = async () => setLogs(await rows(supabase.from('daily_logs').select('id,kind,what,at,note').eq('day', day).in('kind', ['hygiene', 'medication', 'devotional', 'gateway'])))
  const toggleLog = async (kind, what, note = 'Morning Protocol') => {
    const row = logged(kind, what)
    try {
      if (row) await supabase.from('daily_logs').delete().eq('id', row.id)
      else { const { error } = await supabase.from('daily_logs').insert({ day, kind, what, note, source: 'hud', at: new Date().toISOString() }); if (error) throw new Error(error.message); advanceRef.current = true }
      await reloadLogs(); onChange && onChange()
    } catch (e) { setMsg(`Could not log: ${e.message}`) }
  }
  const meds = useMemo(() => MORNING_MEDS(day), [day])
  const bodyQueue = useMemo(() => [
    ...HYGIENE_ITEMS.filter(h => MORNING_HYGIENE.includes(h.key)).map(h => ({ kind: 'hygiene', key: h.key, label: h.label, color: GREEN, sub: '0.25 mi when logged' })),
    ...meds.map(m => ({ kind: 'medication', key: m.key, label: m.label, color: GOLD, sub: `${m.dose} · 0.5 mi when logged` })),
  ], [meds])
  const bodyLeft = bodyQueue.filter(i => !logged(i.kind, i.key) && !skipped.has(i.key))
  const bodyCurrent = bodyLeft[0] || null
  useEffect(() => {
    if (STEPS[step]?.id !== 'body' || !advanceRef.current || bodyLeft.length) return
    advanceRef.current = false
    const t = setTimeout(() => go(step + 1), 650)
    return () => clearTimeout(t)
  }, [bodyLeft.length, step, go])
  const gatewayLog = logs.find(l => l.kind === 'gateway')
  const reflectionLog = logged('devotional', 'devotional')
  const logSong = async (title, stay = false) => { const t = String(title || song).trim(); if (!t) return; if (gatewayLog) await supabase.from('daily_logs').delete().eq('id', gatewayLog.id); const { error } = await supabase.from('daily_logs').insert({ day, kind: 'gateway', what: t.slice(0, 160), note: 'Gateway · Morning Protocol', source: 'hud', at: new Date().toISOString() }); if (error) { setMsg(`Could not log: ${error.message}`); return } await reloadLogs(); setSong(''); if (!stay) setTimeout(() => go(step + 1), 500) }
  const logReflection = async () => { const { error } = await supabase.from('daily_logs').insert({ day, kind: 'devotional', what: 'devotional', note: reflection.trim() || 'Morning Reflection', source: 'hud', at: new Date().toISOString() }); if (error) { setMsg(`Could not log: ${error.message}`); return } await reloadLogs(); onChange && onChange() }
  const openDevotional = () => { writeStep(day, step); onClose(); onNavigate && onNavigate('maintenance', ['spiritual']) }

  // ---- follow-ups and loading (inside the Game Plan)
  const pushFollow = async (o, n) => { const { error } = await supabase.from('objectives').update({ follow_up_date: plusDays(day, n) }).eq('id', o.id); if (error) { setMsg(`Could not push: ${error.message}`); return } setFollowups(f => f.filter(x => x.id !== o.id)); setMsg(`${o.title}: pushed to ${plusDays(day, n)}`) }
  const dropFollow = async (o) => { const { error } = await supabase.from('objectives').update({ deleted_at: new Date().toISOString() }).eq('id', o.id); if (error) { setMsg(`Could not drop: ${error.message}`); return } setFollowups(f => f.filter(x => x.id !== o.id)); setQueueCount(c => Math.max(0, c - 1)); setMsg(`${o.title}: dropped`) }
  const loadRef = async (ref, title) => {
    setBusy(true)
    try {
      let r
      if (ref?.type === 'objective') r = await equipObjective(ref.id, { clock: false })
      else if (ref?.type === 'task') { const { data } = await supabase.from('project_tasks').select('id,text,status,objective_id,project_id').eq('id', ref.id).limit(1); if (!data?.[0]) throw new Error('task not found'); r = await equipTask(data[0], projects.get(data[0].project_id)?.name, { clock: false }) }
      else throw new Error('nothing to load')
      if (!r.ok) { setMsg(`Will not fit: ${r.reasons.join(' · ')}`); return }
      const lo = await fetchLoadout(); setL(lo); if (!first) setFirst(r.id || ref.id); setMsg(`${title || r.title} loaded (${lo.slots.used}/${SLOTS} slots)`)
    } catch (e) { setMsg(`Could not load: ${e.message}`) } finally { setBusy(false) }
  }
  const todayFollow = async (o) => { const { error } = await supabase.from('objectives').update({ due_date: day, follow_up_date: day }).eq('id', o.id); if (error) { setMsg(`Could not mark it: ${error.message}`); return } setFollowups(f => f.filter(x => x.id !== o.id)); await loadRef({ type: 'objective', id: o.id }, o.title) }

  // ---- the plan
  const runPlan = async (mode, instruction) => {
    setPlanBusy(true); setMsg(null)
    try {
      const h = await authHeader()
      const r = await fetch('/api/lumen-plan', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ day, mode, instruction, plan: plan || undefined }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.error) throw new Error(j.error || `plan ${r.status}`)
      setPlan(j.plan); if (mode === 'reconcile') setReconcile(j.plan.summary || 'Reconciled.'); if (mode === 'adjust') setAdjust('')
      if (j.warning) setMsg(`Plan built; not saved: ${j.warning}`)
      const lo = await fetchLoadout(); setL(lo)
    } catch (e) { setMsg(`Could not ${mode === 'build' ? 'build' : mode} the plan: ${e.message}`) } finally { setPlanBusy(false) }
  }
  const planAuto = useRef(false)
  useEffect(() => { if (cur.id === 'plan' && plan === null && !planBusy && !planAuto.current) { planAuto.current = true; runPlan('build') } }, [cur.id, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- systems check timers (same door as the Console)
  const sysSession = (slug) => sessions.find(s => s.event_id === `adhoc:${day}:${slug}`)
  const sysRunning = (slug) => { const s = sysSession(slug); return !!(s && s.started_at && !s.stopped_at) }
  const sysStart = async (sys) => {
    try {
      const other = sessions.find(s => s.started_at && !s.stopped_at && !s.event_id.endsWith(':travel') && !s.event_id.endsWith(`:${MORNING_SLUG}`) && s.event_id !== `adhoc:${day}:${sys.slug}`)
      if (other) { setMsg(`${other.subject} is running. Stop it first.`); return }
      await upsertSession({ event_id: `adhoc:${day}:${sys.slug}`, day, subject: sys.label, started_at: new Date().toISOString(), stopped_at: null, hours: sysSession(sys.slug)?.hours || 0 })
      await loadAll()
    } catch (e) { setMsg(`Could not start: ${e.message}`) }
  }
  const sysStop = async (sys) => {
    try {
      const s = sysSession(sys.slug); if (!s?.started_at) return
      const stopped = new Date().toISOString(); const span = Math.max(0.01, hoursBetween(s.started_at, stopped)); const hours = Math.round(((Number(s.hours) || 0) + span) * 100) / 100
      let ok = false; try { await logToHarvest(sys.label, Math.round(span * 100) / 100); ok = true } catch (e) { setMsg(`Timer stopped; Harvest did not take it: ${e.message}`) }
      await upsertSession({ event_id: `adhoc:${day}:${sys.slug}`, day, subject: sys.label, started_at: s.started_at, stopped_at: stopped, hours, harvest_logged: ok })
      if (ok) setMsg(`${sys.label}: ${fmtClock(span * 60)} logged to Harvest`)
      await loadAll()
    } catch (e) { setMsg(`Could not stop: ${e.message}`) }
  }
  const markSlackClean = async () => { const { error } = await supabase.from('daily_logs').insert({ day, kind: 'activity', what: 'slack-clean', value: 1, note: 'marked in the Systems Check', source: 'hud' }); if (error) setMsg(`Could not mark it: ${error.message}`); else setMsg('Slack clean today · Clean Slack strikes at the close') }

  // ---- launch
  const launch = async () => {
    setBusy(true)
    try {
      const stopped = new Date().toISOString()
      const span = session?.started_at ? Math.max(0.01, hoursBetween(session.started_at, stopped)) : 0.01
      const hours = Math.round(((Number(session?.hours) || 0) + span) * 100) / 100
      let ok = false
      try { await logToHarvest('Morning Protocol', Math.round(span * 100) / 100); ok = true } catch (e) { setMsg(`Harvest did not take the protocol time: ${e.message}`) }
      await upsertSession({ event_id: eid(day), day, subject: 'Morning Protocol', started_at: session?.started_at || stopped, stopped_at: stopped, hours, harvest_logged: ok || !!session?.harvest_logged })
      await supabase.from('daily_logs').insert({ day, kind: 'activity', what: MORNING_SLUG, value: Math.round(span * 60), note: `Morning Protocol · ${L?.slots?.used ?? 0}/${SLOTS} slots loaded${plan ? ' · plan set' : ''}`, source: 'hud', at: stopped })
      if (first === 'email') await upsertSession({ event_id: `adhoc:${day}:email-refresh`, day, subject: 'E-mail Refresh', started_at: new Date().toISOString(), stopped_at: null })
      else if (first) await equip(first)
      // Read Lumen in: the launch note lands in his thread so WhatsApp knows the day's shape.
      try { const h = await authHeader(); const firstTitle = first === 'email' ? 'E-mail Refresh' : (L?.items.find(i => i.id === first)?.title || 'nothing'); await fetch('/api/lumen-plan', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ day, mode: 'note', text: `Morning Protocol launched at ${fmtTime(stopped)} after ${Math.round(span * 60)} minutes. Loaded: ${(L?.board || []).map(i => `${i.title} (${SIZES[i.size]?.label})`).join('; ') || 'nothing'}. First clock: ${firstTitle}. ${plan?.summary ? `Plan: ${plan.summary}` : 'No plan was built.'}${reconcile ? ` Reconcile: ${reconcile}` : ''}` }) }) } catch { /* best effort */ }
      onFinished({ minutes: Math.round(span * 60) })
    } catch (e) { setMsg(`Launch failed: ${e.message}`); setBusy(false) }
  }

  const board = L?.board || []
  const firstMeeting = events.find(e => !e.is_all_day)
  const chiHHMM = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))

  const content = () => {
    // 1 Gateway
    if (cur.id === 'gateway') return (
      <div style={{ display: 'grid', gap: 14 }}>
        {gatewayLog && <div className="mp-step-r" style={{ padding: '18px 22px', borderRadius: 14, border: `1px solid ${GREEN}66`, background: `${GREEN}10`, display: 'flex', alignItems: 'center', gap: 12 }}><Music size={18} color={GREEN} /><div><div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, color: '#fff' }}>{gatewayLog.what}</div><div style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>chosen {fmtTime(gatewayLog.at)} · tap another to change it</div></div></div>}
        {GATEWAY_PLAYLIST.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {GATEWAY_PLAYLIST.map(t => { const on = gatewayLog?.what === `${t.title} · ${t.artist}`; return (
              <button key={t.title} onClick={() => { setTrackIndex(GATEWAY_PLAYLIST.indexOf(t)); if (t.file) logSong(`${t.title} · ${t.artist}`, true); else { logSong(`${t.title} · ${t.artist}`); if (t.url) window.open(t.url, '_blank', 'noopener') } }} style={{ ...tile(on, GOLD), minWidth: 0 }}>
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14, fontFamily: SERIF, fontWeight: 500 }}><Music size={13} color={on ? GOLD : INK2} />{t.title}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{t.artist}{t.file ? ' · plays here' : ' · Apple Music'}</span>
              </button>) })}
          </div>
        ) : (
          <Panel style={{ marginBottom: 0 }}>
            <Label>The library</Label>
            <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.6 }}>The curated playlist is not up yet (src/constants/gateway.js). Until it lands, say what is playing and the day opens on it.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input value={song} onChange={e => setSong(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') logSong() }} placeholder="What's playing over the coffee?" style={{ flex: 1, fontSize: 13.5, padding: '10px 12px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: INK }} />
              <button onClick={() => logSong()} disabled={!song.trim()} style={btn(GOLD, true, { opacity: song.trim() ? 1 : 0.5 })}><Music size={12} /> Open the day</button>
            </div>
          </Panel>
        )}
      </div>
    )
    // 2 Body
    if (cur.id === 'body') {
      const doneItems = bodyQueue.filter(i => logged(i.kind, i.key))
      const upcoming = bodyLeft.slice(1)
      const skippedItems = bodyQueue.filter(i => skipped.has(i.key) && !logged(i.kind, i.key))
      return (
        <div style={{ display: 'grid', gap: 18 }}>
          {doneItems.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              {doneItems.map(i => <button key={i.key} onClick={() => toggleLog(i.kind, i.key)} title="Tap to undo" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer', textAlign: 'left', color: INK2 }}><Check size={13} color={i.color} /><span style={{ fontSize: 13, flex: 1 }}>{i.label}</span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY }}>logged {fmtTime(logged(i.kind, i.key).at)}</span><RotateCcw size={11} color={GRAY} /></button>)}
            </div>
          )}
          {bodyCurrent ? (
            <div key={bodyCurrent.key} className="mp-step-r" style={{ padding: '22px 24px', borderRadius: 14, border: `1px solid ${bodyCurrent.color}88`, background: `${bodyCurrent.color}10` }}>
              <Label style={{ color: bodyCurrent.color }}>{bodyCurrent.kind === 'hygiene' ? 'Hygiene' : 'Dose due this morning'} · {doneItems.length + 1} of {bodyQueue.length}</Label>
              <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 28, color: '#fff', margin: '6px 0 4px', letterSpacing: '-0.01em' }}>{bodyCurrent.label}</div>
              <div style={{ fontSize: 12.5, color: GRAY, marginBottom: 16 }}>{bodyCurrent.sub}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => toggleLog(bodyCurrent.kind, bodyCurrent.key)} style={btn(bodyCurrent.color, true)}><Check size={12} /> Done</button>
                <button onClick={() => setSkipped(s => new Set([...s, bodyCurrent.key]))} style={btn(INK2)}><SkipForward size={12} /> Skip</button>
              </div>
            </div>
          ) : (
            <div className="mp-step-r" style={{ padding: '22px 24px', borderRadius: 14, border: `1px solid ${GREEN}66`, background: `${GREEN}10` }}>
              <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 24, color: '#fff' }}>{skippedItems.length ? `Body done, ${skippedItems.length} skipped for later.` : 'Body done.'}</div>
              <div style={{ fontSize: 12.5, color: GRAY, marginTop: 4 }}>{skippedItems.length ? skippedItems.map(i => i.label).join(' · ') : 'Everything logged. Moving on.'}</div>
            </div>
          )}
          {(upcoming.length > 0 || skippedItems.length > 0) && (
            <div style={{ display: 'grid', gap: 4, opacity: 0.55 }}>
              {upcoming.map(i => <div key={i.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', color: INK2 }}><span style={{ width: 13, height: 13, borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)', flex: '0 0 13px' }} /><span style={{ fontSize: 13, flex: 1 }}>{i.label}</span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY }}>up next</span></div>)}
              {skippedItems.map(i => <button key={i.key} onClick={() => setSkipped(s => { const n = new Set(s); n.delete(i.key); return n })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', color: INK2, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}><SkipForward size={12} color={GRAY} /><span style={{ fontSize: 13, flex: 1 }}>{i.label}</span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY }}>skipped · tap to bring back</span></button>)}
            </div>
          )}
        </div>
      )
    }
    // 3 Morning Reflection
    if (cur.id === 'reflection') return (
      <div style={{ display: 'grid', gap: 14 }}>
        {reflectionLog ? (
          <div className="mp-step-r" style={{ padding: '22px 24px', borderRadius: 14, border: `1px solid ${BLUE}66`, background: `${BLUE}10` }}>
            <Label>Logged {fmtTime(reflectionLog.at)} · Morning Reflection strikes at the close</Label>
            <div style={{ ...READ, whiteSpace: 'pre-wrap', marginTop: 6 }}>{reflectionLog.note && reflectionLog.note !== 'Morning Reflection' ? reflectionLog.note : 'Reflection done.'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button onClick={() => toggleLog('devotional', 'devotional')} style={btn(INK2)}><RotateCcw size={11} /> Undo</button><button onClick={openDevotional} style={btn(INK2)}><ExternalLink size={11} /> Devotional page</button></div>
          </div>
        ) : (
          <Panel style={{ marginBottom: 0 }}>
            <Label>Before the day, the spring</Label>
            <textarea rows={5} value={reflection} onChange={e => setReflection(e.target.value)} placeholder="The reading, the line that stayed, what you are carrying into the day. A sentence is enough." style={{ width: '100%', boxSizing: 'border-box', ...READ, fontSize: 15.5, padding: '12px 14px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={logReflection} style={btn(BLUE, true)}><Check size={12} /> Log the reflection</button>
              <button onClick={openDevotional} style={btn(INK2)}><ExternalLink size={11} /> Open the Devotional page instead</button>
            </div>
          </Panel>
        )}
      </div>
    )
    // 4 Today's Digest
    if (cur.id === 'digest') return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div><Label>Yesterday</Label><div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 30, color: '#fff', lineHeight: 1.1 }}>{yday ? `${yday.miles} mi` : '…'}</div><div style={{ fontSize: 11, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>{yday?.badges?.length ? yday.badges.filter(b => b).slice(0, 6).join(' · ') : 'no badges'}</div></div>
          <div><Label>Today</Label><div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 30, color: '#fff', lineHeight: 1.1 }}>{events.filter(e => !e.is_all_day).length} meetings</div><div style={{ fontSize: 11, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>{firstMeeting ? `first at ${fmtTime(firstMeeting.start_at)} · ${firstMeeting.subject}` : 'open calendar'}</div></div>
          <div><Label>Stamina</Label><div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 30, color: '#fff', lineHeight: 1.1 }}>{L ? `${L.stamina.free}h` : '…'}</div><div style={{ fontSize: 11, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>free before 6 PM · {L ? `${L.stamina.meetingsLeft}h of meetings` : ''}</div></div>
          <div><Label>Follow-ups</Label><div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 30, color: followups.length ? GOLD : '#fff', lineHeight: 1.1 }}>{followups.length}</div><div style={{ fontSize: 11, color: GRAY, fontFamily: MONO, letterSpacing: '0.6px' }}>due or overdue · {queueCount} in the queue</div></div>
        </div>
        <Panel style={{ marginBottom: 0 }}>
          <Label>Lumen's read{read ? ` · ${fmtTime(read.at)}` : ''}</Label>
          <div style={{ ...READ, marginTop: 6, whiteSpace: 'pre-wrap' }}>{read ? read.body : 'Lumen has not spoken yet this morning. His read lands at 7:12.'}</div>
        </Panel>
        <div style={{ fontSize: 12.5, color: GRAY }}>Answer his questions below, typed or spoken. Your answers are what the Game Plan is built from.</div>
      </div>
    )
    // 5 Today's Game Plan
    if (cur.id === 'plan') {
      const blocks = [...(plan?.blocks || [])].sort((a, b) => String(a.start).localeCompare(String(b.start)))
      const covered = new Set(blocks.filter(b => b.ref?.type === 'event').map(b => b.ref.id))
      const extraMeetings = events.filter(e => !e.is_all_day && !covered.has(e.id)).map(e => ({ start: chiHHMM(e.start_at), end: chiHHMM(e.end_at), title: e.subject, kind: 'meeting', ref: { type: 'event', id: e.id }, fromCalendar: true }))
      const timeline = [...blocks, ...extraMeetings].sort((a, b) => String(a.start).localeCompare(String(b.start)))
      const KIND_C = { meeting: BLUE, work: GOLD, admin: INK2, travel: '#5FC9C0', break: GREEN }
      const isLoaded = (ref) => ref && board.some(b => b.id === ref.id) || (ref?.type === 'task' && board.some(b => b.id === ref.id))
      return (
        <div style={{ display: 'grid', gap: 16 }}>
          {plan === undefined && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY }}>Reading today's plan</div>}
          {planBusy && <div className="mp-blink" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GOLD }}><Sparkles size={11} style={{ verticalAlign: '-2px' }} /> Lumen is building the day from your answers, the calendar, and the queue…</div>}
          {plan === null && !planBusy && <Panel style={{ marginBottom: 0 }}><div style={{ fontSize: 13.5, color: INK2 }}>No plan yet.</div><button onClick={() => runPlan('build')} style={{ ...btn(GOLD, true), marginTop: 10 }}><Sparkles size={12} /> Build the plan</button></Panel>}
          {plan && (
            <>
              <div style={{ ...READ, fontSize: 15.5 }}>{plan.summary}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 14 }} className="mp-plan-grid">
                <Panel style={{ marginBottom: 0 }}>
                  <Label>Agenda · Chicago</Label>
                  {timeline.map((b, i) => (
                    <div key={`${b.start}-${i}`} style={{ display: 'grid', gridTemplateColumns: '86px 1fr auto', gap: 10, alignItems: 'start', padding: '7px 0', borderTop: i ? `1px solid ${PANEL_BORDER}` : 'none' }}>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: GRAY, letterSpacing: '0.4px', paddingTop: 2 }}>{b.start}{b.end ? `–${b.end}` : ''}</div>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, color: INK }}>{b.title}</div>{b.note && <div style={{ fontSize: 11.5, color: GRAY, marginTop: 2 }}>{b.note}</div>}</div>
                      <span style={{ ...S.chip('transparent', KIND_C[b.kind] || INK2), border: `1px solid ${(KIND_C[b.kind] || INK2)}55`, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px' }}>{b.kind}{b.fromCalendar ? ' · calendar' : ''}</span>
                    </div>
                  ))}
                  {!timeline.length && <div style={{ fontSize: 13, color: GRAY }}>Nothing on the agenda.</div>}
                </Panel>
                <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                  <Panel style={{ marginBottom: 0 }}>
                    <Label>Priorities · load onto the Board</Label>
                    {(plan.priorities || []).map(p => { const loaded = isLoaded(p.ref); return (
                      <div key={`${p.rank}-${p.title}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                        <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: GOLD, width: 18, flexShrink: 0 }}>{p.rank}</span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, color: INK }}>{p.title}</div><div style={{ fontSize: 11.5, color: GRAY, marginTop: 2 }}>{p.why}{p.block ? ` · at ${p.block}` : ''}{p.size ? ` · ${SIZES[p.size]?.label || p.size}` : ''}</div></div>
                        {p.ref && (loaded ? <span style={{ ...S.chip('transparent', GREEN), border: `1px solid ${GREEN}55`, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px' }}>loaded</span> : <button disabled={busy} onClick={() => loadRef(p.ref, p.title)} style={btn(GOLD)}>Load</button>)}
                      </div>) })}
                    {!(plan.priorities || []).length && <div style={{ fontSize: 13, color: GRAY }}>No priorities named.</div>}
                    <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY, marginTop: 8 }}>Board · {L ? `${L.slots.used}/${SLOTS} slots` : '…'}{(plan.parked || []).length ? ` · parked: ${plan.parked.join(', ')}` : ''}</div>
                  </Panel>
                  {(plan.watch || []).length > 0 && <Panel style={{ marginBottom: 0 }}><Label>Watch</Label>{plan.watch.map((w, i) => <div key={i} style={{ fontSize: 13, color: INK2, padding: '3px 0' }}>{w}</div>)}</Panel>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={adjust} onChange={e => setAdjust(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && adjust.trim()) runPlan('adjust', adjust.trim()) }} placeholder='Change it in words: "move the Highmark work to 3 PM", "drop Tim until Monday", "make NN2 prep the first priority". Enter applies.' disabled={planBusy} style={{ flex: 1, fontSize: 13.5, padding: '10px 12px', borderRadius: 10, border: `1px solid ${GOLD}55`, background: 'rgba(230,181,79,0.05)', color: INK }} />
                <button onClick={() => adjust.trim() && runPlan('adjust', adjust.trim())} disabled={planBusy || !adjust.trim()} style={btn(GOLD, true, { opacity: planBusy || !adjust.trim() ? 0.5 : 1 })}><RefreshCw size={12} /> Rewrite</button>
                <button onClick={() => runPlan('build')} disabled={planBusy} title="Start the plan over from the calendar and your answers" style={btn(INK2)}>Rebuild</button>
              </div>
            </>
          )}
          {followups.length > 0 && (
            <Panel style={{ marginBottom: 0 }}>
              <Label>Follow-ups due · {followups.length} of {queueCount} in the queue</Label>
              {followups.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${PANEL_BORDER}`, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}><div style={{ fontSize: 13.5, color: INK }}>{o.title}</div><div style={{ fontFamily: MONO, fontSize: 9.5, color: o.follow_up_date < day ? RED : GRAY, letterSpacing: '0.6px', marginTop: 2 }}>{o.follow_up_date < day ? `overdue since ${o.follow_up_date}` : 'due today'}</div></div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button onClick={() => todayFollow(o)} style={btn(GREEN)}>Today · load</button>
                    <button onClick={() => pushFollow(o, 1)} style={btn(INK2)}>+1d</button><button onClick={() => pushFollow(o, 3)} style={btn(INK2)}>+3d</button><button onClick={() => pushFollow(o, 7)} style={btn(INK2)}>+1w</button>
                    <button onClick={() => dropFollow(o)} style={btn(RED)}>Drop</button>
                  </div>
                </div>
              ))}
            </Panel>
          )}
        </div>
      )
    }
    // 6 Systems Check
    if (cur.id === 'systems') {
      const totalMin = SYSTEMS.reduce((s, x) => s + (workToGreen(x.key, lights) || 0), 0)
      return (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {SYSTEMS.map(sys => { const r = lightRule(sys.key, lights); const c = LEVEL[r.level]; const mins = workToGreen(sys.key, lights); const running = sysRunning(sys.slug); const s = sysSession(sys.slug); const todayMin = ((Number(s?.hours) || 0) * 60) + (running ? (now - new Date(s.started_at).getTime()) / 60000 : 0); return (
              <div key={sys.key} style={{ ...tile(running, running ? GREEN : c), cursor: 'default', borderColor: running ? GREEN : `${c}88`, minWidth: 0 }}>
                <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', fontSize: 13.5 }}><span className={r.blink ? 'mp-blink' : ''} style={{ width: 10, height: 10, borderRadius: 99, background: c, boxShadow: r.level === 'gray' ? 'none' : `0 0 0 3px ${c}33` }} />{sys.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{lights ? r.text : 'reading…'}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: mins === 0 ? GREEN : c, letterSpacing: '0.6px' }}>{mins == null ? 'no estimate' : mins === 0 ? 'green' : `about ${mins} min to green`}</span>
                {sysChoice === 'now' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {running ? <button onClick={() => sysStop(sys)} style={btn(GREEN, true)}><Square size={10} fill="#0A1B2B" /> Stop · {fmtClock(todayMin)}</button> : <button onClick={() => sysStart(sys)} style={btn(INK2)}><Play size={10} /> Start{todayMin > 0 ? ` · ${fmtClock(todayMin)} today` : ''}</button>}
                    {sys.key === 'slack' && <button onClick={markSlackClean} style={btn(GOLD)}><Check size={10} /> Mark clean</button>}
                  </div>
                )}
              </div>) })}
          </div>
          <Panel style={{ marginBottom: 0 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, color: '#fff' }}>Would you like to bring your lights to green now, or later?</div>
            <div style={{ fontSize: 12.5, color: GRAY, marginTop: 4 }}>{totalMin ? `About ${totalMin} minutes of tending in all.` : 'Everything is green.'} Timers here log to Harvest the same way the Console does; miles follow the usual rules (Clean Slack pays at the close).</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setSysChoice('now')} style={btn(GREEN, sysChoice === 'now')}><Play size={11} /> Now</button>
              <button onClick={() => { setSysChoice('later'); setReconcile(null) }} style={btn(INK2, sysChoice === 'later')}>Later</button>
            </div>
          </Panel>
          {sysChoice === 'now' && (
            <Panel style={{ marginBottom: 0 }}>
              <Label>When you are done</Label>
              <div style={{ fontSize: 13, color: INK2, lineHeight: 1.6 }}>Say so and Lumen checks whether anything that came in changed the shape of the day you planned.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => runPlan('reconcile')} disabled={planBusy} style={btn(GOLD, true, { opacity: planBusy ? 0.6 : 1 })}><RefreshCw size={12} /> {planBusy ? 'Reconciling…' : "I'm done · reconcile the day"}</button>
                {reconcile && <span style={{ ...READ, fontSize: 14 }}>{reconcile}</span>}
              </div>
            </Panel>
          )}
          {sysChoice === 'later' && <div style={{ fontSize: 13, color: GRAY }}>Noted. The lights stay on the Console; tend them when you have the window.</div>}
        </div>
      )
    }
    // 7 Launch
    const options = [...(lights && lightRule('email', lights).level !== 'green' ? [{ id: 'email', title: 'E-mail Refresh', sub: 'Recurring · Business Administration' }] : []), ...board.map(i => ({ id: i.id, title: i.title, sub: `${i.kind} · ${SIZES[i.size].label}` }))]
    const sel = first ?? board[0]?.id ?? null
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...READ, fontSize: 15 }}>{board.length} loaded in {L ? `${L.slots.used}/${SLOTS}` : '…'} slots · {logs.length} logged · protocol {fmtClock(elapsed)}{plan ? ' · plan set' : ''}. Pick the first clock and launch.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {options.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Nothing to equip. Launch stops the protocol timer and leaves the Board open.</div>}
          {options.map(o => <button key={o.id} onClick={() => setFirst(o.id)} style={tile(sel === o.id, GOLD)}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>{sel === o.id ? <Play size={13} color={GOLD} fill={GOLD} /> : <Play size={13} color={INK2} />}{o.title}</span><span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, letterSpacing: '0.6px' }}>{o.sub}</span></button>)}
        </div>
      </div>
    )
  }

  const stripPrompt = cur.id === 'digest' ? 'answer his questions here' : cur.id === 'plan' ? 'or talk the day through with him' : null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, overflowY: 'auto', background: 'linear-gradient(180deg, #0F2A40 0%, #0A1B2B 100%)' }}>
      <style>{`
        @keyframes mp-in-r { from { opacity: 0; transform: translateX(28px) } to { opacity: 1; transform: none } }
        @keyframes mp-in-l { from { opacity: 0; transform: translateX(-28px) } to { opacity: 1; transform: none } }
        @keyframes mp-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(248,199,97,0.55) } 50% { box-shadow: 0 0 0 9px rgba(248,199,97,0) } }
        @keyframes mp-blink { 0%,100% { opacity: 1 } 50% { opacity: .15 } }
        .mp-step-r { animation: mp-in-r .34s cubic-bezier(.2,.7,.2,1) both } .mp-step-l { animation: mp-in-l .34s cubic-bezier(.2,.7,.2,1) both }
        .mp-dot-now { animation: mp-pulse 1.6s ease-out infinite } .mp-blink { animation: mp-blink 1s ease-in-out infinite }
        @media (max-width: 900px) { .mp-plan-grid { grid-template-columns: 1fr !important } }
      `}</style>
      <div style={{ ...S.page, padding: '18px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
          <button onClick={onClose} style={btn(INK2)}><ArrowLeft size={13} /> Board</button>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GOLD }}>Morning Protocol · running {fmtClock(elapsed)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => { const done = i < step, nowS = i === step; const c = done ? GREEN : nowS ? GOLD_BRIGHT : 'rgba(255,255,255,0.18)'; return (
            <button key={s.id} onClick={() => go(i)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ height: 3, borderRadius: 2, background: c, transition: 'background .4s' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
                <span className={nowS ? 'mp-dot-now' : ''} style={{ width: 9, height: 9, borderRadius: 99, background: c, flex: '0 0 9px' }} />
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: done || nowS ? INK : GRAY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i + 1} · {s.title}</span>
              </div>
            </button>) })}
        </div>
        <div key={step} className={dir > 0 ? 'mp-step-r' : 'mp-step-l'}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.6px', textTransform: 'uppercase', color: BLUE }}>Step {step + 1} of {STEPS.length}</div>
          <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 32, color: '#fff', margin: '6px 0 2px', letterSpacing: '-0.01em' }}>{cur.title}</h2>
          <div style={{ fontSize: 13, color: GRAY, marginBottom: 22 }}>{cur.sub}</div>
          {content()}
        </div>
        {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: /^(Could not|Will not|Launch failed|Harvest|Timer stopped)/.test(msg) ? RED : GOLD, textTransform: 'uppercase', marginTop: 16 }}>{msg}</div>}
        <LumenStrip day={day} where={`Morning Protocol · step ${step + 1} ${cur.title}`} onReplied={loadAll} prompt={stripPrompt} />
        {trackIndex != null && <GatewayPlayer index={trackIndex} onIndex={setTrackIndex} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
          <button onClick={() => go(step - 1)} disabled={step === 0} style={btn(INK2, false, { opacity: step === 0 ? 0.35 : 1 })}><ArrowLeft size={13} /> Back</button>
          {step < STEPS.length - 1
            ? <button onClick={() => go(step + 1)} style={btn(GOLD_BRIGHT, true)}>Next <ArrowRight size={13} /></button>
            : <button onClick={launch} disabled={busy} style={btn(GOLD_BRIGHT, true)}><Rocket size={13} /> Launch</button>}
        </div>
      </div>
    </div>
  )
}

// ---- the Board row ----------------------------------------------------------
export default function ProtocolsPanel({ onChange, onNavigate }) {
  const day = chiToday()
  const [session, setSession] = useState(null)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('meeting_sessions').select('event_id,started_at,stopped_at,hours,harvest_logged').eq('event_id', eid(day)).limit(1)
    setSession(Array.isArray(data) && data[0] ? data[0] : null)
  }, [day])
  useEffect(() => { Promise.resolve().then(refresh) }, [refresh])

  const running = !!(session?.started_at && !session?.stopped_at)
  const done = !!(session?.stopped_at)
  const start = async () => {
    try {
      if (!running) {
        const { data } = await supabase.from('meeting_sessions').select('event_id,started_at,stopped_at').eq('day', day).like('event_id', 'adhoc:%').is('stopped_at', null).not('started_at', 'is', null)
        const other = (data || []).find(s => s.event_id !== eid(day) && !s.event_id.endsWith(':travel'))
        if (other) { setMsg(`${other.event_id.split(':').pop()} is running. Stop it first.`); return }
        await upsertSession({ event_id: eid(day), day, subject: 'Morning Protocol', started_at: new Date().toISOString(), stopped_at: null, hours: session?.hours || 0 })
        await refresh()
      }
      setOpen(true)
    } catch (e) { setMsg(`Could not start: ${e.message}`) }
  }
  const finished = async ({ minutes }) => { setOpen(false); setMsg(`Launched · protocol ${fmtClock(minutes)}`); await refresh(); onChange && onChange() }

  const liveMin = running ? (now - new Date(session.started_at).getTime()) / 60000 + (Number(session.hours) || 0) * 60 : (Number(session?.hours) || 0) * 60
  return (
    <InstrumentGroup label="Protocols" footer={groupMsg(msg, msg && msg.startsWith('Could not'))}>
      {open && <Protocol day={day} session={session} onClose={() => { setOpen(false); refresh() }} onFinished={finished} onChange={onChange} onNavigate={onNavigate} />}
      <Instrument label="Morning" sub={running ? 'tap to resume' : done ? `${fmtTime(session.stopped_at)} · ${fmtClock(liveMin)}` : (protocolLight('morning', now) ? { green: 'begin the day', gold: 'running late', red: 'overdue' }[protocolLight('morning', now).level] : 'from 5:00 AM')} icon={done ? <Check size={20} /> : <Sunrise size={20} />} running={running} clock={fmtClock(liveMin)} tone={done ? GREEN : GOLD} onClick={start} light={!done && !running ? protocolLight('morning', now) : null} />
      <Instrument label="Evening" sub={protocolLight('evening', now) ? { green: 'close the day', gold: 'running late', red: 'overdue' }[protocolLight('evening', now).level] : 'from 6:00 PM'} icon={<Moon size={20} />} tone={BLUE} disabled light={protocolLight('evening', now)} />
    </InstrumentGroup>
  )
}
