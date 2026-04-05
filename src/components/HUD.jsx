import { useState, useEffect, useRef } from 'react'
import TimeContext from './TimeContext'
import ActivityLog from './ActivityLog'
// NotePrompt removed
import StickyResourceBar from './StickyResourceBar'
import LoopStatus from './LoopStatus'
import ShadowMonitor from './ShadowMonitor'
import DailyPrompts from './DailyPrompts'
import HorizontalSkills from './HorizontalSkills'
// FirstTimeNudges removed
import useActivityLog from '../hooks/useActivityLog'
import useGameState from '../hooks/useGameState'

const HUD = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const gameState = useGameState()
  const { sovereigntyLevel, setSovereigntyLevel, currentPhase, shadows } = gameState

  const [sovereigntySet, setSovereigntySet] = useState(false)
  const [phaseSet, setPhaseSet] = useState(false)
  const [shadowsChecked, setShadowsChecked] = useState(false)
  const [showNudges, setShowNudges] = useState(false)
  const sessionLogged = useRef(false)

  const {
    entries,
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
    getStats
  } = useActivityLog()

  const [notePrompt, setNotePrompt] = useState({
    isOpen: false,
    pendingEntryId: null,
    actionLabel: '',
    undoData: null,
  })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getTimeOfDay = () => {
    const hour = currentTime.getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night'
  }

  const getGreeting = () => {
    const greetings = {
      morning: 'Morning Orientation',
      afternoon: 'Mid-Day Status',
      evening: 'Evening Integration',
      night: 'Night Watch'
    }
    return greetings[getTimeOfDay()]
  }

  const skillNames = {
    gordian_cut: 'Gordian Cut',
    decisive_intervention: 'Decisive Intervention',
    galvanic_surge: 'Galvanic Surge',
    sovereign_yield: 'Sovereign Yield',
    walling: 'Walling'
  }

  const shadowNames = {
    over_control: 'Over-Control State',
    isolation_spiral: 'Isolation Spiral',
    intensity_addiction: 'Intensity Addiction',
    false_responsibility: 'False Responsibility'
  }

  const handleSkillActivate = (skillId, intensity, sovereigntyBefore) => {
    const entryId = logSkill(skillId, intensity)
    setNotePrompt({
      isOpen: true,
      pendingEntryId: entryId,
      actionLabel: `${skillNames[skillId] || skillId} (${intensity.toUpperCase()})`,
      undoData: { type: 'skill', sovereigntyBefore }
    })
  }

  const handleShadowChange = (shadowId, intensity, previousIntensity) => {
    setShadowsChecked(true)
    gameState.setShadows({ ...shadows, [shadowId]: intensity })
    const entryId = logShadow(shadowId, intensity)
    const action = intensity ? 'detected' : 'cleared'
    setNotePrompt({
      isOpen: true,
      pendingEntryId: entryId,
      actionLabel: `${shadowNames[shadowId] || shadowId} ${action}${intensity ? ` (${intensity.toUpperCase()})` : ''}`,
      undoData: { type: 'shadow', shadowId, previousIntensity }
    })
  }

  const handleSovereigntyChange = (newValue, oldValue) => {
    setSovereigntySet(true)
    const entryId = logSovereignty(newValue, oldValue)
    setNotePrompt({
      isOpen: true,
      pendingEntryId: entryId,
      actionLabel: `Sovereignty: ${oldValue}% -> ${newValue}%`,
      undoData: { type: 'sovereignty', previousValue: oldValue }
    })
  }

  const handleLoopPhaseChange = (phase, previousPhase) => {
    setPhaseSet(true)
    gameState.setCurrentPhase(phase)
    const entryId = logLoopPhase(phase)
    setNotePrompt({
      isOpen: true,
      pendingEntryId: entryId,
      actionLabel: `Loop phase: ${phase}`,
      undoData: { type: 'loop', previousPhase }
    })
  }

  const handleCheckinResponse = (question, answer) => {
    const entryId = logCheckin(question, answer)
    setNotePrompt({
      isOpen: true,
      pendingEntryId: entryId,
      actionLabel: `Check-in: ${question} - ${answer}`,
      undoData: { type: 'checkin' }
    })
  }

  const handleNoteSubmit = (note) => {
    if (note && notePrompt.pendingEntryId) {
      addNoteToEntry(notePrompt.pendingEntryId, note)
    }
    setNotePrompt({ isOpen: false, pendingEntryId: null, actionLabel: '', undoData: null })
  }

  const handleNoteUndo = () => {
    const { pendingEntryId, undoData } = notePrompt
    if (pendingEntryId) deleteEntry(pendingEntryId)
    if (undoData) {
      if (undoData.type === 'sovereignty' && undoData.previousValue !== undefined) {
        setSovereigntyLevel(undoData.previousValue)
      } else if (undoData.type === 'skill' && undoData.sovereigntyBefore !== undefined) {
        setSovereigntyLevel(undoData.sovereigntyBefore)
      }
    }
    setNotePrompt({ isOpen: false, pendingEntryId: null, actionLabel: '', undoData: null })
  }

  const handleNudgesComplete = () => {
    if (sessionLogged.current) return
    sessionLogged.current = true
    setShowNudges(false)
    logSessionStart(sovereigntyLevel, null, {})
  }

  return (
    <div className="w-full min-h-screen">
      <StickyResourceBar
        sovereignty={sovereigntyLevel}
        setSovereignty={setSovereigntyLevel}
        onSovereigntyChange={handleSovereigntyChange}
      />

      <div className="p-3 md:p-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="game-panel p-3">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-game text-xl md:text-2xl text-game-gold glow-text">
                    COMMAND CENTER
                  </h1>
                  <p className="text-game-text-muted text-xs">
                    Meaning Under Chaos — v2.0
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-game text-game-gold">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-game-text-muted">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            <TimeContext timeOfDay={getTimeOfDay()} greeting={getGreeting()} />

            <HorizontalSkills
              sovereignty={sovereigntyLevel}
              setSovereignty={setSovereigntyLevel}
              onSkillActivate={handleSkillActivate}
            />
          </div>

          <div className="h-full">
            <ActivityLog
              entries={entries}
              onExport={exportLog}
              onClear={clearLog}
              onAddNote={logManualNote}
              onEditNote={editEntryNote}
              onDelete={deleteEntry}
              stats={getStats()}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-1">
            <DailyPrompts timeOfDay={getTimeOfDay()} onCheckinResponse={handleCheckinResponse} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoopStatus
              onPhaseChange={handleLoopPhaseChange}
              entries={entries}
              sovereignty={sovereigntyLevel}
              initialPhase={currentPhase}
            />
            <ShadowMonitor
          shadows={shadows}
          onShadowChange={handleShadowChange}
        />
          </div>
        </div>

        <div className="mt-6 text-center text-game-text-dim text-xs">
          <p>{getTimeOfDay().toUpperCase()} PROTOCOL ACTIVE</p>
        </div>
      </div>

      {/* NotePrompt removed */}

      {showNudges && (
        {/* FirstTimeNudges removed */}
      )}
    </div>
  )
}

export default HUD