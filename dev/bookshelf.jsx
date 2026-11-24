// Dev mock-up: the Bookshelf (David 11/24). "a bookshelf that has a container for a work product": one shelf for
// finished products he wants to hang onto and retrieve quickly, one for "an enduring vehicle until we're done", one
// for something "out in the wild and we're waiting". The shelf language is the Company Plan document's (a book, a
// laptop for an application, a television for a film). A picture to rule on: sample data only, nothing is read or
// written. ?open=<id> stages a container open, ?std=1 the standard.
//
// The standard (David 11/24: "let's create a standard for an app, a "document", an "application", a proposal, a personal
// writing, i should be able to "open" or "close" and the system should organize accordingly"): every work product is
// one of a few kinds, each kind has one form on the shelf, and each container is open or closed. Nobody picks a shelf.
// Open and in use stands In Service; open and waiting on someone's answer is Out In The Wild; closed is The Library.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waves, Footprints, CalendarDays, BookOpen, Activity, Award, FileText, Mountain, Briefcase, Target, Archive, Lightbulb, LibraryBig,
  Search, X, ExternalLink, Radio, BookMarked, Check, Circle, Users, MapPin, CalendarClock, Eye, PackageCheck, Package, AppWindow, FileText as Doc, Mail, Feather, Tv, Ruler, BookOpenCheck, BookLock } from 'lucide-react'

const NAV = [
  ['Landing', [[Waves, 'The River'], [Footprints, 'Journey']]],
  ['Monitor', [[CalendarDays, 'Board'], [BookOpen, 'Narrative And Analytics'], [Activity, 'Activity'], [Award, 'Accomplishments'], [FileText, 'Notes']]],
  ['Mission Board', [[Mountain, 'Main Missions'], [Briefcase, 'Clients'], [Target, 'Side Missions'], [LibraryBig, 'Bookshelf', true], [Archive, 'Archive']]],
  ['Ideas', [[Lightbulb, 'Ideas Board']]],
]

const GREEN = '#57BE97', BLUE = '#8ACAFF', PURPLE = '#B4A3E8', INKC = '#F3F1EA'
// The standard: a kind, the form it takes on a shelf, and where it stands when it is open.
const STD = {
  // Two kinds of application (David 11/24): "the window for an application tool like a Relationship Platform. Any
  // standing application that i ship as a stand alone for the masses.... that's the software box. And let's use our
  // purple color here."
  app: { name: 'An Application', form: 'app', look: 'window', icon: AppWindow, open: 'service', openIs: 'Live, in use by the people it was built for', closedIs: 'Retired, kept as it last stood' },
  software: { name: 'A Standalone Application', form: 'app', look: 'box', icon: Package, open: 'service', openIs: 'Shipped, standing on its own for anyone', closedIs: 'Withdrawn, the last release kept' },
  doc: { name: 'A Document', form: 'book', icon: Doc, open: 'service', openIs: 'A living document, a new edition each time it changes', closedIs: 'Final, the last edition kept' },
  proposal: { name: 'A Proposal', form: 'letter', icon: Mail, open: 'wild', openIs: 'Sent, waiting on an answer', closedIs: 'Answered, kept with how it came back' },
  writing: { name: 'A Personal Writing', form: 'notebook', icon: Feather, open: 'service', openIs: 'Being written', closedIs: 'Finished, kept' },
  film: { name: 'A Short Film', form: 'film', icon: Tv, open: 'service', openIs: 'Showing, the current cut', closedIs: 'The final cut, kept' },
}
const APP_LOOK = new URLSearchParams(window.location.search).get('app') || 'window'
const APP_LOOKS = [['laptop', 'Laptop'], ['monitor', 'Monitor'], ['tablet', 'Tablet'], ['window', 'Window'], ['box', 'Software Box']]
const shelfOf = (t) => t.cart ? 'cart' : !t.open ? 'library' : STD[t.kind].open
const SHELF = { service: ['In Service', GREEN], wild: ['Out In The Wild', BLUE], library: ['The Library', PURPLE] }

