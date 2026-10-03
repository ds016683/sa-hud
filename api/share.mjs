// Private shares: a page on David's own domain, behind an access code, owned
// by a mission. When the mission is done the share is archived and the code
// stops working.
//
//   GET /s/<slug>              -> the gate (asks for the code)
//   GET /s/<slug>?c=<code>     -> the page
//   GET /s/<slug>?c=<code>&f=<file> -> a supporting file (PDF etc.)
//
// Records: project-files/_shares/<slug>.json
//   { slug, title, code, project_id, active, created_at, archived_at, note }
// Pages: project-files/<project_id>/shares/<slug>/index.html (+ files)
// In the page, "{{SHARE}}" is replaced by this share's own URL with the code,
// so supporting files link as {{SHARE}}&f=name.pdf.
const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const obj = (path) => fetch(`${URL_BASE}/storage/v1/object/project-files/${path.split('/').map(encodeURIComponent).join('/')}?cb=${Date.now()}`, { headers: { ...hdr(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The gate and the notices wear the HUD's canon: navy ground, serif title,
// mono eyebrow, gold accent.
function shell(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Instrument+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  :root { --navy: #0F2A40; --deep: #0A1B2B; --ink: #EAF1F8; --ink2: rgba(234,241,248,0.7); --gray: rgba(234,241,248,0.45); --line: rgba(255,255,255,0.12); --gold: #F8C761; --blue: #A9C9E8 }
  * { box-sizing: border-box } body { margin: 0; min-height: 100vh; background: linear-gradient(180deg, var(--navy), var(--deep)); color: var(--ink); font-family: 'Instrument Sans', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; padding: 24px }
  .card { width: min(440px, 100%); border: 1px solid var(--line); border-radius: 16px; padding: 32px 30px; background: rgba(255,255,255,0.03) }
  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; color: var(--gray) }
  h1 { font-family: 'Lora', Georgia, serif; font-weight: 500; font-size: 26px; letter-spacing: -0.01em; line-height: 1.2; margin: 10px 0 8px }
  p { margin: 0; color: var(--ink2); font-size: 14px; line-height: 1.55 }
  form { display: flex; gap: 8px; margin-top: 22px } input { flex: 1; min-width: 0; font-family: 'JetBrains Mono', monospace; font-size: 16px; letter-spacing: 2px; text-transform: uppercase; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,0.05); color: var(--ink) }
  input:focus { outline: 2px solid var(--gold); outline-offset: 1px } button { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; padding: 12px 18px; border-radius: 10px; border: 1px solid var(--gold); background: var(--gold); color: var(--deep); cursor: pointer }
  .err { color: #E8836F; font-size: 13px; margin-top: 12px } .foot { margin-top: 26px; font-size: 11px; color: var(--gray) }
</style></head><body><div class="card">${body}</div></body></html>`
}

export default async function handler(req, res) {
  const q = req.query || {}
  const slug = String(q.s || '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!slug) return res.status(404).send(shell('Not found', `<div class="eyebrow">Sovereign Architect</div><h1>No page here.</h1><p>The link is incomplete.</p>`))
  const rec = await obj(`_shares/${slug}.json`).then(r => r.ok ? r.json() : null).catch(() => null)
  if (!rec) return res.status(404).send(shell('Not found', `<div class="eyebrow">Sovereign Architect</div><h1>No page here.</h1><p>This link does not match a shared page.</p>`))
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (!rec.active) return res.status(410).send(shell(rec.title || 'Archived', `<div class="eyebrow">Sovereign Architect · archived</div><h1>${esc(rec.title || 'This page')}</h1><p>This page was shared for a matter that has since closed. Its access code has been retired.${rec.archived_at ? ` Archived ${esc(String(rec.archived_at).slice(0, 10))}.` : ''}</p>`))
  const code = String(q.c || '').trim().toUpperCase()
  if (!code || code !== String(rec.code || '').toUpperCase()) {
    return res.status(code ? 403 : 200).send(shell(rec.title || 'Private page', `<div class="eyebrow">Sovereign Architect · private page</div><h1>${esc(rec.title || 'Private page')}</h1><p>${esc(rec.note || 'Shared by David Smith. Enter the access code you were given.')}</p><form method="get"><input type="hidden" name="s" value="${esc(slug)}"><input name="c" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ACCESS CODE" aria-label="Access code" autofocus><button type="submit">Open</button></form>${code ? '<div class="err">That code did not match.</div>' : ''}<div class="foot">Prepared with the Sovereign Architect HUD · Third Horizon</div>`))
  }
  const base = `${rec.project_id}/shares/${slug}`
  const self = `/s/${slug}?c=${encodeURIComponent(code)}`
  if (q.f) {
    const name = String(q.f).replace(/[^A-Za-z0-9._ -]/g, '')
    const r = await obj(`${base}/${name}`)
    if (!r.ok) return res.status(404).send('no such file')
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${name}"`)
    return res.status(200).send(Buffer.from(await r.arrayBuffer()))
  }
  const page = await obj(`${base}/index.html`)
  if (!page.ok) return res.status(404).send(shell(rec.title || 'Not found', `<div class="eyebrow">Sovereign Architect</div><h1>Page missing.</h1><p>The share exists but its page has not been uploaded.</p>`))
  const html = (await page.text()).split('{{SHARE}}').join(self)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}
