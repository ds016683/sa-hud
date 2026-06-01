// Vercel serverless function: /api/vault
// Holds the Dropbox refresh token (env vars only — never expose to client).
//
// Required Vercel env vars (Project Settings → Environment Variables):
//   DROPBOX_APP_KEY
//   DROPBOX_APP_SECRET
//   DROPBOX_REFRESH_TOKEN
//
// Local dev: put the same vars in .env.local (gitignored) and run `vercel dev`,
// or skip — the file tree will show an error toast but the rest of the app boots.

const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'
const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'

let cachedAccessToken = null
let cachedExpiry = 0

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedExpiry - 60_000) return cachedAccessToken
  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN } = process.env
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET || !DROPBOX_REFRESH_TOKEN) {
    throw new Error('Missing Dropbox env vars (DROPBOX_APP_KEY / DROPBOX_APP_SECRET / DROPBOX_REFRESH_TOKEN)')
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: DROPBOX_REFRESH_TOKEN,
    client_id: DROPBOX_APP_KEY,
    client_secret: DROPBOX_APP_SECRET,
  })
  const r = await fetch(TOKEN_URL, { method: 'POST', body })
  if (!r.ok) throw new Error(`token refresh failed: ${r.status} ${await r.text()}`)
  const j = await r.json()
  cachedAccessToken = j.access_token
  cachedExpiry = Date.now() + (j.expires_in || 14400) * 1000
  return cachedAccessToken
}

async function dbxListFolder(token, path, recursive = true) {
  const all = []
  let r = await fetch(`${API}/files/list_folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ path, recursive, include_non_downloadable_files: false }),
  })
  if (!r.ok) throw new Error(`list_folder ${r.status}: ${await r.text()}`)
  let j = await r.json()
  all.push(...j.entries)
  while (j.has_more) {
    r = await fetch(`${API}/files/list_folder/continue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cursor: j.cursor }),
    })
    if (!r.ok) throw new Error(`list_folder/continue ${r.status}: ${await r.text()}`)
    j = await r.json()
    all.push(...j.entries)
  }
  return all
}

function buildTree(rootPath, entries) {
  // entries from Dropbox have .path_display, .name, .['.tag'] in ('folder'|'file')
  const root = { name: rootPath.split('/').pop() || 'root', path: rootPath, type: 'folder', children: [] }
  const map = new Map()
  map.set(rootPath.toLowerCase(), root)
  // sort: folders first by path depth then name, then files
  const sorted = [...entries].sort((a, b) => a.path_display.localeCompare(b.path_display))
  for (const e of sorted) {
    const parentPath = e.path_display.substring(0, e.path_display.lastIndexOf('/'))
    const parent = map.get(parentPath.toLowerCase())
    if (!parent) continue
    const node = {
      name: e.name,
      path: e.path_display,
      type: e['.tag'] === 'folder' ? 'folder' : 'file',
    }
    if (node.type === 'folder') {
      node.children = []
      map.set(node.path.toLowerCase(), node)
    }
    parent.children.push(node)
  }
  // Final sort each folder: folders first, then files, both alpha
  const sortRec = (n) => {
    if (!n.children) return
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    n.children.forEach(sortRec)
  }
  sortRec(root)
  return root
}

async function dbxDownload(token, path) {
  const r = await fetch(`${CONTENT}/files/download`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  })
  if (!r.ok) throw new Error(`download ${r.status}: ${await r.text()}`)
  return r.text()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { action } = body || {}
    const token = await getAccessToken()
    if (action === 'list') {
      const root = body.root || '/0. David Vault/Lumen OS'
      const entries = await dbxListFolder(token, root, true)
      const tree = buildTree(root, entries)
      res.status(200).json(tree)
      return
    }
    if (action === 'read') {
      const { path } = body
      if (!path) {
        res.status(400).json({ error: 'path required' })
        return
      }
      const content = await dbxDownload(token, path)
      res.status(200).json({ path, content })
      return
    }
    res.status(400).json({ error: `unknown action: ${action}` })
  } catch (e) {
    console.error('vault api error:', e)
    res.status(500).json({ error: String(e.message || e) })
  }
}
