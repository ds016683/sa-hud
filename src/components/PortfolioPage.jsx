import { useState, useEffect } from 'react'
import { Plus, ChevronDown, ChevronRight, Download, Target, Pin, Trash2 } from 'lucide-react'
import usePortfolio from '../hooks/usePortfolio'
import ProjectCard from './ProjectCard'
import CreateProjectModal from './CreateProjectModal'
import ProjectDetail from './ProjectDetail'

const SECTIONS = [
  { id: 'client', label: 'Client Projects', color: 'bg-white', accent: 'text-blue-800', border: 'border-gray-200', bg: 'bg-white' },
  { id: 'third-horizon', label: 'Third Horizon Projects', color: 'bg-[#002C77]', accent: 'text-[#002C77]', border: 'border-gray-200', bg: 'bg-white' },
  { id: 'personal', label: 'Personal Projects', color: 'bg-[#002C77]', accent: 'text-[#002C77]', border: 'border-gray-200', bg: 'bg-white' },
  { id: 'learning', label: 'Learning Projects', color: 'bg-[#002C77]', accent: 'text-[#002C77]', border: 'border-gray-200', bg: 'bg-white' },
]

const STATUS_COLORS = {
  active: 'bg-[#002C77]',
  needs_attention: 'bg-[#002C77]',
  on_track: 'bg-[#002C77]',
  complete: 'bg-gray-400',
  completed: 'bg-gray-400',
}

