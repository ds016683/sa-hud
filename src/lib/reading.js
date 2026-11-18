// The Reading page's read (David 11/18). Lumen is the writer (api/_reading.mjs); the page only reads.
import { supabase } from './supabase'
export async function readReading() {
  const empty = { v: 1, books: [] }
  try {
    const { data, error } = await supabase.storage.from('project-files').createSignedUrl('reading/index.json', 60)
    if (error || !data?.signedUrl) return empty
    const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return empty
    const j = await res.json()
    return { v: 1, books: Array.isArray(j.books) ? j.books : [] }
  } catch { return empty }
}
