import { Pin, ArrowUpRight, Archive, GripVertical, ChevronDown } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import InlineName from './InlineName'
import { getFreshnessTier } from '../hooks/usePortfolio'

const PRIORITY_STYLES = {
  low:    'bg-gray-100 text-gray-500 border-gray-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high:   'bg-orange-50 text-orange-600 border-orange-200',
  urgent: 'bg-red-50 text-red-600 border-red-200',
}

const FRESHNESS_COLORS = {
  fresh:   'bg-emerald-500',
  warning: 'bg-amber-400',
  stale:   'bg-gray-300',
}

const STATUS_STYLES = {
  on_track:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  needs_attention:'bg-amber-50 text-amber-700 border-amber-200',
  complete:       'bg-gray-100 text-gray-500 border-gray-200',
  active:         'bg-blue-50 text-blue-700 border-blue-200',
}

export default function ProjectCard({ project, onUpdate, onPin, onNavigate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const freshness = getFreshnessTier(project.last_activity_at)
  const daysUntil = project.target_date
    ? Math.ceil((new Date(project.target_date).getTime() - Date.now()) / 86_400_000)
    : null

  const completedTasks = (project.tasks || []).filter(t => t.done).length
  const totalTasks = (project.tasks || []).length

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200"
    >
      {/* Drag handle + header */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing touch-none"
        >
          <GripVertical size={14} />
        </button>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${FRESHNESS_COLORS[freshness]}`} />
              {project.pinned && (
                <span className="text-amber-500 text-xs flex-shrink-0" title="Active focus project">â˜…</span>
              )}
              <h3 className="text-sm font-semibold leading-tight text-[#002C77] truncate">
                <InlineName name={project.name} onRename={(name) => onUpdate(project.id, { name })} />
              </h3>
            </div>
            {/* Actions â€” show on hover */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onPin(project.id)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                style={{ color: project.pinned ? "#F59E0B" : "#CBD8E8" }}
                title={project.pinned ? "Deactivate (move to inactive)" : "Activate (pin to top)"}
              >
                <Pin size={12} className={project.pinned ? 'fill-current text-amber-500' : ''} />
              </button>
              <button
                onClick={() => onNavigate(project.id)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#009DE0] transition-colors"
                title="View details"
              >
                <ArrowUpRight size={12} />
              </button>
              <button
                onClick={() => { if (window.confirm(`Archive "${project.name}"?`)) onUpdate(project.id, { status: 'archived' }) }}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                title="Archive"
              >
                <Archive size={12} />
              </button>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.priority && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.medium}`}>
                {project.priority}
              </span>
            )}
            {project.mma_status && project.mma_status !== 'active' && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[project.mma_status] || STATUS_STYLES.active}`}>
                {project.mma_status.replace('_', ' ')}
              </span>
            )}
            {(project.tags || []).slice(0, 3).map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {tag}
              </span>
            ))}
          </div>

          {/* Description preview */}
          {project.description && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
              {project.description}
            </p>
          )}

          {/* Footer â€” tasks progress + deadline */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
            <span>
              {totalTasks > 0
                ? `${completedTasks}/${totalTasks} tasks`
                : project.mma_accountable || 'â€”'
              }
            </span>
            {daysUntil !== null && (
              <span className={daysUntil < 0 ? 'text-red-500' : daysUntil <= 7 ? 'text-orange-500' : 'text-gray-400'}>
                {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d left`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
