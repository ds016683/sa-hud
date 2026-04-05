import { useState, useEffect } from 'react'
// Activity log uses localStorage directly
const STORAGE_KEY = 'sa-hud-activity-log'

// Narrative templates for different action types
const narrativeTemplates = {
  skill: {
    gordian_cut: (intensity) => `Activated Gordian Cut (${intensity.toUpperCase()}) — cut through complexity`,
    decisive_intervention: (intensity) => `Activated Decisive Intervention (${intensity.toUpperCase()}) — forced movement`,
    galvanic_surge: (intensity) => `Activated Galvanic Surge (${intensity.toUpperCase()}) — rallied others`,
    sovereign_yield: (intensity) => `Activated Sovereign Yield (${intensity.toUpperCase()}) — chose surrender, restored sovereignty`,
    walling: (intensity) => `Activated Walling (${intensity.toUpperCase()}) — declared boundary`
  },
  shadow: {
    over_control: {
      set: (intensity) => `Over-Control State detected (${intensity.toUpperCase()}) — Protector is gripping`,
      clear: () => `Over-Control State cleared — released grip`
    },
    isolation_spiral: {
      set: (intensity) => `Isolation Spiral detected (${intensity.toUpperCase()}) — withdrawal pattern active`,
      clear: () => `Isolation Spiral cleared — reconnected`
    },
    intensity_addiction: {
      set: (intensity) => `Intensity Addiction detected (${intensity.toUpperCase()}) — seeking chaos`,
      clear: () => `Intensity Addiction cleared — found depth without drama`
    },
    false_responsibility: {
      set: (intensity) => `False Responsibility detected (${intensity.toUpperCase()}) — carrying others' weight`,
      clear: () => `False Responsibility cleared — put down what wasn't mine`
    }
  },
  sovereignty: {
    change: (data) => `Sovereignty adjusted to ${data.newValue}%${data.oldValue ? ` (was ${data.oldValue}%)` : ''}`
  },
  loop: {
    phase_change: (phase) => `Loop phase changed to: ${phase}`,
    completed: () => `Loop completed — full cycle achieved`
  },
  checkin: {
    release: (answer) => `Check-in: Release today? ${answer}`,
    depletion: (answer) => `Check-in: Tomorrow depleted? ${answer}`,
    complete: () => `Daily check-in completed`
  },
  note: {
    manual: () => `Journal entry`
  },
  session: {
    start: (data) => {
      const parts = [`Session started — Sovereignty at ${data.sovereignty}%`]
      if (data.phase) parts.push(`Phase: ${data.phase}`)
      if (data.shadowCount > 0) parts.push(`${data.shadowCount} shadow${data.shadowCount > 1 ? 's' : ''} active`)
      return parts.join(', ')
    }
  }
}

// Get icon for action type - using simple symbols for cleaner look
const getIcon = (type, action) => {
  const icons = {
    skill: {
      gordian_cut: '⚔',
      decisive_intervention: '→',
      galvanic_surge: '↑',
      sovereign_yield: '~',
      walling: '▢'
    },
    shadow: {
      over_control: '◉',
      isolation_spiral: '○',
      intensity_addiction: '△',
      false_responsibility: '▽'
    },
    sovereignty: '◆',
    loop: '↻',
    checkin: '□',
    note: '·',
    session: '►'
  }

  if (type === 'skill' || type === 'shadow') {
    return icons[type]?.[action] || '•'
  }
  return icons[type] || '•'
}

// Format timestamp for display
const formatTimestamp = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Format entry for narrative display
export const formatEntryNarrative = (entry) => {
  const { type, action, intensity, subAction, note, timestamp, data } = entry

  let narrative = ''

  if (type === 'skill' && narrativeTemplates.skill[action]) {
    narrative = narrativeTemplates.skill[action](intensity)
  } else if (type === 'shadow' && narrativeTemplates.shadow[action]) {
    const template = narrativeTemplates.shadow[action]
    narrative = subAction === 'clear' ? template.clear() : template.set(intensity)
  } else if (type === 'sovereignty') {
    narrative = narrativeTemplates.sovereignty.change(data || { newValue: intensity })
  } else if (type === 'loop' && narrativeTemplates.loop[action]) {
    narrative = narrativeTemplates.loop[action](intensity || data?.phase)
  } else if (type === 'checkin' && narrativeTemplates.checkin[action]) {
    narrative = narrativeTemplates.checkin[action](data?.answer || intensity)
  } else if (type === 'note') {
    narrative = narrativeTemplates.note.manual()
  } else if (type === 'session') {
    narrative = narrativeTemplates.session.start(data)
  } else {
    narrative = `${type}: ${action} (${intensity || 'n/a'})`
  }

  return {
    icon: getIcon(type, action),
    narrative,
    note,
    timestamp: formatTimestamp(timestamp),
    rawTimestamp: timestamp
  }
}

