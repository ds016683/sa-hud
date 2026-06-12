import { useState, useEffect } from 'react'
import { Activity, Repeat, Zap, Moon, ListChecks, FileText } from 'lucide-react'
import { phases, shadows as shadowDefs } from '../constants/gameData'
import { statusFor, greetingFor, THESIS, SOV_DEF, PASSIVE, ATTRIBUTES, PROTOCOLS } from '../constants/saDesign'
import { Card, SecHead, TheoAv } from './sa/SaUi'
import useActivityLog, { formatEntryNarrative } from '../hooks/useActivityLog'
import NotePrompt from './NotePrompt'
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase'

// Skill definitions — cost/cooldown model lifted verbatim from HorizontalSkills.jsx
const SKILLS = [
  { id: 'sovereign_yield', name: 'Sovereign Yield', cost: 0, cooldown: 120, costLabel: 'Restorative',
    desc: 'Restore through chosen surrender. Agency without surrender becomes rigidity.',
    impact: (i) => `+${i === 'low' ? '15' : i === 'med' ? '25' : '40'}% Sovereignty` },
  { id: 'walling', name: 'Walling', cost: 5, cooldown: 20, costLabel: 'Low',
    desc: 'Set boundaries. Name what isn’t yours and refuse to carry it.',
    impact: (i) => `Clear burden +${i === 'low' ? '3' : i === 'med' ? '6' : '10'}%` },
  { id: 'gordian_cut', name: 'Gordian Cut', cost: 5, cooldown: 30, costLabel: 'Medium',
    desc: 'Cut through complexity to the real problem in one move.',
    impact: (i) => `Pattern Recognition +${i === 'low' ? '5' : i === 'med' ? '10' : '15'}%` },
  { id: 'decisive_intervention', name: 'Decisive Intervention', cost: 15, cooldown: 60, costLabel: 'High',
    desc: 'Force movement when systems stall. Break the logjam.',
    impact: (i) => `Agency +${i === 'low' ? '10' : i === 'med' ? '20' : '30'}%` },
  { id: 'galvanic_surge', name: 'Galvanic Surge', cost: 25, cooldown: 90, costLabel: 'High',
    desc: 'Rally others into motion. High personal cost — use sparingly.',
    impact: (i) => `Team +${i === 'low' ? '10' : i === 'med' ? '20' : '30'}%` },
]

const SKILL_NAMES = Object.fromEntries(SKILLS.map(s => [s.id, s.name]))
const SHADOW_NAMES = Object.fromEntries(shadowDefs.map(s => [s.id, s.name]))

const LOG_TONES = {
  skill: 'var(--sa-accent)',
  shadow: '#A8382F',
  sovereignty: '#2F7A4F',
  loop: '#4DA3FF',
  session: 'var(--sa-border-2)',
  checkin: 'var(--sa-border-2)',
  manual: 'var(--sa-border-2)',
}

const localDateStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function Hero({ sov, onCommit, greeting, currentLoop }) {
  const [drag, setDrag] = useState(null)
  const shown = drag ?? sov
  const st = statusFor(shown)
  const R = 86, C = 2 * Math.PI * R
  const off = C * (1 - shown / 100)

  const commit = () => {
    if (drag !== null && drag !== sov) onCommit(drag, sov)
    setDrag(null)
  }

  return (
    <section className="sa-hero">
      <div>
        <div className="sa-hero-eyebrow sa-tele"><span className="bar"></span>CLASS · SOVEREIGN ARCHITECT</div>
        <h1>{greeting}, <em>David.</em></h1>
        <p>{THESIS}</p>
        <div className="sa-hero-meta">
          <div><div className="sa-tele k">PRIMARY THREAT</div><div className="v" style={{ fontSize: '15px' }}>Ontological Inefficiency</div></div>
          <div><div className="sa-tele k">CURRENT LOOP</div><div className="v">{currentLoop ? currentLoop.name : '—'} {currentLoop && <small>· {currentLoop.cost.replace(' drain', '').toUpperCase()}</small>}</div></div>
          <div><div className="sa-tele k">RESPEC PATH</div><div className="v" style={{ fontSize: '15px' }}>Integrated Sovereign</div></div>
        </div>
      </div>

      <div className="sa-gauge">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="12" />
          <circle cx="100" cy="100" r={R} fill="none" stroke={st.color} strokeWidth="12"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
            style={{ transition: 'stroke-dashoffset .5s var(--ease-out), stroke .3s' }} />
        </svg>
        <div className="sa-gauge-center">
          <div className="sa-gauge-num">{shown}<span>%</span></div>
          <div className="sa-gauge-lbl sa-tele">SOVEREIGNTY</div>
          <div className="sa-gauge-status sa-tele" style={{ background: st.color + '22', color: st.color }}>{st.status}</div>
        </div>
      </div>

      <div className="sa-sov-foot">
        <div className="desc">{SOV_DEF}</div>
        <div className="sa-sov-slider">
          <span className="hint">DRAIN</span>
          <input type="range" min="0" max="100" value={shown}
            onChange={(e) => setDrag(parseInt(e.target.value))}
            onMouseUp={commit} onTouchEnd={commit} onKeyUp={commit} />
          <span className="hint">RESTORE</span>
        </div>
      </div>

      <svg className="sa-rapids" viewBox="0 0 1200 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40 C 120 12, 220 12, 340 40 S 560 68, 680 40 S 900 12, 1020 40 S 1180 56, 1200 44" fill="none" stroke="var(--sa-accent)" strokeWidth="1.5" opacity="0.7" />
        <path d="M0 52 C 140 30, 260 30, 380 52 S 600 74, 720 52 S 940 30, 1060 52 1200 52" fill="none" stroke="#4DA3FF" strokeWidth="1" opacity="0.4" />
      </svg>
    </section>
  )
}

function DashBrief() {
  const [state, setState] = useState({ loading: true, lines: null })

  useEffect(() => {
    const dateStr = localDateStr(new Date())
    const hdrs = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
    fetch(`${supabaseUrl}/rest/v1/briefings?date=eq.${dateStr}&type=eq.morning_briefing`, { headers: hdrs })
      .then(r => r.json())
      .then(rows => {
        const text = rows?.length ? rows[0].briefing_text : null
        const lines = text
          ? text.split('\n')
              .map(l => l.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '').replace(/^[-*]\s+/, '· ').trim())
              .filter(Boolean)
              .slice(0, 6)
          : null
        setState({ loading: false, lines })
      })
      .catch(() => setState({ loading: false, lines: null }))
  }, [])

  return (
    <section className="sa-card">
      <div className="sa-card-head">
        <div style={{ display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
          <TheoAv />
          <div className="htext">
            <div className="sa-tele eyebrow">THE BRAIN · TODAY</div>
            <div className="title">{state.loading ? 'Checking the morning brief…' : state.lines ? 'This morning’s briefing' : 'No brief yet today'}</div>
            <div className="sub">{state.lines ? 'Generated overnight — full text lives in Daily Summary.' : 'The overnight pipeline hasn’t published for today.'}</div>
          </div>
        </div>
      </div>
      {state.lines && state.lines.map((l, i) => (
        <div className="sa-row" key={i} style={{ alignItems: 'flex-start' }}>
          <div className="grow" style={{ fontSize: '13.5px', color: 'var(--sa-ink)', lineHeight: 1.45 }}>{l}</div>
        </div>
      ))}
    </section>
  )
}

function Attributes() {
  return (
    <Card icon={Activity} eyebrow="CHARACTER SHEET" title="Core Attributes" sub="Specialized, not broken.">
      {ATTRIBUTES.map((a) => (
        <div className="sa-attr" key={a.name}>
          <div className="sa-tier" style={{ background: a.color }}>{a.tier}</div>
          <div className="sa-attr-body">
            <div className="sa-attr-name">{a.name} <small>{a.sub}</small></div>
            <div className="sa-attr-desc">{a.desc}</div>
            <div className="sa-attr-bar"><i style={{ width: a.value + '%', background: a.color }}></i></div>
          </div>
        </div>
      ))}
    </Card>
  )
}

function Protocol({ which }) {
  const p = PROTOCOLS[which] || PROTOCOLS.morning
  const [done, setDone] = useState({})
  return (
    <Card icon={ListChecks} eyebrow="TODAY'S PROTOCOL" title={p.title} sub="A few minutes. Then move.">
      {p.steps.map((s, i) => (
        <div key={i} className={`sa-proto-step${done[i] ? ' done' : ''}`} onClick={() => setDone({ ...done, [i]: !done[i] })}>
          <div className="sa-proto-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
          <div className="sa-proto-label">{s.label}</div>
          <div className="sa-proto-time">{s.time}</div>
        </div>
      ))}
    </Card>
  )
}

function ShadowScan({ shadows, onShadowChange }) {
  const activeCount = Object.values(shadows || {}).filter(Boolean).length
  const levels = ['low', 'med', 'high']
  return (
    <Card icon={Moon} eyebrow="DIAGNOSTICS" title="Shadow Scan"
      right={<span className="sa-tele eyebrow" style={{ color: activeCount ? '#A8382F' : 'var(--sa-ink-3)' }}>{activeCount} ACTIVE</span>}>
      {shadowDefs.map((s) => {
        const cur = shadows?.[s.id] || null
        return (
          <div className={`sa-shadow${cur ? ' on' : ''}`} key={s.id}>
            <div className="sa-shadow-glyph"><Moon size={15} /></div>
            <div className="sa-shadow-body">
              <div className="sa-shadow-name">{s.name}</div>
              <div className="sa-shadow-anti">{cur ? `↳ ${s.antidote}` : 'Clear.'}</div>
              {cur && (
                <div className="sa-intensity" style={{ marginTop: '7px' }}>
                  {levels.map((l) => (
                    <button key={l} className={`sa-int-btn${cur === l ? ' on' : ''}`}
                      onClick={() => cur !== l && onShadowChange(s.id, l, cur)}>{l.toUpperCase()}</button>
                  ))}
                </div>
              )}
            </div>
            <button className="sa-shadow-toggle" aria-label={`toggle ${s.name}`}
              onClick={() => onShadowChange(s.id, cur ? null : 'low', cur)}><i></i></button>
          </div>
        )
      })}
    </Card>
  )
}

function IdentityLoop({ currentPhase, onPhaseChange }) {
  const idx = typeof currentPhase === 'number'
    ? currentPhase
    : phases.findIndex(p => p.name === currentPhase)
  const cur = idx >= 0 ? phases[idx] : null
  return (
    <Card icon={Repeat} eyebrow="OPERATING LOOP" title="Identity Loop"
      right={<span className="sa-tele eyebrow">{idx >= 0 ? `PHASE ${idx + 1} / 8` : 'UNSET'}</span>}>
      <div className="sa-loop-track">
        {phases.map((p, i) => (
          <button key={p.name} className={`sa-phase${i === idx ? ' active' : (idx >= 0 && i < idx ? ' done' : '')}`}
            onClick={() => onPhaseChange(p.name, cur ? cur.name : null)} title={p.short}>
            <div className="sa-phase-bar"></div>
            <div className="sa-phase-name">{p.name}</div>
            <div className="sa-phase-cost">{p.cost.replace(' drain', '')}</div>
          </button>
        ))}
      </div>
      <div className="sa-loop-now">
        <div className="ph">{cur ? cur.name : 'No phase set'}</div>
        <div className="tx">{cur ? <>{cur.short}. <b style={{ color: 'var(--sa-ink)' }}>Cost: {cur.cost.replace(' drain', '')}.</b> Release cannot be skipped, or the system degrades.</> : 'Select the phase you’re actually in — the loop only works if it’s honest.'}</div>
      </div>
    </Card>
  )
}

function SkillsPanel({ sovereignty, setSovereignty, onSkillActivate }) {
  const [cooldowns, setCooldowns] = useState({})
  const [notice, setNotice] = useState(null)
  const levels = ['low', 'med', 'high']

  useEffect(() => {
    if (!Object.keys(cooldowns).length) return
    const id = setInterval(() => {
      setCooldowns(prev => {
        const next = {}
        Object.entries(prev).forEach(([k, v]) => { if (v > 1) next[k] = v - 1 })
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldowns])

  // Activation math lifted verbatim from HorizontalSkills.activateSkill
  const activate = (skill, intensity) => {
    if (cooldowns[skill.id]) {
      setNotice({ kind: 'warn', text: `${skill.name} is on cooldown (${cooldowns[skill.id]}s)` })
      setTimeout(() => setNotice(null), 2500)
      return
    }
    const costMultiplier = intensity === 'low' ? 0.3 : intensity === 'med' ? 0.6 : 1
    const actualCost = Math.round(skill.cost * costMultiplier)
    if (skill.id !== 'sovereign_yield' && sovereignty < actualCost) {
      setNotice({ kind: 'warn', text: 'Insufficient Sovereignty.' })
      setTimeout(() => setNotice(null), 2500)
      return
    }
    const sovereigntyBefore = sovereignty
    if (skill.id === 'sovereign_yield') {
      const gain = intensity === 'low' ? 15 : intensity === 'med' ? 25 : 40
      setSovereignty(Math.min(100, sovereignty + gain))
    } else if (skill.id === 'walling') {
      const gain = intensity === 'low' ? 3 : intensity === 'med' ? 6 : 10
      setSovereignty(Math.min(100, Math.max(0, sovereignty + gain - actualCost)))
    } else {
      setSovereignty(Math.max(0, sovereignty - actualCost))
    }
    setCooldowns(prev => ({ ...prev, [skill.id]: skill.cooldown }))
    setNotice({ kind: 'ok', text: skill.impact(intensity) })
    setTimeout(() => setNotice(null), 3500)
    onSkillActivate(skill.id, intensity, sovereigntyBefore)
  }

  return (
    <Card icon={Zap} eyebrow="ACTIVE SKILLS" title="Activatable Moves" sub="Each carries a Sovereignty cost."
      right={notice && <span className="sa-tele eyebrow" style={{ color: notice.kind === 'warn' ? '#A8382F' : '#2F7A4F' }}>{notice.text}</span>}>
      {SKILLS.map((s) => (
        <div className="sa-skill" key={s.id}>
          <div className="sa-skill-top">
            <div>
              <div className="sa-skill-name">{s.name} {cooldowns[s.id] && <small style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--sa-ink-3)' }}>COOLING {cooldowns[s.id]}s</small>}</div>
              <div className="sa-skill-desc">{s.desc}</div>
            </div>
            <div className="sa-intensity">
              {levels.map((l) => (
                <button key={l} className="sa-int-btn" disabled={!!cooldowns[s.id]}
                  style={cooldowns[s.id] ? { opacity: 0.45, cursor: 'default' } : undefined}
                  onClick={() => activate(s, l)}>{l === 'med' ? 'Med' : l.charAt(0).toUpperCase() + l.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

function LogPanel({ entries }) {
  const recent = (entries || []).slice(0, 8)
  return (
    <Card icon={Activity} eyebrow="TELEMETRY" title="Activity Log" sub="Every move, logged."
      right={<span className="sa-tele eyebrow">RECENT</span>}>
      <div className="sa-log">
        {recent.length === 0 && (
          <div className="sa-log-row"><div className="sa-log-body"><div className="sa-log-note">Nothing logged yet today. The first move starts the record.</div></div></div>
        )}
        {recent.map((e) => {
          const f = formatEntryNarrative(e)
          const t = new Date(e.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          return (
            <div className="sa-log-row" key={e.id}>
              <div className="sa-log-time">{t}</div>
              <div className="sa-log-dot" style={{ background: LOG_TONES[e.type] || 'var(--sa-border-2)' }}></div>
              <div className="sa-log-body">
                <div className="sa-log-act">{f.narrative}</div>
                {f.note && <div className="sa-log-note">{f.note}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function DailyDashboardPage({ gameState }) {
  const { sovereigntyLevel, setSovereigntyLevel, currentPhase, shadows } = gameState
  const {
    entries, logSkill, logShadow, logSovereignty, logLoopPhase,
    addNoteToEntry, deleteEntry,
  } = useActivityLog()

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const [notePrompt, setNotePrompt] = useState({ isOpen: false, pendingEntryId: null, actionLabel: '', undoData: null })

  // Handler logic lifted verbatim from HUD.jsx
  const handleSkillActivate = (skillId, intensity, sovereigntyBefore) => {
    const entryId = logSkill(skillId, intensity)
    setNotePrompt({
      isOpen: true, pendingEntryId: entryId,
      actionLabel: `${SKILL_NAMES[skillId] || skillId} (${intensity.toUpperCase()})`,
      undoData: { type: 'skill', sovereigntyBefore },
    })
  }

  const handleShadowChange = (shadowId, intensity, previousIntensity) => {
    gameState.setShadows({ ...shadows, [shadowId]: intensity })
    const entryId = logShadow(shadowId, intensity)
    const action = intensity ? 'detected' : 'cleared'
    setNotePrompt({
      isOpen: true, pendingEntryId: entryId,
      actionLabel: `${SHADOW_NAMES[shadowId] || shadowId} ${action}${intensity ? ` (${intensity.toUpperCase()})` : ''}`,
      undoData: { type: 'shadow', shadowId, previousIntensity },
    })
  }

  const handleSovereigntyChange = (newValue, oldValue) => {
    setSovereigntyLevel(newValue)
    const entryId = logSovereignty(newValue, oldValue)
    setNotePrompt({
      isOpen: true, pendingEntryId: entryId,
      actionLabel: `Sovereignty: ${oldValue}% -> ${newValue}%`,
      undoData: { type: 'sovereignty', previousValue: oldValue },
    })
  }

  const handleLoopPhaseChange = (phase, previousPhase) => {
    gameState.setCurrentPhase(phase)
    const entryId = logLoopPhase(phase)
    setNotePrompt({
      isOpen: true, pendingEntryId: entryId,
      actionLabel: `Loop phase: ${phase}`,
      undoData: { type: 'loop', previousPhase },
    })
  }

  const handleNoteSubmit = (note) => {
    if (note && notePrompt.pendingEntryId) addNoteToEntry(notePrompt.pendingEntryId, note)
    setNotePrompt({ isOpen: false, pendingEntryId: null, actionLabel: '', undoData: null })
  }

  const handleNoteUndo = () => {
    const { pendingEntryId, undoData } = notePrompt
    if (pendingEntryId) deleteEntry(pendingEntryId)
    if (undoData) {
      if (undoData.type === 'sovereignty' && undoData.previousValue !== undefined) {
        setSovereigntyLevel(undoData.previousValue)
      } else if (undoData.type === 'skill' && undoData.sovereigntyBefore !== undefined) {
        setSovereigntyLevel(undoData.sovereigntyBefore)
      } else if (undoData.type === 'shadow') {
        gameState.setShadows({ ...shadows, [undoData.shadowId]: undoData.previousIntensity })
      } else if (undoData.type === 'loop') {
        gameState.setCurrentPhase(undoData.previousPhase)
      }
    }
    setNotePrompt({ isOpen: false, pendingEntryId: null, actionLabel: '', undoData: null })
  }

  const greet = greetingFor(now.getHours())
  const loopIdx = typeof currentPhase === 'number' ? currentPhase : phases.findIndex(p => p.name === currentPhase)
  const currentLoop = loopIdx >= 0 ? phases[loopIdx] : null

  return (
    <div className="sa-grid">
      <div className="col-12">
        <Hero sov={sovereigntyLevel} onCommit={handleSovereigntyChange} greeting={greet.short} currentLoop={currentLoop} />
      </div>

      <SecHead label="THE BRAIN · TODAY" />
      <div className="col-12"><DashBrief /></div>

      <SecHead label="CHARACTER SHEET · DAILY STATE" />
      <div className="col-5"><Attributes /></div>
      <div className="col-4"><Protocol which={greet.p} /></div>
      <div style={{ gridColumn: 'span 3' }}><ShadowScan shadows={shadows} onShadowChange={handleShadowChange} /></div>

      <div className="col-12"><IdentityLoop currentPhase={currentPhase} onPhaseChange={handleLoopPhaseChange} /></div>

      <SecHead label="MOVES · TELEMETRY" />
      <div className="col-7"><SkillsPanel sovereignty={sovereigntyLevel} setSovereignty={setSovereigntyLevel} onSkillActivate={handleSkillActivate} /></div>
      <div className="col-5"><LogPanel entries={entries} /></div>

      <div className="col-12">
        <div className="sa-passive">
          <div className="mark">&ldquo;</div>
          <div>
            <q style={{ quotes: 'none' }}>{PASSIVE.quote}</q>
            <span className="src sa-tele eyebrow">{PASSIVE.src}</span>
          </div>
        </div>
      </div>

      <NotePrompt
        isOpen={notePrompt.isOpen}
        actionLabel={notePrompt.actionLabel}
        onSubmit={handleNoteSubmit}
        onUndo={handleNoteUndo}
      />
    </div>
  )
}
