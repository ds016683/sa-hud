// Dev harness: the Files pill on a card (CardFiles) on sample files, no sign-in and no Ledger.
// ?empty shows the card with nothing on it. Everything a button does happens in memory.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import CardFiles from '../src/components/river/CardFiles'
import { INK, SERIF } from '../src/components/river/canon'

const blobUrl = (text, type) => URL.createObjectURL(new Blob([text], { type }))
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#16314A"/><text x="320" y="190" fill="#F3F1EA" font-family="Georgia" font-size="28" text-anchor="middle">A sample image</text></svg>'
const bytes = {
  'a/notes.md': blobUrl('# Offer Parameters\n\nBase, bonus, equity, start date.\n\n- Draft one\n- Draft two', 'text/markdown'),
  'a/chart.svg': blobUrl(svg, 'image/svg+xml'),
  'a/page.html': blobUrl('<body style="font-family:Georgia;padding:24px"><h1>A built page</h1><p>Rendered in a sandbox.</p></body>', 'text/html'),
  'a/table.csv': blobUrl('name,value\nBase,180000\nBonus,20%', 'text/csv'),
}
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
let rows = new URLSearchParams(location.search).has('empty') ? [] : [
  { id: 'f1', name: 'TH job description_Chief Analytics Officer.docx', bucket: 'project-files', path: 'a/jd.docx', size: 252928, source: 'email', created_at: ago(1), filed_at: null, evidence: false, version: 1, note: 'Email · Jordana Choucair · Oct 21, 2026, 5:56 PM · Re: Wall Mount and Singing Fish' },
  { id: 'f2', name: 'Offer Parameters.md', bucket: 'project-files', path: 'a/notes.md', size: 2100, source: 'david', created_at: ago(30), filed_at: ago(2), evidence: true, version: 2 },
  { id: 'f3', name: 'Comp Bands.csv', bucket: 'project-files', path: 'a/table.csv', size: 840, source: 'session', created_at: ago(52), filed_at: ago(40), evidence: false, version: 1 },
  { id: 'f4', name: 'Org Chart.svg', bucket: 'project-files', path: 'a/chart.svg', size: 18400, source: 'david', created_at: ago(80), filed_at: null, evidence: false, version: 1 },
  { id: 'f5', name: 'Offer Summary Page.html', bucket: 'project-files', path: 'a/page.html', size: 5200, source: 'session', created_at: ago(100), filed_at: ago(90), evidence: false, version: 1 },
  { id: 'f6', name: 'MMA Lunch Order Page', bucket: 'link', path: 'https://lunch.thirdhorizon.com/mma', size: null, source: 'session', created_at: ago(120), filed_at: null, evidence: false, version: 1, note: 'Guest code in the invite' },
  { id: 'f7', name: 'Equity Plan.pdf', bucket: 'request', path: '/Users/davidsmith/Documents/Equity Plan.pdf', size: null, source: 'request', created_at: ago(0.2), filed_at: null, evidence: false, version: 1 },
]
let index = { v: 1, folders: new URLSearchParams(location.search).has('empty') ? [] : ['Drafts'], of: { f2: 'Drafts', f3: 'Drafts' } }
const patch = (id, p) => { rows = rows.map(r => r.id === id ? { ...r, ...p } : r) }
const api = {
  listLiveFiles: async () => ({ rows: rows.slice() }),
  readFileIndex: async () => index,
  writeFileIndex: async (_id, next) => { index = next },
  putLiveFile: async (file) => { const r = { id: 'n' + rows.length, name: file.name, bucket: 'project-files', path: `a/${file.name}`, size: file.size, source: 'david', created_at: new Date().toISOString(), filed_at: null, evidence: false, version: 1 }; bytes[r.path] = URL.createObjectURL(file); rows = [r, ...rows]; return r },
  requestLiveFile: async (path, { note }) => { const r = { id: 'n' + rows.length, name: path.split('/').pop(), bucket: 'request', path, size: null, source: 'request', created_at: new Date().toISOString(), filed_at: null, evidence: false, version: 1, note }; rows = [r, ...rows]; return r },
  addLiveLink: async (url, { title, note }) => { const r = { id: 'n' + rows.length, name: title || url, bucket: 'link', path: url, size: null, source: 'david', created_at: new Date().toISOString(), filed_at: null, evidence: false, version: 1, note }; rows = [r, ...rows]; return r },
  openLiveFile: async (row) => { if (!bytes[row.path]) throw new Error('the harness holds no bytes for this one'); return bytes[row.path] },
  downloadLiveFile: async (row) => bytes[row.path] || `data:application/octet-stream;base64,${btoa('sample bytes for ' + row.name)}`,
  draftMail: async () => ({ webLink: null }),
  pinEvidence: async (id, on) => patch(id, { evidence: on }),
  fileSynopsis: async (id, { refresh } = {}) => {
    await new Promise(r => setTimeout(r, refresh ? 900 : 500))
    if (id === 'f3') throw new Error('the harness has no model for this one')
    return { synopsis: 'A Third Horizon job description for the Chief Analytics Officer, written as a template for the 2027 org rebuild. It sets out the role, who it reports to, and what it is accountable for.\n\n- Reports to the Chief Executive Officer; sits on the executive team.\n- Owns the analytics product line, the data platform, and client delivery of analytic work.\n- Lists six accountabilities and the qualifications sought.\n- The salary line is left blank.', partial: false, made_at: new Date().toISOString(), cached: !refresh }
  },
  removeLiveRow: async (row) => { rows = rows.filter(r => r.id !== row.id) },
  pdfUrl: async () => { throw new Error('the PDF door needs the Ledger; on the live card this shows the document') },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ background: 'var(--hud-surface)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 80px', color: INK }}>
        <div style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 500, marginBottom: 22 }}>Send Rich King Offer Parameters</div>
        <CardFiles objectiveId="harness" api={api} />
      </div>
    </div>
  </StrictMode>,
)