// Analyze note content for psychological patterns
const analyzeNotePatterns = (entries) => {
  const allNotes = entries
    .filter(e => e.note)
    .map(e => ({
      note: e.note.toLowerCase(),
      timestamp: new Date(e.timestamp),
      type: e.type,
      action: e.action,
      intensity: e.intensity
    }))

  const patterns = {
    // Negative patterns
    sleepAvoidance: false,
    excuseMaking: false,
    overActivation: false,
    resistanceToRelease: false,
    selfCriticism: false,
    urgencyLanguage: false,
    commitmentDeflection: false,
    lateNightActivity: false,
    distress: false,
    sovereigntyCrash: false,
    criticallyDepleted: false,
    // Positive patterns
    sovereigntyRestored: false,
    significantGain: false,
    releaseCompleted: false,
    restorationLanguage: false,
    accomplishmentLanguage: false,
    boundarySuccess: false,
    loopCompleted: false,
    recoveredFromCrash: false
  }

  const insights = []

  // Check for late night activity (after 11pm or before 5am)
  const lateNightEntries = entries.filter(e => {
    const hour = new Date(e.timestamp).getHours()
    return hour >= 23 || hour < 5
  })
  if (lateNightEntries.length > 0) {
    patterns.lateNightActivity = true
  }

  // Sleep/rest avoidance patterns
  const sleepWords = ['sleep', 'bed', 'rest', 'tired', 'exhausted', 'night']
  const avoidanceWords = ['soon', 'promise', 'later', 'just', 'one more', 'almost', 'will', 'going to', 'about to']
  const excitementWords = ['excited', 'wired', 'can\'t stop', 'too much', 'hyper', 'energized', 'buzz']

  // Distress/frustration markers
  const distressWords = ['ugh', 'fuck', 'shit', 'damn', 'hate', 'awful', 'terrible', 'worst', 'dying', 'dead', 'kill me', 'help', 'drowning', 'overwhelm', 'breaking', 'broken', 'crash', 'burned', 'burnt', 'empty', 'nothing left']

  allNotes.forEach(({ note, timestamp }) => {
    const hasSleepReference = sleepWords.some(w => note.includes(w))
    const hasAvoidance = avoidanceWords.some(w => note.includes(w))
    const hasExcitement = excitementWords.some(w => note.includes(w))
    const hasDistress = distressWords.some(w => note.includes(w))
    const hour = timestamp.getHours()
    const isLateNight = hour >= 22 || hour < 5

    if (hasSleepReference && hasAvoidance) {
      patterns.sleepAvoidance = true
      patterns.excuseMaking = true
    }

    if (hasExcitement && isLateNight) {
      patterns.overActivation = true
    }

    if (hasSleepReference && hasExcitement) {
      patterns.resistanceToRelease = true
    }

    // Distress detection
    if (hasDistress) {
      patterns.distress = true
    }

    // Commitment deflection ("i'll do it soon", "promise")
    if (note.includes('promise') || note.includes('i\'ll') || note.includes('i will')) {
      if (hasAvoidance) {
        patterns.commitmentDeflection = true
      }
    }

    // Urgency/pressure language
    const urgencyWords = ['need to', 'have to', 'must', 'should', 'can\'t stop']
    if (urgencyWords.some(w => note.includes(w))) {
      patterns.urgencyLanguage = true
    }

    // Self-criticism
    const selfCriticalWords = ['stupid', 'idiot', 'shouldn\'t', 'failed', 'weak', 'pathetic']
    if (selfCriticalWords.some(w => note.includes(w))) {
      patterns.selfCriticism = true
    }

    // Positive patterns - restoration language
    const restorationWords = ['rested', 'restored', 'recharged', 'recovered', 'better', 'relief', 'relaxed', 'peaceful', 'calm', 'slept', 'nap', 'break']
    if (restorationWords.some(w => note.includes(w))) {
      patterns.restorationLanguage = true
    }

    // Accomplishment language
    const accomplishmentWords = ['finished', 'completed', 'done', 'accomplished', 'achieved', 'finally', 'made it', 'did it', 'success', 'worked', 'won', 'nailed']
    if (accomplishmentWords.some(w => note.includes(w))) {
      patterns.accomplishmentLanguage = true
    }

    // Boundary success language
    const boundaryWords = ['said no', 'declined', 'refused', 'set a boundary', 'protected', 'didn\'t take', 'let go', 'put down', 'not my', 'their problem', 'walked away']
    if (boundaryWords.some(w => note.includes(w))) {
      patterns.boundarySuccess = true
    }
  })

  // Analyze sovereignty changes for crashes AND gains
  // Sort by timestamp to understand the arc (oldest first)
  const sovereigntyEntries = entries
    .filter(e => e.type === 'sovereignty' && e.data)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  let lowestPoint = 100
  let highestPoint = 0
  let hadCrash = false
  let recoveredFromCrash = false

  sovereigntyEntries.forEach((entry, index) => {
    const { newValue, oldValue } = entry.data
    if (oldValue !== undefined && newValue !== undefined) {
      const change = newValue - oldValue

      // Track lowest and highest points
      if (newValue < lowestPoint) lowestPoint = newValue
      if (newValue > highestPoint) highestPoint = newValue

      // Detect crashes
      if (change <= -30) {
        hadCrash = true
        patterns.sovereigntyCrash = true
      }
      if (newValue <= 20) {
        patterns.criticallyDepleted = true
      }
      // Detect gains
      if (change >= 30) {
        patterns.significantGain = true
      }
      if (newValue >= 70 && oldValue < 50) {
        patterns.sovereigntyRestored = true
      }
    }
  })

  // Check if there was recovery after a crash (look at most recent value)
  if (sovereigntyEntries.length > 0) {
    const mostRecent = sovereigntyEntries[sovereigntyEntries.length - 1]
    const currentValue = mostRecent.data.newValue
    if (hadCrash && currentValue > lowestPoint + 15) {
      recoveredFromCrash = true
      patterns.recoveredFromCrash = true
    }
    // If current value is decent, don't treat as crisis even if crash happened
    if (currentValue >= 50) {
      patterns.sovereigntyCrash = false // Override - they recovered
    }
  }

  // Detect loop completions
  const loopCompletions = entries.filter(e => e.type === 'loop' && e.action === 'completed')
  if (loopCompletions.length > 0) {
    patterns.loopCompleted = true
  }

  // Detect release phase engagement
  const releaseCheckins = entries.filter(e =>
    e.type === 'checkin' &&
    e.data?.answer &&
    e.data.answer.toLowerCase().includes('yes')
  )
  const sovereignYields = entries.filter(e => e.type === 'skill' && e.action === 'sovereign_yield')
  if (releaseCheckins.length > 0 || sovereignYields.length > 0) {
    patterns.releaseCompleted = true
  }

  // Generate insights based on detected patterns - PRIORITY ORDER MATTERS

  // Critical state insights come first
  if (patterns.criticallyDepleted) {
    insights.push('You are critically depleted. This is not a time for productivity or pushing through. This is a time for immediate restoration. Everything else can wait.')
  }

  if (patterns.sovereigntyCrash) {
    insights.push('A significant sovereignty crash occurred. Something drained you hard. Name what happened. This is data about what costs you the most.')
  }

  if (patterns.distress) {
    insights.push('The notes contain distress signals. This is not fine. The system is telling you something is wrong. Listen to it before it gets louder.')
  }

  if (patterns.sleepAvoidance && patterns.lateNightActivity) {
    insights.push('The notes reveal a pattern: you know you should rest, but you are not resting. The promises to "go to bed soon" are the Protector negotiating with exhaustion. This is not sustainable.')
  }

  if (patterns.overActivation) {
    insights.push('Excitement is being used to override the body\'s need for rest. "Too excited to sleep" is Intensity Addiction wearing a positive mask. The crash is coming.')
  }

  if (patterns.resistanceToRelease && !patterns.sleepAvoidance) {
    insights.push('There is resistance to the Release phase. The notes show engagement with everything except surrender. The loop cannot complete without this phase.')
  }

  if (patterns.commitmentDeflection) {
    insights.push('The notes contain promises that defer action: "soon," "I\'ll," "I will." Notice: these are negotiations, not decisions. The Sovereign Architect names what is happening, then acts.')
  }

  if (patterns.urgencyLanguage && patterns.lateNightActivity) {
    insights.push('Urgency language at night suggests the nervous system is still in activation mode. "Have to" and "need to" at this hour means the Off switch is not functioning.')
  }

  if (patterns.selfCriticism) {
    insights.push('Self-critical language detected. This is the shadow speaking, not the architect. Harsh internal judgment depletes Sovereignty faster than any external drain.')
  }

  // POSITIVE INSIGHTS - celebrate wins when they happen

  if (patterns.sovereigntyRestored) {
    insights.push('A significant restoration occurred. You crossed from depleted to resourced. Name what worked — this is data about what actually heals you.')
  }

  if (patterns.significantGain && !patterns.sovereigntyRestored) {
    insights.push('Sovereignty increased substantially. Something replenished you. Pay attention to what it was.')
  }

  if (patterns.loopCompleted) {
    insights.push('The loop was completed. All phases honored. This is how the system is meant to work — not perfection, but completion.')
  }

  if (patterns.releaseCompleted && !patterns.loopCompleted) {
    insights.push('The Release phase was engaged. Chosen surrender happened. This is the hardest phase for many — and you did it.')
  }

  if (patterns.restorationLanguage) {
    insights.push('The notes reflect restoration. Words like "rested," "better," "calm" — these are not trivial. They are evidence that recovery is possible.')
  }

  if (patterns.accomplishmentLanguage) {
    insights.push('Completion was named in the notes. Acknowledging what was finished matters — it closes the loop and prevents the "never enough" drain.')
  }

  if (patterns.boundarySuccess) {
    insights.push('A boundary was held. "No" was said, or something was put down. This is Walling in action — reclaiming sovereignty one refusal at a time.')
  }

  // Recovery arc - crash followed by recovery
  if (patterns.recoveredFromCrash) {
    // Check if Walling was used during recovery
    const wallingUsed = entries.some(e => e.type === 'skill' && e.action === 'walling')
    if (wallingUsed) {
      insights.push('You crashed, then used Walling to recover. This is the system working: something drained you, you set boundaries, sovereignty returned. Remember what the boundary was.')
    } else {
      insights.push('Something hit you hard, but you recovered. The crash-and-recovery arc is complete. Note what drained you and what restored you — this is self-knowledge.')
    }
  }

  return { patterns, insights }
}

