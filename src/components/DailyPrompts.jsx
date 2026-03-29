import { useState, useMemo } from 'react'
import { Check, AlertTriangle, RefreshCw } from 'lucide-react'
import { getTodaysQuestions, instructions } from '../constants/checkinQuestions'

const DailyPrompts = ({ timeOfDay, onCheckinResponse }) => {
  const [responses, setResponses] = useState({})
  const [completed, setCompleted] = useState(false)

  // Get today's questions (memoized so they don't change during session)
  const prompts = useMemo(() => getTodaysQuestions(timeOfDay), [timeOfDay])

  const handleResponse = (promptId, value) => {
    setResponses({
      ...responses,
      [promptId]: value
    })

    // Log each check-in response
    if (onCheckinResponse) {
      const prompt = prompts.find(p => p.id === promptId)
      const question = prompt ? prompt.question : promptId
      onCheckinResponse(question, value)
    }
  }

  const allAnswered = prompts.every(p => responses[p.id])

  // Generate dynamic protocol based on responses
  const generateDynamicProtocol = () => {
    const actions = []
    let title = ''
    let warning = false
    let reminder = ''

    // Get base instructions
    const baseInstruction = instructions[timeOfDay] || instructions.morning
    title = baseInstruction.title
    reminder = baseInstruction.reminder

    // Analyze responses by category
    const resourceResponse = responses.resource || responses.resourceShift
    const boundaryResponse = responses.boundaryCheck
    const shadowResponse = responses.shadowCheck
    const patternResponse = responses.patternDetection
    const releaseResponse = responses.releaseAssessment || responses.surrenderReadiness
    const tomorrowResponse = responses.tomorrowForecast

    // Morning-specific analysis
    if (timeOfDay === 'morning') {
      // Resource assessment
      if (resourceResponse) {
        const isLow = resourceResponse.toLowerCase().includes('depleted') ||
                      resourceResponse.toLowerCase().includes('fumes') ||
                      resourceResponse.toLowerCase().includes('compromised') ||
                      resourceResponse.toLowerCase().includes('critical')
        const isStrained = resourceResponse.toLowerCase().includes('strained') ||
                          resourceResponse.toLowerCase().includes('half') ||
                          resourceResponse.toLowerCase().includes('limited')

        if (isLow) {
          actions.push('CRITICAL: Start in conservation mode — 1 priority maximum')
          actions.push('Identify what caused depletion and prevent tonight')
          warning = true
        } else if (isStrained) {
          actions.push('Reduced capacity: Limit to 1-2 priorities')
          actions.push('Build in recovery periods throughout the day')
        } else {
          actions.push('Capacity available for depth work — protect it')
        }
      }

      // Shadow check
      if (shadowResponse) {
        const shadowActive = !shadowResponse.toLowerCase().includes('no') &&
                            !shadowResponse.toLowerCase().includes('relaxed') &&
                            !shadowResponse.toLowerCase().includes('connected') &&
                            !shadowResponse.toLowerCase().includes('clear')
        if (shadowActive) {
          actions.push('Shadow pattern detected — apply antidote before engaging')
          if (shadowResponse.toLowerCase().includes('grip') || shadowResponse.toLowerCase().includes('control')) {
            actions.push('Over-Control active: Practice intentional release')
          }
          if (shadowResponse.toLowerCase().includes('withdraw') || shadowResponse.toLowerCase().includes('isolation')) {
            actions.push('Isolation pattern: Schedule one connection point today')
          }
          warning = warning || shadowResponse.toLowerCase().includes('fully')
        }
      }

      // Anticipation assessment
      const anticipationResponse = responses.anticipation
      if (anticipationResponse) {
        if (anticipationResponse.toLowerCase().includes('wall-to-wall') ||
            anticipationResponse.toLowerCase().includes('constant')) {
          actions.push('High holding day ahead — protect micro-recovery moments')
          warning = true
        }
      }
    }

    // Afternoon-specific analysis
    if (timeOfDay === 'afternoon') {
      // Resource shift
      if (resourceResponse) {
        const depleted = resourceResponse.toLowerCase().includes('depleted') ||
                        resourceResponse.toLowerCase().includes('critical') ||
                        resourceResponse.toLowerCase().includes('empty')
        const decreased = resourceResponse.toLowerCase().includes('decreased') ||
                         resourceResponse.toLowerCase().includes('worse') ||
                         resourceResponse.toLowerCase().includes('low')

        if (depleted) {
          actions.push('CRITICAL: Create immediate space for restoration')
          actions.push('Cancel/postpone non-essential remaining items')
          warning = true
        } else if (decreased) {
          actions.push('Resources dropping — identify what\'s draining you')
          actions.push('Reduce scope for second half of day')
        } else {
          actions.push('Holding steady — maintain current approach')
        }
      }

      // Boundary check
      if (boundaryResponse) {
        const boundaryBroken = boundaryResponse.toLowerCase().includes('accumulating') ||
                              boundaryResponse.toLowerCase().includes('drowning') ||
                              boundaryResponse.toLowerCase().includes('everyone')
        if (boundaryBroken) {
          actions.push('WALL NOW: You are carrying others\' burdens')
          actions.push('Name what is NOT yours and put it down')
          warning = true
        } else if (boundaryResponse.toLowerCase().includes('yes')) {
          actions.push('Boundary crossed — release what you picked up before evening')
        }
      }

      // Pattern detection
      if (patternResponse) {
        if (patternResponse.toLowerCase().includes('spiral') ||
            patternResponse.toLowerCase().includes('escaping')) {
          actions.push('Unhealthy pattern running — pause and redirect')
          warning = true
        }
        if (patternResponse.toLowerCase().includes('intensity') ||
            patternResponse.toLowerCase().includes('drama') ||
            patternResponse.toLowerCase().includes('chaos')) {
          actions.push('Intensity addiction active — redirect to depth, not drama')
          warning = true
        }
      }
    }

    // Evening-specific analysis
    if (timeOfDay === 'evening') {
      // Incompletion assessment
      const incompletionResponse = responses.incompletion
      if (incompletionResponse) {
        if (incompletionResponse.toLowerCase().includes('abandoned') ||
            incompletionResponse.toLowerCase().includes('write-off') ||
            incompletionResponse.toLowerCase().includes('failure')) {
          actions.push('Pattern: Abandoning rather than completing cycles')
          actions.push('Tomorrow: Protect completion phase intentionally')
          warning = true
        } else {
          actions.push('Acknowledge what moved forward, even if incomplete')
        }
      }

      // Release planning
      const releaseText = responses.releasePlanning
      if (releaseText) {
        actions.push(`Commit to: ${releaseText}`)
        actions.push('This is not optional — Release phase is required')
      } else {
        actions.push('Choose specific Release action before sleep')
      }

      // Surrender readiness
      if (releaseResponse) {
        if (releaseResponse.toLowerCase().includes('no') ||
            releaseResponse.toLowerCase().includes('fighting') ||
            releaseResponse.toLowerCase().includes('struggling')) {
          actions.push('Protector resisting release — surrender requires practice')
          actions.push('Start small: 10 minutes of chosen rest')
          warning = true
        }
      }
    }

    // Night-specific analysis
    if (timeOfDay === 'night') {
      // Release assessment
      if (releaseResponse) {
        const noRelease = releaseResponse.toLowerCase().includes('no') ||
                         releaseResponse.toLowerCase().includes('holding') ||
                         releaseResponse.toLowerCase().includes('forced rest')
        const partialRelease = releaseResponse.toLowerCase().includes('partial') ||
                              releaseResponse.toLowerCase().includes('some')

        if (noRelease) {
          actions.push('CRITICAL: No Release today — tomorrow WILL start depleted')
          actions.push('Force Release NOW: play, intimacy, chosen rest')
          actions.push('Passive consumption does NOT restore')
          warning = true
        } else if (partialRelease) {
          actions.push('Incomplete Release — some restoration but not full')
          actions.push('Tomorrow may start below baseline')
        } else {
          actions.push('Release complete — loop cycle honored')
        }
      }

      // Tomorrow forecast
      if (tomorrowResponse) {
        if (tomorrowResponse.toLowerCase().includes('depleted') ||
            tomorrowResponse.toLowerCase().includes('definitely') ||
            tomorrowResponse.toLowerCase().includes('compromised')) {
          actions.push('Tomorrow forecast: depleted — consider protecting the morning')
          warning = true
        }
        if (tomorrowResponse.toLowerCase().includes('loop') &&
            (tomorrowResponse.toLowerCase().includes('no') ||
             tomorrowResponse.toLowerCase().includes('broken'))) {
          actions.push('Loop not completing — Release phase being skipped')
          warning = true
        }
      }

      // Final release check
      const finalResponse = responses.finalRelease
      if (finalResponse) {
        if (finalResponse.toLowerCase().includes('struggling') ||
            finalResponse.toLowerCase().includes('weight') ||
            finalResponse.toLowerCase().includes('dread')) {
          actions.push('Carrying weight into sleep — explicitly release before rest')
        }
      }
    }

    // If no specific actions generated, use base instructions
    if (actions.length === 0) {
      return baseInstruction
    }

    return { title, warning, actions, reminder }
  }

  const handleComplete = () => {
    setCompleted(true)
  }

  const handleReset = () => {
    setCompleted(false)
    setResponses({})
  }

  const instruction = completed ? generateDynamicProtocol() : (instructions[timeOfDay] || instructions.morning)

  // Category labels for display
  const categoryLabels = {
    resource: 'Resources',
    anticipation: 'The Day Ahead',
    intention: 'Intention',
    shadowCheck: 'Shadow Scan',
    resourceShift: 'Resource Check',
    boundaryCheck: 'Boundaries',
    patternDetection: 'Patterns',
    recalibration: 'Adjustment',
    completion: 'Completions',
    incompletion: 'What Remains',
    releasePlanning: 'Release',
    surrenderReadiness: 'Surrender',
    releaseAssessment: 'Release Check',
    tomorrowForecast: 'Tomorrow',
    nightPatternRecognition: 'Patterns',
    finalRelease: 'Final Release'
  }

  return (
    <div className="game-panel p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-game text-base text-game-gold">
          {timeOfDay.toUpperCase()} CHECK-IN
        </h3>
        {!completed && (
          <div className="text-[9px] text-game-text-dim flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            <span>Questions rotate daily</span>
          </div>
        )}
      </div>

      {!completed ? (
        <>
          <div className="space-y-3">
            {prompts.map((prompt, index) => (
              <div key={prompt.id} className="border-b border-game-border pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] text-game-gold uppercase tracking-wider">
                    {categoryLabels[prompt.category] || prompt.category}
                  </span>
                </div>
                <p className="text-sm font-bold text-game-text mb-2">
                  {prompt.question}
                </p>

                {prompt.type === 'choice' && (
                  <div className="space-y-1.5">
                    {prompt.options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name={prompt.id}
                          value={option}
                          checked={responses[prompt.id] === option}
                          onChange={(e) => handleResponse(prompt.id, e.target.value)}
                          className="accent-game-gold w-3 h-3"
                        />
                        <span className="text-sm text-game-text group-hover:text-game-gold transition-colors">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {prompt.type === 'text' && (
                  <textarea
                    value={responses[prompt.id] || ''}
                    onChange={(e) => handleResponse(prompt.id, e.target.value)}
                    placeholder={prompt.placeholder}
                    className="w-full bg-white border border-game-border rounded p-2 text-sm text-game-text placeholder-game-text-dim focus:border-game-accent focus:outline-none"
                    rows="2"
                  />
                )}
              </div>
            ))}
          </div>

          {allAnswered && (
            <div className="mt-3 pt-3 border-t border-game-border">
              <button onClick={handleComplete} className="game-button w-full text-xs py-2">
                Complete {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} Protocol
              </button>
            </div>
          )}

          <div className="mt-2 text-[10px] text-game-text-dim">
            ~3-5 min protocol
          </div>
        </>
      ) : (
        /* Protocol Completed - Show Instructions */
        <div className="space-y-3">
          <div className={`border rounded p-3 ${instruction.warning ? 'bg-amber-50 border-amber-200' : 'bg-game-darker border-game-border'}`}>
            <div className="flex items-center gap-2 mb-3">
              {instruction.warning ? (
                <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
              )}
              <h4 className={`font-game text-sm ${instruction.warning ? 'text-amber-700' : 'text-game-text'}`}>
                {instruction.title}
              </h4>
            </div>

            <div className="mb-3">
              <p className="text-[10px] text-game-text-dim mb-1.5 font-semibold">NEXT ACTIONS:</p>
              <ul className="space-y-1.5">
                {instruction.actions.map((action, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-game-gold mt-0.5 text-xs">→</span>
                    <span className="text-xs text-game-text-muted">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-game-border">
              <p className="text-[10px] text-game-gold">
                {instruction.reminder}
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full px-3 py-1.5 bg-game-darker border border-game-border rounded hover:bg-game-border transition-all text-xs text-game-text-muted"
          >
            Reset Protocol
          </button>
        </div>
      )}
    </div>
  )
}

export default DailyPrompts
