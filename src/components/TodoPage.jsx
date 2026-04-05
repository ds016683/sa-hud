import { useState } from 'react'
import { Plus, Check, Trash2, Circle } from 'lucide-react'
import useTodos from '../hooks/useTodos'

const PRIORITY_BADGE = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low:    'bg-gray-100 text-gray-500 border-gray-200',
}

export default function TodoPage() {
  const { todos, addTodo, toggleTodo, deleteTodo, loading } = useTodos()
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('medium')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    await addTodo(text.trim(), priority)
    setText('')
    setAdding(false)
  }

  const open = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 }}>Quests</h1>
          <p style={{ fontSize: 13, color: '#8096B2', margin: '2px 0 0' }}>{open.length} open &mdash; {done.length} complete</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="btn-primary"
        >
          <Plus size={14} /> Add Quest
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="What needs to get done?"
            style={{ width: '100%', border: '1px solid #CBD8E8', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'Arial, Helvetica, sans-serif', color: '#002C77', outline: 'none', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['high','medium','low'].map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{
                  padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontFamily: 'Arial, Helvetica, sans-serif', cursor: 'pointer', border: '1px solid',
                  background: priority === p ? (p === 'high' ? '#FEF2F2' : p === 'medium' ? '#EFF6FF' : '#F9FAFB') : 'white',
                  color: priority === p ? (p === 'high' ? '#DC2626' : p === 'medium' ? '#1D4ED8' : '#6B7280') : '#9CA3AF',
                  borderColor: priority === p ? (p === 'high' ? '#FECACA' : p === 'medium' ? '#BFDBFE' : '#E5E7EB') : '#E5E7EB',
                  fontWeight: priority === p ? 600 : 400,
                }}
              >{p}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setAdding(false)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#002C77', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' }}>Add</button>
          </div>
        </div>
      )}

      {/* Open quests */}
      {open.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16, overflow: 'hidden' }}>
          {open.map((todo, i) => (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < open.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <button
                onClick={() => toggleTodo(todo.id)}
                style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #CBD8E8', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
              >
                <Circle size={10} style={{ color: '#CBD8E8' }} />
              </button>
              <span style={{ flex: 1, fontSize: 14, color: '#002C77', fontFamily: 'Arial, Helvetica, sans-serif' }}>{todo.text}</span>
              {todo.priority && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, border: '1px solid', fontFamily: 'Arial, Helvetica, sans-serif',
                  background: todo.priority === 'high' ? '#FEF2F2' : todo.priority === 'medium' ? '#EFF6FF' : '#F9FAFB',
                  color: todo.priority === 'high' ? '#DC2626' : todo.priority === 'medium' ? '#1D4ED8' : '#6B7280',
                  borderColor: todo.priority === 'high' ? '#FECACA' : todo.priority === 'medium' ? '#BFDBFE' : '#E5E7EB',
                }}>{todo.priority}</span>
              )}
              <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD8E8', padding: 4, borderRadius: 6, display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = '#CBD8E8'}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!adding && open.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#8096B2', fontSize: 14 }}>
          No open quests. <button onClick={() => setAdding(true)} style={{ background: 'none', border: 'none', color: '#009DE0', cursor: 'pointer', fontSize: 14, fontFamily: 'Arial, Helvetica, sans-serif' }}>Add one?</button>
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial, Helvetica, sans-serif' }}>Completed ({done.length})</span>
          </div>
          {done.map((todo, i) => (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < done.length - 1 ? '1px solid #F1F5F9' : 'none', opacity: 0.5 }}>
              <button onClick={() => toggleTodo(todo.id)} style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #009DE0', background: '#009DE0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                <Check size={10} style={{ color: 'white' }} />
              </button>
              <span style={{ flex: 1, fontSize: 14, color: '#8096B2', textDecoration: 'line-through', fontFamily: 'Arial, Helvetica, sans-serif' }}>{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD8E8', padding: 4, borderRadius: 6, display: 'flex' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
