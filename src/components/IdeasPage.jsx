import { useState } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, Zap, GraduationCap, Plus, Trash2 } from 'lucide-react'
import useIdeas, { STAGES } from '../hooks/useIdeas'

const STAGE_LABELS = {
  ideation: 'Ideation',
  concept: 'Concept',
  attunement: 'Attunement',
  disposition: 'Disposition',
  completion: 'Completion',
}

function StageBar({ stage }) {
  const currentIndex = STAGES.indexOf(stage)
  return (
    <div className="flex gap-1 mt-2">
      {STAGES.map((s, i) => (
        <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={`h-1.5 w-full rounded-full transition-colors ${
              i <= currentIndex ? 'bg-game-gold' : 'bg-game-border/40'
            }`}
          />
          <span className={`text-[9px] font-mono uppercase tracking-wider truncate w-full text-center ${
            i <= currentIndex ? 'text-game-gold/70' : 'text-game-text-dim/50'
          }`}>
            {STAGE_LABELS[s]}
          </span>
        </div>
      ))}
    </div>
  )
}

function IdeaCard({ idea, onAdvance, onGraduate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const isComplete = idea.stage === 'completion'
  const canGraduate = idea.graduation_candidate || isComplete

  return (
    <div className="bg-game-dark border border-game-border/60 rounded-lg p-4 space-y-3 hover:border-game-border transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-game-text font-semibold text-sm leading-snug flex-1">{idea.name}</h3>
        <button
          onClick={() => onDelete(idea.id)}
          className="text-game-text-dim hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
          title="Delete idea"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Stage bar */}
      <StageBar stage={idea.stage} />

      {/* Tags */}
      {idea.tags && idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {idea.tags.map(tag => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-game-border/20 text-game-text-dim border border-game-border/40 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Next action */}
      {idea.next_action && (
        <p className="text-xs text-game-text-dim italic">
          → {idea.next_action}
        </p>
      )}

      {/* Context (collapsible) */}
      {idea.context && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[11px] text-game-text-dim hover:text-game-text-muted transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Context
          </button>
          {expanded && (
            <p className="mt-1.5 text-xs text-game-text-dim leading-relaxed border-l-2 border-game-border/40 pl-2">
              {idea.context}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {!isComplete && (
          <button
            onClick={() => onAdvance(idea.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-game-gold/10 text-game-gold border border-game-gold/30 rounded hover:bg-game-gold/20 transition-colors"
          >
            <Zap size={11} />
            Advance Stage
          </button>
        )}
        {canGraduate && (
          <button
            onClick={() => onGraduate(idea.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-emerald-900/20 text-emerald-400 border border-emerald-700/40 rounded hover:bg-emerald-900/30 transition-colors"
          >
            <GraduationCap size={11} />
            Graduate to Project
          </button>
        )}
      </div>
    </div>
  )
}

export default function IdeasPage({ sync }) {
  const { ideas, addIdea, advanceStage, deleteIdea } = useIdeas()
  const [newName, setNewName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    addIdea(trimmed)
    setNewName('')
  }

  function handleGraduate(id) {
    // Placeholder: mark as graduation candidate — future integration with portfolio
    alert('Graduate to Project: coming soon. Wire this into your Portfolio workflow.')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Lightbulb className="text-game-gold" size={22} />
        <div>
          <h1 className="text-game-gold font-mono text-lg uppercase tracking-widest">Ideas Pipeline</h1>
          <p className="text-game-text-dim text-xs font-mono mt-0.5">Concept → Execution</p>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New idea name…"
          className="flex-1 bg-game-dark border border-game-border/60 rounded px-3 py-2 text-sm text-game-text placeholder:text-game-text-dim font-mono focus:outline-none focus:border-game-gold/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-game-gold/10 text-game-gold border border-game-gold/30 rounded hover:bg-game-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={13} />
          Add
        </button>
      </form>

      {/* Ideas list */}
      {ideas.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Lightbulb className="mx-auto text-game-border/60" size={32} />
          <p className="text-game-text-dim text-sm font-mono">No ideas in the pipeline.</p>
          <p className="text-game-text-dim/60 text-xs">Add one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onAdvance={advanceStage}
              onGraduate={handleGraduate}
              onDelete={deleteIdea}
            />
          ))}
        </div>
      )}
    </div>
  )
}
