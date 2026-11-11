// Lumen on the card (David 11/4): "let's just build the same thing from scratch.
// call it lumen, use the hud's canon. i want the base functionality, particularly
// the ability to do a workbook to be the same. and arms and legs to wire up and
// change the card in real time and/or do some development work inside the
// workbench that can be ported later."
//
// A panel that slides in from the right of any Main Mission, Side Mission or
// Milestone card. Three tabs: Lumen (the same brain as WhatsApp and the HUD
// strip, framed on this card, with his tools as hands), Workbook (captures of
// his answers and of the card, notes, a PDF in the house frame), Build (pages
// Lumen built with build_page, previewed live, portable later by a session).
//
// Hand To Claude Code (David 11/10): under each of Lumen's replies. When Lumen names a hand
// he lacks, David presses it, the reply and the question before it go to a queue a Claude
// Code session reads, and the session's answer comes back into this thread as its own
// message. Labels here are in the body face at 12 px, Title Case (the small tracked
// uppercase label is blacklisted, 11/9).
//
// Lumen notices (David 11/11: "when i do something like that the lumen chat window should be
// able to notice and ask a question (push)"). When David closes a stop on the card's path, the
// Briefing fires a card event (lib/path); this panel sends it to Lumen as what happened, and
// his one question rises from the corner above the Lumen button. Reply opens the panel.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, X as XIcon, BookOpen, Hammer, ExternalLink, Download, Trash2, FileText, Printer, Plus, Wrench, Check } from 'lucide-react'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, RED, SERIF, LABEL, SUCCESS, alpha } from './canon'
import { readWorkbook, writeWorkbook, listBuilds, buildUrl, readBuildHtml, removeBuild, loadThread, askLumen, fireLedgerChanged, handToClaudeCode, listHandoffs } from '../../lib/lumenPanel'
import { hudConfirm } from '../../lib/dialog'
import { CARD_EVENT } from '../../lib/path'

