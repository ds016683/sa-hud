import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Plus, ArrowLeft, ArrowUpRight, RefreshCw, X, Trash2, Link as LinkIcon } from 'lucide-react'
import useProjects, { freshnessOf } from '../hooks/useProjects'
import { CLIENTS, clientByKey, laneColor, missionsOf, STATUS_LABEL, STATUS_ORDER } from '../constants/clients'
import { loadTimeline, saveTimeline, BASELINE } from '../lib/clientTimeline'
import { INK, INK2, GRAY, LABEL, MUTED, NAVY_DEEP, PANEL_BORDER, PANEL_BG, GOLD, GREEN, BLUE, RED, MONO, SERIF, SubLabel, chiToday } from './river/canon'
import { hudConfirm } from '../lib/dialog'
// =============================================================================
// Clients (David, 10/19). A Client card, built like the Main Mission card,
// gathers a client's Main Missions and its program timeline. The timeline is
// drawn as a waterfall: months run down the page, lanes run across, each lane
// a color assignment. Every item opens a modal.
// =============================================================================
const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px', color: INK },
  h1: { fontSize: 28, fontWeight: 500, margin: 0, color: '#FFFFFF', fontFamily: SERIF, letterSpacing: '-0.01em' },
  sub: { fontSize: 10, color: LABEL, margin: '6px 0 0', fontFamily: MONO, letterSpacing: '1.4px', textTransform: 'uppercase' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16 },
  btnPrimary: { background: BLUE, color: NAVY_DEEP, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { background: 'rgba(255,255,255,0.05)', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  input: { width: '100%', padding: '9px 11px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', color: INK },
  eyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL },
}
const TEXT_DIM = INK2

// CIP pill grammar: active = solid baby blue + navy text, inactive = hairline ghost uppercase
function Pill({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: MONO,
      fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
      background: active ? BLUE : 'transparent', color: active ? NAVY_DEEP : TEXT_DIM,
      border: active ? `1px solid ${BLUE}` : `1px solid ${PANEL_BORDER}`,
    }}>{children}</button>
  )
}
const Chip = ({ color, children, style }) => <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color, border: `1px solid ${color}55`, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', ...style }}>{children}</span>
const STATUS_COLOR = { planned: MUTED, in_motion: GOLD, done: GREEN }

// Dates. Items carry ISO days; the waterfall is drawn in UTC day math.
const DAY = 86_400_000
const utc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
const monthStart = (ms) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) }
const addMonths = (ms, n) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1) }
const monthName = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
const yearOf = (ms) => new Date(ms).getUTCFullYear()
const dayLabel = (iso) => iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const isOpenTask = (t) => t.status !== 'done' && !t.done
const NUM_RE = /^\s*(\d+)\s*[·.:)-]\s*/
const stripNum = (t) => String(t || '').replace(NUM_RE, '')

// =============================================================================
// Card
// =============================================================================
export function ClientCard({ client, anchor, missions, items, onOpen }) {
  const tasks = missions.flatMap(m => m.tasks || [])
  const closed = tasks.filter(t => !isOpenTask(t)).length
  const pct = tasks.length ? Math.round(closed / tasks.length * 100) : 0
  const today = chiToday()
  const next = items.filter(i => i.start_date && i.start_date >= today && i.status !== 'done').sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null
  const touched = missions.map(m => m.last_activity_at).filter(Boolean).sort().at(-1) || null
  const fresh = freshnessOf(touched)
  const freshColor = fresh === 'fresh' ? GREEN : fresh === 'warning' ? GOLD : GRAY
  const lastTouch = touched ? new Date(touched).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never'
  return (
    <button onClick={() => onOpen(client.key)} style={{ ...S.panel, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150, width: '100%', transition: 'border-color 120ms' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(169,201,232,0.4)'} onMouseLeave={e => e.currentTarget.style.borderColor = PANEL_BORDER}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 17, letterSpacing: '-0.01em', color: INK, lineHeight: 1.3 }}>{client.name}</div>
          {anchor?.description && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: TEXT_DIM, marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{anchor.description}</div>}
        </div>
        <Chip color={BLUE} style={{ flexShrink: 0 }}>Client</Chip>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14, color: INK }}>{closed} / {tasks.length}</span>
        <span style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><span style={{ display: 'block', width: `${pct}%`, height: '100%', background: GOLD }} /></span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL }}>milestones · {missions.length} missions</span>
      </div>
      <div style={{ marginTop: 'auto' }}>
        {next
          ? <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.4 }}><span style={{ color: laneColor(client, next.lane), fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', marginRight: 6 }}>next · {next.date_label || dayLabel(next.start_date)}</span>{next.title}</div>
          : <div style={{ fontSize: 12.5, color: GRAY }}>{items.length ? 'Nothing ahead on the timeline.' : 'No timeline yet.'}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', color: LABEL, textTransform: 'uppercase' }}>
        <span>{items.length} on the timeline</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: freshColor }} />touched {lastTouch}</span>
      </div>
    </button>
  )
}

