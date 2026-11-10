// The lunch door (David 11/10): a small gated order page for a meal with guests.
// One function serves everything, so nothing about an event is public: the gate,
// the name pick, the menu, the order, and the order sheet on the mission's Workbench.
//
//   GET  /lunch/<slug>    -> the page for where this visitor stands (gate, names, menu)
//   POST /lunch/<slug>    -> { action: unlock | identify | switch | order | clear | leave }
//
// An event is one config in private storage, written by a session at David's word:
//   project-files/lunch/<slug>/config.json
//     { slug, active, title, host, when, place, closes_at, expires_at, code, salt, objective_id,
//       roster: [{ id, name }], rules: { max_items },
//       menu: { title, note, sections: [{ title, note, items: [{ id, name, desc, price,
//               options: [{ label, choices: [..], required }] }] }] } }
//   project-files/lunch/<slug>/orders/<person id>.json    one order per guest
//   project-files/lunch/<slug>/events/<iso>-<id>.json     the audit trail (no IPs)
//   project-files/lunch/<slug>/throttle/<keyed hash>.json wrong-code attempts, per address
// The order sheet is rebuilt on every change as a built page on the mission's card:
//   project-files/objectives/<objective_id>/build/lunch-<slug>.{html,json}
//
// Posture, all of it real: the code is checked here with a constant-time compare; the
// guest list and the menu are not sent before it passes; the session is an HMAC-SHA256
// token in an HttpOnly, Secure, SameSite cookie scoped to this one path; five wrong
// codes in ten minutes locks an address out; every write is validated against the
// config; the page ships under a nonce-only Content Security Policy with no third-party
// requests of any kind (fonts and the mark are served from this host).
import crypto from 'node:crypto'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const BUCKET = 'project-files'
const ORIGINS = ['https://proposals.thirdhorizon.com', 'https://sa-hud.vercel.app', 'http://localhost:5173', 'http://localhost:3013']
const SESSION_HOURS = 12
const THROTTLE_MAX = 5
const THROTTLE_WINDOW_MS = 10 * 60 * 1000

// ---- storage ------------------------------------------------------------------------
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const enc = (path) => path.split('/').map(encodeURIComponent).join('/')
async function getJson(path) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${enc(path)}?cb=${Date.now()}`, { headers: { ...hdr(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!res.ok) return null
  try { return await res.json() } catch { return null }
}
async function put(path, body, contentType = 'application/json') {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${enc(path)}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': contentType, 'x-upsert': 'true' }, body })
  if (!res.ok) throw new Error(`storage write ${res.status}`)
}
async function remove(paths) {
  if (!paths.length) return
  await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { ...hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }) })
}
async function list(prefix, limit = 500) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit, sortBy: { column: 'name', order: 'asc' } }) })
  if (!res.ok) return []
  return ((await res.json()) || []).filter(f => f.id !== null)
}

// ---- small tools ----------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
const keyFor = (config) => crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_KEY || '')).update(`lunch-door:v1:${config.slug}:${config.salt || ''}`).digest()
const sameText = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest())

function mint(config, person) {
  const now = Math.floor(Date.now() / 1000)
  let exp = now + SESSION_HOURS * 3600
  const hard = config.expires_at ? Math.floor(new Date(config.expires_at).getTime() / 1000) : null
  if (hard && hard < exp) exp = hard
  const payload = b64u(JSON.stringify({ s: config.slug, p: person || null, x: exp }))
  const sig = b64u(crypto.createHmac('sha256', keyFor(config)).update(payload).digest())
  return { token: `${payload}.${sig}`, exp, maxAge: Math.max(0, exp - now) }
}
function verify(config, token) {
  const [payload, sig] = String(token || '').split('.')
  if (!payload || !sig) return null
  const want = crypto.createHmac('sha256', keyFor(config)).update(payload).digest()
  let got
  try { got = unb64u(sig) } catch { return null }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null
  try {
    const p = JSON.parse(unb64u(payload).toString('utf8'))
    if (p.s !== config.slug || !Number.isSafeInteger(p.x) || p.x <= Math.floor(Date.now() / 1000)) return null
    return p
  } catch { return null }
}
const cookieName = (slug) => `lunch_${slug.replace(/[^a-z0-9]/g, '_')}`
function readCookie(req, name) {
  const raw = String(req.headers.cookie || '')
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim() }
  return null
}
const setCookie = (res, slug, value, maxAge) => res.setHeader('Set-Cookie', `${cookieName(slug)}=${value}; Path=/lunch/${slug}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`)

function secure(res, nonce) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()')
  if (nonce) res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; font-src 'self'; img-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`)
  else res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
}
const json = (res, status, body) => { secure(res, null); res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.status(status).send(JSON.stringify(body)) }

