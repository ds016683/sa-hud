// The River's badge taxonomy. Each badge carries miles; miles are the only
// thing that moves David down the river (10,535 miles to Calm Water).
// Awards are struck by deterministic rules on the server (api/_river.mjs)
// into miles_ledger; this file only knows how to present them.
import {
  Flag, Target, Wrench, Dumbbell, Moon, Mic, Tractor, DoorClosed, Flame, Droplets, Timer, Map,
} from 'lucide-react'

export const RIVER_TOTAL_MILES = 10535
export const RIVER_START_DAY = '2026-09-23'

export const BADGES = {
  'main-mission':       { label: 'Main Mission Complete', miles: 10,  Icon: Flag,       repeatable: true,  desc: 'A whole Main Mission (project) marked complete', lore: 'The map moves when the mission moves.' },
  'mission-task':       { label: 'Mission Task Closed',   miles: 1,   Icon: Flag,       repeatable: true,  desc: 'A component task of a Main Mission closed', lore: 'One plank at a time, the bridge.' },
  'side-mission':       { label: 'Side Mission Complete', miles: 4,   Icon: Target,     repeatable: true,  desc: 'A Side Mission released as done', lore: 'Small tributaries still reach the sea.' },
  'maintenance-bundle': { label: 'Maintenance Bundle',    miles: 1,   Icon: Wrench,     repeatable: true,  desc: 'Five maintenance items done', lore: 'The hull holds because someone checked the hull.' },
  'cartographer':       { label: 'Cartographer',          miles: 2,   Icon: Map,        repeatable: true,  desc: 'A Side Mission handed to other hands, with a named owner', lore: 'The map outlives the hand that drew it.' },
  'exercise':           { label: 'Exercise',              miles: 5,   Icon: Dumbbell,   repeatable: false, desc: 'One hour of physical exercise logged', lore: 'The body rows; the mind steers.' },
  'sleep':              { label: 'Sleep',                 miles: 4,   Icon: Moon,       repeatable: false, desc: 'Six hours of sleep', lore: 'The river runs at night whether you watch it or not.' },
  'toastmaster':        { label: 'Toastmaster General',  miles: 4,   Icon: Mic,        repeatable: false, desc: 'Every meeting attended, and each documented or closed out', lore: 'Every word said was written down.' },
  'full-day':           { label: 'Full Day',             miles: 4,   Icon: Timer,      repeatable: false, desc: 'Six or more hours of dedicated work in Harvest', lore: 'The oars did not stop until the light did.' },
  'work-horse':         { label: 'Work Horse',            miles: 10,  Icon: Tractor,      repeatable: false, desc: 'More than twelve hours of dedicated work in Harvest', lore: 'The current did not carry you. You carried the current.' },
  'clean-close':        { label: 'Clean Close',           miles: 2,   Icon: DoorClosed, repeatable: false, desc: 'Emails addressed, tasks organized, tomorrow prepped and reviewed', lore: 'Camp struck, fire out, boat tied.' },
  'discomforter':       { label: 'Discomforter',          miles: 5,   Icon: Flame,      repeatable: false, desc: 'Three deliberate discomforts told to Lumen', lore: 'Three times into the cold water, on purpose.' },
  'hygiene-item':       { label: 'Hygiene Item',          miles: 0.25, Icon: Droplets,  repeatable: true,  desc: 'One item of the daily hygiene list logged', lore: 'Small water, every day.' },
  'devotional':         { label: 'Morning Devotional',    miles: 2,   Icon: Moon,       repeatable: false, desc: 'The day opened with the devotional, told to Lumen', lore: 'Before the river, the spring.' },
  'hygiene':            { label: 'Hygiene',               miles: 3,   Icon: Droplets,   repeatable: false, desc: 'All eight hygiene items in one day', lore: 'Bright teeth, clear head.' },
}

// Tiers by effort, for the medallion outline: highest = light purple,
// middle = light blue, lower = green (canon tokens).
export const badgeTier = (id) => {
  const m = (BADGES[id] || {}).miles || 0
  return m >= 10 ? 'high' : m >= 4 ? 'mid' : 'low'
}
export const TIER_COLORS = { high: '#B4A3E8', mid: '#A9C9E8', low: '#43D392' }

