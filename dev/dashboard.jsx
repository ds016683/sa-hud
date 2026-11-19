// Dev mock-up: the Dashboard, the page that sits under the Board (David 11/18: "if what we've been working on is
// my 'board' then i need a dashboard. nothing crazy at the moment. my calendar. Maybe the Proposed Steps and
// Activity log, with the latter continuing to use this hanging activity tracker thing. i want to see the days
// earned badges and the unearned ones, gray. and if i've earned a badge either the maximum number of times or 3
// or more times, i want the color of the badge to be purple."). Same shell and section tags as the Board mock-up;
// the Activity Log rows and the badge medallions are the real components. A picture to rule on: nothing is read
// or written. The words are sample data; ?d=<json> overrides any of them for a screenshot.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, LayoutDashboard, BookOpen, Activity, Award, FileText, PenLine, Mic, Pencil, BookMarked, Mountain, Briefcase, Target, Wrench, Archive, FolderOpen, Landmark, Wallet, Check, X, FileText as PageIcon, CalendarRange, ScrollText, Medal } from 'lucide-react'
import '../src/sa-hud.css'
import ProtocolHud from '../src/components/river/ProtocolHud'
import { SectionTag } from '../src/components/river/canon'
import { TimelineRow } from '../src/components/river/ActivityLog'
import BadgeMedallion from '../src/components/BadgeArt'
import { BADGES } from '../src/constants/collection'

const at = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString() }
const D = {
  title: "Wednesday's Dashboard", date: 'Wednesday, November 18, 2026 · Chicago',
  pill: ['In Mission', 'Sample Client Proposal'],
  calendar: [
    { from: '8:00 AM', to: '9:00 AM', title: 'Sample Weekly Sync', state: 'done' },
    { from: '9:00 AM', to: '9:30 AM', title: 'Sample Introduction Call', state: 'done' },
    { from: '10:00 AM', to: '10:45 AM', title: 'Sample Check-In', state: 'now' },
    { from: '10:30 AM', to: '11:30 AM', title: 'Sample Planning Session', state: 'next' },
    { from: '12:00 PM', to: '1:00 PM', title: 'Sample Team Meeting', state: 'next' },
  ],
  calendarMeta: '5 Meetings · 4h 15m',
  steps: [
    { at: '2:10 PM', text: 'Packaged a panel as a drop-in skill.', mission: 'Sample Main Mission' },
    { text: 'Added a Scope Of Work section to the proposal.', mission: 'Sample Client Mission' },
    { text: 'Drafted a starter pricing skill file.', mission: 'Sample Skill Mission' },
    { text: 'Added a Protocol bucket to the run report.', mission: 'Sample Platform Mission' },
  ],
  log: [
    { at: at(16, 49), kind: 'Activity', text: 'Run 5 extracted at the full 45 minutes', meta: '10 miles' },
    { at: at(15, 31), kind: 'Main Mission', text: 'Added a Protocol bucket to the run report', meta: 'Sample Platform Mission' },
    { at: at(14, 28), kind: 'Work', text: 'Full Day: 8 hours logged', meta: '4 miles' },
    { at: at(12, 0), kind: 'Meeting', text: 'Sample Team Meeting', meta: '6 attendees', documented: true },
    { at: at(10, 12), kind: 'Email', text: 'Sent: revised terms to the client', meta: null },
    { at: at(8, 0), kind: 'Meeting', text: 'Sample Weekly Sync', meta: '9 attendees', documented: true },
  ],
  logMeta: '29 Lines',
  earned: { run: 4, impromptu: 2, 'full-day': 1 },
  miles: 46,
  ...JSON.parse(new URLSearchParams(location.search).get('d') || '{}'),
}
const PROTO = { id: 'mission', label: D.pill[0], color: 'var(--hud-pos)', title: D.pill[1], since: new Date(Date.now() - 24.9 * 60000).toISOString(), live: true, slots: [{ live: true }, { live: false }] }

// The day's badges: the catalog less the retired ones and the small counters. A badge that can be earned once a
// day is at its maximum at one; a run at four.
const SMALL = ['lift', 'hygiene-item', 'dose']
const MAX = { run: 4 }
const BADGE_IDS = Object.keys(BADGES).filter(id => !BADGES[id].legacy && !SMALL.includes(id))
const PURPLE = '#B4A3E8', BLUE = '#8ACAFF'
const badgeState = (id) => {
  const n = D.earned[id] || 0, max = BADGES[id].repeatable ? MAX[id] || null : 1
  return { n, color: !n ? null : (n >= 3 || (max && n >= max)) ? PURPLE : BLUE }
}

