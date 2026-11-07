// Workbench pages (David, 11/7): "Workbenches should have tabs, for pages,
// where a skill or anything can be implemented and then ported out." The head
// of a Main Mission's Workbench is a row of tabs, one per page built on the
// mission (build_page from Lumen or a session; the pipeline-fed Usage page on
// APF is one), newest first, so the page being worked on is tab one. The MMA
// Planning canvas is a page too, but only on the MMA missions (or a mission
// that already carries a program-plan artifact); it used to render on every
// mission, which is how MMA's 2027 domains turned up on APF's Workbench.
import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { listBuilds, buildUrl, readBuildHtml, LEDGER_EVENT } from '../../lib/lumenPanel'
import { readArtifact } from '../../lib/artifacts'
import PlanningCanvas from './PlanningCanvas'
import { CardPill, INK2, GRAY, LABEL, PANEL_BORDER, MONO } from './canon'
import { fmtStamp } from '../../lib/livefiles'

const isMMA = (project) => /^Client\.MMA/i.test(String(project?.key || ''))
const rememberKey = (id) => `hud:workbench-page:${id}`
const btn = { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer' }

export default function WorkbenchPages({ project }) {
  const [pages, setPages] = useState(null)        // [{ slug, title, note, updated_at }]
  const [planning, setPlanning] = useState(isMMA(project))
  const [sel, setSel] = useState(() => { try { return localStorage.getItem(rememberKey(project.id)) } catch { return null } })
  const [html, setHtml] = useState(null)   // the page's HTML, rendered through srcDoc like the Lumen panel does (storage may serve it as plain text)
  const [nonce, setNonce] = useState(0)

  const load = useCallback(async () => {
    const [builds, plan] = await Promise.all([
      listBuilds(project.id).catch(() => []),
      isMMA(project) ? Promise.resolve(true) : readArtifact(project.id, 'program-plan').then(d => !!d).catch(() => false),
    ])
    setPages(builds)
    setPlanning(plan)
  }, [project])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const on = () => load()
    window.addEventListener(LEDGER_EVENT, on)
    return () => window.removeEventListener(LEDGER_EVENT, on)
  }, [load])

  // The tabs: pages newest first, then Planning where it belongs.
  const tabs = [...(pages || []).map(p => ({ id: p.slug, label: p.title || p.slug, page: p })), ...(planning ? [{ id: 'planning', label: 'Planning' }] : [])]
  const current = tabs.find(t => t.id === sel) || tabs[0] || null

  useEffect(() => {
    if (!current) { setHtml(null); return }
    try { localStorage.setItem(rememberKey(project.id), current.id) } catch { /* fine */ }
    if (current.id === 'planning') { setHtml(null); return }
    let on = true
    setHtml(null)
    readBuildHtml(project.id, current.id).then(h => { if (on) setHtml(h) }).catch(() => { if (on) setHtml('') })
    return () => { on = false }
  }, [current?.id, project.id, nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  if (pages === null) return <div style={{ fontSize: 13, color: GRAY }}>Reading the pages on this mission.</div>
  if (!tabs.length) {
    return <div style={{ fontSize: 13, color: INK2, lineHeight: 1.55 }}>No pages yet. Lumen or a session builds one here (build_page), a skill can be brought in on it, and a page can be ported into a real app later.</div>
  }
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {tabs.map(t => <CardPill key={t.id} active={current?.id === t.id} onClick={() => setSel(t.id)}>{t.label}</CardPill>)}
      </div>
      {current?.id === 'planning' ? (
        <div style={{ marginTop: 18, minWidth: 0, overflow: 'hidden' }}><PlanningCanvas project={project} /></div>
      ) : current ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, color: INK2, flex: 1, minWidth: 200 }}>{current.page?.note || ''}</span>
            {current.page?.updated_at && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', textTransform: 'uppercase', color: LABEL }}>updated {fmtStamp(current.page.updated_at)}</span>}
            <button onClick={() => setNonce(n => n + 1)} style={btn} title="Reload the page"><RefreshCw size={11} /> Refresh</button>
            <button onClick={async () => window.open(await buildUrl(project.id, current.id), '_blank', 'noopener')} style={btn}><ExternalLink size={11} /> Open</button>
          </div>
          {html === null
            ? <div style={{ fontSize: 13, color: GRAY }}>Opening the page.</div>
            : html === ''
              ? <div style={{ fontSize: 13, color: GRAY }}>Could not read this page. Open it in a new tab.</div>
              : <iframe key={`${current.id}:${nonce}`} title={current.label} srcDoc={html} sandbox="allow-scripts allow-popups allow-forms allow-modals" style={{ width: '100%', height: 'min(1100px, 78vh)', minHeight: 520, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, background: '#0F2334' }} />}
        </div>
      ) : null}
    </div>
  )
}
