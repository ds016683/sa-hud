import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SPOTLIGHT_CAP = 8

// Freshness tiers based on last_activity_at
export function getFreshnessTier(lastActivityAt) {
  if (!lastActivityAt) return 'stale'
  const daysSince = (Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000
  if (daysSince <= 7) return 'fresh'
  if (daysSince <= 14) return 'warning'
  return 'stale'
}

// Effort score for ranking
function getEffortScore(project) {
  if (project.status === 'pencils_down') return 0
  const freshness = getFreshnessTier(project.last_activity_at)
  let score = freshness === 'fresh' ? 10 : freshness === 'warning' ? 4 : 0
  if (project.pinned) score += 20
  if (project.target_date) {
    score += 5
    const daysUntil = (new Date(project.target_date).getTime() - Date.now()) / 86_400_000
    if (daysUntil < 0) score += 10
  }
  return score
}

// Partition into spotlight / roster / archive
function partitionProjects(projects) {
  const active = projects.filter(p => p.status !== 'archived' && !p.archived_at)
  const archived = projects.filter(p => p.status === 'archived' || p.archived_at)
    .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at))
    .slice(0, 50)

  const manual = active
    .filter(p => p.manual_rank != null)
    .sort((a, b) => a.manual_rank - b.manual_rank)

  const auto = active
    .filter(p => p.manual_rank == null && p.status !== 'on_hold')
    .map(p => ({ ...p, _effort: getEffortScore(p) }))
    .sort((a, b) => {
      if (b._effort !== a._effort) return b._effort - a._effort
      return new Date(b.last_activity_at) - new Date(a.last_activity_at)
    })

  const onHold = active.filter(p => p.status === 'on_hold' && p.manual_rank == null)

  const spotlightAuto = auto.slice(0, Math.max(0, SPOTLIGHT_CAP - manual.length))
  const rosterAuto = auto.slice(Math.max(0, SPOTLIGHT_CAP - manual.length))

  const spotlight = [...manual, ...spotlightAuto]
  const roster = [...rosterAuto, ...onHold]

  return { spotlight, roster, archive: archived }
}

