import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Projects layer hook (8/29/2026). Schema-aware replacement for the legacy
// usePortfolio task path: project_tasks now carries status/source/session_ref/
// notes/objective_id/released_at, so tasks are mutated row-by-row, never
// delete-and-reinsert (which would clobber agent-written columns).

const BUCKET = 'project-files'

export function freshnessOf(lastActivityAt) {
  if (!lastActivityAt) return 'stale'
  const daysSince = (Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000
  if (daysSince <= 7) return 'fresh'
  if (daysSince <= 14) return 'warning'
  return 'stale'
}

export default function useProjects() {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [boards, setBoards] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true) })
    const sub = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s))
    return () => sub.data.subscription.unsubscribe()
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [p, b] = await Promise.all([
        supabase
          .from('projects')
          .select('*, tasks:project_tasks(id,text,status,done,source,session_ref,due_date,notes,objective_id,released_at,created_at)')
          .eq('user_id', session.user.id)
          .order('name', { ascending: true }),
        supabase.from('session_boards').select('project,title,phases,updated_at'),
      ])
      if (!p.error) setProjects(p.data || [])
      if (!b.error) setBoards(b.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (ready) fetchAll() }, [ready, fetchAll])

  const patchLocal = useCallback((projectId, fn) => {
    setProjects(prev => prev.map(p => p.id === projectId ? fn(p) : p))
  }, [])

  const touchProject = useCallback(async (projectId) => {
    const now = new Date().toISOString()
    await supabase.from('projects').update({ last_activity_at: now }).eq('id', projectId)
    patchLocal(projectId, p => ({ ...p, last_activity_at: now }))
  }, [patchLocal])

  const updateProject = useCallback(async (projectId, patch) => {
    const row = { ...patch, last_activity_at: new Date().toISOString() }
    if (patch.status === 'archived') row.archived_at = new Date().toISOString()
    const { error } = await supabase.from('projects').update(row).eq('id', projectId)
    if (error) { console.error('updateProject:', error); return false }
    patchLocal(projectId, p => ({ ...p, ...row }))
    return true
  }, [patchLocal])

  const createProject = useCallback(async ({ name, category = 'client', kind = 'standing' }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const now = new Date().toISOString()
    const { data, error } = await supabase.from('projects').insert({
      user_id: session.user.id, name, category, kind,
      status: 'active', priority: 'medium', pinned: false, last_activity_at: now,
    }).select('*, tasks:project_tasks(id,text,status,done,source,session_ref,due_date,notes,objective_id,released_at,created_at)').single()
    if (error) { console.error('createProject:', error); return null }
    setProjects(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }, [])

  // ---- tasks (row-level, never bulk-replace)
  const addTask = useCallback(async (projectId, text) => {
    const { data, error } = await supabase.from('project_tasks').insert({
      project_id: projectId, text, status: 'open', done: false, source: 'manual',
    }).select().single()
    if (error) { console.error('addTask:', error); return null }
    patchLocal(projectId, p => ({ ...p, tasks: [...(p.tasks || []), data] }))
    touchProject(projectId)
    return data
  }, [patchLocal, touchProject])

  const updateTask = useCallback(async (projectId, taskId, patch) => {
    const { data, error } = await supabase.from('project_tasks').update(patch).eq('id', taskId).select().single()
    if (error) { console.error('updateTask:', error); return null }
    patchLocal(projectId, p => ({ ...p, tasks: (p.tasks || []).map(t => t.id === taskId ? data : t) }))
    touchProject(projectId)
    return data
  }, [patchLocal, touchProject])

  const toggleTask = useCallback((projectId, task) => {
    const nowDone = !(task.status === 'done' || task.done)
    return updateTask(projectId, task.id, nowDone
      ? { status: 'done', done: true, released_at: new Date().toISOString() }
      : { status: 'open', done: false, released_at: null })
  }, [updateTask])

  const deleteTask = useCallback(async (projectId, taskId) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId)
    if (error) { console.error('deleteTask:', error); return }
    patchLocal(projectId, p => ({ ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId) }))
  }, [patchLocal])

  // ---- the promote bridge: project task -> objective in the Queue (parked).
  // The link lives one-way on project_tasks.objective_id (objectives.parent_id is
  // FK-locked to objectives itself). Releasing the objective as done auto-completes
  // the task via that link (useObjectives.closeBridgedTask).
  const promoteTask = useCallback(async (project, task) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const { data: obj, error } = await supabase.from('objectives').insert({
      user_id: session.user.id,
      title: (task.text || '').slice(0, 120),
      state: 'parked', kind: 'execution', effort: 2, importance: 2, needs_sizing: true,
      description: `Promoted from project: ${project.name}`,
    }).select().single()
    if (error) { console.error('promoteTask objective insert:', error); return null }
    await updateTask(project.id, task.id, { objective_id: obj.id, status: task.status === 'blocked' ? 'blocked' : 'promoted' })
    return obj
  }, [updateTask])

  // ---- files (Supabase Storage, one root folder per project id)
  const listFiles = useCallback(async (projectId, subpath = '') => {
    const path = subpath ? `${projectId}/${subpath}` : `${projectId}`
    const { data, error } = await supabase.storage.from(BUCKET).list(path, {
      limit: 200, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) { console.error('listFiles:', error); return [] }
    return (data || []).filter(e => e.name !== '.keep')
  }, [])

  const uploadFile = useCallback(async (projectId, subpath, file) => {
    const path = [projectId, subpath, file.name].filter(Boolean).join('/')
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (error) { console.error('uploadFile:', error); return false }
    touchProject(projectId)
    return true
  }, [touchProject])

  const createFolder = useCallback(async (projectId, subpath, name) => {
    const path = [projectId, subpath, name, '.keep'].filter(Boolean).join('/')
    const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob(['']), { upsert: true })
    if (error) { console.error('createFolder:', error); return false }
    return true
  }, [])

  const fileUrl = useCallback(async (projectId, subpath, name) => {
    const path = [projectId, subpath, name].filter(Boolean).join('/')
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (error) { console.error('fileUrl:', error); return null }
    return data?.signedUrl || null
  }, [])

  const deleteFile = useCallback(async (projectId, subpath, name) => {
    const path = [projectId, subpath, name].filter(Boolean).join('/')
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) { console.error('deleteFile:', error); return false }
    return true
  }, [])

  return {
    loading, projects, boards, refresh: fetchAll,
    createProject, updateProject,
    addTask, updateTask, toggleTask, deleteTask, promoteTask,
    listFiles, uploadFile, createFolder, fileUrl, deleteFile,
  }
}
