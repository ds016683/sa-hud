// Speeches (10/20): the talks David gives. Each card carries the event, the
// verbatim session description and learning objectives, and launches the deck
// (a self-contained HTML mini-app served from /speeches/<slug>/). The registry
// is src/content/speeches.js; a Code session with the apnc-deck skill builds
// the deck folder and pushes it, and the status here moves to deck.
import { useEffect, useState } from 'react'
import { Mic, ExternalLink, Calendar, MapPin, Clock } from 'lucide-react'
import { S, Eyebrow, Serif, Label, SubLabel, INK, INK2, GRAY, GOLD, GREEN, PURPLE, MONO, PANEL_BORDER, PANEL_BG, LABEL, MUTED, TYPE, fmtDay } from './river/canon'
import { SPEECHES, deckUrl, STATUS_LABEL } from '../content/speeches'

const STATUS_COLOR = { outline: GOLD, deck: PURPLE, delivered: GREEN }

function useDeckReady(url) {
  // The deck exists once its folder is deployed; a HEAD probe says so.
  const [ready, setReady] = useState(null)
  useEffect(() => {
    let on = true
    fetch(url, { method: 'HEAD', cache: 'no-store' }).then(r => { if (on) setReady(r.ok && !/text\/html/.test(r.headers.get('content-type') || '') ? false : r.ok) }).catch(() => { if (on) setReady(false) })
    return () => { on = false }
  }, [url])
  return ready
}

function SpeechCard({ s, open, onToggle }) {
  const url = deckUrl(s)
  const ready = useDeckReady(url)
  const status = ready && s.status === 'outline' ? 'deck' : s.status
  const color = STATUS_COLOR[status] || GRAY
  return (
    <div style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: TYPE.meta, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>{STATUS_LABEL[status]}</span>
            <span style={{ fontFamily: MONO, fontSize: TYPE.meta, letterSpacing: '0.08em', textTransform: 'uppercase', color: LABEL }}>{s.skin}</span>
          </div>
          <Serif size={20} style={{ color: INK, lineHeight: 1.3 }}>{s.title}</Serif>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10, fontSize: TYPE.body, color: MUTED }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mic size={13} color={LABEL} />{s.event}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calendar size={13} color={LABEL} />{fmtDay(s.date)}</span>
            {s.time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={13} color={LABEL} />{s.time}</span>}
            {s.venue && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={13} color={LABEL} />{s.venue}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onToggle} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.03)', color: INK }}>{open ? 'Hide Brief' : 'Session Brief'}</button>
          {ready ? (
            <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 999, border: `1px solid ${PURPLE}`, background: 'rgba(180,163,232,0.14)', color: PURPLE, textDecoration: 'none' }}><ExternalLink size={12} />Launch Deck</a>
          ) : (
            <span title={`The deck lands at ${url} when a Code session builds and pushes it`} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 999, border: `1px solid ${PANEL_BORDER}`, color: GRAY }}>{ready === null ? 'Checking Deck' : 'Deck Not Built'}</span>
          )}
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${PANEL_BORDER}`, display: 'grid', gap: 18 }}>
          <div>
            <Label>Session Description</Label>
            <div style={{ fontSize: TYPE.body, lineHeight: 1.65, color: INK2, maxWidth: 820 }}>{s.description}</div>
          </div>
          <div>
            <Label>Learning Objectives</Label>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, maxWidth: 820 }}>
              {s.objectives.map((o, i) => <li key={i} style={{ fontSize: TYPE.body, lineHeight: 1.6, color: INK2 }}>{o}</li>)}
            </ol>
          </div>
          <div>
            <SubLabel>Deck</SubLabel>
            <div style={{ fontSize: TYPE.meta + 1, color: MUTED, fontFamily: MONO }}>{url}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SpeechesPage() {
  const [open, setOpen] = useState(() => SPEECHES[0]?.slug || null)
  const sorted = [...SPEECHES].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <div style={S.page}>
      <Eyebrow>MONITOR · SPEECHES</Eyebrow>
      <h1 style={S.h1}>Speeches</h1>
      <p style={S.sub}>the talks, each with its session brief and its deck</p>
      <div style={{ marginTop: 22 }}>
        {sorted.map(s => <SpeechCard key={s.slug} s={s} open={open === s.slug} onToggle={() => setOpen(open === s.slug ? null : s.slug)} />)}
        {!sorted.length && <div style={{ color: GRAY, fontSize: TYPE.body }}>No speeches yet.</div>}
      </div>
    </div>
  )
}
