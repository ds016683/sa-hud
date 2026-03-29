import { useState, useMemo } from 'react'
import { phases } from '../constants/gameData'

const LoopStatus = ({ onPhaseChange, entries = [], sovereignty = 50, initialPhase = null }) => {
  const [currentPhase, setCurrentPhase] = useState(initialPhase)
  const [showSelector, setShowSelector] = useState(initialPhase === null)
  const [activeTooltip, setActiveTooltip] = useState(null)

  // Calculate days since last release from activity log
  const daysSinceRelease = useMemo(() => {
    const releaseEvents = entries.filter(entry => {
      if (entry.type === 'skill' && entry.action === 'sovereign_yield') return true
      if (entry.type === 'checkin' && entry.data?.answer) {
        const answer = entry.data.answer.toLowerCase()
        return answer.includes('yes') || answer.includes('chosen') || answer.includes('surrender')
      }
      if (entry.type === 'loop' && entry.action === 'completed') return true
      return false
    })

    if (releaseEvents.length === 0) return null

    const lastRelease = releaseEvents.reduce((latest, event) => {
      const eventDate = new Date(event.timestamp)
      return eventDate > latest ? eventDate : latest
    }, new Date(0))

    const now = new Date()
    const diffMs = now - lastRelease
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  }, [entries])

  const status = useMemo(() => {
    const hasReleaseData = daysSinceRelease !== null
    const days = daysSinceRelease ?? 0

    if (sovereignty < 20 || (hasReleaseData && days >= 5)) {
      return { label: 'CRITICAL', color: 'bg-rose-500', textColor: 'text-rose-600' }
    }
    if (sovereignty < 40) {
      return { label: 'DEPLETED', color: 'bg-orange-500', textColor: 'text-orange-600' }
    }
    if (sovereignty < 60 || (hasReleaseData && days >= 3)) {
      return { label: 'STRAINED', color: 'bg-amber-500', textColor: 'text-amber-600' }
    }
    return { label: 'HEALTHY', color: 'bg-emerald-500', textColor: 'text-emerald-600' }
  }, [sovereignty, daysSinceRelease])

  const selectPhase = (index) => {
    setCurrentPhase(index)
    setShowSelector(false)
    if (onPhaseChange) {
      onPhaseChange(phases[index].name)
    }
  }

  return (
    <div className="game-panel p-3 relative">
      <h3 className="font-game text-base text-game-gold mb-2">IDENTITY LOOP</h3>

      <div className="space-y-1 mb-3">
        {phases.map((phase, index) => {
          const IconComponent = phase.Icon
          const isActive = index === currentPhase
          const isUnset = currentPhase === null
          return (
            <button
              key={phase.name}
              onClick={() => setActiveTooltip(index)}
              className={`
                w-full flex items-center gap-2 p-1.5 rounded transition-all text-left
                hover:bg-game-darker
                ${isActive
                  ? 'bg-game-accent-light border-l-2 border-game-accent'
                  : isUnset
                    ? 'opacity-60'
                    : 'opacity-40'
                }
              `}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? 'text-game-accent' : 'text-game-text-dim'}`} strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isActive ? 'text-game-text' : 'text-game-text-muted'}`}>
                  {phase.name}
                </span>
                {isActive && (
                  <div className={`text-[9px] ${phase.costColor} truncate`}>{phase.cost}</div>
                )}
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-game-accent animate-pulse flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Warning if Release is overdue */}
      {daysSinceRelease !== null && daysSinceRelease >= 3 && (
        <div className="bg-rose-50 border border-rose-200 rounded p-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            <div>
              <div className="text-xs font-semibold text-rose-600">RELEASE OVERDUE</div>
              <div className="text-[10px] text-game-text-muted">
                {daysSinceRelease} days ago
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-game-text-muted">
        <div className="flex justify-between mb-0.5">
          <span>Status:</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${status.color}`}></div>
            <span className={`font-medium ${status.textColor}`}>{status.label}</span>
          </div>
        </div>
        <div className="flex justify-between">
          <span>Last Release:</span>
          <span className={`${daysSinceRelease === null ? 'text-game-text-dim italic' : daysSinceRelease >= 3 ? 'text-amber-600' : 'text-game-text'}`}>
            {daysSinceRelease === null ? 'Not tracked' : daysSinceRelease === 0 ? 'Today' : `${daysSinceRelease}d ago`}
          </span>
        </div>
      </div>

      {/* Change Phase Button */}
      <div className="mt-2 pt-2 border-t border-game-border">
        <button
          onClick={() => setShowSelector(true)}
          className="w-full bg-game-darker hover:bg-game-accent-light border border-game-border rounded px-2 py-1.5 text-[10px] text-game-text-muted hover:text-game-text transition-all"
        >
          {currentPhase === null ? 'Select Current Phase' : `Change Phase (${phases[currentPhase].name})`}
        </button>
      </div>

      {/* Phase Selection Modal */}
      {showSelector && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 rounded-lg p-2 shadow-lg">
          <div className="w-full max-h-full overflow-y-auto">
            <div className="text-center mb-3">
              <h4 className="font-game text-game-blue text-sm">WHERE ARE YOU?</h4>
              <p className="text-[10px] text-game-text-muted mt-1">
                Select your current phase in the loop
              </p>
            </div>

            <div className="space-y-1.5">
              {phases.map((phase, index) => {
                const IconComponent = phase.Icon
                return (
                  <button
                    key={phase.name}
                    onClick={() => selectPhase(index)}
                    className="w-full flex items-center gap-2 p-2 rounded bg-game-darker hover:bg-game-accent-light border border-game-border hover:border-game-accent/40 transition-all text-left"
                  >
                    <IconComponent className="w-4 h-4 text-game-accent flex-shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-game-text">{phase.name}</span>
                        <span className={`text-[8px] ${phase.costColor}`}>{phase.cost}</span>
                      </div>
                      <div className="text-[9px] text-game-text-dim truncate">{phase.short}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {currentPhase !== null && (
              <button
                onClick={() => setShowSelector(false)}
                className="w-full mt-2 py-1.5 text-[10px] text-game-text-dim hover:text-game-text transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Phase Detail Modal */}
      {activeTooltip !== null && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-white/97 rounded-lg p-2 shadow-lg"
          onClick={() => setActiveTooltip(null)}
        >
          <div
            className="w-full max-h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const phase = phases[activeTooltip]
              const IconComponent = phase.Icon
              const isCurrentPhase = activeTooltip === currentPhase
              return (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-6 h-6 text-game-accent" strokeWidth={1.5} />
                    <div>
                      <h4 className="font-game text-game-blue text-base">{phase.name}</h4>
                      <div className={`text-[10px] ${phase.costColor}`}>{phase.cost}</div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-game-text">{phase.description}</p>

                  {/* Signals */}
                  <div className="bg-game-darker rounded p-2 border border-game-border">
                    <div className="text-[10px] text-game-accent font-semibold mb-1.5">SIGNALS YOU'RE HERE:</div>
                    <ul className="space-y-1">
                      {phase.signals.map((signal, i) => (
                        <li key={i} className="text-[10px] text-game-text-muted flex items-start gap-1.5">
                          <span className="text-game-text-dim mt-0.5">•</span>
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Note */}
                  <div className="bg-amber-50 rounded p-2 border border-amber-200">
                    <div className="text-[10px] text-amber-700 font-semibold mb-1">NOTE:</div>
                    <p className="text-[10px] text-game-text-muted">{phase.note}</p>
                  </div>

                  {/* Transition */}
                  <div className="text-[10px] text-game-text-dim">
                    <span className="text-game-text-muted font-semibold">TRANSITION: </span>
                    {phase.transition}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!isCurrentPhase && (
                      <button
                        onClick={() => {
                          selectPhase(activeTooltip)
                          setActiveTooltip(null)
                        }}
                        className="flex-1 py-2 bg-game-accent text-white text-xs font-bold rounded transition-all hover:bg-game-blue"
                      >
                        Set as Current
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTooltip(null)}
                      className={`${isCurrentPhase ? 'flex-1' : ''} py-2 px-4 bg-game-darker hover:bg-game-border border border-game-border text-game-text-muted text-xs rounded transition-all`}
                    >
                      {isCurrentPhase ? 'Close' : 'Back'}
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default LoopStatus
