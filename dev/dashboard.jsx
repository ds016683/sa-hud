// Dev mock-up: the Dashboard, the page that sits under the Board (David 11/18: "if what we've been working on is
// my 'board' then i need a dashboard. nothing crazy at the moment. my calendar. Maybe the Proposed Steps and
// Activity log, with the latter continuing to use this hanging activity tracker thing. i want to see the days
// earned badges and the unearned ones, gray. and if i've earned a badge either the maximum number of times or 3
// or more times, i want the color of the badge to be purple."). Same shell and section tags as the Board mock-up;
// the Activity Log rows and the badge medallions are the real components. A picture to rule on: nothing is read
// or written. The words are sample data; ?d=<json> overrides any of them for a screenshot.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, LayoutDashboard, BookOpen, Activity, Award, FileText, PenLine, Mic, Pencil, BookMarked, Mountain, Briefcase, Target, Wrench, Archive, FolderOpen, Landmark, Wallet, Check, X, FileText as PageIcon, CalendarRange, ScrollText, Medal, Play, Video, Tag, Plus, Handshake } from 'lucide-react'
import '../src/sa-hud.css'
import ProtocolHud from '../src/components/river/ProtocolHud'
import { SectionTag } from '../src/components/river/canon'
import BadgeMedallion from '../src/components/BadgeArt'
import { BADGES } from '../src/constants/collection'

