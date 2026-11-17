// The Trail on a Main Mission (David 11/17: "Helllllll yes on the Trail becoming the Main
// Mission"). The same read a Side Mission card has: what has come in and what has happened on
// this mission, oldest first, its closed gates as the big marks, then where it stands now.
//
// It is the meta story (David 11/17: "each gate probably needs its own story, that feeds the meta
// story"): a gate's card tells only its own story, and what came in and happened on each gate's card
// is gathered here, each line under its gate.
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { listPages } from '../../lib/workspace'
import { listBuilds } from '../../lib/lumenPanel'
import { listLiveFiles } from '../../lib/livefiles'
import { objRoot } from '../../lib/objectives'
import { buildTrail, readPath, stamp } from '../../lib/path'

// The Ledger's doors, as one object, so a dev harness can run this on sample data.
const LEDGER = { listPages, listBuilds, listLiveFiles, readPath }

// One line (David 11/17): the trail behind folds and opens folded; the path forward's fold is the last
// mark on the line and the page draws the open gates under it.
// gates: [{ id, n, text, done, done_at, objective_id }]. here: the one line for You Are Here.
// ahead: { open, count, onToggle } for the path forward's fold. onOpenGate(objective_id): open a gate's card.
export default function MissionTrail({ project, gates, here, ahead, onOpenGate, api = LEDGER }) {
  const [side, setSide] = useState({ tabs: [], builds: [], files: [], cards: [] })
  const [open, setOpen] = useState(false)
  // The gates that have a card: only those have a story of their own to bring.
  const cardKey = gates.filter(g => g.objective_id).map(g => g.objective_id).join(',')
  useEffect(() => {
    let on = true
    const oids = cardKey ? cardKey.split(',') : []
    Promise.all([
      api.listPages(project.id).catch(() => []), api.listBuilds(project.id).catch(() => []),
      api.listLiveFiles({ projectId: project.id }).then(r => r.rows || []).catch(() => []),
      // a closed gate's files are filed away with it; they are still part of its story
      oids.length ? api.listLiveFiles({ objectiveIds: oids }, { includeFiled: true }).then(r => r.rows || []).catch(() => []) : [],
      Promise.all(oids.map(async id => ({ id, tabs: await api.listPages(objRoot(id)).catch(() => []), builds: await api.listBuilds(objRoot(id)).catch(() => []), psteps: api.readPath ? (await api.readPath(objRoot(id))).steps || [] : [] }))),
    ]).then(([tabs, builds, files, gateFiles, cards]) => { if (on) setSide({ tabs, builds, files: [...files, ...gateFiles], cards }) })
    return () => { on = false }
  }, [api, project.id, cardKey])
  const trail = useMemo(() => {
    const byCard = new Map(gates.filter(g => g.objective_id).map(g => [g.objective_id, g]))
    const seen = new Set(), files = side.files.filter(f => !seen.has(f.id) && seen.add(f.id))
    // The mission's own lines, then each gate's, tagged with the gate they belong to.
    const own = buildTrail({ obj: { captured_at: project.created_at }, kindLabel: 'Main Mission', steps: gates, files: files.filter(f => !byCard.has(f.objective_id)), tabs: side.tabs, builds: side.builds })
    const fromGates = side.cards.flatMap(c => {
      const g = byCard.get(c.id)
      return g ? buildTrail({ files: files.filter(f => f.objective_id === c.id), tabs: c.tabs, builds: c.builds, psteps: c.psteps }).map(ev => ({ ...ev, of: g })) : []
    })
    return [...own, ...fromGates].sort((a, b) => String(a.at).localeCompare(String(b.at)))
  }, [project.created_at, gates, side])
  const fold = (isOpen, toggle) => ({ role: 'button', tabIndex: 0, 'aria-expanded': isOpen, onClick: toggle, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } } })
  return (
    <>
      <p className="brf-sub">Behind this mission, where it stands, and what is left before it closes. A closed gate is the large mark; a line from a gate's own story says which gate.</p>
      <div className="brf-trail">
        <div className="brf-ev fold" {...fold(open, () => setOpen(o => !o))}>
          <span className="chev">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
          <div className="what">The Trail Behind<i>{trail.length} {trail.length === 1 ? 'line' : 'lines'}{!open && trail.length > 0 ? `, from ${stamp(trail[0].at)}` : ''}</i></div>
        </div>
        {open && trail.map((ev, i) => (
          <div key={`${ev.at}${i}`} className={`brf-ev${ev.gate ? ' gate' : ''}`}>
            <div className="when">{stamp(ev.at)}<span className="kind">{ev.kind}</span></div>
            <div className="what">{ev.text}</div>
            {ev.of && <div onClick={onOpenGate ? () => onOpenGate(ev.of.objective_id) : undefined} title={onOpenGate ? "Open this gate's card" : undefined} style={{ fontSize: 13, color: 'var(--hud-ink-2)', marginTop: 3, cursor: onOpenGate ? 'pointer' : 'default' }}>On Gate {ev.of.n}: {ev.of.text}</div>}
          </div>
        ))}
        <div className="brf-ev here"><div className="when">You Are Here</div><div className="what">{here}</div></div>
        {ahead && (
          <div className="brf-ev fold" style={{ paddingBottom: 0 }} {...fold(ahead.open, ahead.onToggle)}>
            <span className="chev">{ahead.open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
            <div className="what">The Path Forward<i>{ahead.count} open</i></div>
          </div>
        )}
      </div>
    </>
  )
}