export default function usePortfolio() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAllProjects = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      // Fetch projects with all sub-tables
      const { data: projectRows, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks:project_tasks(*),
          notes:project_notes(*),
          links:project_links(*),
          people:project_people(*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      // Normalize tags - Supabase may return as string or array
      const normalized = (projectRows || []).map(p => ({
        ...p,
        tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : []),
        tasks: p.tasks || [],
        notes: p.notes || [],
        links: p.links || [],
        people: p.people || [],
      }))

      if (error) { console.error('fetchAllProjects error:', error); return }
      setProjects(normalized)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllProjects()
  }, [fetchAllProjects])

  const createProject = useCallback(async ({ name, category, priority = 'medium', target_date = null, tags = [] }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: session.user.id,
        name,
        category,
        priority,
        status: 'active',
        pinned: false,
        manual_rank: null,
        last_activity_at: now,
        created_at: now,
        target_date,
        tags,
      })
      .select()
      .single()

    // Normalize tags - Supabase may return as string or array
      const normalized = (projectRows || []).map(p => ({
        ...p,
        tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : []),
        tasks: p.tasks || [],
        notes: p.notes || [],
        links: p.links || [],
        people: p.people || [],
      }))

      if (error) { console.error('createProject error:', error); return null }

    const newProject = { ...data, tasks: [], notes: [], links: [], people: [] }
    setProjects(prev => [newProject, ...prev])
    return newProject
  }, [])

  const updateProject = useCallback(async (id, updates) => {
    const now = new Date().toISOString()

    // Handle sub-table arrays separately
    const { tasks, notes, links, people, ...projectUpdates } = updates

    // Always touch last_activity_at
    const projectRow = { ...projectUpdates, last_activity_at: now }
    if (updates.status === 'archived') {
      projectRow.archived_at = now
    }

    const { error } = await supabase
      .from('projects')
      .update(projectRow)
      .eq('id', id)

    // Normalize tags - Supabase may return as string or array
      const normalized = (projectRows || []).map(p => ({
        ...p,
        tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : []),
        tasks: p.tasks || [],
        notes: p.notes || [],
        links: p.links || [],
        people: p.people || [],
      }))

      if (error) { console.error('updateProject error:', error); return }

    // Handle tasks replacement if provided
    if (tasks !== undefined) {
      // Delete all existing tasks, re-insert
      await supabase.from('project_tasks').delete().eq('project_id', id)
      if (tasks.length > 0) {
        await supabase.from('project_tasks').insert(
          tasks.map(t => ({ id: t.id, project_id: id, text: t.text, done: t.done, created_at: t.created_at }))
        )
      }
    }

    // Handle notes replacement if provided
    if (notes !== undefined) {
      await supabase.from('project_notes').delete().eq('project_id', id)
      if (notes.length > 0) {
        await supabase.from('project_notes').insert(
          notes.map(n => ({ id: n.id, project_id: id, text: n.text, created_at: n.created_at }))
        )
      }
    }

    // Handle links replacement if provided
    if (links !== undefined) {
      await supabase.from('project_links').delete().eq('project_id', id)
      if (links.length > 0) {
        await supabase.from('project_links').insert(
          links.map(l => ({ id: l.id, project_id: id, url: l.url, label: l.label || '', created_at: l.created_at }))
        )
      }
    }

    // Refresh local state
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p
      const updated = { ...p, ...projectRow }
      if (tasks !== undefined) updated.tasks = tasks
      if (notes !== undefined) updated.notes = notes
      if (links !== undefined) updated.links = links
      return updated
    }))
  }, [])

  const deleteProject = useCallback(async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    // Normalize tags - Supabase may return as string or array
      const normalized = (projectRows || []).map(p => ({
        ...p,
        tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : []),
        tasks: p.tasks || [],
        notes: p.notes || [],
        links: p.links || [],
        people: p.people || [],
      }))

      if (error) { console.error('deleteProject error:', error); return }
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  const pinProject = useCallback(async (id) => {
    const project = projects.find(p => p.id === id)
    if (!project) return
    const newPinned = !project.pinned
    await supabase.from('projects').update({ pinned: newPinned, last_activity_at: new Date().toISOString() }).eq('id', id)
    setProjects(prev => prev.map(p => ({
      ...p,
      pinned: p.id === id ? newPinned : false,
      last_activity_at: p.id === id ? new Date().toISOString() : p.last_activity_at
    })))
  }, [projects])

  const reorderSpotlight = useCallback(async (orderedIds) => {
    const updates = orderedIds.map((id, index) => ({ id, manual_rank: index + 1 }))
    for (const u of updates) {
      await supabase.from('projects').update({ manual_rank: u.manual_rank }).eq('id', u.id)
    }
    setProjects(prev => {
      const updated = [...prev]
      orderedIds.forEach((id, index) => {
        const idx = updated.findIndex(p => p.id === id)
        if (idx !== -1) updated[idx] = { ...updated[idx], manual_rank: index + 1 }
      })
      return updated
    })
  }, [])

  const exportToMarkdown = useCallback(() => {
    const { spotlight, roster, archive } = partitionProjects(projects)
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const lines = [`# Portfolio Export`, `> ${date}`, '']

    const renderProject = (p) => {
      const freshness = getFreshnessTier(p.last_activity_at)
      const tasks = p.tasks || []
      const notes = p.notes || []
      const links = p.links || []
      const done = tasks.filter(t => t.done).length
      const total = tasks.length

      lines.push(`### ${p.name}`)
      lines.push('')

      const meta = []
      if (p.category) meta.push(`**Category:** ${p.category}`)
      meta.push(`**Priority:** ${p.priority}`)
      meta.push(`**Status:** ${p.status.replace('_', ' ')}`)
      meta.push(`**Freshness:** ${freshness}`)
      if (p.pinned) meta.push(`**Pinned**`)
      if (p.target_date) {
        const days = Math.ceil((new Date(p.target_date).getTime() - Date.now()) / 86_400_000)
        meta.push(`**Deadline:** ${p.target_date} (${days < 0 ? `overdue ${Math.abs(days)}d` : `${days}d remaining`})`)
      }
      if (p.tags?.length) meta.push(`**Tags:** ${p.tags.join(', ')}`)
      lines.push(meta.join(' | '))
      lines.push('')

      if (links.length > 0) {
        lines.push('**Links:**')
        links.forEach(l => lines.push(`- [${l.label}](${l.url})`))
        lines.push('')
      }

      if (total > 0) {
        lines.push(`**Tasks** (${done}/${total}):`)
        tasks.forEach(t => lines.push(`- [${t.done ? 'x' : ' '}] ${t.text}`))
        lines.push('')
      }

      if (notes.length > 0) {
        lines.push('**Notes:**')
        notes.forEach(n => {
          const ts = new Date(n.created_at).toLocaleDateString()
          lines.push(`- _${ts}_ - ${n.text}`)
        })
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    if (spotlight.length > 0) { lines.push('## Spotlight'); lines.push(''); spotlight.forEach(renderProject) }
    if (roster.length > 0) { lines.push('## Roster'); lines.push(''); roster.forEach(renderProject) }
    if (archive.length > 0) {
      lines.push('## Archive'); lines.push('')
      archive.forEach(p => {
        lines.push(`- **${p.name}** - ${p.category || ''} - archived ${new Date(p.archived_at).toLocaleDateString()}`)
      })
      lines.push('')
    }

    const md = lines.join('\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [projects])

  const { spotlight, roster, archive } = partitionProjects(projects)

  return {
    projects,
    spotlight,
    roster,
    archive,
    loading,
    createProject,
    updateProject,
    deleteProject,
    pinProject,
    reorderSpotlight,
    exportToMarkdown,
  }
}