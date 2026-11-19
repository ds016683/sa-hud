// Which gate David is inside, if any, so the card's Lumen panel can be framed on it (David 11/19: "pull up lumen
// and work through each gate, in the gate's environment").
import { useSyncExternalStore } from 'react'
let current = null
const subs = new Set()
export const setGateView = (g) => { current = g; subs.forEach(f => f()) }
export const useGateView = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => current)
// The card's Lumen item, framed on the gate in view.
export const onGate = (item, gv) => !gv ? item : { ...item, title: `Gate ${gv.n ?? ''} · ${gv.text}`.replace('Gate  ·', 'Gate ·'), summary: [`David is working inside one gate of ${item.title}: ${gv.n != null ? `Gate ${gv.n}, ` : ''}"${gv.text}". Keep to this gate unless he asks about the mission.`, item.summary].filter(Boolean).join('\n\n') }
