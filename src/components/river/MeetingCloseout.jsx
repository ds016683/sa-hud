// MEETING CLOSE-OUT. The modal that ends a meeting on the Agenda: it shows the
// Granola notes that matched the calendar event, takes follow-ups (one per
// line) and special notes, stops the timer if it is still running, writes the
// meeting_sessions row, and turns each follow-up into a Side Mission in the
// Follow Up container. Also home to renderMarkdown(), the small renderer the
// Agenda uses to show Granola summaries inline, and friendlyError(), which
// turns a missing meeting_sessions table into a readable message.
// (Helpers live beside the modal on purpose, like river/canon.jsx, so Fast
// Refresh's components-only rule is switched off for this file.)
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { upsertSession, createFollowUps } from '../../lib/meetings'
import {
  INK, INK2, GRAY, NAVY_DEEP, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, GREEN, RED, MONO, SERIF,
  Eyebrow, Label, fmtTime,
} from './canon'

// ---- Errors ------------------------------------------------------------------
// The meeting_sessions table may not exist yet. Postgres says 42P01 (relation
// does not exist); PostgREST says PGRST205 (not in the schema cache).
export function friendlyError(err) {
  const msg = String(err?.message || err || 'Something went wrong')
  const code = err?.code
  const missing = code === '42P01' || code === 'PGRST205' || (/meeting_sessions/.test(msg) && /(schema cache|does not exist)/i.test(msg))
  return missing ? 'Meeting sessions table not created yet' : msg
}

export const fmtHours = (h) => `${Math.round((Number(h) || 0) * 100) / 100}h`

// ---- Markdown ----------------------------------------------------------------
// Inline: **bold** and [text](url). Everything else is literal text.
const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
function inline(text, keyBase) {
  const parts = String(text).split(INLINE).filter(Boolean)
  return parts.map((p, i) => {
    const k = `${keyBase}-${i}`
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={k} style={{ color: INK, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
    const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (m) return <a key={k} href={m[2]} target="_blank" rel="noreferrer" style={{ color: PERIWINKLE, textDecoration: 'underline', textUnderlineOffset: 2 }}>{m[1]}</a>
    return <span key={k}>{p}</span>
  })
}

const mdHeading = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE, margin: '10px 0 4px' }
const mdPara = { fontSize: 12.5, lineHeight: 1.6, color: INK2, margin: '4px 0' }
const mdBullet = { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.6, color: INK2, padding: '1px 0' }
const mdDash = { width: 12, height: 2, background: GOLD, flexShrink: 0, marginTop: 9, borderRadius: 1 }

// Block level: # / ## headings become mono blue labels, "- " "* " "• " lines
// become gold-dash bullets, blank lines split paragraphs.
export function renderMarkdown(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let para = [], list = []
  const flushPara = () => { if (para.length) { out.push(<p key={`p${out.length}`} style={mdPara}>{inline(para.join(' '), `p${out.length}`)}</p>); para = [] } }
  const flushList = () => {
    if (list.length) {
      out.push(<div key={`l${out.length}`} style={{ margin: '4px 0' }}>{list.map((l, i) => <div key={i} style={mdBullet}><span style={mdDash} /><span style={{ minWidth: 0 }}>{inline(l, `l${out.length}-${i}`)}</span></div>)}</div>)
      list = []
    }
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flushPara(); flushList(); continue }
    const h = line.match(/^#{1,6}\s+(.*)$/)
    if (h) { flushPara(); flushList(); out.push(<div key={`h${out.length}`} style={mdHeading}>{h[1].replace(/\*\*/g, '')}</div>); continue }
    const b = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (b) { flushPara(); list.push(b[1]); continue }
    flushList(); para.push(line)
  }
  flushPara(); flushList()
  return out
}

// ---- Shared close-out block ----------------------------------------------------
// Follow-ups and special notes from a saved session, used inline on the Agenda
// row and in the modal's preview.
export function CloseoutBlock({ session }) {
  const ups = Array.isArray(session?.follow_ups) ? session.follow_ups.filter(Boolean) : []
  const notes = String(session?.special_notes || '').trim()
  if (!ups.length && !notes) return null
  return (
    <div>
      <Eyebrow style={{ marginBottom: 6, fontSize: 9 }}>Close-out</Eyebrow>
      {ups.map((u, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.6, color: INK2, padding: '1px 0' }}>
          <Check size={12} style={{ color: GOLD, flexShrink: 0, marginTop: 4 }} />
          <span style={{ minWidth: 0 }}>{u}</span>
        </div>
      ))}
      {notes && <p style={{ ...mdPara, marginTop: ups.length ? 6 : 2 }}>{notes}</p>}
    </div>
  )
}

// ---- Modal ---------------------------------------------------------------------
const textarea = {
  width: '100%', minHeight: 84, boxSizing: 'border-box', resize: 'vertical',
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8,
  color: INK, fontSize: 13, lineHeight: 1.5, padding: '8px 10px', fontFamily: 'inherit', outline: 'none',
}
const btn = (extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  height: 32, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: 'rgba(234,241,248,0.75)',
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600,
  ...extra,
})

