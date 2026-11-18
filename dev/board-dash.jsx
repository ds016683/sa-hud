// Dev mock-up, second pass (David 11/18, on the first: "can we get back to the console look and feel? buttons?
// hues? love all of that a lot ... but this structure is great. this should feel like a dashboard ... fluid.
// living. accessible. balanced." and "de-emphasize the use of gold and emphasize the other colors in the palette.
// for the hud only."). The first pass's structure (one grid, row names down the left, the deck's navy) with the
// real Console buttons, their lights and hues, the real Protocol readout, and a dial on the run. Gold is gone
// from the page: the one action is the accent blue. A picture to rule on; nothing is read or written.
// The words are sample data; ?d=<json> overrides any of them for a screenshot.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, BookOpen, Activity, Award, FileText, PenLine, Mic, Pencil, BookMarked, Mountain, Briefcase, Target, Wrench, Archive, FolderOpen, Landmark, Wallet, Sunrise, Moon, MessageSquare, Monitor, CalendarCheck, Brain, Plane, Gamepad2, Car, Flag, Zap } from 'lucide-react'
import '../src/sa-hud.css'
import { Instrument, InstrumentGroup } from '../src/components/river/Instrument'
import ProtocolHud from '../src/components/river/ProtocolHud'

const D = {
  title: "Wednesday's Board", date: 'Wednesday, November 18, 2026 · Chicago',
  pill: ['In Mission', 'Sample Client Proposal'],
  slot: { title: 'Sample Client Proposal', under: 'Sample Main Mission · Gate 3', clock: '3h 50m', gates: '2 of 3 closed', miles: '7 on close', due: 'None set' },
  steps: 4, runs: '3 Runs Complete', runMiles: '30 Miles From Runs Today',
  stash: { title: 'Sample Relaunch Plan', under: 'Main Mission · Sample Program', count: '1 of 5' },
  ...JSON.parse(new URLSearchParams(location.search).get('d') || '{}'),
}
const PROTO = { id: 'mission', label: D.pill[0], color: 'var(--hud-pos)', title: D.pill[1], since: new Date(Date.now() - 24.9 * 60000).toISOString(), live: true, slots: [{ live: true }, { live: false }] }

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
.bd-shell { display:grid; grid-template-columns:248px 1fr; min-height:100vh; }
.bd-side { background:var(--deep); border-right:1px solid var(--line); padding:26px 18px; }
.bd-brand { font:600 13px var(--sans); letter-spacing:.22em; text-transform:uppercase; line-height:1.5; }
.bd-brand span { display:block; font-weight:500; font-size:11px; color:var(--accent); margin-top:6px; }
.bd-grp { font-size:12.5px; color:var(--ink3); margin:26px 0 8px 10px; }
.bd-nav { display:flex; align-items:center; gap:12px; padding:8px 10px; border-radius:8px; font-size:14.5px; color:var(--ink2); }
.bd-nav.bd-on { color:var(--ink); background:rgba(255,255,255,.06); box-shadow:inset 2px 0 0 var(--accent); }
.bd-bar { display:flex; align-items:center; justify-content:space-between; height:60px; padding:0 40px; border-bottom:1px solid var(--line); }
.bd-quiet { font:500 13.5px var(--sans); color:var(--ink); background:transparent; border:1px solid rgba(255,255,255,.22); border-radius:999px; padding:7px 15px; }
.bd-go { font:600 14px var(--sans); color:#0D1D2C; background:var(--accent); border:0; border-radius:999px; padding:10px 22px; box-shadow:0 0 22px rgba(138,202,255,.28); }
.bd-pill { display:flex; align-items:baseline; gap:10px; font-size:14px; color:var(--ink2); }
.bd-pill b { color:var(--ink); font-weight:600; }
.bd-dot { display:inline-block; width:8px; height:8px; border-radius:99px; margin-right:8px; }
.bd-page { max-width:1240px; margin:0 auto; padding:44px 40px 60px; }
.bd-head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:30px; }
h1 { font:500 40px/1.1 var(--serif); letter-spacing:-.008em; margin:0; }
.bd-sub { font-size:15.5px; color:var(--ink2); margin-top:8px; }
.bd-row { display:grid; grid-template-columns:190px 1fr; border-top:1px solid var(--line); padding:26px 0; }
.bd-name { font:500 20px/1.25 var(--serif); }
.bd-note { font-size:13.5px; color:var(--ink2); margin-top:6px; line-height:1.7; }
.bd-note a { color:var(--accent); display:block; }
.bd-six { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); column-gap:18px; align-items:start; }
.bd-slots { display:grid; grid-template-columns:5fr 4fr 3fr; column-gap:18px; align-items:stretch; }
.bd-slot { display:flex; flex-direction:column; min-width:0; }
.bd-slotname { display:flex; align-items:center; gap:10px; font:500 17px/1 var(--serif); color:var(--ink2); margin:0 0 10px 4px; }
.bd-slotname.bd-on { color:var(--ink); }
.bd-pips { display:inline-flex; gap:4px; }
.bd-pip { width:9px; height:9px; transform:rotate(45deg); border:1.5px solid var(--ink3); border-radius:1.5px; }
.bd-pip.bd-me { border-color:var(--accent); }
.bd-pip.bd-run { border-color:var(--green); background:var(--green); box-shadow:0 0 10px rgba(87,190,151,.7); }
.bd-slotname svg { color:var(--purple); }
.bd-col { flex:1; border:1px solid var(--line); border-top:2px solid var(--line); border-radius:12px; padding:18px 20px 16px; min-height:236px; display:flex; flex-direction:column; }
.bd-col.bd-live { border-top-color:var(--green); }
.bd-colhead { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
.bd-colhead .bd-t { font:500 22px/1.2 var(--serif); }
.bd-colhead .bd-s { font-size:13px; color:var(--ink2); white-space:nowrap; }
.bd-under { font-size:13.5px; color:var(--ink2); margin-top:4px; }
.bd-facts { margin-top:14px; }
.bd-fact { display:flex; align-items:baseline; justify-content:space-between; padding:7px 0; border-top:1px solid rgba(255,255,255,.07); font-size:14.5px; }
.bd-fact > span:first-child { color:var(--ink2); font-size:13.5px; }
.bd-fact .bd-clock { font:500 24px/1 var(--serif); color:var(--green); }
.bd-beat { display:inline-block; width:9px; height:9px; border-radius:99px; background:var(--green); margin-right:10px; animation:beat 1.6s ease-in-out infinite; }
@keyframes beat { 0%,100% { box-shadow:0 0 0 0 rgba(87,190,151,.55) } 50% { box-shadow:0 0 0 7px rgba(87,190,151,0) } }
.bd-bar2 { height:4px; border-radius:99px; background:rgba(255,255,255,.10); margin:2px 0 6px; overflow:hidden; }
.bd-bar2 i { display:block; height:100%; width:66%; border-radius:99px; background:var(--purple); }
.bd-medal { width:44px; height:44px; flex:0 0 44px; border-radius:99px; display:grid; place-items:center; color:var(--accent); border:1.5px solid rgba(138,202,255,.55); background:rgba(138,202,255,.08); }
.bd-col.bd-live { box-shadow:0 0 0 1px rgba(87,190,151,.18), 0 0 34px rgba(87,190,151,.10); }
.bd-dial { position:relative; width:118px; height:118px; display:grid; place-items:center; }
.bd-dial svg { position:absolute; inset:0; }
.bd-dial b { font:500 30px/1 var(--serif); }
.bd-dial span { display:block; font-size:13px; color:var(--ink2); margin-top:4px; text-align:center; }
.bd-groups { display:flex; justify-content:space-between; align-items:flex-start; }
.bd-comms { display:flex; justify-content:center; margin-top:34px; padding-top:28px; border-top:1px solid rgba(255,255,255,.07); }
.bd-acts { display:flex; flex-wrap:wrap; gap:7px; margin-top:auto; padding-top:16px; }
.bd-acts .bd-quiet { font-size:13px; padding:6px 12px; }
.bd-empty { color:var(--ink3); }
.bd-stashT { font:500 18px/1.3 var(--serif); }
`

const Fact = ({ k, children }) => <div className="bd-fact"><span>{k}</span><span>{children}</span></div>
function Board() {
  return (
    <div className="bd-shell sa-dark sa-app">
      <style>{CSS}</style>
      <aside className="bd-side">
        <div className="bd-brand">Sovereign Architect<span>Command Center</span></div>
        {NAV.map(([g, items]) => (
          <div key={g}>
            <div className="bd-grp">{g}</div>
            {items.map(([Icon, label, on]) => <div key={label} className={`bd-nav${on ? ' bd-on' : ''}`}><Icon size={16} strokeWidth={1.6} />{label}</div>)}
          </div>
        ))}
      </aside>
      <div>
        <div className="bd-bar">
          <button className="bd-quiet">Back</button>
          <ProtocolHud proto={PROTO} />
        </div>
        <div className="bd-page">
          <div className="bd-head">
            <div><h1>{D.title}</h1><div className="bd-sub">{D.date}</div></div>
            <div style={{ display: 'flex', gap: 8 }}><button className="bd-quiet">Earlier</button><button className="bd-quiet" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Today</button><button className="bd-quiet">Later</button></div>
          </div>

          <div className="bd-row">
            <div><div className="bd-name">Loadout</div><div className="bd-note">1 Of 2 Mission Slots<a>Activity Log</a><a>{`Proposed Steps · ${D.steps}`}</a></div></div>
            <div className="bd-slots">
              <div className="bd-slot">
              <div className="bd-slotname bd-on"><span className="bd-pips"><i className="bd-pip bd-run" /><i className="bd-pip" /></span>Primary</div>
              <div className="bd-col bd-live">
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span className="bd-medal"><Flag size={20} strokeWidth={1.7} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bd-colhead"><span className="bd-t">{D.slot.title}</span></div>
                    <div className="bd-under">{D.slot.under}</div>
                  </div>
                </div>
                <div className="bd-facts">
                  <Fact k="Clock"><span className="bd-beat" /><span className="bd-clock">{D.slot.clock}</span><span style={{ color: 'var(--green)', marginLeft: 10, fontSize: 13.5 }}>Running</span></Fact>
                  <Fact k="Gates">{D.slot.gates}</Fact>
                  <div className="bd-bar2"><i /></div>
                  <Fact k="Miles">{D.slot.miles}</Fact>
                  <Fact k="Due">{D.slot.due}</Fact>
                </div>
                <div className="bd-acts"><button className="bd-quiet">Holster</button><button className="bd-quiet">Stash</button><button className="bd-quiet">Extract</button></div>
              </div>
              </div>
              <div className="bd-slot">
              <div className="bd-slotname"><span className="bd-pips"><i className="bd-pip" /><i className="bd-pip bd-me" /></span>Secondary</div>
              <div className="bd-col">
                <div className="bd-colhead"><span className="bd-t bd-empty">Empty</span></div>
              </div>
              </div>
              <div className="bd-slot">
              <div className="bd-slotname"><Zap size={15} strokeWidth={1.8} />Utility</div>
              <div className="bd-col">
                <div className="bd-colhead"><span className="bd-t bd-empty">Empty</span></div>
                <div className="bd-acts"><button className="bd-quiet">Phone Call</button><button className="bd-quiet">Non-Mission Task</button></div>
              </div>
              </div>
            </div>
          </div>

          <div className="bd-row">
            <div><div className="bd-name">Run</div></div>
            <div className="bd-six" style={{ alignItems: 'center' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <div className="bd-dial">
                  <svg viewBox="0 0 118 118"><circle cx="59" cy="59" r="54" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" /><circle cx="59" cy="59" r="54" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray="339.3" strokeDashoffset="0" transform="rotate(-90 59 59)" opacity=".85" /></svg>
                  <div><b>45:00</b><span>Ready</span></div>
                </div>
              </div>
              <div style={{ gridColumn: 'span 2', fontSize: 14.5, lineHeight: 1.7 }}><div><span className="bd-dot" style={{ background: 'var(--purple)' }} />{D.runs}</div><div style={{ color: 'var(--ink2)', paddingLeft: 16 }}>{D.runMiles}</div></div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="bd-quiet" style={{ padding: '10px 18px' }}>Start Focused Run</button><button className="bd-go">Start Run</button></div>
            </div>
          </div>

          <div className="bd-row">
            <div><div className="bd-name">Console</div></div>
            <div>
            <div className="bd-groups">
              <InstrumentGroup label="Protocols">
                <Instrument label="Morning" title="Morning Protocol · done" icon={<Sunrise size={24} />} tone="var(--hud-success)" />
                <Instrument label="Evening" title="Evening Protocol · from 6:00 PM" icon={<Moon size={24} />} disabled />
              </InstrumentGroup>
              <InstrumentGroup label="Timers">
                <Instrument label="Calendar Sweep" icon={<CalendarCheck size={24} />} />
                <Instrument label="Thinking" sub="40m today" icon={<Brain size={24} />} />
                <Instrument label="Travel" icon={<Plane size={24} />} />
              </InstrumentGroup>
              <InstrumentGroup label="Release">
                <Instrument label="Gaming" icon={<Gamepad2 size={24} />} tone="var(--hud-purple)" />
                <Instrument label="Nap" icon={<Moon size={24} />} tone="var(--hud-purple)" />
                <Instrument label="Drive" icon={<Car size={24} />} tone="var(--hud-purple)" />
              </InstrumentGroup>
            </div>
            <div className="bd-comms">
              <InstrumentGroup label="Comms">
                <Instrument label="E-mail Refresh" sub="1h 58m today" reading={173} unit="unread" light={{ level: 'red', blink: true }} />
                <Instrument label="Slack Review" reading={12} unit="unread" light={{ level: 'blue' }} />
                <Instrument label="Bill Pay" reading={22} unit="days since" light={{ level: 'green' }} />
                <Instrument label="Text Review" icon={<MessageSquare size={24} />} />
                <Instrument label="Desktop" icon={<Monitor size={24} />} />
              </InstrumentGroup>
            </div>
            </div>
          </div>

          <div className="bd-row">
            <div><div className="bd-name">Stash</div><div className="bd-note">{D.stash.count}</div></div>
            <div className="bd-six">
              <div style={{ gridColumn: 'span 3' }}><div className="bd-stashT">{D.stash.title}</div><div className="bd-under">{D.stash.under}</div></div>
              <div style={{ gridColumn: 'span 3', display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="bd-quiet">Load</button><button className="bd-quiet">Return To Inventory</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><Board /></StrictMode>)
