// The meeting notes on a card's Notes tab: one row each, opened in place, with the Files list's lock and red x.
import { useEffect, useState } from 'react'
import { Mic, Lock, LockOpen, X as XIcon } from 'lucide-react'
import { INK, INK2, GRAY, MUTED, LABEL, BLUE, RED, PANEL_BORDER, SERIF } from './canon'
import { renderMarkdown } from './MeetingCloseout'
import { hudConfirm } from '../../lib/dialog'
import { readNotesIndex, writeNotesIndex, readMeetings } from '../../lib/notesIndex'

const LEDGER = { readNotesIndex, writeNotesIndex, readMeetings }
const dayOf = (d) => d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''
const ctl = (color, off) => ({ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, borderRadius: 6, color, opacity: off ? 0.25 : 1, cursor: off ? 'default' : 'pointer', flexShrink: 0 })
const key = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn() } }

export default function CardMeetingNotes({ objectiveId = null, meetings = [], say, empty = null, api = LEDGER }) {
  const [open, setOpen] = useState(null)
  const [index, setIndex] = useState({ v: 1, hidden: {}, locked: {} })
  const [held, setHeld] = useState([])
  useEffect(() => {
    let on = true
    if (!objectiveId) return () => { on = false }
    api.readNotesIndex(objectiveId).then(async (idx) => {
      if (!on) return
      setIndex(idx)
      const missing = Object.keys(idx.locked).filter(id => !meetings.some(m => String(m.id) === id))
      const extra = await api.readMeetings(missing).catch(() => [])
      if (on) setHeld(extra)
    })
    return () => { on = false }
  }, [objectiveId, meetings, api])
  const save = async (next) => { setIndex(next); try { await api.writeNotesIndex(objectiveId, next) } catch (e) { say && say(`Could not save that: ${e.message}`) } }
  const isLocked = (m) => !!index.locked[m.id]
  const toggleLock = async (m) => {
    const locked = { ...index.locked }
    if (locked[m.id]) {
      if (!await hudConfirm({ title: `Unlock ${m.title}?`, message: 'Unlocked, it can be taken off this card.', confirm: 'Unlock' })) return
      delete locked[m.id]
    } else locked[m.id] = true
    save({ ...index, locked })
  }
  const takeOff = (m) => { if (isLocked(m)) return; save({ ...index, hidden: { ...index.hidden, [m.id]: true } }); say && say(`Off this card: ${m.title}. The note itself is kept.`) }
  const rows = [...meetings, ...held.filter(h => !meetings.some(m => m.id === h.id))].filter(m => !index.hidden[m.id])
  if (!rows.length) return empty
  return rows.map(m => (
    <div key={m.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '13px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, cursor: 'pointer' }} onClick={() => setOpen(open === m.id ? null : m.id)}>
        <Mic size={15} color={LABEL} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 16, lineHeight: 1.3, letterSpacing: '-0.005em', color: INK }}>{m.title}</span>
        <span style={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>{dayOf(m.meeting_date)}</span>
        {objectiveId && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
          <span role="button" tabIndex={0} aria-pressed={isLocked(m)} aria-label={isLocked(m) ? `Unlock ${m.title}` : `Lock ${m.title}`} title={isLocked(m) ? 'Locked · Click to unlock' : 'Lock it on this card'} onClick={e => { e.stopPropagation(); toggleLock(m) }} onKeyDown={key(() => toggleLock(m))} style={ctl(isLocked(m) ? BLUE : MUTED)}>{isLocked(m) ? <Lock size={14} /> : <LockOpen size={14} />}</span>
          <span role="button" tabIndex={isLocked(m) ? -1 : 0} aria-disabled={isLocked(m)} aria-label={`Take ${m.title} off this card`} title={isLocked(m) ? 'Locked · Unlock it to take it off' : 'Take it off this card'} onClick={e => { e.stopPropagation(); takeOff(m) }} onKeyDown={key(() => takeOff(m))} style={ctl(RED, isLocked(m))}><XIcon size={15} /></span>
        </span>}
      </div>
      {open === m.id && <div style={{ marginTop: 12, maxWidth: '86ch', fontSize: 14.5, lineHeight: 1.7, color: INK2 }}>{m.summary ? renderMarkdown(m.summary, { size: 14.5 }) : <span style={{ color: GRAY }}>No summary stored.</span>}</div>}
    </div>
  ))
}
