// Speeches (10/20): the talks David gives. v2 (David, after the APNC talk):
// cards collapsed to the key information, a quiet launch control that opens a
// launch modal, and the deck's PDF riding with the talk (open, download, mail
// as an Outlook draft with the attachment, drop a new version). The PDF is the
// newest PDF in Live Files tied to the talk's Side Mission (registry `mission`)
// or project. Registry: src/content/speeches.js. Decks: public/speeches/<slug>/.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Calendar, MapPin, Clock, Play, X as XIcon, ExternalLink, Download, Mail, FileText, Upload, Link2, Maximize2 } from 'lucide-react'
import { BLUE, Eyebrow, GOLD, GRAY, GREEN, SUCCESS, INK, INK2, LABEL, Label, MONO, MUTED, PANEL_BG, PANEL_BORDER, PURPLE, RED, S, Serif, TYPE, alpha, fmtDay } from './river/canon'
import { listLiveFiles, putLiveFile, openLiveFile, downloadLiveFile, draftMail, fmtStamp, fmtSize, extOf } from '../lib/livefiles'
import { SPEECHES, deckUrl, STATUS_LABEL } from '../content/speeches'

const STATUS_COLOR = { outline: GOLD, deck: PURPLE, delivered: SUCCESS }
const btn = (color, filled = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${filled ? color : `${alpha(color, 53)}`}`, background: filled ? `${alpha(color, 13)}` : 'transparent', color, textDecoration: 'none' })
const absDeck = (s) => `${window.location.origin}${deckUrl(s)}`

function useDeckReady(url) {
  const [ready, setReady] = useState(null)
  useEffect(() => {
    let on = true
    fetch(url, { method: 'HEAD', cache: 'no-store' }).then(r => { if (on) setReady(r.ok) }).catch(() => { if (on) setReady(false) })
    return () => { on = false }
  }, [url])
  return ready
}

// The newest PDF riding with a talk, from Live Files on its mission (or project).
function useDeckPdf(s) {
  const [pdf, setPdf] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let on = true
    const filter = s.mission ? { objectiveId: s.mission } : s.projectId ? { projectId: s.projectId } : null
    if (!filter) { Promise.resolve().then(() => { if (on) setPdf(null) }); return () => { on = false } }
    listLiveFiles(filter, { includeFiled: true }).then(r => { if (!on) return; const pdfs = (r.rows || []).filter(f => extOf(f.name) === 'pdf' && f.bucket !== 'link' && f.bucket !== 'request'); setPdf(pdfs[0] || null) }).catch(() => { if (on) setPdf(null) })
    return () => { on = false }
  }, [s.mission, s.projectId, tick])
  return [pdf, () => setTick(t => t + 1)]
}

function LaunchModal({ s, onClose }) {
  const url = absDeck(s)
  const [copied, setCopied] = useState(false)
  useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* no clipboard */ } }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,14,24,0.72)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '22px 24px 20px', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: TYPE.meta, letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, marginBottom: 6 }}>Launch</div>
            <Serif size={19} style={{ color: INK, lineHeight: 1.3 }}>{s.title}</Serif>
            <div style={{ fontSize: TYPE.meta + 1.5, color: MUTED, marginTop: 6 }}>{s.event} · {fmtDay(s.date)}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer', padding: 4 }}><XIcon size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          <a href={deckUrl(s)} target="_blank" rel="noreferrer" style={btn(PURPLE, true)}><ExternalLink size={12} /> Launch Deck</a>
          <a href={`${deckUrl(s)}#1`} target="_blank" rel="noreferrer" title="Opens the deck; press F in the deck for fullscreen" style={btn(PURPLE)}><Maximize2 size={12} /> Launch, Then F For Fullscreen</a>
          <button onClick={copy} style={btn(BLUE)}><Link2 size={12} /> {copied ? 'Copied' : 'Copy Link'}</button>
        </div>
        <div style={{ marginTop: 16, padding: '10px 12px', background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, fontFamily: MONO, fontSize: 10.5, color: MUTED, wordBreak: 'break-all' }}>{url}</div>
        <div style={{ fontSize: TYPE.meta + 1.5, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>Anyone with the link can view the deck. It is served as a public page beside the HUD, so the team does not need a HUD login. In the deck: arrows or space to advance, N for notes, F for fullscreen, P prints to PDF.</div>
      </div>
    </div>
  )
}

function PdfStrip({ s, pdf, refresh, say }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const canAttach = !!(s.mission || s.projectId)
  const upload = useCallback(async (file) => {
    if (!file) return
    if (extOf(file.name) !== 'pdf') { say('That is not a PDF. The deck PDF rides here; other files go to Live Files on the Board.'); return }
    setBusy(true); say(`Putting ${file.name} in play`)
    try { await putLiveFile(file, { objectiveId: s.mission || null, projectId: s.mission ? null : (s.projectId || null), note: `deck PDF, ${s.event}: ${s.title}`, source: 'david' }); say(`In play: ${file.name}`); refresh() }
    catch (e) { say(`Could not put it in play: ${e?.message || String(e)}`) }
    finally { setBusy(false) }
  }, [s, say, refresh])
  const act = async (fn, done) => { try { await fn(); if (done) say(done) } catch (e) { say(`Could not: ${e?.message || String(e)}`) } }
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); upload(e.dataTransfer?.files?.[0]) }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12, padding: '10px 12px', borderRadius: 10, border: `1px ${drag ? 'solid' : 'dashed'} ${drag ? BLUE : PANEL_BORDER}`, background: drag ? `${alpha(BLUE, 8)}` : 'rgba(255,255,255,0.02)' }}>
      <FileText size={16} color={pdf ? GOLD : GRAY} />
      {pdf ? (
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: TYPE.body, color: INK }}>{pdf.name}{pdf.version > 1 ? <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD, marginLeft: 8 }}>v{pdf.version}</span> : null}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: MUTED, marginTop: 2 }}>{fmtStamp(pdf.created_at)}{pdf.size ? ` · ${fmtSize(pdf.size)}` : ''} · The deck PDF, riding with this talk</div>
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 220, fontSize: TYPE.body, color: canAttach ? INK2 : GRAY }}>{canAttach ? 'No PDF riding with this talk yet. Drop one here, or click Attach.' : 'Tie this talk to a mission in the registry to let a PDF ride with it.'}</div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {pdf && <button onClick={() => act(async () => { window.open(await openLiveFile(pdf), '_blank', 'noopener') })} style={btn(INK2)}><ExternalLink size={11} /> Open</button>}
        {pdf && <button onClick={() => act(async () => { const u = await downloadLiveFile(pdf); const a = document.createElement('a'); a.href = u; a.download = pdf.name; document.body.appendChild(a); a.click(); a.remove() }, `Downloading ${pdf.name}`)} style={btn(GREEN)}><Download size={11} /> Download</button>}
        {pdf && <button onClick={() => act(async () => { say(`Drafting in Outlook: ${pdf.name}`); const d = await draftMail(pdf); if (d.webLink) window.open(d.webLink, '_blank', 'noopener') }, `Draft open in Outlook with ${pdf.name} attached`)} style={btn(BLUE)}><Mail size={11} /> Mail</button>}
        {canAttach && <button onClick={() => inputRef.current?.click()} disabled={busy} style={{ ...btn(GOLD), opacity: busy ? 0.5 : 1 }}><Upload size={11} /> {pdf ? 'New Version' : 'Attach'}</button>}
        <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
      </div>
    </div>
  )
}

