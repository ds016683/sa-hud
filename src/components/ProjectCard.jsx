import { useState } from 'react'
import { Pin, ArrowUpRight, Archive, GripVertical, ChevronDown, MoreHorizontal, Trash2 } from 'lucide-react'
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

export default function ProjectCard({ project, onUpdate, onPin, onNavigate, archiveProject, deleteProject }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
                <span className="text-amber-500 text-xs flex-shrink-0" title="Active focus project">&#9733;</span>
              )}
              <h3 className="text-sm font-semibold leading-tight text-[#002C77] truncate">
                <InlineName name={project.name} onRename={(name) => onUpdate(project.id, { name })} />
              </h3>
            </div>
            {/* Actions — show on hover */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onPin(project.id) }}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                style={{ color: project.pinned ? "#F59E0B" : "#CBD8E8" }}
                title={project.pinned ? "Deactivate (move to inactive)" : "Activate (pin to top)"}
              >
                <Pin size={12} className={project.pinned ? 'fill-current text-amber-500' : ''} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(project.id) }}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#009DE0] transition-colors"
                title="View details"
              >
                <ArrowUpRight size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(x => !x) }}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                <ChevronDown size={12} className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {/* Three-dot menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(x => !x) }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="More options"
                >
                  <MoreHorizontal size={12} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] py-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); archiveProject(project.id) }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Archive size={12} /> Archive
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (window.confirm(`Permanently delete "${project.name}"?`)) deleteProject(project.id) }}
                        className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
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

          {/* Description — full when expanded, clipped when collapsed */}
          {project.description && (
            <p className={`text-xs text-gray-500 leading-relaxed mb-3 ${expanded ? '' : 'line-clamp-2'}`}>
              {project.description}
            </p>
          )}

          {/* Expanded: task checklist */}
          {expanded && totalTasks > 0 && (
            <ul className="mb-3 space-y-1">
              {(project.tasks || []).map(t => (
                <li key={t.id || t.text} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>
                    {t.done ? '✓' : ''}
                  </span>
                  <span className={t.done ? 'line-through text-gray-400' : ''}>{t.text}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Footer — tasks progress + deadline */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
            <span>
              {totalTasks > 0
                ? `${completedTasks}/${totalTasks} tasks`
                : project.mma_accountable || '\u2014'
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
