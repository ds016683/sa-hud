// Project artifacts: structured work products kept as JSON in the
// project-files bucket under <project id>/artifacts/<slug>.json. Lumen drafts
// into them (write_artifact); the HUD renders and edits them on the project page.
import { supabase } from './supabase'

const BUCKET = 'project-files'
const dir = (projectId) => `${projectId}/artifacts`

export async function listArtifacts(projectId) {
  const { data, error } = await supabase.storage.from(BUCKET).list(dir(projectId), { limit: 200, sortBy: { column: 'name', order: 'asc' } })
  if (error) throw new Error(error.message)
  return (data || []).filter(f => f.name.endsWith('.json')).map(f => ({ slug: f.name.replace(/\.json$/, ''), updated_at: f.updated_at }))
}

export async function readArtifact(projectId, slug) {
  const { data, error } = await supabase.storage.from(BUCKET).download(`${dir(projectId)}/${slug}.json`)
  if (error) throw new Error(error.message)
  return JSON.parse(await data.text())
}

export async function writeArtifact(projectId, slug, doc) {
  const body = JSON.stringify({ ...doc, updated_at: new Date().toISOString(), updated_by: 'david (hud)' }, null, 1)
  const { error } = await supabase.storage.from(BUCKET).upload(`${dir(projectId)}/${slug}.json`, new Blob([body], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}
