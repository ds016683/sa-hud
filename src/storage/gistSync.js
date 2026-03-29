// GitHub Gist API client.
// Handles create, fetch, and update of a private Gist with JSON files.

const GIST_API = 'https://api.github.com/gists'

class GistError extends Error {
  constructor(status, body) {
    const messages = {
      401: 'The access sigil is invalid or expired. Update your token in settings.',
      403: 'The token lacks required permissions. Ensure it has Gist scope.',
      404: 'Gist not found. It may have been deleted.',
      422: 'Data rejected by GitHub. The payload may be too large (1MB limit).',
      429: 'Rate limited by GitHub. Sync will retry shortly.',
    }
    super(messages[status] || `Sync failed (HTTP ${status})`)
    this.name = 'GistError'
    this.status = status
    this.body = body
  }
}

function parseGistFile(gist, filename) {
  const file = gist.files?.[filename]
  if (!file || !file.content) return null
  try {
    return JSON.parse(file.content)
  } catch {
    return null
  }
}

function hasData(value) {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export async function validateToken(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new GistError(res.status, await res.text())
  return res.json()
}

export async function createGist(token) {
  const res = await fetch(GIST_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
    },
    body: JSON.stringify({
      description: 'Sovereign Architect HUD — synced state',
      public: false,
      files: {
        'activity-log.json': { content: '[]' },
        'portfolio.json': { content: '[]' },
        'game-state.json': { content: '{}' },
        'todos.json': { content: '[]' },
        'ideas.json': { content: '[]' },
      },
    }),
  })
  if (!res.ok) throw new GistError(res.status, await res.text())
  const gist = await res.json()
  return gist.id
}

export async function fetchGist(gistId, token) {
  const res = await fetch(`${GIST_API}/${gistId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new GistError(res.status, await res.text())
  const gist = await res.json()
  return {
    activityLog: parseGistFile(gist, 'activity-log.json'),
    portfolio: parseGistFile(gist, 'portfolio.json'),
    gameState: parseGistFile(gist, 'game-state.json'),
    todos: parseGistFile(gist, 'todos.json'),
    ideas: parseGistFile(gist, 'ideas.json'),
  }
}

export async function updateGist(gistId, token, data) {
  const files = {}
  if (data.activityLog !== undefined) {
    files['activity-log.json'] = { content: JSON.stringify(data.activityLog) }
  }
  if (data.portfolio !== undefined) {
    files['portfolio.json'] = { content: JSON.stringify(data.portfolio) }
  }
  if (data.gameState !== undefined) {
    files['game-state.json'] = { content: JSON.stringify(data.gameState) }
  }
  if (data.todos !== undefined) {
    files['todos.json'] = { content: JSON.stringify(data.todos) }
  }
  if (data.ideas !== undefined) {
    files['ideas.json'] = { content: JSON.stringify(data.ideas) }
  }

  const res = await fetch(`${GIST_API}/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
    },
    body: JSON.stringify({ files }),
  })
  if (!res.ok) throw new GistError(res.status, await res.text())
  return res.json()
}

export { GistError, hasData }