// One container per work product: its kind, and whether it is open.
const THINGS = [
  { id: 'app', kind: 'app', open: true, title: 'Client Test Lab', author: 'Third Horizon', updated: 'November 24, 2026',
    plate: 'Live', sub: 'Used Today · 14 Sign-Ins This Week', withWho: 'A Client Team', from: 'Client Mission · Gate 6', since: 'November 24, 2026',
    buttoned: [['Its Own Address', true], ['Access Code Set', true], ['Outside Party Named', true], ['Sign-Ins Watched', true], ['Sample Data Cleared', true], ['A Way To Roll Back', false]] },
  { id: 'memo', kind: 'doc', open: true, title: 'Memorandum On Outstanding Balances', author: 'David Smith', updated: 'November 24, 2026',
    plate: 'Third Edition', sub: 'Updated Today', withWho: 'A Lender', from: 'Side Mission · Payment Emails', since: 'November 19, 2026',
    editions: [['Third Edition', 'November 24', 'Two payments confirmed, one date moved'], ['Second Edition', 'November 21', 'Extension asked on one balance'], ['First Edition', 'November 19', 'The opening picture']] },
  { id: 'index', kind: 'software', open: true, title: 'Price And Quality Index', author: 'Third Horizon', updated: 'November 12, 2026',
    plate: 'Release 2.1', sub: 'Shipped November 12 · 212 Subscribers', withWho: 'Anyone Who Subscribes', from: 'Main Mission · Gate 5', since: 'September 1, 2026',
    buttoned: [['Its Own Address', true], ['Sign-Up And Billing', true], ['Terms Posted', true], ['Support Inbox', true], ['Usage Watched', true], ['A Way To Roll Back', true]] },
  { id: 'essay', kind: 'writing', open: true, title: 'The Case For Boring Infrastructure', author: 'David Smith', updated: 'November 20, 2026',
    plate: 'Second Draft', sub: 'Last Written In Four Days Ago', withWho: 'No One Yet', from: 'Ideas Board · Essays', since: 'October 19, 2026' },

  { id: 'pilot', kind: 'proposal', open: true, title: 'Proposal For A Pilot', author: 'Third Horizon', updated: 'November 18, 2026',
    withWho: 'A Health System', what: 'A six-month pilot of the rate benchmark across four behavioral health service lines.', ask: '$180,000', term: 'January To June 2027 · Fixed Fee', from: 'Client Mission · Gate 2', since: 'November 18, 2026', day: 6, opened: 2, last: 'November 22' },
  { id: 'sow', kind: 'proposal', open: true, title: 'Statement Of Work, Year Two', author: 'Third Horizon', updated: 'November 21, 2026',
    withWho: 'A Foundation', what: 'The second year of the measurement program: the annual index, two briefings, the public dashboard.', ask: '$325,000', term: 'October 2026 To June 2027', from: 'Client Mission · Gate 3', since: 'November 21, 2026', day: 3, opened: 0 },

  { id: 'plan', kind: 'doc', open: false, year: 2026, title: 'The Operating Plan', author: 'Third Horizon', updated: 'November 22, 2026', withWho: 'The Team', from: 'Main Mission · Company Plan', since: 'October 6, 2026', closed: 'November 22, 2026' },
  { id: 'growth', kind: 'film', open: false, year: 2026, title: 'Our Growth Story', author: 'Third Horizon', updated: 'November 23, 2026', withWho: 'The Team', from: 'Main Mission · Company Plan', since: 'November 23, 2026', closed: 'November 23, 2026' },

  { id: 'cart1', cart: true, kind: 'doc', title: 'Board Finance Review', author: 'Third Horizon', updated: 'November 24, 2026', from: 'Main Mission · Gate 4', since: 'November 24, 2026', withWho: 'The Board', plate: 'First Edition', sub: 'Shelved Today' },
  { id: 'cart2', cart: true, kind: 'app', title: 'Lunch Order Page', author: 'Third Horizon', updated: 'November 24, 2026', from: 'Ad Hoc · November 10', since: 'November 24, 2026', withWho: 'A Client Team', plate: 'Live', sub: 'Shelved Today' },
]