// Compact inactive row
function InactiveRow({ project, onPin, onNavigate }) {
  const statusColor = STATUS_COLORS[project.mma_status] || STATUS_COLORS[project.status] || 'bg-gray-400'
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-game-border/50 last:border-0 hover:bg-game-darker/50 transition-colors group">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
      <span
        className="font-game text-sm text-game-text flex-1 truncate cursor-pointer hover:text-game-gold transition-colors"
        onClick={() => onNavigate(project.id)}
      >
        {project.name}
      </span>
      {project.category && (
        <span className="text-[10px] font-mono text-game-text-dim px-2 py-0.5 bg-game-darker rounded border border-game-border/50 hidden sm:block">
          {project.category}
        </span>
      )}
      {project.priority && project.priority !== 'low' && (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded hidden sm:block ${
          project.priority === 'urgent' ? 'text-red-600 bg-red-50' :
          project.priority === 'high' ? 'text-amber-600 bg-white' :
          'text-blue-600 bg-white'
        }`}>
          {project.priority}
        </span>
      )}
      <button
        onClick={() => onPin(project.id, false)}
        className="ml-auto p-1.5 rounded hover:bg-game-darker text-game-text-dim hover:text-game-gold transition-colors opacity-40 group-hover:opacity-100"
        title="Activate this project"
      >
        <Pin size={12} />
      </button>
    </div>
  )
}

const PortfolioPage = ({ sync }) => {
  const { spotlight, roster, archive, createProject, updateProject, deleteProject, pinProject, exportToMarkdown, loading } = usePortfolio()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailProjectId, setDetailProjectId] = useState(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({})

  const allActive = [...spotlight, ...roster]
  const toggleSection = (id) => setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }))

  const detailProject = detailProjectId
    ? [...spotlight, ...roster, ...archive].find(p => p.id === detailProjectId)
    : null

  if (detailProject) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ProjectDetail
          project={detailProject}
          onUpdate={updateProject}
          onPin={pinProject}
          onBack={() => setDetailProjectId(null)}
        />
      </div>
    )
  }

  const archiveByMonth = archive.reduce((acc, project) => {
    const date = new Date(project.archived_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = { label, projects: [] }
    acc[key].projects.push(project)
    return acc
  }, {})

  const q2Projects = allActive.filter(p => p.category === 'q2-must')
  const q2Active = q2Projects.filter(p => p.pinned)
  const q2Inactive = q2Projects.filter(p => !p.pinned)
  const q2Collapsed = collapsedSections['q2-must']

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-game text-lg text-game-text tracking-wider uppercase">Portfolio</h1>
          <p className="text-xs font-mono text-game-text-dim mt-0.5">
            {allActive.filter(p => p.pinned).length} active Â- {allActive.filter(p => !p.pinned).length} inactive
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToMarkdown}
            className="flex items-center gap-2 px-3 py-2 rounded border border-game-border text-game-text-dim text-xs font-mono hover:text-game-gold hover:border-game-gold/30 transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded bg-game-gold/20 border border-game-gold/40 text-game-gold text-xs font-mono hover:bg-game-gold/30 transition-colors"
          >
            <Plus size={14} /> Add Project
          </button>
        </div>
      </div>

      {/* Q2 Must-Be-True */}
      <section className="rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4">
        <button
          onClick={() => toggleSection('q2-must')}
          className="w-full flex items-center gap-3 mb-3 group text-left"
        >
          <Target size={16} className="text-red-600 shrink-0" />
          <h2 className="font-game text-sm text-[#002C77] uppercase tracking-[0.15em] flex-1">
            What Must Be True by June 30th
          </h2>
          <span className="text-xs font-mono text-red-500">
            {q2Active.length} active Â- {q2Inactive.length} inactive
          </span>
          {q2Collapsed ? <ChevronRight size={14} className="text-red-400" /> : <ChevronDown size={14} className="text-red-400" />}
        </button>

        {!q2Collapsed && (
          <>
            {/* Active Q2 cards */}
            {q2Active.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {q2Active.map(project => (
                  <ProjectCard key={project.id} project={project} onUpdate={updateProject} onPin={pinProject} onNavigate={setDetailProjectId} />
                ))}
              </div>
            )}

            {/* Inactive Q2 rows */}
            {q2Inactive.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-1.5 bg-red-100/60 border-b border-red-200">
                  <span className="text-[10px] font-mono text-red-500 uppercase tracking-wider">Inactive</span>
                </div>
                {q2Inactive.map(p => (
                  <InactiveRow key={p.id} project={p} onPin={pinProject} onNavigate={setDetailProjectId} />
                ))}
              </div>
            )}

            {q2Active.length === 0 && q2Inactive.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs font-mono text-red-400">No Q2 commitments yet.</p>
                <button onClick={() => setShowCreateModal(true)} className="mt-2 text-xs font-mono text-red-600 hover:underline">+ Add one</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Four category sections */}
      {SECTIONS.map(section => {
        const sectionProjects = allActive.filter(p => (p.category || 'client') === section.id)
        const active = sectionProjects.filter(p => p.pinned)
        const inactive = sectionProjects.filter(p => !p.pinned)
        const isCollapsed = collapsedSections[section.id]

        return (
          <section key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-3 mb-3 group text-left"
            >
              <span className={`w-2 h-2 rounded-full ${section.color} shrink-0`} />
              <h2 className={`font-game text-sm ${section.accent} uppercase tracking-[0.15em] flex-1`}>
                {section.label}
              </h2>
              <span className="text-xs font-mono text-game-text-dim">
                {active.length} active Â- {inactive.length} inactive
              </span>
              {isCollapsed
                ? <ChevronRight size={14} className="text-game-text-dim" />
                : <ChevronDown size={14} className="text-game-text-dim" />
              }
            </button>

            {!isCollapsed && (
              <>
                {/* Active (pinned) full cards */}
                {active.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {active.map(project => (
                      <ProjectCard key={project.id} project={project} onUpdate={updateProject} onPin={pinProject} onNavigate={setDetailProjectId} />
                    ))}
                  </div>
                )}

                {/* Inactive compact rows */}
                {inactive.length > 0 && (
                  <div className={`rounded-lg border border-gray-200 bg-white overflow-hidden`}>
                    <div className={`px-4 py-1.5 ${section.bg} border-b ${section.border}`}>
                      <span className={`text-[10px] font-mono ${section.accent} uppercase tracking-wider opacity-70`}>Inactive</span>
                    </div>
                    {inactive.map(p => (
                      <InactiveRow key={p.id} project={p} onPin={pinProject} onNavigate={setDetailProjectId} />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {sectionProjects.length === 0 && (
                  <div className={`rounded-lg border border-dashed ${section.border} ${section.bg} px-4 py-6 text-center`}>
                    <p className="text-xs font-mono text-game-text-dim">No {section.label.toLowerCase()} yet.</p>
                    <button onClick={() => setShowCreateModal(true)} className={`mt-2 text-xs font-mono ${section.accent} hover:underline`}>+ Add one</button>
                  </div>
                )}
              </>
            )}
          </section>
        )
      })}

      {/* Completed Archive */}
      {archive.length > 0 && (
        <section>
          <button
            onClick={() => setArchiveOpen(!archiveOpen)}
            className="font-game text-xs text-game-text-dim uppercase tracking-[0.2em] mb-3 flex items-center gap-2 hover:text-game-text-muted transition-colors"
          >
            {archiveOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Completed Archive ({archive.length})
          </button>
          {archiveOpen && (
            <div className="space-y-4">
              {Object.entries(archiveByMonth).map(([key, { label, projects }]) => (
                <div key={key}>
                  <h3 className="text-[10px] font-mono text-game-text-dim uppercase tracking-wider mb-2">{label}</h3>
                  <div className="bg-game-panel/20 border border-game-border/30 rounded-lg overflow-hidden">
                    {projects.map(project => (
                      <div key={project.id} className="flex items-center gap-3 px-3 py-2 border-b border-game-border/20 last:border-0 opacity-50 hover:opacity-70 group transition-opacity">
                        <span className="font-game text-sm text-game-text-muted flex-1 truncate">{project.name}</span>
                        <span className="text-[10px] font-mono text-game-text-dim hidden sm:block">{project.category}</span>
                        <button onClick={() => setDetailProjectId(project.id)} className="text-game-text-dim hover:text-game-gold text-[10px] font-mono transition-colors">view</button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Permanently delete "${project.name}"? This cannot be undone.`)) {
                              deleteProject(project.id)
                            }
                          }}
                          className="text-game-text-dim hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                          title="Permanently delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <CreateProjectModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={createProject} />
    </div>
  )
}

export default PortfolioPage
