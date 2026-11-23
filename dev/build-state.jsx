// Dev harness: a built tab keeping its state, no sign-in (11/21). The real WorkbenchSheet and the real Lumen panel,
// with the real readers in lib/lumenPanel, over a stand-in for the Ledger's storage: every call the storage client
// makes is answered here from a bucket held in this page (and in this origin's localStorage, so a reload shows what
// was kept). Nothing here reaches the real Ledger. The stand-in answers the way the real storage does, a missing
// file included: 400 with { statusCode: '404', message: 'Object not found' }.
//
// On the Workbench: Marks (a page that speaks the protocol), Plain (a page that never does, and counts anything
// said to it), and any page dropped in dev/pages.local/<slug>.html (ignored by git; put a real built page there).
// Below it: a stranger, a second framed window that sends forged load and save messages for a tab's slug.
//
//   ?reset=1                 empty the bucket first
//   ?fail=read | write       the state file cannot be read, or cannot be written
//   ?slow=800                the state file's reads and writes take that long
// From the console: __bucket() (paths and sizes), __read(path), __calls (every storage call), __knobs (fail, slow),
// __stranger(slug) (the stranger sends its forgeries for that slug), __self(slug) (this window sends one to itself),
// __drive(frame selector, { set: { sel, i, value }, click, read, post }) (a hand inside a framed page, which this page
// cannot reach into: it sets a field and fires its change the way a pick does, and reports the page's light). The
// hand is one script the harness adds to each page it seeds; it is not part of the door and the door ignores it.
// Its report also counts what the door has said to that page (door: { state, saved }).
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Trash2, UserX } from 'lucide-react'
import '../src/sa-hud.css'
import { supabase, supabaseUrl } from '../src/lib/supabase'
import { listBuilds, readWorkbook } from '../src/lib/lumenPanel'
import WorkbenchSheet from '../src/components/river/WorkbenchSheet'
import LumenPanel from '../src/components/river/LumenPanel'

const ROOT = 'dev-card'
const SANDBOX = 'allow-scripts allow-popups allow-forms allow-modals'
const q = new URLSearchParams(location.search)
const knobs = window.__knobs = { fail: q.get('fail') || '', slow: Number(q.get('slow') || 0) }

// ---- the two sample pages ---------------------------------------------------
const SHELL = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>
  body{margin:0;padding:22px 26px;background:#0F2334;color:#F3F1EA;font:14px/1.5 'Instrument Sans',system-ui,sans-serif}
  h2{font:500 22px Lora,Georgia,serif;margin:0}.tag{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .tabno{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:99px;border:1.2px solid rgba(243,241,234,.4);font-size:12px}
  .state{margin-left:auto;font-size:12.5px;padding:3px 10px;border-radius:99px;border:1px solid rgba(243,241,234,.25)}
  .state.saved{color:#7fd6a3;border-color:#7fd6a3}.state.unsaved{color:#ff8f8f;border-color:#ff8f8f}
  table{border-collapse:collapse}td,th{padding:7px 14px 7px 0;text-align:left;font-size:13.5px;border-bottom:1px solid rgba(243,241,234,.12)}
  select,input,button{font:inherit;color:#F3F1EA;background:#16314a;border:1px solid rgba(243,241,234,.25);border-radius:7px;padding:4px 8px}
</style></head><body>${body}</body></html>`

// The same conversation the Revenue Markup page holds with its frame, word for word.
const MARKS = SHELL('Marks', `<div class="tag"><span class="tabno">1</span><h2>Marks</h2><span id="state" class="state" hidden></span></div>
<table><tr><th>Line</th><th>Override</th></tr>
${['Alpha', 'Bravo', 'Charlie'].map((n, i) => `<tr><td>${n}</td><td><select class="o" data-k="${i + 1}"><option value="">None</option><option>Tier 1</option><option>Tier 2</option><option>Tier 3 Commons</option></select></td></tr>`).join('')}
<tr><td>Note</td><td><input id="note" size="28" placeholder="Type a note"></td></tr></table>
<script>(function () {
  var SLUG = 'marks', S = { v: 1, ovr: {}, note: '' }, door = false, timer = null, light = document.getElementById('state');
  function show(kind, words) { light.hidden = false; light.className = 'state ' + kind; light.textContent = words; }
  function draw() { document.querySelectorAll('select.o').forEach(function (s) { s.value = S.ovr[s.dataset.k] || ''; }); document.getElementById('note').value = S.note || ''; }
  function post(msg) { try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) { /* no frame */ } }
  function changed() {
    if (!door) { show('unsaved', 'Not Saved'); return; }
    show('', 'Saving'); clearTimeout(timer);
    timer = setTimeout(function () { post({ hud: 'build-state', op: 'save', slug: SLUG, state: S }); }, 600);
  }
  document.addEventListener('change', function (e) { if (e.target.matches('select.o')) { if (e.target.value) S.ovr[e.target.dataset.k] = e.target.value; else delete S.ovr[e.target.dataset.k]; changed(); } });
  document.getElementById('note').addEventListener('input', function (e) { S.note = e.target.value; changed(); });
  window.addEventListener('message', function (e) {
    var m = e.data; if (!m || m.hud !== 'build-state' || m.slug !== SLUG) return;
    door = true;
    if (m.op === 'state' && m.state && m.state.v === 1) { S = m.state; draw(); show('saved', 'Saved'); }
    else if (m.op === 'state') { light.hidden = true; }
    else if (m.op === 'saved') show('saved', 'Saved');
  });
  post({ hud: 'build-state', op: 'load', slug: SLUG });
})();</script>`)

// A page that never asks. It counts anything its frame says to it: the count must stay at zero.
const PLAIN = SHELL('Plain', `<div class="tag"><span class="tabno">2</span><h2>Plain</h2></div>
<p><button id="b">Count</button> <span id="n">0</span></p><p>Messages Heard From The Frame: <span id="heard">0</span></p>
<script>var n = 0, heard = 0; document.getElementById('b').onclick = function () { document.getElementById('n').textContent = ++n; };
window.addEventListener('message', function (e) { if (e.data && e.data.dev) return; document.getElementById('heard').textContent = ++heard; });</script>`)

// The stranger: framed by this page, but not the tab's frame. It forges both messages for a slug and counts answers.
const STRANGER = (slug) => SHELL('Stranger', `<p>Stranger, Forging For: <b>${slug}</b> · Answers Heard: <span id="heard">0</span></p>
<script>var heard = 0; window.addEventListener('message', function () { document.getElementById('heard').textContent = ++heard; });
parent.postMessage({ hud: 'build-state', op: 'load', slug: '${slug}' }, '*');
parent.postMessage({ hud: 'build-state', op: 'save', slug: '${slug}', state: { v: 1, ovr: { forged: 'by the stranger' }, note: 'forged' } }, '*');</script>`)

// The hand inside a framed page: { dev: 'drive' } in, { dev: 'report' } out.
const DRIVER = `<script>var __door = { state: 0, saved: 0 }; window.addEventListener('message', function (e) {
  var m = e.data; if (m && m.hud === 'build-state') { __door[m.op] = (__door[m.op] || 0) + 1; return; }
  if (!m || m.dev !== 'drive') return;
  var out = { dev: 'report', id: m.id, door: __door };
  try {
    if (m.set) { var el = document.querySelectorAll(m.set.sel)[m.set.i || 0]; el.value = m.set.value; el.dispatchEvent(new Event(m.set.event || 'change', { bubbles: true })); out.set = el.value; }
    if (m.click) document.querySelector(m.click).click();
    if (m.post) parent.postMessage(m.post, '*');
    if (m.read) out.read = [].slice.call(document.querySelectorAll(m.read), 0, m.max || 12).map(function (x) { return 'value' in x ? x.value : x.textContent; });
    if (m.options) out.options = [].map.call(document.querySelector(m.options).options, function (o) { return o.value; });
    var light = document.getElementById('state'); out.light = light ? (light.hidden ? '(hidden)' : light.textContent) : null;
  } catch (err) { out.error = String(err); }
  parent.postMessage(out, '*');
});</` + `script>`
const driven = (html) => html.includes('</body>') ? html.replace('</body>', `${DRIVER}</body>`) : html + DRIVER
let driveId = 0
window.__drive = (frame, cmd = {}) => new Promise((resolve, reject) => {
  const el = document.querySelector(frame), id = ++driveId
  if (!el?.contentWindow) { reject(new Error(`no frame ${frame}`)); return }
  const on = (e) => { if (e.source === el.contentWindow && e.data?.dev === 'report' && e.data.id === id) { window.removeEventListener('message', on); resolve(e.data) } }
  window.addEventListener('message', on)
  setTimeout(() => { window.removeEventListener('message', on); reject(new Error('the framed page did not answer')) }, 4000)
  el.contentWindow.postMessage({ dev: 'drive', id, ...cmd }, '*')
})

// ---- the stand-in storage ---------------------------------------------------
const KEEP = 'dev:build-state:bucket'
const bucket = new Map() // path -> { body, type, at }
const calls = window.__calls = []
if (q.get('reset')) { try { localStorage.removeItem(KEEP) } catch { /* fine */ } }
try { for (const [path, o] of Object.entries(JSON.parse(localStorage.getItem(KEEP) || '{}'))) bucket.set(path, o) } catch { /* empty */ }
const persist = () => { try { localStorage.setItem(KEEP, JSON.stringify(Object.fromEntries([...bucket].filter(([path]) => !path.endsWith('.html'))))) } catch { /* fine */ } }
const put = (path, body, type) => { bucket.set(path, { body, type, at: new Date().toISOString() }); persist() }
const seed = (slug, title, html, at) => {
  bucket.set(`${ROOT}/build/${slug}.html`, { body: driven(html), type: 'text/html', at })
  bucket.set(`${ROOT}/build/${slug}.json`, { body: JSON.stringify({ v: 1, kind: 'build', slug, title, note: '', bytes: html.length, version: 1, created_at: at, updated_at: at, updated_by: 'dev' }), type: 'application/json', at })
}
seed('marks', 'Marks', MARKS, '2026-11-21T12:00:00.000Z')
seed('plain', 'Plain', PLAIN, '2026-11-21T11:00:00.000Z')
// A real built page, when one is in dev/pages.local (git ignores *.local): framed under its own slug.
const local = import.meta.glob('./pages.local/*.html', { query: '?raw', import: 'default', eager: true })
for (const [file, html] of Object.entries(local)) { const slug = file.split('/').pop().replace(/\.html$/, ''); seed(slug, (/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || slug, html, '2026-11-21T13:00:00.000Z') }
window.__bucket = () => Object.fromEntries([...bucket].map(([path, o]) => [path, o.body.length]))
window.__read = (path) => bucket.get(path)?.body ?? null

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const gone = () => json(400, { statusCode: '404', error: 'not_found', message: 'Object not found', code: 'NoSuchKey' })
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const realFetch = window.fetch.bind(window)
const STORE = `${supabaseUrl}/storage/v1/`
async function storage(url, init = {}) {
  const u = new URL(url), method = (init.method || 'GET').toUpperCase()
  const rest = decodeURIComponent(u.pathname.replace('/storage/v1/', ''))
  const isState = rest.endsWith('.state.json')
  const note = (status) => { calls.push({ method, path: rest, status, at: new Date().toISOString() }); window.dispatchEvent(new Event('dev:storage')) }
  if (isState && knobs.slow) await wait(knobs.slow)
  if (method === 'POST' && rest === 'object/list/project-files') {
    const { prefix } = JSON.parse(init.body)
    const rows = [...bucket].filter(([path]) => path.startsWith(`${prefix}/`) && !path.slice(prefix.length + 1).includes('/')).map(([path, o]) => ({ name: path.slice(prefix.length + 1), id: path, updated_at: o.at, created_at: o.at, last_accessed_at: o.at, metadata: { size: o.body.length, mimetype: o.type } }))
    note(200); return json(200, rows)
  }
  if (method === 'POST' && rest.startsWith('object/sign/project-files/')) {
    const path = rest.replace('object/sign/project-files/', '')
    if (isState && knobs.fail === 'read') { note(500); return json(500, { statusCode: '500', error: 'internal', message: 'the stand-in was told to fail this read' }) }
    if (!bucket.has(path)) { note(400); return gone() }
    note(200); return json(200, { signedURL: `/object/sign/project-files/${path.split('/').map(encodeURIComponent).join('/')}?token=dev` })
  }
  if (method === 'GET' && rest.startsWith('object/sign/project-files/')) {
    const o = bucket.get(rest.replace('object/sign/project-files/', ''))
    if (!o) { note(400); return gone() }
    note(200); return new Response(o.body, { status: 200, headers: { 'Content-Type': o.type } })
  }
  if (method === 'POST' && rest.startsWith('object/project-files/')) {
    const path = rest.replace('object/project-files/', '')
    if (isState && knobs.fail === 'write') { note(500); return json(500, { statusCode: '500', error: 'internal', message: 'the stand-in was told to fail this write' }) }
    const file = init.body instanceof FormData ? init.body.get('') : init.body
    put(path, typeof file === 'string' ? file : await new Response(file).text(), (file && file.type) || 'application/octet-stream')
    note(200); return json(200, { Key: `project-files/${path}`, Id: path })
  }
  if (method === 'DELETE' && rest === 'object/project-files') {
    const { prefixes } = JSON.parse(init.body); const out = []
    for (const path of prefixes) if (bucket.delete(path)) out.push({ name: path })
    persist(); note(200); return json(200, out)
  }
  note(404); return json(404, { statusCode: '404', error: 'not_found', message: `the stand-in has no answer for ${method} ${rest}` })
}
// Storage is answered here; the Ledger's tables answer empty; sign-in traffic is left alone.
window.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url
  if (url.startsWith(STORE)) return storage(url, init)
  if (url.startsWith(`${supabaseUrl}/rest/v1/`)) return Promise.resolve(json(200, []))
  return realFetch(input, init)
}
// The readers ask for a session before they trust "not found"; the harness has one in name only, and it goes nowhere.
supabase.auth.getSession = async () => ({ data: { session: { access_token: 'dev', user: { id: 'dev' } } }, error: null })

// ---- the page ---------------------------------------------------------------
const panelApi = { loadThread: async () => [], listHandoffs: async () => [], handToClaudeCode: async () => ({}), askLumen: async () => 'A sample reply from the harness.', readWorkbook, listBuilds }
const item = { kind: 'objective', id: '00000000-0000-0000-0000-000000000000', title: 'Dev Card', root: ROOT }
const iconBtn = { display: 'inline-grid', placeItems: 'center', width: 30, height: 30, color: 'var(--hud-ink-2, #c9d3dd)', background: 'transparent', border: '1px solid rgba(243,241,234,0.2)', borderRadius: 8, cursor: 'pointer' }

function App() {
  const [, tick] = useState(0)
  const [forge, setForge] = useState(null) // { slug, n }: the stranger frame, remounted for each forgery
  useEffect(() => { const on = () => tick(t => t + 1); window.addEventListener('dev:storage', on); return () => window.removeEventListener('dev:storage', on) }, [])
  useEffect(() => {
    window.__stranger = (slug = 'marks') => setForge(f => ({ slug, n: (f?.n || 0) + 1 }))
    window.__self = (slug = 'marks') => window.postMessage({ hud: 'build-state', op: 'save', slug, state: { v: 1, ovr: { forged: 'by this window' }, note: 'forged' } }, '*')
  }, [])
  // Everything but the built pages and their meta files: the kept states, the tab order, the panel's workbook.
  const kept = [...bucket].filter(([path]) => !path.endsWith('.html') && (path.endsWith('.state.json') || !/\/build\/[^/]+\.json$/.test(path)))
  return (
    <div className="sa-dark sa-app" style={{ display: 'block', minHeight: '100vh', padding: '28px 32px 120px', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: 'Lora, serif', fontWeight: 500, fontSize: 26, margin: '0 0 18px' }}>Built Tab State</h1>
      <WorkbenchSheet root={ROOT} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '26px 0 10px' }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontWeight: 500, fontSize: 18, margin: 0 }}>Stranger</h2>
        <button style={iconBtn} title="The Stranger Forges A Load And A Save For Marks" aria-label="Forge messages for Marks" onClick={() => window.__stranger('marks')}><UserX size={15} /></button>
      </div>
      {forge && <iframe key={forge.n} title="Stranger" sandbox={SANDBOX} srcDoc={STRANGER(forge.slug)} style={{ display: 'block', width: '100%', height: 70, border: '1px solid rgba(243,241,234,0.14)', borderRadius: 10, background: '#0F2334' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '26px 0 10px' }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontWeight: 500, fontSize: 18, margin: 0 }}>Kept In Storage</h2>
        <button style={iconBtn} title="Empty The Bucket And Reload" aria-label="Empty the bucket and reload" onClick={() => { try { localStorage.removeItem(KEEP) } catch { /* fine */ } location.reload() }}><Trash2 size={15} /></button>
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: 13 }}><tbody>
        {kept.length === 0 && <tr><td style={{ color: 'var(--hud-ink-2, #c9d3dd)' }}>Nothing Kept Yet</td></tr>}
        {kept.map(([path, o]) => <tr key={path}><td style={{ padding: '4px 18px 4px 0' }}>{path}</td><td style={{ padding: '4px 18px 4px 0', fontVariantNumeric: 'tabular-nums' }}>{o.body.length} bytes</td><td style={{ padding: '4px 0', maxWidth: 620, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--hud-ink-2, #c9d3dd)' }}>{o.body.slice(0, 160)}</td></tr>)}
      </tbody></table>
      <LumenPanel item={item} api={panelApi} />
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
