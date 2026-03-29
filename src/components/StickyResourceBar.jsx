import { useState, useRef } from 'react'
import SyncIndicator from './SyncIndicator'

const StickyResourceBar = ({ sovereignty, setSovereignty, onSovereigntyChange, syncStatus, syncConnected, onSyncClick }) => {
  const [isDragging, setIsDragging] = useState(false)
  const startValueRef = useRef(sovereignty)

  const getStatusColor = () => {
    if (sovereignty >= 80) return 'bg-game-green'
    if (sovereignty >= 60) return 'bg-game-accent'
    if (sovereignty >= 40) return 'bg-yellow-500'
    return 'bg-game-red'
  }

  const getStatusText = () => {
    if (sovereignty >= 80) return 'PEAK'
    if (sovereignty >= 60) return 'EFFECTIVE'
    if (sovereignty >= 40) return 'WARNING'
    if (sovereignty >= 20) return 'CRITICAL'
    return 'COLLAPSE'
  }

  const handleSliderStart = () => {
    setIsDragging(true)
    startValueRef.current = sovereignty
  }

  const handleSliderEnd = () => {
    setIsDragging(false)
    const newValue = sovereignty
    const oldValue = startValueRef.current
    // Only log if value actually changed
    if (newValue !== oldValue && onSovereigntyChange) {
      onSovereigntyChange(newValue, oldValue)
    }
  }

  return (
    <div className="sticky top-[41px] z-50 fantasy-header py-2 px-3 md:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Title */}
          <div className="flex-shrink-0">
            <span className="font-game text-xs md:text-sm text-game-gold">SOVEREIGNTY</span>
          </div>

          {/* Bar */}
          <div className="flex-1 min-w-0">
            <div className="fantasy-stat-bar h-4 md:h-5">
              <div
                className={`h-full ${getStatusColor()} flex items-center justify-center transition-all duration-500`}
                style={{ width: `${sovereignty}%` }}
              >
                <span className="text-[8px] md:text-[10px] font-bold text-white whitespace-nowrap px-1 drop-shadow-md">
                  {sovereignty > 20 && (
                    <>
                      <span className="hidden sm:inline">{sovereignty}% - {getStatusText()}</span>
                      <span className="sm:hidden">{sovereignty}%</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Value */}
          <div className="flex-shrink-0 text-right">
            <span className="text-base md:text-lg font-bold text-game-gold">{sovereignty}%</span>
          </div>

          {/* Slider */}
          <div className="flex-shrink-0 w-20 md:w-32">
            <input
              type="range"
              min="0"
              max="100"
              value={sovereignty}
              onChange={(e) => setSovereignty(parseInt(e.target.value))}
              onMouseDown={handleSliderStart}
              onMouseUp={handleSliderEnd}
              onTouchStart={handleSliderStart}
              onTouchEnd={handleSliderEnd}
              className="w-full h-2 cursor-pointer"
            />
          </div>

          {/* Sync Indicator */}
          <SyncIndicator
            status={syncStatus}
            isConnected={syncConnected}
            onClick={onSyncClick}
          />
        </div>
      </div>
    </div>
  )
}

export default StickyResourceBar
