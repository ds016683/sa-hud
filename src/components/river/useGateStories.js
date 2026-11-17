// Each gate's own story, gathered for its mission (David 11/17: "each gate probably needs its own story,
// that feeds the meta story" and "mission card captures and documents what the gates are doing"). A gate's
// card tells only its own story; what came in and happened there (files, Workbench tabs, built pages,
// finished steps) is read here and handed to the mission's Trail Back, each line under its gate.
import { useEffect, useMemo, useState } from 'react'
import { listPages } from '../../lib/workspace'
import { listBuilds } from '../../lib/lumenPanel'
import { listLiveFiles } from '../../lib/livefiles'
import { objRoot } from '../../lib/objectives'
import { buildTrail, readPath } from '../../lib/path'

const NONE = []
// gates: [{ n, text, objective_id }], the gates that have a card (only those have a story to bring).
// Returns trail lines, each with `of` (its gate). Keep `gates` the same array between renders.
export default function useGateStories(gates) {
  const key = gates.map(g => g.objective_id).join(',')
  const [got, setGot] = useState({ key: '', files: [], cards: [] })
  useEffect(() => {
    let on = true
    const oids = key ? key.split(',') : []
    if (!oids.length) return undefined
    Promise.all([
      // a closed gate's files are filed away with it; they are still part of its story
      listLiveFiles({ objectiveIds: oids }, { includeFiled: true }).then(r => r.rows || []).catch(() => []),
      Promise.all(oids.map(async id => ({ id, tabs: await listPages(objRoot(id)).catch(() => []), builds: await listBuilds(objRoot(id)).catch(() => []), psteps: (await readPath(objRoot(id))).steps || [] }))),
    ]).then(([files, cards]) => { if (on) setGot({ key, files, cards }) })
    return () => { on = false }
  }, [key])
  return useMemo(() => {
    if (!key || got.key !== key) return NONE
    const by = new Map(gates.map(g => [g.objective_id, g]))
    const seen = new Set(), files = got.files.filter(f => !seen.has(f.id) && seen.add(f.id))
    return got.cards.flatMap(c => {
      const g = by.get(c.id)
      return g ? buildTrail({ files: files.filter(f => f.objective_id === c.id), tabs: c.tabs, builds: c.builds, psteps: c.psteps }).map(ev => ({ ...ev, pid: undefined, of: g })) : []
    })
  }, [got, key, gates])
}