// The panel's width: 460px on a wide window, less on a narrow one, so the page always keeps room beside it.
const WIDTH = 460
const panelWidth = () => Math.min(WIDTH, Math.max(320, Math.round(window.innerWidth * 0.42)))
const btn = (color = INK2, filled = false, extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 8, border: `1px solid ${filled ? color : alpha(color, 40)}`, background: filled ? color : 'transparent', color: filled ? 'var(--hud-on-accent)' : color, cursor: 'pointer', whiteSpace: 'nowrap', ...extra })
const eyebrow = { fontSize: 12, fontWeight: 500, color: LABEL }
const field = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '9px 11px', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5, resize: 'none' }
const stamp = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''
const SUGGEST = ['Where does this stand?', 'What should I do next on this?', 'Draft a plan for this onto a Workbench tab', 'Build me a one-page mock-up for this']
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The Workbook as paper: the house frame (Lora and Instrument Sans, navy ink on
// white, one gold hairline), printed from a new window.
function printWorkbook({ title, captures, notes }) {
  const w = window.open('', '_blank', 'width=900,height=1100')
  if (!w) return
  const kick = (c) => c.kind === 'answer' ? 'From Lumen' : c.kind === 'card' ? 'The card' : 'Note'
  const caps = captures.map(c => `<section class="cap"><div class="kick">${esc(kick(c))} · ${esc(c.at ? new Date(c.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')}</div><h2>${esc(c.title)}</h2><p>${esc(c.body).replace(/\n/g, '<br/>')}</p></section>`).join('')
  const nt = String(notes || '').trim() ? `<section class="cap"><div class="kick">Notes</div><p>${esc(notes).replace(/\n/g, '<br/>')}</p></section>` : ''
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Workbook · ${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { size: letter; margin: 0.7in 0.75in; }
    body { font-family: 'Lora', Georgia, serif; color: #0F2334; margin: 0; }
    .head { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #0F2334; padding-bottom: 10px; }
    .brand, .kick, .sub, .foot { font-family: 'Instrument Sans', Arial, sans-serif; }
    .brand { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #3f5f8a; }
    h1 { font-size: 26px; font-weight: 500; letter-spacing: -0.008em; margin: 26px 0 4px; line-height: 1.15; }
    h1 em { font-style: italic; color: #3f6fa8; }
    .sub { font-size: 11px; color: #5a6b7d; margin-bottom: 26px; }
    .rule { height: 2px; width: 48px; background: #F8C761; margin: 0 0 26px; }
    .cap { border-top: 1px solid #d8dde3; padding: 14px 0 4px; break-inside: avoid; }
    .kick { font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: #3f6fa8; margin-bottom: 6px; }
    h2 { font-size: 15px; font-weight: 500; margin: 0 0 6px; }
    p { font-size: 13px; line-height: 1.6; margin: 0 0 10px; }
    .foot { margin-top: 40px; border-top: 1px solid #d8dde3; padding-top: 10px; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #5a6b7d; }
  </style></head><body>
    <div class="head"><span class="brand">Third Horizon · Sovereign Architect</span><span class="brand">Workbook</span></div>
    <h1>Workbook, <em>${esc(title)}</em></h1>
    <div class="sub">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${captures.length} capture${captures.length === 1 ? '' : 's'}</div>
    <div class="rule"></div>
    ${caps || '<p>No captures yet.</p>'}${nt}
    <div class="foot">Not for distribution · Confidential · Third Horizon</div>
  </body></html>`)
  w.document.close(); w.focus(); setTimeout(() => w.print(), 400)
}

// The Ledger's doors, as one object, so dev/lumen.html can run the panel on sample data with no sign-in.
const LEDGER = { loadThread, listHandoffs, handToClaudeCode, askLumen, readWorkbook, listBuilds }

export default function LumenPanel({ item, api = LEDGER }) {
  // item: { kind: 'objective' | 'project', id, title, root, summary? }
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('lumen')
  const [thread, setThread] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [wb, setWb] = useState(null)
  const [builds, setBuilds] = useState(null)
  const [sel, setSel] = useState(null)
  const [html, setHtml] = useState(null)
  const [msg, setMsg] = useState(null)
  const [handed, setHanded] = useState({})   // message id -> { status, at } of its hand-off to Claude Code
  const [push, setPush] = useState(null)     // { state: 'waiting' | 'asked', text }: Lumen noticing a stop closed on the card
  const scrollRef = useRef(null)
  const saveTimer = useRef(null)
  const where = `Lumen panel · ${String(item.title || '').slice(0, 60)}`

  const loadAll = useCallback(async () => {
    const [t, w, b, h] = await Promise.all([api.loadThread(item.id).catch(() => []), api.readWorkbook(item.root), api.listBuilds(item.root).catch(() => []), api.listHandoffs({ kind: item.kind, id: item.id }).catch(() => [])])
    setThread(t); setWb(w); setBuilds(b)
    setHanded(Object.fromEntries(h.filter(x => x.message_id != null).map(x => [String(x.message_id), { status: x.status, at: x.at }])))
  }, [api, item.id, item.kind, item.root])
  useEffect(() => { if (open) loadAll().catch(e => setMsg(`Could not read: ${e.message}`)) }, [open, loadAll])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [thread, pending, open, tab])
  // A stop was closed on this card: tell Lumen what happened and show his question in the corner.
  useEffect(() => {
    const onEvent = async (e) => {
      const d = e.detail || {}
      if (!d.event || d.item?.id !== item.id) return
      setPush({ state: 'waiting' })
      try {
        const reply = await api.askLumen({ where: `Lumen panel · ${String(item.title || '').slice(0, 60)}`, item: { kind: item.kind, id: item.id }, event: d.event })
        setPush(reply ? { state: 'asked', text: reply } : null)
        const t = await api.loadThread(item.id).catch(() => null)
        if (t) setThread(t)
        fireLedgerChanged({ kind: item.kind, id: item.id })
      } catch { setPush(null) }
    }
    window.addEventListener(CARD_EVENT, onEvent)
    return () => window.removeEventListener(CARD_EVENT, onEvent)
  }, [api, item.id, item.kind, item.title])
  // Push-aside, always (David 11/4: "it should move the rest of the page in a bit instead of
  // overlapping it"): the HUD's scroll container takes a right padding the panel's width.
  useEffect(() => {
    if (!open) return
    const app = document.querySelector('.sa-app')
    // --lumen-aside on the root: the item card's own overlay (position fixed) reads it as its right edge; the mission page reads --lumen-w through .lumen-open.
    const apply = () => { const pw = panelWidth(); document.documentElement.style.setProperty('--lumen-w', `${pw}px`); document.documentElement.style.setProperty('--lumen-aside', `${pw}px`); app?.style.setProperty('--lumen-w', `${pw}px`) }
    apply(); app?.classList.add('lumen-open')
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setPush(null) } }
    window.addEventListener('keydown', onKey); window.addEventListener('resize', apply)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', apply); app?.classList.remove('lumen-open'); document.documentElement.style.setProperty('--lumen-aside', '0px') }
  }, [open])

  const send = async (text) => {
    const q = String(text || '').trim()
    if (!q || pending) return
    setInput(''); setPending(true); setMsg(null)
    const now = new Date().toISOString()
    setThread(t => [...t, { id: `tmp-${now}`, at: now, direction: 'in', kind: 'text', body: q }])
    try {
      const reply = await api.askLumen({ text: q, where, item })
      setThread(t => [...t, { id: `tmp-r-${now}`, at: new Date().toISOString(), direction: 'out', kind: 'text', body: reply }])
      fireLedgerChanged({ kind: item.kind, id: item.id })
      const [t, b] = await Promise.all([api.loadThread(item.id).catch(() => null), api.listBuilds(item.root).catch(() => null)])
      if (t) setThread(t)
      if (b) { setBuilds(b); if (b.length && (!sel || !b.find(x => x.slug === sel))) { /* keep the pick */ } }
    } catch (e) {
      setThread(t => [...t, { id: `tmp-e-${now}`, at: new Date().toISOString(), direction: 'out', kind: 'text', body: `I could not reach the Ledger just now: ${e.message}` }])
    } finally { setPending(false) }
  }

  const saveWb = (next) => {
    setWb(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { writeWorkbook(item.root, next).catch(e => setMsg(`Could not save the workbook: ${e.message}`)) }, 700)
  }
  const capture = (c) => saveWb({ ...(wb || { captures: [], notes: '' }), captures: [...(wb?.captures || []), { id: Math.random().toString(36).slice(2, 9), at: new Date().toISOString(), ...c }] })
  const dropCapture = (id) => saveWb({ ...wb, captures: wb.captures.filter(c => c.id !== id) })
  const captureCard = () => capture({ kind: 'card', title: item.title, body: item.summary || '(no Polaris or back story on the card yet)' })
  const questionBefore = (i) => { for (let k = i - 1; k >= 0; k--) if (thread[k].direction === 'in') return thread[k].body; return '' }
  const handOff = async (m, i) => {
    const key = String(m.id)
    if (handed[key] || key.startsWith('tmp-')) return
    setHanded(h => ({ ...h, [key]: { status: 'sending', at: new Date().toISOString() } }))
    try {
      const out = await api.handToClaudeCode({ item, message_id: m.id, ask: questionBefore(i), gap: m.body })
      setHanded(h => ({ ...h, [key]: { status: 'open', at: out.at } }))
      setMsg('Handed to Claude Code. The answer will land in this thread.')
    } catch (e) {
      setHanded(h => { const n = { ...h }; delete n[key]; return n })
      setMsg(`Could not hand it over: ${e.message}`)
    }
  }

  const openBuild = async (b) => {
    setSel(b.slug); setHtml(null)
    try { setHtml(await readBuildHtml(item.root, b.slug)) } catch (e) { setMsg(`Could not read the build: ${e.message}`) }
  }
  const downloadBuild = () => { if (!html || !sel) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `${sel}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }
  const nCaps = wb?.captures?.length || 0, nBuilds = builds?.length || 0

  const tabStyle = (id) => ({ ...btn(tab === id ? BLUE : INK2, tab === id), padding: '6px 11px', borderRadius: 999 })

  return (
    <>
      {!open && (
        <button onClick={() => { setOpen(true); setTab('lumen'); setPush(null) }} aria-label="Open Lumen" title="Lumen, on this card" style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 200, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px 10px 13px', borderRadius: 999, border: `1px solid ${alpha(GOLD_BRIGHT, 55)}`, background: 'var(--hud-surface-raised)', color: INK, fontFamily: SERIF, fontSize: 15, cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
          <Sparkles size={15} color={GOLD_BRIGHT} /> Lumen
          {push && <span className={`lumen-dot${push.state === 'waiting' ? ' wait' : ''}`} title={push.state === 'waiting' ? 'Lumen noticed' : 'Lumen asked something'} />}
        </button>
      )}
      {!open && push?.state === 'asked' && (
        <div className="lumen-push" role="status">
          <div className="who">Lumen Noticed<button onClick={() => setPush(null)} aria-label="Dismiss" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: INK2, cursor: 'pointer', padding: 2, display: 'inline-flex' }}><XIcon size={13} /></button></div>
          <div className="q">{push.text}</div>
          <div className="acts"><button onClick={() => { setOpen(true); setTab('lumen'); setPush(null) }} style={btn(BLUE, true)}>Reply</button><button onClick={() => setPush(null)} style={btn(INK2)}>Not Now</button></div>
        </div>
      )}
      <aside aria-label="Lumen" aria-hidden={!open} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 210, width: 'var(--lumen-w, 460px)', transform: open ? 'translateX(0)' : 'translateX(104%)', transition: 'transform 220ms ease', background: 'var(--hud-surface-raised)', borderLeft: `1px solid ${PANEL_BORDER}`, boxShadow: open ? '-18px 0 40px rgba(0,0,0,0.35)' : 'none', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', overscrollBehavior: 'contain' }}>
        <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${PANEL_BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${alpha(GOLD_BRIGHT, 50)}`, background: alpha(GOLD_BRIGHT, 10), flexShrink: 0 }}><Sparkles size={16} color={GOLD_BRIGHT} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: INK, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Lumen</div>
              <div style={{ ...eyebrow, marginTop: 4 }}>On This Card</div>
              <div style={{ fontSize: 12.5, color: INK2, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>{item.title}</div>
            </div>
            <button onClick={() => { setOpen(false); setPush(null) }} aria-label="Close Lumen" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XIcon size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setTab('lumen')} style={tabStyle('lumen')}><Sparkles size={11} /> Lumen</button>
            <button onClick={() => setTab('workbook')} style={tabStyle('workbook')}><BookOpen size={11} /> Workbook{nCaps ? ` · ${nCaps}` : ''}</button>
            <button onClick={() => setTab('build')} style={tabStyle('build')}><Hammer size={11} /> Build{nBuilds ? ` · ${nBuilds}` : ''}</button>
          </div>
        </div>

        {tab === 'lumen' && (
          <>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 18px', minHeight: 0 }}>
              {thread.length === 0 && !pending && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 13, color: INK2, lineHeight: 1.55 }}>Same Lumen as WhatsApp and the strip, framed on this card. He can move its milestones, file to it, write tabs on its Workbench and build pages for it.</div>
                  {SUGGEST.map(q => <button key={q} onClick={() => send(q)} style={{ textAlign: 'left', fontFamily: 'inherit', fontSize: 13, color: INK, background: 'rgba(255,255,255,0.04)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: '9px 12px', cursor: 'pointer' }}>{q}</button>)}
                </div>
              )}
              {thread.map((m, i) => {
                const mine = m.direction === 'in', code = m.meta?.from === 'claude-code'
                const h = handed[String(m.id)]
                return (
                  <div key={m.id} style={{ fontSize: 13.5, lineHeight: 1.65, color: mine ? INK2 : INK, paddingLeft: mine ? 0 : 12, borderLeft: mine ? 'none' : `2px solid ${alpha(code ? SUCCESS : BLUE, code ? 60 : 40)}`, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: GRAY, marginBottom: 2 }}>{mine ? 'You' : code ? 'Claude Code' : 'Lumen'} · {stamp(m.at)}</div>
                    {code ? String(m.body || '').replace(/^Claude Code:\s*/, '') : m.body}
                    {!mine && !code && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => { capture({ kind: 'answer', title: questionBefore(i) || 'From Lumen', body: m.body }); setMsg('In the Workbook') }} style={btn(INK2)}><Plus size={11} /> Workbook</button>
                        {h
                          ? <span title={h.status === 'answered' ? 'Claude Code answered in this thread' : 'Waiting for a Claude Code session to pick it up'} style={{ ...btn(h.status === 'answered' ? SUCCESS : LABEL), cursor: 'default' }}><Check size={11} /> {h.status === 'answered' ? 'Answered By Claude Code' : h.status === 'dropped' ? 'Closed By Claude Code' : h.status === 'sending' ? 'Handing Over' : h.status === 'taken' ? 'Claude Code Has It' : 'Handed To Claude Code'}</span>
                          : !String(m.id).startsWith('tmp-') && <button onClick={() => handOff(m, i)} title="Send this reply, and your question before it, to a Claude Code session to build what is missing" style={btn(INK2)}><Wrench size={11} /> Hand To Claude Code</button>}
                      </div>
                    )}
                  </div>
                )
              })}
              {pending && <div style={{ ...eyebrow, padding: '6px 0' }}>Lumen is reading the card</div>}
            </div>
            <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${PANEL_BORDER}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea rows={2} value={input} placeholder="Say it to Lumen (Enter sends, Shift+Enter for a new line)" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }} style={{ ...field, flex: 1 }} />
              <button onClick={() => send(input)} disabled={pending || !input.trim()} style={{ ...btn(GOLD_BRIGHT, true), padding: '10px 14px', opacity: pending || !input.trim() ? 0.5 : 1 }}>Send</button>
            </div>
          </>
        )}

        {tab === 'workbook' && (
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 18px 18px', minHeight: 0 }}>
            <div style={{ fontSize: 13, color: INK2, lineHeight: 1.55 }}>Collect what matters on this card: Lumen's answers (the Workbook button under each), the card itself, and your notes. Print it as a PDF in the house frame.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button onClick={captureCard} style={btn(INK2)}><FileText size={11} /> Capture The Card</button>
              <button onClick={() => wb && printWorkbook({ title: item.title, captures: wb.captures, notes: wb.notes })} disabled={!wb} style={btn(GOLD_BRIGHT, true)}><Printer size={11} /> PDF</button>
              {nCaps > 0 && <button onClick={async () => { if (await hudConfirm('Clear every capture in this Workbook?')) saveWb({ ...wb, captures: [] }) }} style={btn(INK2)}><Trash2 size={11} /> Clear</button>}
            </div>
            <div style={{ ...eyebrow, marginTop: 18 }}>Captures{nCaps ? ` · ${nCaps}` : ''}</div>
            {!nCaps && <div style={{ fontSize: 12.5, color: GRAY, marginTop: 6 }}>Nothing captured yet.</div>}
            {(wb?.captures || []).map(c => (
              <div key={c.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={eyebrow}>{c.kind === 'answer' ? 'From Lumen' : c.kind === 'card' ? 'The Card' : 'Note'} · {stamp(c.at)}</span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => dropCapture(c.id)} title="Remove" style={{ ...btn(INK2), padding: '3px 7px' }}><XIcon size={10} /></button>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, marginTop: 4 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: INK2, lineHeight: 1.55, marginTop: 3, whiteSpace: 'pre-wrap' }}>{c.body}</div>
              </div>
            ))}
            <div style={{ ...eyebrow, marginTop: 18, marginBottom: 6 }}>Notes</div>
            <textarea rows={7} value={wb?.notes || ''} placeholder="Your own words on this card. Autosaves." onChange={e => saveWb({ ...(wb || { captures: [] }), notes: e.target.value })} style={field} />
          </div>
        )}

        {tab === 'build' && (
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 18px 18px', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: INK2, lineHeight: 1.55 }}>Pages Lumen built for this card: a mock-up, a tool, a one-page view. Ask him on the Lumen tab ("build me a…"); each lands here and on the Workbench, and a Claude session can port it into a real app later.</div>
            {builds && builds.length === 0 && <div style={{ fontSize: 12.5, color: GRAY }}>Nothing built yet.</div>}
            <div style={{ display: 'grid', gap: 6 }}>
              {(builds || []).map(b => (
                <div key={b.slug} onClick={() => openBuild(b)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 10, border: `1px solid ${sel === b.slug ? alpha(BLUE, 60) : PANEL_BORDER}`, background: sel === b.slug ? alpha(BLUE, 8) : 'rgba(255,255,255,0.03)', cursor: 'pointer', minWidth: 0 }}>
                  <Hammer size={13} color={LABEL} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: INK, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title || b.slug}</span>
                    {b.note && <span style={{ fontSize: 12, color: INK2, display: 'block' }}>{b.note}</span>}
                    <span style={{ fontSize: 12, color: GRAY }}>v{b.version || 1} · {stamp(b.updated_at)}</span>
                  </span>
                </div>
              ))}
            </div>
            {sel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 320 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={async () => window.open(await buildUrl(item.root, sel), '_blank', 'noopener')} style={btn(INK2)}><ExternalLink size={11} /> Open</button>
                  <button onClick={downloadBuild} disabled={!html} style={btn(INK2)}><Download size={11} /> Download</button>
                  <button onClick={async () => { if (await hudConfirm(`Delete the build "${sel}"?`)) { await removeBuild(item.root, sel); setSel(null); setHtml(null); setBuilds(await api.listBuilds(item.root)) } }} style={btn(INK2)}><Trash2 size={11} /> Delete</button>
                </div>
                {html ? <iframe title={sel} sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={html} style={{ flex: 1, width: '100%', minHeight: 320, border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, background: '#0F2334' }} /> : <div style={eyebrow}>Reading the build</div>}
              </div>
            )}
          </div>
        )}
        {msg && <div style={{ ...eyebrow, color: msg.startsWith('Could') ? RED : GOLD, padding: '6px 18px 10px' }}>{msg}</div>}
      </aside>
    </>
  )
}
