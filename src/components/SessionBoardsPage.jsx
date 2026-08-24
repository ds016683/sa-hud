import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHead } from './sa/SaUi'
import { supabase } from '../lib/supabase'

const GOLD = '#F8C761'
const GREEN = '#5FBF8A'
const RED = '#E06C5F'
const LINE = 'rgba(255,255,255,0.10)'
const INK = 'rgba(255,255,255,0.92)'
const INK2 = 'rgba(255,255,255,0.62)'
const INK3 = 'rgba(255,255,255,0.40)'

function fmtTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function isLive(ts) {
  return ts && (Date.now() - new Date(ts).getTime()) < 10 * 60 * 1000
}

function boardStats(phases) {
  const tasks = (phases || []).flatMap((p) => p.tasks || [])
  return { done: tasks.filter((t) => t.status === 'done').length, total: tasks.length }
}

// Same glyph convention as the browser-pane board (board.html).
function Glyph({ status }) {
  const base = {
    flex: '0 0 17px', width: 17, height: 17, marginTop: 2, borderRadius: '50%',
    border: '1.4px solid rgba(255,255,255,0.28)', position: 'relative', display: 'inline-block',
  }
  if (status === 'done') {
    return (
      <span style={{ ...base, background: GREEN, borderColor: GREEN }}>
        <span style={{
          position: 'absolute', left: 4.5, top: 1.5, width: 4, height: 8,
          border: 'solid #0E2336', borderWidth: '0 2px 2px 0', transform: 'rotate(42deg)',
        }} />
      </span>
    )
  }
  if (status === 'inmotion') {
    return (
      <span style={{ ...base, borderColor: GOLD, background: 'rgba(248,199,97,0.16)' }}>
        <span className="sb-pulse" style={{ position: 'absolute', inset: 3.5, borderRadius: '50%', background: GOLD }} />
      </span>
    )
  }
  if (status === 'blocked') {
    return (
      <span style={{ ...base, borderColor: RED, background: 'rgba(224,108,95,0.14)' }}>
        <span style={{ position: 'absolute', left: 5.2, top: -1, color: RED, fontSize: 11, fontWeight: 600 }}>!</span>
      </span>
    )
  }
  return <span style={base} />
}

