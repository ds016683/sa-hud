import { useState, useEffect } from 'react'

const ActiveSkills = ({ sovereignty, setSovereignty }) => {
  const [cooldowns, setCooldowns] = useState({})
  const [notification, setNotification] = useState(null)

  const skills = [
    {
      id: 'gordian_cut',
      name: 'Gordian Cut',
      icon: '🗡️',
      cost: 5,
      cooldown: 30, // seconds
      color: 'border-blue-500',
      effect: 'Cuts through complexity. Name the actual problem.',
      impact: () => 'Pattern Recognition +15% for next decision'
    },
    {
      id: 'decisive_intervention',
      name: 'Decisive Intervention',
      icon: '⚡',
      cost: 15,
      cooldown: 60,
      color: 'border-yellow-500',
      effect: 'Step in and change trajectory. Force movement.',
      impact: () => 'Agency activated. Situation momentum +30%'
    },
    {
      id: 'galvanic_surge',
      name: 'Galvanic Surge',
      icon: '🔥',
      cost: 25,
      cooldown: 90,
      color: 'border-red-500',
      effect: 'Rally others into motion. HIGH COST.',
      impact: () => 'Team activation! But -25% Sovereignty'
    },
    {
      id: 'sovereign_yield',
      name: 'Sovereign Yield',
      icon: '🌊',
      cost: 0,
      cooldown: 120,
      color: 'border-cyan-500',
      effect: 'RESTORES resources through chosen surrender.',
      impact: () => '+40% Sovereignty. Release phase activated.'
    },
    {
      id: 'walling',
      name: 'Walling',
      icon: '🛡️',
      cost: 5,
      cooldown: 20,
      color: 'border-green-500',
      effect: 'Declare boundary. This is not yours to carry.',
      impact: () => 'False Responsibility cleared. +10% Sovereignty'
    }
  ]

  const activateSkill = (skill) => {
    // Check if on cooldown
    if (cooldowns[skill.id]) {
      setNotification({
        type: 'error',
        message: `${skill.name} is on cooldown!`,
        icon: '⏳'
      })
      setTimeout(() => setNotification(null), 2000)
      return
    }

    // Check if enough sovereignty (except Sovereign Yield which restores)
    if (skill.id !== 'sovereign_yield' && sovereignty < skill.cost) {
      setNotification({
        type: 'error',
        message: 'Insufficient Sovereignty!',
        icon: '⚠️'
      })
      setTimeout(() => setNotification(null), 2000)
      return
    }

    // Apply skill effect
    if (skill.id === 'sovereign_yield') {
      // Restore sovereignty
      setSovereignty(Math.min(100, sovereignty + 40))
    } else if (skill.id === 'walling') {
      // Small sovereignty gain
      setSovereignty(Math.min(100, sovereignty + 10 - skill.cost))
    } else if (skill.id === 'galvanic_surge') {
      // High cost
      setSovereignty(Math.max(0, sovereignty - skill.cost))
    } else {
      // Normal cost
      setSovereignty(Math.max(0, sovereignty - skill.cost))
    }

    // Show notification
    setNotification({
      type: 'success',
      message: skill.impact(),
      icon: skill.icon
    })

    // Start cooldown
    setCooldowns({ ...cooldowns, [skill.id]: skill.cooldown })

    // Clear notification after 4 seconds
    setTimeout(() => setNotification(null), 4000)
  }

  // Cooldown timer
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
    <div className="game-panel p-3">
      <h3 className="font-game text-base text-game-gold mb-3">ACTIVE SKILLS</h3>

      {/* Notification */}
      {notification && (
        <div className={`
          mb-2 p-2 rounded border animate-pulse
          ${notification.type === 'success'
            ? 'bg-game-green bg-opacity-20 border-game-green'
            : 'bg-game-red bg-opacity-20 border-game-red'}
        `}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{notification.icon}</span>
            <span className="text-xs font-bold text-game-text">
              {notification.message}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {skills.map((skill) => {
          const onCooldown = cooldowns[skill.id]
          const canUse = !onCooldown && (skill.id === 'sovereign_yield' || sovereignty >= skill.cost)

          return (
            <button
              key={skill.id}
              onClick={() => activateSkill(skill)}
              disabled={!canUse}
              className={`
                w-full p-2 rounded border text-left transition-all
                ${canUse
                  ? `${skill.color} hover:bg-opacity-10 hover:scale-[1.02] cursor-pointer active:scale-95`
                  : 'border-game-border opacity-50 cursor-not-allowed'}
                ${onCooldown ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{skill.icon}</span>
                  <div>
                    <div className="font-bold text-sm text-game-text">
                      {skill.name}
                    </div>
                    <div className="text-xs text-game-text-muted">
                      {skill.id === 'sovereign_yield'
                        ? `+40%`
                        : `${skill.cost}%`}
                    </div>
                  </div>
                </div>
                {onCooldown && (
                  <span className="text-[10px] font-bold text-game-red">
                    {onCooldown}s
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 leading-tight">
                {skill.effect}
              </p>

              {/* Cooldown bar */}
              {onCooldown && (
                <div className="mt-1 h-1 bg-game-darker rounded overflow-hidden">
                  <div
                    className="h-full bg-game-red transition-all"
                    style={{
                      width: `${((skill.cooldown - onCooldown) / skill.cooldown) * 100}%`
                    }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-2 text-[10px] text-gray-600 italic">
        Click to activate • Cooldowns apply
      </div>
    </div>
  )
}

export default ActiveSkills
