// Dev mock-up: the Bookshelf (David 11/24). "a bookshelf that has a container for a work product": one shelf for
// finished products he wants to hang onto and retrieve quickly, one for "an enduring vehicle until we're done", one
// for something "out in the wild and we're waiting". The shelf language is the Company Plan document's (a book, a
// laptop for an application, a television for a film). A picture to rule on: sample data only, nothing is read or
// written. ?open=<id> stages a container open.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, BookOpen, Activity, Award, FileText, Mountain, Briefcase, Target, Archive, Lightbulb, LibraryBig,
  Search, X, ExternalLink, Radio, Send, BookMarked, Check, Circle, Users, MapPin, CalendarClock, Layers, Eye, Undo2, PackageCheck } from 'lucide-react'

const NAV = [
  ['Landing', [[Waves, 'The River'], [Footprints, 'Journey']]],
  ['Monitor', [[CalendarDays, 'Board'], [BookOpen, 'Narrative And Analytics'], [Activity, 'Activity'], [Award, 'Accomplishments'], [FileText, 'Notes']]],
  ['Mission Board', [[Mountain, 'Main Missions'], [Briefcase, 'Clients'], [Target, 'Side Missions'], [LibraryBig, 'Bookshelf', true], [Archive, 'Archive']]],
  ['Ideas', [[Lightbulb, 'Ideas Board']]],
]

const GREEN = '#57BE97', BLUE = '#8ACAFF', PURPLE = '#B4A3E8'
const KIND = { book: 'A Document', app: 'An Application', film: 'A Short Film', deck: 'A Deck', letter: 'A Memorandum' }

// One container per work product. shelf: service | wild | library | cart.
const THINGS = [
  { id: 'app', shelf: 'service', form: 'app', title: 'Client Test Lab', author: 'Third Horizon', updated: 'November 24, 2026', color: GREEN,
    plate: 'Live', sub: 'Used Today · 14 Sign-Ins This Week', withWho: 'A Client Team', from: 'Client Mission · Gate 6', since: 'November 24, 2026',
    buttoned: [['Its Own Address', true], ['Access Code Set', true], ['Outside Party Named', true], ['Sign-Ins Watched', true], ['Sample Data Cleared', true], ['A Way To Roll Back', false]] },
  { id: 'memo', shelf: 'service', form: 'letter', title: 'Memorandum On Outstanding Balances', author: 'David Smith', updated: 'November 24, 2026', color: GREEN,
    plate: 'Third Edition', sub: 'Updated Today · Open Until The Balances Clear', withWho: 'A Lender', from: 'Side Mission · Payment Emails', since: 'November 19, 2026',
    editions: [['Third Edition', 'November 24', 'Two payments confirmed, one date moved'], ['Second Edition', 'November 21', 'Extension asked on one balance'], ['First Edition', 'November 19', 'The opening picture']] },
  { id: 'plan', shelf: 'service', form: 'book', title: 'The Operating Plan', author: 'Third Horizon', updated: 'November 22, 2026', color: GREEN, mix: 30,
    plate: 'Sixth Edition', sub: 'Updated Two Days Ago', withWho: 'The Team', from: 'Main Mission · Company Plan', since: 'October 6, 2026' },

  { id: 'pilot', shelf: 'wild', form: 'book', title: 'Proposal For A Pilot', author: 'Third Horizon', updated: 'November 18, 2026', color: BLUE,
    withWho: 'A Health System', from: 'Client Mission · Gate 2', since: 'November 18, 2026', day: 6, opened: 2, last: 'November 22' },
  { id: 'sow', shelf: 'wild', form: 'book', title: 'Statement Of Work, Year Two', author: 'Third Horizon', updated: 'November 21, 2026', color: BLUE, mix: 30,
    withWho: 'A Foundation', from: 'Client Mission · Gate 3', since: 'November 21, 2026', day: 3, opened: 0 },
  { id: 'deckout', shelf: 'wild', form: 'film', title: 'Our Growth Story', author: 'Third Horizon', updated: 'November 23, 2026', color: BLUE,
    withWho: 'Two Investors', from: 'Main Mission · Company Plan', since: 'November 23, 2026', day: 1, opened: 1, last: 'November 23' },

  { id: 'cart1', shelf: 'cart', form: 'book', title: 'Board Finance Review', from: 'Main Mission · Gate 4' },
  { id: 'cart2', shelf: 'cart', form: 'app', title: 'Lunch Order Page', from: 'Ad Hoc · November 10' },
]

