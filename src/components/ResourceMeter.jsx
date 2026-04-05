import { useState } from 'react'

const ResourceMeter = ({ sovereignty, setSovereignty }) => {
  const getStatusColor = () => {
    if (sovereignty >= 80) return 'bg-game-green'
    if (sovereignty >= 60) return 'bg-game-blue'
    if (sovereignty >= 40) return 'bg-yellow-500'
    return 'bg-game-red'
  }

  const getStatusText = () => {
    if (sovereignty >= 80) return 'PEAK OPERATING CAPACITY'
    if (sovereignty >= 60) return 'EFFECTIVE - Rest Soon'
    if (sovereignty >= 40) return 'WARNING - Shadows Activating'
    if (sovereignty >= 20) return 'CRITICAL - System Dysfunction Imminent'
    return 'COLLAPSE - All Shadows Active'
  }

  const getTrend = () => {
    // Could be dynamic based on recent changes
    return sovereignty >= 50 ? '↗' : '↘'
  }

  return (
    <div className="game-panel">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-game text-lg text-game-gold">CORE RESOURCE</h3>
        <span className="text-2xl">{getTrend()}</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-game-text-dim">SOVEREIGNTY</span>
          <span className="text-xl font-bold text-game-gold">{sovereignty}%</span>
        </div>

        <div className="stat-bar h-8">
          <div
            className={`stat-bar-fill ${getStatusColor()}`}
            style={{ width: `${sovereignty}%` }}
          >
            <div className="flex items-center justify-center h-full text-xs font-bold text-white">
              {sovereignty > 15 && getStatusText()}
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-game-text-dim italic">
        Self-authored agency + Chosen surrender
      </div>

      {/* Quick Adjustment (for demo purposes) */}
      <div className="mt-4 pt-4 border-t border-game-border">
        <p className="text-xs text-game-text-muted mb-2">Adjust Level (Demo):</p>
        <input
          type="range"
          min="0"
          max="100"
          value={sovereignty}
          onChange={(e) => setSovereignty(parseInt(e.target.value))}
          className="w-full accent-game-gold"
        />
      </div>
    </div>
  )
}

export default ResourceMeter