async function logEvent(config, type, extra = {}) {
  const at = new Date().toISOString()
  // The type rides in the file name so the order sheet can count events from one listing.
  try { await put(`lunch/${config.slug}/events/${at.replace(/[:.]/g, '-')}_${type.replace(/[^a-z]/g, '-')}_${crypto.randomBytes(3).toString('hex')}.json`, JSON.stringify({ at, type, ...extra })) } catch { /* the trail never blocks a guest */ }
}

// ---- the menu, read from the config ---------------------------------------------------
const allItems = (config) => (config.menu?.sections || []).flatMap(sec => (sec.items || []).map(it => ({ ...it, section: sec.title })))
const closed = (config) => !!config.closes_at && Date.now() > new Date(config.closes_at).getTime()

function validateOrder(config, body) {
  const items = allItems(config)
  const picked = Array.isArray(body.items) ? body.items.slice(0, 40) : []
  const out = []
  const seen = new Set()
  for (const p of picked) {
    const it = items.find(x => x.id === String(p?.id || ''))
    if (!it || seen.has(it.id)) continue
    seen.add(it.id)
    const options = {}
    for (const o of it.options || []) {
      const choice = String(p?.options?.[o.label] ?? '')
      if (choice && (o.choices || []).includes(choice)) options[o.label] = choice
      else if (o.required) return { error: `Pick ${o.label} for ${it.name}.` }
    }
    out.push({ id: it.id, name: it.name, section: it.section, price: it.price ?? null, options })
  }
  if (!out.length) return { error: 'Pick at least one thing from the menu.' }
  const max = Number(config.rules?.max_items) || 0
  if (max && out.length > max) return { error: `One order holds ${max} ${max === 1 ? 'item' : 'items'} at most.` }
  return { items: out, notes: clean(body.notes, 400) }
}

async function readOrders(config) {
  const files = await list(`lunch/${config.slug}/orders`)
  const docs = await Promise.all(files.filter(f => f.name.endsWith('.json')).map(f => getJson(`lunch/${config.slug}/orders/${f.name}`)))
  return docs.filter(Boolean)
}

