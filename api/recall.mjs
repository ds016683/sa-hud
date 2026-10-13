// The brain on a Loadout card (David, 10/12): what the system has on a task,
// two or three plain next steps, and a handoff to Lumen on WhatsApp when the
// history does not ring a bell.
//   GET  ?objective_id=&task_id=   -> { history:[{when,text}], next:[...] }
//   POST {objective_id, task_id, ask:true} -> Lumen messages David on WhatsApp,
//        briefed with the same history and that he wants to dig deeper.
export const config = { maxDuration: 120 }

import { authorized } from './lumen-hud.mjs'
import { think, remember } from './_lumen-brain.mjs'
import { waSendText, davidNumber } from './_wa.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' })
const sb = async (path) => { const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: hdr() }); if (!r.ok) throw new Error(`${path.split('?')[0]} ${r.status}`); return r.json() }
const soft = (p) => p.catch(() => [])
const day = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' }) : '—'
const stripNum = (t) => String(t || '').replace(/^\s*\d+\s*[·.:)-]\s*/, '')
const words = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)).slice(0, 3)
const STOP = new Set(['with', 'from', 'that', 'this', 'into', 'about', 'their', 'there', 'card', 'page', 'main', 'mission', 'side', 'refine', 'travel', 'meet', 'person'])
const ilikeAll = (cols, ws) => ws.length ? `&and=(${ws.map(w => `or(${cols.map(c => `${c}.ilike.*${encodeURIComponent(w)}*`).join(',')})`).join(',')})` : ''

async function gather({ objective_id, task_id }) {
  const H = []
  const add = (at, text) => text && H.push({ at: at || null, when: day(at), text })
  let o = null, task = null, project = null
  if (objective_id) o = (await soft(sb(`objectives?id=eq.${objective_id}&select=*`)))[0] || null
  if (task_id) task = (await soft(sb(`project_tasks?id=eq.${task_id}&select=id,text,status,notes,created_at,released_at,project_id,objective_id`)))[0] || null
  if (!task && o) task = (await soft(sb(`project_tasks?objective_id=eq.${o.id}&select=id,text,status,notes,created_at,released_at,project_id,objective_id&limit=1`)))[0] || null
  if (task?.project_id) project = (await soft(sb(`projects?id=eq.${task.project_id}&select=id,key,name,description`)))[0] || null
  const title = task ? stripNum(task.text) : (o?.title || '')
  const star = project ? (project.description || null) : (o?.north_star || null)
  if (star) H.push({ at: '0000', when: 'Star', text: `What Will Be True, That Wasn't True Before: ${star}` })
  if (o) {
    add(o.captured_at, `Captured as a Side Mission${o.stakeholder ? ` (stakeholder ${o.stakeholder})` : ''}${o.due_date ? `, due ${day(o.due_date)}` : ''}.${o.description ? ` ${String(o.description).slice(0, 240)}` : ''}`)
    if (o.activated_at) add(o.activated_at, 'Loaded onto the Board.')
    if (o.released_at) add(o.released_at, `Released as ${o.released_kind || 'done'}.`)
    const steps = await soft(sb(`objective_steps?objective_id=eq.${o.id}&select=text,done,done_at,position&order=position.asc`))
    for (const s of steps) add(s.done_at || o.captured_at, `${s.done ? 'Gate closed' : 'Gate open'}: ${s.text}`)
  }
  if (task) {
    add(task.created_at, `Milestone on ${project?.name || 'a Main Mission'}: ${stripNum(task.text)}${task.notes ? `. Done when: ${String(task.notes).slice(0, 200)}` : ''}`)
    if (task.released_at) add(task.released_at, 'Milestone closed.')
    if (project) {
      const boards = await soft(sb(`session_boards?project=eq.${encodeURIComponent(project.key || project.name)}&select=title,phases,updated_at&order=updated_at.desc&limit=1`))
      for (const b of boards) {
        const ph = (b.phases || []).find(p => p.task_id === task.id || (p.tasks || []).some(t => t.task_id === task.id))
        if (ph) { const ts = ph.tasks || []; add(b.updated_at, `Session board "${b.title}": ${ts.filter(t => t.status === 'done').length} of ${ts.length} steps done. ${ts.map(t => `${t.id} ${t.status === 'done' ? '✓' : t.status === 'blocked' ? '⊘' : '○'} ${t.label}${t.note ? ` (${t.note})` : ''}`).join(' · ')}`) }
      }
    }
  }
  const oid = o?.id || task?.objective_id
  if (oid) {
    const clocks = await soft(sb(`clocks?objective_id=eq.${oid}&select=day,minutes,started_at,stopped_at`))
    const byDay = {}
    for (const c of clocks) { const m = c.stopped_at ? Number(c.minutes) || 0 : (Date.now() - new Date(c.started_at)) / 60000; byDay[c.day] = (byDay[c.day] || 0) + m }
    const total = Object.values(byDay).reduce((a, b) => a + b, 0)
    if (total > 0) add(null, `Clock: ${Math.round(total / 60 * 10) / 10}h in all (${Object.entries(byDay).map(([d, m]) => `${day(d)} ${Math.round(m)}m`).join(', ')}).`)
    const arch = await soft(sb(`archive_entries?source_id=eq.${oid}&select=kind,title,summary,filed_at`))
    for (const a of arch) add(a.filed_at, `Archive, ${a.kind}: ${a.title}${a.summary ? `. ${String(a.summary).slice(0, 220)}` : ''}`)
    const files = await soft(fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: hdr(), body: JSON.stringify({ prefix: `objectives/${oid}/artifacts`, limit: 20 }) }).then(r => r.ok ? r.json() : []))
    const names = (Array.isArray(files) ? files : []).map(f => f.name).filter(n => n !== '.keep')
    if (names.length) add(null, `Artifacts on its page: ${names.join(', ')}.`)
  }
  const ws = words(title)
  if (ws.length) {
    const msgs = await soft(sb(`lumen_messages?select=at,direction,body&kind=in.(text,audio)&order=at.desc&limit=6${ilikeAll(['body'], ws)}`))
    for (const m of msgs) add(m.at, `${m.direction === 'in' ? 'David to Lumen' : 'Lumen'}: ${String(m.body || '').replace(/\s+/g, ' ').slice(0, 200)}`)
    const meets = await soft(sb(`granola_meetings?select=title,summary,meeting_date&order=meeting_date.desc&limit=3${ilikeAll(['title', 'summary'], ws)}`))
    for (const g of meets) add(g.meeting_date, `Meeting notes "${g.title}": ${String(g.summary || '').replace(/\s+/g, ' ').slice(0, 200)}`)
  }
  H.sort((a, b) => (a.at || '9999').localeCompare(b.at || '9999'))
  const kind = task ? 'Main Mission' : (o?.tags || []).includes('impromptu') ? 'Ad Hoc' : 'Side Mission'
  return { title, kind, project: project?.name || null, star, history: H }
}

