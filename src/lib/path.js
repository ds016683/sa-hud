// The path on a card (David 11/11, on the Briefing's End Of The Trail): "one of my concerns is
// how often these bullets may veer toward being AI noise.... so shouldn't really be guess work.
// should be coming out of the work with lumen." And: "he should only be pulling the things i'm
// telling him. the card should always start as very very baasic, until i actually start doing
// things."
//
// So a stop on the path is a step David asked for, and it carries where it came from. The steps
// live in objective_steps as before; their sources live beside the card's other files at
//   <root>/path.json   { v: 1, sources: { "<step id>": { by, where, quote, at } } }
// by: 'david' (he typed it on the card, or said it to Lumen: quote holds his words) or 'lumen'
// (added at his word, no words kept). The Trail is built here too, from what the card holds:
// what came in and what happened, never a guess.
import { supabase } from './supabase'
import { sourceOf, isLink, isRequest } from './livefiles'

// Steps David puts on the line by hand (11/17: "a little icon for a step and then an icon for a gate
// that i could drag to the location of the line") live here too:
//   steps: [{ id, text, by, made_at, done, at, after, vetted }]
// done with an at: it is on The Trail at that time. Not done: it is ahead, on End Of The Trail, after
// the stop whose key is in `after` ('^' is the top, none is the end). A step pays no miles; a gate does.
const BUCKET = 'project-files'
export const pathFile = (root) => `${root}/path.json`
const blank = () => ({ v: 1, sources: {}, steps: [] })

export async function readPath(root) {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathFile(root), 60)
    if (error || !data?.signedUrl) return blank()
    const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return blank()
    const d = await res.json()
    return { ...blank(), ...d, sources: d && typeof d.sources === 'object' && d.sources ? d.sources : {}, steps: Array.isArray(d?.steps) ? d.steps : [] }
  } catch { return blank() }
}
const savePath = async (root, doc) => {
  const { error } = await supabase.storage.from(BUCKET).upload(pathFile(root), new Blob([JSON.stringify(doc)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
  return doc
}
// Change the card's own steps: fn takes the list and returns the new one.
export async function savePathSteps(root, fn) {
  const doc = await readPath(root)
  return savePath(root, { ...doc, steps: fn(doc.steps) })
}
// Extract with steps still open (David 11/17: "it can all still go through. any steps that weren't closed out just
// need to be archived as vetted."): each open step leaves the path and is kept on The Trail, marked Vetted, not done.
// Returns how many were archived. A path that cannot be read is left alone.
export async function vetOpenSteps(root, at = new Date().toISOString()) {
  const doc = await readPath(root)
  const open = doc.steps.filter(x => !x.done && !x.vetted).length
  if (!open) return 0
  await savePath(root, { ...doc, steps: doc.steps.map(x => (x.done || x.vetted) ? x : { ...x, vetted: true, at }) })
  return open
}
export async function noteSource(root, stepId, src) {
  const doc = await readPath(root)
  doc.sources[String(stepId)] = { at: new Date().toISOString(), ...src }
  const { error } = await supabase.storage.from(BUCKET).upload(pathFile(root), new Blob([JSON.stringify(doc)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
  return doc
}

const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })
const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
export const stamp = (iso) => iso ? `${day(iso)} · ${clock(iso)}` : ''

// A target date in words: "Today, Wed, Nov 11", whether it is past, and the short form for a chip.
const chiDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export const dueWords = (iso) => {
  const that = String(iso).slice(0, 10), d = new Date(`${that}T12:00:00`), today = chiDay()
  const words = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return { text: that === today ? `Today, ${words}` : words, late: that < today, short: that === today ? 'Due Today' : `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }
}

// Where a stop came from, as one line under it.
export function sourceLine(step, sources) {
  const s = sources?.[String(step.id)]
  if (s?.by === 'david' && s.quote) return { lead: `From you, to Lumen, ${stamp(s.at)}:`, quote: s.quote }
  if (s?.by === 'david') return { lead: `From you, on the card, ${stamp(s.at)}` }
  if (s?.by === 'lumen') return { lead: `Added by Lumen at your word, ${stamp(s.at)}` }
  return { lead: step.created_at ? `Added ${stamp(step.created_at)}` : '' }
}

// The open brackets in a draft: the blanks only its author can fill.
export const blanksIn = (text) => String(text || '').match(/\[[^\][\n]{1,200}\]/g) || []
// The opening of a tab's words: a "Subject:" line is skipped, and it stops at the end of a sentence.
export function excerpt(text, max = 240) {
  const flat = String(text || '').replace(/^\s*subject:.*$/im, '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  return end > 60 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`
}

// The Trail: what has come in and what has happened on this card, oldest first.
// Each entry is { at, kind: 'Came In' | 'Happened' | 'Gate Closed', text, gate? }.
export function buildTrail({ obj, kindLabel, steps = [], children = [], files = [], tabs = [], builds = [], psteps = [] }) {
  const out = []
  const add = (at, kind, text, gate = false) => { if (at && text) out.push({ at, kind, text, ...(gate ? { gate: true } : {}) }) }
  if (obj) add(obj.captured_at, 'Happened', `Opened as a ${kindLabel || 'Side Mission'}`)
  for (const f of files) {
    if (isRequest(f)) continue
    if (isLink(f)) {
      if (/^claude:\/\//.test(String(f.path || ''))) add(f.created_at, 'Happened', `A Claude Code session worked on this: ${String(f.name || '').replace(/^Claude session\s*·\s*/i, '')}`)
      else add(f.created_at, 'Came In', `Link: ${f.name}`)
      continue
    }
    const src = sourceOf(f)
    if (src.kind === 'Email') add(f.created_at, 'Came In', `${f.name}, from ${src.sender ? `${src.sender}'s` : 'an'}${src.day ? ` ${src.day}` : ''} email`)
    else if (f.source === 'lumen') add(f.created_at, 'Happened', `Lumen wrote ${f.name}`)
    else if (f.source === 'session') add(f.created_at, 'Happened', `A Claude Code session added ${f.name}`)
    else add(f.created_at, 'Came In', `${f.name}, added by you`)
  }
  for (const t of tabs) add(t.created_at || t.updated_at, 'Happened', `Tab on the Workbench: ${t.title}`)
  for (const b of builds) add(b.updated_at, 'Happened', `Page built on the Workbench: ${b.title || b.slug}`)
  // A closed gate is the big mark on the trail (David 11/16: "Gates have some type of visual distinction").
  for (const st of steps) if (st.done && st.done_at) add(st.done_at, 'Gate Closed', st.n != null ? `Gate ${st.n} · ${st.text}` : st.text, true)
  for (const k of children) if (k.state === 'released' && k.released_at) add(k.released_at, 'Gate Closed', k.title, true)
  // A step set on the line by hand, or one that was ahead and is now done.
  // One left open when the card was extracted is kept too, marked Vetted (David 11/17).
  for (const p of psteps) if ((p.done || p.vetted) && p.at && p.text) out.push({ at: p.at, kind: p.vetted ? 'Step Vetted' : 'Step', text: p.text, pid: p.id, ...(p.vetted ? { vetted: true } : {}) })
  if (obj?.state === 'released' && obj.released_at) add(obj.released_at, 'Happened', 'Closed out')
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)))
}

// A stop was closed on the card: the Lumen panel listens and Lumen asks his one question.
export const CARD_EVENT = 'hud:card-event'
export const fireCardEvent = (detail) => { try { window.dispatchEvent(new CustomEvent(CARD_EVENT, { detail })) } catch { /* no window */ } }
