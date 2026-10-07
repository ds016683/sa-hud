// The Archive: the master knowledge system. Everything filed from a Side
// Mission or Main Mission close-out, a decision, or Lumen, searchable by text,
// realm, and kind. Rows are archive_entries; files open from storage.
import { useCallback, useEffect, useState } from 'react'
import { Archive as ArchiveIcon, FileText, Paperclip, ListChecks, Scale, AlignLeft, ExternalLink } from 'lucide-react'
import { listEntries, signedUrl } from '../lib/archive'
import { renderMarkdown } from './river/MeetingCloseout'
import SessionBoard from './river/SessionBoard'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, PURPLE, MONO, S, Panel, Label } from './river/canon'

const btn = (color = INK2, filled = false, extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra })
const KINDS = [['artifact', 'Artifacts', FileText, GOLD_BRIGHT], ['decision', 'Decisions', Scale, GOLD], ['board', 'Boards', ListChecks, GREEN], ['file', 'Files', Paperclip, BLUE], ['summary', 'Summaries', AlignLeft, INK2]]
const KIND = Object.fromEntries(KINDS.map(k => [k[0], k]))
const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

export default function ArchivePage() {
  const [rows, setRows] = useState(undefined)
  const [q, setQ] = useState('')
  const [realm, setRealm] = useState(null)
  const [kind, setKind] = useState(null)
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState(null)
  const pull = useCallback(() => listEntries({ q, realm, kind }).then(setRows).catch(e => setErr(e.message)), [q, realm, kind])
  useEffect(() => { const t = setTimeout(pull, 200); return () => clearTimeout(t) }, [pull])

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={S.h1}><ArchiveIcon size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />Archive</h1>
        <div style={S.sub}>what the missions left behind · searchable, by realm and kind</div>
      </div>
      <Panel style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search titles and summaries" style={{ flex: 1, minWidth: 240, background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13 }} />
          {[[null, 'All'], ['third-horizon', 'Third Horizon'], ['personal', 'Personal']].map(([k, l]) => <button key={String(k)} onClick={() => setRealm(k)} style={btn(realm === k ? (k === 'personal' ? GOLD : k ? PURPLE : BLUE) : INK2, realm === k)}>{l}</button>)}
          <span style={{ width: 1, height: 18, background: PANEL_BORDER }} />
          {KINDS.map(([k, l, Icon, c]) => <button key={k} onClick={() => setKind(kind === k ? null : k)} style={btn(kind === k ? c : INK2, kind === k)}><Icon size={10} /> {l}</button>)}
        </div>
      </Panel>
      <Panel>
        {rows === undefined && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading the Archive</div>}
        {rows === null && <div style={{ fontSize: 13, color: INK2, lineHeight: 1.6 }}>The Archive is not set up yet. Run <span style={{ fontFamily: MONO, fontSize: 12 }}>sql/2026-10-07-side-missions-archive.sql</span> in the Ledger; the first close-out that carries content files the first entry.</div>}
        {Array.isArray(rows) && rows.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Nothing filed{q || realm || kind ? ' that matches' : ' yet'}. The first Side Mission or Main Mission close-out that carries content lands here.</div>}
        {Array.isArray(rows) && rows.map(r => { const kd = KIND[r.kind] || KIND.summary; const KindIcon = kd[2]; const c = kd[3]; const isOpen = open === r.id; return (
          <div key={r.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }} onClick={() => setOpen(isOpen ? null : r.id)}>
              <KindIcon size={14} color={c} />
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 14, color: INK }}>{r.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: GRAY, marginTop: 3 }}>{r.kind} · {r.realm === 'personal' ? 'Personal' : 'Third Horizon'} · from {r.source_kind || 'unknown'}{r.source_title ? ` “${r.source_title}”` : ''} · filed {fmt(r.filed_at)}</div>
              </div>
              {r.path && <button onClick={async (e) => { e.stopPropagation(); const u = await signedUrl(r.bucket || 'project-files', r.path); if (u) window.open(u, '_blank', 'noopener') }} style={btn(INK2)}><ExternalLink size={10} /> Open</button>}
            </div>
            {isOpen && (
              <div style={{ marginTop: 10, paddingLeft: 26 }}>
                {r.summary && <div style={{ fontSize: 13.5, lineHeight: 1.65, color: INK2 }}>{renderMarkdown(r.summary)}</div>}
                {r.tags?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{r.tags.map(t => <span key={t} style={{ ...S.chip('rgba(255,255,255,0.06)', INK2), fontFamily: MONO, fontSize: 9, letterSpacing: '1px' }}>{t}</span>)}</div>}
                {r.kind === 'board' && r.body?.phases && <div style={{ marginTop: 10 }}><SessionBoard board={{ id: r.id, title: r.title, phases: r.body.phases }} compact /></div>}
                {r.kind === 'summary' && r.body?.steps?.length > 0 && <div style={{ marginTop: 8 }}><Label>Steps</Label>{r.body.steps.map((s, i) => <div key={i} style={{ fontSize: 13, color: s.done ? GRAY : INK, textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</div>)}</div>}
                {(r.kind === 'artifact' || r.kind === 'decision') && r.body && <pre style={{ marginTop: 8, fontSize: 11.5, color: INK2, whiteSpace: 'pre-wrap', fontFamily: MONO, maxHeight: 320, overflow: 'auto' }}>{JSON.stringify(r.body, null, 1).slice(0, 6000)}</pre>}
              </div>
            )}
          </div>
        ) })}
        {err && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: '#E8836F', textTransform: 'uppercase', marginTop: 10 }}>{err}</div>}
      </Panel>
      <div style={S.source}>SOURCES · archive_entries · project-files/archive</div>
    </div>
  )
}
