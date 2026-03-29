import { useState, useCallback } from 'react'
import storageAdapter, { STORAGE_KEY_IDEAS } from '../storage/storageAdapter'

const STAGES = ['ideation', 'concept', 'attunement', 'disposition', 'completion']

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function loadIdeas() {
  const parsed = storageAdapter.getItem(STORAGE_KEY_IDEAS)
  return Array.isArray(parsed) ? parsed : []
}

function saveIdeas(ideas) {
  storageAdapter.setItem(STORAGE_KEY_IDEAS, ideas)
}

export default function useIdeas() {
  const [ideas, setIdeas] = useState(loadIdeas)

  const addIdea = useCallback((name) => {
    setIdeas(prev => {
      const now = new Date().toISOString()
      const next = [
        {
          id: generateId(),
          name,
          stage: 'ideation',
          stage_history: ['ideation'],
          created_at: now,
          last_modified: now,
          context: '',
          dropbox_path: '',
          workspace_path: '',
          graduation_candidate: false,
          disposition_options: [],
          next_action: '',
          tags: [],
        },
        ...prev,
      ]
      saveIdeas(next)
      return next
    })
  }, [])

  const updateIdea = useCallback((id, updates) => {
    setIdeas(prev => {
      const next = prev.map(idea =>
        idea.id === id
          ? { ...idea, ...updates, last_modified: new Date().toISOString() }
          : idea
      )
      saveIdeas(next)
      return next
    })
  }, [])

  const advanceStage = useCallback((id) => {
    setIdeas(prev => {
      const next = prev.map(idea => {
        if (idea.id !== id) return idea
        const currentIndex = STAGES.indexOf(idea.stage)
        if (currentIndex === STAGES.length - 1) return idea // Already at completion
        const nextStage = STAGES[currentIndex + 1]
        const now = new Date().toISOString()
        return {
          ...idea,
          stage: nextStage,
          stage_history: [...(idea.stage_history || []), nextStage],
          last_modified: now,
        }
      })
      saveIdeas(next)
      return next
    })
  }, [])

  const deleteIdea = useCallback((id) => {
    setIdeas(prev => {
      const next = prev.filter(idea => idea.id !== id)
      saveIdeas(next)
      return next
    })
  }, [])

  const hydrateFromRemote = useCallback((remoteIdeas) => {
    if (Array.isArray(remoteIdeas)) {
      setIdeas(remoteIdeas)
      saveIdeas(remoteIdeas)
    }
  }, [])

  return { ideas, addIdea, updateIdea, advanceStage, deleteIdea, hydrateFromRemote }
}

export { STAGES }
