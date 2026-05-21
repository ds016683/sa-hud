import { useMemo, useState, useEffect } from 'react'
import {
  Search, Pin, PinOff, EyeOff, Plus, X, Mail, Star, Tag,
  ChevronRight, Users, ListPlus, Filter, Calendar, Building2,
  Phone, Smartphone, MapPin, Globe, Linkedin, Briefcase
} from 'lucide-react'
import useRelationships from '../hooks/useRelationships'

const NAVY = '#002C77'
const BLUE = '#009DE0'
const GOLD = '#D4A106'
const GRAY = '#8096B2'
const TEXT_DIM = '#565656'
const PANEL_BORDER = '#E2E8F0'
const PAGE_BG = '#F7F9FC'
const MINT = '#F0FDF4'
const MINT_BORDER = '#86EFAC'

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'Arial, Helvetica, sans-serif', color: NAVY },
  h1: { fontSize: 22, fontWeight: 700, margin: 0, color: NAVY },
  sub: { fontSize: 12, color: GRAY, margin: '2px 0 0' },
  panel: { background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  input: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btnGhost: { background: 'white', color: NAVY, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnPrimary: { background: NAVY, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  chip: (bg, fg, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: bg, color: fg, border: border ? `1px solid ${border}` : 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }),
  pillBtn: (active) => ({
    background: active ? NAVY : 'white',
    color: active ? 'white' : NAVY,
    border: `1px solid ${active ? NAVY : PANEL_BORDER}`,
    borderRadius: 9999,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }),
}

// ---------- helpers ----------
function avatarColor(name) {
  const colors = ['#0EA5E9', '#7C3AED', '#DC2626', '#0F766E', '#D97706', '#0369A1', '#BE185D', '#15803D']
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return colors[h % colors.length]
}

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/)
  return (parts[0]?.[0] || '?').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}

function daysAgo(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86400000)
}

function strengthOf(contactCount) {
  if (!contactCount || contactCount < 3) return 'casual'
  if (contactCount < 15) return 'known'
  return 'strong'
}

