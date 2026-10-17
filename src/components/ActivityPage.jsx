// ACTIVITY. A discrete running record of what David did on a selected day,
// merged client-side from the pipes (emails sent, meetings held, Harvest hours,
// Side and Main Missions closed, daily logs, words said to Lumen), sorted by
// time, with a vertical TODAY dashboard beside it. Refreshes every 60s.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react'
import { fetchDay, build, KINDS, shiftDay } from '../lib/activity'
import { KindChip } from './river/ActivityLog'
import {
  INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, PERIWINKLE, PURPLE, GREEN, RED, MONO, SERIF,
  S, Eyebrow, Label, Stat, Panel, chiToday, fmtTime, fmtDay, LABEL } from './river/canon'

// The record itself is built in lib/activity (shared with the Board's Activity Log popup).

// ---- UI
function DayControl({ day, onPrev, onNext, canNext }) {
  const btn = (disabled) => ({
    width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent',
    color: disabled ? GRAY : INK, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1,
  })
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button onClick={onPrev} style={btn(false)} aria-label="Previous day"><ChevronLeft size={14} /></button>
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', color: INK2, minWidth: 220, textAlign: 'center' }}>{fmtDay(day)}</span>
      <button onClick={canNext ? onNext : undefined} style={btn(!canNext)} aria-label="Next day" disabled={!canNext}><ChevronRight size={14} /></button>
    </div>
  )
}

// What a number is made of: the rows behind a stat or a kind, with the table
// each one came from and the fields that fed it. Info and QC in one place.
function RecordModal({ title, subtitle, items, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 250, cursor: 'pointer',
      background: 'rgba(8,20,32,0.88)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 640, width: '100%', maxHeight: '82vh', overflowY: 'auto', cursor: 'default',
        background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ marginBottom: 6 }}>What feeds this</Eyebrow>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XIcon size={14} />
          </button>
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.length === 0 && <div style={{ fontSize: 12.5, color: GRAY }}>No records behind this yet.</div>}
          {items.map((r, i) => (
            <div key={i} style={{ border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: GRAY, letterSpacing: '0.6px' }}>{fmtTime(r.at)}</span>
                <KindChip kind={r.kind} />
                {r.documented && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GREEN, textTransform: 'uppercase' }}><Check size={11} /> documented</span>}
                <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: LABEL, textTransform: 'uppercase' }}>{r.src || 'derived'}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: INK, marginTop: 6 }}>{r.text}</div>
              {r.meta && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: GRAY, marginTop: 2 }}>{r.meta}</div>}
              {r.fields && (
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 12, rowGap: 3 }}>
                  {Object.entries(r.fields).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', color: GRAY }}>{k}</span>
                      <span style={{ fontSize: 11.5, color: INK2, lineHeight: 1.45, wordBreak: 'break-word' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Label style={{ marginBottom: 0 }}>{items.length} record{items.length === 1 ? '' : 's'}</Label>
        </div>
      </div>
    </div>
  )
}

const Clickable = ({ onClick, children, title }) => (
  <div role="button" tabIndex={0} title={title || 'Show the records behind this'} onClick={onClick} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    style={{ cursor: 'pointer', borderRadius: 8, margin: '-4px -6px', padding: '4px 6px', transition: 'background 120ms' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
    {children}
  </div>
)

export default function ActivityPage() {
  const [day, setDay] = useState(chiToday)
  const [raw, setRaw] = useState(null)
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(null) // { title, subtitle, items }

  useEffect(() => {
    let alive = true
    fetchDay(day).then(r => { if (alive) setRaw({ ...r, forDay: day, fetchedAt: Date.now() }) })
    return () => { alive = false }
  }, [day, tick])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const view = useMemo(() => raw && raw.forDay === day ? build(raw, day, raw.fetchedAt) : null, [raw, day])
  const today = chiToday()
  const canNext = day < today

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <Eyebrow>Activity</Eyebrow>
          <h1 style={S.h1}>The record</h1>
          <p style={S.sub}>what was done · in the order it was done</p>
        </div>
        <DayControl day={day} onPrev={() => setDay(d => shiftDay(d, -1))} onNext={() => setDay(d => shiftDay(d, 1))} canNext={canNext} />
      </div>

      <div style={{ fontSize: 12.5, color: GRAY, marginBottom: 14 }}>The timeline moved to the Board: the Activity Log button under the Loadout. The day's numbers stay here.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <Panel title="Today" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gap: 18 }}>
              <Clickable onClick={() => view && setOpen({ title: 'Meetings held', subtitle: 'Calendar events that have started, all-day items excluded', items: view.drills.held })}>
                <Stat v={view ? view.stats.held : '·'} l="Meetings held" />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Meetings documented', subtitle: 'Granola notes matched to a held meeting by title', items: view.drills.documented })}>
                <Stat v={view ? view.stats.documented : '·'} l="Meetings documented" color={view && view.stats.documented > 0 ? GREEN : '#fff'} />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Hours on pursuits', subtitle: 'Third Horizon work (Harvest) + personal Side Mission clocks + exercise', items: view.drills.pursuits })}>
                <Stat v={view ? `${view.stats.pursuits}h` : '·'} l="Hours on pursuits" color={GOLD} />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Third Horizon hours', subtitle: `David's Harvest entries for the day · ${view ? view.stats.share : 0}% of pursuit time`, items: view.drills.thirdHorizon })}>
                <Stat v={view ? `${view.stats.hours}h` : '·'} l={view ? `Third Horizon · ${view.stats.share}% of pursuits` : 'Third Horizon'} color={GOLD} />
              </Clickable>
              <Clickable onClick={() => view && setOpen({ title: 'Main Missions touched', subtitle: 'Projects with a task closed, activated, or promoted today', items: view.drills.touched })}>
                <Stat v={view ? view.stats.touched : '·'} l="Main Missions touched" color={GOLD_BRIGHT} />
              </Clickable>
            </div>
          </Panel>
          <Panel title="By kind" style={{ marginBottom: 0 }}>
            {view && Object.keys(view.byKind).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.keys(KINDS).filter(k => view.byKind[k]).map(k => (
                  <Clickable key={k} onClick={() => setOpen({ title: k, subtitle: 'Every record of this kind in the day', items: view.rows.filter(r => r.kind === k) })}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <KindChip kind={k} />
                      <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: '#fff' }}>{view.byKind[k]}</span>
                    </div>
                  </Clickable>
                ))}
              </div>
            ) : (
              <Label style={{ marginBottom: 0 }}>Nothing yet</Label>
            )}
          </Panel>
      </div>
      {open && <RecordModal title={open.title} subtitle={open.subtitle} items={open.items} onClose={() => setOpen(null)} />}
    </div>
  )
}
