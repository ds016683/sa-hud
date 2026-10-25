// Analytics (David 10/25): the composition of a day's miles, and the same
// data longitudinally. Reads miles_ledger. Four families in a fixed order
// (Missions, Day, Body, Other), each a hue validated against the navy surface.
// Day view: the hero number, a stacked composition bar, the badge rows, and
// the evidence behind any click. Span view: stacked bars per day; click one
// to read that day. Animations are CSS: bars grow on load and on change.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { INK, INK2, GRAY, PANEL_BORDER, PANEL_BG, MONO, SERIF, LABEL, alpha, chiToday, fmtDay, fmtTime } from './river/canon'

export const FAMILIES = [
  { id: 'missions', label: 'Missions', color: '#B78223', badges: ['main-mission', 'mission-task', 'mythic', 'mythic-task', 'contract', 'bounty', 'side-mission', 'impromptu'] },
  { id: 'day',      label: 'The Day', color: '#3F86C8', badges: ['full-day', 'work-horse', 'clean-close', 'toastmaster', 'clean-slack', 'bill-pay', 'cartographer', 'maintenance-bundle'] },
  { id: 'body',     label: 'Body',    color: '#2F9C72', badges: ['exercise', 'lift', 'sleep', 'hygiene', 'hygiene-item', 'regimen', 'dose', 'discomforter', 'devotional'] },
  { id: 'other',    label: 'Other',   color: '#8A74D4', badges: [] },
]
const familyOf = (badge) => FAMILIES.find(f => f.badges.includes(badge)) || FAMILIES[3]
const BADGE_LABEL = { 'main-mission': 'Main Mission Complete', 'mission-task': 'Milestone Closed', 'mythic': 'Mythic', 'mythic-task': 'Mythic Gate', 'contract': 'Contract', 'bounty': 'Bounty', 'side-mission': 'Side Mission', 'impromptu': 'Ad Hoc', 'full-day': 'Full Day', 'work-horse': 'Work Horse', 'clean-close': 'Clean Close', 'toastmaster': 'Toastmaster', 'clean-slack': 'Clean Slack', 'bill-pay': 'Bill Pay', 'cartographer': 'Cartographer', 'maintenance-bundle': 'Maintenance', 'exercise': 'Exercise', 'lift': 'Lift', 'sleep': 'Sleep', 'hygiene': 'Hygiene', 'hygiene-item': 'Hygiene Item', 'regimen': 'On Regimen', 'dose': 'Dose', 'discomforter': 'Discomforter', 'devotional': 'Devotional' }
const labelOf = (b) => BADGE_LABEL[b] || String(b || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const SPANS = [{ id: 'day', label: 'Day', days: 1 }, { id: 'w2', label: '14 Days', days: 14 }, { id: 'm1', label: '30 Days', days: 30 }, { id: 'q1', label: '90 Days', days: 90 }]
const fmt = (n) => Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
const shiftDay = (day, n) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA') }
const shortDay = (day) => new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const pill = (on, color) => ({ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? (color || LABEL) : PANEL_BORDER}`, background: on ? alpha(color || LABEL, 15) : 'transparent', color: on ? INK : INK2 })

function useLedger(fromDay) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let on = true
    supabase.from('miles_ledger').select('id,day,badge,key,miles,evidence,source,awarded_at').gte('day', fromDay).order('day', { ascending: true }).order('id', { ascending: true }).limit(5000)
      .then(({ data }) => { if (on) setRows(Array.isArray(data) ? data.map(r => ({ ...r, miles: Number(r.miles) || 0 })) : []) })
    return () => { on = false }
  }, [fromDay])
  return rows
}

// The stacked composition of one set of rows, in family order.
const compose = (rows) => {
  const total = rows.reduce((s, r) => s + r.miles, 0)
  const parts = FAMILIES.map(f => ({ ...f, miles: rows.filter(r => familyOf(r.badge).id === f.id).reduce((s, r) => s + r.miles, 0) })).filter(p => p.miles > 0)
  return { total, parts }
}

function Legend({ parts, picked, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {FAMILIES.map(f => { const p = parts.find(x => x.id === f.id); const on = picked === f.id; return (
        <button key={f.id} onClick={() => onPick(on ? null : f.id)} style={{ ...pill(on, f.color), display: 'inline-flex', alignItems: 'center', gap: 7, opacity: p ? 1 : 0.45 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: f.color, flexShrink: 0 }} />{f.label}{p ? <span style={{ color: INK2, marginLeft: 2 }}>{fmt(p.miles)}</span> : null}
        </button>
      ) })}
    </div>
  )
}

// A thin stacked bar with 2px surface gaps and rounded ends; grows on change.
function CompositionBar({ parts, total, picked, onPick, ready }) {
  return (
    <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: alpha(INK, 6), gap: 2 }}>
      {parts.map(p => { const w = total ? (p.miles / total) * 100 : 0; return (
        <div key={p.id} onClick={() => onPick(picked === p.id ? null : p.id)} title={`${p.label}: ${fmt(p.miles)} miles`}
          style={{ width: ready ? `${w}%` : '0%', background: p.color, opacity: picked && picked !== p.id ? 0.35 : 1, cursor: 'pointer', transition: `width .7s ${EASE}, opacity .2s` }} />
      ) })}
    </div>
  )
}

function BadgeRows({ rows, picked, onOpen, open, ready }) {
  const byBadge = useMemo(() => {
    const m = new Map()
    for (const r of rows) { if (picked && familyOf(r.badge).id !== picked) continue; const k = r.badge; if (!m.has(k)) m.set(k, { badge: k, miles: 0, rows: [] }); const e = m.get(k); e.miles += r.miles; e.rows.push(r) }
    return [...m.values()].sort((a, b) => b.miles - a.miles)
  }, [rows, picked])
  const max = Math.max(1, ...byBadge.map(b => b.miles))
  if (!byBadge.length) return <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>Nothing minted{picked ? ' in that family' : ''} on this day.</div>
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      {byBadge.map(b => { const f = familyOf(b.badge); const isOpen = open === b.badge; return (
        <div key={b.badge}>
          <div onClick={() => onOpen(isOpen ? null : b.badge)} style={{ display: 'grid', gridTemplateColumns: '190px 1fr 64px', gap: 12, alignItems: 'center', padding: '7px 8px', borderRadius: 8, cursor: 'pointer', background: isOpen ? alpha(f.color, 10) : 'transparent' }}>
            <div style={{ fontSize: 13.5, color: INK, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, flexShrink: 0 }} />{labelOf(b.badge)}<span style={{ fontFamily: MONO, fontSize: 10, color: GRAY }}>×{b.rows.length}</span></div>
            <div style={{ height: 8, borderRadius: 4, background: alpha(INK, 5), overflow: 'hidden' }}><div style={{ height: '100%', width: ready ? `${(b.miles / max) * 100}%` : 0, background: f.color, borderRadius: 4, transition: `width .7s ${EASE}` }} /></div>
            <div style={{ fontFamily: SERIF, fontSize: 17, color: INK, textAlign: 'right' }}>{fmt(b.miles)}</div>
          </div>
          {isOpen && (
            <div style={{ margin: '2px 0 8px 28px', borderLeft: `2px solid ${alpha(f.color, 50)}`, paddingLeft: 12, display: 'grid', gap: 4 }}>
              {b.rows.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 13, color: INK2, lineHeight: 1.5 }}>
                  <span style={{ fontFamily: SERIF, color: INK, minWidth: 34, textAlign: 'right' }}>{fmt(r.miles)}</span>
                  <span style={{ flex: 1 }}>{r.evidence || labelOf(r.badge)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, whiteSpace: 'nowrap' }}>{r.source}{r.awarded_at ? ` · ${fmtTime(r.awarded_at)}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) })}
    </div>
  )
}