// The Library: spines. [title, kind, year, height, tone 0..2]
const SPINES = [
  ['Medicaid Rate Benchmark, 2026', 'book', 2026, 232, 0], ['Parity Index, Year Three', 'book', 2026, 248, 1], ['Proposal, Signed · Health Plan', 'book', 2026, 216, 2],
  ['Quarterly Meeting Package', 'deck', 2026, 240, 0], ['Our Growth Story', 'film', 2026, 204, 1], ['Rate Compass Launch Plan', 'book', 2026, 252, 2],
  ['Network Map, Sixty Days', 'deck', 2026, 224, 0], ['Field Hub', 'app', 2026, 236, 1], ['Talent Assessment', 'book', 2026, 244, 2],
  ['Safety Net Paper One', 'book', 2025, 250, 1], ['Safety Net Paper Two', 'book', 2025, 250, 1], ['Charter', 'book', 2025, 212, 0],
  ['Price And Quality Index', 'app', 2025, 228, 2], ['Conference Keynote', 'deck', 2025, 238, 0],
]

const CSS = `
:root { --ink:#F3F1EA; --ink2:rgba(243,241,234,.70); --ink3:rgba(243,241,234,.44); --line:rgba(255,255,255,.12); --navy:#0F2334; --deep:#0D1D2C; --accent:#8ACAFF; --serif:'Lora',Georgia,serif; --sans:'Instrument Sans',system-ui,sans-serif; }
* { box-sizing:border-box; }
body { margin:0; background:var(--navy); color:var(--ink); font-family:var(--sans); }
button { font-family:inherit; cursor:pointer; color:inherit; }
.bk-shell { display:grid; grid-template-columns:248px 1fr; min-height:100vh; }
.bk-side { background:var(--deep); border-right:1px solid var(--line); padding:26px 18px; }
.bk-brand { font:500 19px var(--serif); padding-left:10px; }
.bk-grp { font-size:12.5px; color:var(--ink3); margin:26px 0 8px 10px; }
.bk-nav { display:flex; align-items:center; gap:12px; padding:8px 10px; border-radius:8px; font-size:14.5px; color:var(--ink2); }
.bk-nav.on { color:var(--ink); background:rgba(255,255,255,.06); box-shadow:inset 2px 0 0 var(--accent); }
.bk-page { padding:44px 44px 80px; max-width:1260px; width:100%; margin:0 auto; }
.bk-head { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:34px; }
h1 { font:500 40px/1.1 var(--serif); letter-spacing:-.008em; margin:0; }
.bk-find { display:flex; align-items:center; gap:10px; border:1px solid var(--line); border-radius:999px; padding:9px 18px; color:var(--ink3); font-size:14.5px; width:300px; }

/* the section tag (canon): a tick, the name on the line, the hairline, one short count at the far end */
.bk-tag { display:flex; align-items:center; gap:14px; margin:0 0 6px; }
.bk-tag i { width:26px; height:2px; border-radius:2px; background:var(--c); flex:none; }
.bk-tag b { font:500 19px/1 var(--serif); white-space:nowrap; }
.bk-tag u { flex:1; height:1px; background:var(--line); }
.bk-tag span { font-size:13.5px; color:var(--ink2); white-space:nowrap; }
.bk-sec { margin-bottom:54px; }

/* the cart: finished work waiting to be buttoned up and shelved */
.bk-cart { display:flex; gap:14px; margin-top:20px; }
.bk-ct { display:flex; align-items:center; gap:14px; border:1px dashed rgba(255,255,255,.22); border-radius:12px; padding:12px 14px 12px 18px; }
.bk-ct .t { font:500 16px/1.25 var(--serif); }
.bk-ct .m { font-size:13px; color:var(--ink2); margin-top:3px; }
.bk-ib { width:38px; height:38px; border-radius:99px; display:inline-grid; place-items:center; border:1.5px solid var(--c, rgba(243,241,234,.3)); color:var(--c, var(--ink2)); background:transparent; flex:none; }
.bk-ib:hover { background:color-mix(in srgb, var(--c, #fff) 14%, transparent); }

/* a row of things and the plank they stand on */
.bk-row { position:relative; display:flex; flex-wrap:wrap; align-items:flex-end; gap:0 56px; padding:34px 30px 0; min-height:330px; }
.bk-plank { height:10px; border-radius:2px; background:linear-gradient(to bottom, rgba(255,255,255,.16), rgba(255,255,255,.07)); box-shadow:0 14px 22px -8px rgba(0,0,0,.55); }
.bk-plates { display:flex; gap:0 56px; padding:14px 30px 0; }
.bk-thing { padding:0; margin:0; background:none; border:none; text-align:left; display:block; transform-origin:50% 100%; transition:transform .2s ease; }
.bk-thing:hover { transform:translateY(-9px) rotate(-1.3deg); }
.bk-plate { font-size:13.5px; line-height:1.45; color:var(--ink2); }
.bk-plate b { display:flex; align-items:center; gap:8px; font-weight:600; font-size:14.5px; color:var(--c); }
.bk-lamp { width:8px; height:8px; border-radius:99px; background:var(--c); box-shadow:0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent); animation:bk-pulse 2.2s ease-in-out infinite; }
@keyframes bk-pulse { 50% { box-shadow:0 0 0 7px color-mix(in srgb, var(--c) 6%, transparent); } }

/* the label a thing carries: what a book's cover says */
.bk-mark { display:block; width:34px; height:20px; }
.bk-mark path { fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; }
.bk-lt { font:500 18px/1.18 var(--serif); letter-spacing:-.005em; }
.bk-la { font-size:13px; font-weight:500; margin-top:5px; }
.bk-lr { display:block; width:36px; height:2px; background:currentColor; opacity:.7; margin:9px 0 7px; }
.bk-li { font-size:12px; line-height:1.35; color:rgba(243,241,234,.78); }

/* the book */
.bk-cover { position:relative; width:208px; height:300px; display:flex; flex-direction:column; padding:20px 18px 16px 34px; color:var(--ink);
  background:linear-gradient(135deg, color-mix(in srgb, var(--c) calc(var(--mix) + 10%), var(--deep)), color-mix(in srgb, var(--c) var(--mix), var(--deep)));
  border-radius:3px 9px 9px 3px; box-shadow:5px 0 0 -1px #E9E4D6, 6px 0 0 -1px rgba(13,29,44,.5), 9px 0 0 -2px #DDD7C6, 0 0 0 1px rgba(255,255,255,.1) inset, 14px -4px 26px -10px rgba(0,0,0,.6); }
.bk-cover::before { content:""; position:absolute; left:0; top:0; bottom:0; width:16px; border-radius:3px 0 0 3px; background:rgba(13,29,44,.28); border-right:1px solid rgba(255,255,255,.2); }
.bk-cover::after { content:""; position:absolute; right:22px; top:-5px; width:14px; height:46px; background:var(--ink); opacity:.92; clip-path:polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
.bk-cover .sp { flex:1; }
.bk-cover .bk-lt { font-size:21px; }

/* the application: a laptop, its label on the deck */
.bk-laptop { display:flex; flex-direction:column; align-items:center; width:300px; filter:drop-shadow(14px -4px 14px rgba(0,0,0,.42)); }
.bk-lid { position:relative; width:278px; padding:11px 8px 9px; background:linear-gradient(180deg, #1C2833, #0D151C); border-radius:10px 10px 2px 2px; box-shadow:0 0 0 1px rgba(255,255,255,.12) inset; }
.bk-screen { display:grid; grid-template-columns:54px 1fr; height:132px; background:var(--deep); border-radius:2px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.08); }
.bk-screen .nv { background:rgba(255,255,255,.05); padding:10px 8px; display:grid; gap:7px; align-content:start; }
.bk-screen .nv i { display:block; height:5px; border-radius:3px; background:rgba(243,241,234,.22); }
.bk-screen .nv i:first-child { background:var(--c); }
.bk-screen .pg { padding:12px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:7px; align-content:start; }
.bk-screen .pg em { grid-column:1 / -1; display:block; height:8px; width:46%; border-radius:3px; background:rgba(243,241,234,.5); }
.bk-screen .pg i { display:block; height:38px; border-radius:4px; background:color-mix(in srgb, var(--c) 30%, transparent); }
.bk-screen .pg u { grid-column:1 / -1; display:block; height:30px; border-radius:4px; background:rgba(255,255,255,.07); }
.bk-hinge { width:278px; height:4px; background:#070C11; border-radius:0 0 2px 2px; }
.bk-deck { position:relative; width:300px; height:118px; padding:9px 30px 0; clip-path:polygon(11px 0, calc(100% - 11px) 0, 100% 100%, 0 100%);
  background:linear-gradient(135deg, color-mix(in srgb, var(--c) 54%, var(--deep)), color-mix(in srgb, var(--c) 44%, var(--deep))); }
.bk-deck .ky { height:10px; margin:0 0 8px; border-radius:2px; background:repeating-linear-gradient(90deg, rgba(13,29,44,.4) 0 13px, transparent 13px 17px); }
.bk-deck .bk-lt { font-size:17px; }

/* the film: a television, its label the picture on the tube */
.bk-tv { display:flex; flex-direction:column; align-items:center; width:286px; filter:drop-shadow(14px -4px 14px rgba(0,0,0,.42)); }
.bk-ears { display:block; width:108px; height:40px; }
.bk-ears path { fill:none; stroke:rgba(243,241,234,.5); stroke-width:2; stroke-linecap:round; }
.bk-ears circle { fill:rgba(243,241,234,.72); }
.bk-tvb { display:flex; gap:10px; width:286px; height:204px; padding:12px; background:linear-gradient(180deg, #1C2833, #0D151C); border-radius:16px; box-shadow:0 0 0 1px rgba(255,255,255,.1) inset; }
.bk-tube { flex:1; min-width:0; padding:16px; border-radius:18px / 22px; box-shadow:0 0 0 3px #05090D, 0 0 0 4px rgba(255,255,255,.14), 0 0 26px rgba(4,10,16,.55) inset;
  background:linear-gradient(135deg, color-mix(in srgb, var(--c) 54%, var(--deep)), color-mix(in srgb, var(--c) 44%, var(--deep))); }
.bk-tvs { flex:none; width:38px; display:flex; flex-direction:column; align-items:center; gap:10px; padding-top:6px; }
.bk-knob { width:26px; height:26px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #3A4753, #151E26); box-shadow:0 0 0 1px rgba(255,255,255,.14); }
.bk-grille { flex:1; width:26px; margin-bottom:6px; background:repeating-linear-gradient(180deg, rgba(255,255,255,.17) 0 2px, transparent 2px 7px); }
.bk-feet { display:flex; justify-content:space-between; width:210px; height:11px; }
.bk-feet i { width:32px; height:11px; background:#080D12; clip-path:polygon(14% 0, 86% 0, 100% 100%, 0 100%); }

/* the memorandum: a letter standing in its envelope, the sheet rising out of it */
.bk-letter { display:block; position:relative; width:238px; height:270px; filter:drop-shadow(14px -4px 14px rgba(0,0,0,.42)); }
.bk-sheet { display:block; position:absolute; left:16px; right:16px; top:0; height:200px; padding:18px 18px 0; background:#EFEBDD; color:#16314A; border-radius:3px 3px 0 0; box-shadow:0 0 0 1px rgba(13,29,44,.12) inset; }
.bk-sheet .bk-lt { font-size:17px; } .bk-sheet .bk-li { color:rgba(22,49,74,.72); } .bk-sheet .bk-mark { color:#16314A; margin-bottom:10px; }
.bk-env { display:block; position:absolute; left:0; right:0; bottom:0; height:132px; border-radius:4px;
  background:linear-gradient(135deg, color-mix(in srgb, var(--c) 54%, var(--deep)), color-mix(in srgb, var(--c) 44%, var(--deep))); box-shadow:0 0 0 1px rgba(255,255,255,.12) inset; }
.bk-env::before { content:""; position:absolute; inset:0; background:rgba(13,29,44,.2); clip-path:polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%); border-radius:4px; }
.bk-env span { position:absolute; left:18px; bottom:14px; font-size:13px; font-weight:500; color:var(--ink); }

/* out in the wild: the place on the shelf is held, the thing is gone, a card says who has it */
.bk-out { position:relative; }
.bk-ghost { opacity:.34; filter:saturate(.5); }
.bk-ghost .bk-cover, .bk-ghost .bk-tvb { box-shadow:none; outline:1.5px dashed rgba(243,241,234,.7); outline-offset:3px; }
.bk-card { display:block; position:absolute; left:50%; bottom:22px; width:200px; margin-left:-84px; padding:13px 15px 12px; background:#EFEBDD; color:#16314A; border-radius:4px; transform:rotate(-2.4deg); box-shadow:0 10px 22px -8px rgba(0,0,0,.7); }
.bk-card::before { content:""; position:absolute; left:50%; top:-7px; width:12px; height:12px; margin-left:-6px; border-radius:99px; background:var(--c); box-shadow:0 1px 2px rgba(0,0,0,.4); }
.bk-card .w { font-size:12.5px; color:rgba(22,49,74,.66); }
.bk-card .p { font:500 17px/1.2 var(--serif); margin-top:1px; }
.bk-card .d { display:flex; align-items:baseline; gap:7px; margin-top:9px; padding-top:8px; border-top:1px solid rgba(22,49,74,.18); }
.bk-card .d b { font:500 24px/1 var(--serif); white-space:nowrap; }
.bk-card .d span { font-size:12.5px; color:rgba(22,49,74,.72); }
.bk-card .o { display:flex; align-items:center; gap:6px; font-size:12.5px; margin-top:7px; color:#16314A; }
.bk-card .o.no { color:rgba(22,49,74,.5); }

/* the library: spines, tight, by year */
.bk-lib { display:flex; align-items:flex-end; gap:5px; padding:34px 30px 0; min-height:296px; }
.bk-yr { align-self:flex-end; font:500 15px var(--serif); color:var(--ink2); writing-mode:vertical-rl; transform:rotate(180deg); padding:0 4px 0 12px; margin-bottom:6px; }
.bk-spine { position:relative; width:46px; padding:14px 0 12px; border:none; border-radius:3px 3px 1px 1px; display:flex; flex-direction:column; align-items:center; gap:10px; color:var(--ink);
  background:linear-gradient(90deg, color-mix(in srgb, var(--c) calc(var(--mix) + 12%), var(--deep)), color-mix(in srgb, var(--c) var(--mix), var(--deep)) 60%, color-mix(in srgb, var(--c) calc(var(--mix) - 10%), var(--deep)));
  box-shadow:0 0 0 1px rgba(255,255,255,.09) inset; transform-origin:50% 100%; transition:transform .18s ease; }
.bk-spine:hover { transform:translateY(-14px); }
.bk-spine .t { flex:1; min-height:0; writing-mode:vertical-rl; font:500 14.5px/1.1 var(--serif); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bk-spine svg { flex:none; opacity:.85; }
.bk-spine::after { content:""; position:absolute; left:6px; right:6px; bottom:30px; height:1px; background:rgba(243,241,234,.35); }
.bk-lean { transform:rotate(7deg) translateX(8px); transform-origin:100% 100%; margin-left:6px; }
.bk-lean:hover { transform:rotate(7deg) translate(8px,-14px); }

/* an open container */
.bk-veil { position:fixed; inset:0; background:rgba(6,14,22,.72); backdrop-filter:blur(3px); display:grid; place-items:center; z-index:20; }
.bk-case { width:min(940px, 92vw); display:grid; grid-template-columns:auto 1fr; gap:48px; align-items:center; background:var(--deep); border:1px solid var(--line); border-radius:18px; padding:44px 48px; position:relative; }
.bk-case h2 { font:500 30px/1.15 var(--serif); letter-spacing:-.008em; margin:0; }
.bk-x { position:absolute; right:18px; top:18px; }
.bk-facts { display:grid; gap:11px; margin-top:22px; }
.bk-fact { display:grid; grid-template-columns:22px 118px 1fr; gap:10px; align-items:center; font-size:14.5px; }
.bk-fact svg { color:var(--c); } .bk-fact span { color:var(--ink2); }
.bk-sub { font:500 17px var(--serif); margin:26px 0 10px; }
.bk-chk { display:grid; grid-template-columns:1fr 1fr; gap:8px 22px; }
.bk-chk div { display:flex; align-items:center; gap:10px; font-size:14.5px; }
.bk-chk .y svg { color:var(--c); } .bk-chk .n { color:var(--ink3); }
.bk-ed { display:grid; grid-template-columns:128px 104px 1fr; gap:10px; font-size:14.5px; padding:8px 0; border-top:1px solid rgba(255,255,255,.07); }
.bk-ed span { color:var(--ink2); }
.bk-acts { display:flex; gap:22px; margin-top:28px; padding-top:22px; border-top:1px solid var(--line); }
.bk-act { display:grid; justify-items:center; gap:7px; background:none; border:none; padding:0; font-size:13px; color:var(--ink2); }
.bk-act .bk-ib { width:46px; height:46px; }
.bk-act.on { color:var(--ink); } .bk-act.on .bk-ib { background:color-mix(in srgb, var(--c) 20%, transparent); }
`

