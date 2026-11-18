// Reading (David 11/18): what he is reading and the notes he sends Lumen as he goes ("feed any notes to
// Lumen through Whats App that can be documented under a new tab called Reading, then a separate section
// for books"). One section, Books, for now; others can sit beside it. Lumen writes the notes; this page reads.
import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { S, INK, INK2, MUTED, LABEL, PANEL_BORDER, PANEL_BG, SERIF } from './river/canon'
import { readReading } from '../lib/reading'

const LEDGER = { readReading }
const day = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }) : ''
const stamp = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

function Book({ b, startOpen }) {
  const [open, setOpen] = useState(startOpen)
  const notes = [...(b.notes || [])].reverse()
  return (
    <div style={{ border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, background: PANEL_BG, padding: '18px 20px', marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: INK }}>
        <BookOpen size={18} color={LABEL} style={{ flexShrink: 0, marginTop: 4 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: SERIF, fontWeight: 500, fontSize: 20, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{b.title}</span>
          <span style={{ display: 'block', fontSize: 13.5, color: INK2, marginTop: 4 }}>{[b.author, b.status === 'finished' ? 'Finished' : `Started ${day(b.started_at)}`, `${notes.length} ${notes.length === 1 ? 'Note' : 'Notes'}`].filter(Boolean).join(' · ')}</span>
        </span>
        {open ? <ChevronDown size={18} color={MUTED} /> : <ChevronRight size={18} color={MUTED} />}
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          {!notes.length && <div style={{ fontSize: 14, color: MUTED, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>No notes yet. Text Lumen a note as you read and it lands here.</div>}
          {notes.map(n => (
            <div key={n.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '13px 0' }}>
              <div style={{ fontSize: 12.5, color: MUTED }}>{stamp(n.at)}{n.page ? ` · Page ${String(n.page).replace(/^p(age)?\.?\s*/i, '')}` : ''}</div>
              <div style={{ fontSize: 15, lineHeight: 1.65, color: INK, marginTop: 4, whiteSpace: 'pre-wrap', maxWidth: '78ch' }}>{n.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReadingPage({ api = LEDGER }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => { let on = true; const load = () => api.readReading().then(d => { if (on) setDoc(d) }); load(); const t = setInterval(load, 30000); return () => { on = false; clearInterval(t) } }, [api])
  const books = doc ? [...doc.books].sort((a, b) => String(b.started_at).localeCompare(String(a.started_at))) : []
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Reading</h1>
      <div style={{ fontSize: 14, color: INK2, marginTop: 6 }}>What you are reading, and the notes you send Lumen as you go.</div>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: LABEL, margin: '26px 0 12px' }}>Books</h2>
      {!doc && <div style={{ fontSize: 13.5, color: MUTED }}>Reading the shelf</div>}
      {doc && !books.length && <div style={{ fontSize: 14, color: MUTED }}>No books yet. Tell Lumen what you are reading.</div>}
      {books.map((b, i) => <Book key={b.id} b={b} startOpen={i === 0} />)}
    </div>
  )
}
