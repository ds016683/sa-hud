import { useState, useCallback } from 'react'
import {
  Lightbulb, ChevronDown, ChevronUp, Zap, GraduationCap,
  Plus, Trash2, X, Tag, Clock, ChevronRight, Pencil, Check
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useIdeas, { STAGES } from '../hooks/useIdeas'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_META = {
  ideation: {
    label: 'Ideation',
    description: 'Raw thinking, no filter — voice memos, concept seeds',
    encouragement: "Every great idea started here. What's on your mind?",
  },
  concept: {
    label: 'Concept',
    description: 'Raw thinking, no filter — voice memos, concept seeds',
    encouragement: 'Shape the clay. What does this actually want to be?',
  },
  attunement: {
    label: 'Attunement',
    description: 'Raw thinking, no filter — voice memos, concept seeds',
    encouragement: 'Steel-man it. What breaks this idea?',
  },
  disposition: {
    label: 'Disposition',
    description: 'Raw thinking, no filter — voice memos, concept seeds',
    encouragement: 'What does this become? Name its destiny.',
  },
  completion: {
    label: 'Completion',
    description: 'Raw thinking, no filter — voice memos, concept seeds',
    encouragement: 'Finish strong. What does done look like?',
  },
}

const DISPOSITION_OPTIONS = ['Publish', 'Pitch', 'Build', 'Share', 'Archive']

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Stage Progress Bar ───────────────────────────────────────────────────────

function StageProgressBar({ stage }) {
  const currentIndex = STAGES.indexOf(stage)
  return (
    <div className="flex gap-0.5">
      {STAGES.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= currentIndex ? 'bg-gray-100' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Idea Card ────────────────────────────────────────────────────────────────

function IdeaCard({ idea, onAdvance, onUpdate, onDelete, isDragOverlay = false }) {
  const [expanded, setExpanded] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(idea.name || idea.title || 'Untitled')
  const [showHistory, setShowHistory] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  const currentMeta = STAGE_META[idea.stage]
  const isCompletion = idea.stage === 'completion'
  const isDisposition = idea.stage === 'disposition'

  const handleTitleSave = () => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== idea.name) {
      onUpdate(idea.id, { name: trimmed })
    }
    setEditingTitle(false)
  }

  const handleTagAdd = () => {
    const t = newTag.trim().toLowerCase()
    if (t && !idea.tags.includes(t)) {
      onUpdate(idea.id, { tags: [...idea.tags, t] })
    }
    setNewTag('')
    setAddingTag(false)
  }

  const handleTagRemove = (tag) => {
    onUpdate(idea.id, { tags: idea.tags.filter(t => t !== tag) })
  }

  const handleDispositionToggle = (opt) => {
    const current = idea.disposition_options || []
    const next = current.includes(opt)
      ? current.filter(o => o !== opt)
      : [...current, opt]
    onUpdate(idea.id, { disposition_options: next })
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow relative group ${
        isDragOverlay ? 'rotate-1 shadow-lg' : ''
      }`}
      style={{ borderLeft: '3px solid #009DE0' }}
    >
      <div className="p-3 space-y-2.5">
        {/* Title row */}
        <div className="flex items-start gap-2">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false) }}
              className="flex-1 text-sm font-semibold text-gray-900 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          ) : (
            <h3
              className="flex-1 text-sm font-semibold text-gray-900 leading-snug cursor-pointer hover:text-[#002C77] transition-colors"
              onClick={() => { setEditingTitle(true); setTitleDraft(idea.name) }}
              title="Click to edit"
            >
              {idea.name}
            </h3>
          )}
          <button
            onClick={() => onDelete(idea.id)}
            className="text-gray-800 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Stage progress bar */}
        <StageProgressBar stage={idea.stage} />

        {/* Stage label */}
        <p className="text-sm text-[#002C77] font-mono">
          {currentMeta.label} — {idea.description || ''}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 items-center">
          {idea.tags.map(tag => (
            <span
              key={tag}
              className="idea-tag"
            >
              {tag}
              <button onClick={() => handleTagRemove(tag)} className="hover:text-red-400 transition-colors">
                <X size={8} />
              </button>
            </span>
          ))}
          {addingTag ? (
            <input
              autoFocus
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onBlur={handleTagAdd}
              onKeyDown={e => { if (e.key === 'Enter') handleTagAdd(); if (e.key === 'Escape') { setAddingTag(false); setNewTag('') } }}
              placeholder="tag…"
              className="w-16 text-sm font-mono border border-gray-200 rounded-full px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-sm text-gray-800 hover:text-[#002C77] transition-colors border border-dashed border-gray-200 hover:border-gray-200 rounded-full"
            >
              <Tag size={8} /> tag
            </button>
          )}
        </div>

        {/* Next action */}
        <div>
          <label className="text-sm text-gray-800 uppercase tracking-wider font-mono">Next action</label>
          <input
            value={idea.next_action || ''}
            onChange={e => onUpdate(idea.id, { next_action: e.target.value })}
            placeholder="What's the one thing to move this forward?"
            className="w-full mt-0.5 text-sm text-gray-700 border border-gray-100 rounded px-2 py-1 focus:outline-none focus:border-gray-200 bg-gray-50 placeholder:text-gray-800"
          />
        </div>

        {/* Context/notes — expandable */}
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-sm text-gray-800 hover:text-[#002C77] transition-colors uppercase tracking-wider font-mono"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Notes {idea.context ? '·' : '(empty)'}
          </button>
          {expanded && (
            <textarea
              value={idea.context || ''}
              onChange={e => onUpdate(idea.id, { context: e.target.value })}
              placeholder="Add context, notes, or braindump…"
              rows={3}
              className="w-full mt-1 text-sm text-gray-700 border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-200 resize-none bg-gray-50 placeholder:text-gray-800"
            />
          )}
        </div>

        {/* Dropbox path */}
        <div>
          <label className="text-sm text-gray-800 uppercase tracking-wider font-mono">Dropbox path</label>
          <input
            value={idea.dropbox_path || ''}
            onChange={e => onUpdate(idea.id, { dropbox_path: e.target.value })}
            placeholder="Optional — where does the material live?"
            className="w-full mt-0.5 text-sm text-gray-700 border border-gray-100 rounded px-2 py-1 focus:outline-none focus:border-gray-200 bg-gray-50 placeholder:text-gray-800 font-mono"
          />
        </div>

        {/* Disposition options — only when at disposition stage */}
        {isDisposition && (
          <div>
            <label className="text-xs text-[#2E5FA3] uppercase tracking-wider font-mono mb-1 block">Disposition</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: "100%", overflow: "hidden" }}>
              {DISPOSITION_OPTIONS.map(opt => {
                const selected = (idea.disposition_options || []).includes(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => handleDispositionToggle(opt)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-sm font-mono rounded border transition-colors ${
                      selected
                        ? 'bg-gray-100 text-[#002C77] border-gray-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-200'
                    }`}
                  >
                    {selected && <Check size={8} />}
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Stage history — collapsible */}
        {idea.stage_history && idea.stage_history.length > 1 && (
          <div>
            <button
              onClick={() => setShowHistory(h => !h)}
              className="flex items-center gap-1 text-sm text-gray-800 hover:text-[#002C77] transition-colors uppercase tracking-wider font-mono"
            >
              <Clock size={8} />
              History {showHistory ? '▲' : '▼'}
            </button>
            {showHistory && (
              <div className="mt-1 space-y-0.5 pl-2 border-l border-gray-100">
                {idea.stage_history.map((s, i) => (
                  <p key={i} className="text-sm text-gray-800 font-mono">
                    → {STAGE_META[s]?.label || s}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="flex gap-3 pt-0.5">
          <span className="text-[9px] text-gray-800 font-mono">Created {formatDateShort(idea.created_at)}</span>
          {idea.last_modified !== idea.created_at && (
            <span className="text-[9px] text-gray-800 font-mono">Modified {formatDateShort(idea.last_modified)}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {!isCompletion && (
            <button
              onClick={() => onAdvance(idea.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono bg-gray-100 text-[#002C77] border border-gray-200 rounded hover:bg-gray-100 transition-colors"
            >
              <Zap size={11} />
              Advance Stage
            </button>
          )}
          {isCompletion && (
            <button
              onClick={() => alert('Graduate to Portfolio: coming soon. Wire into your Portfolio workflow.')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
            >
              <GraduationCap size={11} />
              Graduate to Portfolio
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sortable Idea Card (drag wrapper) ────────────────────────────────────────

function SortableIdeaCard({ idea, onAdvance, onUpdate, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id, data: { stage: idea.stage } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-8 w-5 h-5 flex items-center justify-center text-gray-800 hover:text-[#002C77] cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          ⠿
        </div>
        <IdeaCard
          idea={idea}
          onAdvance={onAdvance}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ stage, ideas, onAdvance, onUpdate, onDelete, isFiltered }) {
  const meta = STAGE_META[stage]
  const stageIdeas = ideas.filter(i => i.stage === stage)

  return (
    <div className="flex flex-col min-w-0" style={{ minWidth: 260, maxWidth: 320, flex: '1 1 260px' }}>
      {/* Column header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-sm font-semibold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider"
            style={{ background: '#E6F5FD', color: '#002C77' }}
          >
            {meta.label}
          </span>
          <span className="text-sm text-gray-800 font-mono">
            {stageIdeas.length}
          </span>
        </div>
        <p className="text-sm text-gray-800 font-mono leading-relaxed px-0.5">{meta.description}</p>
      </div>

      {/* Cards */}
      <SortableContext items={stageIdeas.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {stageIdeas.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
              <p className="text-[11px] text-gray-800 font-mono italic">{meta.encouragement}</p>
            </div>
          ) : (
            stageIdeas.map(idea => (
              <SortableIdeaCard
                key={idea.id}
                idea={idea}
                onAdvance={onAdvance}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Add Idea Modal ───────────────────────────────────────────────────────────

function AddIdeaModal({ onAdd, onClose }) {
  const [title, setTitle] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    onAdd(trimmed, tags)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm" style={{ color: '#002C77' }}>New Idea</h2>
          <button onClick={onClose} className="text-gray-800 hover:text-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-[#2E5FA3] font-mono uppercase tracking-wider block mb-1">Title</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's the idea?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-[#2E5FA3] font-mono uppercase tracking-wider block mb-1">Tags <span className="normal-case text-gray-800">(comma-separated, optional)</span></label>
            <input
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. snmi, strategy, writing"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-[#002C77] text-white hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add to Pipeline
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IdeasPage() {
  const { ideas, addIdea, advanceStage, updateIdea, deleteIdea } = useIdeas()
  const [showModal, setShowModal] = useState(false)
  const [filterTag, setFilterTag] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Collect all tags
  const allTags = [...new Set(ideas.flatMap(i => i.tags || []))].sort()

  // Filtered ideas
  const filteredIdeas = ideas.filter(idea => {
    if (filterTag && !idea.tags.includes(filterTag)) return false
    if (filterStage && idea.stage !== filterStage) return false
    return true
  })

  const handleAdd = (name, tags) => {
    addIdea(name)
    // Update tags immediately after add
    setTimeout(() => {
      // addIdea adds to front, so update the first matching new idea
    }, 0)
    // We need to handle tags in addIdea or do a follow-up update
    // Since addIdea doesn't take tags, we'll add tags via a workaround:
    // Actually addIdea adds to front with empty tags — let's update after
    // This will be handled by updating the idea after creation in a callback
    if (tags.length > 0) {
      // We need the new idea's id — use a small hack: update first idea with matching name
      // This is safe since we just added it
      setShowModal(false)
    }
  }

  const handleAddWithTags = (name, tags) => {
    // We'll call addIdea and then update — but we need the id
    // Since ideas state updates asynchronously, we compute the id ourselves
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)
    // Instead, just use addIdea which handles id internally
    // The simplest approach: extend addIdea or just do tags separately
    addIdea(name)
    if (tags.length > 0) {
      // After state updates, the new idea is at ideas[0] (prepended)
      // We'll do a quick timeout to update tags
      requestAnimationFrame(() => {
        setIdeasTagPatch({ name, tags })
      })
    }
    setShowModal(false)
  }

  // Tag patch state for post-add tag assignment
  const [ideasTagPatch, setIdeasTagPatch] = useState(null)

  // Apply tag patch after render
  if (ideasTagPatch) {
    const target = ideas.find(i => i.name === ideasTagPatch.name && (!i.tags || i.tags.length === 0))
    if (target) {
      updateIdea(target.id, { tags: ideasTagPatch.tags })
      setIdeasTagPatch(null)
    }
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    // Determine target stage from over element's data or find idea
    const overIdea = ideas.find(i => i.id === over.id)
    if (overIdea && overIdea.stage !== active.data?.current?.stage) {
      updateIdea(active.id, { stage: overIdea.stage })
    }
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const overIdea = ideas.find(i => i.id === over.id)
    const activeIdea = ideas.find(i => i.id === active.id)

    if (overIdea && activeIdea && overIdea.stage !== activeIdea.stage) {
      // Move card to target column stage
      updateIdea(active.id, { stage: overIdea.stage })
    }
  }

  const activeIdea = activeId ? ideas.find(i => i.id === activeId) : null

  const totalIdeas = ideas.length
  const stageCount = STAGES.reduce((acc, s) => {
    acc[s] = ideas.filter(i => i.stage === s).length
    return acc
  }, {})

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: '#F8F7FF' }}>
      {/* Header */}
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Lightbulb size={18} className="text-[#002C77]" />
            </div>
            <div>
              <h1 className="font-mono text-lg font-bold uppercase tracking-widest" style={{ color: '#002C77' }}>
                Ideas Pipeline
              </h1>
              <p className="text-sm text-gray-800 font-mono mt-0.5">
                {totalIdeas} idea{totalIdeas !== 1 ? 's' : ''} in pipeline
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#002C77] text-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Idea
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <span className="text-sm text-gray-800 font-mono uppercase tracking-wider mr-1">Filter:</span>

          {/* Stage filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setFilterStage('')}
              className={`px-2.5 py-1 text-sm font-mono rounded border transition-colors ${
                !filterStage ? 'bg-gray-100 text-[#002C77] border-gray-200' : 'text-gray-800 border-gray-200 hover:border-gray-200'
              }`}
            >
              All stages
            </button>
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => setFilterStage(filterStage === s ? '' : s)}
                className={`px-2.5 py-1 text-sm font-mono rounded border transition-colors ${
                  filterStage === s ? 'bg-gray-100 text-[#002C77] border-gray-200' : 'text-gray-800 border-gray-200 hover:border-gray-200'
                }`}
              >
                {STAGE_META[s].label} ({stageCount[s]})
              </button>
            ))}
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex gap-1 items-center ml-2 pl-2 border-l border-gray-200">
              <button
                onClick={() => setFilterTag('')}
                className={`px-2.5 py-1 text-sm font-mono rounded border transition-colors ${
                  !filterTag ? 'bg-gray-100 text-[#002C77] border-gray-200' : 'text-gray-800 border-gray-200 hover:border-gray-200'
                }`}
              >
                All tags
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                  className={`px-2.5 py-1 text-sm font-mono rounded border transition-colors ${
                    filterTag === tag ? 'bg-gray-100 text-[#002C77] border-gray-200' : 'text-gray-800 border-gray-200 hover:border-gray-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kanban board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ alignItems: 'flex-start' }}>
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                ideas={filteredIdeas}
                onAdvance={advanceStage}
                onUpdate={updateIdea}
                onDelete={deleteIdea}
              />
            ))}
          </div>

          <DragOverlay>
            {activeIdea ? (
              <IdeaCard
                idea={activeIdea}
                onAdvance={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Empty state (no ideas at all) */}
        {ideas.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              <Lightbulb size={28} className="text-[#002C77]" />
            </div>
            <p className="text-gray-700 font-mono text-sm">No ideas in the pipeline yet.</p>
            <p className="text-gray-800 text-sm">Hit "New Idea" to plant the first seed.</p>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showModal && (
        <AddIdeaModal
          onAdd={handleAddWithTags}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
