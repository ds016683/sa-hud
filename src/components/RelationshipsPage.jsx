import { useMemo, useState } from 'react'
import { Plus, Check, ArrowUpRight, Star, Users, Send, X } from 'lucide-react'
import useObjectives from '../hooks/useObjectives'

const NAVY = '#002C77'
const BLUE = '#009DE0'
const GRAY = '#8096B2'
const TEXT_DIM = '#565656'
const PANEL_BORDER = '#E2E8F0'
const PAGE_BG = '#F7F9FC'
const GOLD = '#B45309'

const sizeFor = (w) => w >= 9 ? 'Boulder' : w >= 4 ? 'Stone' : 'Pebble'

const S = {
  page: { maxWidth: 960, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Arial, Helvetica, sans-serif', color: NAVY },
  h1: { fontSize: 22, fontWeight: 700, margin: 0, color: NAVY },
  sub: { fontSize: 12, color: GRAY, margin: '2px 0 0' },
  panel: { background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  card: { background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: 14, transition: 'all 0.15s', cursor: 'pointer' },
  chip: (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.05em' }),
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btnGhost: { background: 'white', color: NAVY, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimary: { background: NAVY, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnDone: { background: '#0F766E', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnForeman: { background: '#7C3AED', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 },
}

function avatarColor(name) {
  const colors = ['#0EA5E9', '#7C3AED', '#DC2626', '#0F766E', '#D97706', '#0369A1', '#BE185D', '#15803D']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return colors[h % colors.length]
}

function initials(name) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] || '?').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}

export default function RelationshipsPage() {
  const { loading, objectives, addObjective, releaseObjective, parkObjective, updateObjective } = useObjectives()
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // Group objectives by `who` (only active + emergency for the summary, all for the drill-down)
  const groups = useMemo(() => {
    const map = new Map()
    for (const o of objectives) {
      if (!o.who) continue
      if (!map.has(o.who)) map.set(o.who, { name: o.who, active: [], parked: [], released: [], boulders: 0 })
      const bucket = map.get(o.who)
      if (o.state === 'active') {
        bucket.active.push(o)
        if (o.weight >= 9) bucket.boulders++
      } else if (o.state === 'parked') bucket.parked.push(o)
      else if (o.state === 'released' || o.state === 'foreman') bucket.released.push(o)
    }
    return [...map.values()].sort((a, b) => {
      // anchor-attached first, then active count desc, then alpha
      const aAnchor = a.active.some(o => o.is_anchor)
      const bAnchor = b.active.some(o => o.is_anchor)
      if (aAnchor !== bAnchor) return aAnchor ? -1 : 1
      if (b.active.length !== a.active.length) return b.active.length - a.active.length
      return a.name.localeCompare(b.name)
    })
  }, [objectives])

  const unassigned = useMemo(() => objectives.filter(o => o.state === 'active' && !o.who), [objectives])

  if (loading) return <div style={{ ...S.page, color: GRAY, fontSize: 13 }}>Loading...</div>

  const submitNew = async () => {
    if (!newTitle.trim() || !selected) return
    await addObjective({ title: newTitle.trim(), who: selected.name, effort: 2, importance: 2 })
    setNewTitle('')
    setAddOpen(false)
  }

  return (
    <div style={{ ...S.page, background: PAGE_BG }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={S.h1}>Relationships</h1>
        <div style={S.sub}>Objectives by the people they're with · {groups.length} {groups.length === 1 ? 'person' : 'people'}</div>
      </div>

      {/* Person grid */}
      {!selected && (
        <>
          {groups.length === 0 ? (
            <div style={S.panel}>
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Users size={32} color={GRAY} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, color: TEXT_DIM, marginBottom: 4 }}>No relationship-tagged objectives yet.</div>
                <div style={{ fontSize: 12, color: GRAY }}>Add an objective with a "Who?" value to start tracking.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {groups.map(g => {
                const ac = avatarColor(g.name)
                const hasAnchor = g.active.some(o => o.is_anchor)
                return (
                  <div key={g.name} style={S.card} onClick={() => setSelected(g)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,157,224,0.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = PANEL_BORDER; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: ac, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {initials(g.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {hasAnchor && <Star size={12} fill={GOLD} color={GOLD} />}
                          {g.name}
                        </div>
                        <div style={{ fontSize: 11, color: GRAY }}>{g.active.length} active · {g.released.length} done</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.boulders > 0 && <span style={S.chip('#FEE2E2', '#7C2D12')}>{g.boulders} Boulder{g.boulders > 1 ? 's' : ''}</span>}
                      {g.active.length > 0 && <span style={S.chip('#EEF2F7', NAVY)}>{g.active.length} on deck</span>}
                      {g.parked.length > 0 && <span style={S.chip('#F1F5F9', GRAY)}>{g.parked.length} parked</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {unassigned.length > 0 && (
            <div style={{ ...S.panel, marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Unassigned · {unassigned.length}
              </div>
              <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 8 }}>Objectives without a person tag. Tap to assign.</div>
              {unassigned.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                  <span style={{ flex: 1, fontSize: 13, color: NAVY }}>{o.title}</span>
                  <button style={{ ...S.btnGhost, fontSize: 11, padding: '4px 8px' }} onClick={() => {
                    const who = prompt(`Assign "${o.title}" to whom?`)
                    if (who?.trim()) updateObjective(o.id, { who: who.trim() })
                  }}>+ tag</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Drill-down view */}
      {selected && (() => {
        const ac = avatarColor(selected.name)
        const g = groups.find(x => x.name === selected.name) || selected
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button style={S.btnGhost} onClick={() => setSelected(null)}>← back</button>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: ac, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                {initials(g.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{g.name}</div>
                <div style={{ fontSize: 11, color: GRAY }}>{g.active.length} active · {g.parked.length} parked · {g.released.length} released</div>
              </div>
              <button style={S.btnPrimary} onClick={() => setAddOpen(true)}><Plus size={14} style={{ marginBottom: -2 }} /> new</button>
            </div>

            {addOpen && (
              <div style={{ ...S.panel, border: `2px solid ${NAVY}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em' }}>New objective with {g.name}</div>
                  <button onClick={() => setAddOpen(false)} style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input autoFocus placeholder={`What's the objective with ${g.name}?`} value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitNew()} style={S.input} />
                  <button onClick={submitNew} style={{ ...S.btnPrimary, padding: '0 14px' }}><Send size={14} /></button>
                </div>
              </div>
            )}

            {/* Active */}
            <div style={S.panel}>
              <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Active · {g.active.length}</div>
              {g.active.length === 0 ? (
                <div style={{ fontSize: 12, color: GRAY, padding: '8px 0' }}>Nothing active with {g.name} right now.</div>
              ) : g.active.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                  {o.is_anchor && <Star size={14} fill={GOLD} color={GOLD} />}
                  <span style={{ flex: 1, fontSize: 13, color: NAVY, fontWeight: o.is_anchor ? 600 : 500 }}>{o.title}</span>
                  <span style={S.chip('#F1F5F9', NAVY)}>{sizeFor(o.weight)}</span>
                  <button style={S.btnDone} onClick={() => releaseObjective(o.id, 'done')}><Check size={11} /></button>
                  <button style={S.btnForeman} onClick={() => releaseObjective(o.id, 'foreman')}><ArrowUpRight size={11} /></button>
                </div>
              ))}
            </div>

            {/* Released history */}
            {g.released.length > 0 && (
              <div style={S.panel}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>History · {g.released.length}</div>
                {g.released.slice(0, 10).map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${PANEL_BORDER}`, fontSize: 13 }}>
                    {o.released_kind === 'foreman' ? <ArrowUpRight size={13} color="#7C3AED" /> : <Check size={13} color="#0F766E" />}
                    <span style={{ flex: 1, color: TEXT_DIM }}>{o.title}</span>
                    {o.released_at && <span style={{ fontSize: 11, color: GRAY }}>{new Date(o.released_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                  </div>
                ))}
                {g.released.length > 10 && (
                  <div style={{ fontSize: 11, color: GRAY, marginTop: 8 }}>+ {g.released.length - 10} more</div>
                )}
              </div>
            )}

            {/* Parked */}
            {g.parked.length > 0 && (
              <div style={S.panel}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Parked · {g.parked.length}</div>
                {g.parked.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${PANEL_BORDER}`, fontSize: 13 }}>
                    <span style={{ flex: 1, color: TEXT_DIM }}>{o.title}</span>
                    <button style={{ ...S.btnGhost, fontSize: 11, padding: '4px 8px' }} onClick={() => updateObjective(o.id, { state: 'active' })}>activate</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
