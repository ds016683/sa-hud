// MapView.jsx — US map of relationships by state, click → people in that area
import { useMemo, useState, useEffect } from 'react'
import { Users, MapPin, ChevronRight, Pin } from 'lucide-react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const NAVY = '#002C77'
const BLUE = '#009DE0'
const GOLD = '#D4A106'
const GRAY = '#8096B2'
const TEXT_DIM = '#565656'
const PANEL_BORDER = '#E2E8F0'

const S = {
  panel: { background: 'white', border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  chip: (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.05em' }),
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
function relativeDate(iso) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d}d`
  if (d < 30) return `${Math.floor(d / 7)}w`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  return `${Math.floor(d / 365)}y`
}

// State name → 2-letter (us-atlas uses full names)
const STATE_NAME_TO_CODE = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
}

export default function MapView({ people, onSelectPerson }) {
  const [selectedState, setSelectedState] = useState(null)  // 2-letter code
  const [selectedMetro, setSelectedMetro] = useState(null)  // metro name
  const [hoveredState, setHoveredState] = useState(null)

  const geocoded = useMemo(() => people.filter(p => p.latitude && p.longitude), [people])
  const ungeocoded = people.length - geocoded.length

  // Group by state for choropleth
  const byState = useMemo(() => {
    const m = {}
    for (const p of geocoded) {
      if (!p.state_code) continue
      m[p.state_code] = (m[p.state_code] || 0) + 1
    }
    return m
  }, [geocoded])

  // Group by metro for marker clusters
  const byMetro = useMemo(() => {
    const m = {}
    for (const p of geocoded) {
      if (!p.metro_area) continue
      if (!m[p.metro_area]) m[p.metro_area] = { count: 0, lat: 0, lng: 0, people: [] }
      m[p.metro_area].count++
      m[p.metro_area].lat += p.latitude
      m[p.metro_area].lng += p.longitude
      m[p.metro_area].people.push(p)
    }
    // Average coords
    return Object.fromEntries(
      Object.entries(m).map(([k, v]) => [k, { ...v, lat: v.lat / v.count, lng: v.lng / v.count }])
    )
  }, [geocoded])

  // Right pane: people in selected state OR metro
  const paneList = useMemo(() => {
    if (selectedMetro) {
      return byMetro[selectedMetro]?.people || []
    }
    if (selectedState) {
      return geocoded.filter(p => p.state_code === selectedState)
    }
    return []
  }, [selectedState, selectedMetro, byMetro, geocoded])

  const orderedPane = useMemo(() => {
    return [...paneList].sort((a, b) => (b.contact_count || 0) - (a.contact_count || 0))
  }, [paneList])

  // Choropleth color scale
  const maxByState = Math.max(1, ...Object.values(byState))
  const stateColor = (code) => {
    const n = byState[code] || 0
    if (n === 0) return '#F1F5F9'
    if (selectedState === code) return NAVY
    const intensity = Math.min(1, n / maxByState)
    // Blend white → navy
    const r = Math.round(255 - (255 - 0x00) * intensity * 0.8)
    const g = Math.round(255 - (255 - 0x2C) * intensity * 0.8)
    const b = Math.round(255 - (255 - 0x77) * intensity * 0.8)
    return `rgb(${r},${g},${b})`
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>
      {/* Map */}
      <div style={{ ...S.panel, padding: 8, position: 'relative' }}>
        {ungeocoded > 0 && (
          <div style={{ position: 'absolute', top: 10, left: 14, fontSize: 11, color: GRAY, zIndex: 1 }}>
            {geocoded.length} located · {ungeocoded} pending location
          </div>
        )}
        <ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 1000 }} width={780} height={500} style={{ width: '100%', height: 'auto' }}>
          <Geographies geography="/us-states.json">
            {({ geographies }) => geographies.map(geo => {
              const stateName = geo.properties.name
              const code = STATE_NAME_TO_CODE[stateName]
              const count = byState[code] || 0
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={stateColor(code)}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  onClick={() => {
                    setSelectedState(prev => prev === code ? null : code)
                    setSelectedMetro(null)
                  }}
                  onMouseEnter={() => setHoveredState({ name: stateName, code, count })}
                  onMouseLeave={() => setHoveredState(null)}
                  style={{
                    default: { outline: 'none', cursor: count > 0 ? 'pointer' : 'default' },
                    hover: { fill: count > 0 ? BLUE : '#E2E8F0', outline: 'none', cursor: count > 0 ? 'pointer' : 'default' },
                    pressed: { fill: NAVY, outline: 'none' },
                  }}
                />
              )
            })}
          </Geographies>
          {/* Metro markers */}
          {Object.entries(byMetro).map(([metro, data]) => {
            const isSel = selectedMetro === metro
            const r = Math.max(5, Math.min(20, Math.sqrt(data.count) * 4))
            return (
              <Marker key={metro} coordinates={[data.lng, data.lat]}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedMetro(prev => prev === metro ? null : metro)
                  setSelectedState(null)
                }}
              >
                <circle r={r} fill={isSel ? GOLD : BLUE} fillOpacity={0.7} stroke="white" strokeWidth={1.5} style={{ cursor: 'pointer' }} />
                <text textAnchor="middle" y={3} fontSize={9} fontWeight={700} fill="white" pointerEvents="none">{data.count}</text>
              </Marker>
            )
          })}
        </ComposableMap>

        {/* Hover hint */}
        {hoveredState && (
          <div style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 12, color: NAVY, fontWeight: 600 }}>
            {hoveredState.name}: {hoveredState.count} {hoveredState.count === 1 ? 'person' : 'people'}
          </div>
        )}

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 10, right: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: GRAY }}>
          <div style={{ width: 16, height: 8, background: '#F1F5F9', borderRadius: 2 }} />
          <span>fewer</span>
          <div style={{ width: 16, height: 8, background: 'rgb(51,82,138)', borderRadius: 2 }} />
          <span>more</span>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: BLUE, marginLeft: 8 }} />
          <span>metro</span>
        </div>
      </div>

      {/* Right pane */}
      <div>
        <div style={{ ...S.panel, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {selectedMetro ? 'Metro' : selectedState ? 'State' : 'Selection'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>
            {selectedMetro || selectedState || 'Click a state or metro'}
          </div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>
            {orderedPane.length} {orderedPane.length === 1 ? 'person' : 'people'} · sorted by prominence
          </div>
        </div>

        <div style={{ ...S.panel, padding: 0, maxHeight: 540, overflowY: 'auto' }}>
          {orderedPane.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: GRAY, fontSize: 12 }}>
              <MapPin size={24} style={{ marginBottom: 6, opacity: 0.5 }} />
              <div>{selectedState || selectedMetro ? 'No people here.' : 'Click a state or metro to see who you know there.'}</div>
            </div>
          ) : (
            orderedPane.map(p => (
              <div key={p.id}
                onClick={() => onSelectPerson(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderBottom: `1px solid ${PANEL_BORDER}`, cursor: 'pointer',
                }}
              >
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(p.full_name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {initials(p.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.pinned && <Pin size={10} fill={GOLD} color={GOLD} style={{ marginRight: 4, verticalAlign: -1 }} />}
                    {p.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: GRAY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.company || p.primary_email}
                    {p.city && <> · {p.city}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ ...S.chip('#DBEAFE', '#1D4ED8') }}>{p.contact_count || 0}</span>
                  <span style={{ fontSize: 10, color: GRAY }}>{relativeDate(p.last_contact_at)}</span>
                </div>
                <ChevronRight size={14} color={GRAY} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
