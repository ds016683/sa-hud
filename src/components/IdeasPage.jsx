import { useState } from 'react'
import { Plus, X, ChevronRight, Trash2 } from 'lucide-react'
import useIdeas from '../hooks/useIdeas'

const STAGES = ['ideation', 'concept', 'attunement', 'disposition', 'completion']

const STAGE_META = {
  ideation:   { label: 'Ideation',    color: '#002C77', count_color: '#8096B2' },
  concept:    { label: 'Concept',     color: '#002C77', count_color: '#8096B2' },
  attunement: { label: 'Attunement',  color: '#002C77', count_color: '#8096B2' },
  disposition:{ label: 'Disposition', color: '#002C77', count_color: '#8096B2' },
  completion: { label: 'Completion',  color: '#002C77', count_color: '#8096B2' },
}

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  h1: { fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 },
  sub: { fontSize: 13, color: '#8096B2', margin: '2px 0 0' },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#002C77', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  filterBtn: (active) => ({ padding: '4px 12px', borderRadius: 9999, border: '1px solid', fontSize: 12, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: active ? 600 : 400, background: active ? '#002C77' : 'white', color: active ? 'white' : '#334E85', borderColor: active ? '#002C77' : '#CBD8E8', transition: 'all 0.15s' }),
  kanban: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'start' },
  col: { background: '#F7F9FC', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' },
  colHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #E2E8F0' },
  colLabel: { fontSize: 11, fontWeight: 700, color: '#002C77', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Arial, Helvetica, sans-serif' },
  colCount: { fontSize: 13, fontWeight: 700, color: '#8096B2', fontFamily: 'Arial, Helvetica, sans-serif' },
  colBody: { padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 },
  card: { background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#002C77', marginBottom: 6, lineHeight: 1.4, fontFamily: 'Arial, Helvetica, sans-serif', wordBreak: 'break-word' },
  cardDesc: { fontSize: 12, color: '#565656', lineHeight: 1.5, marginBottom: 6, fontFamily: 'Arial, Helvetica, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: { fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#EEF2F7', color: '#334E85', border: '1px solid #CBD8E8', fontFamily: 'Arial, Helvetica, sans-serif', whiteSpace: 'nowrap', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' },
  advBtn: { marginTop: 8, width: '100%', padding: '5px 0', background: 'white', border: '1px solid #CBD8E8', borderRadius: 6, fontSize: 11, color: '#8096B2', cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s' },
}

function IdeaCard({ idea, onAdvance, onDelete, onSelect }) {
  const tags = (idea.tags || []).slice(0, 3)
  const isLast = idea.stage === 'completion'

  return (
    <div
      style={S.card}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,157,224,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#E2E8F0' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={S.cardTitle} onClick={() => onSelect(idea)}>{idea.name || idea.title || 'Untitled'}</div>
        <button onClick={() => onDelete(idea.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD8E8', padding: '2px 4px', flexShrink: 0, borderRadius: 4, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#CBD8E8'}>
          <Trash2 size={12} />
        </button>
      </div>

      {idea.description && (
        <div style={S.cardDesc}>{idea.description}</div>
      )}

      {tags.length > 0 && (
        <div style={S.tagRow}>
          {tags.map(t => <span key={t} style={S.tag}>#{t}</span>)}
          {(idea.tags || []).length > 3 && <span style={{ ...S.tag, background: 'transparent', border: 'none', color: '#8096B2' }}>+{(idea.tags || []).length - 3}</span>}
        </div>
      )}

      {!isLast && (
        <button
          style={S.advBtn}
          onClick={() => onAdvance(idea.id, idea.stage)}
          onMouseEnter={e => { e.currentTarget.style.background = '#002C77'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#002C77' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#8096B2'; e.currentTarget.style.borderColor = '#CBD8E8' }}
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
  const [saved, setSaved] = useState(false)

  const save = () => {
    onUpdate(idea.id, { name: title, title, description: desc, next_action: nextAction })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: 'white', borderLeft: '1px solid #E2E8F0', boxShadow: '-4px 0 20px rgba(0,0,0,0.08)', zIndex: 500, display: 'flex', flexDirection: 'column', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#002C77', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{STAGE_META[idea.stage]?.label}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8096B2', display: 'flex', padding: 4, borderRadius: 6 }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', border: '1px solid #CBD8E8', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'Arial, Helvetica, sans-serif', color: '#002C77', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#009DE0'} onBlur={e => e.target.style.borderColor = '#CBD8E8'} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} style={{ width: '100%', border: '1px solid #CBD8E8', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif', color: '#334E85', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = '#009DE0'} onBlur={e => e.target.style.borderColor = '#CBD8E8'} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Next Action</label>
          <input value={nextAction} onChange={e => setNextAction(e.target.value)} style={{ width: '100%', border: '1px solid #CBD8E8', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif', color: '#334E85', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#009DE0'} onBlur={e => e.target.style.borderColor = '#CBD8E8'} />
        </div>
        {idea.tags?.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {idea.tags.map(t => <span key={t} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 9999, background: '#EEF2F7', color: '#334E85', border: '1px solid #CBD8E8' }}>#{t}</span>)}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
        <button onClick={save} style={{ width: '100%', padding: '9px 0', background: saved ? '#00968F' : '#002C77', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif', transition: 'background 0.2s' }}>
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
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <input
            autoFocus
            value={addingTitle}
            onChange={e => setAddingTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false) }}
            placeholder="Name this idea..."
            style={{ width: '100%', border: '1px solid #CBD8E8', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'Arial, Helvetica, sans-serif', color: '#002C77', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#002C77', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' }}>Add</button>
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
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#CBD8E8', fontSize: 12, fontFamily: 'Arial, Helvetica, sans-serif' }}>Empty</div>
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
