import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function useTodos() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) { console.error('fetchTodos error:', error); return }

      // Normalize: DB uses 'text'/'done', UI uses 'title'/'completed'
      const normalized = (data || []).map(t => ({
        ...t,
        title: t.text,
        completed: t.done,
        dueDate: null,
        createdAt: t.created_at,
      }))
      setTodos(normalized)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const addTodo = useCallback(async ({ title, dueDate, priority }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id: session.user.id,
        text: title,
        done: false,
        priority: priority || 'medium',
        created_at: now,
      })
      .select()
      .single()

    if (error) { console.error('addTodo error:', error); return }

    const normalized = {
      ...data,
      title: data.text,
      completed: data.done,
      dueDate: dueDate || null,
      createdAt: data.created_at,
    }
    setTodos(prev => [normalized, ...prev])
  }, [])

  const toggleTodo = useCallback(async (id) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const newDone = !todo.completed

    const { error } = await supabase
      .from('todos')
      .update({ done: newDone })
      .eq('id', id)

    if (error) { console.error('toggleTodo error:', error); return }

    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: newDone, completed: newDone } : t))
  }, [todos])

  const deleteTodo = useCallback(async (id) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) { console.error('deleteTodo error:', error); return }
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  return { todos, loading, addTodo, toggleTodo, deleteTodo }
}