// Interpretive reading system - analyzes the full arc and generates coherent narrative
const generateReading = (entries) => {
  if (entries.length === 0) {
    return 'No patterns yet. The map is not the territory — begin tracking to see your architecture emerge.'
  }

  // === PHASE 1: BUILD TIMELINE ===
  const timeline = entries
    .map(e => ({ ...e, ts: new Date(e.timestamp) }))
    .sort((a, b) => a.ts - b.ts) // oldest first

  const now = new Date()
  const hoursAgo = (ts) => (now - ts) / (1000 * 60 * 60)

  // === PHASE 2: EXTRACT KEY DATA ===

  // Sovereignty arc
  const sovereigntyPoints = timeline
    .filter(e => e.type === 'sovereignty' && e.data?.newValue !== undefined)
    .map(e => ({ value: e.data.newValue, oldValue: e.data.oldValue, ts: e.ts, note: e.note }))

  // Get current/final sovereignty (most recent entry or infer from last change)
  const currentSovereignty = sovereigntyPoints.length > 0
    ? sovereigntyPoints[sovereigntyPoints.length - 1].value
    : null

  const startingSovereignty = sovereigntyPoints.length > 0
    ? sovereigntyPoints[0].oldValue || sovereigntyPoints[0].value
    : null

  // Find extremes
  const lowestPoint = sovereigntyPoints.length > 0
    ? Math.min(...sovereigntyPoints.map(p => p.value))
    : null

  const highestPoint = sovereigntyPoints.length > 0
    ? Math.max(...sovereigntyPoints.map(p => p.value))
    : null

  // Skills used (with recency weighting)
  const skillEvents = timeline.filter(e => e.type === 'skill')
  const recentSkills = skillEvents.filter(e => hoursAgo(e.ts) < 6)
  const skillCounts = {}
  skillEvents.forEach(e => {
    skillCounts[e.action] = (skillCounts[e.action] || 0) + 1
  })

  // Shadows detected
  const shadowEvents = timeline.filter(e => e.type === 'shadow')
  const activeShadows = shadowEvents.filter(e => e.subAction === 'set')
  const clearedShadows = shadowEvents.filter(e => e.subAction === 'clear')
  const shadowCounts = {}
  activeShadows.forEach(e => {
    shadowCounts[e.action] = (shadowCounts[e.action] || 0) + 1
  })

  // Notes content
  const allNotes = timeline.filter(e => e.note).map(e => e.note.toLowerCase())
  const notesText = allNotes.join(' ')

  // Timing patterns
  const lateNightEntries = timeline.filter(e => {
    const hour = e.ts.getHours()
    return hour >= 23 || hour < 5
  })

  // === PHASE 3: CLASSIFY THE ARC ===

  let arcType = 'STABLE'
  let stateNow = 'ADEQUATE'

  // Determine current state
  if (currentSovereignty !== null) {
    if (currentSovereignty >= 70) stateNow = 'RESOURCED'
    else if (currentSovereignty >= 40) stateNow = 'ADEQUATE'
    else if (currentSovereignty >= 20) stateNow = 'DEPLETED'
    else stateNow = 'CRITICAL'
  }

  // Determine arc type
  if (currentSovereignty !== null && startingSovereignty !== null) {
    const netChange = currentSovereignty - startingSovereignty
    const range = highestPoint - lowestPoint

    if (stateNow === 'CRITICAL') {
      arcType = 'CRISIS'
    } else if (lowestPoint !== null && lowestPoint < 30 && currentSovereignty >= 50) {
      arcType = 'RECOVERY'
    } else if (netChange >= 20) {
      arcType = 'RISING'
    } else if (netChange <= -20) {
      arcType = 'DECLINING'
    } else if (range > 40) {
      arcType = 'VOLATILE'
    } else if (currentSovereignty >= 60) {
      arcType = 'STABLE_HIGH'
    } else if (currentSovereignty < 40) {
      arcType = 'STABLE_LOW'
    }
  }

  // === PHASE 4: DETECT KEY MOMENTS ===

  // Find the pivotal event (biggest sovereignty change)
  let pivotalEvent = null
  let biggestDrop = 0
  let biggestGain = 0

  sovereigntyPoints.forEach(p => {
    if (p.oldValue !== undefined) {
      const change = p.value - p.oldValue
      if (change < biggestDrop) {
        biggestDrop = change
        pivotalEvent = { type: 'drop', ...p }
      }
      if (change > biggestGain) {
        biggestGain = change
        pivotalEvent = { type: 'gain', ...p }
      }
    }
  })

  // Find what skill might have caused recovery
  const recoverySkill = recentSkills.length > 0 ? recentSkills[recentSkills.length - 1] : null

  // Detect note themes
  const distressWords = ['ugh', 'fuck', 'shit', 'damn', 'hate', 'awful', 'terrible', 'worst', 'dying', 'dead', 'help', 'drowning', 'overwhelm', 'breaking', 'broken', 'empty']
  const restorationWords = ['rested', 'restored', 'better', 'relief', 'calm', 'peaceful', 'recovered', 'slept']
  const boundaryWords = ['said no', 'declined', 'boundary', 'refused', 'not my', 'put down', 'let go']
  const urgencyWords = ['need to', 'have to', 'must', 'should', 'can\'t stop']

  const hasDistress = distressWords.some(w => notesText.includes(w))
  const hasRestoration = restorationWords.some(w => notesText.includes(w))
  const hasBoundaryLanguage = boundaryWords.some(w => notesText.includes(w))
  const hasUrgency = urgencyWords.some(w => notesText.includes(w))

  // === PHASE 5: GENERATE NARRATIVE ===

  const skillNames = {
    gordian_cut: 'Gordian Cut',
    decisive_intervention: 'Decisive Intervention',
    galvanic_surge: 'Galvanic Surge',
    sovereign_yield: 'Sovereign Yield',
    walling: 'Walling'
  }

  const shadowNames = {
    over_control: 'Over-Control',
    isolation_spiral: 'Isolation Spiral',
    intensity_addiction: 'Intensity Addiction',
    false_responsibility: 'False Responsibility'
  }

  // Build the reading as a flowing narrative
  let reading = ''

  // OPENING: Current state assessment
  const stateOpenings = {
    RESOURCED: 'You are resourced.',
    ADEQUATE: 'You are holding.',
    DEPLETED: 'You are depleted.',
    CRITICAL: 'You are in crisis.'
  }
  reading += stateOpenings[stateNow]

  if (currentSovereignty !== null) {
    reading += ` Sovereignty at ${currentSovereignty}%.`
  }

  // MIDDLE: The arc - how we got here
  reading += '\n\n'

  switch (arcType) {
    case 'CRISIS':
      reading += 'The data shows a system under severe strain. '
      if (lowestPoint !== null && lowestPoint < 20) {
        reading += `You dropped to ${lowestPoint}% — this is critical territory. `
      }
      if (hasDistress) {
        reading += 'The language in your notes confirms what the numbers show: this is not fine. '
      }
      reading += 'Everything else waits. Restoration is the only work right now.'
      break

    case 'RECOVERY':
      reading += 'This is a recovery arc. '
      if (lowestPoint !== null) {
        reading += `You hit ${lowestPoint}%, then climbed back to ${currentSovereignty}%. `
      }
      // What drove the recovery?
      if (skillCounts.walling > 0) {
        reading += 'Walling appears in the log — boundaries were set. '
      }
      if (skillCounts.sovereign_yield > 0) {
        reading += 'Sovereign Yield was activated — you chose surrender. '
      }
      if (hasBoundaryLanguage) {
        reading += 'The notes mention putting things down, saying no. '
      }
      reading += 'This is the system working: something drained you, you responded with the right tools, sovereignty returned.'
      break

    case 'RISING':
      reading += 'The trajectory is upward. '
      if (startingSovereignty !== null) {
        reading += `You moved from ${startingSovereignty}% to ${currentSovereignty}%. `
      }
      if (hasRestoration) {
        reading += 'The notes reflect this — words like rest, better, calm. '
      }
      reading += 'Whatever you did, keep doing it. This is what building looks like.'
      break

    case 'DECLINING':
      reading += 'The trajectory is downward. '
      if (startingSovereignty !== null) {
        reading += `From ${startingSovereignty}% down to ${currentSovereignty}%. `
      }
      // What's draining?
      const primaryShadow = Object.entries(shadowCounts).sort((a, b) => b[1] - a[1])[0]
      if (primaryShadow) {
        reading += `${shadowNames[primaryShadow[0]] || primaryShadow[0]} has been active — this is likely the drain. `
      }
      if (hasUrgency) {
        reading += 'The notes contain urgency language — "have to," "need to." This is the nervous system in overdrive. '
      }
      reading += 'Name the leak. Apply the antidote. The decline is information, not destiny.'
      break

    case 'VOLATILE':
      reading += 'The pattern is volatile — significant swings without stabilizing. '
      if (highestPoint !== null && lowestPoint !== null) {
        reading += `You've ranged from ${lowestPoint}% to ${highestPoint}%. `
      }
      reading += 'This is exhausting. The system needs steadier ground. Look for what triggers the swings.'
      break

    case 'STABLE_HIGH':
      reading += 'You are in stable territory. '
      if (skillEvents.length > 0) {
        reading += 'Skills are being used proactively rather than reactively. '
      }
      reading += 'This is the state to protect. Note what is keeping you here.'
      break

    case 'STABLE_LOW':
      reading += 'You are stable, but at a depleted baseline. '
      reading += 'This is chronic — not crisis, but not sustainable either. '
      if (skillCounts.sovereign_yield === 0) {
        reading += 'Sovereign Yield has not been activated. The Release phase may be missing. '
      }
      reading += 'Small, consistent restoration beats waiting for a crash to force the issue.'
      break

    default:
      reading += 'The arc is still forming. More data will reveal the pattern.'
  }

  // KEY INSIGHT: One thing to notice
  reading += '\n\n'

  // Cross-reference for deeper pattern
  if (lateNightEntries.length > 0 && hasUrgency) {
    reading += 'A pattern worth naming: urgency language at night. The Off switch is not functioning. The Protector is gripping the day, refusing to release. This prevents the loop from completing.'
  } else if (shadowCounts.false_responsibility > 0 && skillCounts.walling > 0) {
    reading += 'You detected False Responsibility and used Walling to address it. This is exactly right — you saw the drain and applied the specific antidote. Remember what you put down.'
  } else if (shadowCounts.intensity_addiction > 0 && stateNow === 'DEPLETED') {
    reading += 'Intensity Addiction and depletion are a dangerous pair. The craving for stimulation masks the exhaustion underneath. Calm is not emptiness — it is where restoration lives.'
  } else if (skillCounts.galvanic_surge > 0 && (stateNow === 'DEPLETED' || stateNow === 'CRITICAL')) {
    reading += 'Galvanic Surge was used, and you are now depleted. This skill rallies others at personal cost. The cost landed. Recovery is not optional.'
  } else if (arcType === 'RECOVERY' && pivotalEvent && pivotalEvent.type === 'gain' && pivotalEvent.note) {
    reading += `The recovery moment had a note: "${pivotalEvent.note}" — this is data about what actually works for you.`
  } else if (Object.keys(skillCounts).length === 0 && Object.keys(shadowCounts).length > 0) {
    reading += 'Shadows were tracked but skills were not activated. Awareness is step one, but you have tools for this. Use them.'
  } else if (Object.keys(skillCounts).length > 0 && Object.keys(shadowCounts).length === 0) {
    reading += 'Skills were used but no shadows tracked. Both streams matter — the tools and the awareness of what triggers the need for tools.'
  } else if (allNotes.length === 0) {
    reading += 'No notes in this log. The numbers tell part of the story, but the notes tell the rest. Context matters for pattern recognition.'
  } else {
    // Generic insight based on primary skill
    const topSkill = Object.entries(skillCounts).sort((a, b) => b[1] - a[1])[0]
    if (topSkill) {
      const skillInsights = {
        sovereign_yield: 'Sovereign Yield is your most-used skill. You are building the muscle of intentional surrender.',
        walling: 'Walling is your most-used skill. You are learning what is and is not yours to carry.',
        gordian_cut: 'Gordian Cut is your most-used skill. You see through complexity to name the actual problem.',
        decisive_intervention: 'Decisive Intervention is your most-used skill. You force movement when systems stall.',
        galvanic_surge: 'Galvanic Surge is your most-used skill. You rally others — watch the personal cost.'
      }
      reading += skillInsights[topSkill[0]] || 'Your patterns are emerging.'
    } else {
      reading += 'The pattern is still forming. Keep tracking.'
    }
  }

  // CLOSING: Appropriate to the state
  reading += '\n\n'

  if (stateNow === 'CRITICAL') {
    reading += 'Stop. Rest. Everything else can wait. The Sovereign Architect does not push through crisis — they restore first.'
  } else if (stateNow === 'DEPLETED') {
    reading += 'Depletion requires active response, not passive hope. Name one thing that restores you. Do that.'
  } else if (arcType === 'RECOVERY') {
    reading += 'This is the system working. You crashed, you responded, you recovered. Remember what worked.'
  } else if (stateNow === 'RESOURCED') {
    reading += 'Protect this state. It is not guaranteed. Note what is sustaining it.'
  } else {
    reading += 'The map is not the territory — but you are learning to read your own terrain.'
  }

  return reading
}

