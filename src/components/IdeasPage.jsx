import { useState } from 'react'
import { Plus, X, ChevronRight, Trash2 } from 'lucide-react'
import useIdeas from '../hooks/useIdeas'
import { BLUE, GRAY, INK, INK2, NAVY_DEEP, PANEL_BG, PANEL_BORDER, RED } from './river/canon'

const STAGES = ['ideation', 'concept', 'attunement', 'disposition', 'completion']

const STAGE_META = {
  ideation:   { label: 'Ideation',    color: INK, count_color: INK2 },
  concept:    { label: 'Concept',     color: INK, count_color: INK2 },
  attunement: { label: 'Attunement',  color: INK, count_color: INK2 },
  disposition:{ label: 'Disposition', color: INK, count_color: INK2 },
  completion: { label: 'Completion',  color: INK, count_color: INK2 },
}

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'inherit' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  h1: { fontSize: 20, fontWeight: 700, color: INK, margin: 0 },
  sub: { fontSize: 13, color: INK2, margin: '2px 0 0' },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: BLUE, color: NAVY_DEEP, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  filterBtn: (active) => ({ padding: '4px 12px', borderRadius: 9999, border: '1px solid', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400, background: active ? INK : NAVY_DEEP, color: active ? NAVY_DEEP : INK2, borderColor: active ? INK : PANEL_BORDER, transition: 'all 0.15s' }),
  kanban: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'start' },
  col: { background: PANEL_BG, borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, overflow: 'hidden' },
  colHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${PANEL_BORDER}` },
  colLabel: { fontSize: 11, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'inherit' },
  colCount: { fontSize: 13, fontWeight: 700, color: INK2, fontFamily: 'inherit' },
  colBody: { padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 },
  card: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', boxShadow: 'none', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' },
  cardTitle: { fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6, lineHeight: 1.4, fontFamily: 'inherit', wordBreak: 'break-word' },
  cardDesc: { fontSize: 12, color: INK2, lineHeight: 1.5, marginBottom: 6, fontFamily: 'inherit', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: { fontSize: 10, padding: '2px 6px', borderRadius: 4, background: PANEL_BG, color: INK2, border: `1px solid ${PANEL_BORDER}`, fontFamily: 'inherit', whiteSpace: 'nowrap', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' },
  advBtn: { marginTop: 8, width: '100%', padding: '5px 0', background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, fontSize: 11, color: INK2, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s' },
}

function IdeaCard({ idea, onAdvance, onDelete, onSelect }) {
  const tags = (idea.tags || []).slice(0, 3)
  const isLast = idea.stage === 'completion'

  return (
    <div
      style={S.card}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,157,224,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = PANEL_BORDER }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={S.cardTitle} onClick={() => onSelect(idea)}>{idea.name || idea.title || 'Untitled'}</div>
        <button onClick={() => onDelete(idea.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PANEL_BORDER, padding: '2px 4px', flexShrink: 0, borderRadius: 4, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = RED}
          onMouseLeave={e => e.currentTarget.style.color = PANEL_BORDER}>
          <Trash2 size={12} />
        </button>
      </div>

      {idea.description && (
        <div style={S.cardDesc}>{idea.description}</div>
      )}

      {tags.length > 0 && (
        <div style={S.tagRow}>
          {tags.map(t => <span key={t} style={S.tag}>#{t}</span>)}
          {(idea.tags || []).length > 3 && <span style={{ ...S.tag, background: 'transparent', border: 'none', color: INK2 }}>+{(idea.tags || []).length - 3}</span>}
        </div>
      )}

      {!isLast && (
        <button
          style={S.advBtn}
          onClick={() => onAdvance(idea.id, idea.stage)}
          onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = NAVY_DEEP; e.currentTarget.style.borderColor = INK }}
          onMouseLeave={e => { e.currentTarget.style.background = NAVY_DEEP; e.currentTarget.style.color = INK2; e.currentTarget.style.borderColor = PANEL_BORDER }}
        >
          Advance <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}

function DetailPanel({ idea, onClose, onUpdate }) {
  const [title, setTitle] = useState(idea.name || idea.title || '')
  const [desc, setDesc] = useState(idea.description || '')
  const [nextAction, setNextAction] = useState(idea.next_action || '')
  const [dropboxLink, setDropboxLink] = useState(idea.dropbox_link || '')
  const [newTask, setNewTask] = useState('')
  const [tasks, setTasks] = useState(idea.tasks || [])
  const [saved, setSaved] = useState(false)

  const save = () => {
    onUpdate(idea.id, { name: title, title, description: desc, next_action: nextAction, dropbox_link: dropboxLink, tasks })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const addTask = () => {
    if (!newTask.trim()) return
    const updated = [...tasks, { id: Date.now().toString(), text: newTask.trim(), done: false }]
    setTasks(updated)
    setNewTask('')
  }

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: PANEL_BG, borderLeft: `1px solid ${PANEL_BORDER}`, boxShadow: '-4px 0 20px rgba(0,0,0,0.08)', zIndex: 500, display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${PANEL_BORDER}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{STAGE_META[idea.stage]?.label}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK2, display: 'flex', padding: 4, borderRadius: 6 }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: INK2, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', color: INK, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = PANEL_BORDER} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: INK2, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} style={{ width: '100%', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: INK2, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = PANEL_BORDER} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: INK2, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Next Action</label>
          <input value={nextAction} onChange={e => setNextAction(e.target.value)} style={{ width: '100%', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: INK2, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = PANEL_BORDER} />
        </div>
        {idea.tags?.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: INK2, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {idea.tags.map(t => <span key={t} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 9999, background: PANEL_BG, color: INK2, border: `1px solid ${PANEL_BORDER}` }}>#{t}</span>)}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${PANEL_BORDER}` }}>
        <button onClick={save} style={{ width: '100%', padding: '9px 0', background: saved ? '#00968F' : INK, color: NAVY_DEEP, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default function IdeasPage() {
  const { ideas, addIdea, updateIdea, deleteIdea, advanceStage, loading } = useIdeas()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [addingTitle, setAddingTitle] = useState('')
  const [addingStage, setAddingStage] = useState('ideation')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.stage === filter)

  const handleAdd = async () => {
    if (!addingTitle.trim()) return
    await addIdea(addingTitle.trim())
    setAddingTitle('')
    setShowAdd(false)
  }

  const handleAdvance = (id, currentStage) => {
    const idx = STAGES.indexOf(currentStage)
    if (idx < STAGES.length - 1) {
      updateIdea(id, { stage: STAGES[idx + 1] })
    }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Ideas Pipeline</h1>
          <p style={S.sub}>{ideas.length} idea{ideas.length !== 1 ? 's' : ''} in pipeline</p>
        </div>
        <button style={S.addBtn} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> New Idea
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: 'none' }}>
          <input
            autoFocus
            value={addingTitle}
            onChange={e => setAddingTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false) }}
            placeholder="Name this idea..."
            style={{ width: '100%', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', color: INK, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, fontSize: 13, color: GRAY, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: BLUE, color: NAVY_DEEP, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
          </div>
        </div>
      )}

      {/* Stage filter */}
      <div style={S.filterRow}>
        <button style={S.filterBtn(filter === 'all')} onClick={() => setFilter('all')}>All stages</button>
        {STAGES.map(s => (
          <button key={s} style={S.filterBtn(filter === s)} onClick={() => setFilter(filter === s ? 'all' : s)}>
            {STAGE_META[s].label} ({ideas.filter(i => i.stage === s).length})
          </button>
        ))}
      </div>

      {/* Kanban */}
      <div style={S.kanban}>
        {STAGES.map(stage => {
          const stageIdeas = filtered.filter(i => i.stage === stage)
          const meta = STAGE_META[stage]
          return (
            <div key={stage} style={S.col}>
              <div style={S.colHeader}>
                <span style={S.colLabel}>{meta.label}</span>
                <span style={S.colCount}>{stageIdeas.length}</span>
              </div>
              <div style={S.colBody}>
                {stageIdeas.map(idea => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onAdvance={handleAdvance}
                    onDelete={deleteIdea}
                    onSelect={setSelected}
                  />
                ))}
                {stageIdeas.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: PANEL_BORDER, fontSize: 12, fontFamily: 'inherit' }}>Empty</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 499 }} onClick={() => setSelected(null)} />
          <DetailPanel idea={selected} onClose={() => setSelected(null)} onUpdate={(id, updates) => { updateIdea(id, updates); setSelected(prev => ({ ...prev, ...updates })) }} />
        </>
      )}
    </div>
  )
}