// ---- the order sheet on the mission's Workbench -----------------------------------------
function boardHtml(config, orders, events) {
  const roster = config.roster || []
  const byId = Object.fromEntries(orders.map(o => [o.person_id, o]))
  const waiting = roster.filter(r => !byId[r.id])
  const tally = new Map()
  for (const o of orders) for (const it of o.items || []) {
    const opt = Object.entries(it.options || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
    const k = `${it.name}${opt ? ` (${opt})` : ''}`
    tally.set(k, (tally.get(k) || 0) + 1)
  }
  const line = (it) => `${esc(it.name)}${Object.keys(it.options || {}).length ? ` <span class="q">(${esc(Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(', '))})</span>` : ''}${it.price ? ` <span class="q">${esc(it.price)}</span>` : ''}`
  const count = (t) => events.filter(e => e.type === t).length
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lunch Orders</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Instrument+Sans:wght@400..700&display=swap">
<style>
:root{--ink:#F3F1EA;--ink2:rgba(243,241,234,.68);--ink3:rgba(243,241,234,.42);--line:rgba(255,255,255,.12);--fill:rgba(255,255,255,.05);--accent:#8ACAFF;--gold:#F8C761;--success:#B4A3E8}
*{box-sizing:border-box}body{margin:0;background:#0F2334;color:var(--ink);font-family:'Instrument Sans',system-ui,sans-serif;font-size:14px;line-height:1.5;padding:22px 24px 40px}
h1{font-family:Lora,Georgia,serif;font-weight:500;font-size:26px;letter-spacing:-.01em;margin:0 0 4px}
h2{font-family:Lora,Georgia,serif;font-weight:500;font-size:19px;color:var(--accent);margin:26px 0 8px}
.sub{color:var(--ink2);font-size:14px}.q{color:var(--ink2)}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:16px}
.fact{border:1px solid var(--line);border-radius:10px;background:var(--fill);padding:10px 12px}.fact .k{font-size:12.5px;font-weight:600;color:var(--accent)}.fact .v{font-family:Lora,Georgia,serif;font-size:19px;margin-top:2px;word-break:break-word}
.row{border-top:1px solid var(--line);padding:10px 0;display:grid;grid-template-columns:170px 1fr;gap:14px}.row .n{font-family:Lora,Georgia,serif;font-size:15.5px;font-weight:500}.row .t{font-size:12.5px;color:var(--ink3)}
.note{color:var(--gold);font-size:13.5px;margin-top:4px}
.tally{display:grid;grid-template-columns:44px 1fr;gap:6px 12px;font-size:14.5px}.tally .c{font-family:Lora,Georgia,serif;font-size:17px;color:var(--gold)}
.wait{color:var(--ink2)}
</style></head><body>
<h1>${esc(config.title || 'Lunch')}</h1>
<div class="sub">${esc([config.place, config.when].filter(Boolean).join(' · '))}${config.closes_at ? ` · Orders close ${esc(fmtWhen(config.closes_at))}` : ''}</div>
<div class="facts">
  <div class="fact"><div class="k">Orders In</div><div class="v">${orders.length} of ${roster.length}</div></div>
  <div class="fact"><div class="k">Guest Link</div><div class="v">${esc(config.link || `proposals.thirdhorizon.com/lunch/${config.slug}`)}</div></div>
  <div class="fact"><div class="k">Access Code</div><div class="v">${esc(config.code || '')}</div></div>
  <div class="fact"><div class="k">Gate</div><div class="v">${count('gate.pass')} in · ${count('gate.fail')} wrong</div></div>
</div>
${!config.menu || !roster.length ? `<h2>Waiting On</h2><div class="wait">${!config.menu ? 'The menu. ' : ''}${!roster.length ? 'The guest list.' : ''}</div>` : ''}
<h2>The Order, To Read To The Restaurant</h2>
${tally.size ? `<div class="tally">${[...tally.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div class="c">${n}</div><div>${esc(k)}</div>`).join('')}</div>` : '<div class="wait">Nothing ordered yet.</div>'}
<h2>By Guest</h2>
${orders.length ? orders.sort((a, b) => String(a.name).localeCompare(String(b.name))).map(o => `<div class="row"><div><div class="n">${esc(o.name)}</div><div class="t">${esc(fmtWhen(o.saved_at))}</div></div><div>${(o.items || []).map(line).join('<br>')}${o.notes ? `<div class="note">Note: ${esc(o.notes)}</div>` : ''}</div></div>`).join('') : '<div class="wait">No orders yet.</div>'}
${waiting.length ? `<h2>Still To Order</h2><div class="wait">${waiting.map(r => esc(r.name)).join(' · ')}</div>` : ''}
</body></html>`
}
export async function rebuildBoard(config) {
  if (!config.objective_id) return
  try {
    const [orders, evFiles] = await Promise.all([readOrders(config), list(`lunch/${config.slug}/events`, 1000)])
    const gate = evFiles.map(f => ({ type: (f.name.match(/_([a-z-]+)_[0-9a-f]{6}\.json$/) || [])[1]?.replace('-', '.') || '' }))
    const html = boardHtml(config, orders, gate)
    const root = `objectives/${config.objective_id}`
    const page = `lunch-${config.slug}`
    const prior = await getJson(`${root}/build/${page}.json`)
    const now = new Date().toISOString()
    await put(`${root}/build/${page}.html`, html, 'text/html; charset=utf-8')
    await put(`${root}/build/${page}.json`, JSON.stringify({ v: 1, kind: 'build', slug: page, title: `${config.title || 'Lunch'} Orders`, note: `${orders.length} of ${(config.roster || []).length} in. Rebuilt by the lunch door on every order.`, bytes: html.length, version: (prior?.version || 0) + 1, created_at: prior?.created_at || now, updated_at: now, updated_by: 'lunch door', events: evFiles.length }))
  } catch { /* the sheet never blocks a guest */ }
}

// ---- pages ------------------------------------------------------------------------------
const CSS = `
@font-face{font-family:'Lora';font-style:normal;font-weight:400 700;font-display:swap;src:url(/lunch-assets/lora.woff2) format('woff2')}
@font-face{font-family:'Lora';font-style:italic;font-weight:400 700;font-display:swap;src:url(/lunch-assets/lora-italic.woff2) format('woff2')}
@font-face{font-family:'Instrument Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(/lunch-assets/instrument-sans.woff2) format('woff2')}
:root{--navy:#0F2334;--deep:#0D1D2C;--ink:#F3F1EA;--ink2:rgba(243,241,234,.68);--ink3:rgba(243,241,234,.42);--line:rgba(255,255,255,.12);--fill:rgba(255,255,255,.05);--fill2:rgba(255,255,255,.09);--accent:#8ACAFF;--gold:#F8C761;--red:#DE7E6E;--success:#B4A3E8;--serif:'Lora',Georgia,serif;--sans:'Instrument Sans',system-ui,-apple-system,sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;background:var(--navy);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.5}
.wrap{max-width:720px;margin:0 auto;padding:26px 16px 120px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:34px}
.brand img{height:20px;width:auto;display:block}
.brand span{font-family:var(--serif);font-size:16px;font-weight:500;letter-spacing:-.005em}
.brand .who{margin-left:auto;font-family:var(--sans);font-size:13px;color:var(--ink2);display:flex;gap:12px;align-items:center}
.brand .who span{font-family:var(--sans);font-size:13.5px;font-weight:500;color:var(--ink)}
h1{font-family:var(--serif);font-weight:500;font-size:32px;letter-spacing:-.01em;line-height:1.15;margin:0}
h1 em{font-style:italic;color:var(--accent)}
.sub{color:var(--ink2);font-size:15px;margin-top:8px;max-width:60ch}
.lede{font-family:var(--serif);font-size:17px;line-height:1.55;color:var(--ink);margin-top:14px;max-width:58ch}
.card{border:1px solid var(--line);border-radius:14px;background:var(--fill);padding:20px;margin-top:24px}
label{display:block;font-size:14px;font-weight:600;color:var(--accent);margin-bottom:6px}
input[type=text],textarea{width:100%;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:10px;color:var(--ink);font:inherit;font-size:16px;padding:11px 12px}
input[type=text]:focus,textarea:focus,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
textarea{resize:vertical;min-height:72px}
.btn{font:inherit;font-size:14px;font-weight:600;color:var(--ink2);background:transparent;border:1px solid rgba(243,241,234,.4);border-radius:999px;padding:9px 18px;cursor:pointer}
.btn.primary{background:var(--gold);border-color:var(--gold);color:#0D1D2C}
.btn.quiet{border:none;padding:4px 0;color:var(--accent);font-weight:500;font-size:13px}
.btn[disabled]{opacity:.5;cursor:default}
.rowend{display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:16px;flex-wrap:wrap}
.err{color:var(--red);font-size:14px;margin-top:10px;min-height:20px}
.names{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:22px}
.name{font:inherit;text-align:left;color:var(--ink);background:var(--fill);border:1px solid var(--line);border-radius:12px;padding:14px 16px;cursor:pointer}
.name:hover{border-color:var(--accent)}
.name b{display:block;font-family:var(--serif);font-weight:500;font-size:18px;letter-spacing:-.005em}
.name small{display:block;font-size:12.5px;color:var(--ink3);margin-top:2px}
.name small.in{color:var(--success)}
.menuhead{margin-top:30px;border-top:1px solid var(--line);padding-top:22px}
.menuhead .t{font-family:var(--serif);font-weight:500;font-size:24px;letter-spacing:-.01em}
.menuhead .n{font-family:var(--serif);font-style:italic;color:var(--ink2);font-size:15px;margin-top:4px}
.sec{margin-top:28px}
.sec h2{font-family:var(--serif);font-weight:500;font-size:21px;color:var(--accent);letter-spacing:-.01em;margin:0}
.sec .secnote{font-family:var(--serif);font-style:italic;color:var(--ink2);font-size:14.5px;margin-top:3px}
.item{display:block;width:100%;font:inherit;text-align:left;color:var(--ink);background:transparent;border:1px solid transparent;border-top-color:var(--line);padding:13px 12px;cursor:pointer}
.sec .item:first-of-type{margin-top:10px}
.item .top{display:flex;gap:14px;align-items:baseline}
.item .nm{font-family:var(--serif);font-weight:500;font-size:17px;flex:1}
.item .pr{font-size:15px;color:var(--ink2);white-space:nowrap}
.item .ds{font-size:14px;color:var(--ink2);margin-top:3px;max-width:60ch}
.item .pick{font-size:12.5px;color:var(--ink3);margin-top:5px}
.item[aria-pressed=true]{border-color:var(--accent);border-radius:12px;background:rgba(138,202,255,.08)}
.item[aria-pressed=true] .pick{color:var(--accent);font-weight:600}
.opts{padding:4px 12px 12px}
.opts .ol{font-size:13px;font-weight:600;color:var(--accent);margin:8px 0 6px}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font:inherit;font-size:13.5px;color:var(--ink2);background:transparent;border:1px solid var(--line);border-radius:999px;padding:6px 12px;cursor:pointer}
.chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#0D1D2C;font-weight:600}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--deep);border-top:1px solid var(--line);padding:12px 16px}
.bar .in{max-width:720px;margin:0 auto;display:flex;gap:12px;align-items:center}
.bar .sum{flex:1;font-size:14px;color:var(--ink2);min-width:0}
.bar .sum b{color:var(--ink);font-weight:600}
.done h2{font-family:var(--serif);font-weight:500;font-size:22px;margin:0 0 4px}
.done ul{margin:12px 0 0;padding:0;list-style:none}
.done li{border-top:1px solid var(--line);padding:9px 0;font-family:var(--serif);font-size:16.5px}
.done li span{font-family:var(--sans);font-size:13.5px;color:var(--ink2)}
.done .nt{color:var(--ink2);font-size:14px;margin-top:10px}
details{margin-top:44px;border-top:1px solid var(--line);padding-top:16px}
summary{cursor:pointer;font-size:14px;font-weight:600;color:var(--accent)}
details ul{margin:12px 0 0;padding-left:18px;color:var(--ink2);font-size:13.5px;max-width:64ch}
details li{margin-bottom:7px}
details li b{color:var(--ink);font-weight:600}
.foot{margin-top:18px;font-size:12.5px;color:var(--ink3)}
[hidden]{display:none!important}
@media (max-width:520px){h1{font-size:27px}.brand.named>span{display:none}}
`

function posture(config, exp) {
  const hours = exp ? Math.max(1, Math.round((exp * 1000 - Date.now()) / 3600000)) : SESSION_HOURS
  return `<details><summary>Security Posture, For A Lunch Order</summary><ul>
<li><b>Access.</b> One shared code, checked on the server with a constant-time compare. The guest list and the menu are not sent until it passes. Five wrong codes in ten minutes locks an address out.</li>
<li><b>Session.</b> A signed token (HMAC-SHA256) in an HttpOnly, Secure, SameSite cookie scoped to this one path. ${exp ? `Yours expires in about ${hours} ${hours === 1 ? 'hour' : 'hours'}.` : `It lasts ${SESSION_HOURS} hours at most.`}</li>
<li><b>Stored.</b> Your name and your order. That is the whole record.</li>
<li><b>Not stored.</b> IP addresses, device details, analytics. A keyed hash of an address is written only when a code is mistyped, to count the tries.</li>
<li><b>Third parties.</b> None. No trackers, no analytics, no external scripts, fonts or images. A nonce-only Content Security Policy enforces it, and you are welcome to check the headers.</li>
<li><b>Retention.</b> Orders are deleted once lunch has been ordered.</li>
<li><b>Proportion.</b> Yes, this is a lot for a sandwich. It is the same chassis we put in front of client work, and it costs nothing to leave on.</li>
</ul></details>`
}

function shell({ config, nonce, title, who, body, script, exp }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="dark"><title>${esc(title)}</title><style nonce="${nonce}">${CSS}</style></head><body><div class="wrap">
<div class="brand${who ? ' named' : ''}"><img src="/lunch-assets/th-arches-white.png" alt=""><span>Third Horizon</span>${who || ''}</div>
${body}
${posture(config, exp)}
<div class="foot">Third Horizon · ${esc(config.title || 'Lunch')}</div>
</div><noscript><div class="wrap"><div class="err">This page needs JavaScript to send your order.</div></div></noscript>
<script nonce="${nonce}">${script || ''}</script></body></html>`
}

const POST_JS = `
const here = location.pathname;
async function send(body){
  const r = await fetch(here,{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'lunch'},credentials:'same-origin',body:JSON.stringify(body)});
  let j={}; try{ j = await r.json() }catch(e){}
  if(!r.ok || !j.ok) throw new Error(j.error || 'That did not go through. Try again.');
  return j;
}
`

function gatePage(config, nonce) {
  const body = `<h1>${esc(config.title || 'Lunch')}</h1>
<div class="sub">${esc([config.place, config.when].filter(Boolean).join(' · '))}</div>
<div class="lede">Yes, there is an access gate on the lunch menu. Enter the code from your invite and pick what you would like.</div>
<form class="card" id="gate" autocomplete="off">
  <label for="code">Access Code</label>
  <input id="code" name="code" type="text" inputmode="text" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" required autofocus>
  <div class="err" id="err" role="alert"></div>
  <div class="rowend"><button class="btn primary" type="submit" id="go">Open The Menu</button></div>
</form>`
  const script = `${POST_JS}
const f=document.getElementById('gate'),err=document.getElementById('err'),go=document.getElementById('go');
f.addEventListener('submit',async(e)=>{e.preventDefault();err.textContent='';go.disabled=true;
  try{ await send({action:'unlock',code:document.getElementById('code').value}); location.reload() }
  catch(x){ err.textContent=x.message; go.disabled=false }});`
  return shell({ config, nonce, title: config.title || 'Lunch', body, script })
}

function whoPage(config, nonce, orders, exp) {
  const ordered = new Set(orders.map(o => o.person_id))
  const roster = config.roster || []
  const body = `<h1>Who Is Ordering?</h1>
<div class="sub">${esc([config.title, config.place, config.when].filter(Boolean).join(' · '))}</div>
${roster.length ? `<div class="names">${roster.map(r => `<button class="name" type="button" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small class="${ordered.has(r.id) ? 'in' : ''}">${ordered.has(r.id) ? 'Order In' : 'Not Yet'}</small></button>`).join('')}</div>` : '<div class="card">The guest list is on its way. Check back in a few minutes.</div>'}
<div class="err" id="err" role="alert"></div>`
  const script = `${POST_JS}
const err=document.getElementById('err');
document.querySelectorAll('.name').forEach(b=>b.addEventListener('click',async()=>{err.textContent='';
  try{ await send({action:'identify',person:b.dataset.id}); location.reload() }catch(x){ err.textContent=x.message }}));`
  return shell({ config, nonce, title: config.title || 'Lunch', body, script, exp })
}

function menuPage(config, nonce, person, order, exp) {
  const menu = config.menu
  const shut = closed(config)
  const who = `<div class="who"><span>${esc(person.name)}</span><button class="btn quiet" type="button" id="switch">Not You?</button></div>`
  const doneCard = `<div class="card done" id="done"${order ? '' : ' hidden'}>
<h2>${shut ? 'Your Order' : `Order In. Thanks, ${esc(person.name.split(' ')[0])}.`}</h2>
<div class="sub" id="doneWhen">${order ? `Saved ${esc(fmtWhen(order.saved_at))}` : ''}</div>
<ul id="doneList">${order ? order.items.map(it => `<li>${esc(it.name)}${Object.keys(it.options || {}).length ? ` <span>(${esc(Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(', '))})</span>` : ''}</li>`).join('') : ''}</ul>
<div class="nt" id="doneNote">${order?.notes ? `Note: ${esc(order.notes)}` : ''}</div>
${shut ? '<div class="nt">Ordering has closed.</div>' : '<div class="rowend"><button class="btn" type="button" id="change">Change My Order</button></div>'}
</div>`
  if (!menu) {
    const body = `<h1>${esc(config.title || 'Lunch')}</h1><div class="sub">${esc([config.place, config.when].filter(Boolean).join(' · '))}</div><div class="card">The menu is on its way. Check back in a few minutes.</div>`
    return shell({ config, nonce, title: config.title || 'Lunch', who, body, exp, script: `${POST_JS}document.getElementById('switch').addEventListener('click',async()=>{try{await send({action:'switch'});location.reload()}catch(e){}});` })
  }
  const sections = (menu.sections || []).map(sec => `<section class="sec"><h2>${esc(sec.title)}</h2>${sec.note ? `<div class="secnote">${esc(sec.note)}</div>` : ''}
${(sec.items || []).map(it => `<button class="item" type="button" aria-pressed="false" data-id="${esc(it.id)}"><div class="top"><div class="nm">${esc(it.name)}</div>${it.price ? `<div class="pr">${esc(it.price)}</div>` : ''}</div>${it.desc ? `<div class="ds">${esc(it.desc)}</div>` : ''}<div class="pick">Tap To Add</div></button>${(it.options || []).length ? `<div class="opts" data-for="${esc(it.id)}" hidden>${it.options.map(o => `<div class="ol">${esc(o.label)}${o.required ? '' : ' (Optional)'}</div><div class="chips" data-label="${esc(o.label)}">${(o.choices || []).map(c => `<button class="chip" type="button" aria-pressed="false" data-choice="${esc(c)}">${esc(c)}</button>`).join('')}</div>`).join('')}</div>` : ''}`).join('')}</section>`).join('')
  const body = `<h1>${esc(config.title || 'Lunch')}</h1>
<div class="sub">${esc([config.place, config.when].filter(Boolean).join(' · '))}${config.closes_at ? ` · Orders close ${esc(fmtWhen(config.closes_at))}` : ''}</div>
${doneCard}
<div id="edit"${order || shut ? ' hidden' : ''}>
<div class="menuhead"><div class="t">${esc(menu.title || 'Menu')}</div>${menu.note ? `<div class="n">${esc(menu.note)}</div>` : ''}</div>
${sections}
<div class="card"><label for="notes">Allergies Or Changes</label><textarea id="notes" maxlength="400" placeholder="Anything the kitchen should know."></textarea></div>
<div class="err" id="err" role="alert"></div>
</div>
<div class="bar" id="bar"${order || shut ? ' hidden' : ''}><div class="in"><div class="sum" id="sum">Nothing picked yet.</div><button class="btn primary" type="button" id="sendOrder" disabled>Send My Order</button></div></div>`
  const state = { order: order ? { items: order.items.map(i => ({ id: i.id, options: i.options || {} })), notes: order.notes || '' } : null, max: Number(config.rules?.max_items) || 0, names: Object.fromEntries(allItems(config).map(i => [i.id, i.name])), required: Object.fromEntries(allItems(config).map(i => [i.id, (i.options || []).filter(o => o.required).map(o => o.label)])) }
  const script = `${POST_JS}
const S=${JSON.stringify(state).replace(/</g, '\\u003c')};
const picked=new Map();
const $=(q,r)=>(r||document).querySelector(q), $$=(q,r)=>Array.from((r||document).querySelectorAll(q));
const err=$('#err'), sum=$('#sum'), sendBtn=$('#sendOrder');
function paint(){
  $$('.item').forEach(b=>{const on=picked.has(b.dataset.id); b.setAttribute('aria-pressed',on?'true':'false'); $('.pick',b).textContent=on?'Added. Tap To Remove':'Tap To Add';
    const o=document.querySelector('.opts[data-for="'+CSS.escape(b.dataset.id)+'"]'); if(o){ o.hidden=!on; $$('.chips',o).forEach(g=>{const cur=(picked.get(b.dataset.id)||{})[g.dataset.label]; $$('.chip',g).forEach(c=>c.setAttribute('aria-pressed',c.dataset.choice===cur?'true':'false'))}) }});
  const n=picked.size; sum.textContent=n? n+(n===1?' item':' items')+' · '+Array.from(picked.keys()).map(id=>S.names[id]).join(', ') : 'Nothing picked yet.';
  sendBtn.disabled=!n;
}
$$('.item').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id; err.textContent='';
  if(picked.has(id)) picked.delete(id); else { if(S.max===1) picked.clear(); else if(S.max && picked.size>=S.max){ err.textContent='One order holds '+S.max+' items at most.'; return } picked.set(id,{}) } paint()}));
