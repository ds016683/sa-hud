import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Flag, X } from 'lucide-react'
import { PageHead } from './sa/SaUi'
import { supabase } from '../lib/supabase'
import { BADGES, milesGrade, signalTier } from '../constants/collection'

const GOLD = '#F8C761'
const PERIWINKLE = '#96A8F0'
const LINE = 'rgba(255,255,255,0.10)'
const INK = 'rgba(255,255,255,0.92)'
const INK2 = 'rgba(255,255,255,0.66)'
const INK3 = 'rgba(255,255,255,0.42)'

const panel = {
  background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 12, padding: 'var(--sa-pad)',
}

function fmtDay(day, opts) {
  if (!day) return ''
  return new Date(day + 'T12:00:00').toLocaleDateString('en-US', opts)
}

function Eyebrow({ children, extra }) {
  return (
    <div style={{
      color: GOLD, fontFamily: 'var(--font-mono, monospace)', fontSize: 10,
      letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 7,
    }}>
      <span style={{ fontSize: 8 }}>▲</span>{children}
      {extra && <span style={{ marginLeft: 'auto', color: INK3 }}>{extra}</span>}
    </div>
  )
}

function List({ items, marker, mono = false, empty }) {
  if (!(items || []).length) return <div style={{ fontSize: 13.5, color: INK3 }}>{empty}</div>
  return items.map((s, i) => (
    <div key={i} style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5.5px 0',
      borderTop: mono && i ? `1px solid ${LINE}` : 'none',
    }}>
      {marker}
      <span style={{
        fontSize: mono ? 13.5 : 14, lineHeight: 1.55, color: INK,
        fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
      }}>{s}</span>
    </div>
  ))
}