export default function SessionBoardsPage() {
  const [rows, setRows] = useState(null)
  const [selProject, setSelProject] = useState(null)
  const savingRef = useRef(false)

  const load = useCallback(async () => {
    if (savingRef.current) return
    const { data, error } = await supabase
      .from('session_boards')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error) setRows(data || [])
    else if (rows === null) setRows([])
  }, [rows])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  const board = rows && (rows.find((r) => r.project === selProject) || rows[0])

  const toggleTask = async (phaseIdx, taskIdx) => {
    if (!board) return
    const phases = board.phases.map((p, pi) => pi !== phaseIdx ? p : ({
      ...p,
      tasks: p.tasks.map((t, ti) => ti !== taskIdx ? t : ({
        ...t,
        status: t.status === 'done' ? 'open' : 'done',
      })),
    }))
    savingRef.current = true
    const { error } = await supabase
      .from('session_boards')
      .update({ phases, updated_at: new Date().toISOString() })
      .eq('id', board.id)
    if (!error) setRows(rows.map((r) => r.id === board.id ? { ...r, phases } : r))
    savingRef.current = false
  }

  const stats = board ? boardStats(board.phases) : null

  return (
    <div className="eco2-wrap">
      <style>{`
        @keyframes sbpulse { 0%,100% { opacity: 1 } 50% { opacity: .25 } }
        .sb-pulse { animation: sbpulse 1.8s ease-in-out infinite }
      `}</style>
      <PageHead
        eyebrow="COMMAND · SESSION BOARDS"
        title="Session Boards"
        em="· the agent fleet, live"
        desc="Every Claude session running /hud-board mirrors its task list into the Ledger, one board per project. Agents check items off as they verify; boards pulse while their sessions work."
        right={
          rows && rows.length > 0 ? (
            <button
              onClick={load}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12,
                padding: '7px 14px', borderRadius: 999, border: `1px solid ${LINE}`,
                background: 'transparent', color: INK2, cursor: 'pointer',
              }}
            ><RefreshCw size={13} /> Refresh</button>
          ) : null
        }
      />

      {rows === null && (
        <div className="sa-tele" style={{ color: INK3, padding: '40px 0' }}>LOADING…</div>
      )}

      {rows && !rows.length && (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <div className="sa-serif" style={{ fontSize: 26, color: INK }}>No boards in the Ledger yet</div>
          <p style={{ maxWidth: '52ch', margin: '12px auto 0', fontSize: 14, lineHeight: 1.6, color: INK2 }}>
            Start a session anywhere and say &ldquo;put up the board&rdquo; — it will appear here.
          </p>
        </div>
      )}

      {board && (
        <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 60 }}>
          {/* Project selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '6px 0 30px' }}>
            {rows.map((r) => {
              const on = r.id === board.id
              const live = isLive(r.updated_at)
              const s = boardStats(r.phases)
              return (
                <button
                  key={r.id}
                  onClick={() => setSelProject(r.project)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 12.5, fontWeight: on ? 600 : 400, letterSpacing: '0.01em',
                    border: `1px solid ${on ? GOLD : 'rgba(255,255,255,0.16)'}`,
                    background: on ? GOLD : 'rgba(255,255,255,0.04)',
                    color: on ? '#16324A' : INK2,
                  }}
                >
                  {live && <span className="sb-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: on ? '#16324A' : GREEN }} />}
                  {r.project}
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, opacity: 0.75 }}>{s.done}/{s.total}</span>
                </button>
              )
            })}
          </div>

          {/* Board header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', borderBottom: `1px solid ${LINE}`, paddingBottom: 16 }}>
            <div className="sa-serif" style={{ fontSize: 26, color: '#fff', lineHeight: 1.2 }}>{board.title || board.project}</div>
            <span className="sa-tele" style={{ color: isLive(board.updated_at) ? GREEN : INK3, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {isLive(board.updated_at) && <span className="sb-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} />}
              {isLive(board.updated_at) ? 'LIVE' : 'IDLE'} · {stats.done}/{stats.total} DONE · UPDATED {fmtTime(board.updated_at).toUpperCase()}
            </span>
          </div>

          {/* Phases */}
          {(board.phases || []).map((p, pi) => {
            const pd = (p.tasks || []).filter((t) => t.status === 'done').length
            return (
              <div key={pi} style={{ marginTop: 30 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                  <div className="sa-serif" style={{ fontSize: 16.5, fontWeight: 500, color: INK }}>{p.title}</div>
                  <span className="sa-tele" style={{ color: pd === (p.tasks || []).length ? GOLD : INK3 }}>{pd}/{(p.tasks || []).length}</span>
                </div>
                {(p.tasks || []).map((t, ti) => (
                  <button
                    key={ti}
                    onClick={() => toggleTask(pi, ti)}
                    title={t.status === 'done' ? 'Reopen' : 'Mark done'}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%',
                      textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                      padding: '6.5px 0',
                    }}
                  >
                    <Glyph status={t.status} />
                    <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: '#E6B54F', marginRight: 8, letterSpacing: '0.5px' }}>{t.id}</span>
                      <span style={{
                        color: t.status === 'done' ? INK3 : t.status === 'inmotion' ? INK : INK2,
                        textDecoration: t.status === 'done' ? 'line-through' : 'none',
                        textDecorationColor: 'rgba(255,255,255,0.25)',
                      }}>{t.label}</span>
                      {t.note && <span style={{ display: 'block', fontSize: 12, color: t.status === 'blocked' ? RED : INK3, marginTop: 2 }}>{t.note}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )
          })}

          {/* Legend + contract */}
          <div className="sa-tele" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: INK3, borderTop: `1px solid ${LINE}`, marginTop: 34, paddingTop: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />DONE</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, display: 'inline-block' }} />IN MOTION</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: RED, display: 'inline-block' }} />WAITING ON DAVID</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block' }} />OPEN</span>
            <span style={{ marginLeft: 'auto' }}>AGENT IS WRITER OF RECORD WHILE ITS SESSION RUNS · POLLS EVERY 5S</span>
          </div>
        </div>
      )}
    </div>
  )
}
