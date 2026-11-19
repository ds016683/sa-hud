// The logged pop (David 11/19, on the line "E-mail Refresh: 1h 34m logged to Harvest" under a slot: "more of this ai
// prose. make an animation when i close a thing that does a cute little animated pop up saying that it was logged
// and added to hours. or a yay page."). A small yay: a medallion lands with a check, the thing's name, its time
// and where it went, then it lifts away on its own. One mount in the app; anything that closes time calls sayLogged.
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { fmtClock } from '../../lib/loadout'

const EVENT = 'hud:logged'
// where: 'Harvest' for work time, 'Your Day' for personal time that never goes to Harvest.
export const sayLogged = ({ title, minutes, where = 'Harvest' }) => { try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { title, minutes, where, id: Date.now() } })) } catch { /* no window: nothing to show */ } }

const CSS = `
.logpop { position: fixed; left: 50%; bottom: 44px; z-index: 400; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; padding: 14px 24px 14px 16px; border-radius: 999px; background: #0D1D2C; border: 1px solid color-mix(in srgb, #B4A3E8 55%, transparent); box-shadow: 0 18px 50px -14px rgba(0,0,0,.7), 0 0 34px color-mix(in srgb, #B4A3E8 22%, transparent); animation: logrise 3.4s cubic-bezier(.2,.8,.2,1) both; pointer-events: none; }
@keyframes logrise { 0% { opacity: 0; transform: translate(-50%, 26px) scale(.94) } 9% { opacity: 1; transform: translate(-50%, 0) scale(1) } 86% { opacity: 1; transform: translate(-50%, 0) scale(1) } 100% { opacity: 0; transform: translate(-50%, -18px) scale(.98) } }
.logpop .medal { position: relative; width: 46px; height: 46px; border-radius: 99px; display: grid; place-items: center; color: #0D1D2C; background: #B4A3E8; animation: logpop .7s cubic-bezier(.2,.9,.3,1.3) .1s both; }
@keyframes logpop { 0% { transform: scale(.3); opacity: 0 } 60% { transform: scale(1.14); opacity: 1 } 100% { transform: scale(1) } }
.logpop .medal::after { content: ""; position: absolute; inset: 0; border-radius: 99px; border: 2px solid #B4A3E8; animation: logring 1.2s ease-out .25s both; }
@keyframes logring { 0% { transform: scale(.9); opacity: .7 } 100% { transform: scale(2.2); opacity: 0 } }
.logpop .t { font-family: 'Lora', Georgia, serif; font-weight: 500; font-size: 18px; line-height: 1.2; color: #F3F1EA; white-space: nowrap; }
.logpop .s { font-size: 13.5px; color: rgba(243,241,234,.7); margin-top: 3px; white-space: nowrap; }
.logpop .s b { color: #B4A3E8; font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .logpop, .logpop .medal { animation-duration: 3.4s, 0s } .logpop .medal::after { display: none } }
`
export default function LoggedPop() {
  const [pop, setPop] = useState(null)
  useEffect(() => {
    const on = (e) => setPop(e.detail)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  useEffect(() => { if (!pop) return undefined; const t = setTimeout(() => setPop(null), 3500); return () => clearTimeout(t) }, [pop])
  if (!pop) return null
  return (
    <div key={pop.id} className="logpop" role="status" aria-live="polite">
      <style>{CSS}</style>
      <span className="medal"><Check size={24} strokeWidth={2.6} /></span>
      <div>
        <div className="t">{pop.title}</div>
        <div className="s"><b>{fmtClock(pop.minutes)}</b> Added To {pop.where}</div>
      </div>
    </div>
  )
}