function SpeechCard({ s, say }) {
  const url = deckUrl(s)
  const ready = useDeckReady(url)
  const [brief, setBrief] = useState(false)
  const [launch, setLaunch] = useState(false)
  const [pdf, refresh] = useDeckPdf(s)
  const status = ready && s.status === 'outline' ? 'deck' : s.status
  const color = STATUS_COLOR[status] || GRAY
  return (
    <div style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ fontFamily: MONO, fontSize: TYPE.meta, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>{STATUS_LABEL[status]}{s.delivered ? ` · ${fmtDay(s.delivered)}` : ''}</span>
          </div>
          <Serif size={18} style={{ color: INK, lineHeight: 1.3 }}>{s.title}</Serif>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 7, fontSize: TYPE.meta + 2, color: MUTED }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mic size={12} color={LABEL} />{s.event}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Calendar size={12} color={LABEL} />{fmtDay(s.date)}</span>
            {s.time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={12} color={LABEL} />{s.time}</span>}
            {s.venue && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={12} color={LABEL} />{s.venue}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setBrief(b => !b)} style={btn(INK2)}>{brief ? 'Hide Brief' : 'Brief'}</button>
          {ready ? (
            <button onClick={() => setLaunch(true)} title="Launch the deck" style={{ ...btn(PURPLE), padding: '7px 10px' }}><Play size={12} /> Launch</button>
          ) : (
            <span title={`The deck lands at ${url} when a Code session builds and pushes it`} style={{ ...btn(GRAY), cursor: 'default' }}>{ready === null ? 'Checking' : 'No Deck Yet'}</span>
          )}
        </div>
      </div>
      <PdfStrip s={s} pdf={pdf} refresh={refresh} say={say} />
      {brief && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}`, display: 'grid', gap: 16 }}>
          <div><Label>Session Description</Label><div style={{ fontSize: TYPE.body, lineHeight: 1.65, color: INK2, maxWidth: 820 }}>{s.description}</div></div>
          <div><Label>Learning Objectives</Label><ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, maxWidth: 820 }}>{s.objectives.map((o, i) => <li key={i} style={{ fontSize: TYPE.body, lineHeight: 1.6, color: INK2 }}>{o}</li>)}</ol></div>
          <div style={{ fontFamily: MONO, fontSize: TYPE.meta, color: MUTED }}>{url}{s.mission ? ` · mission ${s.mission.slice(0, 8)}` : ''}{s.project ? ` · ${s.project}` : ''}</div>
        </div>
      )}
      {launch && <LaunchModal s={s} onClose={() => setLaunch(false)} />}
    </div>
  )
}

export default function SpeechesPage() {
  const [msg, setMsg] = useState(null)
  const say = useCallback((m) => { setMsg(m); if (m) setTimeout(() => setMsg(cur => cur === m ? null : cur), 6000) }, [])
  const sorted = [...SPEECHES].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <div style={S.page}>
      <Eyebrow>MONITOR · SPEECHES</Eyebrow>
      <h1 style={S.h1}>Speeches</h1>
      <p style={S.sub}>the talks, each with its deck and the PDF that rides with it</p>
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD, margin: '12px 0 0' }}>{msg}</div>}
      <div style={{ marginTop: 20 }}>
        {sorted.map(s => <SpeechCard key={s.slug} s={s} say={say} />)}
        {!sorted.length && <div style={{ color: GRAY, fontSize: TYPE.body }}>No speeches yet.</div>}
      </div>
    </div>
  )
}