// =============================================================================
// Waterfall. Months run down the page, lanes run across. A marker sits at the
// item's true day; its tag cascades below the tag before it in the lane when
// they would collide, with a hairline back to the marker. A start alone is a
// diamond; a start and an end draw a vertical bar. Two views (David, 10/19):
// Simple draws one-line tags, Detailed draws two-line cards. Clicking an item
// opens a small popover beside it; Edit in the popover opens the modal.
// =============================================================================
const RAIL_W = 92
const LANE_MIN = 200
const HEADER_H = 56
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const VIEWS = {
  simple:   { month: 160, card: 26, gap: 5 },
  detailed: { month: 220, card: 62, gap: 6 },
}

function Popover({ client, item, flip, top, onEdit, onClose }) {
  const color = laneColor(client, item.lane)
  const row = (k, v) => v ? <div style={{ display: 'flex', gap: 8, fontSize: 12 }}><span style={{ ...S.eyebrow, fontSize: 9, width: 48, flexShrink: 0, paddingTop: 2 }}>{k}</span><span style={{ color: INK, lineHeight: 1.4 }}>{v}</span></div> : null
  return (
    <div role="dialog" onClick={e => e.stopPropagation()} style={{
      position: 'absolute', top: Math.max(0, top - 6), zIndex: 30, width: 272,
      ...(flip ? { right: 'calc(100% - 22px)' } : { left: 'calc(100% - 14px)' }),
      background: 'rgba(14,35,54,0.98)', border: `1px solid ${PANEL_BORDER}`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px 10px', boxShadow: '0 14px 40px rgba(0,0,0,0.45)', display: 'grid', gap: 7,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...S.eyebrow, fontSize: 9, color }}>{item.lane}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: MUTED }}>{item.date_label || dayLabel(item.start_date)}{item.end_date ? ` through ${dayLabel(item.end_date)}` : ''}</span>
        <button onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}><X size={13} /></button>
      </div>
      <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 15, lineHeight: 1.3, color: INK }}>{item.title}</div>
      <div style={{ display: 'grid', gap: 4 }}>
        {row('Status', <span style={{ color: STATUS_COLOR[item.status] || MUTED }}>{STATUS_LABEL[item.status] || item.status}</span>)}
        {row('Owner', item.owner)}
        {row('Dates', item.start_date ? `${dayLabel(item.start_date)}${item.end_date ? ` to ${dayLabel(item.end_date)}` : ''}` : 'To be set')}
        {row('Source', item.source)}
        {item.notes && <div style={{ fontSize: 12, color: INK2, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 6 }}>{item.notes}</div>}
        {(item.links || []).length > 0 && <div style={{ fontSize: 11.5, color: BLUE }}>{item.links.length} link{item.links.length === 1 ? '' : 's'}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={onEdit} style={{ ...S.btnPrimary, padding: '5px 10px', fontSize: 11.5 }}>Edit</button>
        <button onClick={onClose} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 11.5 }}>Close</button>
      </div>
    </div>
  )
}

export function Waterfall({ client, items: rawItems, view = 'simple', onOpen, onAdd, onMove, onDraft }) {
  const today = chiToday()
  const size = VIEWS[view] || VIEWS.simple
  const [pop, setPop] = useState(null)   // item id with the popover open
  // Dragging a tag moves its day (and its end with it) and its lane. The live
  // patch rides a ref; state mirrors it so the tag follows the pointer.
  const bodyRef = useRef(null)
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const suppressClick = useRef(false)
  const items = useMemo(() => drag ? rawItems.map(i => i.id === drag.id ? { ...i, ...drag.patch } : i) : rawItems, [rawItems, drag])
  const axis = useMemo(() => {
    const starts = items.filter(i => i.start_date).map(i => utc(i.start_date))
    const ends = items.filter(i => i.end_date).map(i => utc(i.end_date))
    const t = utc(today)
    const lo = monthStart(Math.min(t, ...starts))
    let hi = addMonths(monthStart(Math.max(t, ...starts, ...ends)), 1)
    while ((yearOf(hi) - yearOf(lo)) * 12 + new Date(hi).getUTCMonth() - new Date(lo).getUTCMonth() < 6) hi = addMonths(hi, 1)
    const months = []
    for (let m = lo; m < hi; m = addMonths(m, 1)) months.push(m)
    return { lo, hi, months, height: months.length * size.month }
  }, [items, today, size.month])
  const y = (ms) => (ms - axis.lo) / (axis.hi - axis.lo) * axis.height
  const todayY = y(utc(today))
  const dayAt = (clientY, rect) => clamp(axis.lo + Math.round(((clientY - rect.top) / axis.height) * (axis.hi - axis.lo) / DAY) * DAY, axis.lo, axis.hi - DAY)
  const laneAt = (clientX, rect) => client.lanes[clamp(Math.floor((clientX - rect.left - RAIL_W) / ((rect.width - RAIL_W) / client.lanes.length)), 0, client.lanes.length - 1)].id

  // The drag listens on the window: when a tag crosses into another lane it
  // remounts under that column, so a listener on the tag itself would be lost.
  const startDrag = (e, it) => {
    if (e.button !== 0 || !onMove) return
    e.preventDefault()
    dragRef.current = { id: it.id, it, x0: e.clientX, y0: e.clientY, moved: false, patch: null }
    const onMoveEv = (ev) => moveDrag(ev)
    const onUp = () => {
      window.removeEventListener('pointermove', onMoveEv)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      endDrag()
    }
    window.addEventListener('pointermove', onMoveEv)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }
  const moveDrag = (e) => {
    const d = dragRef.current
    if (!d || !bodyRef.current) return
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return
    d.moved = true
    const rect = bodyRef.current.getBoundingClientRect()
    const start = isoOf(dayAt(e.clientY, rect))
    const shift = utc(start) - utc(d.it.start_date)
    const patch = { lane: laneAt(e.clientX, rect), start_date: start, end_date: d.it.end_date ? isoOf(utc(d.it.end_date) + shift) : d.it.end_date }
    d.patch = patch
    setPop(null)
    setDrag({ id: d.id, patch, x: e.clientX, y: e.clientY })
  }
  const endDrag = () => {
    const d = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!d || !d.moved) return
    suppressClick.current = true
    if (d.patch && (d.patch.lane !== d.it.lane || d.patch.start_date !== d.it.start_date)) onMove(d.it, d.patch)
  }
  const tagClick = (it) => { if (suppressClick.current) { suppressClick.current = false; return } openPop(it) }
  const draftAt = (e, laneId) => {
    if (!onDraft || e.target !== e.currentTarget) return
    onDraft(laneId, isoOf(dayAt(e.clientY, e.currentTarget.getBoundingClientRect())))
  }

  // Per lane: markers at their day, tags cascading.
  const lanes = client.lanes.map(l => {
    const list = items.filter(i => i.lane === l.id && i.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date) || (a.position - b.position))
    let bottom = -Infinity
    const placed = list.map(it => {
      const top = y(utc(it.start_date))
      const end = it.end_date ? y(utc(it.end_date) + DAY) : null
      const cardTop = Math.max(top - (view === 'simple' ? size.card / 2 : 0), bottom + size.gap)
      bottom = cardTop + size.card
      return { it, top, end, cardTop }
    })
    const undated = items.filter(i => i.lane === l.id && !i.start_date)
    return { lane: l, placed, undated, overflow: Math.max(0, bottom - axis.height) }
  })
  const extraLanes = [...new Set(items.map(i => i.lane))].filter(id => !client.lanes.some(l => l.id === id))
  const bodyH = axis.height + Math.max(0, ...lanes.map(l => l.overflow)) + 24
  const cols = `${RAIL_W}px repeat(${client.lanes.length}, minmax(${LANE_MIN}px, 1fr))`
  const openPop = (it) => setPop(prev => (prev === it.id ? null : it.id))
  const edit = (it) => { setPop(null); onOpen(it) }

  return (
    <div style={{ overflowX: 'auto' }}>
      {pop && <div onClick={() => setPop(null)} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />}
      {drag && (
        <div style={{ position: 'fixed', left: drag.x + 14, top: drag.y + 14, zIndex: 40, pointerEvents: 'none', background: GOLD, color: NAVY_DEEP, borderRadius: 6, padding: '3px 8px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.6px', whiteSpace: 'nowrap', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}>
          {dayLabel(drag.patch.start_date)}{drag.patch.end_date ? ` to ${dayLabel(drag.patch.end_date)}` : ''} · {drag.patch.lane}
        </div>
      )}
      <div style={{ minWidth: RAIL_W + client.lanes.length * LANE_MIN, userSelect: 'none' }}>
        {/* Lane header: the color assignment */}
        <div style={{ display: 'grid', gridTemplateColumns: cols, height: HEADER_H, alignItems: 'stretch', borderBottom: `1px solid ${PANEL_BORDER}`, position: 'sticky', top: 0, zIndex: 3, background: 'rgba(14,35,54,0.92)', backdropFilter: 'blur(4px)' }}>
          <div style={{ ...S.eyebrow, display: 'flex', alignItems: 'center', paddingRight: 8 }}>Month</div>
          {client.lanes.map(l => (
            <div key={l.id} style={{ padding: '0 8px 0 10px', borderLeft: `1px solid ${PANEL_BORDER}`, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: l.color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.id}>{l.id}</div>
                <div style={{ ...S.eyebrow, fontSize: 9, color: MUTED, marginTop: 3, whiteSpace: 'nowrap' }}>{l.baseline ? 'baseline · ' : ''}{items.filter(i => i.lane === l.id).length} items</div>
              </div>
              <button onClick={() => onAdd(l.id)} title={`Add to ${l.id}`} style={{ background: 'none', border: `1px solid ${PANEL_BORDER}`, color: MUTED, borderRadius: 6, width: 22, height: 22, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={12} /></button>
            </div>
          ))}
        </div>

        {/* Body */}
        <div ref={bodyRef} style={{ display: 'grid', gridTemplateColumns: cols, position: 'relative', height: bodyH }}>
          {/* Month rail */}
          <div style={{ position: 'relative' }}>
            {axis.months.map((m, i) => (
              <div key={m} style={{ position: 'absolute', top: i * size.month, left: 0, right: 0, height: size.month, borderTop: `1px solid ${PANEL_BORDER}`, padding: '8px 8px 0 0' }}>
                <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: INK }}>{monthName(m)}</div>
                {(i === 0 || new Date(m).getUTCMonth() === 0) && <div style={{ ...S.eyebrow, fontSize: 9.5, color: MUTED }}>{yearOf(m)}</div>}
              </div>
            ))}
          </div>
          {/* Hairlines across every lane, and today */}
          <div style={{ position: 'absolute', left: RAIL_W, right: 0, top: 0, height: axis.height, pointerEvents: 'none' }}>
            {axis.months.map((m, i) => <div key={m} style={{ position: 'absolute', top: i * size.month, left: 0, right: 0, borderTop: `1px solid ${PANEL_BORDER}` }} />)}
            {todayY >= 0 && todayY <= axis.height && (
              <div style={{ position: 'absolute', top: todayY, left: -RAIL_W, right: 0, borderTop: `1px dashed ${GOLD}`, zIndex: 2 }}>
                <span style={{ position: 'absolute', left: 0, top: -9, fontFamily: MONO, fontSize: 8.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: NAVY_DEEP, background: GOLD, borderRadius: 3, padding: '1px 5px' }}>Today</span>
              </div>
            )}
          </div>
          {/* Lanes */}
          {lanes.map(({ lane, placed, undated }, li) => (
            <div key={lane.id} onDoubleClick={(e) => draftAt(e, lane.id)} title={onDraft ? 'Double-click empty space to draft an item on that day' : undefined} style={{ position: 'relative', borderLeft: `1px solid ${PANEL_BORDER}`, cursor: onDraft ? 'copy' : undefined }}>
              {placed.map(({ it, top, end, cardTop }) => {
                const color = lane.color
                const done = it.status === 'done'
                const active = pop === it.id
                return (
                  <div key={it.id}>
                    {end !== null && end > top
                      ? <div style={{ position: 'absolute', left: 14, top, width: 6, height: Math.max(6, end - top), borderRadius: 3, background: color, opacity: done ? 0.4 : 0.85 }} />
                      : <div style={{ position: 'absolute', left: 11, top: top - 6, width: 12, height: 12, transform: 'rotate(45deg)', borderRadius: 2, background: color, opacity: done ? 0.4 : 1, boxShadow: `0 0 0 2px ${NAVY_DEEP}` }} />}
                    {cardTop > top + 2 && <div style={{ position: 'absolute', left: 17, top, width: 1, height: cardTop - top + 10, background: `${color}66` }} />}
                    {view === 'simple' ? (
                      <button onClick={() => tagClick(it)} onDoubleClick={(e) => { e.stopPropagation(); onOpen(it) }} onPointerDown={(e) => startDrag(e, it)}
                        title={`${it.date_label || dayLabel(it.start_date)} · ${it.title}`} style={{
                        position: 'absolute', left: 30, right: 10, top: cardTop, height: size.card, textAlign: 'left', cursor: drag?.id === it.id ? 'grabbing' : 'grab', touchAction: 'none', fontFamily: 'inherit',
                        background: active ? `${color}22` : 'rgba(255,255,255,0.045)', border: `1px solid ${active ? color : PANEL_BORDER}`, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: '0 8px', color: INK, opacity: done ? 0.6 : 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 7,
                      }}>
                        <span style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: done ? 'line-through' : 'none', flex: 1 }}>{it.title}</span>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: STATUS_COLOR[it.status] || MUTED, flexShrink: 0 }} title={STATUS_LABEL[it.status]} />
                      </button>
                    ) : (
                      <button onClick={() => tagClick(it)} onDoubleClick={(e) => { e.stopPropagation(); onOpen(it) }} onPointerDown={(e) => startDrag(e, it)}
                        title={it.title} style={{
                        position: 'absolute', left: 30, right: 10, top: cardTop, height: size.card, textAlign: 'left', cursor: drag?.id === it.id ? 'grabbing' : 'grab', touchAction: 'none', fontFamily: 'inherit',
                        background: active ? `${color}22` : 'rgba(255,255,255,0.045)', border: `1px solid ${active ? color : PANEL_BORDER}`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '5px 8px', color: INK, opacity: done ? 0.6 : 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color, whiteSpace: 'nowrap' }}>{it.date_label || dayLabel(it.start_date)}</span>
                          {it.owner && <span style={{ fontSize: 10, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {it.owner}</span>}
                          <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 99, background: STATUS_COLOR[it.status] || MUTED, flexShrink: 0 }} title={STATUS_LABEL[it.status]} />
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textDecoration: done ? 'line-through' : 'none' }}>{it.title}</div>
                      </button>
                    )}
                    {active && <Popover client={client} item={it} top={cardTop} flip={li >= client.lanes.length - 2} onEdit={() => edit(it)} onClose={() => setPop(null)} />}
                  </div>
                )
              })}
              {undated.length > 0 && (
                <div style={{ position: 'absolute', left: 30, right: 10, bottom: 4, display: 'grid', gap: 4 }}>
                  {undated.map(it => <button key={it.id} onClick={() => onOpen(it)} style={{ ...S.btnGhost, fontSize: 11, padding: '4px 8px', justifyContent: 'flex-start', borderLeft: `3px solid ${lane.color}` }}><span style={{ color: MUTED, fontFamily: MONO, fontSize: 9, letterSpacing: '0.8px' }}>DATE TO BE SET</span>&nbsp;{it.title}</button>)}
                </div>
              )}
            </div>
          ))}
        </div>
        {extraLanes.length > 0 && <div style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>Items on a lane this client does not draw ({extraLanes.join(', ')}) are kept but not shown. Move them in the item modal.</div>}
      </div>
    </div>
  )
}