$$('.chips').forEach(g=>$$('.chip',g).forEach(c=>c.addEventListener('click',()=>{const id=g.parentElement.dataset.for; const o=picked.get(id); if(!o) return; if(o[g.dataset.label]===c.dataset.choice) delete o[g.dataset.label]; else o[g.dataset.label]=c.dataset.choice; paint()})));
function load(){ picked.clear(); if(S.order){ S.order.items.forEach(i=>picked.set(i.id,Object.assign({},i.options))); $('#notes').value=S.order.notes||'' } paint() }
sendBtn.addEventListener('click',async()=>{err.textContent='';
  for(const [id,o] of picked){ for(const l of (S.required[id]||[])){ if(!o[l]){ err.textContent='Pick '+l+' for '+S.names[id]+'.'; return } } }
  sendBtn.disabled=true;
  try{ await send({action:'order',items:Array.from(picked,([id,options])=>({id,options})),notes:$('#notes').value}); location.reload() }
  catch(x){ err.textContent=x.message; sendBtn.disabled=false }});
const ch=$('#change'); if(ch) ch.addEventListener('click',()=>{ $('#done').hidden=true; $('#edit').hidden=false; $('#bar').hidden=false; load(); window.scrollTo(0,0) });
$('#switch').addEventListener('click',async()=>{try{await send({action:'switch'});location.reload()}catch(e){}});
load();`
  return shell({ config, nonce, title: config.title || 'Lunch', who, body, script, exp })
}

function plainPage(res, status, title, line) {
  const nonce = crypto.randomBytes(16).toString('base64')
  secure(res, nonce)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(status).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style nonce="${nonce}">${CSS}</style></head><body><div class="wrap"><div class="brand"><img src="/lunch-assets/th-arches-white.png" alt=""><span>Third Horizon</span></div><h1>${esc(title)}</h1><div class="sub">${esc(line)}</div></div></body></html>`)
}

