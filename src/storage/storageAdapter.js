// Thin wrapper over localStorage with JSON serialization.
// All hooks use this instead of direct localStorage calls,
// so the sync layer can observe writes without coupling to hooks.

const STORAGE_KEY_ACTIVITY = 'sovereign-architect-activity-log'
const STORAGE_KEY_PORTFOLIO = 'sovereign-architect-portfolio'
const STORAGE_KEY_GAME_STATE = 'sovereign-architect-game-state'
const STORAGE_KEY_SETUP = 'sovereign-hud-setup-complete'

// Listeners notified on every setItem call (used by sync engine)
const listeners = new Set()

const storageAdapter = {
  getItem(key) {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      // Notify listeners (sync engine) of the write
      for (const fn of listeners) {
        fn(key, value)
      }
    } catch (e) {
      console.error('storageAdapter.setItem failed:', e)
    }
  },

  removeItem(key) {
    localStorage.removeItem(key)
  },

  // Get a raw string value (for simple flags like setup-complete)
  getRaw(key) {
    return localStorage.getItem(key)
  },

  setRaw(key, value) {
    localStorage.setItem(key, value)
  },

  removeRaw(key) {
    localStorage.removeItem(key)
  },

  // Subscribe to writes. Returns unsubscribe function.
  onChange(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

const STORAGE_KEY_TODOS = 'sovereign-architect-todos'

export {
  STORAGE_KEY_ACTIVITY,
  STORAGE_KEY_PORTFOLIO,
  STORAGE_KEY_GAME_STATE,
  STORAGE_KEY_SETUP,
  STORAGE_KEY_TODOS,
}

export default storageAdapter
