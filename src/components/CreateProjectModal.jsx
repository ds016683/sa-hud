import { useState } from 'react'
import { X } from 'lucide-react'

const CATEGORIES = ['client', 'third-horizon', 'personal', 'learning']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('internal')
  const [priority, setPriority] = useState('medium')
  const [targetDate, setTargetDate] = useState('')
  const [tags, setTags] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({
      name: name.trim(),
      category,
      priority,
      target_date: targetDate || null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    setName('')
    setCategory('client')
    setPriority('medium')
    setTargetDate('')
    setTags('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-game-dark border border-game-border rounded-lg w-full max-w-md mx-4 shadow-xl shadow-black/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-game-border">
          <h2 className="font-game text-game-gold text-sm tracking-wider uppercase">New Project</h2>
          <button onClick={onClose} className="text-game-text-dim hover:text-game-text transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-game-text-muted uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              autoFocus
              className="w-full bg-game-darker border border-game-border rounded px-3 py-2 text-sm text-game-text placeholder:text-game-text-dim outline-none focus:border-game-gold/50 transition-colors font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-game-text-muted uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-game-darker border border-game-border rounded px-3 py-2 text-sm text-game-text outline-none focus:border-game-gold/50 transition-colors font-mono"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-game-text-muted uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-game-darker border border-game-border rounded px-3 py-2 text-sm text-game-text outline-none focus:border-game-gold/50 transition-colors font-mono"
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-game-text-muted uppercase tracking-wider mb-1">
              Deadline (optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-game-darker border border-game-border rounded px-3 py-2 text-sm text-game-text outline-none focus:border-game-gold/50 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-game-text-muted uppercase tracking-wider mb-1">
              Tags (comma-separated, optional)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="design, phase-1, v2..."
              className="w-full bg-game-darker border border-game-border rounded px-3 py-2 text-sm text-game-text placeholder:text-game-text-dim outline-none focus:border-game-gold/50 transition-colors font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded border border-game-border text-game-text-muted text-sm font-mono hover:border-game-text-dim transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 rounded bg-game-gold/20 border border-game-gold/40 text-game-gold text-sm font-mono hover:bg-game-gold/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProjectModal
