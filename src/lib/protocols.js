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
export async function liveProtocolCounts() {
  const { data, error } = await supabase.from('edit_punchlist').select('objective_id,status,protocol').not('objective_id', 'is', null)
  if (error) return {}
  const out = {}
  for (const r of data || []) if (isOpenRow(r)) out[r.objective_id] = (out[r.objective_id] || 0) + 1
  return out
}
