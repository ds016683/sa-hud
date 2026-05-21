// TripPlannerView.jsx — "I'm going to X. Who's there? What's the move?"
import { useMemo, useState } from 'react'
import { MapPin, Search, ChevronRight, Pin, Clock, AlertTriangle, Star, TrendingUp } from 'lucide-react'

const NAVY = '#002C77'
const BLUE = '#009DE0'
const GOLD = '#D4A106'
const GRAY = '#8096B2'
const TEXT_DIM = '#565656'
const PANEL_BORDER = '#E2E8F0'
const PAGE_BG = '#F7F9FC'

const S = {
  panel: { background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  input: { padding: '10px 14px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  chip: (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.05em' }),
  btnGhost: { background: 'white', color: NAVY, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  pillBtn: (active) => ({
    background: active ? NAVY : 'white', color: active ? 'white' : NAVY,
    border: `1px solid ${active ? NAVY : PANEL_BORDER}`, borderRadius: 9999,
    padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }),
}

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
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
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

// Suggest "moves" based on relationship state
function suggestMove(person) {
  const d = daysAgo(person.last_contact_at)
  const c = person.contact_count || 0
  const tags = person.tags || []

  // High priority: client + stale = check-in needed
  if (tags.includes('interest:client') && d > 60) {
    return { kind: 'check-in', urgency: 'high', label: 'Client check-in', icon: AlertTriangle, color: '#DC2626', detail: `Last touch ${d}d ago — overdue` }
  }
  // Potential business + stale = re-engage
  if (tags.includes('interest:potential-business') && d > 45) {
    return { kind: 'reengage', urgency: 'high', label: 'Re-engage prospect', icon: TrendingUp, color: '#D97706', detail: `${d}d cold — momentum slipping` }
  }
  // Strong relationship + stale = catch up
  if (c >= 15 && d > 180) {
    return { kind: 'catchup', urgency: 'medium', label: 'Catch up', icon: Clock, color: GOLD, detail: `Strong (${c} contacts) but cold ${d}d` }
  }
  // Potential partner = explore
  if (tags.includes('interest:potential-partner')) {
    return { kind: 'partner', urgency: 'medium', label: 'Partnership move', icon: Star, color: BLUE, detail: 'Explore in-person' }
  }
  // Intelligence = listening tour
  if (tags.includes('interest:intelligence')) {
    return { kind: 'intel', urgency: 'low', label: 'Pick brain', icon: Star, color: GRAY, detail: 'Intel/insight contact' }
  }
  // Pinned = always relevant
  if (person.pinned) {
    return { kind: 'pinned', urgency: 'medium', label: 'Pinned — see in person', icon: Pin, color: GOLD, detail: 'Worth grabbing time' }
  }
  // Generic: in town, why not?
  if (c >= 5) {
    return { kind: 'visit', urgency: 'low', label: 'Coffee', icon: Star, color: GRAY, detail: 'Light touch' }
  }
  return null
}

export default function TripPlannerView({ people, onSelectPerson }) {
  const [query, setQuery] = useState('')
  const [selectedDest, setSelectedDest] = useState(null)  // {kind:'metro'|'state'|'city', value}

  const geocoded = useMemo(() => people.filter(p => p.latitude && p.longitude), [people])

  // Build destination index: metros, states, cities (sorted by people count)
  const destinations = useMemo(() => {
    const metros = {}, states = {}, cities = {}
    for (const p of geocoded) {
      if (p.metro_area) metros[p.metro_area] = (metros[p.metro_area] || 0) + 1
      if (p.state_code) states[p.state_code] = (states[p.state_code] || 0) + 1
      if (p.city && p.state_code) {
        const k = `${p.city}, ${p.state_code}`
        cities[k] = (cities[k] || 0) + 1
      }
    }
    const all = [
      ...Object.entries(metros).map(([v, c]) => ({ kind: 'metro', value: v, count: c, label: v + ' metro' })),
      ...Object.entries(states).map(([v, c]) => ({ kind: 'state', value: v, count: c, label: v })),
      ...Object.entries(cities).map(([v, c]) => ({ kind: 'city', value: v, count: c, label: v })),
    ].sort((a, b) => b.count - a.count)
    return all
  }, [geocoded])

  // Filter destinations by query
  const matchedDests = useMemo(() => {
    if (!query.trim()) return destinations.slice(0, 8)
    const q = query.trim().toLowerCase()
    return destinations.filter(d => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q)).slice(0, 12)
  }, [destinations, query])

  // People at the selected destination
  const peopleHere = useMemo(() => {
    if (!selectedDest) return []
    return geocoded.filter(p => {
      if (selectedDest.kind === 'metro') return p.metro_area === selectedDest.value
      if (selectedDest.kind === 'state') return p.state_code === selectedDest.value
      if (selectedDest.kind === 'city') {
        const k = `${p.city}, ${p.state_code}`
        return k === selectedDest.value
      }
      return false
    })
  }, [geocoded, selectedDest])

  // Score and sort: urgency × prominence
  const orderedPeople = useMemo(() => {
    return [...peopleHere].map(p => {
      const move = suggestMove(p)
      const urgencyWeight = move?.urgency === 'high' ? 100 : move?.urgency === 'medium' ? 50 : move?.urgency === 'low' ? 10 : 0
      const prominence = p.contact_count || 0
      const score = urgencyWeight + Math.sqrt(prominence)
      return { person: p, move, score }
    }).sort((a, b) => b.score - a.score)
  }, [peopleHere])

  // Group moves by urgency
  const moveBuckets = useMemo(() => {
    const buckets = { high: [], medium: [], low: [], none: [] }
    for (const item of orderedPeople) {
      if (!item.move) buckets.none.push(item)
      else buckets[item.move.urgency].push(item)
    }
    return buckets
  }, [orderedPeople])

  if (people.length === 0) {
    return <div style={{ color: GRAY, fontSize: 14, padding: 40, textAlign: 'center' }}>Loading…</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14 }}>
      {/* Left: search + people list */}
      <div>
        {/* Search */}
        <div style={{ ...S.panel, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Search size={18} color={GRAY} />
          <input
            autoFocus
            placeholder="Where are you going? (e.g. Dallas, NYC, TX, Chicago metro)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ ...S.input, flex: 1, border: 'none', padding: '4px 0', fontSize: 16 }}
          />
        </div>

        {/* Destination chips */}
        {!selectedDest && (
          <div style={{ ...S.panel, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {query.trim() ? `Matches (${matchedDests.length})` : 'Top destinations'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {matchedDests.length === 0 ? (
                <div style={{ fontSize: 12, color: GRAY }}>No matches. Try a state code (TX, NY) or metro name.</div>
              ) : matchedDests.map(d => (
                <button key={`${d.kind}:${d.value}`} style={S.pillBtn(false)} onClick={() => setSelectedDest(d)}>
                  📍 {d.label} <span style={{ color: GRAY, marginLeft: 4 }}>{d.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected destination */}
        {selectedDest && (
          <>
            <div style={{ ...S.panel, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <MapPin size={20} color={NAVY} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{selectedDest.label}</div>
                <div style={{ fontSize: 12, color: GRAY }}>{peopleHere.length} {peopleHere.length === 1 ? 'person' : 'people'} you know · {moveBuckets.high.length + moveBuckets.medium.length} suggested moves</div>
              </div>
              <button style={S.btnGhost} onClick={() => { setSelectedDest(null); setQuery('') }}>Change</button>
            </div>

            <div style={{ ...S.panel, padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
              {orderedPeople.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: GRAY, fontSize: 13 }}>
                  No one tracked here yet.
                </div>
              ) : (
                orderedPeople.map(({ person, move, score }) => (
                  <div key={person.id}
                    onClick={() => onSelectPerson(person.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                      borderBottom: `1px solid ${PANEL_BORDER}`, cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(person.full_name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {initials(person.full_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
                        {person.pinned && <Pin size={11} fill={GOLD} color={GOLD} style={{ marginRight: 4, verticalAlign: -1 }} />}
                        {person.full_name}
                      </div>
                      <div style={{ fontSize: 11, color: GRAY, marginTop: 1 }}>
                        {person.company || person.primary_email}
                        {person.city && <> · {person.city}, {person.state_code}</>}
                      </div>
                      {move && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ ...S.chip(move.color + '22', move.color), padding: '3px 8px' }}>
                            <move.icon size={10} /> {move.label}
                          </span>
                          <span style={{ fontSize: 11, color: TEXT_DIM }}>{move.detail}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ ...S.chip('#DBEAFE', '#1D4ED8') }}>{person.contact_count || 0}</span>
                      <span style={{ fontSize: 10, color: GRAY }}>{relativeDate(person.last_contact_at)}</span>
                    </div>
                    <ChevronRight size={14} color={GRAY} />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Moves summary */}
      <div>
        <div style={S.panel}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Trip dashboard
          </div>
          {!selectedDest ? (
            <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>
              Pick a city, metro, or state. I'll show you:
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: TEXT_DIM, lineHeight: 1.8 }}>
                <li>Everyone you know there</li>
                <li>Clients overdue for check-in</li>
                <li>Prospects going cold</li>
                <li>Pinned contacts worth grabbing time with</li>
              </ul>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 14 }}>
                <div style={{ background: '#FEE2E2', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>{moveBuckets.high.length}</div>
                  <div style={{ fontSize: 9, color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>high</div>
                </div>
                <div style={{ background: '#FEF3C7', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#D97706' }}>{moveBuckets.medium.length}</div>
                  <div style={{ fontSize: 9, color: '#D97706', fontWeight: 700, textTransform: 'uppercase' }}>medium</div>
                </div>
                <div style={{ background: '#F1F5F9', padding: 10, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: GRAY }}>{moveBuckets.low.length}</div>
                  <div style={{ fontSize: 9, color: GRAY, fontWeight: 700, textTransform: 'uppercase' }}>low</div>
                </div>
              </div>

              {moveBuckets.high.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Don't skip
                  </div>
                  {moveBuckets.high.slice(0, 5).map(({ person, move }) => (
                    <div key={person.id} onClick={() => onSelectPerson(person.id)}
                      style={{ padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}`, cursor: 'pointer', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: NAVY }}>{person.full_name}</div>
                      <div style={{ fontSize: 10, color: TEXT_DIM }}>{move.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {moveBuckets.medium.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Worth a coffee
                  </div>
                  {moveBuckets.medium.slice(0, 5).map(({ person, move }) => (
                    <div key={person.id} onClick={() => onSelectPerson(person.id)}
                      style={{ padding: '8px 0', borderBottom: `1px solid ${PANEL_BORDER}`, cursor: 'pointer', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: NAVY }}>{person.full_name}</div>
                      <div style={{ fontSize: 10, color: TEXT_DIM }}>{move.label} — {move.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