// ---- the door ---------------------------------------------------------------------------
export default async function handler(req, res) {
  const slug = String((req.query || {}).slug || '').toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(slug)) return plainPage(res, 404, 'Nothing Here', 'This address does not lead anywhere.')
  const config = await getJson(`lunch/${slug}/config.json`)
  if (!config || !config.active || config.slug !== slug) return plainPage(res, 404, 'Nothing Here', 'This address does not lead anywhere.')
  if (config.expires_at && Date.now() > new Date(config.expires_at).getTime()) return plainPage(res, 410, 'Lunch Is Over', 'This order page has closed and its orders have been cleared.')

  const session = verify(config, readCookie(req, cookieName(slug)))
  const person = session?.p ? (config.roster || []).find(r => r.id === session.p) || null : null

  if (req.method === 'GET' || req.method === 'HEAD') {
    const nonce = crypto.randomBytes(16).toString('base64')
    secure(res, nonce)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    if (!session) return res.status(200).send(gatePage(config, nonce))
    if (!person) return res.status(200).send(whoPage(config, nonce, await readOrders(config), session.x))
    const order = await getJson(`lunch/${slug}/orders/${person.id}.json`)
    return res.status(200).send(menuPage(config, nonce, person, order, session.x))
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, error: 'Method not allowed.' }) }

  // Writes: same-origin only, JSON only, with the header a plain form cannot send.
  const origin = String(req.headers.origin || '')
  if (origin && !ORIGINS.includes(origin)) return json(res, 403, { ok: false, error: 'Wrong origin.' })
  if (String(req.headers['x-requested-with'] || '') !== 'lunch') return json(res, 403, { ok: false, error: 'Missing header.' })
  if (!/^application\/json/i.test(String(req.headers['content-type'] || ''))) return json(res, 415, { ok: false, error: 'JSON only.' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body || typeof body !== 'object' || JSON.stringify(body).length > 8000) return json(res, 400, { ok: false, error: 'Bad request.' })
  const action = String(body.action || '')

  if (action === 'unlock') {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
    const iph = crypto.createHmac('sha256', keyFor(config)).update(`ip:${ip}`).digest('hex').slice(0, 24)
    const tpath = `lunch/${slug}/throttle/${iph}.json`
    const t = (await getJson(tpath)) || { fails: [] }
    const recent = (t.fails || []).filter(ms => Date.now() - ms < THROTTLE_WINDOW_MS)
    if (recent.length >= THROTTLE_MAX) { await logEvent(config, 'gate.throttled'); return json(res, 429, { ok: false, error: 'Too many tries. Give it ten minutes.' }) }
    const code = clean(body.code, 80)
    if (!code || !config.code || !sameText(code.toLowerCase(), String(config.code).toLowerCase())) {
      await put(tpath, JSON.stringify({ fails: [...recent, Date.now()] })).catch(() => {})
      await logEvent(config, 'gate.fail')
      return json(res, 401, { ok: false, error: 'That code did not match. Check your invite and try again.' })
    }
    const m = mint(config, null)
    setCookie(res, slug, m.token, m.maxAge)
    await logEvent(config, 'gate.pass')
    return json(res, 200, { ok: true })
  }

  if (!session) return json(res, 401, { ok: false, error: 'Your session ended. Reload and enter the code again.' })

  if (action === 'identify') {
    const r = (config.roster || []).find(x => x.id === String(body.person || ''))
    if (!r) return json(res, 400, { ok: false, error: 'That name is not on the list.' })
    const m = mint(config, r.id)
    setCookie(res, slug, m.token, m.maxAge)
    await logEvent(config, 'identify', { person_id: r.id, name: r.name })
    return json(res, 200, { ok: true })
  }
  if (action === 'switch') { const m = mint(config, null); setCookie(res, slug, m.token, m.maxAge); return json(res, 200, { ok: true }) }
  if (action === 'leave') { setCookie(res, slug, '', 0); return json(res, 200, { ok: true }) }

  if (!person) return json(res, 400, { ok: false, error: 'Pick your name first.' })
  if (action === 'order' || action === 'clear') {
    if (closed(config)) return json(res, 409, { ok: false, error: 'Ordering has closed.' })
    if (!config.menu) return json(res, 409, { ok: false, error: 'The menu is not up yet.' })
    const path = `lunch/${slug}/orders/${person.id}.json`
    if (action === 'clear') { await remove([path]); await logEvent(config, 'order.cleared', { person_id: person.id, name: person.name }); await rebuildBoard(config); return json(res, 200, { ok: true }) }
    const v = validateOrder(config, body)
    if (v.error) return json(res, 400, { ok: false, error: v.error })
    const prior = await getJson(path)
    await put(path, JSON.stringify({ person_id: person.id, name: person.name, items: v.items, notes: v.notes, saved_at: new Date().toISOString(), version: (prior?.version || 0) + 1 }))
    await logEvent(config, 'order.saved', { person_id: person.id, name: person.name, items: v.items.length })
    await rebuildBoard(config)
    return json(res, 200, { ok: true })
  }
  return json(res, 400, { ok: false, error: 'Unknown action.' })
}
