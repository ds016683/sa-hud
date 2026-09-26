// The River's two ceremonies, shown over the landing page.
//   HaulOverlay: after Run Update. Everything newly banked since the last run
//   drops in one at a time: completions, badges struck, miles made.
//   MintingOverlay: after Close the Day. The day becomes canon: badges one by
//   one, then the miles poured into the river and the new total.
import { useEffect, useState } from 'react'
import { BADGES, RIVER_TOTAL_MILES } from '../../constants/collection'
import BadgeMedallion from '../BadgeArt'
import { GOLD_BRIGHT, PERIWINKLE, INK2, MONO, SERIF } from './canon'

const fmt = (m) => (Math.round((Number(m) || 0) * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })
const label = (id) => (BADGES[id] || {}).label || id

function BadgeRow({ id, evidence, delayMs = 0 }) {
  const B = BADGES[id] || {}
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', padding: '12px 16px', marginBottom: 8, borderRadius: 12,
      background: 'rgba(248,199,97,0.05)', border: '1px solid rgba(248,199,97,0.35)', animation: `haulDrop 520ms ${delayMs}ms cubic-bezier(0.2,0.9,0.3,1) both`,
    }}>
      <BadgeMedallion id={id} size={50} glow />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: MONO, fontSize: 9, letterSpacing: '1.6px', color: GOLD_BRIGHT }}>BADGE STRUCK · {fmt(B.miles)} MI</span>
        <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: '#fff' }}>{label(id)}</span>
        {B.lore && <span style={{ display: 'block', fontSize: 12, color: 'rgba(234,241,248,0.6)', fontStyle: 'italic' }}>{B.lore}</span>}
        {evidence && <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(248,199,97,0.75)', marginTop: 3 }}>{evidence}</span>}
      </span>
    </div>
  )
}