const Mark = () => <svg className="bk-mark" viewBox="0 0 34 20" aria-hidden="true"><path d="M2 18 A15 15 0 0 1 32 18" /><path d="M8 18 A9 9 0 0 1 26 18" /><path d="M13.5 18 A3.5 3.5 0 0 1 20.5 18" /></svg>
const Label = ({ t, noMark }) => (<>
  {!noMark && <Mark />}
  <div className="bk-lt" style={noMark ? undefined : { marginTop: 10 }}>{t.title}</div>
  <div className="bk-la">{t.author}</div>
  <i className="bk-lr" />
  <div className="bk-li">{KIND[t.form]}</div>
  <div className="bk-li">Updated {t.updated}</div>
</>)

function Form({ t }) {
  const st = { '--c': t.color, '--mix': `${t.mix || 44}%` }
  if (t.form === 'app') return (
    <span className="bk-laptop" style={st}>
      <span className="bk-lid"><span className="bk-screen"><span className="nv"><i /><i /><i /><i /></span><span className="pg"><em /><i /><i /><i /><u /></span></span></span>
      <span className="bk-hinge" />
      <span className="bk-deck"><div className="ky" /><div className="bk-lt">{t.title}</div><div className="bk-la">{t.author}</div><i className="bk-lr" /><div className="bk-li">{KIND.app}</div></span>
    </span>)
  if (t.form === 'film') return (
    <span className="bk-tv" style={st}>
      <svg className="bk-ears" viewBox="0 0 120 46" aria-hidden="true"><path d="M60 46 L18 5 M60 46 L103 9" /><circle cx="18" cy="5" r="3.2" /><circle cx="103" cy="9" r="3.2" /></svg>
      <span className="bk-tvb"><span className="bk-tube"><Label t={t} /></span><span className="bk-tvs"><i className="bk-knob" /><i className="bk-knob" /><i className="bk-grille" /></span></span>
      <span className="bk-feet"><i /><i /></span>
    </span>)
  if (t.form === 'letter') return (
    <span className="bk-letter" style={st}>
      <span className="bk-sheet"><Mark /><div className="bk-lt">{t.title}</div><i className="bk-lr" /><div className="bk-li">{KIND.letter}</div></span>
      <span className="bk-env"><span>{t.author}</span></span>
    </span>)
  return <span className="bk-cover" style={st}><Mark /><span className="sp" /><Label t={t} noMark /></span>
}