// The retired composite-score badges (pre-River). Kept so older daily reads
// still render their chips; they carry no miles and never strike again.
export const LEGACY_BADGES = {
  'leverage': { label: 'Leverage', legacy: true, miles: 0, Icon: Flag, desc: 'Project tasks closed through the system', lore: 'Move the world; let the beam bear the weight.' },
  'closer': { label: 'Closer', legacy: true, miles: 0, Icon: Target, desc: 'Three or more completions banked', lore: 'What is finished can finally be judged, and it held.' },
  'walling': { label: 'Walling', legacy: true, miles: 0, Icon: DoorClosed, desc: 'A boundary held', lore: 'The rampart knows what is not yours to carry.' },
  'calm-water': { label: 'Calm Water', legacy: true, miles: 0, Icon: Droplets, desc: 'Real completion, zero emergencies', lore: 'Meaning made in still water.' },
  'prospector': { label: 'Prospector', legacy: true, miles: 0, Icon: Wrench, desc: 'Every discovery triaged', lore: 'Every fleck sifted.' },
  'deep-work': { label: 'Deep Work', legacy: true, miles: 0, Icon: Tractor, desc: 'Four or more hours in the seat', lore: 'The sand ran, and you stayed in the chair.' },
  'correspondent': { label: 'Correspondent', legacy: true, miles: 0, Icon: Mic, desc: 'The inbox handled, not hoarded', lore: 'Every letter answered or archived.' },
  'chronicler': { label: 'Chronicler', legacy: true, miles: 0, Icon: Mic, desc: 'Three or more meetings banked as knowledge', lore: 'The day wrote itself down.' },
  'clear-signal': { label: 'Clear Signal', legacy: true, miles: 0, Icon: Flame, desc: 'The day fully documented', lore: 'The watchtower saw the whole river today.' },
}
Object.assign(BADGES, LEGACY_BADGES)

// Old composite-score grade (kept for older reads).
export const milesGrade = (m) => {
  if (m == null) return null
  if (m >= 8.5) return 'S'
  if (m >= 6.5) return 'A'
  if (m >= 4.5) return 'B'
  if (m >= 2.5) return 'C'
  return 'D'
}

// Visibility tiers: how much of the day the Ledger could actually see.
export const signalTier = (s) => {
  if (s == null) return null
  if (s >= 80) return { id: 'clear', label: 'Clear View', ring: 'solid', opacity: 1 }
  if (s >= 50) return { id: 'partial', label: 'Partial View', ring: 'dashed', opacity: 0.85 }
  if (s >= 25) return { id: 'dim', label: 'Dim View', ring: 'dashed', opacity: 0.55 }
  return { id: 'dark', label: 'Dark Water', ring: 'dotted', opacity: 0.35 }
}

// River waypoints: the real drive, city to city, that adds up to 10,535 miles.
// Provo is The Rock; Western Springs is Calm Water. Cumulative miles.
export const WAYPOINTS = [
  { at: 0,     label: 'Provo, UT',            short: 'Provo',           leg: null },
  { at: 1650,  label: 'Dayton, OH',           short: 'Dayton',          leg: 1650 },
  { at: 3320,  label: 'Sandy, UT',            short: 'Sandy',           leg: 1670 },
  { at: 4405,  label: 'Overland Park, KS',    short: 'Overland Park',   leg: 1085 },
  { at: 6205,  label: 'Pleasanton, CA',       short: 'Pleasanton',      leg: 1800 },
  { at: 8005,  label: 'Lenexa, KS',           short: 'Lenexa',          leg: 1800 },
  { at: 9095,  label: 'Orem, UT',             short: 'Orem',            leg: 1090 },
  { at: 9135,  label: 'Salt Lake City, UT',   short: 'Salt Lake City',  leg: 40 },
  { at: 10535, label: 'Western Springs, IL',  short: 'Western Springs', leg: 1400 },
]
// Where a mile count sits on the route: the last city reached, the next one, miles to go.
export const whereOnRiver = (miles) => {
  const m = Number(miles) || 0
  let last = WAYPOINTS[0], next = WAYPOINTS[WAYPOINTS.length - 1]
  for (const w of WAYPOINTS) { if (w.at <= m) last = w; else { next = w; break } }
  return { last, next, toNext: Math.max(0, next.at - m), legDone: next.at > last.at ? (m - last.at) / (next.at - last.at) : 1 }
}
// Cities crossed when miles move from `before` to `after` (exclusive, inclusive).
export const crossed = (before, after) => WAYPOINTS.filter(w => w.at > 0 && w.at > (Number(before) || 0) && w.at <= (Number(after) || 0))
