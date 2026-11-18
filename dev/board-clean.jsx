// Dev mock-up: the Board drawn in the language of a deck page. One grid, one level of surface, row names
// down the left, body-face labels at 12px and up in Title Case, color only for state, one gold action.
// A picture to rule on, nothing more: no data is read or written and nothing here is wired into the app.
// The words are sample data; ?d=<json> overrides any of them for a screenshot.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, BookOpen, Activity, Award, FileText, PenLine, Mic, Pencil, BookMarked, Mountain, Briefcase, Target, Wrench, Archive, FolderOpen, Landmark, Wallet } from 'lucide-react'

const D = {
  title: "Wednesday's Board", date: 'Wednesday, November 18, 2026 · Chicago',
  pill: ['In Mission', 'Sample Client Proposal', '24:52'],
  slot: { title: 'Sample Client Proposal', under: 'Sample Main Mission · Gate 3', clock: '3h 50m', gates: '2 of 3 closed', miles: '7 on close', due: 'None set' },
  steps: 4, runs: '3 Runs Complete', runMiles: '30 Miles From Runs Today',
  stash: { title: 'Sample Relaunch Plan', under: 'Main Mission · Sample Program', count: '1 of 5' },
  ...JSON.parse(new URLSearchParams(location.search).get('d') || '{}'),
}

const NAV = [
  ['Landing', [[Waves, 'The River'], [Footprints, 'Journey']]],
  ['Monitor', [[CalendarDays, 'Board', true], [BookOpen, 'Narrative And Analytics'], [Activity, 'Activity'], [Award, 'Accomplishments'], [FileText, 'Notes'], [PenLine, 'Scratchpad'], [Mic, 'Speeches'], [Pencil, 'Writings'], [BookMarked, 'Reading']]],
  ['Mission Board', [[Mountain, 'Main Missions'], [Briefcase, 'Clients'], [Target, 'Side Missions'], [Wrench, 'Maintenance'], [Archive, 'Archive'], [FolderOpen, 'File Cabinet']]],
  ['Resources', [[Landmark, 'Third Horizon Finance'], [Wallet, 'Personal Finance']]],
]

const CSS = `
:root { --ink:#F3F1EA; --ink2:rgba(243,241,234,.70); --ink3:rgba(243,241,234,.44); --line:rgba(255,255,255,.12); --navy:#0F2334; --deep:#0D1D2C; --accent:#8ACAFF; --gold:#F8C761; --green:#57BE97; --purple:#B4A3E8; --red:#DE7E6E; --serif:'Lora',Georgia,serif; --sans:'Instrument Sans',system-ui,sans-serif; }
* { box-sizing: border-box; }
body { margin:0; background:var(--navy); color:var(--ink); font-family:var(--sans); }
.shell { display:grid; grid-template-columns:248px 1fr; min-height:100vh; }
.side { background:var(--deep); border-right:1px solid var(--line); padding:26px 18px; }
.brand { font:600 13px var(--sans); letter-spacing:.22em; text-transform:uppercase; line-height:1.5; }
.brand span { display:block; font-weight:500; font-size:11px; color:var(--gold); margin-top:6px; }
.grp { font-size:12.5px; color:var(--ink3); margin:26px 0 8px 10px; }
.nav { display:flex; align-items:center; gap:12px; padding:8px 10px; border-radius:8px; font-size:14.5px; color:var(--ink2); }
.nav.on { color:var(--ink); background:rgba(255,255,255,.06); box-shadow:inset 2px 0 0 var(--accent); }
.bar { display:flex; align-items:center; justify-content:space-between; height:60px; padding:0 40px; border-bottom:1px solid var(--line); }
.quiet { font:500 13.5px var(--sans); color:var(--ink); background:transparent; border:1px solid rgba(255,255,255,.22); border-radius:999px; padding:7px 15px; }
.gold { font:600 14px var(--sans); color:#0D1D2C; background:var(--gold); border:0; border-radius:999px; padding:10px 22px; }
.pill { display:flex; align-items:baseline; gap:10px; font-size:14px; color:var(--ink2); }
.pill b { color:var(--ink); font-weight:600; }
.dot { display:inline-block; width:8px; height:8px; border-radius:99px; margin-right:8px; }
.page { max-width:1240px; margin:0 auto; padding:44px 40px 60px; }
.head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:30px; }
h1 { font:500 40px/1.1 var(--serif); letter-spacing:-.008em; margin:0; }
.sub { font-size:15.5px; color:var(--ink2); margin-top:8px; }
.row { display:grid; grid-template-columns:190px 1fr; border-top:1px solid var(--line); padding:26px 0; }
.name { font:500 20px/1.25 var(--serif); }
.note { font-size:13.5px; color:var(--ink2); margin-top:6px; line-height:1.7; }
.note a { color:var(--accent); display:block; }
.six { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); column-gap:18px; align-items:start; }
.six.slots { align-items:stretch; }
.col { grid-column:span 2; border:1px solid var(--line); border-top:2px solid var(--line); border-radius:12px; padding:18px 20px 16px; min-height:236px; display:flex; flex-direction:column; }
.col.live { border-top-color:var(--green); }
.colhead { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
.colhead .t { font:500 22px/1.2 var(--serif); }
.colhead .s { font-size:13px; color:var(--ink2); white-space:nowrap; }
.under { font-size:13.5px; color:var(--ink2); margin-top:4px; }
.facts { margin-top:14px; }
.fact { display:flex; align-items:baseline; justify-content:space-between; padding:7px 0; border-top:1px solid rgba(255,255,255,.07); font-size:14.5px; }
.fact > span:first-child { color:var(--ink2); font-size:13.5px; }
.fact .clock { font:500 24px/1 var(--serif); color:var(--green); }
.acts { display:flex; flex-wrap:wrap; gap:7px; margin-top:auto; padding-top:16px; }
.acts .quiet { font-size:13px; padding:6px 12px; }
.empty { color:var(--ink3); }
.big { font:500 44px/1 var(--serif); }
.cell .k { font-size:15px; font-weight:600; }
.cell .v { margin-top:6px; font-size:13.5px; color:var(--ink2); }
.cell .n { font:500 28px/1 var(--serif); color:var(--ink); margin-right:7px; }
.stashT { font:500 18px/1.3 var(--serif); }
`

