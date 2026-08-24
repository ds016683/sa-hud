import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, CheckCircle2, Circle, AlertCircle, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SECTION_BLUE = '#1F4060'
const GOLD = '#E6B54F'
const GREEN = '#5FBF8A'
const RED = '#E06C5F'

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

function Glyph({ status }) {
  if (status === 'done') return <CheckCircle2 size={17} style={{ color: GOLD, flexShrink: 0, marginTop: '2px' }} />
  if (status === 'inmotion') return <Loader size={17} className="sb-spin" style={{ color: GOLD, flexShrink: 0, marginTop: '2px' }} />
  if (status === 'blocked') return <AlertCircle size={17} style={{ color: RED, flexShrink: 0, marginTop: '2px' }} />
  return <Circle size={17} style={{ color: 'var(--sa-border-2)', flexShrink: 0, marginTop: '2px' }} />
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

  if (rows === null) {
    return <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', padding: '40px' }}>Loading…</div>
  }

  if (!rows.length) {
    return (
      <div className="sa-grid">
        <div className="col-12 sa-card" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="sa-serif" style={{ fontSize: '26px', color: 'var(--sa-ink)' }}>Session Boards</div>
          <p style={{ maxWidth: '54ch', margin: '12px auto 0', fontSize: '14px', lineHeight: 1.6, color: 'var(--sa-ink-2)' }}>
            Every Claude session running /hud-board mirrors its task list here, one board per
            project. This is the cross-session view: what every agent is working on, live.
          </p>
          <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '22px' }}>NO BOARDS IN THE LEDGER YET</div>
        </div>
      </div>
    )
  }

  const stats = boardStats(board.phases)

  return (
    <div className="sa-grid">
      <style>{`
        @keyframes sbspin { to { transform: rotate(360deg) } }
        .sb-spin { animation: sbspin 2.4s linear infinite }
        @keyframes sbpulse { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
        .sb-pulse { animation: sbpulse 2.2s ease-in-out infinite }
      `}</style>

      {/* Project selector */}
      <div className="col-12 sa-card" style={{ padding: '16px var(--sa-pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {rows.map((r) => {
            const on = r.id === board.id
            const live = isLive(r.updated_at)
            const s = boardStats(r.phases)
            return (
              <button
                key={r.id}
                onClick={() => setSelProject(r.project)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '7px 14px', borderRadius: '999px', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: on ? 600 : 400,
                  border: `1px solid ${on ? SECTION_BLUE : 'var(--sa-border-2)'}`,
                  background: on ? SECTION_BLUE : 'var(--sa-surface)',
                  color: on ? '#fff' : 'var(--sa-ink-2)',
                }}
              >
                {live && <span className="sb-pulse" style={{ width: '7px', height: '7px', borderRadius: '50%', background: GREEN }} />}
                {r.project}
                <span style={{ fontSize: '10.5px', opacity: 0.75, fontFamily: 'var(--font-mono, monospace)' }}>{s.done}/{s.total}</span>
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <button
            onClick={load}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px',
              padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--sa-border-2)',
              background: 'var(--sa-surface)', color: 'var(--sa-ink-2)', cursor: 'pointer',
            }}
          ><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      {/* The selected board */}
      <div className="col-12 sa-card" style={{ padding: 'var(--sa-pad)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
          <div className="sa-serif" style={{ fontSize: '24px', color: 'var(--sa-ink)' }}>{board.title || board.project}</div>
          <span className="sa-tele" style={{ color: isLive(board.updated_at) ? GREEN : 'var(--sa-ink-3)' }}>
            {isLive(board.updated_at) ? 'LIVE' : 'IDLE'} · {stats.done}/{stats.total} DONE · UPDATED {fmtTime(board.updated_at).toUpperCase()}
          </span>
        </div>

        {(board.phases || []).map((p, pi) => {
          const pd = (p.tasks || []).filter((t) => t.status === 'done').length
          return (
            <div key={pi} style={{ marginTop: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--sa-border)', paddingBottom: '8px', marginBottom: '6px' }}>
                <div style={{ color: SECTION_BLUE, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '12.5px' }}>{p.title}</div>
                <span className="sa-tele" style={{ color: pd === (p.tasks || []).length ? GOLD : 'var(--sa-ink-3)' }}>{pd}/{(p.tasks || []).length}</span>
              </div>
              {(p.tasks || []).map((t, ti) => (
                <button
                  key={ti}
                  onClick={() => toggleTask(pi, ti)}
                  title={t.status === 'done' ? 'Reopen' : 'Mark done'}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '11px', width: '100%',
                    textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '7px 0',
                  }}
                >
                  <Glyph status={t.status} />
                  <span style={{ fontSize: '14px', lineHeight: 1.5 }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: GOLD, marginRight: '8px' }}>{t.id}</span>
                    <span style={{
                      color: t.status === 'done' ? 'var(--sa-ink-3)' : t.status === 'open' ? 'var(--sa-ink-2)' : 'var(--sa-ink)',
                      textDecoration: t.status === 'done' ? 'line-through' : 'none',
                    }}>{t.label}</span>
                    {t.note && <span style={{ display: 'block', fontSize: '12.5px', color: t.status === 'blocked' ? RED : 'var(--sa-ink-3)', marginTop: '2px' }}>{t.note}</span>}
                  </span>
                </button>
              ))}
            </div>
          )
        })}

        <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '28px' }}>
          AGENT IS WRITER OF RECORD WHILE ITS SESSION RUNS · YOUR CHECKS STICK ONCE IT STOPS SYNCING · POLLS EVERY 5S
        </div>
      </div>
    </div>
  )
}
