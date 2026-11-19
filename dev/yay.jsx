// Dev mock-up: one yay for every award (David 11/19: "i do actually want a yay page ... i think we have several
// different versions running around ... every time miles are awarded, i want it to be celebrated ... the next click,
// the system does a yay page ... emphasis on badging, miles, gaming, and being able to SEE what was done clearly,
// without too many words"). One frame: the miles as the headline, the badges landing one by one, what was done as
// short tagged lines, the river moving, and Continue. A picture to rule on; nothing is read or written.
// Sample data; ?d=<json> overrides it for a screenshot.
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import BadgeMedallion from '../src/components/BadgeArt'
import { BADGES } from '../src/constants/collection'

const D = {
  awards: [
    { badge: 'run', n: 2, miles: 20 },
    { badge: 'gate', n: 1, miles: 7 },
    { badge: 'full-day', n: 1, miles: 4 },
    { badge: 'impromptu', n: 1, miles: 1 },
  ],
  done: [
    { tag: 'Mission Run', color: '#B4A3E8', text: 'Run 5, the full 45 minutes' },
    { tag: 'In Mission', color: '#B4A3E8', text: 'Gate 3 closed on the sample mission' },
    { tag: 'Utility', color: '#57BE97', text: 'Phone call with a sample caller' },
  ],
  banked: 3262, next: { name: 'Sandy', left: 58 }, today: 46,
  ...JSON.parse(new URLSearchParams(location.search).get('d') || '{}'),
}
const PURPLE = '#B4A3E8', BLUE = '#8ACAFF'
const total = D.awards.reduce((a, x) => a + x.miles, 0)
const tone = (a) => (a.n >= 3 || a.n >= (BADGES[a.badge]?.repeatable ? (a.badge === 'run' ? 4 : Infinity) : 1)) ? PURPLE : BLUE

const CSS = `
.yay { position: fixed; inset: 0; display: grid; place-items: center; background: radial-gradient(ellipse at 50% 34%, #1a2f4a 0%, #0c1b2a 62%); color: #F3F1EA; font-family: 'Instrument Sans', system-ui, sans-serif; overflow: hidden; }
.yay-in { width: min(980px, 92vw); text-align: center; }
.yay-miles { display: inline-flex; align-items: baseline; gap: 14px; animation: yayup .6s cubic-bezier(.2,.8,.2,1) both; }
.yay-miles b { font: 500 104px/1 'Lora', Georgia, serif; color: ${PURPLE}; letter-spacing: -.02em; text-shadow: 0 0 44px rgba(180,163,232,.35); font-variant-numeric: tabular-nums; }
.yay-miles span { font: 500 26px 'Lora', Georgia, serif; color: rgba(243,241,234,.8); }
.yay-badges { display: flex; justify-content: center; gap: 44px; margin: 44px 0 40px; flex-wrap: wrap; }
.yay-badge { width: 132px; display: flex; flex-direction: column; align-items: center; gap: 10px; animation: yaypop .7s cubic-bezier(.2,.9,.3,1.25) both; }
.yay-badge .ring { position: relative; }
.yay-badge .ring::after { content: ""; position: absolute; inset: 0; border-radius: 99px; border: 2px solid var(--c); animation: yayring 1.3s ease-out both; animation-delay: inherit; }
.yay-badge .nm { font: 500 16px/1.25 'Lora', Georgia, serif; }
.yay-badge .mi { font-size: 15px; font-weight: 600; color: var(--c); font-variant-numeric: tabular-nums; }
.yay-badge .x { position: absolute; right: -8px; top: -6px; min-width: 28px; height: 28px; padding: 0 7px; border-radius: 99px; display: grid; place-items: center; font-size: 13.5px; font-weight: 700; color: #0D1D2C; background: var(--c); }
.yay-done { display: inline-grid; row-gap: 10px; text-align: left; margin-bottom: 40px; animation: yayup .6s ease 1.1s both; }
.yay-done div { display: flex; align-items: center; gap: 12px; font-size: 15.5px; }
.yay-done i { font-style: normal; font-size: 12.5px; font-weight: 500; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); border-radius: 99px; padding: 2px 10px; white-space: nowrap; }
.yay-river { width: min(620px, 86vw); margin: 0 auto 34px; animation: yayup .6s ease 1.3s both; }
.yay-river .bar { height: 6px; border-radius: 99px; background: rgba(255,255,255,.1); overflow: hidden; }
.yay-river .bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, ${BLUE}, ${PURPLE}); animation: yayfill 1.4s cubic-bezier(.2,.8,.2,1) 1.5s both; }
.yay-river .nums { display: flex; justify-content: space-between; margin-top: 10px; font-size: 14px; color: rgba(243,241,234,.7); font-variant-numeric: tabular-nums; }
.yay-river .nums b { color: #F3F1EA; font-weight: 600; }
.yay-go { font: 600 15px 'Instrument Sans', sans-serif; color: #0D1D2C; background: ${BLUE}; border: 0; border-radius: 999px; padding: 12px 34px; cursor: pointer; box-shadow: 0 0 26px rgba(138,202,255,.3); animation: yayup .6s ease 1.6s both; }
@keyframes yayup { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes yaypop { 0% { opacity: 0; transform: scale(.4) } 60% { opacity: 1; transform: scale(1.1) } 100% { opacity: 1; transform: scale(1) } }
@keyframes yayring { 0% { transform: scale(.9); opacity: .7 } 100% { transform: scale(1.9); opacity: 0 } }
@keyframes yayfill { from { width: var(--from) } to { width: var(--to) } }
`
function Yay() {
  const [n, setN] = useState(0)
  useEffect(() => { let k = 0; const t = setInterval(() => { k += Math.max(1, Math.ceil(total / 22)); if (k >= total) { k = total; clearInterval(t) } setN(k) }, 45); return () => clearInterval(t) }, [])
  const span = D.next.left + total, to = Math.round(100 * (1 - (D.next.left - 0) / (span + 60))), from = Math.round(100 * (1 - (D.next.left + total) / (span + 60)))
  return (
    <div className="yay">
      <style>{CSS}</style>
      <div className="yay-in">
        <div className="yay-miles"><b>+{n}</b><span>Miles</span></div>
        <div className="yay-badges">
          {D.awards.map((a, i) => (
            <div key={a.badge} className="yay-badge" style={{ '--c': tone(a), animationDelay: `${0.35 + i * 0.22}s` }}>
              <span className="ring" style={{ animationDelay: `${0.5 + i * 0.22}s` }}><BadgeMedallion id={a.badge} size={96} color={tone(a)} glow />{a.n > 1 && <span className="x">×{a.n}</span>}</span>
              <span className="nm">{BADGES[a.badge]?.label || a.badge}</span>
              <span className="mi">+{a.miles}</span>
            </div>
          ))}
        </div>
        <div className="yay-done">
          {D.done.map((x, i) => <div key={i} style={{ '--c': x.color }}><i>{x.tag}</i>{x.text}</div>)}
        </div>
        <div className="yay-river">
          <div className="bar"><i style={{ '--from': `${from}%`, '--to': `${to}%` }} /></div>
          <div className="nums"><span><b>{(D.banked + total).toLocaleString()}</b> Banked</span><span><b>{D.today + total}</b> Today</span><span><b>{D.next.left}</b> To {D.next.name}</span></div>
        </div>
        <button className="yay-go">Continue</button>
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><Yay /></StrictMode>)
