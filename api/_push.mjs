// Lumen does not push (David 11/27: "at the moment, it's literally noise. i don't need lumen pushing anything at the
// moment. only responses, until we give very specific things for him to do"). Nothing unprompted leaves for WhatsApp
// unless its kind is named in LUMEN_PUSH (a comma list on Vercel: morning, notes, meetings, nudge, bounties, signal,
// order, run, focus; or all). With nothing set, every kind is off. Answers to what David says are not pushes and are
// not touched by this.
export const pushOn = (kind) => {
  const on = String(process.env.LUMEN_PUSH || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
  return on.includes('all') || on.includes(String(kind || '').toLowerCase())
}
