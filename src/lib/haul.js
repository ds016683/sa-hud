// The Haul diff. Loot is what is newly banked since the last check-in, and
// it has to be honest: the composer rewrites its accomplishment prose every
// run, so two runs can describe the same completion in different words.
// Rules here:
//   1. Released objectives come from the deterministic title list
//      (scorecard.released_today, or the close snapshot), never from prose.
//   2. Everything is diffed against EVERY prior run of the day, not only the
//      immediately previous one, so a line that drops out of one run's prose
//      and returns in the next cannot re-drop.
//   3. Prose lines are compared after normalizing (case, punctuation, the
//      "Released:" / "(done)" decorations), and prose that merely restates a
//      released objective is suppressed in favor of the deterministic drop.

export const normText = (s) => String(s || '')
  .toLowerCase()
  .replace(/\breleased:\s*/g, '')
  .replace(/\(done\)/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const releasedOf = (row) => {
  const sc = (row && row.scorecard) || {}
  return sc.released_today || (sc.snapshot && sc.snapshot.released_today) || []
}

// now: the fresh row. priorRows: every other row from the same day.
export function buildHaulItems(now, priorRows) {
  const prior = (priorRows || []).filter(r => r && r.id !== now.id)
  const priorProse = new Set(prior.flatMap(r => r.accomplishments || []).map(normText))
  const priorReleased = new Set(prior.flatMap(releasedOf).map(normText))
  const seenBefore = (n) => priorProse.has(n) || priorReleased.has(n) || [...priorProse].some(p => p.includes(n))

  const releasedNow = releasedOf(now)
  const releasedNorm = releasedNow.map(normText).filter(Boolean)
  const newReleased = releasedNow.filter(t => { const n = normText(t); return n && !seenBefore(n) })

  const prose = (now.accomplishments || []).filter(a => {
    const n = normText(a)
    if (!n || priorProse.has(n)) return false
    // Prose restating a released objective is covered by the deterministic drop.
    if (releasedNorm.some(r => n === r || n.includes(r))) return false
    return true
  })

  return [...newReleased.map(t => `Released: ${t}`), ...prose]
}
