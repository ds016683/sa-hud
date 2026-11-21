// Gate proofs (David 11/21): what a Claude session built and tested under a gate, filed by
// ~/.claude/hud-board/proof.py at project-files/<project_id>/gates/<task_id>/proofs/<stamp>.json. Both debriefs read them.
const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)

export async function readProofs(projectId, taskId) {
  const base = `${projectId}/gates/${taskId}/proofs`
  const r = await fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: base, limit: 50, sortBy: { column: 'name', order: 'asc' } }) })
  if (!r.ok) return []
  const names = ((await r.json()) || []).filter(f => f.id && f.name.endsWith('.json')).map(f => f.name)
  const docs = await Promise.all(names.map(async n => { const x = await fetch(`${URL_BASE}/storage/v1/object/project-files/${base}/${encodeURIComponent(n)}?cb=${Date.now()}`, { headers: svc(), cache: 'no-store' }); return x.ok ? x.json().catch(() => null) : null }))
  const L = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map(x => flat(x, 240)).filter(Boolean)
  return docs.filter(Boolean).map(d => ({ at: String(d.at || '').slice(0, 16).replace('T', ' '), built: L(d.built, 12), tested: L(d.tested, 12), not_tested: L(d.not_tested, 8), build: flat(d.build, 40), note: flat(d.note, 400) }))
}
// One proof as lines for a prompt.
export const proofLines = (ps) => ps.length ? ps.map(p => `- Filed ${p.at}${p.build ? `, build ${p.build}` : ''}. Built: ${p.built.join('; ') || 'none named'}. Tested: ${p.tested.join('; ') || 'none named'}. Not tested: ${p.not_tested.join('; ') || 'none named'}.${p.note ? ` Note: ${p.note}` : ''}`).join('\n') : 'none filed'
