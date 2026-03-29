// Sync engine: local-first writes with debounced push to GitHub Gist.
// Orchestrates the storage adapter and Gist API client.

import storageAdapter, {
  STORAGE_KEY_ACTIVITY,
  STORAGE_KEY_PORTFOLIO,
  STORAGE_KEY_GAME_STATE,
  STORAGE_KEY_TODOS,
  STORAGE_KEY_IDEAS,
} from './storageAdapter'
import { fetchGist, updateGist, hasData } from './gistSync'

const SYNC_DEBOUNCE_MS = 5000
const SETTINGS_KEY = 'sovereign-architect-sync-settings'

// Sync status enum
export const SyncStatus = {
  DISCONNECTED: 'disconnected', // No credentials
  SYNCED: 'synced',             // Up to date
  SYNCING: 'syncing',           // Push/pull in progress
  DIRTY: 'dirty',               // Local changes pending
  ERROR: 'error',               // Last sync failed
  OFFLINE: 'offline',           // No network
}

export function createSyncEngine() {
  let state = {
    status: SyncStatus.DISCONNECTED,
    lastSyncAt: null,
    error: null,
    gistId: null,
    token: null,
  }

  let debounceTimer = null
  let dirty = false
  let unsubscribeStorage = null
  let onlineListener = null
  let beforeUnloadListener = null
  const statusListeners = new Set()

  function notifyStatusChange() {
    for (const fn of statusListeners) {
      fn({ ...state })
    }
  }

  function setStatus(status, error = null) {
    state.status = status
    state.error = error
    notifyStatusChange()
  }

  function getCredentials() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function saveCredentials(gistId, token) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ gistId, token }))
    state.gistId = gistId
    state.token = token
  }

  function clearCredentials() {
    localStorage.removeItem(SETTINGS_KEY)
    state.gistId = null
    state.token = null
  }

  function getAllLocalData() {
    return {
      activityLog: storageAdapter.getItem(STORAGE_KEY_ACTIVITY) || [],
      portfolio: storageAdapter.getItem(STORAGE_KEY_PORTFOLIO) || [],
      gameState: storageAdapter.getItem(STORAGE_KEY_GAME_STATE) || {},
      todos: storageAdapter.getItem(STORAGE_KEY_TODOS) || [],
      ideas: storageAdapter.getItem(STORAGE_KEY_IDEAS) || [],
    }
  }

  function hydrateLocal(remote) {
    if (remote.activityLog !== null && remote.activityLog !== undefined) {
      storageAdapter.setItem(STORAGE_KEY_ACTIVITY, remote.activityLog)
    }
    if (remote.portfolio !== null && remote.portfolio !== undefined) {
      storageAdapter.setItem(STORAGE_KEY_PORTFOLIO, remote.portfolio)
    }
    if (remote.gameState !== null && remote.gameState !== undefined) {
      storageAdapter.setItem(STORAGE_KEY_GAME_STATE, remote.gameState)
    }
    if (remote.todos !== null && remote.todos !== undefined) {
      storageAdapter.setItem(STORAGE_KEY_TODOS, remote.todos)
    }
    if (remote.ideas !== null && remote.ideas !== undefined) {
      storageAdapter.setItem(STORAGE_KEY_IDEAS, remote.ideas)
    }
  }

  async function pushToGist() {
    if (!state.gistId || !state.token) return
    if (!navigator.onLine) {
      setStatus(SyncStatus.OFFLINE)
      return
    }

    setStatus(SyncStatus.SYNCING)
    try {
      const local = getAllLocalData()
      await updateGist(state.gistId, state.token, local)
      dirty = false
      state.lastSyncAt = new Date().toISOString()
      setStatus(SyncStatus.SYNCED)
    } catch (err) {
      console.error('Sync push failed:', err)
      setStatus(SyncStatus.ERROR, err.message)
    }
  }

  async function pullFromGist() {
    if (!state.gistId || !state.token) return null
    if (!navigator.onLine) {
      setStatus(SyncStatus.OFFLINE)
      return null
    }

    setStatus(SyncStatus.SYNCING)
    try {
      const remote = await fetchGist(state.gistId, state.token)
      state.lastSyncAt = new Date().toISOString()
      return remote
    } catch (err) {
      console.error('Sync pull failed:', err)
      setStatus(SyncStatus.ERROR, err.message)
      return null
    }
  }

  // Initial sync: apply priority rules (Gist is source of truth)
  // Returns the data that should be used to hydrate React state, or null if no sync needed.
  async function initialSync() {
    const remote = await pullFromGist()
    if (!remote) return null // Pull failed, stay on local

    const local = getAllLocalData()
    const remoteHasData = hasData(remote.activityLog) || hasData(remote.portfolio) || hasData(remote.gameState) || hasData(remote.todos) || hasData(remote.ideas)
    const localHasData = hasData(local.activityLog) || hasData(local.portfolio) || hasData(local.gameState) || hasData(local.todos) || hasData(local.ideas)

    if (remoteHasData) {
      // Gist wins — overwrite local
      hydrateLocal(remote)
      setStatus(SyncStatus.SYNCED)
      return remote
    } else if (localHasData) {
      // Gist empty, local has data — push local up
      await pushToGist()
      return null // Local data is already in React state
    } else {
      // Both empty
      setStatus(SyncStatus.SYNCED)
      return null
    }
  }

  function schedulePush() {
    dirty = true
    if (state.status === SyncStatus.DISCONNECTED) return
    if (!state.gistId || !state.token) return

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(pushToGist, SYNC_DEBOUNCE_MS)
  }

  function start() {
    const creds = getCredentials()
    if (!creds) {
      setStatus(SyncStatus.DISCONNECTED)
      return
    }

    state.gistId = creds.gistId
    state.token = creds.token

    // Listen for localStorage writes from hooks
    unsubscribeStorage = storageAdapter.onChange((key) => {
      const syncedKeys = [
        STORAGE_KEY_ACTIVITY,
        STORAGE_KEY_PORTFOLIO,
        STORAGE_KEY_GAME_STATE,
        STORAGE_KEY_TODOS,
        STORAGE_KEY_IDEAS,
      ]
      if (syncedKeys.includes(key)) {
        schedulePush()
      }
    })

    // Reconnect when coming online
    onlineListener = () => {
      if (dirty && state.gistId) {
        pushToGist()
      }
    }
    window.addEventListener('online', onlineListener)

    // Best-effort sync on tab close
    beforeUnloadListener = () => {
      if (dirty && state.gistId && state.token) {
        const local = getAllLocalData()
        const body = JSON.stringify({
          files: {
            'activity-log.json': { content: JSON.stringify(local.activityLog) },
            'portfolio.json': { content: JSON.stringify(local.portfolio) },
            'game-state.json': { content: JSON.stringify(local.gameState) },
            'todos.json': { content: JSON.stringify(local.todos) },
            'ideas.json': { content: JSON.stringify(local.ideas) },
          },
        })
        // navigator.sendBeacon doesn't support auth headers, so use fetch keepalive
        try {
          fetch(`https://api.github.com/gists/${state.gistId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${state.token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json',
            },
            body,
            keepalive: true,
          })
        } catch {
          // Best effort — nothing we can do if it fails
        }
      }
    }
    window.addEventListener('beforeunload', beforeUnloadListener)
  }

  function stop() {
    clearTimeout(debounceTimer)
    if (unsubscribeStorage) unsubscribeStorage()
    if (onlineListener) window.removeEventListener('online', onlineListener)
    if (beforeUnloadListener) window.removeEventListener('beforeunload', beforeUnloadListener)
    unsubscribeStorage = null
    onlineListener = null
    beforeUnloadListener = null
  }

  function disconnect() {
    stop()
    clearCredentials()
    dirty = false
    setStatus(SyncStatus.DISCONNECTED)
  }

  async function connect(gistId, token) {
    saveCredentials(gistId, token)
    start()
    return initialSync()
  }

  function onStatusChange(fn) {
    statusListeners.add(fn)
    return () => statusListeners.delete(fn)
  }

  function getState() {
    return { ...state }
  }

  function forcePush() {
    dirty = true
    clearTimeout(debounceTimer)
    return pushToGist()
  }

  return {
    start,
    stop,
    connect,
    disconnect,
    initialSync,
    pushToGist: forcePush,
    pullFromGist,
    onStatusChange,
    getState,
    getCredentials,
    saveCredentials,
  }
}