// =============================================================================
// Item modal. Placement first (lane and client), then the item.
// =============================================================================
function Field({ label, children, style }) {
  return <label style={{ display: 'block', ...style }}><div style={{ ...S.eyebrow, marginBottom: 5 }}>{label}</div>{children}</label>
}
export function ItemModal({ client, item, onClose, onSave, onDelete, busy }) {
  const [d, setD] = useState(() => ({ lane: client.lanes[0].id, title: '', start_date: '', end_date: '', date_label: '', owner: '', status: 'planned', source: '', notes: '', links: [], ...item }))
  const [link, setLink] = useState({ label: '', url: '' })
  const set = (k) => (e) => setD(prev => ({ ...prev, [k]: e.target.value }))
  const color = laneColor(client, d.lane)
  const isNew = !item?.id
  const sel = { ...S.input, appearance: 'none' }
  useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])
  const addLink = () => { if (!link.url.trim()) return; setD(prev => ({ ...prev, links: [...(prev.links || []), { label: link.label.trim() || link.url.trim(), url: link.url.trim() }] })); setLink({ label: '', url: '' }) }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,16,28,0.78)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ ...S.panel, width: 'min(620px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: '22px 24px 20px', display: 'grid', gap: 14, borderTop: `3px solid ${color}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.eyebrow}>{client.short} · Timeline Item · <span style={{ color }}>{d.lane}</span>{client.lanes.find(l => l.id === d.lane)?.baseline ? ' · Baseline' : ''}</div>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, letterSpacing: '-0.01em', color: INK, lineHeight: 1.25, marginTop: 6 }}>{d.title || (isNew ? 'New Timeline Item' : 'Untitled')}</div>
            {!isNew && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{[d.date_label || dayLabel(d.start_date), d.end_date ? `through ${dayLabel(d.end_date)}` : null, d.owner].filter(Boolean).join(' · ')}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <Field label="Title"><input autoFocus={isNew} value={d.title} onChange={set('title')} placeholder="What happens (verbatim where it quotes someone)" style={S.input} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Lane">
            <select value={d.lane} onChange={set('lane')} style={{ ...sel, borderLeft: `4px solid ${color}` }}>
              {[...client.lanes.map(l => l.id), ...(client.lanes.some(l => l.id === d.lane) ? [] : [d.lane])].map(id => <option key={id} value={id} style={{ color: NAVY_DEEP }}>{id}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
              {STATUS_ORDER.map(s => <Pill key={s} active={d.status === s} onClick={() => setD(prev => ({ ...prev, status: s }))}>{STATUS_LABEL[s]}</Pill>)}
            </div>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 10 }}>
          <Field label="Start"><input type="date" value={d.start_date || ''} onChange={set('start_date')} style={S.input} /></Field>
          <Field label="End"><input type="date" value={d.end_date || ''} onChange={set('end_date')} style={S.input} /></Field>
          <Field label="How The Date Reads"><input value={d.date_label} onChange={set('date_label')} placeholder="e.g. by 11/10 meeting" style={S.input} /></Field>
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: -6 }}>A start alone draws a milestone on that day. A start and an end draw a bar.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Owner"><input value={d.owner} onChange={set('owner')} placeholder="Who carries it" style={S.input} /></Field>
          <Field label="Source"><input value={d.source} onChange={set('source')} placeholder="Where it came from, e.g. Peter Schultz, October 17 note" style={S.input} /></Field>
        </div>
        <Field label="Notes"><textarea value={d.notes} onChange={set('notes')} rows={4} placeholder="What to know about this item" style={{ ...S.input, resize: 'vertical', lineHeight: 1.5 }} /></Field>

        <div>
          <SubLabel style={{ marginBottom: 6 }}>Links</SubLabel>
          {(d.links || []).length === 0 && <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>No links yet.</div>}
          {(d.links || []).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${PANEL_BORDER}` }}>
              <LinkIcon size={12} color={LABEL} />
              <a href={l.url} target="_blank" rel="noreferrer" style={{ color: BLUE, fontSize: 13, textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label || l.url} <ArrowUpRight size={11} /></a>
              <button onClick={() => setD(prev => ({ ...prev, links: prev.links.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }} aria-label="Remove link"><X size={12} /></button>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: 8, marginTop: 8 }}>
            <input value={link.label} onChange={e => setLink({ ...link, label: e.target.value })} placeholder="Label" style={S.input} />
            <input value={link.url} onChange={e => setLink({ ...link, url: e.target.value })} placeholder="https://" style={S.input} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
            <button onClick={addLink} style={S.btnGhost}><Plus size={12} /> Link</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
          <button onClick={() => onSave(d)} disabled={busy || !d.title.trim()} style={{ ...S.btnPrimary, opacity: busy || !d.title.trim() ? 0.5 : 1 }}>{busy ? 'Saving…' : isNew ? 'Add To Timeline' : 'Save'}</button>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          {!isNew && <button onClick={async () => { if (await hudConfirm(`Remove "${d.title}" from the timeline?`)) onDelete(item) }} disabled={busy} style={{ ...S.btnGhost, marginLeft: 'auto', border: '1px solid rgba(232,131,111,0.35)', color: RED }}><Trash2 size={12} /> Remove</button>}
          {item?.updated_at && <span style={{ marginLeft: isNew ? 'auto' : 12, fontSize: 10.5, color: MUTED, fontFamily: MONO }}>updated {new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Detail: the Client card opened. Pills: Missions, Timeline.
// =============================================================================
const VIEW_KEY = 'hud.clients.timeline.view'
const readView = () => { try { const v = window.localStorage.getItem(VIEW_KEY); return v === 'detailed' ? 'detailed' : 'simple' } catch { return 'simple' } }

function ClientDetail({ client, anchor, missions, tl, onBack, initialTab, onNavigate }) {
  const [tab, setTab] = useState(initialTab === 'timeline' ? 'timeline' : 'missions')
  const [view, setViewState] = useState(readView)
  const setView = (v) => { setViewState(v); try { window.localStorage.setItem(VIEW_KEY, v) } catch { /* no-op */ } }
  const [modal, setModal] = useState(null)      // null | { item } | { item: { lane } } for new
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => { try { window.history.replaceState(window.history.state, '', `#/clients/${encodeURIComponent(client.key)}/${tab}`) } catch { /* no-op */ } }, [client.key, tab])
  const tasks = missions.flatMap(m => m.tasks || [])
  const closed = tasks.filter(t => !isOpenTask(t)).length
  const pct = tasks.length ? Math.round(closed / tasks.length * 100) : 0

  const persist = async (items) => {
    setBusy(true); setErr(null)
    try { await tl.save(items); setModal(null) }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }
  const saveItem = (d) => {
    const items = tl.items
    const next = d.id ? items.map(i => i.id === d.id ? { ...i, ...d, updated_at: new Date().toISOString() } : i) : [...items, { ...d, position: items.length }]
    return persist(next)
  }
  const deleteItem = (it) => persist(tl.items.filter(i => i.id !== it.id))
  const moveItem = (it, patch) => persist(tl.items.map(i => i.id === it.id ? { ...i, ...patch, updated_at: new Date().toISOString() } : i))

  return (
    <div style={{ ...S.page, maxWidth: tab === 'timeline' ? 1480 : 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={S.btnGhost}><ArrowLeft size={13} /> All Clients</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={S.h1}>{client.name}</h1>
          {anchor?.description && <div style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_DIM, margin: '8px 0 0', maxWidth: '72ch' }}>
            <span style={{ ...S.eyebrow, color: BLUE, display: 'block', marginBottom: 2 }}>Engagement</span>
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, color: INK }}>{anchor.description}</span>
          </div>}
          <div style={S.sub}>{['Client', client.key, `${missions.length} Main Missions`, `${tl.items.length} on the timeline`].join(' · ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 6, flexWrap: 'wrap' }}>
          <Pill active={tab === 'missions'} onClick={() => setTab('missions')}>Missions · {missions.length}</Pill>
          <Pill active={tab === 'timeline'} onClick={() => setTab('timeline')}>Timeline · {tl.items.length}</Pill>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 0' }}>
        <span style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><span style={{ display: 'block', width: `${pct}%`, height: '100%', background: GOLD }} /></span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL }}>{closed} of {tasks.length} milestones closed</span>
      </div>

      <div style={{ ...S.panel, marginTop: 20 }}>
        {tab === 'missions' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {!missions.length && <div style={{ fontSize: 13, color: GRAY }}>No Main Missions carry this client's key yet.</div>}
            {missions.map(m => {
              const ms = (m.tasks || [])
              const open = ms.filter(isOpenTask)
              const now = open.find(t => t.objective_id) || open[0] || null
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, background: 'rgba(255,255,255,0.025)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 15.5, color: INK }}>{m.name}</div>
                    <div style={{ fontSize: 12.5, color: TEXT_DIM, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {now ? <><span style={{ color: now.objective_id ? GREEN : GOLD, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', marginRight: 6 }}>{now.objective_id ? 'on the board' : 'now'}</span>{stripNum(now.text)}</> : <span style={{ color: GRAY }}>{ms.length ? 'Every milestone closed.' : 'No milestones yet.'}</span>}
                    </div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, whiteSpace: 'nowrap' }}>{ms.length - open.length} / {ms.length}</span>
                  {m.status === 'completed' && <Chip color={GREEN}>Complete</Chip>}
                  <button onClick={() => onNavigate && onNavigate('main-missions', [m.id])} style={S.btnGhost}>Open <ArrowUpRight size={12} /></button>
                </div>
              )
            })}
          </div>
        )}
        {tab === 'timeline' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <SubLabel style={{ marginBottom: 2 }}>Program Timeline</SubLabel>
                <div style={{ fontSize: 12.5, color: TEXT_DIM, lineHeight: 1.5 }}>Months run down the page, lanes run across. Each lane is a color assignment; the baseline lane carries the client's own plan and dates. Click an item for its details. Drag it to move its day or lane. Double-click it to edit, or double-click empty space to draft an item on that day.</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <Pill active={view === 'simple'} onClick={() => setView('simple')}>Simple</Pill>
                  <Pill active={view === 'detailed'} onClick={() => setView('detailed')}>Detailed</Pill>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={tl.reload} style={S.btnGhost} title="Read the timeline again"><RefreshCw size={12} /></button>
                <button onClick={() => setModal({ item: { lane: client.lanes[0].id } })} style={S.btnPrimary}><Plus size={13} /> Add A Timeline Item</button>
              </div>
            </div>
            {err && <div style={{ fontSize: 12.5, color: RED, marginBottom: 10 }}>{err}</div>}
            {tl.error && <div style={{ fontSize: 12.5, color: RED, marginBottom: 10 }}>{tl.error}</div>}
            {tl.loading && <div style={{ ...S.eyebrow, color: GRAY, padding: '10px 0' }}>Reading the timeline…</div>}
            {!tl.loading && tl.items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0 18px' }}>
                <div style={{ fontSize: 13, color: GRAY, marginBottom: 10 }}>No timeline yet.</div>
                {BASELINE[client.key] && <button onClick={() => persist(BASELINE[client.key].map((b, i) => ({ ...b, position: i })))} disabled={busy} style={S.btnPrimary}>{busy ? 'Loading…' : 'Load The Baseline'}</button>}
              </div>
            )}
            {!tl.loading && tl.items.length > 0 && <Waterfall client={client} items={tl.items} view={view} onOpen={(it) => setModal({ item: it })} onAdd={(lane) => setModal({ item: { lane } })} onMove={moveItem} onDraft={(lane, start_date) => setModal({ item: { lane, start_date } })} />}
          </div>
        )}
      </div>
      {modal && <ItemModal client={client} item={modal.item} busy={busy} onClose={() => setModal(null)} onSave={saveItem} onDelete={deleteItem} />}
    </div>
  )
}

