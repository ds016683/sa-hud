import { useState, useEffect } from 'react'
import { Activity, Target, Zap, Brain, Clock, TrendingUp } from 'lucide-react'

const S = {
  page: { maxWidth: 1000, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' },
  header: { marginBottom: 24 },
  h1: { fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 },
  sub: { fontSize: 13, color: '#8096B2', margin: '3px 0 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  card: { background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: '#8096B2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 },
  cardValue: { fontSize: 28, fontWeight: 700, color: '#002C77', lineHeight: 1.2 },
  cardSub: { fontSize: 12, color: '#8096B2', marginTop: 4 },
  section: { background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16 },
  sectionHeader: { fontSize: 13, fontWeight: 700, color: '#002C77', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' },
  rowLabel: { fontSize: 14, color: '#334E85', fontFamily: 'Arial, Helvetica, sans-serif' },
  rowValue: { fontSize: 13, color: '#8096B2', fontFamily: 'Arial, Helvetica, sans-serif' },
  badge: (color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: color + '15', color: color, border: `1px solid ${color}40` }),
  sliderWrap: { marginBottom: 12 },
  sliderLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  sliderName: { fontSize: 13, color: '#002C77', fontFamily: 'Arial, Helvetica, sans-serif' },
  sliderVal: { fontSize: 12, fontWeight: 700, color: '#009DE0', fontFamily: 'Arial, Helvetica, sans-serif' },
  track: { height: 6, background: '#EFF4FA', borderRadius: 3, overflow: 'hidden' },
  fill: (pct, color) => ({ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }),
}

const ATTRIBUTES = [
  { id: 'perception',       label: 'Perception',       tier: 'S+', value: 95, color: '#DC2626' },
  { id: 'will',             label: 'Will',              tier: 'S',  value: 90, color: '#EA580C' },
  { id: 'agency',           label: 'Agency',            tier: 'A+', value: 85, color: '#D97706' },
  { id: 'creative_entropy', label: 'Creative Entropy',  tier: 'A+', value: 85, color: '#D97706' },
  { id: 'relational',       label: 'Relational',        tier: 'A',  value: 75, color: '#16A34A' },
  { id: 'endurance',        label: 'Endurance',         tier: 'C',  value: 30, color: '#8096B2' },
]

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { label: 'Morning Orientation', emoji: 'ðŸŒ…' }
  if (h >= 12 && h < 17) return { label: 'Mid-Day Status', emoji: 'â˜€ï¸' }
  if (h >= 17 && h < 21) return { label: 'Evening Integration', emoji: 'ðŸŒ†' }
  return { label: 'Night Watch', emoji: 'ðŸŒ™' }
}

export default function HUD() {
  const [time, setTime] = useState(new Date())
  const [sovereignty, setSovereignty] = useState(72)
  const { label, emoji } = getTimeOfDay()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>Command Center â€” David Smith</h1>
        <p style={S.sub}>{emoji} {label} &nbsp;Â·&nbsp; {dateStr} &nbsp;Â·&nbsp; {timeStr}</p>
      </div>

      {/* Stat cards */}
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardLabel}><Target size={13} /> Sovereignty Level</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 8 }}>
            <div style={S.cardValue}>{sovereignty}</div>
            <div style={{ fontSize: 13, color: '#8096B2', paddingBottom: 4 }}>/ 100</div>
          </div>
          <div style={{ height: 6, background: '#EFF4FA', borderRadius: 3, overflow: 'hidden' }}>
            <div style={S.fill(sovereignty, sovereignty >= 70 ? '#00968F' : sovereignty >= 40 ? '#F59E0B' : '#EF4444')} />
          </div>
          <input type="range" min="0" max="100" value={sovereignty} onChange={e => setSovereignty(Number(e.target.value))}
            style={{ width: '100%', marginTop: 8, accentColor: '#009DE0' }} />
        </div>

        <div style={S.card}>
          <div style={S.cardLabel}><Zap size={13} /> Current Phase</div>
          <div style={{ ...S.cardValue, fontSize: 18, lineHeight: 1.4 }}>Era 4</div>
          <div style={S.cardSub}>Insurgent Systems Architect</div>
          <div style={{ marginTop: 8 }}>
            <span style={S.badge('#009DE0')}>Platform Leverage</span>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardLabel}><Clock size={13} /> Loop Status</div>
          <div style={{ ...S.cardValue, fontSize: 18, color: '#00968F' }}>Open Water</div>
          <div style={S.cardSub}>Calm-generated meaning</div>
          <div style={{ marginTop: 8 }}>
            <span style={S.badge('#00968F')}>Steel Cable Active</span>
          </div>
        </div>
      </div>

      {/* Core Attributes */}
      <div style={S.section}>
        <div style={S.sectionHeader}><Brain size={15} /> Core Attributes</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          {ATTRIBUTES.map(attr => (
            <div key={attr.id} style={S.sliderWrap}>
              <div style={S.sliderLabel}>
                <span style={S.sliderName}>
                  <span style={{ display: 'inline-block', width: 26, height: 16, borderRadius: 4, background: attr.color + '20', color: attr.color, fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: '16px', marginRight: 6 }}>{attr.tier}</span>
                  {attr.label}
                </span>
                <span style={S.sliderVal}>{attr.value}</span>
              </div>
              <div style={S.track}>
                <div style={S.fill(attr.value, attr.color)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Where Are You / Shadow Monitor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.section}>
          <div style={S.sectionHeader}><Activity size={15} /> Where Are You</div>
          {[
            { label: 'Emotional State', value: 'Regulated', color: '#00968F' },
            { label: 'Energy Level', value: 'High Focus', color: '#009DE0' },
            { label: 'Primary Mode', value: 'Builder', color: '#002C77' },
            { label: 'Engagement', value: 'Fully Present', color: '#00968F' },
          ].map(item => (
            <div key={item.label} style={S.row}>
              <span style={S.rowLabel}>{item.label}</span>
              <span style={S.badge(item.color)}>{item.value}</span>
            </div>
          ))}
        </div>

        <div style={S.section}>
          <div style={S.sectionHeader}><TrendingUp size={15} /> Active Context</div>
          {[
            { label: 'Priority Track', value: 'Q2 Deployment' },
            { label: 'Key Initiative', value: 'SNMI' },
            { label: 'Platform Focus', value: 'SA HUD + MMA' },
            { label: 'Personal Work', value: 'Steel Cable Phase' },
          ].map(item => (
            <div key={item.label} style={S.row}>
              <span style={S.rowLabel}>{item.label}</span>
              <span style={S.rowValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
