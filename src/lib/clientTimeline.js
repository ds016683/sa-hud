// The client program timeline (David, 10/19): a structured artifact on the
// client's anchor Main Mission (<project id>/artifacts/program-timeline.json),
// the same home as every other structured work product. Items are milestones
// (start only) or bars (start and end) in a lane; the Clients page draws them
// as a waterfall and edits them in the item modal.
import { readArtifact, writeArtifact } from './artifacts'

export const SLUG = 'program-timeline'
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)

export async function loadTimeline(projectId) {
  try {
    const doc = await readArtifact(projectId, SLUG)
    return { doc, items: Array.isArray(doc?.items) ? doc.items : [] }
  } catch (e) {
    if (/not found|404|400/i.test(String(e.message))) return { doc: null, items: [] }
    throw e
  }
}

const clean = (it, i) => ({
  id: it.id || newId(),
  lane: it.lane,
  title: (it.title || '').trim(),
  start_date: it.start_date || null,
  end_date: it.end_date || null,
  date_label: it.date_label || '',
  owner: it.owner || '',
  status: it.status || 'planned',
  source: it.source || '',
  notes: it.notes || '',
  links: Array.isArray(it.links) ? it.links.filter(l => l && l.url) : [],
  position: Number.isFinite(it.position) ? it.position : i,
  updated_at: it.updated_at || new Date().toISOString(),
})

export async function saveTimeline(projectId, clientKey, items, prevDoc) {
  const doc = { ...(prevDoc || {}), title: 'Program Timeline', kind: 'timeline', client_key: clientKey, items: items.map(clean) }
  await writeArtifact(projectId, SLUG, doc)
  return doc
}

// The baseline the Client card can load when its timeline is empty. Titles and
// dates are verbatim from their source.
const PETER = 'Peter Schultz, October 17 note (Re: Draft Agenda)'
const PROD = 'Weekly MMA Production Meeting, September 16'
export const BASELINE = {
  'Client.MMA': [
    { lane: 'NetNav 2.0', title: 'Security adjustments to code', start_date: '2026-10-14', date_label: 'Done 10/14', owner: 'Topher Rasmussen', status: 'done', source: PETER },
    { lane: 'NetNav 2.0', title: 'Updated code to GitHub for deeper testing', start_date: '2026-11-01', date_label: 'Before 11/10', owner: 'Topher Rasmussen', status: 'in_motion', source: PETER },
    { lane: 'NetNav 2.0', title: 'Any additional requests made by Marsh', start_date: '2026-11-01', date_label: 'Before 11/10', owner: 'John Meredith · Cheryl Matochik', status: 'planned', source: PETER },
    { lane: 'NetNav 2.0', title: 'Final draft of code for cutover with all changes', start_date: '2026-11-10', date_label: '11/10 meeting', owner: 'Topher Rasmussen', status: 'planned', source: PETER },
    { lane: 'NetNav 2.0', title: 'Initiate Voyager process for development in Marsh environment', start_date: '2026-11-10', date_label: '11/10 meeting', owner: 'Peter Schultz · Arindam Chowdhury', status: 'planned', source: PETER },
    { lane: 'NetNav 2.0', title: 'Complete Voyager and be developing in Marsh environment', start_date: '2026-12-31', date_label: '12/31', owner: 'Arindam Chowdhury', status: 'planned', source: PETER },
    { lane: 'NetNav 2.0', title: 'Test 2.0 NN with a pilot group', start_date: '2027-01-31', date_label: '1/31', owner: 'Alex Meyer', status: 'planned', source: PETER },
    { lane: 'NetNav 2.0', title: 'Develop training video and method to communicate changes', start_date: '2027-02-28', date_label: '2/28', owner: 'Alex Meyer · Tanner Johnson', status: 'planned', source: PETER },
    { lane: 'NetNav 2.0', title: 'Deploy to market with base+ capabilities', start_date: '2027-03-31', date_label: '3/31', owner: 'Peter Schultz · John Meredith', status: 'planned', source: PETER },
    { lane: 'NetNav 2.0', title: 'Deploy 1-2 features per month until full capabilities are available', start_date: '2027-04-01', end_date: '2027-06-30', date_label: 'Monthly to 6/30', owner: 'Cheryl Matochik · John Meredith', status: 'planned', source: PETER },
    { lane: 'Data Production', title: 'V11 ingestion begins (final network list deadline)', start_date: '2026-10-12', date_label: 'Oct 12', owner: 'Chris Kalvig', status: 'in_motion', source: PROD },
    { lane: 'Data Production', title: 'V11 delivery to MMA (ahead of normal cycle)', start_date: '2026-11-30', date_label: 'End of November', owner: 'Chris Kalvig', status: 'planned', source: PROD },
  ],
}
