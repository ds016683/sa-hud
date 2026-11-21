// The yay (David 11/19: "i do actually want a yay page ... every time miles are awarded, i want it to be celebrated.
// even if that means the system awarded something between page refreshes ... the next click, the system does a yay
// page ... emphasis on badging, miles, gaming, and being able to SEE what was done clearly, without too many words";
// on the mock-up: "love the new approach on the yay pages. do it for all."). One frame for every award: the miles
// as the headline, the badges landing one by one, what was done as short tagged lines, the river moving, Continue.
//
// AwardWatch is mounted once in the app. On load, on a route change and on a click (at most every 20 seconds) it
// reads the miles ledger past the marker and, if anything is new, plays the yay. The marker is the one the River
// has always kept (localStorage river-seen.ledgerMaxId); Continue moves it.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import BadgeMedallion from '../BadgeArt'
import { BADGES, whereOnRiver, crossed } from '../../constants/collection'
import { chiToday } from './canon'
import { readSeen, writeSeen, yayHeld, played } from '../../lib/yay'

const PURPLE = '#B4A3E8', BLUE = '#8ACAFF', GREEN = '#57BE97'
// A badge at its day's maximum, or earned three times, lands purple; otherwise blue.
const tone = (badge, n) => (n >= 3 || n >= (BADGES[badge]?.repeatable ? (badge === 'run' ? 4 : Infinity) : 1)) ? PURPLE : BLUE
// What was done, in the Board's words.
const TAG = { run: ['Run', PURPLE], gate: ['Gate', PURPLE], 'mission-task': ['Gate', PURPLE], 'main-mission': ['Mission', PURPLE], bounty: ['Mission', PURPLE], contract: ['Mission', PURPLE], mythic: ['Mission', PURPLE], impromptu: ['Utility', GREEN], 'bill-pay': ['Comms', BLUE], 'clean-slack': ['Comms', BLUE] }