async function nextSteps(g) {
  if (!process.env.ANTHROPIC_API_KEY) return []
  const prompt = `David pressed the brain on his Loadout card for "${g.title}" (${g.kind}${g.project ? ` on ${g.project}` : ''}).${g.star ? ` His North Star for it, what will be true that wasn't true before: "${g.star}". Every step you suggest must move toward that line.` : ''} Here is everything the system has on it, oldest first:\n${g.history.map(h => `- ${h.when}: ${h.text}`).join('\n') || '- nothing recorded'}\n\nGive David two or three next steps. Plain, one line each, concrete, in his language, no preamble, no numbering. Return a JSON array of strings and nothing else.`
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: process.env.LUMEN_MODEL || 'claude-sonnet-5', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }) })
    const j = await r.json(); const text = (j.content || []).map(c => c.text || '').join('')
    const m = text.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]).slice(0, 3).map(String) : []
  } catch { return [] }
}

export default async function handler(req, res) {
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  try {
    const q = req.method === 'POST' ? (req.body || {}) : (req.query || {})
    const params = { objective_id: String(q.objective_id || '').trim() || null, task_id: String(q.task_id || '').trim() || null }
    if (!params.objective_id && !params.task_id) return res.status(400).json({ error: 'objective_id or task_id' })
    const g = await gather(params)
    if (req.method === 'POST' && q.ask) {
      const instruction = `[RECALL] David pressed the brain on his Loadout card for "${g.title}" (${g.kind}${g.project ? ` on ${g.project}` : ''}). He wants to dig deeper into the substance or history of it. What the system has, oldest first:\n${g.history.map(h => `- ${h.when}: ${h.text}`).join('\n') || '- nothing recorded'}\n\nMessage him on WhatsApp now: open with the two or three things you actually know about it, say plainly what you do not have, then ask what he is after. Short. No tool talk.`
      const text = await think({ channel: 'pulse', text: instruction, spoken: false })
      let id = null, err = null
      try { id = await waSendText(davidNumber(), text) } catch (e) { err = String(e.message || e) }
      await remember({ channel: 'whatsapp', direction: 'out', kind: err ? 'system' : 'text', body: text, external_id: id, meta: { via: 'recall', objective_id: params.objective_id, task_id: params.task_id, skipped: err } })
      return res.status(200).json({ ok: !err, sent: !err, error: err, text })
    }
    const next = await nextSteps(g)
    return res.status(200).json({ ...g, next })
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }) }
}