// The Library: spines. [title, kind, year, height, tone 0..2]
const SPINES = [
  ['Medicaid Rate Benchmark, 2026', 'doc', 2026, 232, 0], ['Parity Index, Year Three', 'doc', 2026, 248, 1], ['Proposal, Signed · Health Plan', 'proposal', 2026, 216, 2],
  ['Quarterly Meeting Package', 'doc', 2026, 240, 0], ['Rate Compass Launch Plan', 'doc', 2026, 252, 2],
  ['Field Hub', 'app', 2026, 236, 1], ['Talent Assessment', 'doc', 2026, 244, 2],
  ['Safety Net Paper One', 'doc', 2025, 250, 1], ['Safety Net Paper Two', 'doc', 2025, 250, 1], ['Charter', 'doc', 2025, 212, 0],
  ['Rate Lookup, First Release', 'software', 2025, 228, 2], ['Pilot Proposal, Declined', 'proposal', 2025, 220, 0], ['Night Shift, An Essay', 'writing', 2025, 206, 1],
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

/* other forms for an application (David 11/24: "can we try a different graphic for the laptop?"), ?app=<look> or ?alt=1 */
.bk-scr { display:grid; grid-template-columns:54px 1fr; background:var(--deep); overflow:hidden; }
.bk-scr .nv { background:rgba(255,255,255,.05); padding:10px 8px; display:grid; gap:7px; align-content:start; }
.bk-scr .nv i { display:block; height:5px; border-radius:3px; background:rgba(243,241,234,.22); } .bk-scr .nv i:first-child { background:var(--c); }
.bk-scr .lb { padding:14px 16px; background:linear-gradient(135deg, color-mix(in srgb, var(--c) 54%, var(--deep)), color-mix(in srgb, var(--c) 44%, var(--deep))); }
.bk-mon { display:flex; flex-direction:column; align-items:center; width:300px; filter:drop-shadow(14px -4px 14px rgba(0,0,0,.42)); }
.bk-mon .bz { width:300px; padding:10px 10px 22px; background:linear-gradient(180deg, #1C2833, #0D151C); border-radius:12px; box-shadow:0 0 0 1px rgba(255,255,255,.12) inset; position:relative; }
.bk-mon .bz::after { content:""; position:absolute; left:50%; bottom:8px; width:6px; height:6px; margin-left:-3px; border-radius:50%; background:var(--c); }
.bk-mon .bk-scr { height:178px; border-radius:3px; }
.bk-mon .nk { width:46px; height:34px; background:linear-gradient(90deg, #0D151C, #1C2833, #0D151C); }
.bk-mon .bs { width:150px; height:10px; border-radius:6px 6px 2px 2px; background:#1C2833; box-shadow:0 0 0 1px rgba(255,255,255,.1) inset; }
.bk-tab { position:relative; width:214px; height:288px; padding:12px; background:linear-gradient(180deg, #1C2833, #0D151C); border-radius:20px; box-shadow:0 0 0 1px rgba(255,255,255,.12) inset; filter:drop-shadow(14px -4px 14px rgba(0,0,0,.42)); transform:perspective(900px) rotateX(5deg); transform-origin:50% 100%; }
.bk-tab .in { height:100%; border-radius:10px; overflow:hidden; display:flex; flex-direction:column; background:var(--deep); }
.bk-tab .tl { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; padding:14px; }
.bk-tab .tl i { display:block; aspect-ratio:1; border-radius:9px; background:color-mix(in srgb, var(--c) 34%, transparent); } .bk-tab .tl i:nth-child(2) { background:var(--c); }
.bk-tab .lb { flex:1; padding:14px 16px; background:linear-gradient(135deg, color-mix(in srgb, var(--c) 54%, var(--deep)), color-mix(in srgb, var(--c) 44%, var(--deep))); }
.bk-win { width:292px; border-radius:12px; overflow:hidden; background:var(--deep); box-shadow:0 0 0 1px rgba(255,255,255,.16), 14px -4px 26px -10px rgba(0,0,0,.6); }
.bk-win .br { display:flex; align-items:center; gap:6px; padding:10px 12px; background:#1C2833; }
.bk-win .br i { width:9px; height:9px; border-radius:50%; background:rgba(243,241,234,.3); } .bk-win .br i:first-child { background:var(--c); }
.bk-win .br u { flex:1; height:16px; margin-left:8px; border-radius:99px; background:rgba(255,255,255,.08); }
.bk-win .bk-scr { height:196px; }
.bk-box { position:relative; width:214px; height:290px; display:flex; flex-direction:column; padding:20px 20px 16px; color:var(--ink); border-radius:4px;
  background:linear-gradient(135deg, color-mix(in srgb, var(--c) 54%, var(--deep)), color-mix(in srgb, var(--c) 44%, var(--deep)));
  box-shadow:16px 0 0 -1px color-mix(in srgb, var(--c) 26%, #0A1620), 17px 0 0 -1px rgba(255,255,255,.1), 0 0 0 1px rgba(255,255,255,.1) inset, 26px -4px 26px -10px rgba(0,0,0,.6); }
.bk-box .dsc { align-self:center; width:120px; height:120px; margin:14px 0 0; border-radius:50%; background:conic-gradient(from 20deg, rgba(243,241,234,.5), rgba(243,241,234,.12), rgba(243,241,234,.42), rgba(243,241,234,.1), rgba(243,241,234,.5)); box-shadow:0 0 0 1px rgba(255,255,255,.25); display:grid; place-items:center; }
.bk-box .dsc i { width:30px; height:30px; border-radius:50%; background:color-mix(in srgb, var(--c) 50%, var(--deep)); box-shadow:0 0 0 1px rgba(255,255,255,.3); }
.bk-box .sp { flex:1; }
.bk-alt { display:grid; grid-template-columns:repeat(5, auto); gap:34px; align-items:end; justify-content:space-between; margin-top:30px; }
.bk-altc { display:grid; justify-items:center; }
.bk-altc .f { height:320px; display:flex; align-items:flex-end; } .bk-altc .f > span { zoom:.74; }
.bk-altc .pl { width:100%; height:6px; border-radius:2px; background:linear-gradient(to bottom, rgba(255,255,255,.16), rgba(255,255,255,.07)); }
.bk-altc .nm { display:flex; align-items:center; gap:9px; font:500 17px var(--serif); margin-top:14px; }
.bk-altc .nm b { width:23px; height:23px; border-radius:50%; border:1.3px solid var(--accent); color:var(--accent); font:600 13px var(--sans); display:grid; place-items:center; }

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

/* the personal writing: a notebook, its band around it, the title in his own hand */
.bk-note { position:relative; display:flex; flex-direction:column; width:196px; height:272px; padding:22px 30px 18px 22px; border-radius:10px; color:var(--ink);
  background:linear-gradient(135deg, color-mix(in srgb, var(--c) 30%, #0A1620), color-mix(in srgb, var(--c) 20%, #0A1620)); box-shadow:4px 0 0 -1px #E9E4D6, 0 0 0 1px rgba(255,255,255,.1) inset, 14px -4px 26px -10px rgba(0,0,0,.6); }
.bk-note::before { content:""; position:absolute; right:20px; top:0; bottom:0; width:9px; background:rgba(5,10,15,.62); box-shadow:0 0 0 1px rgba(255,255,255,.07); }
.bk-note .tt { font:italic 500 21px/1.22 var(--serif); margin-top:34px; padding-right:14px; }
.bk-note .sp { flex:1; }

.bk-letter.tall { width:262px; height:424px; }
.bk-letter.tall .bk-sheet { height:332px; padding:20px 20px 0; }
.bk-sheet .wh { font-size:13.5px; line-height:1.42; color:#16314A; margin-top:2px; }
.bk-sheet .fx { display:grid; gap:3px; margin-top:11px; padding-top:10px; border-top:1px solid rgba(22,49,74,.18); font-size:12.5px; color:rgba(22,49,74,.74); }
.bk-sheet .fx b { font:500 17px/1.2 var(--serif); color:#16314A; }

/* out in the wild: the place on the shelf is held, the thing is gone, a card says who has it */
.bk-out { position:relative; }
.bk-ghost { opacity:1; }
.bk-ghost .bk-cover, .bk-ghost .bk-tvb, .bk-ghost .bk-env, .bk-ghost .bk-note, .bk-ghost .bk-win, .bk-ghost .bk-box { outline:1.5px dashed rgba(243,241,234,.5); outline-offset:4px; }
.bk-card { display:block; position:absolute; left:50%; bottom:6px; width:204px; margin-left:-70px; padding:13px 15px 12px; background:#EFEBDD; color:#16314A; border-radius:4px; transform:rotate(-2.4deg); box-shadow:0 10px 22px -8px rgba(0,0,0,.7); }
.bk-card::before { content:""; position:absolute; left:50%; top:-7px; width:12px; height:12px; margin-left:-6px; border-radius:99px; background:#B4A3E8; box-shadow:0 1px 2px rgba(0,0,0,.4); }
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
.bk-state { display:inline-flex; align-items:center; gap:9px; margin-top:12px; font-size:14.5px; font-weight:600; color:var(--c); border:1px solid color-mix(in srgb, var(--c) 50%, transparent); border-radius:99px; padding:5px 14px; }
.bk-std { width:min(1320px, 96vw); background:var(--deep); border:1px solid var(--line); border-radius:18px; padding:38px 44px 34px; position:relative; }
.bk-std h2 { font:500 30px/1.15 var(--serif); margin:0 0 6px; }
.bk-stdrow { display:grid; grid-template-columns:repeat(6, 1fr); gap:22px; margin-top:26px; align-items:end; }
.bk-stdc { display:grid; justify-items:center; gap:0; min-width:0; align-self:start; }
.bk-stdc .f { height:190px; display:flex; align-items:flex-end; }
.bk-stdc .f > span { zoom:.56; }
.bk-stdc .pl { width:100%; height:6px; border-radius:2px; background:linear-gradient(to bottom, rgba(255,255,255,.16), rgba(255,255,255,.07)); }
.bk-stdc .nm { display:flex; align-items:center; gap:8px; font:500 17px var(--serif); margin-top:16px; justify-self:start; }
.bk-stdc .ln { justify-self:start; font-size:13.5px; line-height:1.45; color:var(--ink2); margin-top:9px; display:grid; grid-template-columns:18px 1fr; gap:8px; }
.bk-stdc .ln svg { margin-top:2px; }
.bk-headr { display:flex; align-items:center; gap:12px; }
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
const kindName = (t) => STD[t.kind].name
const Label = ({ t, noMark }) => (<>
  {!noMark && <Mark />}
  <div className="bk-lt" style={noMark ? undefined : { marginTop: 10 }}>{t.title}</div>
  <div className="bk-la">{t.author}</div>
  <i className="bk-lr" />
  <div className="bk-li">{kindName(t)}</div>
  <div className="bk-li">Updated {t.updated}</div>
</>)

function Form({ t, c }) {
  const form = STD[t.kind].form
  const st = { '--c': c || PURPLE, '--mix': `${t.mix || 44}%` }
  const AppLabel = () => <><div className="bk-lt" style={{ fontSize: 17 }}>{t.title}</div><div className="bk-la">{t.author}</div><i className="bk-lr" /><div className="bk-li">{kindName(t)}</div></>
  const look = form === 'app' ? (t.look || (STD[t.kind].look === 'window' ? APP_LOOK : STD[t.kind].look)) : null
  if (look === 'monitor') return <span className="bk-mon" style={st}><span className="bz"><span className="bk-scr"><span className="nv"><i /><i /><i /><i /></span><span className="lb"><AppLabel /></span></span></span><span className="nk" /><span className="bs" /></span>
  if (look === 'tablet') return <span className="bk-tab" style={{ ...st, display: 'block' }}><span className="in"><span className="tl"><i /><i /><i /></span><span className="lb"><AppLabel /></span></span></span>
  if (look === 'window') return <span className="bk-win" style={{ ...st, display: 'block' }}><span className="br"><i /><i /><i /><u /></span><span className="bk-scr"><span className="nv"><i /><i /><i /><i /></span><span className="lb"><AppLabel /></span></span></span>
  if (look === 'box') return <span className="bk-box" style={st}><Mark /><span className="dsc"><i /></span><span className="sp" /><AppLabel /></span>
  if (form === 'app') return (
    <span className="bk-laptop" style={st}>
      <span className="bk-lid"><span className="bk-screen"><span className="nv"><i /><i /><i /><i /></span><span className="pg"><em /><i /><i /><i /><u /></span></span></span>
      <span className="bk-hinge" />
      <span className="bk-deck"><div className="ky" /><div className="bk-lt">{t.title}</div><div className="bk-la">{t.author}</div><i className="bk-lr" /><div className="bk-li">{kindName(t)}</div></span>
    </span>)
  if (form === 'film') return (
    <span className="bk-tv" style={st}>
      <svg className="bk-ears" viewBox="0 0 120 46" aria-hidden="true"><path d="M60 46 L18 5 M60 46 L103 9" /><circle cx="18" cy="5" r="3.2" /><circle cx="103" cy="9" r="3.2" /></svg>
      <span className="bk-tvb"><span className="bk-tube"><Label t={t} /></span><span className="bk-tvs"><i className="bk-knob" /><i className="bk-knob" /><i className="bk-grille" /></span></span>
      <span className="bk-feet"><i /><i /></span>
    </span>)
  if (form === 'notebook') return <span className="bk-note" style={st}><span className="tt">{t.title}</span><span className="sp" /><div className="bk-la">{t.author}</div><i className="bk-lr" /><div className="bk-li">{kindName(t)}</div></span>
  if (form === 'letter') return (
    <span className={`bk-letter${t.what ? ' tall' : ''}`} style={st}>
      <span className="bk-sheet"><Mark /><div className="bk-lt">{t.title}</div><i className="bk-lr" />
        {t.what ? <><div className="wh">{t.what}</div><div className="fx"><b>{t.ask}</b><span>{t.term}</span><span>Prepared For {t.withWho}</span></div></> : <div className="bk-li">{kindName(t)}</div>}</span>
      <span className="bk-env"><span>{t.author}</span></span>
    </span>)
  return <span className="bk-cover" style={st}><Mark /><span className="sp" /><Label t={t} noMark /></span>
}

const Tag = ({ name, c, children }) => <div className="bk-tag" style={{ '--c': c }}><i /><b>{name}</b><u />{children && <span>{children}</span>}</div>
const widthOf = (t) => ({ app: t.kind === 'software' ? 230 : 292, film: 286, letter: t.what ? 262 : 238, book: 217, notebook: 200 }[STD[t.kind].form])

function Case({ t, onClose, toggle }) {
  const shelf = shelfOf(t), [sn, c] = SHELF[shelf]
  const reopens = SHELF[STD[t.kind].open]
  return (
    <div className="bk-veil" onClick={onClose}>
      <div className="bk-case" style={{ '--c': c }} onClick={e => e.stopPropagation()}>
        <button className="bk-ib bk-x" title="Close The Window" aria-label="Close the window" onClick={onClose}><X size={18} /></button>
        <Form t={t} />
        <div>
          <h2>{t.title}</h2>
          <div className="bk-state">{t.open ? <BookOpenCheck size={16} /> : <BookLock size={16} />}{t.open ? 'Open' : 'Closed'} · {sn}</div>
          <div className="bk-facts">
            <div className="bk-fact"><Ruler size={17} /><span>Kind</span>{kindName(t)}</div>
            <div className="bk-fact"><Users size={17} /><span>With</span>{t.withWho}</div>
            <div className="bk-fact"><MapPin size={17} /><span>Came From</span>{t.from}</div>
            <div className="bk-fact"><CalendarClock size={17} /><span>{!t.open ? 'Closed' : shelf === 'wild' ? 'Sent' : 'Open Since'}</span>{!t.open ? t.closed || 'Today' : t.since}{t.open && t.day ? ` · Day ${t.day}` : ''}</div>
            {shelf === 'wild' && <div className="bk-fact"><Eye size={17} /><span>Opened By Them</span>{t.opened ? `${t.opened} Times · Last ${t.last}` : 'Not Yet'}</div>}
          </div>
          {t.buttoned && <><div className="bk-sub">Buttoned Up</div>
            <div className="bk-chk">{t.buttoned.map(([w, y]) => <div key={w} className={y ? 'y' : 'n'}>{y ? <Check size={17} strokeWidth={2.4} /> : <Circle size={17} />}{w}</div>)}</div></>}
          {t.editions && <><div className="bk-sub">Editions</div>
            {t.editions.map(([e, d, w]) => <div key={e} className="bk-ed"><b style={{ fontWeight: 600 }}>{e}</b><span>{d}</span><span>{w}</span></div>)}</>}
          <div className="bk-acts">
            <button className="bk-act on" style={{ '--c': INKC }}><span className="bk-ib" style={{ '--c': INKC }}><ExternalLink size={19} /></span>Look Inside</button>
            {t.open
              ? <button className="bk-act on" style={{ '--c': PURPLE }} onClick={() => toggle(t.id)}><span className="bk-ib"><BookLock size={19} /></span>Close It</button>
              : <button className="bk-act on" style={{ '--c': reopens[1] }} onClick={() => toggle(t.id)}><span className="bk-ib"><BookOpenCheck size={19} /></span>Open It</button>}
          </div>
        </div>
      </div>
    </div>)
}
function AppOptions({ onClose }) {
  return (
    <div className="bk-veil" onClick={onClose}>
      <div className="bk-std" style={{ width: 'min(1420px, 96vw)' }} onClick={e => e.stopPropagation()}>
        <button className="bk-ib bk-x" title="Close The Window" aria-label="Close the window" onClick={onClose}><X size={18} /></button>
        <h2>An Application On The Shelf</h2>
        <div className="bk-alt">{APP_LOOKS.map(([k, name], i) => (
          <div key={k} className="bk-altc"><div className="f"><Form t={{ kind: 'app', open: true, look: k, title: 'Client Test Lab', author: 'Third Horizon' }} /></div><div className="pl" /><div className="nm"><b>{i + 1}</b>{name}</div></div>))}</div>
      </div>
    </div>)
}
function Standard({ onClose }) {
  return (
    <div className="bk-veil" onClick={onClose}>
      <div className="bk-std" onClick={e => e.stopPropagation()}>
        <button className="bk-ib bk-x" title="Close The Window" aria-label="Close the window" onClick={onClose}><X size={18} /></button>
        <h2>The Standard</h2>
        <div className="bk-stdrow">{Object.entries(STD).map(([k, d]) => { const I = d.icon, [sn, sc] = SHELF[d.open]; return (
          <div key={k} className="bk-stdc">
            <div className="f"><Form t={{ kind: k, open: true, title: d.name.replace(/^An? /, ''), author: 'Third Horizon', updated: 'Today' }} /></div>
            <div className="pl" />
            <div className="nm"><I size={17} color={sc} />{d.name.replace(/^An? /, '')}</div>
            <div className="ln"><BookOpenCheck size={15} color={sc} /><span><b style={{ color: sc, fontWeight: 600 }}>{sn}.</b> {d.openIs}</span></div>
            <div className="ln"><BookLock size={15} color={PURPLE} /><span><b style={{ color: PURPLE, fontWeight: 600 }}>The Library.</b> {d.closedIs}</span></div>
          </div>) })}</div>
      </div>
    </div>)
}

function App() {
  const q = new URLSearchParams(window.location.search)
  const [things, setThings] = useState(THINGS)
  const [open, setOpen] = useState(q.get('open'))
  const [std, setStd] = useState(q.get('std') === '1')
  const [alt, setAlt] = useState(q.get('alt') === '1')
  const on = (shelf) => things.filter(t => shelfOf(t) === shelf)
  const opened = things.find(t => t.id === open)
  // Open or close: the one thing David does. The shelf follows from the kind.
  const toggle = (id) => setThings(ts => ts.map(t => t.id === id ? { ...t, open: !t.open, year: 2026, closed: 'November 24, 2026', day: 1, opened: 0, since: t.open ? t.since : 'November 24, 2026' } : t))
  const shelve = (id) => setThings(ts => ts.map(t => t.id === id ? { ...t, cart: false, open: true, day: 1, opened: 0 } : t))
  const spines = [...on('library').map(t => [t.title, t.kind, t.year || 2026, 244, 1, t.id]), ...SPINES].sort((a, b) => b[2] - a[2])
  const cloth = (ts) => ts.map((t, i) => ({ ...t, mix: [44, 30, 56, 36][i % 4] }))
  const service = cloth(on('service')), wild = on('wild'), cart = on('cart')
  return (
    <div className="bk-shell"><style>{CSS}</style>
      <aside className="bk-side">
        <div className="bk-brand">Lumen</div>
        {NAV.map(([g, items]) => <div key={g}><div className="bk-grp">{g}</div>{items.map(([I, l, here]) => <div key={l} className={`bk-nav${here ? ' on' : ''}`}><I size={17} strokeWidth={1.7} />{l}</div>)}</div>)}
      </aside>
      <main className="bk-page">
        <div className="bk-head"><h1>Bookshelf</h1><div className="bk-headr"><button className="bk-ib" style={{ '--c': BLUE }} title="The Standard" aria-label="The standard" onClick={() => setStd(true)}><Ruler size={18} /></button><div className="bk-find"><Search size={16} />Find A Book</div></div></div>

        {cart.length > 0 && <section className="bk-sec">
          <Tag name="On The Cart" c={INKC}>{cart.length} To Shelve</Tag>
          <div className="bk-cart">{cart.map(t => { const I = STD[t.kind].icon; return (
            <div key={t.id} className="bk-ct"><I size={20} color={BLUE} /><div><div className="t">{t.title}</div><div className="m">{kindName(t)} · {t.from}</div></div>
              <button className="bk-ib" style={{ '--c': BLUE }} title="Button It Up And Open It" aria-label={`Button up and open ${t.title}`} onClick={() => shelve(t.id)}><PackageCheck size={18} /></button></div>) })}</div>
        </section>}

        <section className="bk-sec">
          <Tag name="In Service" c={GREEN}>{service.length} Open</Tag>
          <div className="bk-row">{service.map(t => <button key={t.id} className="bk-thing" onClick={() => setOpen(t.id)} aria-label={`Open ${t.title}`}><Form t={t} /></button>)}</div>
          <div className="bk-plank" />
          <div className="bk-plates">{service.map(t => <div key={t.id} className="bk-plate" style={{ width: widthOf(t), '--c': GREEN }}><b><i className="bk-lamp" />{t.plate || 'Open'}</b>{t.sub || 'Opened Today'}</div>)}</div>
        </section>

        <section className="bk-sec">
          <Tag name="Out In The Wild" c={BLUE}>{wild.length} Waiting</Tag>
          <div className="bk-row">{wild.map(t => (
            <button key={t.id} className="bk-thing bk-out" onClick={() => setOpen(t.id)} aria-label={`Open ${t.title}`} style={{ '--c': BLUE }}>
              <span className="bk-ghost" style={{ display: 'block' }}><Form t={t} /></span>
              <span className="bk-card"><div className="w">Out With</div><div className="p">{t.withWho}</div>
                <div className="d"><b>Day {t.day}</b><span>Since {t.since.replace(', 2026', '').replace('November', 'Nov')}</span></div>
                <div className={`o${t.opened ? '' : ' no'}`}><Eye size={14} />{t.opened ? `Opened ${t.opened === 1 ? 'Once' : `${t.opened} Times`} · Last ${t.last.replace('November', 'Nov')}` : 'Not Opened Yet'}</div></span>
            </button>))}</div>
          <div className="bk-plank" />
        </section>

        <section className="bk-sec">
          <Tag name="The Library" c={PURPLE}>{spines.length} Closed</Tag>
          <div className="bk-lib">{spines.map(([title, kind, yr, h, tone, id], i) => {
            const I = STD[kind].icon, head = i === 0 || spines[i - 1][2] !== yr
            return [head && <span key={`y${yr}`} className="bk-yr" style={i ? { marginLeft: 26 } : undefined}>{yr}</span>,
              <button key={title} className={`bk-spine${i === spines.length - 1 ? ' bk-lean' : ''}`} title={title} aria-label={`Open ${title}`} onClick={id ? () => setOpen(id) : undefined} style={{ height: h, '--c': PURPLE, '--mix': `${[46, 30, 60][tone]}%` }}>
                <span className="t">{title}</span><I size={15} strokeWidth={1.8} /></button>]
          })}</div>
          <div className="bk-plank" />
        </section>
      </main>
      {opened && <Case t={opened} onClose={() => setOpen(null)} toggle={toggle} />}
      {std && <Standard onClose={() => setStd(false)} />}
      {alt && <AppOptions onClose={() => setAlt(false)} />}
    </div>)
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