export const YAY_CSS = `
.yay { position: fixed; inset: 0; z-index: 500; display: grid; place-items: center; background: radial-gradient(ellipse at 50% 34%, #1a2f4a 0%, #0c1b2a 62%); color: #F3F1EA; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); overflow-y: auto; animation: yayveil .3s ease both; }
.yay-in { width: min(980px, 92vw); text-align: center; padding: 40px 0; }
.yay-miles { display: inline-flex; align-items: baseline; gap: 14px; animation: yayup .6s cubic-bezier(.2,.8,.2,1) both; }
.yay-miles b { font: 500 104px/1 'Lora', Georgia, serif; color: ${PURPLE}; letter-spacing: -.02em; text-shadow: 0 0 44px rgba(180,163,232,.35); font-variant-numeric: tabular-nums; }
.yay-miles span { font: 500 26px 'Lora', Georgia, serif; color: rgba(243,241,234,.8); }
.yay-title { font: 500 30px/1.2 'Lora', Georgia, serif; letter-spacing: -.01em; margin-bottom: 18px; animation: yayup .6s ease both; }
.yay-sub { font: italic 400 19px/1.4 'Lora', Georgia, serif; color: rgba(243,241,234,.78); margin-top: 12px; animation: yayup .6s ease .3s both; }
.yay-badges { display: flex; justify-content: center; gap: 40px; margin: 42px 0 38px; flex-wrap: wrap; }
.yay-badge { width: 132px; display: flex; flex-direction: column; align-items: center; gap: 10px; animation: yaypop .7s cubic-bezier(.2,.9,.3,1.25) both; }
.yay-badge .yay-ring { position: relative; display: inline-block; }
.yay-badge .yay-ring::after { content: ""; position: absolute; inset: 0; border-radius: 99px; border: 2px solid var(--c); animation: yayring 1.3s ease-out both; animation-delay: inherit; }
.yay-badge .nm { font: 500 16px/1.25 'Lora', Georgia, serif; }
.yay-badge .mi { font-size: 15px; font-weight: 600; color: var(--c); font-variant-numeric: tabular-nums; }
.yay-badge .x { position: absolute; right: -8px; top: -6px; min-width: 28px; height: 28px; padding: 0 7px; border-radius: 99px; display: grid; place-items: center; font-size: 13.5px; font-weight: 700; color: #0D1D2C; background: var(--c); }
.yay-done { display: inline-grid; row-gap: 10px; text-align: left; margin-bottom: 38px; max-width: 760px; animation: yayup .6s ease 1.1s both; }
.yay-done div { display: flex; align-items: center; gap: 12px; font-size: 15.5px; line-height: 1.35; }
.yay-done i { font-style: normal; font-size: 12.5px; font-weight: 500; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); border-radius: 99px; padding: 2px 10px; white-space: nowrap; }
.yay-more { text-align: left; max-width: 720px; margin: 0 auto 34px; animation: yayup .6s ease 1.3s both; }
.yay-more h3 { font: 500 19px 'Lora', Georgia, serif; margin: 26px 0 10px; }
.yay-more p { font: 400 16px/1.6 'Lora', Georgia, serif; color: rgba(243,241,234,.86); margin: 0; }
.yay-city { font: 500 22px 'Lora', Georgia, serif; color: ${PURPLE}; margin-bottom: 18px; animation: yayup .6s ease 1.2s both; }
.yay-river { width: min(620px, 86vw); margin: 0 auto 34px; animation: yayup .6s ease 1.3s both; }
.yay-river .bar { height: 6px; border-radius: 99px; background: rgba(255,255,255,.1); overflow: hidden; }
.yay-river .bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, ${BLUE}, ${PURPLE}); animation: yayfill 1.4s cubic-bezier(.2,.8,.2,1) 1.5s both; }
.yay-river .nums { display: flex; justify-content: space-between; margin-top: 10px; font-size: 14px; color: rgba(243,241,234,.7); font-variant-numeric: tabular-nums; }
.yay-river .nums b { color: #F3F1EA; font-weight: 600; }
.yay-acts { display: inline-flex; align-items: center; gap: 12px; animation: yayup .6s ease 1.6s both; }
.yay-acts .yay-go { animation: none; display: inline-flex; align-items: center; gap: 9px; max-width: min(520px, 70vw); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.yay-side { width: 44px; height: 44px; border-radius: 99px; border: 1.5px solid #B4A3E8; color: #B4A3E8; background: transparent; display: inline-grid; place-items: center; cursor: pointer; padding: 0; }
.yay-side:hover { background: rgba(180,163,232,.18); }
.yay-go { font: 600 15px var(--font-sans, 'Instrument Sans', sans-serif); color: #0D1D2C; background: ${BLUE}; border: 0; border-radius: 999px; padding: 12px 34px; cursor: pointer; box-shadow: 0 0 26px rgba(138,202,255,.3); animation: yayup .6s ease 1.6s both; }
@keyframes yayveil { from { opacity: 0 } to { opacity: 1 } }
@keyframes yayup { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes yaypop { 0% { opacity: 0; transform: scale(.4) } 60% { opacity: 1; transform: scale(1.1) } 100% { opacity: 1; transform: scale(1) } }
@keyframes yayring { 0% { transform: scale(.9); opacity: .7 } 100% { transform: scale(1.9); opacity: 0 } }
@keyframes yayfill { from { width: var(--from) } to { width: var(--to) } }
@media (prefers-reduced-motion: reduce) { .yay *, .yay { animation-duration: .01s !important; animation-delay: 0s !important } }
`