// The Chart — scoring progress across every collected day.
function ScoringDashboard({ days, onClose }) {
  const scored = [...days].filter(d => d._sc && d._sc.miles != null).sort((a, b) => (a.day < b.day ? -1 : 1))
  const totalMiles = Math.round(scored.reduce((s, d) => s + d._sc.miles, 0) * 10) / 10
  const best = scored.reduce((b, d) => (!b || d._sc.miles > b._sc.miles ? d : b), null)
  const avg = scored.length ? Math.round((totalMiles / scored.length) * 10) / 10 : 0
  const badgeCounts = {}
  for (const d of scored) for (const b of (d._sc.badges || [])) badgeCounts[b] = (badgeCounts[b] || 0) + 1
  const shortDay = (day) => new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, cursor: 'pointer',
      background: 'rgba(8,20,32,0.94)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 780, width: '100%', maxHeight: '88vh', overflowY: 'auto', cursor: 'default',
        background: '#10273B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="sa-tele" style={{ color: PERIWINKLE, letterSpacing: '2px', fontSize: 10 }}>THE RIVER RUN</div>
            <div className="sa-serif" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em', color: '#fff', marginTop: 4 }}>Scoring Progress</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: INK3, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, margin: '22px 0' }}>
          {[
            { label: 'DAYS COLLECTED', value: scored.length },
            { label: 'MILES DOWNRIVER', value: totalMiles },
            { label: 'AVG MILES / DAY', value: avg },
            { label: 'AVG SIGNAL', value: (() => { const withSig = scored.filter(d => (d._sc.signal || {}).score != null); return withSig.length ? `${Math.round(withSig.reduce((s, d) => s + d._sc.signal.score, 0) / withSig.length)}%` : '·' })() },
            { label: 'BEST DAY', value: best ? `${best._sc.miles} · ${fmtDay(best.day, { month: 'short', day: 'numeric' })}` : '·' },
          ].map(t => (
            <div key={t.label} style={{ borderLeft: '2px solid rgba(248,199,97,0.45)', paddingLeft: 12 }}>
              <div className="sa-tele" style={{ fontSize: 9, letterSpacing: '1.4px', color: PERIWINKLE }}>{t.label}</div>
              <div className="sa-serif" style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginTop: 2 }}>{t.value}</div>
            </div>
          ))}
        </div>

        {/* Miles by day, signal beneath */}
        <div className="sa-tele" style={{ fontSize: 9.5, letterSpacing: '1.6px', color: GOLD, marginBottom: 12 }}>MILES BY DAY · GOLD, WITH SIGNAL % IN BLUE</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 170, padding: '0 2px', borderBottom: `1px solid ${LINE}` }}>
          {scored.map(d => {
            const m = d._sc.miles
            const g = milesGrade(m)
            const sigPct = (d._sc.signal || {}).score
            return (
              <div key={d.day} title={`${d.day} · ${m} miles · signal ${sigPct ?? '?'}%`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <span className="sa-serif" style={{ fontSize: 12.5, color: g === 'S' ? GOLD : INK2 }}>{g}</span>
                <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: '78%' }}>
                  <div style={{ flex: 2, height: `${Math.max(3, m * 10)}%`, background: 'linear-gradient(180deg, rgba(248,199,97,0.95), rgba(248,199,97,0.45))', borderRadius: '3px 3px 0 0' }} />
                  <div style={{ flex: 1, height: `${Math.max(2, sigPct || 0)}%`, background: 'rgba(150,168,240,0.55)', borderRadius: '3px 3px 0 0' }} />
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '6px 2px 0' }}>
          {scored.map(d => (
            <div key={d.day} className="sa-tele" style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: INK3, letterSpacing: '0.5px' }}>{shortDay(d.day)}</div>
          ))}
        </div>

        {/* Badge tallies */}
        <div className="sa-tele" style={{ fontSize: 9.5, letterSpacing: '1.6px', color: GOLD, margin: '26px 0 12px' }}>BADGE COLLECTION</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {Object.entries(BADGES).map(([id, B]) => {
            const n = badgeCounts[id] || 0
            const Icon = B.Icon
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                border: `1px solid ${n ? 'rgba(248,199,97,0.45)' : LINE}`,
                background: n ? 'rgba(248,199,97,0.06)' : 'rgba(255,255,255,0.02)', opacity: n ? 1 : 0.55,
              }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: n ? GOLD : INK3, border: `1px solid ${n ? 'rgba(248,199,97,0.6)' : LINE}`,
                }}><Icon size={14} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="sa-tele" style={{ display: 'block', fontSize: 9, letterSpacing: '1.2px', color: n ? INK : INK3 }}>{B.label.toUpperCase()}</span>
                  <span style={{ fontSize: 10.5, color: INK3 }}>{B.track}</span>
                </span>
                <span className="sa-serif" style={{ fontSize: 18, fontWeight: 500, color: n ? GOLD : INK3 }}>{n}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function DayLibraryPage() {
  const [days, setDays] = useState(null)
  const [selDay, setSelDay] = useState(null)
  const [showChart, setShowChart] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_performance')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(400)
      if (error) { setDays((p) => p || []); return }
      // Latest Daily Report per day = the definitive record. The day's latest
      // SCORED row (any model) carries the collection: miles + badges.
      const byDay = new Map()
      const scByDay = new Map()
      for (const r of data || []) {
        if (r.model === 'Daily Report' && !byDay.has(r.day)) byDay.set(r.day, r)
        if (r.scorecard && !scByDay.has(r.day)) scByDay.set(r.day, r.scorecard)
      }
      const merged = [...byDay.values()].map(d => ({ ...d, _sc: scByDay.get(d.day) || null }))
      setDays(merged.sort((a, b) => (a.day < b.day ? 1 : -1)))
    } catch { setDays((p) => p || []) }
  }, [])

  useEffect(() => { load() }, [load])

  const row = days && (days.find((d) => d.day === selDay) || days[0])

  return (
    <div className="eco2-wrap">
      <PageHead
        eyebrow="DAILY MONITOR · DAY LIBRARY"
        title="Day Library"
        em="· the finished days"
        desc="Every day closes at 10 PM when the Daily Report writes its definitive record. This is the shelf: the whole day, callable at any point."
      />

      {showChart && days && <ScoringDashboard days={days} onClose={() => setShowChart(false)} />}

      {days && days.length > 0 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '0 0 22px' }}>
          {[['shelf', 'The Shelf'], ['chart', 'Scoring']].map(([id, label]) => {
            const on = id === 'chart' ? showChart : !showChart
            return (
              <button key={id} onClick={() => setShowChart(id === 'chart')} style={{
                padding: '5px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)',
                fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
                background: on ? '#A9C9E8' : 'transparent',
                color: on ? '#0E2336' : INK2,
                border: on ? '1px solid #A9C9E8' : `1px solid ${LINE}`,
              }}>{label}</button>
            )
          })}
        </div>
      )}

      {days === null && <div className="sa-tele" style={{ color: INK3, padding: '40px 0' }}>LOADING…</div>}

      {days && !days.length && (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <div className="sa-serif" style={{ fontSize: 26, color: INK, fontWeight: 500, letterSpacing: '-0.01em' }}>No finished days yet</div>
          <p style={{ maxWidth: '48ch', margin: '12px auto 0', fontSize: 14, lineHeight: 1.6, color: INK2 }}>
            The first Daily Report closes tonight at 10 PM; the day lands here the moment it does.
          </p>
        </div>
      )}

      {row && (
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', maxWidth: 1220, margin: '0 auto', paddingBottom: 60 }}>
          {/* The shelf — the river chart of collected days */}
          <div style={{ flex: '0 0 250px', position: 'sticky', top: 10 }}>
            <div className="sa-tele" style={{ color: INK3, marginBottom: 6 }}>{days.length} FINISHED {days.length === 1 ? 'DAY' : 'DAYS'}</div>
            {(() => {
              const totalMiles = days.reduce((s, d) => s + ((d._sc || {}).miles || 0), 0)
              return totalMiles > 0 ? (
                <div className="sa-tele" style={{ color: GOLD, marginBottom: 12, letterSpacing: '1.4px' }}>
                  {Math.round(totalMiles * 10) / 10} MILES DOWNRIVER
                </div>
              ) : <div style={{ marginBottom: 6 }} />
            })()}
            {days.map((d) => {
              const on = d.day === row.day
              const g = milesGrade((d._sc || {}).miles)
              return (
                <button key={d.id} onClick={() => setSelDay(d.day)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '10px 14px', marginBottom: 8, borderRadius: 10,
                  border: `1px solid ${on ? 'rgba(248,199,97,0.55)' : LINE}`,
                  background: on ? 'rgba(248,199,97,0.10)' : 'rgba(255,255,255,0.03)',
                }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="sa-serif" style={{ display: 'block', fontSize: 15.5, fontWeight: 500, letterSpacing: '-0.01em', color: on ? '#fff' : INK }}>
                      {fmtDay(d.day, { weekday: 'long' })}
                    </span>
                    <span className="sa-tele" style={{ display: 'block', color: on ? GOLD : INK3, marginTop: 3 }}>
                      {fmtDay(d.day, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                    </span>
                    {((d._sc || {}).badges || []).length > 0 && (
                      <span style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                        {(d._sc.badges || []).slice(0, 5).map(id => {
                          const B = BADGES[id]
                          if (!B) return null
                          const Icon = B.Icon
                          return (
                            <span key={id} title={B.label} style={{
                              width: 17, height: 17, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              color: GOLD, border: '1px solid rgba(248,199,97,0.45)', background: 'rgba(248,199,97,0.07)',
                            }}><Icon size={9} /></span>
                          )
                        })}
                      </span>
                    )}
                  </span>
                  {g && (() => {
                    const tier = signalTier(((d._sc || {}).signal || {}).score)
                    return (
                      <span className="sa-serif"
                        title={`${(d._sc || {}).miles} miles${tier ? ` · seen at ${d._sc.signal.score}% (${tier.label})` : ''}`}
                        style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14.5, fontWeight: 500,
                          color: g === 'S' ? '#16324A' : GOLD,
                          background: g === 'S' ? GOLD : 'rgba(248,199,97,0.10)',
                          border: `1.5px ${tier ? tier.ring : 'solid'} rgba(248,199,97,${g === 'S' ? 1 : 0.6})`,
                          opacity: tier ? tier.opacity : 1,
                        }}>{g}</span>
                    )
                  })()}
                </button>
              )
            })}
          </div>

          {/* The record */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                <div className="sa-serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em', color: '#fff' }}>
                  {fmtDay(row.day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <span className="sa-tele" style={{ color: PERIWINKLE }}>CLOSED {new Date(row.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase()}</span>
                {row._sc && row._sc.miles != null && (() => {
                  const tier = signalTier((row._sc.signal || {}).score)
                  return (
                    <span className="sa-tele" style={{ color: GOLD, letterSpacing: '1.4px' }}>
                      {row._sc.miles} MILES · GRADE {milesGrade(row._sc.miles)}
                      {tier && <span style={{ color: tier.id === 'clear' ? GOLD : INK3 }}> · SEEN AT {row._sc.signal.score}% · {tier.label.toUpperCase()}</span>}
                    </span>
                  )
                })()}
              </div>
              {row._sc && (row._sc.badges || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  {(row._sc.badges || []).map(id => {
                    const B = BADGES[id]
                    if (!B) return null
                    const Icon = B.Icon
                    return (
                      <span key={id} title={`${B.label} · ${B.desc}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px 4px 5px',
                        borderRadius: 999, border: '1px solid rgba(248,199,97,0.5)', background: 'rgba(248,199,97,0.08)',
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: GOLD, border: '1px solid rgba(248,199,97,0.6)',
                        }}><Icon size={12} /></span>
                        <span className="sa-tele" style={{ fontSize: 9, letterSpacing: '1.2px', color: INK }}>{B.label.toUpperCase()}</span>
                      </span>
                    )
                  })}
                </div>
              )}
              <p style={{
                fontSize: 15.5, lineHeight: 1.75, margin: '16px 0 0', maxWidth: '72ch',
                color: 'rgba(234,241,248,0.88)', paddingLeft: 18, borderLeft: '2px solid rgba(248,199,97,0.55)',
              }}>{row.summary}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
              <div style={panel}>
                <Eyebrow>Accomplishments</Eyebrow>
                <List items={row.accomplishments} empty="Nothing banked."
                  marker={<span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: GOLD, marginTop: 7 }} />} />
              </div>
              <div style={panel}>
                <Eyebrow>What You Learned</Eyebrow>
                <List items={row.learned} empty="Nothing recorded."
                  marker={<span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: GOLD, marginTop: 7 }} />} />
              </div>
              <div style={panel}>
                <Eyebrow>Interactions</Eyebrow>
                <List items={row.interactions} empty="None recorded."
                  marker={<span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: PERIWINKLE, marginTop: 7 }} />} />
              </div>
              <div style={panel}>
                <Eyebrow>Team Allocation</Eyebrow>
                <List items={row.team_allocation} mono empty="No time recorded." marker={null} />
              </div>
              <div style={panel}>
                <Eyebrow extra={`${(row.must_do || []).filter((t) => t.done).length}/${(row.must_do || []).length}`}>Final Must-Do State</Eyebrow>
                {!(row.must_do || []).length && <div style={{ fontSize: 13.5, color: INK3 }}>Nothing was flagged.</div>}
                {(row.must_do || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5.5px 0' }}>
                    {t.done
                      ? <CheckCircle2 size={16} style={{ color: '#5FBF8A', flexShrink: 0, marginTop: 2 }} />
                      : <Circle size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 2 }} />}
                    <span style={{
                      fontSize: 14, lineHeight: 1.5,
                      color: t.done ? INK3 : INK,
                      textDecoration: t.done ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.25)',
                    }}>{t.text}</span>
                  </div>
                ))}
              </div>
              <div style={panel}>
                <Eyebrow>Carried Forward</Eyebrow>
                <List items={row.new_items} empty="Nothing left unassigned."
                  marker={<Flag size={14} style={{ color: GOLD, flexShrink: 0, marginTop: 3, opacity: 0.75 }} />} />
              </div>
            </div>

            <div style={panel}>
              <Eyebrow>The Closing Read</Eyebrow>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: INK2, margin: 0, maxWidth: '90ch' }}>{row.notes}</p>
              <div className="sa-tele" style={{ color: INK3, marginTop: 16 }}>
                DAILY REPORT · CLOSED AT 10 PM · THE RECORD IS IMMUTABLE UNLESS RE-CLOSED
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
