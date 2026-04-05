import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = {
  sovereigntyLevel: 50,
  currentPhase: null,
  shadows: {
    over_control: null,
    isolation_spiral: null,
    intensity_addiction: null,
    false_responsibility: null,
  },
}

export default function useGameState() {
  const [gameState, setGameState] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  const fetchGameState = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data, error } = await supabase
        .from('game_state')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('fetchGameState error:', error)
        return
      }

      if (data && data.data) {
        setGameState(prev => ({ ...DEFAULTS, ...prev, ...data.data }))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGameState()
  }, [fetchGameState])

  const saveGameState = useCallback(async (state) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('game_state')
      .upsert({
        user_id: session.user.id,
        data: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) console.error('saveGameState error:', error)
  }, [])

  const setSovereigntyLevel = useCallback((value) => {
    setGameState(prev => {
      const level = typeof value === 'function' ? value(prev.sovereigntyLevel) : value
      const next = { ...prev, sovereigntyLevel: level }
      saveGameState(next)
      return next
    })
  }, [saveGameState])

  const setCurrentPhase = useCallback((phase) => {
    setGameState(prev => {
      const next = { ...prev, currentPhase: phase }
      saveGameState(next)
      return next
    })
  }, [saveGameState])

  const setShadows = useCallback((shadows) => {
    setGameState(prev => {
      const next = { ...prev, shadows }
      saveGameState(next)
      return next
    })
  }, [saveGameState])

  return {
    sovereigntyLevel: gameState.sovereigntyLevel,
    currentPhase: gameState.currentPhase,
    shadows: gameState.shadows,
    loading,
    setSovereigntyLevel,
    setCurrentPhase,
    setShadows,
  }
}