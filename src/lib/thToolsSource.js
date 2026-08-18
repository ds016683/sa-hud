// th-tools data source adapter.
//
// Today: resolves from the committed snapshot (constants/thToolsMirror.js).
// When the read API lands (docs/TH-TOOLS-READ-API-ASK.md), set the two
// values below and the Ecosystem goes live with zero component changes:
// fetchRegistry() replaces TH_REGISTRY, fetchInventory() powers the ghost
// tray and drift checks from th-tools' own sweep instead of David's.
//
// NOTE: this repo is public. The token must NEVER be committed — it is read
// from a runtime-provided global (window.__TH_TOOLS_TOKEN, set by whatever
// hosts the HUD once it moves off GitHub Pages) or a future server proxy.
import { TH_REGISTRY, GHOSTS } from '../constants/thToolsMirror'

const API_BASE = null // e.g. 'https://tools.thirdhorizon.com' when the read API exists

async function get(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json()
}

export async function fetchRegistry() {
  const token = typeof window !== 'undefined' ? window.__TH_TOOLS_TOKEN : null
  if (!API_BASE || !token) {
    return { rows: TH_REGISTRY, live: false, asOf: 'committed snapshot' }
  }
  const rows = await get('/api/platforms', token)
  return { rows, live: true, asOf: new Date().toISOString() }
}

export async function fetchInventory() {
  const token = typeof window !== 'undefined' ? window.__TH_TOOLS_TOKEN : null
  if (!API_BASE || !token) {
    return { entities: GHOSTS, live: false, asOf: 'David sweep 2026-08-17' }
  }
  const data = await get('/api/inventory', token)
  return { entities: data.entities, run: data.run, live: true, asOf: new Date().toISOString() }
}
