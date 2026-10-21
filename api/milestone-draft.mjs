// Milestone draft (David 10/21): natural language in, an organized milestone
// out. The HUD's + Milestone box sends what he typed; this door asks Lumen's
// model for a Title Case milestone, a "done when" that is verifiably true, and
// three to five steps, as JSON. Nothing is written here; the HUD shows the
// draft for him to edit and confirm.
import { authorized } from './lumen-hud.mjs'

const MODEL = () => process.env.LUMEN_MODEL || 'claude-sonnet-5'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' })
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  const { text = '', project = '', polaris = '', existing = [] } = req.body || {}
  const raw = String(text || '').trim()
  if (!raw) return res.status(400).json({ error: 'text required' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'no model key on this deployment' })
  const system = [
    "You organize one milestone for David's Main Mission board. He types in natural language; you return JSON only, no prose, no code fence.",
    'Shape: {"title": string, "done_when": string, "steps": string[], "number": number|null}.',
    'title: Title Case, under 90 characters, the thing that will be true when it is done, no trailing period, never an em dash anywhere.',
    'done_when: one sentence, verifiable (a thing produced, a decision marked, a conversation had), in his words where he gave them.',
    'steps: three to five imperative steps in order, each under 110 characters; the last one is the verification. Name David as the owner only where only he can do it.',
    'number: the milestone number if he led with one (e.g. "17 ·" or "17:"), else null.',
    'Keep his nouns and verbs. Do not invent scope he did not state. Commas, periods, parentheses; no em dashes.',
  ].join(' ')
  const user = `Main Mission: ${project || '(unnamed)'}${polaris ? `\nPolaris Objective: ${polaris}` : ''}${existing.length ? `\nExisting milestones (do not duplicate): ${existing.slice(0, 30).join(' | ')}` : ''}\n\nDavid typed:\n${raw}`
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 700, system, messages: [{ role: 'user', content: user }] }),
    })
    const j = await r.json()
    if (!r.ok) return res.status(502).json({ error: j?.error?.message || `model ${r.status}` })
    const out = (j.content || []).map(c => c.text || '').join('').trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    let draft
    try { draft = JSON.parse(out) } catch { const m = out.match(/\{[\s\S]*\}/); draft = m ? JSON.parse(m[0]) : null }
    if (!draft || !draft.title) return res.status(502).json({ error: 'the model did not return a milestone', raw: out.slice(0, 400) })
    const clean = (s) => String(s || '').replace(/—/g, ',').replace(/\s+,/g, ',').trim()
    return res.status(200).json({
      title: clean(draft.title).slice(0, 120),
      done_when: clean(draft.done_when).slice(0, 300),
      steps: (Array.isArray(draft.steps) ? draft.steps : []).map(clean).filter(Boolean).slice(0, 5),
      number: Number.isFinite(Number(draft.number)) && draft.number != null ? Number(draft.number) : null,
    })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) })
  }
}
