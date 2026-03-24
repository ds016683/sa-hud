import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Calendar, Flag } from 'lucide-react'
import useTodos from '../hooks/useTodos'

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-game-red', border: 'border-game-red/40', bg: 'bg-game-red/10', dot: 'bg-game-red' },
  medium: { label: 'Med', color: 'text-game-gold', border: 'border-game-gold/40', bg: 'bg-game-gold/10', dot: 'bg-game-gold' },
  low: { label: 'Low', color: 'text-game-blue', border: 'border-game-blue/40', bg: 'bg-game-blue/10', dot: 'bg-game-blue' },
}

const TodoPage = ({ sync }) => {
  const { todos, addTodo, toggleTodo, deleteTodo, hydrateFromRemote } = useTodos()

  useEffect(() => {
    if (sync?.remoteData?.todos) {
      hydrateFromRemote(sync.remoteData.todos)
    }
  }, [sync?.remoteData, hydrateFromRemote])

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('active') // active | completed | all

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    addTodo({ title: trimmed, dueDate, priority })
    setTitle('')
    setDueDate('')
    setPriority('medium')
  }

  const activeTodos = todos.filter(t => !t.completed)
  const completedTodos = todos.filter(t => t.completed)

  const filtered = filter === 'active' ? activeTodos
    : filter === 'completed' ? completedTodos
    : todos

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate + 'T23:59:59') < new Date()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-game text-lg text-game-gold tracking-wider uppercase">Quests</h1>
          <p className="text-[10px] font-mono text-game-text-dim mt-0.5">
            {activeTodos.length} active{completedTodos.length > 0 ? ` · ${completedTodos.length} completed` : ''}
          </p>
        </div>
      </div>

      {/* Add Todo Form */}
      <form onSubmit={handleSubmit} className="game-panel">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add a new quest..."
            className="flex-1 bg-game-darker/60 border border-game-border/50 rounded px-3 py-2 text-sm font-mono text-game-text placeholder:text-game-text-dim focus:outline-none focus:border-game-gold/50"
          />
          <div className="flex gap-2">
            <div className="relative">
              <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-game-text-dim pointer-events-none" />
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-game-darker/60 border border-game-border/50 rounded pl-7 pr-2 py-2 text-xs font-mono text-game-text-muted focus:outline-none focus:border-game-gold/50 w-36"
              />
            </div>
            <div className="flex rounded border border-game-border/50 overflow-hidden">
              {['high', 'medium', 'low'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-2.5 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    priority === p
                      ? `${PRIORITY_CONFIG[p].bg} ${PRIORITY_CONFIG[p].color}`
                      : 'text-game-text-dim hover:text-game-text-muted bg-game-darker/40'
                  }`}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-game-gold/20 border border-game-gold/40 text-game-gold text-xs font-mono hover:bg-game-gold/30 transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </form>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {[
          { id: 'active', label: `Active (${activeTodos.length})` },
          { id: 'completed', label: `Done (${completedTodos.length})` },
          { id: 'all', label: `All (${todos.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              filter === tab.id
                ? 'text-game-gold bg-game-gold/10 border border-game-gold/30'
                : 'text-game-text-dim hover:text-game-text-muted border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Todo List */}
      {filtered.length === 0 ? (
        <div className="bg-game-panel border border-game-border border-dashed rounded-lg p-12 text-center">
          <p className="font-game text-game-text-muted text-sm mb-2">
            {filter === 'completed' ? 'No completed quests' : filter === 'active' ? 'All quests complete' : 'No quests yet'}
          </p>
          <p className="text-game-text-dim text-xs font-mono">
            {filter === 'active' ? 'Add a quest above to begin.' : 'Complete some quests to see them here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(todo => {
            const pri = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium
            const overdue = !todo.completed && isOverdue(todo.dueDate)
            return (
              <div
                key={todo.id}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded border transition-all ${
                  todo.completed
                    ? 'bg-game-panel/20 border-game-border/20 opacity-50'
                    : 'bg-game-panel/40 border-game-border/40 hover:border-game-border/70'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'bg-game-green/20 border-game-green/50 text-game-green'
                      : 'border-game-border hover:border-game-gold/50'
                  }`}
                >
                  {todo.completed && <Check size={12} />}
                </button>

                {/* Priority dot */}
                <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${pri.dot}`} />

                {/* Title */}
                <span className={`flex-1 text-sm font-mono truncate ${
                  todo.completed ? 'text-game-text-dim line-through' : 'text-game-text'
                }`}>
                  {todo.title}
                </span>

                {/* Due date */}
                {todo.dueDate && (
                  <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-mono ${
                    overdue ? 'text-game-red' : 'text-game-text-dim'
                  }`}>
                    <Calendar size={10} />
                    {formatDate(todo.dueDate)}
                  </span>
                )}

                {/* Priority badge */}
                <span className={`flex-shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${pri.color} ${pri.border} ${pri.bg}`}>
                  {pri.label}
                </span>

                {/* Delete */}
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="flex-shrink-0 text-game-text-dim hover:text-game-red transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TodoPage