// Stacked bars per day. Thin marks, 2px gaps between segments, bars grow from the baseline.
function SpanChart({ days, byDay, picked, selected, onSelect, ready }) {
  const [hover, setHover] = useState(null)
  const H = 190, W = 900, padL = 34, padB = 22, gap = days.length > 40 ? 2 : days.length > 20 ? 4 : 8
  const inner = W - padL - 8
  const bw = Math.max(3, (inner - gap * (days.length - 1)) / days.length)
  const max = Math.max(10, ...days.map(d => (byDay.get(d)?.total || 0)))
  const y = (v) => H - padB - (v / max) * (H - padB - 12)
  const ticks = [0, Math.round(max / 2), Math.round(max)]
  const labelEvery = days.length > 40 ? 15 : days.length > 20 ? 5 : 2
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map(t => <g key={t}><line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke={alpha(INK, 8)} strokeWidth="1" /><text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fontFamily="var(--font-label, sans-serif)" fill={GRAY}>{t}</text></g>)}
        {days.map((d, i) => {
          const comp = byDay.get(d); const x = padL + i * (bw + gap); let base = 0
          const isSel = selected === d
          return (
            <g key={d} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(d)} style={{ cursor: 'pointer' }}>
              <rect x={x - gap / 2} y={10} width={bw + gap} height={H - padB - 10} fill={isSel ? alpha(INK, 5) : 'transparent'} />
              {(comp?.parts || []).map(p => {
                const h0 = (p.miles / max) * (H - padB - 12); const yTop = y(base + p.miles); base += p.miles
                const dim = picked && picked !== p.id
                return <rect key={p.id} x={x} y={ready ? yTop : y(0)} width={bw} height={ready ? Math.max(0, h0 - 2) : 0} rx={Math.min(3, bw / 2)} fill={p.color} opacity={dim ? 0.3 : (hover && hover !== d) ? 0.75 : 1} style={{ transition: `y .7s ${EASE}, height .7s ${EASE}, opacity .2s` }} />
              })}
              {(i % labelEvery === 0 || i === days.length - 1) && <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fontFamily="var(--font-label, sans-serif)" fill={isSel ? INK : GRAY}>{shortDay(d)}</text>}
            </g>
          )
        })}
      </svg>
      {hover && byDay.get(hover) && (
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: '10px 12px', pointerEvents: 'none', minWidth: 180 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: LABEL }}>{fmtDay(hover)}</div>
          <div style={{ fontFamily: SERIF, fontSize: 22, color: INK, margin: '2px 0 6px' }}>{fmt(byDay.get(hover).total)} <span style={{ fontSize: 12, color: INK2 }}>miles</span></div>
          {byDay.get(hover).parts.map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 12.5, color: INK2 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />{p.label}</span><span style={{ color: INK }}>{fmt(p.miles)}</span></div>)}
        </div>
      )}
    </div>
  )
}

