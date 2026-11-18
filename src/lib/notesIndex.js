// Which meeting notes a card keeps and which it has let go (David 11/18: the same red x and lock as the
// Files list, on the notes rows). Meeting notes reach a card by matching its words, so a row is not the
// card's to delete: the x takes the note off this card only, and the lock holds it on the card even after
// the match would have dropped it. One small index beside the card's files, no schema.
import { supabase } from './supabase'
const BUCKET = 'project-files'
const pathOf = (objectiveId) => `objectives/${objectiveId}/notes-index.json`
const obj = (v) => (v && typeof v === 'object' ? v : {})

export async function readNotesIndex(objectiveId) {
  const empty = { v: 1, hidden: {}, locked: {} }
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOf(objectiveId), 60)
    if (error || !data?.signedUrl) return empty
    const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return empty
    const j = await res.json()
    return { v: 1, hidden: obj(j.hidden), locked: obj(j.locked) }
  } catch { return empty }
}
export async function writeNotesIndex(objectiveId, index) {
  const { error } = await supabase.storage.from(BUCKET).upload(pathOf(objectiveId), new Blob([JSON.stringify({ v: 1, hidden: obj(index.hidden), locked: obj(index.locked) })], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}
// Locked notes the word match no longer brings in.
export async function readMeetings(ids) {
  if (!ids.length) return []
  const { data } = await supabase.from('granola_meetings').select('id,title,meeting_date,summary').in('id', ids)
  return data || []
}
