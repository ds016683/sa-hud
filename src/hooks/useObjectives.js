import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Use Chicago/Central time for "today" — David is in CT.
// Browser-local would also work but breaks if he's traveling east; CT is the canonical SA-HUD day.
const today = () => {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' })
  return fmt.format(new Date()) // YYYY-MM-DD
}
const daysAgoISO = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n)
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' })
  return fmt.format(d)
}

export default function useObjectives() {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [objectives, setObjectives] = useState([])
  const [sov, setSov] = useState(null)         // today's row
  const [sovHistory, setSovHistory] = useState([]) // last 30 days
  const [habit, setHabit] = useState(null)     // today's row
  const [habitGrid, setHabitGrid] = useState([]) // last 14 days
  const [meditation, setMeditation] = useState(null) // today's row

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true) })
    const sub = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s))
    return () => sub.data.subscription.unsubscribe()
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const uid = session.user.id
      const t = today()
      const since = daysAgoISO(29)

      const [o, sToday, sHist, hToday, hGrid, mToday] = await Promise.all([
        supabase.from('objectives').select('*').eq('user_id', uid).order('captured_at', { ascending: false }),
        supabase.from('sovereignty_ratings').select('*').eq('user_id', uid).eq('day', t).maybeSingle(),
        supabase.from('sovereignty_ratings').select('day,score').eq('user_id', uid).gte('day', since).order('day', { ascending: true }),
        supabase.from('habits').select('*').eq('user_id', uid).eq('day', t).maybeSingle(),
        supabase.from('habits').select('*').eq('user_id', uid).gte('day', daysAgoISO(13)).order('day', { ascending: true }),
        supabase.from('meditation_responses').select('*').eq('user_id', uid).eq('day', t).maybeSingle(),
      ])

      if (!o.error) setObjectives(o.data || [])
      if (!sToday.error) setSov(sToday.data || null)
      if (!sHist.error) setSovHistory(sHist.data || [])
      if (!hToday.error) setHabit(hToday.data || null)
      if (!hGrid.error) setHabitGrid(hGrid.data || [])
      if (!mToday.error) setMeditation(mToday.data || null)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (ready) fetchAll() }, [ready, fetchAll])

  // ---- mutations
  const addObjective = useCallback(async (payload) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const row = { user_id: session.user.id, state: 'active', kind: 'execution', effort: 2, importance: 1, ...payload }
    const { data, error } = await supabase.from('objectives').insert(row).select().single()
    if (!error && data) setObjectives(prev => [data, ...prev])
    return data
  }, [])

  const updateObjective = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from('objectives').update(patch).eq('id', id).select().single()
    if (error) {
      console.error('[useObjectives] updateObjective failed:', error, { id, patch })
      alert(`Save failed: ${error.message}\n\nIf this mentions 'start_date', the v1.4 migration hasn't been run in Supabase yet.`)
    }
    if (!error && data) setObjectives(prev => prev.map(o => o.id === id ? data : o))
    return data
  }, [])

  // Projects bridge: a promoted objective is linked from project_tasks.objective_id
  // (objectives.parent_id is FK-locked to objectives itself, so the link lives on the
  // task side only). Any release-as-done closes the underlying project task too.
  const closeBridgedTask = useCallback(async (obj) => {
    if (!obj?.id) return
    const { error } = await supabase.from('project_tasks')
      .update({ status: 'done', done: true, released_at: new Date().toISOString() })
      .eq('objective_id', obj.id)
      .neq('status', 'done')
    if (error) console.error('[useObjectives] bridge task close failed:', error)
  }, [])

  const releaseObjective = useCallback(async (id, kind = 'done') => {
    const data = await updateObjective(id, { state: kind === 'foreman' ? 'foreman' : 'released', released_kind: kind, released_at: new Date().toISOString() })
    if (kind === 'done') await closeBridgedTask(data)
    return data
  }, [updateObjective, closeBridgedTask])

  const reopenObjective = useCallback((id) => updateObjective(id, { state: 'active', released_kind: null, released_at: null }), [updateObjective])

  const parkObjective = useCallback((id) => updateObjective(id, { state: 'parked', released_kind: null, released_at: null }), [updateObjective])
  const reactivateObjective = useCallback((id) => updateObjective(id, { state: 'active', released_kind: null, released_at: null }), [updateObjective])
  const activateObjective = reactivateObjective // alias — eligible→active
  // v1.11 — Waiting / Inbox containers. Same single mutation surface.
  const waitObjective = useCallback((id) => updateObjective(id, { state: 'waiting', released_kind: null, released_at: null }), [updateObjective])
  const inboxObjective = useCallback((id) => updateObjective(id, { state: 'inbox', released_kind: null, released_at: null }), [updateObjective])
  // Generic "move to container" — every cross-container action flows through this.
  const moveObjective = useCallback(async (id, targetState) => {
    const patch = { state: targetState }
    // Reset release fields on any move out of released/foreman to prevent stale ledger artifacts.
    if (targetState !== 'released' && targetState !== 'foreman') {
      patch.released_kind = null
      patch.released_at = null
    } else {
      // Stamp the release so the Ledger heartbeats see route-icon releases too.
      patch.released_kind = targetState === 'foreman' ? 'foreman' : 'done'
      patch.released_at = new Date().toISOString()
    }
    const data = await updateObjective(id, patch)
    if (targetState === 'released') await closeBridgedTask(data)
    return data
  }, [updateObjective, closeBridgedTask])
  const deleteObjective = useCallback((id) => updateObjective(id, { deleted_at: new Date().toISOString() }), [updateObjective])
  const restoreObjective = useCallback((id) => updateObjective(id, { deleted_at: null }), [updateObjective])
  const purgeObjective = useCallback(async (id) => {
    await supabase.from('objectives').delete().eq('id', id)
    setObjectives(prev => prev.filter(o => o.id !== id))
  }, [])

  const setAnchor = useCallback(async (id) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    // unset others
    await supabase.from('objectives').update({ is_anchor: false }).eq('user_id', session.user.id).eq('is_anchor', true)
    await updateObjective(id, { is_anchor: true })
    setObjectives(prev => prev.map(o => ({ ...o, is_anchor: o.id === id })))
  }, [updateObjective])

  const rateSovereignty = useCallback(async (score, notes) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const row = { user_id: session.user.id, day: today(), score, notes: notes || null }
    const { data, error } = await supabase.from('sovereignty_ratings').upsert(row, { onConflict: 'user_id,day' }).select().single()
    if (!error) {
      setSov(data)
      setSovHistory(prev => {
        const filtered = prev.filter(p => p.day !== data.day)
        return [...filtered, { day: data.day, score: data.score }].sort((a,b) => a.day.localeCompare(b.day))
      })
    }
    return data
  }, [])

  const upsertHabit = useCallback(async (patch) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const row = { user_id: session.user.id, day: today(), ...(habit || {}), ...patch }
    delete row.id; delete row.created_at; delete row.updated_at
    const { data, error } = await supabase.from('habits').upsert(row, { onConflict: 'user_id,day' }).select().single()
    if (!error) {
      setHabit(data)
      setHabitGrid(prev => {
        const filtered = prev.filter(p => p.day !== data.day)
        return [...filtered, data].sort((a,b) => a.day.localeCompare(b.day))
      })
    }
    return data
  }, [habit])

  const saveMeditationAnswer = useCallback(async (rock_answer, audio_variant = 'sonia-stream') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    // create an anchor objective from the answer
    const obj = await addObjective({ title: rock_answer, is_anchor: true, kind: 'design', effort: 2, importance: 3 })
    // unset other anchors
    if (obj) await supabase.from('objectives').update({ is_anchor: false }).eq('user_id', session.user.id).eq('is_anchor', true).neq('id', obj.id)
    const row = { user_id: session.user.id, day: today(), rock_answer, audio_variant, objective_id: obj?.id || null }
    const { data, error } = await supabase.from('meditation_responses').upsert(row, { onConflict: 'user_id,day' }).select().single()
    if (!error) setMeditation(data)
    return data
  }, [addObjective])

  return {
    loading, objectives, sov, sovHistory, habit, habitGrid, meditation,
    addObjective, updateObjective, releaseObjective, reopenObjective, parkObjective, reactivateObjective, activateObjective, waitObjective, inboxObjective, moveObjective, deleteObjective, restoreObjective, purgeObjective,
    setAnchor, rateSovereignty, upsertHabit, saveMeditationAnswer, refresh: fetchAll
  }
}
