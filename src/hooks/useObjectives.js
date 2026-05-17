import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const today = () => new Date().toISOString().slice(0, 10)
const daysAgoISO = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10) }

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
    if (!error && data) setObjectives(prev => prev.map(o => o.id === id ? data : o))
    return data
  }, [])

  const releaseObjective = useCallback(async (id, kind = 'done') => {
    return updateObjective(id, { state: kind === 'foreman' ? 'foreman' : 'released', released_kind: kind, released_at: new Date().toISOString() })
  }, [updateObjective])

  const parkObjective = useCallback((id) => updateObjective(id, { state: 'parked' }), [updateObjective])
  const reactivateObjective = useCallback((id) => updateObjective(id, { state: 'active' }), [updateObjective])
  const deleteObjective = useCallback(async (id) => {
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
    addObjective, updateObjective, releaseObjective, parkObjective, reactivateObjective, deleteObjective,
    setAnchor, rateSovereignty, upsertHabit, saveMeditationAnswer, refresh: fetchAll
  }
}
