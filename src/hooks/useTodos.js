import { useState, useCallback } from 'react'
import storageAdapter, { STORAGE_KEY_TODOS as STORAGE_KEY } from '../storage/storageAdapter'

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function loadTodos() {
  const parsed = storageAdapter.getItem(STORAGE_KEY)
  return Array.isArray(parsed) ? parsed : []
}

function saveTodos(todos) {
  storageAdapter.setItem(STORAGE_KEY, todos)
}

// Normalize a todo item: handle Gist schema (text) vs local schema (title)
function normalizeTodo(item) {
  if (!item.title && item.text) {
    return { ...item, title: item.text }
  }
  return item
}

export default function useTodos() {
  const [todos, setTodos] = useState(loadTodos)

  const addTodo = useCallback(({ title, dueDate, priority }) => {
    setTodos(prev => {
      const next = [
        {
          id: generateId(),
          title,
          dueDate: dueDate || null,
          priority: priority || 'medium',
          completed: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]
      saveTodos(next)
      return next
    })
  }, [])

  const toggleTodo = useCallback((id) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      saveTodos(next)
      return next
    })
  }, [])

  const deleteTodo = useCallback((id) => {
    setTodos(prev => {
      const next = prev.filter(t => t.id !== id)
      saveTodos(next)
      return next
    })
  }, [])

  const hydrateFromRemote = useCallback((remoteTodos) => {
    if (Array.isArray(remoteTodos)) {
      const normalized = remoteTodos.map(normalizeTodo)
      setTodos(normalized)
      saveTodos(normalized)
    }
  }, [])

  return { todos, addTodo, toggleTodo, deleteTodo, hydrateFromRemote }
}