const Tag = ({ name, c, children }) => <div className="bk-tag" style={{ '--c': c }}><i /><b>{name}</b><u />{children && <span>{children}</span>}</div>
const widthOf = (t) => ({ app: 300, film: 286, letter: 238, book: 217 }[t.form])
const SpineIcon = { book: BookMarked, deck: Layers, film: Radio, app: PackageCheck }

function Case({ t, onClose }) {
  const c = t.color
  const acts = [['service', Radio, 'In Service', GREEN], ['wild', Send, 'Out In The Wild', BLUE], ['library', BookMarked, 'The Library', PURPLE]]
  return (
    <div className="bk-veil" onClick={onClose}>
      <div className="bk-case" style={{ '--c': c }} onClick={e => e.stopPropagation()}>
        <button className="bk-ib bk-x" title="Close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        <Form t={t} />
        <div>
          <h2>{t.title}</h2>
          <div className="bk-facts">
            <div className="bk-fact"><Users size={17} /><span>With</span>{t.withWho}</div>
            <div className="bk-fact"><MapPin size={17} /><span>Came From</span>{t.from}</div>
            <div className="bk-fact"><CalendarClock size={17} /><span>{t.shelf === 'wild' ? 'Sent' : 'On The Shelf Since'}</span>{t.since}{t.day ? ` · Day ${t.day}` : ''}</div>
            {t.shelf === 'wild' && <div className="bk-fact"><Eye size={17} /><span>Opened</span>{t.opened ? `${t.opened} Times · Last ${t.last}` : 'Not Yet'}</div>}
          </div>
          {t.buttoned && <><div className="bk-sub">Buttoned Up</div>
            <div className="bk-chk">{t.buttoned.map(([w, y]) => <div key={w} className={y ? 'y' : 'n'}>{y ? <Check size={17} strokeWidth={2.4} /> : <Circle size={17} />}{w}</div>)}</div></>}
          {t.editions && <><div className="bk-sub">Editions</div>
            {t.editions.map(([e, d, w]) => <div key={e} className="bk-ed"><b style={{ fontWeight: 600 }}>{e}</b><span>{d}</span><span>{w}</span></div>)}</>}
          <div className="bk-acts">
            <button className="bk-act on" style={{ '--c': INKC }}><span className="bk-ib" style={{ '--c': INKC }}><ExternalLink size={19} /></span>Open It</button>
            {acts.map(([k, I, l, col]) => <button key={k} className={`bk-act${t.shelf === k ? ' on' : ''}`} style={{ '--c': col }}><span className="bk-ib"><I size={19} /></span>{l}</button>)}
          </div>
        </div>
      </div>
    </div>)
}
const INKC = '#F3F1EA'

