import { useState, useEffect } from 'react'
import { Swords, Zap, Flame, Waves, Shield } from 'lucide-react'

const HorizontalSkills = ({ sovereignty, setSovereignty, onSkillActivate }) => {
  const [cooldowns, setCooldowns] = useState({})
  const [notification, setNotification] = useState(null)
  const [activeTooltip, setActiveTooltip] = useState(null)

  const skills = [
    {
      id: 'sovereign_yield',
      name: 'Sovereign Yield',
      Icon: Waves,
      cost: 0,
      cooldown: 120,
      effect: 'Restore',
      theme: {
        border: 'border-teal-400',
        icon: 'text-teal-600',
        low: 'bg-teal-50 hover:bg-teal-100 text-teal-800',
        med: 'bg-teal-100 hover:bg-teal-200 text-teal-900',
        high: 'bg-teal-600 hover:bg-teal-500 text-white'
      },
      impact: (intensity) => `+${intensity === 'low' ? '15' : intensity === 'med' ? '25' : '40'}% Sovereignty`,
      description: 'RESTORES resources through chosen surrender. Use when sovereignty is low, when over-control is active, or when Release phase has been skipped.',
      intensityGuide: {
        low: 'Small release - letting go of a minor control point.',
        med: 'Significant surrender - releasing attachment to an outcome.',
        high: 'Complete yield - full surrender of something you\'ve been gripping. Maximum restoration.'
      }
    },
    {
      id: 'walling',
      name: 'Walling',
      Icon: Shield,
      cost: 5,
      cooldown: 20,
      effect: 'Set boundary',
      theme: {
        border: 'border-emerald-400',
        icon: 'text-emerald-600',
        low: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
        med: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900',
        high: 'bg-emerald-600 hover:bg-emerald-500 text-white'
      },
      impact: (intensity) => `Clear burden +${intensity === 'low' ? '3' : intensity === 'med' ? '6' : '10'}%`,
      description: 'Declare a boundary. Name what is NOT yours to carry. Use when False Responsibility is active or when doing others\' work.',
      intensityGuide: {
        low: 'Small boundary - declining a single request.',
        med: 'Significant boundary - returning responsibility for a whole domain.',
        high: 'Major wall - complete restructuring of who owns what. May feel harsh but prevents drain.'
      }
    },
    {
      id: 'gordian_cut',
      name: 'Gordian Cut',
      Icon: Swords,
      cost: 5,
      cooldown: 30,
      effect: 'Cut complexity',
      theme: {
        border: 'border-slate-400',
        icon: 'text-slate-600',
        low: 'bg-slate-50 hover:bg-slate-100 text-slate-800',
        med: 'bg-slate-200 hover:bg-slate-300 text-slate-900',
        high: 'bg-slate-700 hover:bg-slate-600 text-white'
      },
      impact: (intensity) => `Pattern Recognition +${intensity === 'low' ? '5' : intensity === 'med' ? '10' : '15'}%`,
      description: 'Cut through complexity to name the actual problem. Use when stuck in analysis paralysis or when the "real" problem is obscured.',
      intensityGuide: {
        low: 'Quick clarity on a small issue. Minor cost, short recovery.',
        med: 'Significant reframe of a stuck situation. Moderate investment.',
        high: 'Complete restructuring of how a problem is understood. Can break months of stuckness.'
      }
    },
    {
      id: 'decisive_intervention',
      name: 'Decisive Intervention',
      Icon: Zap,
      cost: 15,
      cooldown: 60,
      effect: 'Force movement',
      theme: {
        border: 'border-amber-400',
        icon: 'text-amber-600',
        low: 'bg-amber-50 hover:bg-amber-100 text-amber-800',
        med: 'bg-amber-200 hover:bg-amber-300 text-amber-900',
        high: 'bg-amber-500 hover:bg-amber-400 text-white'
      },
      impact: (intensity) => `Agency +${intensity === 'low' ? '10' : intensity === 'med' ? '20' : '30'}%`,
      description: 'Step in and change trajectory. Force movement when a situation has stalled and needs external force.',
      intensityGuide: {
        low: 'Small nudge to get something unstuck.',
        med: 'Significant intervention that changes direction of a project or relationship.',
        high: 'Major forcing function. Burns bridges but creates irreversible momentum.'
      }
    },
    {
      id: 'galvanic_surge',
      name: 'Galvanic Surge',
      Icon: Flame,
      cost: 25,
      cooldown: 90,
      effect: 'Rally others',
      theme: {
        border: 'border-rose-400',
        icon: 'text-rose-600',
        low: 'bg-rose-50 hover:bg-rose-100 text-rose-800',
        med: 'bg-rose-200 hover:bg-rose-300 text-rose-900',
        high: 'bg-rose-600 hover:bg-rose-500 text-white'
      },
      impact: (intensity) => `Team +${intensity === 'low' ? '10' : intensity === 'med' ? '20' : '30'}%`,
      description: 'Rally others into motion. HIGH COST - depletes you while activating others. Use when a team needs activation and you have standing.',
      intensityGuide: {
        low: 'Brief rally, small group. Manageable personal cost.',
        med: 'Sustained leadership push. Significant personal depletion.',
        high: 'Full mobilization. Effective but potentially self-destructive. Use sparingly.'
      }
    }
  ]

  const activateSkill = (skill, intensity) => {
    if (cooldowns[skill.id]) {
      setNotification({
        type: 'error',
        message: `${skill.name} on cooldown`
      })
      setTimeout(() => setNotification(null), 2000)
      return
    }

    const costMultiplier = intensity === 'low' ? 0.3 : intensity === 'med' ? 0.6 : 1
    const actualCost = Math.round(skill.cost * costMultiplier)

    if (skill.id !== 'sovereign_yield' && sovereignty < actualCost) {
      setNotification({
        type: 'error',
        message: 'Insufficient Sovereignty'
      })
      setTimeout(() => setNotification(null), 2000)
      return
    }

    const sovereigntyBefore = sovereignty

    if (skill.id === 'sovereign_yield') {
      const gain = intensity === 'low' ? 15 : intensity === 'med' ? 25 : 40
      setSovereignty(Math.min(100, sovereignty + gain))
    } else if (skill.id === 'walling') {
      const gain = intensity === 'low' ? 3 : intensity === 'med' ? 6 : 10
      setSovereignty(Math.min(100, sovereignty + gain - actualCost))
    } else {
      setSovereignty(Math.max(0, sovereignty - actualCost))
    }

    setNotification({
      type: 'success',
      message: skill.impact(intensity)
    })

    const cooldownMultiplier = intensity === 'low' ? 0.5 : intensity === 'med' ? 0.75 : 1
    setCooldowns({ ...cooldowns, [skill.id]: Math.round(skill.cooldown * cooldownMultiplier) })
    setTimeout(() => setNotification(null), 3000)

    if (onSkillActivate) {
      onSkillActivate(skill.id, intensity, sovereigntyBefore)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((key) => {
          if (updated[key] > 0) {
            updated[key] -= 1
          } else {
            delete updated[key]
          }
        })
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="game-panel p-2 relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-game text-xs text-game-gold">ACTIVE SKILLS</h3>
        {notification && (
          <div className={`
            px-2 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1.5
            ${notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'}
          `}>
            <div className={`w-1.5 h-1.5 rounded-full ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Horizontal Skill Bar */}
      <div className="grid grid-cols-5 gap-2">
        {skills.map((skill) => {
          const onCooldown = cooldowns[skill.id]
          const IconComponent = skill.Icon
          const theme = skill.theme

          return (
            <div
              key={skill.id}
              className={`
                relative rounded-lg border text-center transition-all flex flex-col bg-white shadow-sm
                ${onCooldown ? 'border-game-border opacity-50' : theme.border}
              `}
            >
              {/* Top section - Icon and Name */}
              <button
                className="w-full p-3 pb-2 hover:bg-game-darker rounded-t-lg transition-all flex-1 flex flex-col items-center justify-center"
                onClick={() => setActiveTooltip(activeTooltip === skill.id ? null : skill.id)}
              >
                <IconComponent className={`w-7 h-7 mb-2 ${theme.icon}`} strokeWidth={1.5} />
                <div className="text-sm font-bold text-game-text leading-tight tracking-wide uppercase h-10 flex items-center justify-center">
                  {skill.name}
                </div>
                <div className="text-[10px] text-game-text-dim mt-1">{skill.effect}</div>
              </button>

              {/* Intensity buttons */}
              <div className="flex h-8 mx-2 mb-2 rounded overflow-hidden border border-game-border flex-shrink-0">
                {['low', 'med', 'high'].map((intensity) => (
                  <button
                    key={intensity}
                    onClick={() => activateSkill(skill, intensity)}
                    disabled={onCooldown}
                    className={`
                      flex-1 text-[10px] font-semibold uppercase transition-all
                      ${theme[intensity]}
                      ${onCooldown
                        ? 'cursor-not-allowed opacity-40'
                        : 'cursor-pointer active:scale-95'}
                      ${intensity !== 'high' ? 'border-r border-game-border' : ''}
                    `}
                  >
                    {intensity}
                  </button>
                ))}
              </div>

              {/* Cooldown overlay */}
              {onCooldown && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                  <span className="text-lg font-bold text-game-red">{onCooldown}s</span>
                </div>
              )}

              {/* Cooldown progress bar */}
              {onCooldown && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-game-darker rounded-b-lg overflow-hidden">
                  <div
                    className="h-full bg-game-accent transition-all"
                    style={{
                      width: `${((skill.cooldown - onCooldown) / skill.cooldown) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tooltip Overlay */}
      {activeTooltip && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 rounded-lg shadow-lg"
          onClick={() => setActiveTooltip(null)}
        >
          {skills.filter(s => s.id === activeTooltip).map(skill => {
            const IconComponent = skill.Icon
            const theme = skill.theme
            return (
              <div
                key={skill.id}
                className={`bg-white border rounded-lg p-4 max-w-sm mx-4 shadow-md ${theme.border}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-3">
                  <IconComponent className={`w-6 h-6 ${theme.icon}`} strokeWidth={1.5} />
                  <div>
                    <h4 className={`font-game text-lg ${theme.icon}`}>{skill.name}</h4>
                    <div className="text-[10px] text-game-text-dim">{skill.effect} • Cost: {skill.cost}</div>
                  </div>
                </div>

                <p className="text-game-text text-sm mb-4">{skill.description}</p>

                <div className="space-y-2 border-t border-game-border pt-3">
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded min-w-[40px] text-center ${theme.low}`}>LOW</span>
                    <span className="text-xs text-game-text-muted">{skill.intensityGuide.low}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded min-w-[40px] text-center ${theme.med}`}>MED</span>
                    <span className="text-xs text-game-text-muted">{skill.intensityGuide.med}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded min-w-[40px] text-center ${theme.high}`}>HIGH</span>
                    <span className="text-xs text-game-text-muted">{skill.intensityGuide.high}</span>
                  </div>
                </div>

                <button
                  className="mt-4 w-full py-2 bg-game-darker hover:bg-game-border text-game-text-muted text-xs rounded transition-all border border-game-border"
                  onClick={() => setActiveTooltip(null)}
                >
                  Close
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HorizontalSkills
