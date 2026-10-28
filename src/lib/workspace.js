// Workspace pages (David, 10/28): "when i say that I want to create a workspace
// on the Mission card's work bench, i want to start building blank pages where
// we can draw, type, design, formulate, analyze, etc." A page is one JSON
// document in the project-files bucket under <root>/workspace/<slug>.json,
// where root is the mission's project id or objectives/<objective id>. The HUD
// renders the pages under Workspace on the card's Workbench pill; sessions
// write the same documents through ~/.claude/hud-board/workspace.py.
import { supabase } from './supabase'

const BUCKET = 'project-files'
export const wsDir = (root) => `${root}/workspace`
export const slugify = (t) => String(t || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'page'

export function blankPage(title) {
  const now = new Date().toISOString()
  return { v: 1, kind: 'workspace-page', title: String(title || 'Untitled').trim() || 'Untitled', text: '', strokes: [], height: 720, created_at: now, updated_at: now, updated_by: 'david (hud)' }
}

const summary = (d) => ({
  title: d.title || 'Untitled',
  updated_at: d.updated_at,
  updated_by: d.updated_by || null,
  words: String(d.text || '').trim() ? String(d.text).trim().split(/\s+/).length : 0,
  strokes: (d.strokes || []).length,
})

export async function listPages(root) {
  const { data, error } = await supabase.storage.from(BUCKET).list(wsDir(root), { limit: 200 })
  if (error) throw new Error(error.message)
  const slugs = (data || []).filter(f => f.name.endsWith('.json')).map(f => f.name.replace(/\.json$/, ''))
  const docs = await Promise.all(slugs.map(async slug => { try { return { slug, ...summary(await readPage(root, slug)) } } catch { return { slug, title: slug, words: 0, strokes: 0 } } }))
  return docs.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
}

export async function readPage(root, slug) {
  // A signed URL is unique per call, so the CDN cannot hand back a stale copy
  // after a session or the HUD has just written the page.
  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${wsDir(root)}/${slug}.json`, 60)
  if (error) throw new Error(error.message)
  const res = await fetch(`${signed.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`read ${res.status}`)
  const d = await res.json()
  return { ...blankPage(d.title), ...d, strokes: Array.isArray(d.strokes) ? d.strokes : [], text: String(d.text || '') }
}

export async function writePage(root, slug, doc) {
  const out = { ...doc, updated_at: new Date().toISOString(), updated_by: 'david (hud)' }
  const { error } = await supabase.storage.from(BUCKET).upload(`${wsDir(root)}/${slug}.json`, new Blob([JSON.stringify(out)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
  return out
}

export async function removePage(root, slug) {
  const { error } = await supabase.storage.from(BUCKET).remove([`${wsDir(root)}/${slug}.json`])
  if (error) throw new Error(error.message)
}