// Format full log for text export
export const formatLogForExport = (entries) => {
  const header = `SOVEREIGN ARCHITECT — ACTIVITY LOG
Exported: ${new Date().toLocaleString()}
${'='.repeat(50)}

`

  const body = entries
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(entry => {
      const formatted = formatEntryNarrative(entry)
      let text = `${formatted.timestamp}\n${formatted.icon} ${formatted.narrative}`
      if (entry.note) {
        text += `\n   "${entry.note}"`
      }
      return text
    })
    .join('\n\n')

  const reading = generateReading(entries)

  const footer = `

${'='.repeat(50)}
READING
${'='.repeat(50)}

${reading}

${'='.repeat(50)}
End of log. ${entries.length} entries total.
`

  return header + body + footer
}

// The hook
export const useActivityLog = () => {
  const [entries, setEntries] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (parsed) {
        setEntries(Array.isArray(parsed) ? parsed : [])
      }
    } catch (e) {
      console.error('Failed to load activity log:', e)
    }
    setIsLoaded(true)
  }, [])

  // Save to LocalStorage whenever entries change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify( entries)
      } catch (e) {
        console.error('Failed to save activity log:', e)
      }
    }
  }, [entries, isLoaded])

  // Add a new entry
  const logEntry = (type, action, intensity = null, note = null, subAction = null, data = null) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      action,
      intensity,
      subAction,
      note,
      data
    }

    setEntries(prev => [entry, ...prev])
    return entry.id
  }

  // Add note to existing entry
  const addNoteToEntry = (entryId, note) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.id === entryId ? { ...entry, note } : entry
      )
    )
  }

  // Edit an existing entry's note
  const editEntryNote = (entryId, newNote) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.id === entryId ? { ...entry, note: newNote } : entry
      )
    )
  }

  // Delete an entry
  const deleteEntry = (entryId) => {
    setEntries(prev => prev.filter(entry => entry.id !== entryId))
  }

  // Log a skill activation
  const logSkill = (skillId, intensity, note = null) => {
    return logEntry('skill', skillId, intensity, note)
  }

  // Log a shadow change
  const logShadow = (shadowId, intensity, note = null) => {
    const subAction = intensity ? 'set' : 'clear'
    return logEntry('shadow', shadowId, intensity, note, subAction)
  }

  // Log a sovereignty change
  const logSovereignty = (newValue, oldValue, note = null) => {
    return logEntry('sovereignty', 'change', newValue, note, null, { newValue, oldValue })
  }

  // Log a loop phase change
  const logLoopPhase = (phase, note = null) => {
    return logEntry('loop', 'phase_change', null, note, null, { phase })
  }

  // Log loop completion
  const logLoopComplete = (note = null) => {
    return logEntry('loop', 'completed', null, note)
  }

  // Log a check-in response
  const logCheckin = (question, answer, note = null) => {
    return logEntry('checkin', question, null, note, null, { answer })
  }

  // Log a manual journal note
  const logManualNote = (note) => {
    return logEntry('note', 'manual', null, note)
  }

  // Log session start (from onboarding)
  const logSessionStart = (sovereignty, phase, shadows = {}) => {
    const shadowCount = Object.keys(shadows).length
    const shadowList = Object.entries(shadows).map(([id, intensity]) => ({ id, intensity }))
    return logEntry('session', 'start', null, null, null, {
      sovereignty,
      phase,
      shadowCount,
      shadows: shadowList
    })
  }

  // Export log as text file
  const exportLog = () => {
    const text = formatLogForExport(entries)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sovereign-architect-log-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Clear all entries
  const clearLog = () => {
    if (window.confirm('Clear entire activity log? This cannot be undone.')) {
      setEntries([])
    }
  }

  // Get summary stats
  const getStats = () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const thisWeek = entries.filter(e => new Date(e.timestamp) > weekAgo)

    const skillCounts = {}
    const shadowCounts = {}

    thisWeek.forEach(entry => {
      if (entry.type === 'skill') {
        skillCounts[entry.action] = (skillCounts[entry.action] || 0) + 1
      } else if (entry.type === 'shadow' && entry.subAction === 'set') {
        shadowCounts[entry.action] = (shadowCounts[entry.action] || 0) + 1
      }
    })

    return {
      totalEntries: entries.length,
      thisWeekEntries: thisWeek.length,
      skillCounts,
      shadowCounts
    }
  }

  return {
    entries,
    isLoaded,
    logSkill,
    logShadow,
    logSovereignty,
    logLoopPhase,
    logLoopComplete,
    logCheckin,
    logManualNote,
    logSessionStart,
    addNoteToEntry,
    editEntryNote,
    deleteEntry,
    exportLog,
    clearLog,
    getStats,
    formatEntryNarrative
  }
}

export default useActivityLog