const NAV = [
  ['Landing', [[Waves, 'The River'], [Footprints, 'Journey']]],
  ['Monitor', [[CalendarDays, 'Board'], [LayoutDashboard, 'Dashboard', true], [BookOpen, 'Narrative And Analytics'], [Activity, 'Activity'], [Award, 'Accomplishments'], [FileText, 'Notes'], [PenLine, 'Scratchpad'], [Mic, 'Speeches'], [Pencil, 'Writings'], [BookMarked, 'Reading']]],
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

.bd-cols { display:grid; grid-template-columns:minmax(0,7fr) minmax(0,5fr); column-gap:48px; align-items:start; }
.bd-cal { display:grid; grid-template-columns:150px minmax(0,1fr) auto; column-gap:18px; align-items:baseline; padding:13px 0; border-top:1px solid rgba(255,255,255,.07); }
.bd-cal:first-of-type { border-top:0; padding-top:2px; }
.bd-cal .bd-when { font-size:14px; color:var(--ink2); font-variant-numeric:tabular-nums; }
.bd-cal .bd-what { font:500 18px/1.3 var(--serif); }
.bd-cal .bd-st { font-size:13px; color:var(--ink2); white-space:nowrap; }
.bd-cal.bd-done .bd-what, .bd-cal.bd-done .bd-when { color:var(--ink3); }
.bd-cal.bd-now .bd-what { color:var(--ink); } .bd-cal.bd-now .bd-st { color:var(--green); }
.bd-cal.bd-now { box-shadow:inset 2px 0 0 var(--green); padding-left:14px; margin-left:-14px; }
.bd-step { display:grid; grid-template-columns:minmax(0,1fr) auto; column-gap:14px; align-items:center; padding:11px 0; border-top:1px solid rgba(255,255,255,.07); }
.bd-step:first-of-type { border-top:0; padding-top:2px; }
.bd-step .bd-tx { font-size:14.5px; line-height:1.45; } .bd-step .bd-ms { font-size:13px; color:var(--ink2); margin-top:2px; }
.bd-open { width:30px; height:30px; border-radius:99px; display:inline-grid; place-items:center; background:transparent; border:1px solid rgba(255,255,255,.2); color:var(--accent); cursor:pointer; }
.bd-open:hover { border-color:var(--accent); background:rgba(138,202,255,.08); }
.bd-veil { position:fixed; inset:0; z-index:80; background:rgba(6,16,26,.78); backdrop-filter:blur(3px); display:grid; place-items:center; padding:32px; }
.bd-pop { width:min(760px, 100%); max-height:86vh; overflow-y:auto; background:#0F2334; border:1px solid rgba(255,255,255,.14); border-radius:16px; padding:26px 30px 24px; box-shadow:0 30px 80px -20px rgba(0,0,0,.7); }
.bd-pophead { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; }
.bd-pophead h2 { font:500 28px/1.15 var(--serif); margin:0; } .bd-pophead div div { font-size:14px; color:var(--ink2); margin-top:6px; }
.bd-det { display:grid; grid-template-columns:74px minmax(0,1fr) auto; column-gap:16px; align-items:center; padding:14px 0; border-top:1px solid rgba(255,255,255,.08); }
.bd-det .bd-dt { font-size:13.5px; color:var(--ink2); font-variant-numeric:tabular-nums; }
.bd-det .bd-tx { font-size:15.5px; line-height:1.45; } .bd-det .bd-ms { font-size:13.5px; color:var(--ink2); margin-top:3px; }
.bd-popfoot { display:flex; justify-content:space-between; align-items:center; margin-top:18px; padding-top:16px; border-top:1px solid rgba(255,255,255,.08); font-size:13.5px; color:var(--ink2); }
.bd-yn { display:flex; gap:8px; }
.bd-yn button { width:34px; height:34px; border-radius:99px; display:grid; place-items:center; background:transparent; border:1.5px solid var(--c); color:var(--c); cursor:pointer; }
.bd-badges { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:26px 14px; }
.bd-badge { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; }
.bd-badge .bd-bn { font-size:13px; line-height:1.3; color:var(--ink); } .bd-badge.bd-un .bd-bn { color:var(--ink3); }
.bd-badge .bd-bc { font-size:12.5px; color:var(--ink2); margin-top:-4px; font-variant-numeric:tabular-nums; }
.bd-key2 { display:inline-flex; align-items:center; gap:6px; } .bd-key2 i { width:9px; height:9px; border-radius:99px; display:inline-block; }
`

// One small icon at the end of a section's tag opens that section's detail for the day.
const Open = ({ what, label, Icon, set }) => <button className="bd-open" title={label} aria-label={label} onClick={() => set(what)}><Icon size={15} strokeWidth={1.7} /></button>
const POPS = { calendar: 'Calendar', steps: 'Proposed Steps', log: 'Activity Log', badges: 'Badges' }

function Dashboard() {
  const got = BADGE_IDS.filter(id => D.earned[id]).length
  const [open, setOpen] = useState(new URLSearchParams(location.search).get('open'))
  return (
    <div className="bd-shell sa-dark sa-app">
      <style>{CSS}</style>
      {open && POPS[open] && (
        <div className="bd-veil" onClick={() => setOpen(null)}>
          <div className="bd-pop" role="dialog" aria-label={POPS[open]} onClick={e => e.stopPropagation()}>
            <div className="bd-pophead">
              <div><h2>{POPS[open]}</h2><div>{D.date}</div></div>
              <button className="bd-quiet" onClick={() => setOpen(null)}>Close</button>
            </div>
            {open === 'steps' && (
              <>
                {D.steps.map((p, i) => (
                  <div key={i} className="bd-det">
                    <span className="bd-dt">{p.at || ''}</span>
                    <div><div className="bd-tx">{p.text}</div><div className="bd-ms">{`${p.mission} · From ${p.from || 'A Claude Session'}`}</div></div>
                    <div className="bd-yn"><button title="Accept" style={{ '--c': 'var(--purple)' }}><Check size={16} /></button><button title="Reject" style={{ '--c': 'rgba(243,241,234,.44)' }}><X size={16} /></button></div>
                  </div>
                ))}
                <div className="bd-popfoot"><span>{`${D.steps.length} Waiting · 0 Accepted · 0 Rejected Today`}</span><button className="bd-quiet">Accept All</button></div>
              </>
            )}
            {open === 'log' && D.log.map((r, i) => <TimelineRow key={i} r={r} last={i === D.log.length - 1} />)}
            {open === 'calendar' && D.calendar.map((e, i) => (
              <div key={i} className={`bd-cal bd-${e.state}`}><span className="bd-when">{`${e.from} to ${e.to}`}</span><span className="bd-what">{e.title}</span><span className="bd-st">{e.state === 'done' ? 'Done' : e.state === 'now' ? 'Now' : ''}</span></div>
            ))}
            {open === 'badges' && BADGE_IDS.filter(id => D.earned[id]).map(id => (
              <div key={id} className="bd-det" style={{ gridTemplateColumns: '58px minmax(0,1fr) auto' }}>
                <BadgeMedallion id={id} size={46} color={badgeState(id).color} />
                <div><div className="bd-tx">{BADGES[id].label}</div><div className="bd-ms">{BADGES[id].desc}</div></div>
                <span className="bd-dt" style={{ textAlign: 'right' }}>{`${D.earned[id] > 1 ? `${D.earned[id]} Times · ` : ''}${BADGES[id].miles * D.earned[id]} mi`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

          <div className="bd-cols">
            <div>
              <div className="bd-row">
                <SectionTag name="Calendar"><span>{D.calendarMeta}</span><Open what="calendar" label="The Day's Calendar" Icon={CalendarRange} set={setOpen} /></SectionTag>
                {D.calendar.map((e, i) => (
                  <div key={i} className={`bd-cal bd-${e.state}`}>
                    <span className="bd-when">{`${e.from} to ${e.to}`}</span>
                    <span className="bd-what">{e.title}</span>
                    <span className="bd-st">{e.state === 'done' ? 'Done' : e.state === 'now' ? 'Now' : ''}</span>
                  </div>
                ))}
              </div>
              <div className="bd-row">
                <SectionTag name="Proposed Steps"><span>{`${D.steps.length} Waiting`}</span><Open what="steps" label="The Day's Proposed Steps" Icon={PageIcon} set={setOpen} /></SectionTag>
                {D.steps.map((p, i) => (
                  <div key={i} className="bd-step">
                    <div><div className="bd-tx">{p.text}</div><div className="bd-ms">{p.mission}</div></div>
                    <div className="bd-yn"><button title="Accept" style={{ '--c': 'var(--purple)' }}><Check size={16} /></button><button title="Reject" style={{ '--c': 'rgba(243,241,234,.44)' }}><X size={16} /></button></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bd-row">
              <SectionTag name="Activity Log"><span>{D.logMeta}</span><Open what="log" label="The Day's Full Log" Icon={ScrollText} set={setOpen} /></SectionTag>
              {D.log.map((r, i) => <TimelineRow key={i} r={r} last={i === D.log.length - 1} />)}
            </div>
          </div>

          <div className="bd-row">
            <SectionTag name="Badges">
              <span className="bd-key2"><i style={{ background: PURPLE }} />At Its Maximum, Or Three Times</span>
              <span className="bd-key2"><i style={{ background: BLUE }} />Earned</span>
              <span className="bd-key2"><i style={{ background: 'rgba(243,241,234,.3)' }} />Not Yet</span>
              <span>{`${got} Of ${BADGE_IDS.length} Earned · ${D.miles} Miles Today`}</span><Open what="badges" label="The Day's Badges" Icon={Medal} set={setOpen} />
            </SectionTag>
            <div className="bd-badges">
              {BADGE_IDS.map(id => {
                const st = badgeState(id)
                return (
                  <div key={id} className={`bd-badge${st.n ? '' : ' bd-un'}`} title={BADGES[id].desc}>
                    <BadgeMedallion id={id} size={58} earned={!!st.n} color={st.color} glow={!!st.n} />
                    <div className="bd-bn">{BADGES[id].label}</div>
                    {st.n ? <div className="bd-bc">{`${st.n > 1 ? `${st.n} Times · ` : ''}${BADGES[id].miles * st.n} mi`}</div> : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><Dashboard /></StrictMode>)
