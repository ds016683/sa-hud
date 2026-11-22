// Items (David 11/22): "Item means a task, piece of information, email fragment, a document ... anything. if i'm routing
// it, it's going to the list that sits on the board. The action is reconciling, where i direct lumen to do something
// with it." The list itself is still commitments/index.json (lib/commitments.js); this file holds the reconcile hands
// that reach beyond the list: send an Item to another mission, as a gate or as data on its card.
import { supabase } from './supabase'
import { readPage, writePage, blankPage } from './workspace'

// Files that rode in on an Item (an email's attachments, 11/22) follow it to wherever it is reconciled: one live_files
// row each, pointing at the copy already kept under items/, on the mission (project_id) or the card (objective_id).
export async function fileItemFiles(item, { project_id = null, objective_id = null } = {}) {
  const files = Array.isArray(item?.files) ? item.files : []
  for (const f of files) {
    const { error } = await supabase.from('live_files').insert({ user_id: '9d28e8cf-3e35-48d9-a029-1327bd37fdd4', name: f.name, bucket: 'project-files', path: f.path, size: f.size || 0, mime: f.type || null, project_id, objective_id, source: 'email', note: `From an Item${item.where ? `: ${item.where}` : ''}` })
    if (error) throw new Error(`${f.name}: ${error.message}`)
  }
  return files.length
}
export async function itemFileUrl(f) {
  const { data, error } = await supabase.storage.from('project-files').createSignedUrl(f.path, 300)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function loadMissions() {
  const { data, error } = await supabase.from('projects').select('id,name').eq('status', 'active').order('name')
  if (error) throw new Error(error.message)
  return data || []
}

const numOf = (t) => { const m = /^\s*(?:gate\s+)?(\d+)\s*[·.:)-]/i.exec(String(t || '')); return m ? Number(m[1]) : null }
const dayWords = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })

// as 'gate': the next numbered gate on that mission, open. as 'data': a line on the mission's Items tab on its Workbench.
export async function sendToMission(item, mission, as, text = null) {
  const words = String(text || item.what || '').replace(/\s+/g, ' ').trim().slice(0, 300)
  if (!words) throw new Error('nothing to send')
  const from = [item.where, item.heard].filter(Boolean).join(' · ')
  if (as === 'gate') {
    const { data: ts, error: e1 } = await supabase.from('project_tasks').select('text').eq('project_id', mission.id)
    if (e1) throw new Error(e1.message)
    const top = Math.max(0, ...(ts || []).map(t => numOf(t.text)).filter(n => n !== null))
    const { error } = await supabase.from('project_tasks').insert({ project_id: mission.id, text: `${top + 1} · ${words}`, status: 'open', done: false, source: 'reconcile', notes: `Reconciled from an Item${from ? `: ${from}` : ''}.`, due_date: item.by || null })
    if (error) throw new Error(error.message)
    await fileItemFiles(item, { project_id: mission.id })
    return { n: top + 1 }
  }
  const slug = 'items'
  const doc = (await readPage(mission.id, slug).catch(() => null)) || blankPage('Items')
  const line = `${dayWords()} · ${words}${from ? ` (${from})` : ''}`
  doc.text = [String(doc.text || '').trimEnd(), line].filter(Boolean).join('\n')
  doc.updated_at = new Date().toISOString(); doc.updated_by = 'david (reconcile)'
  await writePage(mission.id, slug, doc)
  await fileItemFiles(item, { project_id: mission.id })
  return { tab: 'Items' }
}
