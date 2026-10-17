// The Activity Log (David, 10/14): the vertical timeline of the day, the same
// record the Activity page kept, now a popup from the Board with what went on
// and off the Loadout folded in.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react'
import { fetchDay, build, KINDS, shiftDay } from '../../lib/activity'
import { INK, GRAY, PANEL_BORDER, GREEN, MONO, SERIF, S, Label, chiToday, fmtTime, fmtDay, LABEL } from './canon'

export const KindChip = ({ kind }) => {
  const c = (KINDS[kind] || KINDS.Activity).color
  return <span style={{ ...S.chip('transparent', c), border: `1px solid ${c}55`, fontFamily: MONO, fontWeight: 600, fontSize: 9, letterSpacing: '1px', padding: '2px 7px' }}>{kind}</span>
}

export function TimelineRow({ r, last }) {
  const c = (KINDS[r.kind] || KINDS.Activity).color
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 14px 1fr', gap: 10, alignItems: 'start' }}>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: GRAY, letterSpacing: '0.6px', paddingTop: 5, textAlign: 'right' }}>{fmtTime(r.at)}</div>
      <div style={{ position: 'relative', alignSelf: 'stretch' }}>
        <div style={{ position: 'absolute', left: 6, top: 8, width: 6, height: 6, borderRadius: 99, background: c, boxShadow: `0 0 0 3px ${c}22` }} />
        {!last && <div style={{ position: 'absolute', left: 8.5, top: 18, bottom: -6, width: 1, background: PANEL_BORDER }} />}
      </div>
      <div style={{ paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <KindChip kind={r.kind} />
          {r.documented && <span title="Documented in Granola" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GREEN, textTransform: 'uppercase' }}><Check size={11} /> documented</span>}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: INK, marginTop: 5 }}>{r.text}</div>
        {r.meta && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: GRAY, marginTop: 2 }}>{r.meta}</div>}
      </div>
    </div>
  )
}

const navBtn = { width: 30, height: 30, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }

export function useDayRecord(day) {
  const [raw, setRaw] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => { let alive = true; fetchDay(day).then(r => { if (alive) setRaw({ ...r, forDay: day, fetchedAt: Date.now() }) }); return () => { alive = false } }, [day, tick])
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 60_000); return () => clearInterval(id) }, [])
  const view = useMemo(() => raw && raw.forDay === day ? build(raw, day, raw.fetchedAt) : null, [raw, day])
  return { view, loading: !raw || raw.forDay !== day, refresh: () => setTick(t => t + 1) }
}

export function Timeline({ view, loading }) {
  if (loading && !view) return <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, padding: '18px 0' }}>Reading the pipes</div>
  if (view && view.rows.length === 0) return (
    <div style={{ padding: '26px 0 16px' }}>
      <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>Quiet so far.</div>
      <div style={{ fontSize: 12.5, color: GRAY, marginTop: 4 }}>The record fills as the day moves.</div>
    </div>
  )
  // Newest at the top (David, 10/14): the record reads down into the past.
  const rows = [...view.rows].reverse()
  return <div style={{ paddingTop: 6 }}>{rows.map((r, i) => <TimelineRow key={i} r={r} last={i === rows.length - 1} />)}</div>
}

export default function ActivityLogModal({ onClose, initialDay = null }) {
  const [day, setDay] = useState(initialDay || chiToday())
  const { view, loading } = useDayRecord(day)
  const today = chiToday()
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 280, background: 'rgba(5,16,28,0.8)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: '#0F2338', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <Label style={{ marginBottom: 2 }}>Activity Log</Label>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, color: '#fff' }}>{day === today ? 'Today' : fmtDay(day)}<span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GRAY, marginLeft: 10 }}>{view ? `${view.rows.length} entr${view.rows.length === 1 ? 'y' : 'ies'}` : ''}</span></div>
          </div>
          <button onClick={() => setDay(d => shiftDay(d, -1))} title="Previous day" style={navBtn}><ChevronLeft size={14} /></button>
          <button onClick={() => setDay(d => shiftDay(d, 1))} disabled={day >= today} title="Next day" style={{ ...navBtn, opacity: day >= today ? 0.4 : 1 }}><ChevronRight size={14} /></button>
          <button onClick={onClose} title="Close" style={navBtn}><XIcon size={14} /></button>
        </div>
        <Timeline view={view} loading={loading} />
      </div>
    </div>
  )
}
