import { useState } from 'react'
import { BookOpen, Radar, Brain, Compass, Zap, Users, Waves, Moon, Lock, UserX, Weight } from 'lucide-react'

const phases = [
  { name: 'Intake', Icon: BookOpen, short: 'Strategic learning, absorbing information', cost: 'Low drain', costColor: 'text-emerald-400' },
  { name: 'Reconnaissance', Icon: Radar, short: 'Watching, noticing patterns, gathering intel', cost: 'Low drain', costColor: 'text-emerald-400' },
  { name: 'Analysis', Icon: Brain, short: 'Making sense of it, strategic thinking', cost: 'Medium drain', costColor: 'text-amber-400' },
  { name: 'Design', Icon: Compass, short: 'Solo creation work, building, writing', cost: 'Medium drain', costColor: 'text-amber-400' },
  { name: 'Execution', Icon: Zap, short: 'Shipping, decisions, external output', cost: 'High drain', costColor: 'text-orange-400' },
  { name: 'Holding', Icon: Users, short: 'Being present for others, meetings, leadership', cost: 'Highest drain', costColor: 'text-rose-600' },
  { name: 'Release', Icon: Waves, short: 'Letting go, surrendering outcomes', cost: 'Restoration', costColor: 'text-teal-400' },
  { name: 'Recovery', Icon: Moon, short: 'Rest, solitude, integration', cost: 'Restoration', costColor: 'text-teal-400' }
]

const shadows = [
  { id: 'over_control', name: 'Over-Control', Icon: Lock, short: 'Gripping tight on everything' },
  { id: 'isolation_spiral', name: 'Isolation Spiral', Icon: UserX, short: 'Withdrawing from connection' },
  { id: 'intensity_addiction', name: 'Intensity Addiction', Icon: Zap, short: 'Seeking chaos over calm' },
  { id: 'false_responsibility', name: 'False Responsibility', Icon: Weight, short: 'Carrying what isn\'t yours' }
]

