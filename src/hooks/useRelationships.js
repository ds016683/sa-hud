import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useRelationships — fetches people + interactions from Supabase.
 *
 * Schema:
 *   relationships: id, full_name, primary_email, emails[], company, title, city,
 *                  contact_count, last_contact_at, source[], tags[], target_lists[],
 *                  pinned, hidden, notes, created_at, updated_at
 *   interactions:  id, relationship_id, kind, occurred_at, subject, direction,
 *                  source, source_ref, metadata
 */
export default function useRelationships() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data, error: err } = await supabase
        .from('relationships')
        .select('*')
        .eq('hidden', false)
        .order('contact_count', { ascending: false, nullsFirst: false })

      if (err) { setError(err.message); console.error('fetchRelationships:', err); return }
      setPeople(data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ----- Mutations -----
  const updatePerson = useCallback(async (id, patch) => {
    // Optimistic
    setPeople(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    const { error: err } = await supabase
      .from('relationships')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) { console.error('updatePerson:', err); fetchAll() }  // rollback by refetch
  }, [fetchAll])

  const togglePin = useCallback((id) => {
    const p = people.find(x => x.id === id)
    if (!p) return
    return updatePerson(id, { pinned: !p.pinned })
  }, [people, updatePerson])

  const hidePerson = useCallback((id) => updatePerson(id, { hidden: true }), [updatePerson])

  const addToList = useCallback(async (ids, listName) => {
    if (!listName?.trim() || !ids?.length) return
    const list = listName.trim().toLowerCase().replace(/\s+/g, '-')
    // Per-person update so target_lists merge correctly
    for (const id of ids) {
      const p = people.find(x => x.id === id)
      if (!p) continue
      const next = Array.from(new Set([...(p.target_lists || []), list]))
      await updatePerson(id, { target_lists: next })
    }
  }, [people, updatePerson])

  const removeFromList = useCallback(async (id, listName) => {
    const p = people.find(x => x.id === id)
    if (!p) return
    const next = (p.target_lists || []).filter(l => l !== listName)
    await updatePerson(id, { target_lists: next })
  }, [people, updatePerson])

  const addTag = useCallback(async (id, tag) => {
    const p = people.find(x => x.id === id)
    if (!p) return
    const t = tag.trim().toLowerCase()
    if (!t) return
    const next = Array.from(new Set([...(p.tags || []), t]))
    await updatePerson(id, { tags: next })
  }, [people, updatePerson])

  const removeTag = useCallback(async (id, tag) => {
    const p = people.find(x => x.id === id)
    if (!p) return
    const next = (p.tags || []).filter(t => t !== tag)
    await updatePerson(id, { tags: next })
  }, [people, updatePerson])

  const saveNotes = useCallback((id, notes) => updatePerson(id, { notes }), [updatePerson])

  // ----- Create a new person (manual add) -----
  const createPerson = useCallback(async (payload) => {
    // payload: { full_name, primary_email, company, title, ... tags?, target_lists? }
    const now = new Date().toISOString()
    const row = {
      ...payload,
      primary_email: (payload.primary_email || '').trim().toLowerCase() || null,
      source: payload.source || ['manual'],
      tags: payload.tags || ['interest:new', 'type:personal'],
      contact_count: 0,
      created_at: now,
      updated_at: now,
    }
    // Drop nulls/empties for cleanliness
    for (const k of Object.keys(row)) {
      if (row[k] === '' || row[k] === undefined) delete row[k]
    }
    const { data, error: err } = await supabase
      .from('relationships')
      .insert(row)
      .select()
      .single()
    if (err) {
      console.error('createPerson:', err)
      return { error: err }
    }
    setPeople(prev => [...prev, data])
    return { data }
  }, [])

  // ----- Fetch interactions for one person -----
  const fetchInteractions = useCallback(async (relationshipId, limit = 100) => {
    const { data, error: err } = await supabase
      .from('interactions')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('occurred_at', { ascending: false })
      .limit(limit)
    if (err) { console.error('fetchInteractions:', err); return [] }
    return data || []
  }, [])

  // ----- Derived: all known target lists -----
  const allLists = useMemo(() => {
    const set = new Set()
    for (const p of people) for (const l of (p.target_lists || [])) set.add(l)
    return [...set].sort()
  }, [people])

  // ----- Derived: all known tags -----
  const allTags = useMemo(() => {
    const set = new Set()
    for (const p of people) for (const t of (p.tags || [])) set.add(t)
    return [...set].sort()
  }, [people])

  return {
    people, loading, error,
    refetch: fetchAll,
    updatePerson, togglePin, hidePerson,
    addToList, removeFromList,
    addTag, removeTag,
    saveNotes,
    createPerson,
    fetchInteractions,
    allLists, allTags,
  }
}
