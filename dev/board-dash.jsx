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
import { SectionTag } from '../src/components/river/canon'

const D = {
  title: "Wednesday's Board", date: 'Wednesday, November 18, 2026 · Chicago',
  pill: ['In Mission', 'Sample Client Proposal'],
  slot: { title: 'Sample Client Proposal', under: 'Sample Main Mission · Gate 3', clock: '3h 50m', gates: '2 of 3 closed', miles: '7 on close', due: 'None set' },
  steps: 4,
  runs: [
    { n: 1, at: '5:55 AM', min: 45, miles: 10, mix: [80, 0, 20] },
    { n: 2, at: '6:55 AM', min: 45, miles: 10, mix: [62, 0, 38] },
    { n: 3, at: '10:31 AM', min: 1, miles: 0, walked: true, focused: true },
    { n: 4, at: '2:28 PM', min: 59, miles: 10, focused: true, mix: [88, 12, 0] },
    { n: 5, at: '4:02 PM', min: 47, miles: 10, focused: true, mix: [94, 6, 0] },
  ],
  stash: { title: 'Sample Relaunch Plan', under: 'Main Mission · Sample Program', count: '1 Of 5' },
  ...JSON.parse(new URLSearchParams(location.search).get('d') || '{}'),
}
const LEFT = Number(new URLSearchParams(location.search).get('run'))   // minutes left on a running clock, for the picture
const RUNNING = LEFT > 0
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
.bd-head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:34px; }
h1 { font:500 40px/1.1 var(--serif); letter-spacing:-.008em; margin:0; }
.bd-sub { font-size:15.5px; color:var(--ink2); margin-top:8px; }
.bd-row { padding:0 0 38px; }
.bd-row a { color:var(--accent); }
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
.bd-run { display:grid; grid-template-columns:auto minmax(0,1fr) auto; column-gap:44px; align-items:center; }
.bd-clockface { position:relative; width:252px; height:104px; display:grid; place-items:center; }
.bd-clockface svg { position:absolute; inset:0; overflow:visible; }
.bd-clockface b { font:500 44px/1 var(--font-mono, 'JetBrains Mono', ui-monospace, monospace); letter-spacing:.04em; font-variant-numeric:tabular-nums; color:var(--ink); }
.bd-clockface b.bd-live { color:var(--green); text-shadow:0 0 18px rgba(87,190,151,.35); }
.bd-clockface span { display:block; text-align:center; font-size:13px; color:var(--ink2); margin-top:7px; }
.bd-runs { display:grid; row-gap:9px; }
.bd-runline { display:grid; grid-template-columns:54px 74px minmax(0,1fr) 58px 44px; column-gap:14px; align-items:center; font-size:14px; }
.bd-runline .bd-rn { font:500 15.5px var(--serif); }
.bd-runline .bd-ra { color:var(--ink2); font-variant-numeric:tabular-nums; }
.bd-runline .bd-rm { text-align:right; font-variant-numeric:tabular-nums; }
.bd-runline .bd-rmi { text-align:right; color:var(--purple); font-variant-numeric:tabular-nums; }
.bd-runline.bd-off { color:var(--ink3); } .bd-runline.bd-off .bd-ra, .bd-runline.bd-off .bd-rmi { color:var(--ink3); }
.bd-mix { display:flex; height:5px; border-radius:99px; overflow:hidden; background:rgba(255,255,255,.09); }
.bd-mix i { display:block; height:100%; }
.bd-runsum { display:flex; justify-content:flex-start; font-size:13px; color:var(--ink2); padding-top:9px; margin-top:2px; border-top:1px solid rgba(255,255,255,.07); }
.bd-key { display:inline-flex; align-items:center; gap:6px; margin-right:14px; }
.bd-key i { width:8px; height:8px; border-radius:99px; display:inline-block; }
.bd-starts { display:flex; gap:22px; }
.bd-start { display:flex; flex-direction:column; align-items:center; gap:8px; width:92px; font-size:12.5px; text-align:center; color:var(--ink); }
.bd-start button { width:78px; height:78px; border-radius:99px; background:rgba(255,255,255,.03); border:1.5px solid var(--c); color:var(--c); display:grid; place-items:center; cursor:pointer; box-shadow:0 0 0 0 transparent; transition:box-shadow .3s; }
.bd-start button:hover { box-shadow:0 0 22px color-mix(in srgb, var(--c) 40%, transparent); }
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

