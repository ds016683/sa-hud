// Live Protocols (David, 10/23): the shared bits of the protocol rows. One
// table (edit_punchlist) carries every protocol's rows, named by `protocol`.
import { supabase } from './supabase'

export const PROTOCOLS = {
  editing: { label: 'Editing Protocol', sub: 'edits fired, built, proven, approved' },
  briefing: { label: 'Briefing Protocol', sub: 'the gap map: one ask at a time until the picture is complete' },
}
export const protocolOf = (r) => r.protocol || 'editing'
export const isOpenRow = (r) => !['approved', 'ruled'].includes(r.status)

// Open rows per item, for the Board's Live Protocols button.
// Rows on a released item are history, not live (David 10/24: the AMA pass's 54
// editing rows were still counting after the Bounty was extracted).
export async function liveObjectiveIds(ids) {
  if (!ids.length) return new Set()
  const { data } = await supabase.from('objectives').select('id,state').in('id', ids).is('deleted_at', null).neq('state', 'released')
  return new Set((data || []).map(o => o.id))
}
export async function liveProtocolCounts() {
  const { data, error } = await supabase.from('edit_punchlist').select('objective_id,status,protocol').not('objective_id', 'is', null)
  if (error) return {}
  const open = (data || []).filter(isOpenRow)
  const live = await liveObjectiveIds([...new Set(open.map(r => r.objective_id))])
  const out = {}
  for (const r of open) if (live.has(r.objective_id)) out[r.objective_id] = (out[r.objective_id] || 0) + 1
  return out
}
