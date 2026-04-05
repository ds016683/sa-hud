import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pin, ArrowUpRight } from 'lucide-react'
import InlineName from './InlineName'
import { getFreshnessTier } from '../hooks/usePortfolio'

const PRIORITY_CYCLE = ['low', 'medium', 'high', 'urgent']
const PRIORITY_COLORS = {
  low: 'text-gray-500 bg-gray-50 border-gray-200',
  medium: 'text-blue-700 bg-blue-50 border-blue-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  urgent: 'text-red-600 bg-red-50 border-red-200',
}
const FRESHNESS_COLORS = {
  fresh: 'bg-game-green',
  warning: 'bg-yellow-500',
  stale: 'bg-game-text-dim',
}
const STATUS_LABELS = {
  active: null,
  pencils_down: 'pencils down',
  on_hold: 'on hold',
}

const ProjectCard = ({ project, onUpdate, onPin, onNavigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const freshness = getFreshnessTier(project.last_activity_at)
  const isPencilsDown = project.status === 'pencils_down'

  const cyclePriority = () => {
    const idx = PRIORITY_CYCLE.indexOf(project.priority)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    onUpdate(project.id, { priority: next })
  }

  const daysUntilDeadline = project.target_date
    ? Math.ceil((new Date(project.target_date).getTime() - Date.now()) / 86_400_000)
    : null

  const cardOpacity = isPencilsDown ? 'opacity-35 grayscale' :
    freshness === 'warning' ? 'opacity-80' :
    freshness === 'stale' ? 'opacity-45 grayscale-[0.8]' : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-game-panel border border-game-border rounded-lg p-4 min-h-[160px] flex flex-col
        ${isDragging ? 'shadow-lg shadow-game-gold/20 ring-1 ring-game-gold/40 z-50' : ''}
        ${cardOpacity}
        transition-all duration-200`}
    >
      {/* Header: drag handle + freshness dot + name */}
      <div className="flex items-center gap-2 mb-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-game-text-dim hover:text-game-gold transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${FRESHNESS_COLORS[freshness]}`} />
        <span className="font-game text-sm text-game-text truncate flex-1">
          <InlineName
            name={project.name}
            onRename={(name) => onUpdate(project.id, { name })}
          />
        </span>
        {project.pinned && (
          <Pin size={12} className="text-game-gold fill-game-gold flex-shrink-0" />
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {project.category && (
          <span className="text-[10px] px-2 py-0.5 rounded border border-game-blue/30 text-game-blue font-mono uppercase tracking-wider">
            {project.category}
          </span>
        )}
        <button
          onClick={cyclePriority}
          className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider hover:brightness-125 transition-all ${PRIORITY_COLORS[project.priority]}`}
          title="Click to cycle priority"
        >
          {project.priority}
        </button>
        {isPencilsDown && (
          <span className="text-[10px] px-2 py-0.5 rounded border border-game-text-dim/30 text-game-text-dim font-mono uppercase tracking-wider">
            pencils down
          </span>
        )}
        {project.tags?.map(tag => (
          <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-[#002C77] border border-gray-200 font-sans">
            {tag}
          </span>
        ))}
      </div>

      {/* Deadline */}
      {daysUntilDeadline !== null && (
        <div className="text-[10px] font-mono text-game-text-muted mb-3">
          <span className={daysUntilDeadline < 0 ? 'text-game-red' : daysUntilDeadline <= 3 ? 'text-game-gold' : ''}>
            {daysUntilDeadline < 0 ? `overdue ${Math.abs(daysUntilDeadline)}d` : `due in ${daysUntilDeadline}d`}
          </span>
        </div>
      )}

      {/* Spacer to push actions to bottom */}
      <div className="flex-1" />

      {/* Actions — always visible, wrapping */}
      <div className="flex flex-wrap gap-1 pt-2 border-t border-game-border/30">
<CardAction onClick={() => onUpdate(project.id, { status: 'archived' })}>
          Archive
        </CardAction>
        <div className="flex-1" />
        <CardAction onClick={() => onPin(project.id)} title={project.pinned ? 'Unpin' : 'Pin as focus'}>
          <Pin size={10} className={project.pinned ? 'fill-current' : ''} />
        </CardAction>
        <CardAction onClick={() => onNavigate(project.id)} title="View details">
          <ArrowUpRight size={10} />
        </CardAction>
      </div>
    </div>
  )
}

const CardAction = ({ onClick, children, title }) => (
  <button
    onClick={onClick}
    title={title}
    className="px-1.5 py-0.5 rounded border border-game-border text-game-text-dim hover:text-game-gold hover:border-game-gold/30 transition-colors"
  >
    {children}
  </button>
)

export default ProjectCard
