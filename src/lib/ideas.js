// The Ideas Board (David 11/21). One file in project-files: ideas/index.json (api/_ideas.mjs holds the shape).
// Parking goes through Lumen's door so he can place it on a shelf or lay it on an idea already there; moving an
// idea to another shelf, or taking a layer off, is David's own hand and writes here.
import { supabase } from './supabase'
import { parkIdeaDoor } from './lumenPanel'

const BUCKET = 'project-files', PATH = 'ideas/index.json'
async function read() {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(PATH, 60)
    if (error || !data?.signedUrl) return { v: 1, ideas: [] }
    const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
    const d = res.ok ? await res.json() : null
    return { v: 1, ideas: Array.isArray(d?.ideas) ? d.ideas : [] }
  } catch { return { v: 1, ideas: [] } }
}
async function write(doc) {
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, new Blob([JSON.stringify(doc)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}
export async function loadIdeas() { return (await read()).ideas }
// src: 'told' (typed in the box) | 'voice' | 'recon' (sent from the Catches list, with catchId).
export const parkIdea = ({ text, src = 'told', where = '', catchId = null }) => parkIdeaDoor({ text, src, where, catch_id: catchId })
export async function updateIdea(id, patch) {
  const doc = await read()
  doc.ideas = doc.ideas.map(i => i.id === id ? { ...i, ...patch } : i)
  await write(doc)
  return doc.ideas
}
// A layer off an idea; the idea goes with its last layer. Kept in ideas/removed.json so nothing is lost.
export async function removeLayer(ideaId, layerId) {
  const doc = await read()
  const idea = doc.ideas.find(i => i.id === ideaId)
  if (!idea) return doc.ideas
  const gone = (idea.layers || []).find(l => l.id === layerId)
  idea.layers = (idea.layers || []).filter(l => l.id !== layerId)
  if (!idea.layers.length) doc.ideas = doc.ideas.filter(i => i.id !== ideaId)
  try {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl('ideas/removed.json', 60)
    const prev = data?.signedUrl ? await fetch(`${data.signedUrl}&cb=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []) : []
    await supabase.storage.from(BUCKET).upload('ideas/removed.json', new Blob([JSON.stringify([...(Array.isArray(prev) ? prev : []), { at: new Date().toISOString(), idea: { id: idea.id, title: idea.title, shelf: idea.shelf }, layer: gone }])], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  } catch { /* the board still changes */ }
  await write(doc)
  return doc.ideas
}