const OnboardingFlow = ({ onComplete }) => {
  const [step, setStep] = useState(1) // 1: sovereignty, 2: phase, 3: shadows
  const [sovereignty, setSovereignty] = useState(50)
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [activeShadows, setActiveShadows] = useState({})

  // Skip to HUD with default values
  const handleSkip = () => {
    onComplete({
      sovereignty: 50,
      phase: null,
      shadows: {}
    })
  }

  const handleSovereigntyNext = () => {
    setStep(2)
  }

  const handlePhaseSelect = (index) => {
    setSelectedPhase(index)
    setStep(3)
  }

  const handleShadowToggle = (shadowId) => {
    setActiveShadows(prev => {
      if (prev[shadowId]) {
        const { [shadowId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [shadowId]: 'low' }
    })
  }

  const handleShadowIntensity = (shadowId, intensity) => {
    setActiveShadows(prev => ({
      ...prev,
      [shadowId]: intensity
    }))
  }

  const handleComplete = () => {
    onComplete({
      sovereignty,
      phase: selectedPhase,
      shadows: activeShadows
    })
  }

  // Step 1: Sovereignty Assessment
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="game-panel w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-game-gold font-game text-lg mb-2">SOVEREIGNTY CHECK</div>
            <p className="text-game-text-muted text-sm">
              Where are your resources right now?
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-xs text-game-text-muted mb-2">
              <span>Depleted</span>
              <span className="text-game-gold font-bold text-lg">{sovereignty}%</span>
              <span>Resourced</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sovereignty}
              onChange={(e) => setSovereignty(parseInt(e.target.value))}
              className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer "
            />
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {[20, 40, 60, 80].map(val => (
              <button
                key={val}
                onClick={() => setSovereignty(val)}
                className={`py-2 rounded text-xs font-medium transition-all ${
                  Math.abs(sovereignty - val) < 10
                    ? 'bg-game-gold text-white'
                    : 'bg-game-darker text-game-text-muted hover:bg-game-border'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>

          <div className="text-center text-[10px] text-game-text-dim mb-4">
            {sovereignty < 20 && 'Critical — immediate restoration needed'}
            {sovereignty >= 20 && sovereignty < 40 && 'Depleted — be careful with expenditures'}
            {sovereignty >= 40 && sovereignty < 60 && 'Adequate — manageable but watch the trend'}
            {sovereignty >= 60 && sovereignty < 80 && 'Good — capacity for meaningful work'}
            {sovereignty >= 80 && 'Resourced — full capacity available'}
          </div>

          <button
            onClick={handleSovereigntyNext}
            className="w-full py-3 bg-game-gold bg-opacity-20 hover:bg-opacity-30 border border-game-gold text-game-gold font-bold rounded transition-all"
          >
            Continue
          </button>

          <button
            onClick={handleSkip}
            className="w-full mt-3 py-2 text-game-text-dim hover:text-game-text-muted text-xs transition-all"
          >
            Skip to HUD →
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Loop Phase Selection
  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="game-panel w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-4">
            <div className="text-game-gold font-game text-lg mb-2">IDENTITY LOOP</div>
            <p className="text-game-text-muted text-sm">
              What are you doing or about to do?
            </p>
          </div>

          <div className="space-y-2">
            {phases.map((phase, index) => {
              const IconComponent = phase.Icon
              return (
                <button
                  key={phase.name}
                  onClick={() => handlePhaseSelect(index)}
                  className="w-full flex items-center gap-3 p-3 rounded bg-game-darker hover:bg-game-accent-light border border-game-border hover:border-game-accent/40 transition-all text-left"
                >
                  <IconComponent className="w-5 h-5 text-game-gold flex-shrink-0" strokeWidth={1.5} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-game-text">{phase.name}</span>
                      <span className={`text-[9px] ${phase.costColor}`}>{phase.cost}</span>
                    </div>
                    <div className="text-[10px] text-game-text-dim">{phase.short}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleSkip}
            className="w-full mt-4 py-2 text-game-text-dim hover:text-game-text-muted text-xs transition-all"
          >
            Skip to HUD →
          </button>
        </div>
      </div>
    )
  }

  // Step 3: Shadow Scan
  if (step === 3) {
    const activeShadowCount = Object.keys(activeShadows).length

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="game-panel w-full max-w-md">
          <div className="text-center mb-4">
            <div className="text-game-gold font-game text-lg mb-2">SHADOW SCAN</div>
            <p className="text-game-text-muted text-sm">
              Any of these patterns active right now?
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {shadows.map((shadow) => {
              const IconComponent = shadow.Icon
              const isActive = !!activeShadows[shadow.id]
              const intensity = activeShadows[shadow.id]

              return (
                <div
                  key={shadow.id}
                  className={`p-3 rounded border transition-all ${
                    isActive
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-game-darker border-game-border'
                  }`}
                >
                  <button
                    onClick={() => handleShadowToggle(shadow.id)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <IconComponent
                      className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-rose-600' : 'text-game-text-muted'}`}
                      strokeWidth={1.5}
                    />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isActive ? 'text-rose-600' : 'text-game-text'}`}>
                        {shadow.name}
                      </div>
                      <div className="text-[10px] text-game-text-dim">{shadow.short}</div>
                    </div>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isActive ? 'border-rose-500 bg-rose-500' : 'border-zinc-600'
                    }`}>
                      {isActive && <span className="text-black text-xs">✓</span>}
                    </div>
                  </button>

                  {isActive && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-rose-200">
                      {['low', 'med', 'high'].map((level) => (
                        <button
                          key={level}
                          onClick={() => handleShadowIntensity(shadow.id, level)}
                          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase rounded transition-all ${
                            intensity === level
                              ? level === 'high'
                                ? 'bg-rose-600 text-white'
                                : level === 'med'
                                  ? 'bg-orange-300 text-orange-900'
                                  : 'bg-amber-100 text-amber-800'
                              : 'bg-game-darker text-game-text-muted hover:bg-game-border'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="text-center text-[10px] text-game-text-dim mb-4">
            {activeShadowCount === 0 && 'No shadows detected — all clear'}
            {activeShadowCount === 1 && '1 shadow active — apply antidote when ready'}
            {activeShadowCount >= 2 && `${activeShadowCount} shadows active — multiple patterns compounding`}
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-game-gold bg-opacity-20 hover:bg-opacity-30 border border-game-gold text-game-gold font-bold rounded transition-all"
          >
            Enter HUD
          </button>

          <button
            onClick={handleSkip}
            className="w-full mt-3 py-2 text-game-text-dim hover:text-game-text-muted text-xs transition-all"
          >
            Skip to HUD →
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default OnboardingFlow
