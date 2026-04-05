import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Download, Target, Pin, Trash2, Archive } from 'lucide-react'
import usePortfolio from '../hooks/usePortfolio'
import ProjectCard from './ProjectCard'
import CreateProjectModal from './CreateProjectModal'
import ProjectDetail from './ProjectDetail'

const SECTIONS = [
  { id: 'client',        label: 'Client Projects' },
  { id: 'third-horizon', label: 'Third Horizon Projects' },
  { id: 'personal',      label: 'Personal Projects' },
  { id: 'learning',      label: 'Learning Projects' },
]

// Compact inactive row â€” MMA roster style
function InactiveRow({ project, onPin, onNavigate, onUpdate }) {
  const priorityColor = {
    urgent: 'text-red-600', high: 'text-orange-500', medium: 'text-blue-600', low: 'text-gray-400'
  }[project.priority] || 'text-gray-400'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        project.mma_status === 'on_track' || project.status === 'active' ? 'bg-emerald-500' :
        project.mma_status === 'needs_attention' ? 'bg-amber-400' : 'bg-gray-300'
      }`} />
      <span
        className="text-sm font-medium text-[#002C77] flex-1 truncate cursor-pointer hover:text-[#009DE0] transition-colors"
        onClick={() => onNavigate(project.id)}
      >
        {project.name}
      </span>
      <span className={`text-xs font-medium ${priorityColor} hidden sm:block`}>{project.priority}</span>
      {project.mma_accountable && (
        <span className="text-xs text-gray-400 hidden md:block">{project.mma_accountable}</span>
      )}
      <button
        onClick={() => onPin(project.id, false)}
        className="p-1 rounded text-gray-300 hover:text-[#002C77] transition-colors opacity-0 group-hover:opacity-100"
        title="Set as active"
      >
        <Pin size={12} />
      </button>
    </div>
  )
}

export default function PortfolioPage() {
  const { spotlight, roster, archive, createProject, updateProject, deleteProject, pinProject, exportToMarkdown, loading } = usePortfolio()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailProjectId, setDetailProjectId] = useState(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [collapsed, setCollapsed] = useState({})

  const allActive = [...spotlight, ...roster]
  const toggle = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const detailProject = detailProjectId
    ? [...spotlight, ...roster, ...archive].find(p => p.id === detailProjectId)
    : null

  if (detailProject) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ProjectDetail project={detailProject} onUpdate={updateProject} onPin={pinProject} onBack={() => setDetailProjectId(null)} />
      </div>
    )
  }

  const archiveByMonth = archive.reduce((acc, p) => {
    const d = new Date(p.archived_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = { label, projects: [] }
    acc[key].projects.push(p)
    return acc
  }, {})

  const q2 = allActive.filter(p => p.category === 'q2-must')
  const q2Active = q2.filter(p => p.pinned)
  const q2Inactive = q2.filter(p => !p.pinned)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#002C77]">Portfolio</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {allActive.filter(p => p.pinned).length} active &nbsp;Â·&nbsp; {allActive.filter(p => !p.pinned).length} inactive
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToMarkdown}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#002C77] text-white text-sm font-medium hover:bg-[#003D9E] transition-colors"
          >
            <Plus size={14} /> Add Project
          </button>
        </div>
      </div>

      {/* Q2 Must-Be-True */}
      <div className="rounded-xl border-2 border-[#002C77]/20 bg-white shadow-sm">
        <button
          onClick={() => toggle('q2')}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
        >
          <Target size={16} className="text-[#009DE0] shrink-0" />
          <span className="text-sm font-bold text-[#002C77] uppercase tracking-wide flex-1">
            What Must Be True by June 30th
          </span>
          <span className="text-xs text-gray-400">
            {q2Active.length} active Â· {q2Inactive.length} inactive
          </span>
          {collapsed['q2'] ? <ChevronRight size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
        </button>

        {!collapsed['q2'] && (
          <div className="px-5 pb-4">
            {q2Active.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
                {q2Active.map(p => <ProjectCard key={p.id} project={p} onUpdate={updateProject} onPin={pinProject} onNavigate={setDetailProjectId} />)}
              </div>
            )}
            {q2Inactive.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="px-4 py-1.5 border-b border-gray-200">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Inactive</span>
                </div>
                {q2Inactive.map(p => <InactiveRow key={p.id} project={p} onPin={pinProject} onNavigate={setDetailProjectId} onUpdate={updateProject} />)}
              </div>
            )}
            {q2.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">No Q2 commitments yet.</p>
                <button onClick={() => setShowCreateModal(true)} className="mt-2 text-sm text-[#009DE0] hover:underline">+ Add one</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category sections */}
      {SECTIONS.map(section => {
        const sectionProjects = allActive.filter(p => (p.category || 'client') === section.id)
        const active = sectionProjects.filter(p => p.pinned)
        const inactive = sectionProjects.filter(p => !p.pinned)
        const isCollapsed = collapsed[section.id]

        return (
          <div key={section.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
            >
              <span className="text-sm font-bold text-[#002C77] flex-1">{section.label}</span>
              <span className="text-xs text-gray-400">{active.length} active Â· {inactive.length} inactive</span>
              {isCollapsed ? <ChevronRight size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
            </button>

            {!isCollapsed && (
              <div className="px-5 pb-4">
                {active.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
                    {active.map(p => <ProjectCard key={p.id} project={p} onUpdate={updateProject} onPin={pinProject} onNavigate={setDetailProjectId} />)}
                  </div>
                )}
                {inactive.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                    <div className="px-4 py-1.5 border-b border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Inactive</span>
                    </div>
                    {inactive.map(p => <InactiveRow key={p.id} project={p} onPin={pinProject} onNavigate={setDetailProjectId} onUpdate={updateProject} />)}
                  </div>
                )}
                {sectionProjects.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm text-gray-400">No {section.label.toLowerCase()} yet.</p>
                    <button onClick={() => setShowCreateModal(true)} className="mt-2 text-sm text-[#009DE0] hover:underline">+ Add one</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Completed Archive */}
      {archive.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setArchiveOpen(!archiveOpen)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Archive size={14} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-500 flex-1">Completed Archive</span>
            <span className="text-xs text-gray-400">{archive.length} items</span>
            {archiveOpen ? <ChevronDown size={14} className="text-gray-300" /> : <ChevronRight size={14} className="text-gray-300" />}
          </button>
          {archiveOpen && (
            <div className="px-5 pb-4 space-y-3">
              {Object.entries(archiveByMonth).map(([key, { label, projects }]) => (
                <div key={key}>
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</h3>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    {projects.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 group transition-colors">
                        <span className="text-sm text-gray-500 flex-1 truncate">{p.name}</span>
                        <button onClick={() => setDetailProjectId(p.id)} className="text-xs text-gray-400 hover:text-[#009DE0] transition-colors">view</button>
                        <button
                          onClick={() => { if (window.confirm(`Permanently delete "${p.name}"?`)) deleteProject(p.id) }}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
        </div>
      )}

      <CreateProjectModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={createProject} />
    </div>
  )
}
