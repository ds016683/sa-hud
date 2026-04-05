import { useState, useEffect } from 'react'
import { Plus, ChevronDown, ChevronRight, Download, Target } from 'lucide-react'
import usePortfolio from '../hooks/usePortfolio'
import ProjectCard from './ProjectCard'
import CreateProjectModal from './CreateProjectModal'
import ProjectDetail from './ProjectDetail'

const SECTIONS = [
  {
    id: 'client',
    label: 'Client Projects',
    color: 'bg-violet-500',
    accent: 'text-violet-700',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
  },
  {
    id: 'third-horizon',
    label: 'Third Horizon Projects',
    color: 'bg-blue-500',
    accent: 'text-blue-700',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
  },
  {
    id: 'personal',
    label: 'Personal Projects',
    color: 'bg-emerald-500',
    accent: 'text-emerald-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
  },
  {
    id: 'learning',
    label: 'Learning Projects',
    color: 'bg-amber-500',
    accent: 'text-amber-700',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
  },
]

const PortfolioPage = ({ sync }) => {
  const {
    spotlight,
    roster,
    archive,
    createProject,
    updateProject,
    deleteProject,
    pinProject,
    exportToMarkdown,
    hydrateFromRemote,
  } = usePortfolio()

  useEffect(() => {
    if (sync?.remoteData?.portfolio) {
      hydrateFromRemote(sync.remoteData.portfolio)
    }
  }, [sync?.remoteData, hydrateFromRemote])

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
  const q2Collapsed = collapsedSections['q2-must']

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-game text-lg text-game-text tracking-wider uppercase">Portfolio</h1>
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

      {/* Q2 Must-Be-True â€” distinct pinned priority block */}
      <section className="rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4">
        <button
          onClick={() => toggleSection('q2-must')}
          className="w-full flex items-center gap-3 mb-3 group text-left"
        >
          <Target size={16} className="text-red-600 shrink-0" />
          <h2 className="font-game text-sm text-red-700 uppercase tracking-[0.15em] flex-1">
            What Must Be True by June 30th
          </h2>
          <span className="text-xs font-mono text-red-500">
            {q2Projects.length} commitment{q2Projects.length !== 1 ? 's' : ''}
          </span>
          {q2Collapsed
            ? <ChevronRight size={14} className="text-red-400" />
            : <ChevronDown size={14} className="text-red-400" />
          }
        </button>
        {!q2Collapsed && (
          q2Projects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs font-mono text-red-400">No Q2 commitments defined yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-xs font-mono text-red-600 hover:underline"
              >
                + Add a commitment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {q2Projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onUpdate={updateProject}
                  onPin={pinProject}
                  onNavigate={setDetailProjectId}
                />
              ))}
            </div>
          )
        )}
      </section>

      {/* Four category sections */}
      {SECTIONS.map(section => {
        const projects = allActive.filter(p => (p.category || 'client') === section.id)
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
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
              {isCollapsed
                ? <ChevronRight size={14} className="text-game-text-dim group-hover:text-game-text-muted" />
                : <ChevronDown size={14} className="text-game-text-dim group-hover:text-game-text-muted" />
              }
            </button>

            {!isCollapsed && (
              projects.length === 0 ? (
                <div className={`rounded-lg border border-dashed ${section.border} ${section.bg} px-4 py-6 text-center`}>
                  <p className="text-xs font-mono text-game-text-dim">No {section.label.toLowerCase()} yet.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className={`mt-2 text-xs font-mono ${section.accent} hover:underline transition-colors`}
                  >
                    + Add one
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onUpdate={updateProject}
                      onPin={pinProject}
                      onNavigate={setDetailProjectId}
                    />
                  ))}
                </div>
              )
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
            Completed Archive
            <span>({archive.length})</span>
          </button>
          {archiveOpen && (
            <div className="space-y-4">
              {Object.entries(archiveByMonth).map(([key, { label, projects }]) => (
                <div key={key}>
                  <h3 className="text-[10px] font-mono text-game-text-dim uppercase tracking-wider mb-2">{label}</h3>
                  <div className="bg-game-panel/20 border border-game-border/30 rounded-lg overflow-hidden">
                    {projects.map(project => (
                      <div
                        key={project.id}
                        className="flex items-center gap-3 px-3 py-2 border-b border-game-border/20 last:border-0 opacity-50"
                      >
                        <span className="font-game text-sm text-game-text-muted flex-1 truncate">{project.name}</span>
                        {project.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded border border-game-border/30 text-game-text-dim font-mono">
                            {project.category}
                          </span>
                        )}
                        <button
                          onClick={() => setDetailProjectId(project.id)}
                          className="text-game-text-dim hover:text-game-gold text-[10px] font-mono transition-colors"
                        >
                          view
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

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createProject}
      />
    </div>
  )
}

export default PortfolioPage
