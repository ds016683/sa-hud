import { useState, useRef, useEffect } from 'react'
import { X, CloudOff, Cloud, RefreshCw, Unplug } from 'lucide-react'

const SyncSettings = ({ isOpen, onClose, syncState, onConnect, onConnectWithGistId, onDisconnect, onForcePush }) => {
  const [token, setToken] = useState('')
  const [gistId, setGistId] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [pushing, setPushing] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setToken('')
      setGistId('')
      setError(null)
      setShowAdvanced(false)
    }
  }, [isOpen])

  const handleConnect = async (e) => {
    e.preventDefault()
    setError(null)
    setConnecting(true)
    try {
      if (showAdvanced && gistId.trim()) {
        await onConnectWithGistId(token.trim(), gistId.trim())
      } else {
        await onConnect(token.trim())
      }
      setToken('')
      setGistId('')
    } catch (err) {
      setError(err.message || 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    onDisconnect()
  }

  const handleForcePush = async () => {
    setPushing(true)
    try {
      await onForcePush()
    } catch (err) {
      setError(err.message || 'Sync failed')
    } finally {
      setPushing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="game-panel w-full max-w-md shadow-xl" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cloud size={16} className="text-game-gold" />
            <span className="font-game text-game-gold text-sm">CLOUD SYNC</span>
          </div>
          <button
            onClick={onClose}
            className="text-game-text-dim hover:text-game-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {syncState.isConnected ? (
          /* Connected State */
          <div className="space-y-3">
            <div className="bg-game-darker border border-game-border rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-game-text-muted uppercase tracking-wider">Status</span>
                <span className={`text-xs font-bold ${
                  syncState.status === 'synced' ? 'text-game-green' :
                  syncState.status === 'syncing' ? 'text-game-accent' :
                  syncState.status === 'error' ? 'text-game-red' :
                  syncState.status === 'offline' ? 'text-amber-600' :
                  'text-game-text-muted'
                }`}>
                  {syncState.status.toUpperCase()}
                </span>
              </div>

              {syncState.lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-game-text-muted uppercase tracking-wider">Last Sync</span>
                  <span className="text-xs text-game-text">
                    {new Date(syncState.lastSyncAt).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {syncState.gistId && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-game-text-muted uppercase tracking-wider">Gist ID</span>
                  <span className="text-[10px] text-game-text-dim font-mono">{syncState.gistId}</span>
                </div>
              )}
            </div>

            {syncState.error && (
              <div className="bg-rose-50 border border-rose-200 rounded-sm p-2 text-xs text-rose-600">
                {syncState.error}
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-sm p-2 text-xs text-rose-600">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleForcePush}
                disabled={pushing}
                className="flex-1 py-2 bg-game-gold/10 hover:bg-game-gold/20 border border-game-gold/40 text-game-gold text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={12} className={pushing ? 'animate-spin' : ''} />
                {pushing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Unplug size={12} />
                Disconnect
              </button>
            </div>

            <p className="text-[9px] text-game-text-dim text-center">
              Disconnecting clears credentials from this browser. Your data stays in the Gist.
            </p>
          </div>
        ) : (
          /* Not Connected State */
          <form onSubmit={handleConnect} className="space-y-3">
            <p className="text-xs text-game-text-muted">
              Connect to a GitHub Gist to sync your HUD data across devices.
              You need a Personal Access Token with Gist scope.
            </p>

            <div>
              <label className="text-game-text-muted text-[10px] block mb-1 uppercase tracking-wider">
                Personal Access Token
              </label>
              <input
                ref={inputRef}
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxxxxxxxxxx"
                className="w-full bg-white border border-game-border rounded-sm p-2 text-sm text-game-text placeholder-game-text-dim focus:border-game-accent focus:outline-none font-mono"
                required
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[10px] text-game-text-dim hover:text-game-text-muted transition-colors"
            >
              {showAdvanced ? '- Hide advanced' : '+ Connect to existing Gist'}
            </button>

            {showAdvanced && (
              <div>
                <label className="text-game-text-muted text-[10px] block mb-1 uppercase tracking-wider">
                  Existing Gist ID (optional)
                </label>
                <input
                  type="text"
                  value={gistId}
                  onChange={(e) => setGistId(e.target.value)}
                  placeholder="Leave empty to create a new Gist"
                  className="w-full bg-white border border-game-border rounded-sm p-2 text-sm text-game-text placeholder-game-text-dim focus:border-game-accent focus:outline-none font-mono"
                />
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-sm p-2 text-xs text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!token.trim() || connecting}
              className="w-full py-2 bg-game-accent text-white text-xs font-bold rounded-sm transition-all hover:bg-game-blue disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : showAdvanced && gistId.trim() ? 'Connect to Gist' : 'Create Gist & Connect'}
            </button>

            <div className="border-t border-game-border pt-2">
              <p className="text-[9px] text-game-text-dim">
                Your token is stored only in this browser. Create a fine-grained token at
                GitHub Settings &gt; Developer Settings &gt; Personal Access Tokens with Gist scope only.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default SyncSettings
