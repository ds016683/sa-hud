import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'

const STORAGE_KEY = 'sovereign-hud-setup-complete'

// Check if this is first time (no localStorage flag)
export const isFirstTime = () => {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem(STORAGE_KEY)
}

// Mark setup as complete
export const markSetupComplete = () => {
  localStorage.setItem(STORAGE_KEY, 'true')
}

// Reset for testing
export const resetFirstTime = () => {
  localStorage.removeItem(STORAGE_KEY)
}

const FirstTimeNudges = ({
  onComplete,
  sovereigntySet = false,
  phaseSet = false,
  shadowsChecked = false
}) => {
  const [dismissed, setDismissed] = useState({
    sovereignty: sovereigntySet,
    phase: phaseSet,
    shadows: shadowsChecked
  })
  const [showOverlay, setShowOverlay] = useState(true)

  // Update dismissed state when props change (user interacted with component)
  useEffect(() => {
    if (sovereigntySet && !dismissed.sovereignty) {
      setDismissed(prev => ({ ...prev, sovereignty: true }))
    }
  }, [sovereigntySet])

  useEffect(() => {
    if (phaseSet && !dismissed.phase) {
      setDismissed(prev => ({ ...prev, phase: true }))
    }
  }, [phaseSet])

  useEffect(() => {
    if (shadowsChecked && !dismissed.shadows) {
      setDismissed(prev => ({ ...prev, shadows: true }))
    }
  }, [shadowsChecked])

  // Check if all nudges are dismissed
  const allDismissed = dismissed.sovereignty && dismissed.phase && dismissed.shadows

  // Auto-complete when all dismissed
  useEffect(() => {
    if (allDismissed && showOverlay) {
      const timer = setTimeout(() => {
        markSetupComplete()
        onComplete?.()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [allDismissed, showOverlay, onComplete])

  const handleSkipAll = () => {
    markSetupComplete()
    setShowOverlay(false)
    onComplete?.()
  }

  const handleDismissNudge = (key) => {
    setDismissed(prev => ({ ...prev, [key]: true }))
  }

  if (!showOverlay) return null

  const activeNudges = [
    !dismissed.sovereignty && 'sovereignty',
    !dismissed.phase && 'phase',
    !dismissed.shadows && 'shadows'
  ].filter(Boolean)

  if (activeNudges.length === 0) return null

  return (
    <>
      {/* Sovereignty Nudge - Top, pointing to sticky bar */}
      {!dismissed.sovereignty && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="relative">
            {/* Arrow pointing up */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <ChevronUp className="w-6 h-6 text-game-gold animate-bounce" />
            </div>

            <div className="bg-white border border-game-border shadow-md rounded-lg p-4 shadow-2xl max-w-xs mt-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h4 className="font-game text-game-gold text-sm">SOVEREIGNTY CHECK</h4>
                <button
                  onClick={() => handleDismissNudge('sovereignty')}
                  className="text-game-text-dim hover:text-game-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-game-text-muted mb-3">
                Set your current resource level. How much do you have to spend today?
              </p>
              <p className="text-[10px] text-game-text-dim italic">
                Adjust the slider above, or tap to dismiss
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phase Nudge - Bottom left area */}
      {!dismissed.phase && dismissed.sovereignty && (
        <div className="fixed bottom-4 left-4 z-40 animate-fade-in lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2">
          <div className="relative">
            <div className="bg-white border border-game-border shadow-md rounded-lg p-4 shadow-2xl max-w-xs">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h4 className="font-game text-game-gold text-sm">IDENTITY LOOP</h4>
                <button
                  onClick={() => handleDismissNudge('phase')}
                  className="text-game-text-dim hover:text-game-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-game-text-muted mb-3">
                What are you doing right now? Select your current phase in the loop.
              </p>
              <p className="text-[10px] text-game-text-dim italic">
                Tap a phase in the panel, or dismiss to skip
              </p>
            </div>

            {/* Arrow pointing to component */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden lg:block">
              <ChevronDown className="w-6 h-6 text-game-gold animate-bounce rotate-[-90deg]" />
            </div>
          </div>
        </div>
      )}

      {/* Shadow Nudge - Bottom right area */}
      {!dismissed.shadows && dismissed.sovereignty && dismissed.phase && (
        <div className="fixed bottom-4 right-4 z-40 animate-fade-in lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2">
          <div className="relative">
            <div className="bg-white border border-game-border shadow-md rounded-lg p-4 shadow-2xl max-w-xs">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h4 className="font-game text-game-gold text-sm">SHADOW SCAN</h4>
                <button
                  onClick={() => handleDismissNudge('shadows')}
                  className="text-game-text-dim hover:text-game-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-game-text-muted mb-3">
                Any patterns active right now? Check if shadows are present.
              </p>
              <p className="text-[10px] text-game-text-dim italic">
                Set intensity levels, or dismiss if all clear
              </p>
            </div>

            {/* Arrow pointing to component */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden lg:block">
              <ChevronDown className="w-6 h-6 text-game-gold animate-bounce rotate-90" />
            </div>
          </div>
        </div>
      )}

      {/* Skip All Button - shown when any nudge is active */}
      {activeNudges.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleSkipAll}
            className="px-4 py-2 bg-game-darker hover:bg-game-border border border-game-border rounded text-xs text-game-text-dim hover:text-game-text transition-all"
          >
            Skip setup →
          </button>
        </div>
      )}
    </>
  )
}

export default FirstTimeNudges
