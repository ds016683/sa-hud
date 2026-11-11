// Live Files door (David, 10/17). Three ops:
//   POST { action: 'draft', id }  or  { action: 'draft', bucket, path, name }
//   -> creates a draft in David's Outlook with the file attached and returns
//      { webLink } so the HUD can open it. Nothing is sent; he finishes the
//      note in Outlook. The draft itself is made in api/_draft.mjs, the one
//      maker Lumen's draft_email shares.
//   POST { action: 'put', name, content_base64, ... } -> the HUD's own upload path.
//   POST { action: 'synopsis', id, refresh? } (David 11/10: "click it and a quick synopsis
//      of the document ... in an overlay") -> { synopsis, partial, made_at, cached }. The
//      document is read once by Lumen's model and the synopsis is kept beside the files
//      (project-files/live-meta/<id>.json), so the second click is instant.
import { authorized } from './lumen-hud.mjs'
import { createDraft } from './_draft.mjs'
import { textOf } from './_topdf.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const enc = (p) => String(p).split('/').map(encodeURIComponent).join('/')

async function fileRow(body) {
  if (body.id) {
    const r = await fetch(`${URL_BASE}/rest/v1/live_files?select=id,name,bucket,path,mime,size,note&id=eq.${encodeURIComponent(body.id)}&limit=1`, { headers: { ...hdr(), 'Content-Type': 'application/json' } })
    const rows = r.ok ? await r.json() : []
    if (!rows.length) throw new Error('no such live file')
    return rows[0]
  }
  if (!body.path) throw new Error('id or path required')
  return { name: body.name || String(body.path).split('/').pop(), bucket: body.bucket || 'project-files', path: body.path, mime: body.mime || null, note: null }
}

