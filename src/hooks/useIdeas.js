import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const STAGES = ['ideation', 'concept', 'attunement', 'disposition', 'completion']

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') { try { return JSON.parse(tags) } catch { return [] } }
  return []
}

function normalizeIdea(idea) {
  return { ...idea, tags: normalizeTags(idea.tags) }
}

export default function useIdeas() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchIdeas = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) { console.error('fetchIdeas error:', error); return }
      setIdeas((data || []).map(idea => normalizeIdea({ ...idea, name: idea.title || idea.name || "Untitled" })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const addIdea = useCallback(async (name) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id: session.user.id,
        title: name,
        stage: 'ideation',
        description: '',
        tags: [],
        disposition: '',
        next_action: '',
        notes: '',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) { console.error('addIdea error:', error); return null }

    // Add local fields for UI compatibility
    const ideaWithExtras = {
      ...data,
      name: data.title,
      stage_history: ['ideation'],
      last_modified: now,
      context: '',
      dropbox_path: '',
      workspace_path: '',
      graduation_candidate: false,
      disposition_options: [],
    }
    setIdeas(prev => [normalizeIdea(ideaWithExtras), ...prev])
    return ideaWithExtras
  }, [])

  const updateIdea = useCallback(async (id, updates) => {
    const now = new Date().toISOString()

    // Map local field names to DB field names
    const dbUpdates = { updated_at: now }
    if (updates.name !== undefined) dbUpdates.title = updates.name
    if (updates.stage !== undefined) dbUpdates.stage = updates.stage
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
    if (updates.next_action !== undefined) dbUpdates.next_action = updates.next_action
    if (updates.context !== undefined) dbUpdates.description = updates.context
    if (updates.disposition_options !== undefined) dbUpdates.disposition = Array.isArray(updates.disposition_options) ? updates.disposition_options.join(',') : updates.disposition_options
    if (updates.description !== undefined) dbUpdates.description = updates.description

    const { error } = await supabase
      .from('ideas')
      .update(dbUpdates)
      .eq('id', id)

    if (error) { console.error('updateIdea error:', error); return }

    setIdeas(prev => prev.map(idea =>
      idea.id === id
        ? { ...idea, ...updates, last_modified: now, updated_at: now }
        : idea
    ))
  }, [])

  const advanceStage = useCallback(async (id) => {
    const idea = ideas.find(i => i.id === id)
    if (!idea) return
    const currentIndex = STAGES.indexOf(idea.stage)
    if (currentIndex === STAGES.length - 1) return
    const nextStage = STAGES[currentIndex + 1]
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('ideas')
      .update({ stage: nextStage, updated_at: now })
      .eq('id', id)

    if (error) { console.error('advanceStage error:', error); return }

    setIdeas(prev => prev.map(i => {
      if (i.id !== id) return i
      return {
        ...i,
        stage: nextStage,
        stage_history: [...(i.stage_history || []), nextStage],
        last_modified: now,
        updated_at: now,
      }
    }))
  }, [ideas])

  const deleteIdea = useCallback(async (id) => {
    const { error } = await supabase.from('ideas').delete().eq('id', id)
    if (error) { console.error('deleteIdea error:', error); return }
    setIdeas(prev => prev.filter(i => i.id !== id))
  }, [])

  return { ideas, loading, addIdea, updateIdea, advanceStage, deleteIdea }
}