// A runner, drawn here: the icon set has none.
const Runner = ({ size = 34, focus = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="15.2" cy="5" r="1.7" />
    <path d="M13.6 8.6 11 13.4" />
    <path d="M13.6 8.6l3.2 2.2 2.4-1" />
    <path d="M13.4 8.7 10.4 8.3 8.6 10.6" />
    <path d="M11 13.4l3.3 2.3-.9 4.4" />
    <path d="M11 13.4 8.3 16.3H5.2" />
    {focus && <path d="M2.5 6V2.5H6M18 2.5h3.5V6M21.5 18v3.5H18M6 21.5H2.5V18" strokeWidth="1.3" />}
  </svg>
)
const MIX = ['var(--purple)', 'var(--accent)', 'var(--red)']
// The clock as a digital face: the outline is the time left, draining as the run goes.
const ClockFace = () => {
  const frac = RUNNING ? Math.min(1, LEFT / 45) : 1
  const mm = RUNNING ? String(Math.floor(LEFT)).padStart(2, '0') : '45', ss = RUNNING ? String(Math.round((LEFT % 1) * 60)).padStart(2, '0') : '00'
  const c = RUNNING ? 'var(--green)' : 'var(--accent)'
  return (
    <div className="bd-clockface">
      <svg viewBox="0 0 252 104"><rect x="2" y="2" width="248" height="100" rx="50" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.12)" strokeWidth="2.5" /><rect x="2" y="2" width="248" height="100" rx="50" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" pathLength="100" strokeDasharray={`${100 * frac} 100`} style={{ filter: `drop-shadow(0 0 6px ${RUNNING ? 'rgba(87,190,151,.5)' : 'rgba(138,202,255,.35)'})` }} /></svg>
      <div><b className={RUNNING ? 'bd-live' : undefined}>{`${mm}:${ss}`}</b><span>{RUNNING ? 'Left In Run 6' : 'Ready'}</span></div>
    </div>
  )
}
const Runs = () => {
  return (
    <div className="bd-runs">
      {D.runs.map(r => (
        <div key={r.n} className={`bd-runline${r.walked ? ' bd-off' : ''}`}>
          <span className="bd-rn">{`Run ${r.n}`}</span>
          <span className="bd-ra">{r.at}</span>
          {r.walked ? <span>Walked Away</span> : <span className="bd-mix">{(r.mix || []).map((w, i) => <i key={i} style={{ width: `${w}%`, background: MIX[i] }} />)}</span>}
          <span className="bd-rm">{`${r.min} min`}</span>
          <span className="bd-rmi">{`${r.miles} mi`}</span>
        </div>
      ))}
      <div className="bd-runsum">
        <span><span className="bd-key"><i style={{ background: MIX[0] }} />Mission</span><span className="bd-key"><i style={{ background: MIX[1] }} />Protocol</span><span className="bd-key"><i style={{ background: MIX[2] }} />Rogue</span></span>
      </div>
    </div>
  )
}

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
            <SectionTag name="Loadout"><span>1 Of 2 Mission Slots</span><a>Activity Log</a><a>{`Proposed Steps · ${D.steps}`}</a></SectionTag>
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
            <SectionTag name="Run"><span>{`${D.runs.filter(r => !r.walked).length} Runs Complete · ${D.runs.filter(r => !r.walked).reduce((a, r) => a + r.miles, 0)} Miles Today`}</span></SectionTag>
            <div className="bd-run">
              <ClockFace />
              <Runs />
              <div className="bd-starts">
                <div className="bd-start" style={{ '--c': 'var(--purple)' }}><button title="Start Focused Run"><Runner focus /></button>Focused Run</div>
                <div className="bd-start" style={{ '--c': 'var(--accent)' }}><button title="Start Run"><Runner /></button>Start Run</div>
              </div>
            </div>
          </div>

          <div className="bd-row">
            <SectionTag name="Console" />
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
            <SectionTag name="Stash"><span>{D.stash.count}</span></SectionTag>
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