function relativeDate(iso) {
  if (!iso) return '—'
  const d = daysAgo(iso)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

// ---------- main ----------
export default function RelationshipsPage() {
  const {
    people, loading, allLists, allTags,
    togglePin, hidePerson, addToList, removeFromList,
    addTag, removeTag, saveNotes, fetchInteractions,
  } = useRelationships()

  // Filters
  const [q, setQ] = useState('')
  const [strengthFilter, setStrengthFilter] = useState(null)   // 'strong' | 'known' | 'casual' | null
  const [staleFilter, setStaleFilter] = useState(null)          // 30 | 90 | 365 | null
  const [activeList, setActiveList] = useState(null)            // string | null
  const [activeTag, setActiveTag] = useState(null)              // string | null
  const [pinnedOnly, setPinnedOnly] = useState(false)

  // Selection (for bulk add to list)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [drillId, setDrillId] = useState(null)
  const [newListPrompt, setNewListPrompt] = useState(false)
  const [newListName, setNewListName] = useState('')

  // Filter pipeline
  const filtered = useMemo(() => {
    let out = people
    if (pinnedOnly) out = out.filter(p => p.pinned)
    if (activeList) out = out.filter(p => (p.target_lists || []).includes(activeList))
    if (activeTag) out = out.filter(p => (p.tags || []).includes(activeTag))
    if (strengthFilter) out = out.filter(p => strengthOf(p.contact_count) === strengthFilter)
    if (staleFilter) {
      out = out.filter(p => {
        const d = daysAgo(p.last_contact_at)
        return d !== null && d >= staleFilter
      })
    }
    if (q.trim()) {
      const ql = q.trim().toLowerCase()
      out = out.filter(p =>
        (p.full_name || '').toLowerCase().includes(ql) ||
        (p.primary_email || '').toLowerCase().includes(ql) ||
        (p.company || '').toLowerCase().includes(ql) ||
        (p.title || '').toLowerCase().includes(ql) ||
        (p.notes || '').toLowerCase().includes(ql) ||
        (p.address || '').toLowerCase().includes(ql)
      )
    }
    return out
  }, [people, q, strengthFilter, staleFilter, activeList, activeTag, pinnedOnly])

  // Pinned always sort first within filtered set
  const ordered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1
      return (b.contact_count || 0) - (a.contact_count || 0)
    })
  }, [filtered])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const submitNewList = async () => {
    if (!newListName.trim() || selectedIds.size === 0) return
    await addToList([...selectedIds], newListName)
    setNewListName('')
    setNewListPrompt(false)
    clearSelection()
  }

  if (loading) return <div style={{ ...S.page, color: GRAY, fontSize: 13 }}>Loading...</div>

  return (
    <div style={{ ...S.page, background: PAGE_BG }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={S.h1}>Relationships</h1>
        <div style={S.sub}>
          {people.length} people · {filtered.length} shown
          {activeList && <> · list <strong style={{ color: NAVY }}>{activeList}</strong></>}
          {activeTag && <> · tag <strong style={{ color: NAVY }}>{activeTag}</strong></>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
        {/* LEFT: Lists + Tags sidebar */}
        <aside>
          <div style={{ ...S.panel, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Target lists
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button style={S.pillBtn(activeList === null)} onClick={() => setActiveList(null)}>
                <Users size={11} style={{ marginRight: 4, marginBottom: -1 }} /> All people
              </button>
              {allLists.length === 0 && (
                <div style={{ fontSize: 11, color: GRAY, padding: '6px 0' }}>No lists yet. Select people and create one.</div>
              )}
              {allLists.map(l => (
                <button key={l} style={S.pillBtn(activeList === l)} onClick={() => setActiveList(activeList === l ? null : l)}>
                  📋 {l}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div style={{ ...S.panel, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {allTags.map(t => (
                  <button key={t} style={S.pillBtn(activeTag === t)} onClick={() => setActiveTag(activeTag === t ? null : t)}>
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={S.panel}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Quick filters
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button style={S.pillBtn(pinnedOnly)} onClick={() => setPinnedOnly(!pinnedOnly)}>📌 Pinned only</button>
              <div style={{ fontSize: 10, color: GRAY, marginTop: 4, marginBottom: 2 }}>Strength</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['strong', 'known', 'casual'].map(s => (
                  <button key={s} style={S.pillBtn(strengthFilter === s)} onClick={() => setStrengthFilter(strengthFilter === s ? null : s)}>{s}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: GRAY, marginTop: 6, marginBottom: 2 }}>Last contact</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { label: '30d+', v: 30 },
                  { label: '90d+', v: 90 },
                  { label: '1y+', v: 365 },
                ].map(o => (
                  <button key={o.v} style={S.pillBtn(staleFilter === o.v)} onClick={() => setStaleFilter(staleFilter === o.v ? null : o.v)}>{o.label}</button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT: Search + table */}
        <main>
          <div style={{ ...S.panel, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Search size={16} color={GRAY} />
            <input
              autoFocus
              placeholder="Search name, email, company…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ ...S.input, flex: 1, border: 'none', padding: '6px 0' }}
            />
            {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: GRAY, cursor: 'pointer' }}><X size={14} /></button>}
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div style={{ ...S.panel, marginBottom: 10, background: '#FEF9E7', borderColor: GOLD, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>
                {selectedIds.size} selected
              </div>
              {!newListPrompt && (
                <>
                  <button style={S.btnGhost} onClick={() => setNewListPrompt(true)}>
                    <ListPlus size={12} /> Add to list…
                  </button>
                  <button style={S.btnGhost} onClick={clearSelection}>
                    <X size={12} /> Clear
                  </button>
                </>
              )}
              {newListPrompt && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
                  <input
                    autoFocus
                    placeholder="List name (e.g. nyc-may or pe-outreach)"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitNewList()}
                    list="existing-lists"
                    style={{ ...S.input, flex: 1 }}
                  />
                  <datalist id="existing-lists">
                    {allLists.map(l => <option key={l} value={l} />)}
                  </datalist>
                  <button style={S.btnPrimary} onClick={submitNewList}>Add</button>
                  <button style={S.btnGhost} onClick={() => { setNewListPrompt(false); setNewListName('') }}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div style={{ ...S.panel, padding: 0, overflow: 'hidden' }}>
            {ordered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: GRAY, fontSize: 13 }}>
                <Users size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div>No matches.</div>
              </div>
            ) : (
              <div>
                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr 180px 100px 100px 32px',
                  gap: 8, padding: '10px 14px', borderBottom: `1px solid ${PANEL_BORDER}`,
                  fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em'
                }}>
                  <div></div>
                  <div>Name</div>
                  <div>Company</div>
                  <div>Last contact</div>
                  <div>Contacts</div>
                  <div></div>
                </div>
                {ordered.map(p => {
                  const isSel = selectedIds.has(p.id)
                  const s = strengthOf(p.contact_count)
                  return (
                    <div key={p.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 1fr 180px 100px 100px 32px',
                        gap: 8, padding: '10px 14px', borderBottom: `1px solid ${PANEL_BORDER}`,
                        background: isSel ? MINT : 'white',
                        cursor: 'pointer',
                        alignItems: 'center',
                      }}
                      onClick={() => setDrillId(p.id)}
                    >
                      <div onClick={e => { e.stopPropagation(); toggleSelect(p.id) }}>
                        <input type="checkbox" checked={isSel} readOnly style={{ cursor: 'pointer' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(p.full_name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {initials(p.full_name)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.pinned && <Pin size={11} fill={GOLD} color={GOLD} style={{ marginRight: 4, verticalAlign: -1 }} />}
                            {p.full_name}
                          </div>
                          <div style={{ fontSize: 11, color: GRAY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.primary_email}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.company || '—'}</div>
                        {p.title && <div style={{ fontSize: 10, color: GRAY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_DIM }}>{relativeDate(p.last_contact_at)}</div>
                      <div style={{ fontSize: 12, color: TEXT_DIM, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={S.chip(
                          s === 'strong' ? '#DCFCE7' : s === 'known' ? '#DBEAFE' : '#F1F5F9',
                          s === 'strong' ? '#15803D' : s === 'known' ? '#1D4ED8' : GRAY,
                        )}>{p.contact_count || 0}</span>
                      </div>
                      <div><ChevronRight size={14} color={GRAY} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Drill-down panel */}
      {drillId && (
        <DrillPanel
          person={people.find(p => p.id === drillId)}
          onClose={() => setDrillId(null)}
          onTogglePin={() => togglePin(drillId)}
          onHide={() => { hidePerson(drillId); setDrillId(null) }}
          onAddTag={(t) => addTag(drillId, t)}
          onRemoveTag={(t) => removeTag(drillId, t)}
          onAddToList={(l) => addToList([drillId], l)}
          onRemoveFromList={(l) => removeFromList(drillId, l)}
          onSaveNotes={(n) => saveNotes(drillId, n)}
          fetchInteractions={fetchInteractions}
          allLists={allLists}
        />
      )}
    </div>
  )
}

// ---------- Drill-down panel ----------
function DrillPanel({ person, onClose, onTogglePin, onHide, onAddTag, onRemoveTag, onAddToList, onRemoveFromList, onSaveNotes, fetchInteractions, allLists }) {
  const [interactions, setInteractions] = useState([])
  const [loadingI, setLoadingI] = useState(true)
  const [newTag, setNewTag] = useState('')
  const [newList, setNewList] = useState('')
  const [notes, setNotes] = useState(person?.notes || '')
  const [notesDirty, setNotesDirty] = useState(false)

  useEffect(() => {
    if (!person) return
    setLoadingI(true)
    setNotes(person.notes || '')
    setNotesDirty(false)
    fetchInteractions(person.id, 200).then(data => {
      setInteractions(data)
      setLoadingI(false)
    })
  }, [person?.id, fetchInteractions])

  if (!person) return null

  const handleSaveNotes = () => {
    onSaveNotes(notes)
    setNotesDirty(false)
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(540px, 95vw)',
        background: 'white', borderLeft: `1px solid ${PANEL_BORDER}`, boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
        padding: 20, overflowY: 'auto', zIndex: 100, fontFamily: 'Arial, Helvetica, sans-serif',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarColor(person.full_name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
          {initials(person.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}>
            {person.full_name}
            <button onClick={onTogglePin} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title={person.pinned ? 'Unpin' : 'Pin'}>
              {person.pinned ? <Pin size={16} fill={GOLD} color={GOLD} /> : <PinOff size={16} color={GRAY} />}
            </button>
          </div>
          <div style={{ fontSize: 12, color: GRAY }}>
            <Mail size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
            {person.primary_email}
          </div>
          {person.company && <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}><Building2 size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{person.company}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY }}><X size={18} /></button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        <div style={{ ...S.panel, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>{person.contact_count || 0}</div>
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>contacts</div>
        </div>
        <div style={{ ...S.panel, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{relativeDate(person.last_contact_at)}</div>
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>last contact</div>
        </div>
        <div style={{ ...S.panel, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{strengthOf(person.contact_count)}</div>
          <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>strength</div>
        </div>
      </div>

      {/* Contact info — from signature parsing */}
      {(person.title || person.phone || person.mobile_phone || person.address || person.website || person.linkedin_url) && (
        <div style={{ ...S.panel, marginBottom: 14, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Contact info
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: TEXT_DIM }}>
            {person.title && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={12} color={GRAY} />
                <span>{person.title}</span>
              </div>
            )}
            {person.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={12} color={GRAY} />
                <a href={`tel:${person.phone.replace(/[^\d+]/g, '')}`} style={{ color: TEXT_DIM, textDecoration: 'none' }}>{person.phone}</a>
              </div>
            )}
            {person.mobile_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Smartphone size={12} color={GRAY} />
                <a href={`tel:${person.mobile_phone.replace(/[^\d+]/g, '')}`} style={{ color: TEXT_DIM, textDecoration: 'none' }}>{person.mobile_phone}</a>
                <span style={{ fontSize: 10, color: GRAY }}>(mobile)</span>
              </div>
            )}
            {person.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={12} color={GRAY} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{person.address}</span>
              </div>
            )}
            {person.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={12} color={GRAY} />
                <a href={person.website} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: 'none' }}>{person.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
              </div>
            )}
            {person.linkedin_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Linkedin size={12} color={GRAY} />
                <a href={person.linkedin_url.startsWith('http') ? person.linkedin_url : `https://${person.linkedin_url}`} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: 'none' }}>LinkedIn</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target lists */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          On target lists
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {(person.target_lists || []).map(l => (
            <span key={l} style={{ ...S.chip('#EEF2F7', NAVY), padding: '4px 10px' }}>
              📋 {l}
              <button onClick={() => onRemoveFromList(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: NAVY, marginLeft: 4 }}><X size={10} /></button>
            </span>
          ))}
          <input
            placeholder="+ list"
            value={newList}
            onChange={e => setNewList(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newList.trim()) { onAddToList(newList.trim()); setNewList('') } }}
            list="drill-lists"
            style={{ ...S.input, fontSize: 11, padding: '3px 8px', width: 110 }}
          />
          <datalist id="drill-lists">
            {allLists.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Tags
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {(person.tags || []).map(t => (
            <span key={t} style={{ ...S.chip('#F1F5F9', TEXT_DIM), padding: '4px 10px' }}>
              #{t}
              <button onClick={() => onRemoveTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_DIM, marginLeft: 4 }}><X size={10} /></button>
            </span>
          ))}
          <input
            placeholder="+ tag"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newTag.trim()) { onAddTag(newTag.trim()); setNewTag('') } }}
            style={{ ...S.input, fontSize: 11, padding: '3px 8px', width: 110 }}
          />
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Notes
        </div>
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setNotesDirty(true) }}
          placeholder="Personal notes about this relationship…"
          rows={4}
          style={{ ...S.input, width: '100%', resize: 'vertical', fontSize: 12, lineHeight: 1.4 }}
        />
        {notesDirty && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button style={S.btnPrimary} onClick={handleSaveNotes}>Save</button>
            <button style={S.btnGhost} onClick={() => { setNotes(person.notes || ''); setNotesDirty(false) }}>Cancel</button>
          </div>
        )}
      </div>

      {/* Interaction timeline */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Recent activity · {interactions.length}
        </div>
        {loadingI ? (
          <div style={{ fontSize: 12, color: GRAY, padding: '10px 0' }}>Loading...</div>
        ) : interactions.length === 0 ? (
          <div style={{ fontSize: 12, color: GRAY, padding: '10px 0' }}>No activity recorded.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
            {interactions.map(i => (
              <div key={i.id} style={{ padding: '8px 10px', borderRadius: 6, background: '#F7F9FC' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: GRAY, fontWeight: 600, minWidth: 50, marginTop: 1 }}>
                    {new Date(i.occurred_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ ...S.chip(i.direction === 'in' ? '#DBEAFE' : '#FEF3C7', i.direction === 'in' ? '#1D4ED8' : '#92400E'), padding: '1px 6px', fontSize: 9 }}>
                    {i.direction === 'in' ? 'in' : 'out'}
                  </span>
                  <span style={{ fontSize: 12, color: NAVY, flex: 1, lineHeight: 1.3, fontWeight: 600 }}>
                    {i.subject || <em style={{ color: GRAY, fontWeight: 400 }}>(no subject)</em>}
                  </span>
                </div>
                {i.body_preview && (
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4, marginLeft: 66, lineHeight: 1.4, fontStyle: 'italic', maxHeight: 48, overflow: 'hidden' }}>
                    {i.body_preview.slice(0, 200)}{i.body_preview.length > 200 ? '…' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Hide */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${PANEL_BORDER}` }}>
        <button style={{ ...S.btnGhost, color: '#DC2626', borderColor: '#FECACA' }} onClick={onHide}>
          <EyeOff size={12} /> Hide from list
        </button>
      </div>
    </div>
  )
}