export function HaulOverlay({ haul, onClose }) {
  const drops = [
    ...(haul.items || []).map(t => ({ kind: 'item', text: t })),
    ...(haul.badges || []).map(b => ({ kind: 'badge', id: b })),
  ]
  const empty = drops.length === 0
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, cursor: 'pointer', background: 'rgba(8,20,32,0.94)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 620, width: '100%', maxHeight: '84vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: MONO, color: PERIWINKLE, letterSpacing: '2.2px', fontSize: 10, textAlign: 'center' }}>SINCE {String(haul.sinceLabel || 'this morning').toUpperCase()}</div>
        <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 500, letterSpacing: '-0.01em', color: '#fff', textAlign: 'center', margin: '6px 0 26px', animation: 'haulDrop 500ms cubic-bezier(0.2,0.9,0.3,1) both' }}>
          {empty ? 'Quiet Water' : 'The Haul'}
        </div>
        {empty && <div style={{ textAlign: 'center', color: INK2, fontSize: 14.5, lineHeight: 1.6, animation: 'haulDrop 500ms 150ms both' }}>Nothing new banked since the last check-in. Steady is a state, not a failure.</div>}
        {drops.map((d, i) => d.kind === 'badge'
          ? <BadgeRow key={`b${i}`} id={d.id} evidence={(haul.badge_evidence || {})[d.id]} delayMs={180 + i * 260} />
          : (
            <div key={`i${i}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', marginBottom: 8, borderRadius: 10, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.10)', animation: `haulDrop 460ms ${180 + i * 260}ms cubic-bezier(0.2,0.9,0.3,1) both` }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: GOLD_BRIGHT, boxShadow: '0 0 10px rgba(248,199,97,0.5)' }} />
              <span style={{ fontSize: 14, lineHeight: 1.5, color: '#EAF1F8' }}>{d.text}</span>
            </div>
          ))}
        <div style={{ fontFamily: MONO, textAlign: 'center', marginTop: 24, color: 'rgba(234,241,248,0.55)', fontSize: 10, letterSpacing: '1.8px', animation: `haulDrop 460ms ${240 + drops.length * 260}ms both` }}>
          {haul.milesDelta > 0 ? `+${fmt(haul.milesDelta)} MILES THIS RUN · ` : ''}{fmt(haul.milesToday)} MILES TODAY · {fmt(haul.total)} BANKED
          <span style={{ display: 'block', marginTop: 10, color: 'rgba(234,241,248,0.35)' }}>CLICK ANYWHERE TO BANK IT</span>
        </div>
      </div>
    </div>
  )
}

export function MintingOverlay({ mint, onDone }) {
  const [stage, setStage] = useState(0)
  const badges = mint.badges || []
  const milesStage = 1 + badges.length
  const finalStage = milesStage + 1
  useEffect(() => {
    if (stage >= finalStage) return
    const delay = stage === 0 ? 1600 : stage < milesStage ? 1800 : 2200
    const t = setTimeout(() => setStage(s => s + 1), delay)
    return () => clearTimeout(t)
  }, [stage, milesStage, finalStage])
  const dayLabel = new Date(mint.day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const pct = Math.min(100, (Number(mint.total) || 0) / RIVER_TOTAL_MILES * 100)
  return (
    <div onClick={() => stage >= finalStage ? onDone() : setStage(s => Math.min(finalStage, s + 1))} style={{ position: 'fixed', inset: 0, zIndex: 300, cursor: 'pointer', background: 'radial-gradient(ellipse at 50% 35%, #16324A 0%, #0A1B2B 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, color: PERIWINKLE, letterSpacing: '3px', fontSize: 10, animation: 'haulDrop 600ms both' }}>CLOSING THE DAY</div>
        <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 500, letterSpacing: '-0.01em', color: '#fff', margin: '8px 0 34px', animation: 'haulDrop 700ms 200ms both' }}>{dayLabel}</div>
        {stage >= 1 && badges.slice(0, Math.min(stage, badges.length)).map((id) => <BadgeRow key={id} id={id} evidence={(mint.badge_evidence || {})[id]} />)}
        {stage >= 1 && badges.length === 0 && <div style={{ color: INK2, fontSize: 14, marginBottom: 16, animation: 'haulDrop 500ms both' }}>No badges struck today. The river is patient.</div>}
        {stage >= milesStage && (
          <div style={{ margin: '26px 0 8px', animation: 'haulDrop 700ms both' }}>
            <span style={{ fontFamily: SERIF, fontSize: 84, fontWeight: 500, lineHeight: 1, color: GOLD_BRIGHT, textShadow: '0 0 34px rgba(248,199,97,0.45)' }}>{fmt(mint.miles)}</span>
            <div style={{ fontFamily: MONO, color: GOLD_BRIGHT, letterSpacing: '2px', fontSize: 11, marginTop: 10 }}>MILES TRAVELED DOWN THE RIVER</div>
            <div style={{ margin: '18px auto 0', maxWidth: 380, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #E6B54F, #F8C761)', transition: 'width 1.2s ease-out' }} />
            </div>
            <div style={{ fontFamily: MONO, color: 'rgba(234,241,248,0.5)', letterSpacing: '1.6px', fontSize: 9.5, marginTop: 8 }}>{fmt(mint.total)} OF {RIVER_TOTAL_MILES.toLocaleString()} · {fmt(RIVER_TOTAL_MILES - (Number(mint.total) || 0))} TO CALM WATER</div>
          </div>
        )}
        {stage >= finalStage && (
          <div style={{ fontFamily: MONO, color: 'rgba(234,241,248,0.55)', letterSpacing: '2px', fontSize: 10, marginTop: 28, animation: 'haulDrop 600ms both' }}>
            THE DAY IS CANON<br /><span style={{ color: 'rgba(234,241,248,0.35)', display: 'inline-block', marginTop: 8 }}>CLICK TO BEGIN ANEW</span>
          </div>
        )}
      </div>
    </div>
  )
}
