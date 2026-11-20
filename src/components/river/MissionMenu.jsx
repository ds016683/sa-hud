// The Mission Menu (David 11/19: "when they're empty, let's have a little plus icon that allows us to add a mission
// ... The mission menu should be like an overlay organized by main mission, side missions"; a Main Mission
// "should open to its gates, probably inside the modal itself, but with a back button"). It reads what can be
// loaded and loads what David clicks: a Side Mission whole, a Main Mission by one of its open gates.
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { equipObjective, equipTask, sizeOf, SIZES } from '../../lib/loadout'
import { GlyphLoadout } from './glyphs'
import KindMark from './KindMark'

const CSS = `
.mm-veil { position: fixed; inset: 0; z-index: 320; background: rgba(5,16,28,.78); backdrop-filter: blur(4px); display: grid; place-items: center; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); color: #F3F1EA; }
.mm { width: min(980px, 92vw); max-height: 84vh; overflow: auto; background: #11283c; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 22px 26px 26px; box-shadow: 0 30px 80px rgba(0,0,0,.5); }
.mm-h { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,.12); }
.mm-h .t { font: 500 24px 'Lora', Georgia, serif; min-width: 0; }
.mm-ic { width: 36px; height: 36px; border-radius: 99px; border: 1.5px solid var(--c); color: var(--c); display: inline-grid; place-items: center; background: transparent; cursor: pointer; flex-shrink: 0; padding: 0; }
button.mm-ic:hover, .mm-r:hover .mm-ic.go { background: color-mix(in srgb, var(--c) 16%, transparent); }
.mm-x { margin-left: auto; width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: transparent; color: rgba(243,241,234,.7); display: grid; place-items: center; cursor: pointer; }
.mm-g { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 18px; }
@media (max-width: 760px) { .mm-g { grid-template-columns: 1fr; } }
.mm-t { display: flex; align-items: center; gap: 9px; font: 500 18px 'Lora', Georgia, serif; margin-bottom: 8px; }
.mm-r { display: flex; align-items: center; gap: 14px; width: 100%; padding: 11px 12px; border-radius: 10px; border: 0; border-top: 1px solid rgba(255,255,255,.07); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mm-r:hover { background: rgba(138,202,255,.07); }
.mm-r:disabled { opacity: .5; cursor: wait; }
.mm-r > div { flex: 1; min-width: 0; }
.mm-n { font-size: 15.5px; line-height: 1.3; } .mm-s { font-size: 13px; color: rgba(243,241,234,.7); margin-top: 2px; }
.mm-o { width: 16px; height: 16px; border-radius: 99px; border: 1.5px solid rgba(243,241,234,.44); flex-shrink: 0; }
.mm-err { font-size: 13.500px; color: #DE7E6E; margin-top: 14px; }
`
const NUM = /^\s*(?:gate\s+)?(\d+)\s*[·.:)-]\s*/i

export default function MissionMenu({ tone = '#8ACAFF', onClose, onLoaded }) {
  const [data, setData] = useState(null)
  const [drill, setDrill] = useState(null)     // the Main Mission whose gates are showing
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let on = true
    const run = async () => {
      const [{ data: projects }, { data: tasks }, { data: objs }] = await Promise.all([
        supabase.from('projects').select('id,name').eq('status', 'active').order('name'),
        supabase.from('project_tasks').select('id,project_id,text,status,done,objective_id').eq('done', false).limit(3000),
        supabase.from('objectives').select('id,title,effort,tags,state,parent_id').is('deleted_at', null).is('parent_id', null).in('state', ['parked', 'waiting', 'follow_up']).order('captured_at', { ascending: false }).limit(500),
      ])
      const linked = new Set((tasks || []).filter(t => t.objective_id).map(t => t.objective_id))
      const main = (projects || []).map(p => ({ ...p, gates: (tasks || []).filter(t => t.project_id === p.id).sort((a, b) => (Number((NUM.exec(a.text) || [])[1]) || 999) - (Number((NUM.exec(b.text) || [])[1]) || 999)) })).filter(p => p.gates.length)
      const rank = { heavy: 0, medium: 1, light: 2 }
      const side = (objs || []).filter(o => !linked.has(o.id) && !(o.tags || []).some(t => ['session', 'impromptu', 'mission-task', 'call'].includes(t))).sort((a, b) => rank[sizeOf(a)] - rank[sizeOf(b)])
      if (on) setData({ main, side })
    }
    run().catch(e => { if (on) setErr(e.message) })
    return () => { on = false }
  }, [])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (drill) setDrill(null); else onClose() } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true) }, [drill, onClose])
  const load = async (fn, what) => {
    if (busy) return
    setBusy(true); setErr(null)
    try { const r = await fn(); if (r && r.ok === false) setErr((r.reasons || []).join(' · ') || 'It did not load.'); else onLoaded(`Loaded: ${what}`) }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const v = { '--c': tone }
  return (
    <div className="mm-veil" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-label="Mission Menu">
      <style>{CSS}</style>
      <div className="mm" style={v}>
        <div className="mm-h">
          {drill ? <button className="mm-ic" title="Back" aria-label="Back" onClick={() => setDrill(null)}><ArrowLeft size={17} /></button> : <span className="mm-ic" style={{ cursor: 'default' }}><Plus size={18} /></span>}
          {drill && <KindMark kind="Main Mission" color={tone} />}
          <span className="t">{drill ? drill.name : 'Mission Menu'}</span>
          <button className="mm-x" title="Close" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>
        {!data && !err && <div className="mm-s" style={{ marginTop: 18 }}>Reading the Ledger</div>}
        {data && drill && (
          <div style={{ marginTop: 16 }}>
            {drill.gates.map(g => { const n = (NUM.exec(g.text) || [])[1], text = g.text.replace(NUM, ''); return (
              <button key={g.id} className="mm-r" disabled={busy} onClick={() => load(() => equipTask(g, drill.name), `${drill.name}${n ? ` · Gate ${n}` : ''}`)}>
                <span className="mm-o" />
                <div><div className="mm-n">{n && <span style={{ color: tone, marginRight: 8 }}>Gate {n}</span>}{text}</div></div>
                <span className="mm-ic go" title="Load"><GlyphLoadout size={17} /></span>
              </button>
            ) })}
          </div>
        )}
        {data && !drill && (
          <div className="mm-g">
            <div>
              <div className="mm-t">Main Missions</div>
              {data.main.map(p => (
                <button key={p.id} className="mm-r" onClick={() => setDrill(p)}>
                  <KindMark kind="Main Mission" color={tone} />
                  <div><div className="mm-n">{p.name}</div><div className="mm-s">{p.gates.length} {p.gates.length === 1 ? 'Gate' : 'Gates'} Open</div></div>
                  <span className="mm-ic go" title="Its Gates"><ArrowRight size={17} /></span>
                </button>
              ))}
            </div>
            <div>
              <div className="mm-t">Side Missions</div>
              {data.side.map(o => (
                <button key={o.id} className="mm-r" disabled={busy} onClick={() => load(() => equipObjective(o.id), o.title)}>
                  <KindMark kind={SIZES[sizeOf(o)].label} color={tone} />
                  <div><div className="mm-n">{o.title}</div></div>
                  <span className="mm-ic go" title="Load"><GlyphLoadout size={17} /></span>
                </button>
              ))}
            </div>
          </div>
        )}
        {err && <div className="mm-err">{err}</div>}
      </div>
    </div>
  )
}
