// Extract, wherever the mark sits (David 11/17: "we also need an extract that actually sits on the mission card").
// The same steps the Board's Extract takes: it is refused while something on the item is still open, a Side Mission
// that carries files or work is filed away first, and then the close-out form, where the clock is confirmed and
// what was achieved is written. The miles bank on the next update.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { pockets } from '../../lib/objectives'
import { stillOpen, fmtClock } from '../../lib/loadout'
import YayPage from './YayPage'
import FileAway from './FileAway'
import StillOpen from './StillOpen'

export default function useExtract({ onDone, onOpenMission } = {}) {
  const [blocked, setBlocked] = useState(null)   // { it, open }: refused, with what is still open
  const [form, setForm] = useState(null)         // the item on the close-out form
  const [filing, setFiling] = useState(null)     // { o, p }: a Side Mission being filed away first
  const [yay, setYay] = useState(null)
  const start = async (it) => {
    if (!it) return
    try { const still = await stillOpen(it.id); if (still.count) { setBlocked({ it, open: still }); return } } catch { /* the Extract itself refuses */ }
    if (it.kind === 'Side Mission' || it.kind === 'Ad Hoc') {
      try { const p = await pockets(it.id); if (p.carrying) { const { data } = await supabase.from('objectives').select('*').eq('id', it.id).limit(1); if (data?.[0]) { setFiling({ o: data[0], p }); return } } } catch { /* fall through to the form */ }
    }
    setForm(it)
  }
  const node = (
    <>
      {blocked && <StillOpen mission={blocked.it} open={blocked.open} onClose={() => setBlocked(null)} onReady={() => { const it = blocked.it; setBlocked(null); start(it) }} />}
      {form && <YayPage objectiveId={form.id} onClose={() => setForm(null)} extract={{ item: form, onDone: (r) => onDone && onDone(`Extracted: ${form.title} · ${fmtClock(r.minutes)}${r.personal ? ' · personal' : ''}`) }} />}
      {filing && <FileAway objective={filing.o} pockets={filing.p} onClose={() => setFiling(null)} onDone={({ filed, released }) => { const o = filing.o; setFiling(null); onDone && onDone(`Filed ${filed.length} to the Archive · extracted ${o.title} · ${released.minutes}m`); setYay(o.id) }} />}
      {yay && <YayPage objectiveId={yay} fresh onClose={() => setYay(null)} onOpenMission={onOpenMission ? (o) => { setYay(null); onOpenMission(o) } : null} />}
    </>
  )
  return { start, node }
}