// Props:
//   event     calendar_events row, with .session (meeting_sessions row or undefined) and .notes (granola row or null)
//   day       YYYY-MM-DD of the agenda being viewed
//   onStop    async (event) => stops a running timer exactly as the row's Stop does; resolves when the session is stopped
//   onCancel  () => close without saving
//   onSaved   () => called after the confirmation beat, so the parent can refresh and close
export default function MeetingCloseout({ event, day, onStop, onCancel, onSaved }) {
  const session = event?.session
  const notes = event?.notes
  const running = !!(session?.started_at && !session?.stopped_at)
  const [ups, setUps] = useState(() => Array.isArray(session?.follow_ups) ? session.follow_ups.join('\n') : '')
  const [special, setSpecial] = useState(() => session?.special_notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  // Esc cancels while nothing is in flight.
  useEffect(() => {
    const onKey = (ev) => { if (ev.key === 'Escape' && !saving && !done) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving, done, onCancel])

  // After the confirmation line shows, hand control back to the parent.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(onSaved, 1100)
    return () => clearTimeout(t)
  }, [done, onSaved])

  const save = async () => {
    if (saving || done) return
    setSaving(true); setError(null)
    const lines = ups.split('\n').map(l => l.trim()).filter(Boolean)
    try {
      if (running && onStop) await onStop(event)
      await upsertSession({
        event_id: event.id, day, subject: event.subject || null, closed_at: new Date().toISOString(),
        follow_ups: lines, special_notes: special.trim() || null,
        notes_meeting_id: notes?.id || null, notes_summary: notes?.summary || null,
      })
      const made = await createFollowUps(lines, { day, subject: event.subject })
      const n = made.length
      setDone(n === 0 ? 'Closed. No follow-ups to post.' : `Closed. ${n} follow-up${n === 1 ? '' : 's'} on the board.`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  const hours = session?.hours != null && session?.stopped_at ? Number(session.hours) : null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(8,20,32,0.92)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" style={{
        width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box',
        background: NAVY_DEEP, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 20, color: INK,
      }}>
        <Eyebrow style={{ marginBottom: 8 }}>Close out</Eyebrow>
        <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25 }}>{event?.subject || '(no subject)'}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: GRAY, marginTop: 6 }}>
          {event?.is_all_day ? 'All day' : `${fmtTime(event?.start_at)}${event?.end_at ? ` to ${fmtTime(event.end_at)}` : ''}`}
          {hours != null && <span style={{ color: INK2 }}> · {fmtHours(hours)} logged{session?.harvest_logged ? '' : ' (not in Harvest)'}</span>}
          {running && <span style={{ color: GREEN }}> · timer running, stops on save</span>}
        </div>

        <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, margin: '14px 0' }} />

        <Label>Notes pulled</Label>
        {notes ? (
          <div style={{ border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '8px 12px', maxHeight: 260, overflowY: 'auto', background: 'rgba(255,255,255,0.025)' }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', color: GRAY, marginBottom: 2 }}>GRANOLA · {notes.title}</div>
            {renderMarkdown(notes.summary)}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: GRAY, lineHeight: 1.6 }}>
            No Granola notes matched this meeting yet.
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', marginTop: 2 }}>The Granola sync runs every 30 minutes. Close out now and the notes attach on the Notes page later, or wait for the next pull.</div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Label>Follow-ups, one per line</Label>
          <textarea value={ups} onChange={(ev) => setUps(ev.target.value)} disabled={saving || !!done} placeholder="Send the revised scope to Sara" style={textarea} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>Special notes</Label>
          <textarea value={special} onChange={(ev) => setSpecial(ev.target.value)} disabled={saving || !!done} placeholder="Anything worth remembering that the notes did not catch" style={{ ...textarea, minHeight: 64 }} />
        </div>

        {error && <div style={{ fontFamily: MONO, fontSize: 10.5, color: RED, marginTop: 12, letterSpacing: '0.4px' }}>{error}</div>}
        {done && <div style={{ fontFamily: MONO, fontSize: 10.5, color: GREEN, marginTop: 12, letterSpacing: '0.4px' }}>{done}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={onCancel} disabled={saving || !!done} style={btn({ opacity: saving || done ? 0.5 : 1 })}>Cancel</button>
          <button onClick={save} disabled={saving || !!done} style={btn({
            background: done ? GREEN : GOLD, borderColor: done ? GREEN : GOLD_BRIGHT, color: NAVY_DEEP, opacity: saving ? 0.7 : 1, cursor: saving || done ? 'default' : 'pointer',
          })}>{saving ? 'Saving…' : done ? 'Closed' : 'Close out meeting'}</button>
        </div>
      </div>
    </div>
  )
}
