import { useState } from 'react'
import { Plus, Check, Trash2, Circle } from 'lucide-react'
import useTodos from '../hooks/useTodos'
import { BLUE, GRAY, INK, INK2, NAVY_DEEP, PANEL_BG, PANEL_BORDER, RED, alpha } from './river/canon'

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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, margin: 0 }}>Quests</h1>
          <p style={{ fontSize: 13, color: INK2, margin: '2px 0 0' }}>{open.length} open &mdash; {done.length} complete</p>
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
        <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: 'none' }}>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="What needs to get done?"
            style={{ width: '100%', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', color: INK, outline: 'none', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['high','medium','low'].map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{
                  padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid',
                  background: priority === p ? (p === 'high' ? alpha(RED, 15) : p === 'medium' ? alpha(BLUE, 15) : NAVY_DEEP) : NAVY_DEEP,
                  color: priority === p ? (p === 'high' ? RED : p === 'medium' ? INK : GRAY) : GRAY,
                  borderColor: priority === p ? (p === 'high' ? alpha(RED, 40) : p === 'medium' ? alpha(BLUE, 40) : NAVY_DEEP) : NAVY_DEEP,
                  fontWeight: priority === p ? 600 : 400,
                }}
              >{p}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setAdding(false)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, fontSize: 13, color: GRAY, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: BLUE, color: NAVY_DEEP, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
          </div>
        </div>
      )}

      {/* Open quests */}
      {open.length > 0 && (
        <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, boxShadow: 'none', marginBottom: 16, overflow: 'hidden' }}>
          {open.map((todo, i) => (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < open.length - 1 ? `1px solid ${PANEL_BORDER}` : 'none' }}>
              <button
                onClick={() => toggleTodo(todo.id)}
                style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${PANEL_BORDER}`, background: PANEL_BG, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
              >
                <Circle size={10} style={{ color: PANEL_BORDER }} />
              </button>
              <span style={{ flex: 1, fontSize: 14, color: INK, fontFamily: 'inherit' }}>{todo.text}</span>
              {todo.priority && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, border: '1px solid', fontFamily: 'inherit',
                  background: todo.priority === 'high' ? alpha(RED, 15) : todo.priority === 'medium' ? alpha(BLUE, 15) : NAVY_DEEP,
                  color: todo.priority === 'high' ? RED : todo.priority === 'medium' ? INK : GRAY,
                  borderColor: todo.priority === 'high' ? alpha(RED, 40) : todo.priority === 'medium' ? alpha(BLUE, 40) : NAVY_DEEP,
                }}>{todo.priority}</span>
              )}
              <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PANEL_BORDER, padding: 4, borderRadius: 6, display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = RED} onMouseLeave={e => e.currentTarget.style.color = PANEL_BORDER}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!adding && open.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: INK2, fontSize: 14 }}>
          No open quests. <button onClick={() => setAdding(true)} style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>Add one?</button>
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, boxShadow: 'none', overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${PANEL_BORDER}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: INK2, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'inherit' }}>Completed ({done.length})</span>
          </div>
          {done.map((todo, i) => (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < done.length - 1 ? `1px solid ${PANEL_BORDER}` : 'none', opacity: 0.5 }}>
              <button onClick={() => toggleTodo(todo.id)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${BLUE}`, background: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                <Check size={10} style={{ color: NAVY_DEEP }} />
              </button>
              <span style={{ flex: 1, fontSize: 14, color: INK2, textDecoration: 'line-through', fontFamily: 'inherit' }}>{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PANEL_BORDER, padding: 4, borderRadius: 6, display: 'flex' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
