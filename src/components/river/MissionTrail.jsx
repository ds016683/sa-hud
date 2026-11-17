// The Trail on a Main Mission (David 11/17: "Helllllll yes on the Trail becoming the Main
// Mission"). The same read a Side Mission card has: what has come in and what has happened on
// this mission, oldest first, its closed gates as the big marks, then where it stands now.
import { useEffect, useMemo, useState } from 'react'
import { listPages } from '../../lib/workspace'
import { listBuilds } from '../../lib/lumenPanel'
import { listLiveFiles } from '../../lib/livefiles'
import { buildTrail, stamp } from '../../lib/path'

// The Ledger's doors, as one object, so a dev harness can run this on sample data.
const LEDGER = { listPages, listBuilds, listLiveFiles }

// gates: [{ id, text, done, done_at }]. here: the one line for You Are Here. onEnd: go to End Of The Trail.
export default function MissionTrail({ project, gates, here, onEnd, api = LEDGER }) {
  const [side, setSide] = useState({ tabs: [], builds: [], files: [] })
  const [all, setAll] = useState(false)
  useEffect(() => {
    let on = true
    Promise.all([
      api.listPages(project.id).catch(() => []), api.listBuilds(project.id).catch(() => []),
      api.listLiveFiles({ projectId: project.id }).then(r => r.rows || []).catch(() => []),
    ]).then(([tabs, builds, files]) => { if (on) setSide({ tabs, builds, files }) })
    return () => { on = false }
  }, [api, project.id])
  const trail = useMemo(() => buildTrail({ obj: { captured_at: project.created_at }, kindLabel: 'Main Mission', steps: gates, files: side.files, tabs: side.tabs, builds: side.builds }), [project.created_at, gates, side])
  const shown = all ? trail : trail.slice(-10)
  return (
    <>
      <p className="brf-sub">What has come in and what has happened on this mission, oldest first. A closed gate is the large mark.</p>
      <div className="brf-trail">
        {trail.length > shown.length && <div className="brf-ev more" onClick={() => setAll(true)}><div className="what">{trail.length - shown.length} earlier, from {stamp(trail[0].at)}</div></div>}
        {shown.map((ev, i) => <div key={`${ev.at}${i}`} className={`brf-ev${ev.gate ? ' gate' : ''}`}><div className="when">{stamp(ev.at)}<span className="kind">{ev.kind}</span></div><div className="what">{ev.text}</div></div>)}
        <div className="brf-ev here"><div className="when">You Are Here</div><div className="what">{here}</div></div>
        <div className="brf-ev go" style={{ paddingBottom: 0 }} onClick={onEnd}><div className="what">See what is left, on End Of The Trail</div></div>
      </div>
    </>
  )
}