function App() {
  const q = new URLSearchParams(window.location.search)
  const [open, setOpen] = useState(q.get('open'))
  const on = (shelf) => THINGS.filter(t => t.shelf === shelf)
  const opened = THINGS.find(t => t.id === open)
  return (
    <div className="bk-shell"><style>{CSS}</style>
      <aside className="bk-side">
        <div className="bk-brand">Lumen</div>
        {NAV.map(([g, items]) => <div key={g}><div className="bk-grp">{g}</div>{items.map(([I, l, here]) => <div key={l} className={`bk-nav${here ? ' on' : ''}`}><I size={17} strokeWidth={1.7} />{l}</div>)}</div>)}
      </aside>
      <main className="bk-page">
        <div className="bk-head"><h1>Bookshelf</h1><div className="bk-find"><Search size={16} />Find A Book</div></div>

        <section className="bk-sec">
          <Tag name="On The Cart" c={INKC}>2 To Shelve</Tag>
          <div className="bk-cart">{on('cart').map(t => (
            <div key={t.id} className="bk-ct"><div><div className="t">{t.title}</div><div className="m">{t.from}</div></div>
              <button className="bk-ib" style={{ '--c': BLUE }} title="Button It Up And Shelve It" aria-label={`Button up and shelve ${t.title}`}><PackageCheck size={18} /></button></div>))}</div>
        </section>

        <section className="bk-sec">
          <Tag name="In Service" c={GREEN}>3 Live</Tag>
          <div className="bk-row">{on('service').map(t => <button key={t.id} className="bk-thing" onClick={() => setOpen(t.id)} aria-label={`Open ${t.title}`}><Form t={t} /></button>)}</div>
          <div className="bk-plank" />
          <div className="bk-plates">{on('service').map(t => <div key={t.id} className="bk-plate" style={{ width: widthOf(t), '--c': GREEN }}><b><i className="bk-lamp" />{t.plate}</b>{t.sub}</div>)}</div>
        </section>

        <section className="bk-sec">
          <Tag name="Out In The Wild" c={BLUE}>3 Waiting</Tag>
          <div className="bk-row">{on('wild').map(t => (
            <button key={t.id} className="bk-thing bk-out" onClick={() => setOpen(t.id)} aria-label={`Open ${t.title}`} style={{ '--c': BLUE }}>
              <span className="bk-ghost" style={{ display: 'block' }}><Form t={t} /></span>
              <span className="bk-card"><div className="w">Out With</div><div className="p">{t.withWho}</div>
                <div className="d"><b>Day {t.day}</b><span>Since {t.since.replace(', 2026', '').replace('November', 'Nov')}</span></div>
                <div className={`o${t.opened ? '' : ' no'}`}><Eye size={14} />{t.opened ? `Opened ${t.opened === 1 ? 'Once' : `${t.opened} Times`} · Last ${t.last.replace('November', 'Nov')}` : 'Not Opened Yet'}</div></span>
            </button>))}</div>
          <div className="bk-plank" />
        </section>

        <section className="bk-sec">
          <Tag name="The Library" c={PURPLE}>14 Kept</Tag>
          <div className="bk-lib">{SPINES.map(([title, kind, yr, h, tone], i) => {
            const I = SpineIcon[kind], head = i === 0 || SPINES[i - 1][2] !== yr
            return [head && <span key={`y${yr}`} className="bk-yr" style={i ? { marginLeft: 26 } : undefined}>{yr}</span>,
              <button key={title} className={`bk-spine${i === 8 || i === SPINES.length - 1 ? ' bk-lean' : ''}`} title={title} aria-label={`Open ${title}`} style={{ height: h, '--c': PURPLE, '--mix': `${[46, 30, 60][tone]}%` }}>
                <span className="t">{title}</span><I size={15} strokeWidth={1.8} /></button>]
          })}</div>
          <div className="bk-plank" />
        </section>
      </main>
      {opened && <Case t={opened} onClose={() => setOpen(null)} />}
    </div>)
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
