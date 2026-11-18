// A gate's notes hold two things: its done-when (what must be true), and the detail that came in with it
// (who sent it, the dates, the figures). The title stays a few words (David 11/18: "Mission title shouldn't
// ever be longer than a few words. Other data goes into the briefing"). No column of its own, so the
// detail rides in notes under one marker line. The same marker is written by api/_ledger.mjs.
export const DETAILS_MARK = '[Details]'
export function splitNotes(notes) {
  const s = String(notes || ''); const i = s.indexOf(DETAILS_MARK)
  if (i < 0) return { doneWhen: s.trim() || null, details: null }
  return { doneWhen: s.slice(0, i).trim() || null, details: s.slice(i + DETAILS_MARK.length).trim() || null }
}
export function joinNotes(doneWhen, details) {
  const a = String(doneWhen || '').trim(), b = String(details || '').trim()
  return (b ? `${a}${a ? '\n\n' : ''}${DETAILS_MARK}\n${b}` : a) || null
}
// Both parts as plain reading text, the marker gone.
export const plainNotes = (notes) => { const { doneWhen, details } = splitNotes(notes); return [details, doneWhen].filter(Boolean).join('\n\n') || null }