const at = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString() }
const D = {
  title: "Wednesday's Dashboard", date: 'Wednesday, November 18, 2026 · Chicago',
  pill: ['In Mission', 'Sample Client Proposal'],
  calendar: [
    { from: '8:00 AM', to: '9:00 AM', title: 'Sample Weekly Sync', state: 'done', notes: true, who: '9 People · Sample Organizer Set It Up', read: 'Weekly standing sync.', mission: 'Sample Main Mission' },
    { from: '9:00 AM', to: '9:30 AM', title: 'Sample Introduction Call', state: 'done', who: '4 People · You Set It Up', read: 'First meeting with this group.' },
    { from: '10:00 AM', to: '10:45 AM', title: 'Sample Check-In', state: 'now', who: '5 People · You Set It Up', read: 'Every two weeks; two asks open from last time.', mission: 'Sample Client Mission' },
    { from: '10:30 AM', to: '11:30 AM', title: 'Sample Planning Session', state: 'next', who: '6 People · Sample Organizer Set It Up', read: 'Decides next year\'s delivery dates.', mission: 'Sample Main Mission' },
    { from: '12:00 PM', to: '1:00 PM', title: 'Sample Team Meeting', state: 'next', who: '16 People · Sample Organizer Set It Up', read: 'Weekly standing meeting.' },
  ],
  calendarMeta: '5 Meetings · 4h 15m',
  // Commitments: only what David said he would do, on a call or in a message he sent, or what he adds himself.
  commitments: [
    { what: 'Send the revised dates', by: 'By Friday', heard: 'Said on the Sample Planning Session, 10:52 AM', quote: '"I will send the revised dates by Friday."' },
    { what: 'Confirm the second reviewer', by: 'By Tomorrow', heard: 'In a mail you sent to the client lead, 9:14 AM', quote: '"I will confirm the second reviewer tomorrow."' },
    { what: 'Share the draft schedule', by: 'Was Due Yesterday', late: true, heard: 'Said on the Sample Weekly Sync, Monday', quote: '"I will get the draft to you by Tuesday."' },
    { what: 'Call the vendor back', by: 'No Date', heard: 'You added this yourself, 1:05 PM', quote: '' },
  ],
  // What the preview holds for a meeting: who is there, what Lumen found or inferred, the missions it touches.
  preview: {
    who: ['Sample Organizer · Set It Up', 'Sample Colleague', 'Sample Colleague', 'Sample Client Lead · Client'],
    found: ['Third meeting in this series; the last one ended with two open asks.', 'A draft schedule was mailed to the group yesterday.', 'Inferred: this decides next year\'s delivery dates.'],
    missions: ['Sample Main Mission', 'Sample Side Mission'],
    link: 'Zoom · From The Outlook Invite',
  },
  // What the notes pop-up holds once a call's notes are in and summarized.
  notes: { summary: ['The group agreed the schedule for the first quarter.', 'Two items were left open and have owners.'], asks: ['Send the revised dates by Friday.', 'Confirm the second reviewer.'] },
  steps: [
    { at: '2:10 PM', text: 'Packaged a panel as a drop-in skill.', mission: 'Sample Main Mission' },
    { text: 'Added a Scope Of Work section to the proposal.', mission: 'Sample Client Mission', kind: 'Main Mission', gate: 'Gate 3' },
    { text: 'Drafted a starter pricing skill file.', mission: 'Sample Skill Mission', kind: 'Side Mission · Contract' },
    { text: 'Added a Protocol bucket to the run report.', mission: 'Sample Platform Mission' },
  ],
  log: [
    { at: at(16, 49), tag: 'Mission Run', text: 'Run 5 extracted at the full 45 minutes', miles: 10 },
    { at: at(15, 31), tag: 'In Mission · Primary', text: 'Added a Protocol bucket to the run report', meta: 'Sample Platform Mission' },
    { at: at(14, 28), text: 'Full Day: 8 hours logged', miles: 4 },
    { at: at(12, 0), tag: 'In Meeting', text: 'Sample Team Meeting', recorded: true },
    { at: at(10, 12), text: 'Sent: revised terms to the client' },
    { at: at(9, 40), tag: 'Comms', text: 'E-mail Refresh, 22 minutes' },
    { at: at(8, 0), tag: 'In Meeting', text: 'Sample Weekly Sync', recorded: true },
  ],
  logMeta: '29 Lines',
  lights: {
    calendar: { level: 'green', why: 'On cadence: every meeting so far was started on time' },
    commitments: { level: 'red', why: 'One commitment is past its date' },
    log: { level: 'red', why: 'Nothing logged for 42 minutes, and no Release or Off is on' },
  },
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

.bd-views { display:inline-flex; gap:4px; padding:4px; border:1px solid rgba(255,255,255,.14); border-radius:99px; margin:-10px 0 30px; }
.bd-views button { font:500 14px var(--sans); color:var(--ink2); background:transparent; border:0; border-radius:99px; padding:7px 18px; cursor:pointer; }
.bd-views button.bd-von { color:#0D1D2C; background:var(--accent); }
.bd-pair { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); column-gap:56px; align-items:stretch; }
.bd-pair > .bd-row { display:flex; flex-direction:column; }
.bd-row { padding-bottom:54px; }
.bd-wide .bd-cal { grid-template-columns:36px 150px minmax(0,1.2fr) minmax(0,1fr) 190px 46px; }
.bd-cwho { font-size:13px; color:var(--ink2); margin-top:2px; }
.bd-cread { font-size:13.5px; line-height:1.45; color:var(--ink2); }
.bd-cal.bd-done .bd-cread, .bd-cal.bd-done .bd-cwho { color:var(--ink3); }
.bd-kind.bd-late { color:var(--red); }
.bd-cols { display:grid; grid-template-columns:minmax(0,7fr) minmax(0,5fr); column-gap:48px; align-items:start; }
.bd-cal { display:grid; grid-template-columns:36px 150px minmax(0,1fr) auto; column-gap:18px; align-items:baseline; padding:13px 0; border-top:1px solid rgba(255,255,255,.07); }
.bd-cal:first-of-type { border-top:0; padding-top:2px; }
.bd-cal .bd-when { font-size:14px; color:var(--ink2); font-variant-numeric:tabular-nums; }
.bd-cal .bd-what { font:500 18px/1.3 var(--serif); cursor:pointer; }
.bd-cal .bd-what:hover { color:var(--accent); }
.bd-cal { align-items:center; }
.bd-go2 { width:32px; height:32px; border-radius:99px; display:grid; place-items:center; cursor:pointer; background:rgba(138,202,255,.06); border:1.5px solid var(--accent); color:var(--accent); }
.bd-go2:hover { box-shadow:0 0 16px rgba(138,202,255,.35); }
.bd-go2.bd-past { border-color:rgba(243,241,234,.22); color:var(--ink3); background:transparent; }
.bd-go2.bd-live2 { border-color:var(--green); color:var(--green); background:rgba(87,190,151,.1); animation:beat2 1.8s ease-in-out infinite; }
@keyframes beat2 { 0%,100% { box-shadow:0 0 0 0 rgba(87,190,151,.5) } 50% { box-shadow:0 0 0 7px transparent } }
.bd-notes { display:inline-grid; place-items:center; width:30px; height:30px; border-radius:99px; cursor:pointer; background:rgba(180,163,232,.1); border:1.5px solid var(--purple); color:var(--purple); animation:notes 2s ease-in-out infinite; }
@keyframes notes { 0%,100% { box-shadow:0 0 0 0 rgba(180,163,232,.55) } 50% { box-shadow:0 0 0 7px transparent } }
.bd-pv { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); column-gap:34px; row-gap:22px; padding-top:18px; border-top:1px solid rgba(255,255,255,.08); }
.bd-pv h3 { font:500 17px/1.2 var(--serif); margin:0 0 9px; }
.bd-pv li, .bd-pv p { font-size:14.5px; line-height:1.55; color:var(--ink); margin:0 0 4px; list-style:none; }
.bd-pv ul { margin:0; padding:0; } .bd-pv .bd-dim { color:var(--ink2); }
.bd-chip { display:inline-block; font-size:13.5px; color:var(--accent); border:1px solid rgba(138,202,255,.4); border-radius:99px; padding:4px 12px; margin:0 8px 8px 0; }
.bd-startbig { display:inline-flex; align-items:center; gap:10px; font:600 14.5px var(--sans); color:var(--accent); background:rgba(138,202,255,.07); border:1.5px solid var(--accent); border-radius:99px; padding:10px 20px; cursor:pointer; }
.bd-cal .bd-st { font-size:13px; color:var(--ink2); white-space:nowrap; }
.bd-cal.bd-done .bd-what, .bd-cal.bd-done .bd-when { color:var(--ink3); }
.bd-cal.bd-now .bd-what { color:var(--ink); } .bd-cal.bd-now .bd-st { color:var(--green); }
.bd-cal.bd-now { box-shadow:inset 2px 0 0 var(--green); padding-left:14px; margin-left:-14px; }
.bd-step { display:grid; grid-template-columns:minmax(0,1fr) auto; column-gap:14px; align-items:center; padding:11px 0; border-top:1px solid rgba(255,255,255,.07); }
.bd-step:first-of-type { border-top:0; padding-top:2px; }
.bd-step .bd-ms, .bd-det .bd-ms2 { font:500 16.5px/1.3 var(--serif); color:var(--ink); }
.bd-kind { font:500 13px var(--sans); color:var(--accent); margin-left:10px; white-space:nowrap; }
.bd-step .bd-tx, .bd-det .bd-tx2 { font-size:14.5px; line-height:1.45; color:var(--ink2); margin-top:3px; }
.bd-lg { display:grid; grid-template-columns:62px 14px minmax(0,1fr) 54px; column-gap:10px; align-items:start; }
.bd-lg .bd-lt { font-size:13px; color:var(--ink2); text-align:right; padding-top:3px; font-variant-numeric:tabular-nums; }
.bd-lg .bd-rail { position:relative; align-self:stretch; }
.bd-lg .bd-rail i { position:absolute; left:3px; top:7px; width:8px; height:8px; border-radius:99px; background:var(--c); box-shadow:0 0 0 3px color-mix(in srgb, var(--c) 18%, transparent); }
.bd-lg .bd-rail b { position:absolute; left:6.5px; top:20px; bottom:-4px; width:1px; background:rgba(255,255,255,.12); }
.bd-lg .bd-lb { padding-bottom:16px; }
.bd-tag { display:inline-block; font-size:12.5px; font-weight:500; color:var(--c); border:1px solid color-mix(in srgb, var(--c) 45%, transparent); border-radius:99px; padding:2px 10px; margin-bottom:5px; }
.bd-lg .bd-lx { font-size:14.5px; line-height:1.45; } .bd-lg .bd-lm { font-size:13px; color:var(--ink2); margin-top:2px; }
.bd-lg .bd-mi { text-align:right; font:500 15px var(--serif); color:var(--purple); padding-top:2px; font-variant-numeric:tabular-nums; }
.bd-gran { display:inline-grid; place-items:center; width:20px; height:20px; border-radius:6px; margin-left:8px; vertical-align:-4px; cursor:pointer; background:#1F3B2C; border:1px solid #57BE97; color:#8FE3BD; font:700 11px var(--sans); }
.bd-milesum { display:grid; grid-template-columns:minmax(0,1fr) auto; font-size:13.5px; color:var(--ink2); padding-top:10px; border-top:1px solid rgba(255,255,255,.08); }
.bd-milesum b { font:500 16px var(--serif); color:var(--purple); }
.bd-open.bd-on2 { border-color:var(--accent); background:rgba(138,202,255,.14); }
.bd-light { width:11px; height:11px; border-radius:99px; background:var(--c); display:inline-block; animation:lite 2.6s ease-in-out infinite; }
.bd-light.bd-fast { animation-duration:1.1s; }
@keyframes lite { 0%,100% { box-shadow:0 0 0 0 transparent } 50% { box-shadow:0 0 12px 3px color-mix(in srgb, var(--c) 60%, transparent) } }
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
// A section's light (David 11/18: "some kind of a light indicator for calendar, activity log, and proposed steps";
// 11/19, on the counts that sat here: "i don't like this AI text up here"). The light says the state; the reason
// is on hover. Green is fine, yellow is building, red is off.
// Proposed Steps (David 11/19): "15 was red. so maybe 10 is yellow. less than 10 is green."
const LIGHT = { green: 'var(--green)', yellow: '#F8C761', blue: 'var(--accent)', red: 'var(--red)' }
const stepsLight = (n) => ({ level: n >= 15 ? 'red' : n >= 10 ? 'yellow' : 'green', why: `${n} proposed step${n === 1 ? '' : 's'} waiting` })
const Light = ({ level, why }) => <span className={`bd-light${level === 'red' ? ' bd-fast' : ''}`} style={{ '--c': LIGHT[level] }} title={why} aria-label={why} />
// Placement after the mission's name: what kind of mission it is, and the gate the step touches, if any.
const Kind = ({ p }) => <span className="bd-kind">{[p.kind || 'Main Mission', p.gate].filter(Boolean).join(' · ')}</span>
// A log line's tag follows the Protocol readout and the Board, in their words and colors.
const TAGC = { 'Mission Run': '#B4A3E8', 'Looting Run': '#8ACAFF', 'In Mission': '#B4A3E8', 'In Meeting': '#8ACAFF', Comms: '#8ACAFF', Timers: '#8ACAFF', Release: '#B4A3E8', Protocols: '#B4A3E8', Utility: '#57BE97' }
const tagColor = (t) => t ? (t.includes('Secondary') ? '#8ACAFF' : t.includes('Utility') ? '#57BE97' : TAGC[t.split(' · ')[0]] || '#8ACAFF') : 'rgba(243,241,234,.4)'
const fmt = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
const LogRow = ({ r, last }) => (
  <div className="bd-lg" style={{ '--c': tagColor(r.tag) }}>
    <span className="bd-lt">{fmt(r.at)}</span>
    <span className="bd-rail"><i />{!last && <b />}</span>
    <div className="bd-lb">
      {r.tag && <span className="bd-tag">{r.tag}</span>}
      <div className="bd-lx">{r.text}{r.recorded && <span className="bd-gran" title="Recorded in Granola · open the notes">G</span>}</div>
      {r.meta && <div className="bd-lm">{r.meta}</div>}
    </div>
    <span className="bd-mi">{r.miles ? `+${r.miles}` : ''}</span>
  </div>
)
const Log = ({ only }) => {
  // Older lines (a kind and "10 miles" as prose) are read into the same shape: a tag, a miles figure, a recording mark.
  const shape = (r) => {
    const m = /^(\d+(?:\.\d+)?) miles?$/.exec(r.meta || '')
    const tag = r.tag || (r.kind === 'Meeting' ? 'In Meeting' : r.kind === 'Main Mission' ? 'In Mission · Primary' : /^Run \d/.test(r.text || '') ? 'Mission Run' : null)
    return { ...r, tag, miles: r.miles ?? (m ? Number(m[1]) : 0), meta: m ? null : r.meta, recorded: r.recorded ?? r.documented }
  }
  const rows = D.log.map(shape).filter(r => !only || r.tag)
  return (
    <>
      {rows.map((r, i) => <LogRow key={i} r={r} last={i === rows.length - 1} />)}
      <div className="bd-milesum"><span>Miles From These Lines</span><b>{`+${rows.reduce((a, r) => a + (r.miles || 0), 0)}`}</b></div>
    </>
  )
}
const Open = ({ what, label, Icon, set }) => <button className="bd-open" title={label} aria-label={label} onClick={() => set(what)}><Icon size={15} strokeWidth={1.7} /></button>
const POPS = { calendar: 'Calendar', steps: 'Proposed Steps', commitments: 'Commitments', log: 'Activity Log', badges: 'Badges' }

function Dashboard() {
  const [view, setView] = useState(new URLSearchParams(location.search).get('view') === 'badges' ? 'Badges' : 'Today')
  const [tagged, setTagged] = useState(new URLSearchParams(location.search).get('tagged') === '1')
  const [open, setOpen] = useState(new URLSearchParams(location.search).get('open'))
  return (
    <div className="bd-shell sa-dark sa-app">
      <style>{CSS}</style>
      {open && open.startsWith('meeting:') && D.calendar[Number(open.slice(8))] && (() => {
        const e = D.calendar[Number(open.slice(8))], pv = { ...D.preview, ...(e.preview || {}) }
        return (
          <div className="bd-veil" onClick={() => setOpen(null)}>
            <div className="bd-pop" role="dialog" aria-label={e.title} onClick={ev => ev.stopPropagation()}>
              <div className="bd-pophead">
                <div><h2>{e.title}</h2><div>{`${e.from} to ${e.to} · ${pv.link}`}</div></div>
                <button className="bd-quiet" onClick={() => setOpen(null)}>Close</button>
              </div>
              <div className="bd-pv">
                <div><h3>{`Who Is There · ${pv.who.length}`}</h3><ul>{pv.who.map((w, k) => <li key={k}>{w}</li>)}</ul></div>
                <div><h3>What Lumen Found</h3>{pv.found.map((f, k) => <p key={k} className={f.startsWith('Inferred') ? 'bd-dim' : undefined}>{f}</p>)}</div>
                <div style={{ gridColumn: '1 / -1' }}><h3>Connected Missions</h3>{pv.missions.map((m, k) => <span key={k} className="bd-chip">{m}</span>)}</div>
              </div>
              <div className="bd-popfoot"><span>It ends on its own when you start something else, or when its time is up.</span><button className="bd-startbig"><Play size={14} fill="currentColor" />Start · Opens Zoom</button></div>
            </div>
          </div>
        )
      })()}
      {open && open.startsWith('notes:') && D.calendar[Number(open.slice(6))] && (() => {
        const e = D.calendar[Number(open.slice(6))]
        return (
          <div className="bd-veil" onClick={() => setOpen(null)}>
            <div className="bd-pop" role="dialog" aria-label={`Notes, ${e.title}`} onClick={ev => ev.stopPropagation()}>
              <div className="bd-pophead">
                <div><h2>{e.title}</h2><div>{`${e.from} to ${e.to} · Notes`}</div></div>
                <button className="bd-quiet" onClick={() => setOpen(null)}>Close</button>
              </div>
              <div className="bd-pv">
                <div><h3>Summary</h3>{D.notes.summary.map((f, k) => <p key={k}>{f}</p>)}</div>
                <div><h3>What Was Asked Of You</h3>{D.notes.asks.map((f, k) => <p key={k}>{f}</p>)}</div>
              </div>
              <div className="bd-popfoot"><span>From the meeting's notes, summarized by Lumen.</span><button className="bd-quiet">Open The Full Notes</button></div>
            </div>
          </div>
        )
      })()}
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
                    <div><div className="bd-ms2">{p.mission}<Kind p={p} /></div><div className="bd-tx2">{p.text}</div><div className="bd-ms" style={{ font: '13px var(--sans)', color: 'var(--ink3)', marginTop: 3 }}>{`From ${p.from || 'A Claude Session'}`}</div></div>
                    <div className="bd-yn"><button title="Accept" style={{ '--c': 'var(--purple)' }}><Check size={16} /></button><button title="Reject" style={{ '--c': 'rgba(243,241,234,.44)' }}><X size={16} /></button></div>
                  </div>
                ))}
                <div className="bd-popfoot"><span>{`${D.steps.length} Waiting · 0 Accepted · 0 Rejected Today`}</span><button className="bd-quiet">Accept All</button></div>
              </>
            )}
            {open === 'log' && <Log only={false} />}
            {open === 'commitments' && D.commitments.map((c, i) => (
              <div key={i} className="bd-det" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <div><div className="bd-ms2">{c.what}<span className={`bd-kind${c.late ? ' bd-late' : ''}`}>{c.by}</span></div><div className="bd-tx2">{c.heard}</div><div className="bd-tx2" style={{ color: 'var(--ink3)' }}>{c.quote}</div></div>
                <div className="bd-yn"><button title="Done" style={{ '--c': 'var(--purple)' }}><Check size={16} /></button><button title="Drop it" style={{ '--c': 'rgba(243,241,234,.44)' }}><X size={16} /></button></div>
              </div>
            ))}
            {open === 'calendar' && D.calendar.map((e, i) => (
              <div key={i} className={`bd-cal bd-${e.state}`} style={{ gridTemplateColumns: '150px minmax(0,1fr) auto' }}><span className="bd-when">{`${e.from} to ${e.to}`}</span><span className="bd-what">{e.title}</span><span className="bd-st">{e.state === 'done' ? 'Done' : e.state === 'now' ? 'Now' : ''}</span></div>
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

          <div className="bd-views">
            {['Today', 'Badges'].map(v => <button key={v} className={view === v ? 'bd-von' : undefined} onClick={() => setView(v)}>{v}</button>)}
          </div>

          {view === 'Today' ? (
            <>
              <div className="bd-row bd-wide">
                <SectionTag name="Calendar"><Light {...D.lights.calendar} /><Open what="calendar" label="The Day's Calendar" Icon={CalendarRange} set={setOpen} /></SectionTag>
                {D.calendar.map((e, i) => (
                  <div key={i} className={`bd-cal bd-${e.state}`}>
                    <button className={`bd-go2${e.state === 'done' ? ' bd-past' : e.state === 'now' ? ' bd-live2' : ''}`} title={e.state === 'now' ? 'On now' : 'Start · opens the Zoom link and starts the clock'}>{e.state === 'now' ? <Video size={14} /> : <Play size={13} fill="currentColor" style={{ marginLeft: 2 }} />}</button>
                    <span className="bd-when">{`${e.from} to ${e.to}`}</span>
                    <div><span className="bd-what" title="Open the preview" onClick={() => setOpen(`meeting:${i}`)}>{e.title}</span><div className="bd-cwho">{e.who || ''}</div></div>
                    <span className="bd-cread">{e.read || ''}</span>
                    <span>{e.mission ? <span className="bd-chip" style={{ margin: 0 }}>{e.mission}</span> : null}</span>
                    <span className="bd-st">{e.notes ? <button className="bd-notes" title="The notes are in · open them" aria-label="Open the notes" onClick={() => setOpen(`notes:${i}`)}><ScrollText size={14} strokeWidth={1.8} /></button> : e.state === 'done' ? 'Done' : e.state === 'now' ? 'Now' : ''}</span>
                  </div>
                ))}
              </div>

              <div className="bd-pair">
                <div className="bd-row">
                  <SectionTag name="Proposed Steps"><Light {...stepsLight(D.stepsWaiting ?? D.steps.length)} /><Open what="steps" label="The Day's Proposed Steps" Icon={PageIcon} set={setOpen} /></SectionTag>
                {D.steps.map((p, i) => (
                  <div key={i} className="bd-step">
                    <div><div className="bd-ms">{p.mission}<Kind p={p} /></div><div className="bd-tx">{p.text}</div></div>
                    <div className="bd-yn"><button title="Accept" style={{ '--c': 'var(--purple)' }}><Check size={16} /></button><button title="Reject" style={{ '--c': 'rgba(243,241,234,.44)' }}><X size={16} /></button></div>
                  </div>
                ))}
                </div>
                <div className="bd-row">
                  <SectionTag name="Commitments"><Light {...D.lights.commitments} /><button className="bd-open" title="Add one yourself" aria-label="Add a commitment"><Plus size={15} /></button><Open what="commitments" label="The Day's Commitments" Icon={Handshake} set={setOpen} /></SectionTag>
                  {D.commitments.map((c, i) => (
                    <div key={i} className="bd-step">
                      <div><div className="bd-ms">{c.what}<span className={`bd-kind${c.late ? ' bd-late' : ''}`}>{c.by}</span></div><div className="bd-tx">{c.heard}</div></div>
                      <div className="bd-yn"><button title="Done" style={{ '--c': 'var(--purple)' }}><Check size={16} /></button><button title="Drop it" style={{ '--c': 'rgba(243,241,234,.44)' }}><X size={16} /></button></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bd-row">
                <SectionTag name="Activity Log"><Light {...D.lights.log} /><button className={`bd-open${tagged ? ' bd-on2' : ''}`} title="Show only the lines that carry a tag" aria-pressed={tagged} onClick={() => setTagged(!tagged)}><Tag size={14} strokeWidth={1.8} /></button><Open what="log" label="The Day's Full Log" Icon={ScrollText} set={setOpen} /></SectionTag>
                <Log only={tagged} />
              </div>
            </>
          ) : (
            <div className="bd-row">
              <SectionTag name="Badges"><Open what="badges" label="The Day's Badges" Icon={Medal} set={setOpen} /></SectionTag>
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
          )}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><Dashboard /></StrictMode>)
