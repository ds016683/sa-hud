// Dropbox vault client for SA-HUD Ecosystem file tree.
// Calls the Vercel serverless function at /api/vault, which holds the refresh token.
// Never embed tokens in client JS. Token wiring docs in scripts/README-DROPBOX-WIRING.md.

const VAULT_ROOT = '/0. David Vault/Lumen OS'

async function call(action, params = {}) {
  const r = await fetch('/api/vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  })
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    throw new Error(`vault ${action} ${r.status}: ${t.slice(0, 200)}`)
  }
  return r.json()
}

// Returns nested tree: { name, path, type: 'folder'|'file', children?: [...] }
// One round-trip — server walks the whole vault recursively.
export async function listVault() {
  return call('list', { root: VAULT_ROOT })
}

// Returns { content: string } — raw markdown text for the given Dropbox path.
export async function readFile(path) {
  return call('read', { path })
}

export const VAULT_PATH = VAULT_ROOT
