import { useState } from 'react'
import { ArrowLeft, Plus, Check, Trash2, Pin, ExternalLink } from 'lucide-react'
import InlineName from './InlineName'
import { getFreshnessTier } from '../hooks/usePortfolio'

const FRESHNESS_COLORS = {
  fresh: 'bg-game-green',
  warning: 'bg-yellow-500',
  stale: 'bg-game-text-dim',
}
const PRIORITY_COLORS = {
  low: 'text-[#334E85]',
  medium: 'text-[#002C77]',
  high: 'text-[#002C77]',
  urgent: 'text-[#002C77]',
}
const STATUS_LABELS = {
  active: 'Active',
  pencils_down: 'Pencils Down',
  on_hold: 'On Hold',
  archived: 'Archived',
}

const ProjectDetail = ({ project, onUpdate, onPin, onBack }) => {
  const [newTask, setNewTask] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const freshness = getFreshnessTier(project.last_activity_at)

  // Tasks stored as JSON in a tasks field on the project
  const tasks = project.tasks || []
  const notes = project.notes || []
  const startHereNote = notes.find(n => n.text && n.text.startsWith("START HERE"))
  const otherNotes = notes.filter(n => !(n.text && n.text.startsWith("START HERE")))
  const links = project.links || []

  const addTask = () => {
    if (!newTask.trim()) return
    const task = { id: Date.now().toString(36), text: newTask.trim(), done: false, created_at: new Date().toISOString() }
    onUpdate(project.id, { tasks: [...tasks, task] })
    setNewTask('')
  }

  const toggleTask = (taskId) => {
    onUpdate(project.id, {
      tasks: tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    })
  }

  const deleteTask = (taskId) => {
    onUpdate(project.id, { tasks: tasks.filter(t => t.id !== taskId) })
  }

  const addNote = () => {
    if (!newNote.trim()) return
    const note = { id: Date.now().toString(36), text: newNote.trim(), created_at: new Date().toISOString() }
    onUpdate(project.id, { notes: [...notes, note] })
    setNewNote('')
  }

  const addLink = () => {
    if (!newLinkUrl.trim()) return
    const link = {
      id: Date.now().toString(36),
      url: newLinkUrl.trim(),
      label: newLinkLabel.trim() || new URL(newLinkUrl.trim()).hostname,
      created_at: new Date().toISOString()
    }
    onUpdate(project.id, { links: [...links, link] })
    setNewLinkUrl('')
    setNewLinkLabel('')
  }

  const deleteLink = (linkId) => {
    onUpdate(project.id, { links: links.filter(l => l.id !== linkId) })
  }

  return (
    <div className="space-y-6">
      {startHereNote && (
        <div style={{ background: "#FFFBEB", border: "2px solid #F59E0B", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#B45309", letterSpacing: "0.12em", marginBottom: 5, fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}>Where to Start</div>
          <div style={{ fontSize: 13, color: "#002C77", fontFamily: "Arial, sans-serif", lineHeight: 1.7 }}>{startHereNote.text.replace("START HERE >> ", "")}</div>
        </div>
      )}
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#334E85] hover:text-[#002C77] transition-colors text-sm "
      >
        <ArrowLeft size={14} /> Back to Portfolio
      </button>

      {/* Project header */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className={`w-3 h-3 rounded-full ${FRESHNESS_COLORS[freshness]}`} />
          <h1 className="font-game text-xl text-[#002C77] flex-1">
            <InlineName name={project.name} onRename={(name) => onUpdate(project.id, { name })} />
          </h1>
          <button
            onClick={() => onPin(project.id)}
            className={`p-1.5 rounded border transition-colors ${project.pinned ? 'border-[#E2E8F0]/40 text-[#002C77]' : 'border-[#E2E8F0] text-[#334E85] hover:text-[#002C77]'}`}
            title={project.pinned ? 'Unpin' : 'Pin as focus'}
          >
            <Pin size={14} className={project.pinned ? 'fill-current' : ''} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] px-2 py-0.5 rounded border border-[#E2E8F0]/30 text-[#002C77]  uppercase tracking-wider">
            {project.category}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded border border-current/30  uppercase tracking-wider ${PRIORITY_COLORS[project.priority]}`}>
            {project.priority}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded border border-[#E2E8F0] text-[#334E85]  uppercase tracking-wider">
            {STATUS_LABELS[project.status]}
          </span>
          {project.tags?.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded border border-[#E2E8F0]/30 text-[#002C77] ">
              {tag}
            </span>
          ))}
        </div>

        <div className="text-[10px]  text-[#334E85] space-x-4">
          {project.target_date && (
            <span>Deadline: {new Date(project.target_date).toLocaleDateString()}</span>
          )}
          <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
          <span>Last active: {new Date(project.last_activity_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
        <h2 className="font-game text-sm text-[#002C77] uppercase tracking-wider mb-3">Tasks</h2>

        <div className="space-y-1 mb-3">
          {tasks.length === 0 && (
            <p className="text-[#334E85] text-xs  py-2">No tasks yet.</p>
          )}
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 py-1 group">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  task.done ? 'bg-game-green/20 border-[#E2E8F0] text-[#00968F]' : 'border-[#E2E8F0] hover:border-[#E2E8F0]/50'
                }`}
              >
                {task.done && <Check size={10} />}
              </button>
              <span className={`text-sm  flex-1 ${task.done ? 'line-through text-[#334E85]' : 'text-[#002C77]'}`}>
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-[#334E85] hover:text-[#002C77] transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
            className="flex-1 bg-[#F7F9FC] border border-[#E2E8F0] rounded px-3 py-1.5 text-sm text-[#002C77] placeholder:text-[#334E85] outline-none focus:border-[#E2E8F0]/50 transition-colors "
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            className="px-3 py-1.5 rounded bg-game-gold/20 border border-[#E2E8F0]/40 text-[#002C77] text-sm  hover:bg-game-gold/30 disabled:opacity-30 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Links */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
        <h2 className="font-game text-sm text-[#002C77] uppercase tracking-wider mb-3">Links</h2>

        <div className="space-y-1.5 mb-3">
          {links.length === 0 && (
            <p className="text-[#334E85] text-xs  py-2">No links yet.</p>
          )}
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-2 py-1 group">
              <ExternalLink size={12} className="text-[#002C77] flex-shrink-0" />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm  text-[#002C77] hover:text-[#002C77] transition-colors truncate flex-1"
              >
                {link.label}
              </a>
              <span className="text-[10px]  text-[#334E85] hidden sm:inline truncate max-w-[200px]">
                {link.url}
              </span>
              <button
                onClick={() => deleteLink(link.id)}
                className="opacity-0 group-hover:opacity-100 text-[#334E85] hover:text-[#002C77] transition-all flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
            placeholder="https://..."
            className="flex-1 bg-[#F7F9FC] border border-[#E2E8F0] rounded px-3 py-1.5 text-sm text-[#002C77] placeholder:text-[#334E85] outline-none focus:border-[#E2E8F0]/50 transition-colors "
          />
          <input
            value={newLinkLabel}
            onChange={(e) => setNewLinkLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
            placeholder="Label (optional)"
            className="w-36 bg-[#F7F9FC] border border-[#E2E8F0] rounded px-3 py-1.5 text-sm text-[#002C77] placeholder:text-[#334E85] outline-none focus:border-[#E2E8F0]/50 transition-colors "
          />
          <button
            onClick={addLink}
            disabled={!newLinkUrl.trim()}
            className="px-3 py-1.5 rounded bg-game-gold/20 border border-[#E2E8F0]/40 text-[#002C77] text-sm  hover:bg-game-gold/30 disabled:opacity-30 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
        <h2 className="font-game text-sm text-[#002C77] uppercase tracking-wider mb-3">Notes</h2>

        <div className="space-y-2 mb-3">
          {otherNotes.length === 0 && (
            <p className="text-[#334E85] text-xs  py-2">No notes yet.</p>
          )}
          {notes.map(note => (
            <div key={note.id} className="bg-[#F7F9FC] rounded p-2 border border-[#E2E8F0]/30">
              <p className="text-sm  text-[#002C77]">{note.text}</p>
              <span className="text-[10px]  text-[#334E85]">
                {new Date(note.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Add a note..."
            className="flex-1 bg-[#F7F9FC] border border-[#E2E8F0] rounded px-3 py-1.5 text-sm text-[#002C77] placeholder:text-[#334E85] outline-none focus:border-[#E2E8F0]/50 transition-colors "
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim()}
            className="px-3 py-1.5 rounded bg-game-gold/20 border border-[#E2E8F0]/40 text-[#002C77] text-sm  hover:bg-game-gold/30 disabled:opacity-30 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetail
