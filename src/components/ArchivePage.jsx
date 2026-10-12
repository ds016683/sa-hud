// The Archive: the master knowledge system (David, 10/12: "all of this fed
// into an archive that makes it easy for me to retrieve historical
// information"). One row per closed mission, newest first, with everything
// it left behind under it: the close-out summary, briefs, files, boards. Any
// word finds it. The yay page opens from the row.
import { useEffect, useMemo, useState } from 'react'
import { Archive as ArchiveIcon, FileText, Paperclip, ListChecks, Scale, AlignLeft, ExternalLink, ChevronDown, ChevronRight, RotateCcw, Check } from 'lucide-react'
import { listClosedMissions, signedUrl } from '../lib/archive'
import { reopenObjective, realmOf } from '../lib/objectives'
import { sizeOf } from '../lib/loadout'
import { kindOf, typeOf, badgeOf, milesFor, colorOf, fmtDay } from '../lib/summary'
import { renderMarkdown } from './river/MeetingCloseout'
import SessionBoard from './river/SessionBoard'
import BadgeMedallion from './BadgeArt'
import YayPage from './river/YayPage'
import DocView from './river/DocView'
import ItemDetail from './river/ItemDetail'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, PURPLE, MONO, SERIF, S, Panel, Label } from './river/canon'

const btn = (color = INK2, filled = false, extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra })
const KIND = { artifact: ['Brief', FileText, GOLD_BRIGHT], decision: ['Decision', Scale, GOLD], board: ['Board', ListChecks, GREEN], file: ['File', Paperclip, BLUE], summary: ['Close-out', AlignLeft, INK2] }
const TYPES = ['Bounty', 'Contract', 'Mythic', 'Main Mission task', 'Ad Hoc']
const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean)
const hay = (m) => [m.o.title, m.o.description, m.project, ...m.entries.flatMap(e => [e.title, e.summary, JSON.stringify(e.body || '')])].join(' ').toLowerCase()

function Entry({ e }) {
  const [label, Icon, color] = KIND[e.kind] || KIND.summary
  const [open, setOpen] = useState(e.kind === 'summary')
  return (
    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '8px 0' }}>
      <div onClick={() => setOpen(x => !x)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexWrap: 'wrap' }}>
        <Icon size={13} color={color} />
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color, width: 68 }}>{label}</span>
        <span style={{ flex: 1, fontSize: 13.5, color: INK, minWidth: 200 }}>{e.title}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{fmtDay(e.filed_at)}</span>
        {e.kind === 'file' && e.path && <button onClick={async (ev) => { ev.stopPropagation(); const u = await signedUrl(e.bucket || 'project-files', e.path); if (u) window.open(u, '_blank', 'noopener') }} style={btn(INK2)}><ExternalLink size={10} /> open</button>}
      </div>
      {open && (
        <div style={{ marginTop: 8, paddingLeft: 23 }}>
          {e.kind === 'summary' && e.summary && <div style={{ color: INK2 }}>{renderMarkdown(e.summary, { size: 15.5 })}</div>}
          {e.kind === 'summary' && e.body?.steps?.length > 0 && <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>{e.body.steps.map((s, i) => <div key={i} style={{ fontSize: 14.5, color: s.done ? INK2 : GRAY, display: 'flex', gap: 8 }}><span style={{ color: s.done ? GREEN : GRAY }}>{s.done ? '✓' : '○'}</span>{s.text}</div>)}</div>}
          {e.kind === 'board' && e.body?.phases && <SessionBoard board={{ id: e.id, title: e.title, phases: e.body.phases }} compact />}
          {(e.kind === 'artifact' || e.kind === 'decision') && (e.body ? <DocView doc={e.body} /> : e.summary && <div style={{ color: INK2 }}>{renderMarkdown(e.summary, { size: 15.5 })}</div>)}
          {e.kind === 'file' && e.summary && <div style={{ fontSize: 13, color: INK2 }}>{e.summary}</div>}
        </div>
      )}
    </div>
  )
}

function MissionRow({ m, onYay, onReopen }) {
  const [open, setOpen] = useState(false)
  const kind = kindOf(m.o, !!m.project)
  const size = sizeOf(m.o)
  const color = colorOf(kind, size)
  const realm = realmOf(m.o)
  const sum = m.entries.find(e => e.kind === 'summary')
  const left = m.entries.filter(e => e.kind !== 'summary')
  return (
    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '12px 0' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <BadgeMedallion id={badgeOf(kind, size)} size={40} color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div onClick={() => setOpen(x => !x)} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 17, color: '#fff', lineHeight: 1.3, cursor: 'pointer' }}>{m.o.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY, marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color }}>{typeOf(kind, size)}{m.project ? ` · ${m.project}` : ''}</span>
            <span style={{ color: realm === 'personal' ? GOLD : PURPLE }}>{realm === 'personal' ? 'Personal' : 'Third Horizon'}</span>
            <span>closed {fmtDay(m.o.released_at)}{m.o.released_kind && m.o.released_kind !== 'done' ? ` · ${m.o.released_kind}` : ''}</span>
            <span style={{ color: GOLD }}>{milesFor(kind, size, m.gatesDone)} mi</span>
            {m.gatesTotal > 0 && <span>{m.gatesDone} of {m.gatesTotal} gates</span>}
            <span>{left.length ? `${left.length} left behind` : 'nothing filed'}</span>
          </div>
          {sum?.summary && !open && <div style={{ fontSize: 13, color: INK2, marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sum.summary}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => onYay(m.o)} title="The Mission Summary" style={btn(GOLD)}><Check size={10} /> Yay page</button>
          <button onClick={() => setOpen(x => !x)} style={btn(INK2)}>{open ? <ChevronDown size={10} /> : <ChevronRight size={10} />} {m.entries.length ? 'Filings' : 'Details'}</button>
          <button onClick={() => onReopen(m.o)} title="Back to Parked" style={btn(INK2)}><RotateCcw size={10} /></button>
        </div>
      </div>
      {open && (
        <div style={{ marginLeft: 54, marginTop: 8 }}>
          {m.o.description && <div style={{ fontSize: 13, color: INK2, lineHeight: 1.55, marginBottom: 6 }}><Label>Back story</Label>{m.o.description}</div>}
          {m.entries.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Closed without filing anything. The yay page still has its gates, dates and miles.</div>}
          {m.entries.map(e => <Entry key={e.id} e={e} />)}
        </div>
      )}
    </div>
  )
}

export default function ArchivePage({ onNavigate }) {
  const [data, setData] = useState(undefined)
  const [q, setQ] = useState('')
  const [realm, setRealm] = useState(null)
  const [type, setType] = useState(null)
  const [yay, setYay] = useState(null)
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => { let on = true; listClosedMissions().then(d => { if (on) setData(d) }).catch(e => { if (on) setErr(e.message) }); return () => { on = false } }, [tick])

  const shown = useMemo(() => {
    if (!data) return { missions: [], loose: [] }
    const ws = words(q)
    const keep = (m) => {
      const kind = kindOf(m.o, !!m.project), size = sizeOf(m.o)
      if (realm && realmOf(m.o) !== realm) return false
      if (type && typeOf(kind, size) !== type) return false
      if (ws.length) { const h = hay(m); if (!ws.every(w => h.includes(w))) return false }
      return true
    }
    const loose = data.loose.filter(e => (!realm || e.realm === realm) && !type && (!words(q).length || words(q).every(w => [e.title, e.summary, e.source_title].join(' ').toLowerCase().includes(w))))
    return { missions: data.missions.filter(keep), loose }
  }, [data, q, realm, type])

  const reopen = async (o) => { if (!window.confirm(`Reopen "${o.title}"? It goes back to Parked; its filings stay here.`)) return; try { await reopenObjective(o.id); setTick(x => x + 1) } catch (e) { setErr(e.message) } }

  return (
    <div style={S.page}>
      {yay && <YayPage objectiveId={yay.id} onClose={() => setYay(null)} onOpenMission={(o) => { setYay(null); setDetail(o) }} />}
      {detail && <ItemDetail item={{ id: detail.id, objective_id: detail.id, kind: kindOf(detail, false), title: detail.title, description: detail.description, tags: detail.tags, size: sizeOf(detail), objective: detail }} onClose={() => setDetail(null)} onNavigate={onNavigate} onChange={() => setTick(x => x + 1)} />}
      <div style={{ marginBottom: 18 }}>
        <h1 style={S.h1}><ArchiveIcon size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />Archive</h1>
        <div style={S.sub}>every closed mission and what it left behind · any word finds it</div>
      </div>
      <Panel style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search any word: a name, a place, a client, a gate" style={{ flex: 1, minWidth: 240, background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '8px 10px', color: INK, fontSize: 13, fontFamily: 'inherit' }} />
          {[[null, 'All'], ['third-horizon', 'Third Horizon'], ['personal', 'Personal']].map(([k, l]) => <button key={String(k)} onClick={() => setRealm(k)} style={btn(realm === k ? (k === 'personal' ? GOLD : k ? PURPLE : BLUE) : INK2, realm === k)}>{l}</button>)}
          <span style={{ width: 1, height: 18, background: PANEL_BORDER }} />
          {TYPES.map(t => <button key={t} onClick={() => setType(type === t ? null : t)} style={btn(type === t ? GOLD : INK2, type === t)}>{t}</button>)}
        </div>
      </Panel>
      <Panel>
        {data === undefined && !err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading the Archive</div>}
        {data === null && <div style={{ fontSize: 13, color: INK2, lineHeight: 1.6 }}>The Archive is not set up yet. Run <span style={{ fontFamily: MONO, fontSize: 12 }}>sql/2026-10-07-side-missions-archive.sql</span> in the Supabase SQL editor.</div>}
        {data && (
          <>
            <Label>{shown.missions.length} closed mission{shown.missions.length === 1 ? '' : 's'}{q || realm || type ? ' that match' : ''}</Label>
            {shown.missions.length === 0 && <div style={{ fontSize: 13, color: GRAY, padding: '8px 0' }}>Nothing here{q || realm || type ? ' that matches' : ' yet'}.</div>}
            {shown.missions.map(m => <MissionRow key={m.o.id} m={m} onYay={setYay} onReopen={reopen} />)}
            {shown.loose.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <Label>Other filings · {shown.loose.length}</Label>
                {shown.loose.map(e => <Entry key={e.id} e={e} />)}
              </div>
            )}
          </>
        )}
        {err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: '#E8836F', textTransform: 'uppercase', marginTop: 10 }}>{err}</div>}
      </Panel>
    </div>
  )
}