// awards: [{ badge, n, miles }]  done: [{ tag, color, text }]  banked: total after  today: the day's miles after
// before: total before (for the river's fill and any city crossed)
export function AwardYay({ awards, done = [], banked, today, before, onContinue, title = null, sub = null, go = 'Continue', children = null, keys = true, busy = false, extra = null, lead = null }) {
  const total = awards.reduce((a, x) => a + x.miles, 0)
  const [n, setN] = useState(0)
  useEffect(() => { let k = 0; const step = Math.max(0.25, total / 24); const t = setInterval(() => { k = Math.min(total, k + step); setN(k); if (k >= total) clearInterval(t) }, 45); return () => clearInterval(t) }, [total])
  useEffect(() => { if (!keys) return undefined; const k = (e) => { if (e.key === 'Enter' || e.key === 'Escape') onContinue() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onContinue, keys])
  const was = whereOnRiver(before), now = whereOnRiver(banked), cities = banked != null ? crossed(before, banked) : []
  const pct = (w) => Math.round(1000 * w.legDone) / 10
  const show = (v) => Number.isInteger(total) ? Math.round(v) : (Math.round(v * 100) / 100)
  return (
    <div className="yay" role="dialog" aria-label="Miles awarded">
      <style>{YAY_CSS}</style>
      <div className="yay-in">
        {title && <div className="yay-title">{title}</div>}
        <div className="yay-miles"><b>+{show(n)}</b><span>{total === 1 ? 'Mile' : 'Miles'}</span></div>
        {sub && <div className="yay-sub">{sub}</div>}
        <div className="yay-badges">
          {awards.map((a, i) => (
            <div key={a.badge} className="yay-badge" style={{ '--c': tone(a.badge, a.n), animationDelay: `${0.35 + i * 0.22}s` }}>
              <span className="yay-ring" style={{ animationDelay: `${0.5 + i * 0.22}s` }}><BadgeMedallion id={a.badge} size={96} color={tone(a.badge, a.n)} glow />{a.n > 1 && <span className="x">×{a.n}</span>}</span>
              <span className="nm">{BADGES[a.badge]?.label || a.badge}</span>
              <span className="mi">+{Math.round(a.miles * 100) / 100}</span>
            </div>
          ))}
        </div>
        {done.length > 0 && <div className="yay-done">{done.map((x, i) => <div key={i} style={{ '--c': x.color }}>{x.tag && <i>{x.tag}</i>}<span>{x.text}</span></div>)}</div>}
        {cities.length > 0 && <div className="yay-city">You Reached {cities.map(c => c.short).join(', ')}</div>}
        {banked != null && <div className="yay-river">
          <div className="bar"><i style={{ '--from': `${cities.length ? 0 : pct(was)}%`, '--to': `${pct(now)}%` }} /></div>
          <div className="nums"><span><b>{Math.round(banked).toLocaleString()}</b> Banked</span><span><b>{Math.round(today * 100) / 100}</b> Today</span><span><b>{Math.round(now.toNext).toLocaleString()}</b> To {now.next.short}</span></div>
        </div>}
        {children && <div className="yay-more">{children}</div>}
        <div className="yay-acts"><button className="yay-go" autoFocus={keys} disabled={busy} onClick={onContinue}>{lead}{go}</button>{extra}</div>
      </div>
    </div>
  )
}

export default function AwardWatch({ route }) {
  const [yay, setYay] = useState(null)
  const last = useRef(0), busy = useRef(false), showing = useRef(false)
  const look = useCallback(async (force = false) => {
    if (busy.current || showing.current || yayHeld()) return
    if (!force && Date.now() - last.current < 20000) return
    busy.current = true; last.current = Date.now()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const seen = readSeen()
      const { data: top } = await supabase.from('miles_ledger').select('id').order('id', { ascending: false }).limit(1)
      const maxId = Number(top?.[0]?.id) || 0
      if (!seen || seen.ledgerMaxId == null) { writeSeen({ ...(seen || {}), ledgerMaxId: maxId }); return }
      if (maxId <= seen.ledgerMaxId) return
      const [{ data: fresh }, { data: all }] = await Promise.all([
        supabase.from('miles_ledger').select('id,day,badge,key,miles,evidence').gt('id', seen.ledgerMaxId).order('id', { ascending: true }).limit(200),
        supabase.from('miles_ledger').select('day,miles').limit(20000),
      ])
      if (!fresh || !fresh.length) return
      // Rows a close page has already played are seen; if nothing else is new, only the marker moves.
      const skip = new Set(played()), rows = fresh.filter(r => !skip.has(String(r.key)))
      if (!rows.length) { writeSeen({ ...readSeen(), ledgerMaxId: maxId }); return }
      const by = new Map()
      for (const r of rows) { const a = by.get(r.badge) || { badge: r.badge, n: 0, miles: 0 }; a.n += 1; a.miles += Number(r.miles) || 0; by.set(r.badge, a) }
      const awards = [...by.values()].sort((a, b) => b.miles - a.miles)
      const total = awards.reduce((s, a) => s + a.miles, 0)
      const banked = (all || []).reduce((s, r) => s + (Number(r.miles) || 0), 0), day = chiToday()
      const done = rows.filter(r => r.evidence && TAG[r.badge]).slice(-4).map(r => ({ tag: TAG[r.badge][0], color: TAG[r.badge][1], text: String(r.evidence).slice(0, 110) }))
      showing.current = true
      setYay({ awards, done, banked, before: banked - total, today: (all || []).filter(r => r.day === day).reduce((s, r) => s + (Number(r.miles) || 0), 0), maxId })
    } catch { /* the next look tries again */ } finally { busy.current = false }
  }, [])
  useEffect(() => { Promise.resolve().then(() => look(true)) }, [look, route])
  useEffect(() => { const on = () => { look() }; document.addEventListener('click', on, true); return () => document.removeEventListener('click', on, true) }, [look])
  if (!yay) return null
  const go = () => { writeSeen({ ...(readSeen() || {}), ledgerMaxId: yay.maxId }); showing.current = false; setYay(null) }
  return <AwardYay {...yay} onContinue={go} />
}