async function download(f) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${f.bucket}/${enc(f.path)}`, { headers: hdr() })
  if (!r.ok) throw new Error(`storage read -> ${r.status}`)
  return { bytes: Buffer.from(await r.arrayBuffer()), mime: f.mime || r.headers.get('content-type') || 'application/octet-stream' }
}

// ---- synopsis --------------------------------------------------------------------------
const MODEL = () => process.env.LUMEN_MODEL || 'claude-opus-5-5'
const extOf = (n) => (String(n || '').split('.').pop() || '').toLowerCase()
const SYN_IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }
const SYN_TEXT = ['docx', 'xlsx', 'xls', 'csv', 'tsv', 'pptx', 'txt', 'md', 'html', 'htm', 'json', 'log', 'yml', 'yaml']
const TEXT_CAP = 600000            // characters sent to the model; more than that and the synopsis says it is partial
const PDF_MAX = 22 * 1024 * 1024   // the API takes 32 MB a request, and base64 adds a third
const IMG_MAX = 3.5 * 1024 * 1024
const metaPath = (id) => `live-meta/${id}.json`
async function readMeta(id) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${metaPath(id)}`, { headers: hdr() })
  if (!r.ok) return null
  try { return await r.json() } catch { return null }
}
async function writeMeta(id, meta) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${metaPath(id)}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(meta) })
  if (!r.ok) console.warn('synopsis cache', r.status, (await r.text()).slice(0, 120))
}
const SYN_SYSTEM = [
  'You write a quick synopsis of one document for David Smith, CEO of Third Horizon, who is deciding whether to open it.',
  'Plain text in this shape. First, one or two sentences: what the document is, who wrote it or who it is for when the document itself says so, and what it is for.',
  'Then three to six short bullets, each on its own line starting with "- ", carrying what matters in it: decisions, asks, numbers, dates, names, and anything left blank, marked as a draft, or unfinished.',
  "Use the document's own words for names, titles, figures and terms. Do not reword them, and add nothing the document does not say. If it is a form or a template, say so and name the blanks.",
  'No heading, no preamble, no closing line, no bold, never an em dash. Under 140 words.',
].join(' ')
async function askModel(content) {
  const call = (extras) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(extras ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}) },
    body: JSON.stringify({ model: MODEL(), max_tokens: 4000, system: SYN_SYSTEM, messages: [{ role: 'user', content }], ...(extras ? { output_config: { effort: 'low' }, fallbacks: 'default' } : {}) }),
  })
  // Low effort and the refusal fallback are asked for first; a model that does not take them answers 400, and the plain request goes instead.
  let r = await call(true)
  if (r.status === 400) r = await call(false)
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j?.error?.message || `model ${r.status}`)
  if (j.stop_reason === 'refusal') throw new Error('the model declined to read this one')
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('').trim()
  if (!text) throw new Error('the model returned no synopsis')
  return { text: text.replace(/\s*—\s*/g, ', ').replace(/\*\*/g, ''), model: j.model || MODEL() }
}
async function synopsisOf(f) {
  if (f.bucket === 'link' || f.bucket === 'request') throw new Error('there is no document to read yet')
  const e = extOf(f.name)
  if (e !== 'pdf' && !SYN_IMG[e] && !SYN_TEXT.includes(e)) throw new Error('no synopsis for this kind of file')
  const { bytes } = await download(f)
  let content, partial = false
  if (e === 'pdf') {
    if (bytes.length > PDF_MAX) throw new Error('this PDF is too large to read in one pass')
    content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') } }]
  } else if (SYN_IMG[e]) {
    if (bytes.length > IMG_MAX) throw new Error('this image is too large to read')
    content = [{ type: 'image', source: { type: 'base64', media_type: SYN_IMG[e], data: bytes.toString('base64') } }]
  } else {
    let text = await textOf(f.name, bytes)
    if (e === 'html' || e === 'htm') text = text.replace(/<(script|style|svg|head)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim()
    if (!text) throw new Error('there are no words in it to read')
    if (text.length > TEXT_CAP) { partial = true; text = text.slice(0, TEXT_CAP) }
    content = [{ type: 'text', text: `<document>\n${text}\n</document>` }]
  }
  content.push({ type: 'text', text: `File name: ${f.name}${partial ? '\nOnly the first part of this document is above; say that the synopsis covers the first part.' : ''}\n\nWrite the synopsis.` })
  const out = await askModel(content)
  return { synopsis: out.text, partial, model: out.model }
}

async function draftWithFile(f) {
  const { bytes, mime } = await download(f)
  const subject = f.name.replace(/\.[A-Za-z0-9]+$/, '')
  const out = await createDraft({ subject, body: f.note ? `${f.note}\n\n` : '', files: [{ name: f.name, mime, bytes }] })
  return { id: out.id, webLink: out.webLink, subject, size: bytes.length }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' })
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  try {
    const body = req.body || {}
    if (body.action === 'put') {
      // The HUD's own upload path: bytes come base64 in the body, go up with the service key
      // (no storage policy in the way), and the index row is written here. Under 4.5 MB.
      const name = String(body.name || 'file').replace(/[^A-Za-z0-9._ -]/g, '_')
      const bytes = Buffer.from(String(body.content_base64 || ''), 'base64')
      if (!bytes.length) return res.status(400).json({ error: 'empty file' })
      const root = body.objective_id ? `objectives/${body.objective_id}/files` : body.project_id ? String(body.project_id) : 'live'
      const path = `${root}/${name}`
      const up = await fetch(`${URL_BASE}/storage/v1/object/project-files/${enc(path)}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': body.mime || 'application/octet-stream', 'x-upsert': 'true' }, body: bytes })
      if (!up.ok) return res.status(502).json({ error: `storage -> ${up.status}: ${(await up.text()).slice(0, 160)}` })
      const stem = (n) => String(n || '').replace(/\.[^.]+$/, '').replace(/[\s_.-]*(v|ver|version)\s*\d+[a-z]?$/i, '').replace(/[\s_.-]*\(\d+\)$/, '').replace(/[\s_.-]+$/, '').trim().toLowerCase()
      const ext = (n) => (String(n || '').split('.').pop() || '').toLowerCase()
      const inRootR = await fetch(`${URL_BASE}/rest/v1/live_files?select=id,name,version&path=like.${encodeURIComponent(root + '/%')}&superseded_by=is.null&filed_at=is.null`, { headers: { ...hdr(), 'Content-Type': 'application/json' } })
      const inRoot = inRootR.ok ? await inRootR.json() : []
      const prior = inRoot.filter(r => stem(r.name) === stem(name) && ext(r.name) === ext(name)).sort((a, b) => (b.version || 1) - (a.version || 1))
      const row = { user_id: '9d28e8cf-3e35-48d9-a029-1327bd37fdd4', name, bucket: 'project-files', path, size: bytes.length, mime: body.mime || null, objective_id: body.objective_id || null, project_id: body.project_id || null, note: body.note || null, source: body.source || 'david', version: prior.length ? (prior[0].version || 1) + 1 : 1 }
      const ins = await fetch(`${URL_BASE}/rest/v1/live_files`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(row) })
      if (!ins.ok) return res.status(502).json({ error: `index -> ${ins.status}: ${(await ins.text()).slice(0, 160)}` })
      const made = (await ins.json())[0]
      for (const pr of prior) await fetch(`${URL_BASE}/rest/v1/live_files?id=eq.${pr.id}`, { method: 'PATCH', headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ superseded_by: made.id }) })
      return res.status(200).json({ ok: true, row: made })
    }
    if (body.action === 'synopsis') {
      if (!body.id) return res.status(400).json({ error: 'id required' })
      if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'no model key on this deployment' })
      const f = await fileRow(body)
      const kept = body.refresh ? null : await readMeta(f.id)
      if (kept?.synopsis && kept.path === f.path && (kept.size || null) === (f.size || null)) return res.status(200).json({ ok: true, synopsis: kept.synopsis, partial: !!kept.partial, made_at: kept.made_at, cached: true })
      const made = await synopsisOf(f)
      const meta = { v: 1, id: f.id, path: f.path, size: f.size || null, name: f.name, synopsis: made.synopsis, partial: made.partial, model: made.model, made_at: new Date().toISOString() }
      await writeMeta(f.id, meta)
      return res.status(200).json({ ok: true, synopsis: meta.synopsis, partial: meta.partial, made_at: meta.made_at, cached: false })
    }
    if (body.action === 'draft') {
      const f = await fileRow(body)
      const out = await draftWithFile(f)
      return res.status(200).json({ ok: true, ...out, name: f.name })
    }
    return res.status(400).json({ error: 'unknown action' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
