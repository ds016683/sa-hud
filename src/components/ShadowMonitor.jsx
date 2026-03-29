import { useState } from 'react'
import { shadows as shadowDefinitions } from '../constants/gameData'

const ShadowMonitor = ({ onShadowChange, initialShadows = {} }) => {
  const [shadows, setShadows] = useState(() =>
    shadowDefinitions.map(shadow => ({
      ...shadow,
      intensity: initialShadows[shadow.id] || null
    }))
  )
  const [activeTooltip, setActiveTooltip] = useState(null)

  const intensityColors = {
    low: 'bg-amber-100 hover:bg-amber-200 text-amber-800',
    med: 'bg-orange-200 hover:bg-orange-300 text-orange-900',
    high: 'bg-rose-600 hover:bg-rose-500 text-white'
  }

  const toggleIntensity = (index, level) => {
    const newShadows = [...shadows]
    const shadow = newShadows[index]
    const previousIntensity = shadow.intensity

    if (shadow.intensity === level) {
      newShadows[index].intensity = null
    } else {
      newShadows[index].intensity = level
    }
    setShadows(newShadows)

    if (onShadowChange) {
      onShadowChange(shadow.id, newShadows[index].intensity, previousIntensity)
    }
  }

  const activeShadows = shadows.filter(s => s.intensity !== null)
  const activeShadowCount = activeShadows.length
  const hasHighIntensity = activeShadows.some(s => s.intensity === 'high')

  return (
    <div className="game-panel p-3 relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-game text-base text-game-gold">SHADOW MECHANICS</h3>
        {activeShadowCount > 0 && (
          <span className={`px-2 py-1 text-white text-xs font-bold rounded animate-pulse ${hasHighIntensity ? 'bg-game-red' : 'bg-amber-500'}`}>
            {activeShadowCount} ACTIVE
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {shadows.map((shadow, index) => {
          const isActive = shadow.intensity !== null

          return (
            <div
              key={shadow.id}
              className={`
                p-2 rounded border transition-all
                ${isActive
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-game-darker border-game-border'
                }
              `}
            >
              <button
                className="flex items-center justify-between mb-2 w-full text-left hover:bg-black/5 rounded p-1 -m-1 transition-all"
                onClick={() => setActiveTooltip(activeTooltip === shadow.id ? null : shadow.id)}
              >
                <div className="flex items-center gap-2">
                  <shadow.Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : 'text-game-text-muted'}`} strokeWidth={1.5} />
                  <div>
                    <span className={`text-xs font-bold ${isActive ? 'text-rose-600' : 'text-game-text'}`}>
                      {shadow.name}
                    </span>
                    <div className="text-[8px] text-game-text-dim">tap for info</div>
                  </div>
                </div>
              </button>

              {/* Intensity buttons */}
              <div className="flex h-6 rounded overflow-hidden border border-game-border">
                {['low', 'med', 'high'].map((level) => (
                  <button
                    key={level}
                    onClick={() => toggleIntensity(index, level)}
                    className={`
                      flex-1 text-[8px] font-semibold uppercase transition-all
                      ${shadow.intensity === level
                        ? intensityColors[level]
                        : 'bg-game-darker hover:bg-game-border text-game-text-muted'}
                      cursor-pointer active:scale-95
                      ${level !== 'high' ? 'border-r border-game-border' : ''}
                    `}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {isActive && (
                <div className="mt-2 pt-2 border-t border-rose-200">
                  <div className="flex items-start gap-1.5">
                    <span className="text-game-gold text-[10px] font-bold mt-0.5">ANTIDOTE:</span>
                    <span className="text-[10px] text-game-text italic">
                      {shadow.antidote}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activeShadowCount === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-medium text-emerald-700">All Clear</span>
          </div>
        </div>
      )}

      {hasHighIntensity && (
        <div className="bg-rose-50 border border-rose-200 rounded p-2 mt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-rose-600">HIGH INTENSITY SHADOW</span>
          </div>
          <p className="text-[10px] text-game-text-muted">
            Apply antidote immediately. High intensity shadows compound rapidly.
          </p>
        </div>
      )}

      {activeShadowCount >= 2 && !hasHighIntensity && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs font-semibold text-amber-700">MULTIPLE SHADOWS</span>
          </div>
          <p className="text-[10px] text-game-text-muted">
            Apply antidotes before they compound.
          </p>
        </div>
      )}

      {activeShadowCount === 1 && !hasHighIntensity && (
        <div className="bg-amber-50 border border-amber-100 rounded p-2 mt-2">
          <p className="text-[10px] text-game-text-muted">
            Shadow detected. Apply antidote before it compounds.
          </p>
        </div>
      )}

      <div className="mt-2 text-[10px] text-game-text-dim">
        Select intensity level
      </div>

      {/* Tooltip Overlay */}
      {activeTooltip && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 rounded-lg shadow-lg"
          onClick={() => setActiveTooltip(null)}
        >
          {shadows.filter(s => s.id === activeTooltip).map(shadow => (
            <div
              key={shadow.id}
              className="bg-white border border-game-border rounded-lg p-4 max-w-sm mx-2 shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <shadow.Icon className="w-5 h-5 text-rose-500" strokeWidth={1.5} />
                <h4 className="font-game text-rose-600 text-base">{shadow.name}</h4>
              </div>

              <p className="text-game-text text-sm mb-3">{shadow.description}</p>

              <div className="mb-3 p-2 bg-game-darker rounded border border-game-border">
                <span className="text-[10px] text-game-gold font-semibold">TRIGGER: </span>
                <span className="text-[10px] text-game-text-muted">{shadow.trigger}</span>
              </div>

              <div className="space-y-2 mb-3 border-t border-game-border pt-3">
                <div className="text-[10px] text-game-text-dim font-semibold mb-1">INTENSITY LEVELS:</div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 min-w-[40px] text-center">LOW</span>
                  <span className="text-[10px] text-game-text-muted">{shadow.intensityGuide.low}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-200 text-orange-900 min-w-[40px] text-center">MED</span>
                  <span className="text-[10px] text-game-text-muted">{shadow.intensityGuide.med}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-600 text-white min-w-[40px] text-center">HIGH</span>
                  <span className="text-[10px] text-game-text-muted">{shadow.intensityGuide.high}</span>
                </div>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-200 rounded mb-3">
                <span className="text-[10px] text-amber-700 font-semibold">ANTIDOTE: </span>
                <span className="text-[10px] text-game-text">{shadow.antidote}</span>
              </div>

              <button
                className="w-full py-2 bg-game-darker hover:bg-game-border text-game-text-muted text-xs rounded transition-all border border-game-border"
                onClick={() => setActiveTooltip(null)}
              >
                Close
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ShadowMonitor
