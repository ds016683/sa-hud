// Writings (10/22): the pieces David writes. Collapsed cards, one per piece,
// each opening to the text rendered from its Markdown file under
// public/writings/<slug>/. Registry: src/content/writings.js. Drafts are
// filed here; no editing, mailing or publishing from this page yet.
import { useEffect, useState } from 'react'
import { PenLine, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { S, Eyebrow, Serif, INK, INK2, GRAY, GOLD, GREEN, PURPLE, MONO, PANEL_BORDER, PANEL_BG, LABEL, MUTED, TYPE, fmtDay } from './river/canon'
import { WRITINGS, writingUrl, STATUS_LABEL } from '../content/writings'

const STATUS_COLOR = { draft: GOLD, final: PURPLE, published: GREEN }
const btn = (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${color}88`, background: 'transparent', color, textDecoration: 'none' })

// Inline emphasis only: *italic* and **bold**. Everything else is plain text.
function inline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)
  return parts.map((p, i) => {
    if (p.startsWith('**')) return <strong key={i} style={{ color: INK, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
    return p
  })
}

// A small Markdown reader for prose: title line (skipped, the card carries it),
// h2 sections, paragraphs. No lists or code; the writings are essays.
function Prose({ md }) {
  const blocks = md.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  return (
    <div style={{ maxWidth: 720 }}>
      {blocks.map((b, i) => {
        if (b.startsWith('# ')) return null
        if (b.startsWith('## ')) return <Serif key={i} size={20} style={{ color: INK, marginTop: 30, marginBottom: 10, lineHeight: 1.3 }}>{b.slice(3)}</Serif>
        const lead = i === 1 && b.startsWith('*') && b.endsWith('*')
        return <p key={i} style={{ fontFamily: lead ? 'Lora, Georgia, serif' : undefined, fontSize: lead ? 17 : TYPE.body + 1, lineHeight: 1.72, color: lead ? MUTED : INK2, margin: '0 0 16px' }}>{inline(b.replace(/\n/g, ' '))}</p>
      })}
    </div>
  )
}

function WritingCard({ w }) {
  const [open, setOpen] = useState(false)
  const [md, setMd] = useState(null)
  const [err, setErr] = useState(null)
  const url = writingUrl(w)
  const color = STATUS_COLOR[w.status] || GRAY
  useEffect(() => {
    if (!open || md) return
    let on = true
    fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.text() : Promise.reject(new Error(`${r.status}`))).then(t => { if (on) setMd(t) }).catch(e => { if (on) setErr(e.message) })
    return () => { on = false }
  }, [open, md, url])
  const words = md ? md.split(/\s+/).filter(Boolean).length : null
  return (
    <div style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontFamily: MONO, fontSize: TYPE.meta, letterSpacing: '0.12em', textTransform: 'uppercase', color, marginBottom: 5 }}>{w.kind} · {STATUS_LABEL[w.status]}</div>
          <Serif size={18} style={{ color: INK, lineHeight: 1.3 }}>{w.title}</Serif>
          {w.subtitle && <div style={{ fontSize: TYPE.body, color: MUTED, marginTop: 4, fontStyle: 'italic' }}>{w.subtitle}</div>}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 7, fontSize: TYPE.meta + 2, color: MUTED }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Calendar size={12} color={LABEL} />{fmtDay(w.date)}</span>
            {words && <span>{words.toLocaleString()} words</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href={url} target="_blank" rel="noreferrer" title="Open the Markdown file" style={btn(INK2)}><ExternalLink size={12} /> File</a>
          <button onClick={() => setOpen(o => !o)} style={btn(PURPLE)}>{open ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {open ? 'Close' : 'Read'}</button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 16, paddingTop: 18, borderTop: `1px solid ${PANEL_BORDER}` }}>
          {md ? <Prose md={md} /> : err ? <div style={{ color: '#E8836F', fontSize: TYPE.body }}>Could not load the text ({err}).</div> : <div style={{ color: GRAY, fontSize: TYPE.body }}>Loading</div>}
          <div style={{ fontFamily: MONO, fontSize: TYPE.meta, color: MUTED, marginTop: 18 }}>{url}{w.mission ? ` · mission ${w.mission.slice(0, 8)}` : ''}</div>
        </div>
      )}
    </div>
  )
}

export default function WritingsPage() {
  const sorted = [...WRITINGS].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <div style={S.page}>
      <Eyebrow>MONITOR · WRITINGS</Eyebrow>
      <h1 style={S.h1}>Writings</h1>
      <p style={S.sub}>the pieces, filed here as they are written</p>
      <div style={{ marginTop: 20 }}>
        {sorted.map(w => <WritingCard key={w.slug} w={w} />)}
        {!sorted.length && <div style={{ color: GRAY, fontSize: TYPE.body }}><PenLine size={14} /> No writings yet.</div>}
      </div>
    </div>
  )
}