export default function MilesAnalytics({ day, onDay }) {
  const [span, setSpan] = useState('day')
  const [picked, setPicked] = useState(null)
  const [open, setOpen] = useState(null)
  const [ready, setReady] = useState(false)
  const spanDef = SPANS.find(s => s.id === span)
  const fromDay = useMemo(() => shiftDay(day, -(Math.max(spanDef.days, 1) - 1)), [day, spanDef])
  const rows = useLedger(shiftDay(day, -89))
  useEffect(() => { setReady(false); const t = setTimeout(() => setReady(true), 30); return () => clearTimeout(t) }, [day, span, rows])
  const today = chiToday()
  const days = useMemo(() => { const out = []; for (let d = fromDay; d <= day; d = shiftDay(d, 1)) out.push(d); return out }, [fromDay, day])
  const byDay = useMemo(() => { const m = new Map(); for (const d of days) m.set(d, compose((rows || []).filter(r => r.day === d))); return m }, [rows, days])
  const dayRows = useMemo(() => (rows || []).filter(r => r.day === day), [rows, day])
  const comp = byDay.get(day) || { total: 0, parts: [] }
  const spanTotal = days.reduce((s, d) => s + (byDay.get(d)?.total || 0), 0)
  const spanParts = compose((rows || []).filter(r => r.day >= fromDay && r.day <= day)).parts
  const ctl = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', ...extra })
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => onDay(shiftDay(day, -1))} style={ctl()}><ChevronLeft size={12} /></button>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK, minWidth: 170, textAlign: 'center' }}>{fmtDay(day)}{day === today ? ' · today' : ''}</span>
        <button onClick={() => onDay(shiftDay(day, 1))} disabled={day >= today} style={{ ...ctl(), opacity: day >= today ? 0.4 : 1 }}><ChevronRight size={12} /></button>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'inline-flex', border: `1px solid ${PANEL_BORDER}`, borderRadius: 999, overflow: 'hidden' }}>
          {SPANS.map(s => <button key={s.id} onClick={() => setSpan(s.id)} style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 13px', border: 'none', cursor: 'pointer', background: span === s.id ? alpha(LABEL, 15) : 'transparent', color: span === s.id ? INK : INK2 }}>{s.label}</button>)}
        </div>
      </div>

      {rows === null && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY }}>Reading the River</div>}

      {rows && span === 'day' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1, color: INK }}>{fmt(comp.total)}</div>
            <div style={{ fontSize: 13, color: INK2 }}>miles minted{comp.total ? `, ${dayRows.length} award${dayRows.length === 1 ? '' : 's'}` : ''}</div>
            <span style={{ flex: 1 }} />
            <Legend parts={comp.parts} picked={picked} onPick={setPicked} />
          </div>
          <CompositionBar parts={comp.parts} total={comp.total} picked={picked} onPick={setPicked} ready={ready} />
          <BadgeRows rows={dayRows} picked={picked} open={open} onOpen={setOpen} ready={ready} />
        </div>
      )}

      {rows && span !== 'day' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1, color: INK }}>{fmt(spanTotal)}</div>
            <div style={{ fontSize: 13, color: INK2 }}>miles over {spanDef.days} days, {fmt(Math.round(spanTotal / spanDef.days * 10) / 10)} a day</div>
            <span style={{ flex: 1 }} />
            <Legend parts={spanParts} picked={picked} onPick={setPicked} />
          </div>
          <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: '14px 14px 8px' }}>
            <SpanChart days={days} byDay={byDay} picked={picked} selected={day} onSelect={onDay} ready={ready} />
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: LABEL, marginBottom: 8 }}>{fmtDay(day)} · {fmt(comp.total)} miles · click a bar to read another day</div>
            <CompositionBar parts={comp.parts} total={comp.total} picked={picked} onPick={setPicked} ready={ready} />
            <div style={{ marginTop: 10 }}><BadgeRows rows={dayRows} picked={picked} open={open} onOpen={setOpen} ready={ready} /></div>
          </div>
        </div>
      )}
    </div>
  )
}