// The timeline of one client: read from its anchor mission's artifact, written back whole.
function useClientTimeline(client, anchor) {
  const [items, setItems] = useState([])
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const projectId = anchor?.id || null
  const reload = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true); setError(null)
    try { const r = await loadTimeline(projectId); setItems(r.items); setDoc(r.doc) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { reload() }, [reload])
  const save = useCallback(async (next) => {
    if (!projectId) throw new Error(`No Main Mission carries the key ${client.key}; the timeline needs one to live on.`)
    const d = await saveTimeline(projectId, client.key, next, doc)
    setDoc(d); setItems(d.items)
  }, [projectId, client.key, doc])
  return { items, loading, error, reload, save }
}

function ClientRoute({ client, anchor, missions, deepLink, onBack, onNavigate }) {
  const tl = useClientTimeline(client, anchor)
  return <ClientDetail client={client} anchor={anchor} missions={missions} tl={tl} onBack={onBack} initialTab={deepLink[1]} onNavigate={onNavigate} />
}

// Card grid needs each client's item count; a light read of the artifact per client.
function useTimelineCounts(anchors) {
  const [state, setState] = useState({})
  const key = anchors.map(a => a?.id || '').join(',')
  useEffect(() => {
    let on = true
    Promise.all(anchors.map(async a => a ? [a.id, (await loadTimeline(a.id).catch(() => ({ items: [] }))).items] : null))
      .then(rows => { if (on) setState(Object.fromEntries(rows.filter(Boolean))) })
    return () => { on = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

// =============================================================================
// Page
// =============================================================================
export default function ClientsPage({ deepLink = [], onNavigate } = {}) {
  const api = useProjects()
  const { loading, projects } = api
  const [openKey, setOpenKey] = useState(deepLink[0] || null)
  // A new deep link opens its client; derived during render, not in an effect.
  const [seenLink, setSeenLink] = useState(deepLink[0] || null)
  if ((deepLink[0] || null) !== seenLink) { setSeenLink(deepLink[0] || null); if (deepLink[0]) setOpenKey(deepLink[0]) }
  const anchors = CLIENTS.map(c => projects.find(p => p.key === c.key) || null)
  const counts = useTimelineCounts(anchors)

  if (loading && !projects.length) return <div style={{ ...S.page, fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: GRAY }}>LOADING…</div>

  const open = openKey ? clientByKey(openKey) : null
  if (open) {
    const anchor = projects.find(p => p.key === open.key) || null
    const missions = missionsOf(open, projects).filter(p => p.status !== 'deleted')
    return <ClientRoute key={open.key} client={open} anchor={anchor} missions={missions} deepLink={deepLink} onNavigate={onNavigate}
      onBack={() => { setOpenKey(null); try { window.history.replaceState(window.history.state, '', '#/clients') } catch { /* no-op */ } }} />
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={S.h1}>Clients</h1>
          <div style={S.sub}>{CLIENTS.length} standing · each card gathers a client's Main Missions and its program timeline</div>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <button style={S.btnGhost} onClick={api.refresh}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginTop: 20 }}>
        {CLIENTS.map((c, i) => <ClientCard key={c.key} client={c} anchor={anchors[i]} missions={missionsOf(c, projects)} items={counts[anchors[i]?.id] || []} onOpen={setOpenKey} />)}
      </div>
    </div>
  )
}
