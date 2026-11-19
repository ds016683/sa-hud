// What the yay shares (river/AwardYay.jsx, and the pages that end in one: the mission close and the run report).
// The marker is the one the River has always kept (localStorage river-seen.ledgerMaxId).
import { supabase } from './supabase'

const KEY = 'river-seen'
export const readSeen = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
export const writeSeen = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* the yay may play once more */ } }

// A page that is its own yay holds the watcher while it shows, so the same miles are not played twice.
let held = 0
export const yayHeld = () => held > 0
export const holdYay = () => { held += 1 }
// On the way out: if everything unseen was earned since `since`, it has just been seen here; move the marker.
// Anything older is left for the watcher.
export async function releaseYay(since) {
  try {
    const seen = readSeen()
    if (seen && seen.ledgerMaxId != null) {
      const { data } = await supabase.from('miles_ledger').select('id,awarded_at').gt('id', seen.ledgerMaxId).order('id', { ascending: true }).limit(200)
      const rows = data || [], t = since ? new Date(since).getTime() - 60000 : 0
      if (rows.length && rows.every(r => new Date(r.awarded_at).getTime() >= t)) writeSeen({ ...readSeen(), ledgerMaxId: Number(rows[rows.length - 1].id) })
    }
  } catch { /* the watcher will play it */ } finally { held = Math.max(0, held - 1) }
}
// A mission's miles are struck on the next update, after its close page has already played them. The watcher skips those rows.
const PLAYED = 'yay-played'
export const played = () => { try { return JSON.parse(localStorage.getItem(PLAYED) || '[]') } catch { return [] } }
export const markPlayed = (key) => { try { localStorage.setItem(PLAYED, JSON.stringify([...played().filter(k => k !== String(key)), String(key)].slice(-60))) } catch { /* it plays again */ } }