const Fact = ({ k, children }) => <div className="fact"><span>{k}</span><span>{children}</span></div>
const Cell = ({ k, n, unit, tone, extra }) => (
  <div className="cell">
    <div className="k">{k}</div>
    {(n || unit) && <div className="v">{tone && <span className="dot" style={{ background: tone }} />}{n && <span className="n">{n}</span>}{unit}</div>}
    {extra && <div className="v" style={{ marginTop: 3 }}>{extra}</div>}
  </div>
)

function Board() {
  return (
    <div className="shell">
      <style>{CSS}</style>
      <aside className="side">
        <div className="brand">Sovereign Architect<span>Command Center</span></div>
        {NAV.map(([g, items]) => (
          <div key={g}>
            <div className="grp">{g}</div>
            {items.map(([Icon, label, on]) => <div key={label} className={`nav${on ? ' on' : ''}`}><Icon size={16} strokeWidth={1.6} />{label}</div>)}
          </div>
        ))}
      </aside>
      <div>
        <div className="bar">
          <button className="quiet">Back</button>
          <div className="pill"><span><span className="dot" style={{ background: 'var(--green)' }} /><b>{D.pill[0]}</b></span><span>{D.pill[1]}</span><span style={{ color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>{D.pill[2]}</span></div>
        </div>
        <div className="page">
          <div className="head">
            <div><h1>{D.title}</h1><div className="sub">{D.date}</div></div>
            <div style={{ display: 'flex', gap: 8 }}><button className="quiet">Earlier</button><button className="quiet" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Today</button><button className="quiet">Later</button></div>
          </div>

          <div className="row">
            <div><div className="name">Loadout</div><div className="note">1 Of 2 Mission Slots<a>Activity Log</a><a>{`Proposed Steps · ${D.steps}`}</a></div></div>
            <div className="six slots">
              <div className="col live">
                <div className="colhead"><span className="t">{D.slot.title}</span><span className="s">Primary</span></div>
                <div className="under">{D.slot.under}</div>
                <div className="facts">
                  <Fact k="Clock"><span className="clock">{D.slot.clock}</span><span style={{ color: 'var(--green)', marginLeft: 10, fontSize: 13.5 }}>Running</span></Fact>
                  <Fact k="Gates">{D.slot.gates}</Fact>
                  <Fact k="Miles">{D.slot.miles}</Fact>
                  <Fact k="Due">{D.slot.due}</Fact>
                </div>
                <div className="acts"><button className="quiet">Holster</button><button className="quiet">Stash</button><button className="quiet">Extract</button></div>
              </div>
              <div className="col">
                <div className="colhead"><span className="t empty">Empty</span><span className="s">Secondary</span></div>
              </div>
              <div className="col">
                <div className="colhead"><span className="t empty">Empty</span><span className="s">Utility</span></div>
                <div className="acts"><button className="quiet">Phone Call</button><button className="quiet">Non-Mission Task</button></div>
              </div>
            </div>
          </div>

          <div className="row">
            <div><div className="name">Run</div></div>
            <div className="six" style={{ alignItems: 'center' }}>
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'baseline', gap: 14 }}><span className="big">45:00</span><span style={{ fontSize: 15, color: 'var(--ink2)' }}>Ready</span></div>
              <div style={{ gridColumn: 'span 2', fontSize: 14.5, lineHeight: 1.7 }}><div><span className="dot" style={{ background: 'var(--purple)' }} />{D.runs}</div><div style={{ color: 'var(--ink2)', paddingLeft: 16 }}>{D.runMiles}</div></div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="quiet" style={{ padding: '10px 18px' }}>Start Focused Run</button><button className="gold">Start Run</button></div>
            </div>
          </div>

          <div className="row">
            <div><div className="name">Protocols</div></div>
            <div className="six">
              <Cell k="Morning" unit="Done" tone="var(--purple)" />
              <Cell k="Evening" unit="Not Yet" tone="var(--ink3)" />
            </div>
          </div>

          <div className="row">
            <div><div className="name">Tending</div></div>
            <div className="six">
              <Cell k="E-mail Refresh" n="173" unit="Unread" extra="1h 58m Today" />
              <Cell k="Slack Review" n="12" unit="Unread" />
              <Cell k="Bill Pay" n="22" unit="Days Since" />
              <Cell k="Text Review" />
              <Cell k="Desktop" />
            </div>
          </div>

          <div className="row">
            <div><div className="name">Stash</div><div className="note">{D.stash.count}</div></div>
            <div className="six">
              <div style={{ gridColumn: 'span 3' }}><div className="stashT">{D.stash.title}</div><div className="under">{D.stash.under}</div></div>
              <div style={{ gridColumn: 'span 3', display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="quiet">Load</button><button className="quiet">Return To Inventory</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><Board /></StrictMode>)
