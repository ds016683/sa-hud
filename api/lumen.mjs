// Lumen v3: the Friend's door for WhatsApp (Meta Cloud API).
//   GET  /api/lumen  -> webhook verification handshake (hub.challenge)
//   POST /api/lumen  -> inbound messages (text or voice note) -> the brain -> reply
// One brain, one thread: every message lands in lumen_messages regardless of
// channel, and the brain (api/_lumen-brain.mjs) answers with the Ledger tools.
// Voice: inbound audio is transcribed with Whisper; when David speaks, Lumen
// speaks back (ElevenLabs), in addition to the text.
// Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, LUMEN_VERIFY_TOKEN, LUMEN_ALLOWED_NUMBERS
//      (comma-separated E.164 digits), OPENAI_API_KEY, ELEVENLABS_API_KEY,
//      ELEVENLABS_VOICE_ID, ANTHROPIC_API_KEY, SUPABASE_SERVICE_KEY.

export const config = { maxDuration: 800 }

import { think, remember, alreadySeen, claimInbound, fillInbound } from './_lumen-brain.mjs'
import { flushPending } from './pulse.mjs'
import { sbWrite, sb as sbRead, putFile, granolaTranscript, chiToday as chiTodayStr } from './_ledger.mjs'
import { extractText, clip } from './_docs.mjs'

// Look at a photo. An InBody results screen yields its four numbers. A
// document (a worksheet, an offer, a receipt, a form, a screen of figures)
// yields a full transcription so the brain can reason over the numbers.
// Anything else gets a sentence.
export async function readImage(bytes, mime, caption) {
  const b64 = Buffer.from(bytes).toString('base64')
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.LUMEN_MODEL || 'claude-sonnet-5', max_tokens: 3000, messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mime || 'image/jpeg', data: b64 } },
      { type: 'text', text: `Classify this photo and reply with ONLY JSON, no prose.
1. InBody body-composition screen: {"kind":"inbody","scan":{"weight_lbs":number,"smm_lbs":number,"pbf_pct":number,"ecw_tbw":number}} (null for an unreadable field).
2. A document: a worksheet, quote, offer, invoice, receipt, statement, form, contract page, spreadsheet, or any screen of figures: {"kind":"document","title":"what the document is, in a few words","text":"a faithful transcription of everything legible, in reading order, every label with its number, one line per row; keep currency and signs exactly","key_numbers":[{"label":"...","value":"..."}]}. Transcribe completely; do not summarize.
3. Anything else: {"kind":"photo","text":"one plain sentence describing what the photo shows"}.${caption ? ` Caption from David: ${caption}` : ''}` },
    ] }] }),
  })
  const j = await r.json().catch(() => ({}))
  const raw = ((j.content || []).find(c => c.type === 'text') || {}).text || ''
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '').trim())
    if (parsed.kind === 'inbody' && parsed.scan && parsed.scan.weight_lbs) return { scan: parsed.scan, text: '[InBody scan photo]' }
    if (parsed.kind === 'document' && parsed.text) return { scan: null, document: parsed, text: `[document photo: ${parsed.title || 'document'}]${caption ? ' ' + caption : ''}` }
    return { scan: null, text: `[photo: ${parsed.text || 'an image'}]${caption ? ' ' + caption : ''}` }
  } catch { return { scan: null, text: `[photo]${caption ? ' ' + caption : ''}` } }
}

import { GRAPH, waHeaders, allowed, waSendText, waSendTemplate, waSendAudio, waMarkRead, waDownloadMedia, speak, transcribe, davidNumber } from './_wa.mjs'

export default async function handler(req, res) {
  // ---- admin: is the WhatsApp Business Account subscribed to this app? (?admin=waba&key=MCP_TOKEN)
  // Meta registers the webhook on the app, but inbound traffic only flows once
  // the WABA itself is subscribed; the dashboard does not always do that step.
  // ?admin=template&key=MCP_TOKEN[&submit=1][&name=..&body=..&example=..][&delete=1]: list the WABA's
  // message templates, submit one for review, or delete one. Defaults to Lumen's knock
  // template (lumen_knock, UTILITY, category locked so Meta rejects rather than reclassifies).
  if (req.method === 'GET' && (req.query || {}).admin === 'template') {
    const q = req.query || {}
    if (q.key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const waba = q.waba || process.env.WHATSAPP_WABA_ID
    if (!waba) return res.status(400).json({ error: 'waba id required' })
    const name = q.name || 'lumen_knock'
    const body = q.body || 'Your {{1}} from Lumen is ready. Reply to this message and I will send it over.'
    const example = q.example || 'morning read for Tuesday, September 23'
    const list = await fetch(`${GRAPH}/${waba}/message_templates?fields=name,status,category,language,components,rejected_reason&limit=50`, { headers: waHeaders() }).then(r => r.json()).catch(e => ({ error: String(e) }))
    const existing = (list.data || []).find(t => t.name === name)
    let submitted = null, deleted = null
    if (q.delete === '1' && existing) {
      deleted = await fetch(`${GRAPH}/${waba}/message_templates?name=${encodeURIComponent(name)}`, { method: 'DELETE', headers: waHeaders() }).then(r => r.json()).catch(e => ({ error: String(e) }))
    }
    if (q.submit === '1' && !existing) {
      submitted = await fetch(`${GRAPH}/${waba}/message_templates`, {
        method: 'POST', headers: { ...waHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, language: 'en_US', category: 'UTILITY', allow_category_change: q.lock === '0',
          components: [{ type: 'BODY', text: body, example: { body_text: [[example]] } }],
        }),
      }).then(r => r.json()).catch(e => ({ error: String(e) }))
    }
    // &knock=1: send the knock itself to David as a live test (label = "test knock")
    let knock = null
    if (q.knock === '1') {
      try { knock = { sent: await waSendTemplate(davidNumber(), q.label || 'test knock, reply anything to check the door') } } catch (e) { knock = { error: String(e.message || e) } }
    }
    return res.status(200).json({ waba, name, existing: existing || null, submitted, deleted, knock, all: (list.data || []).map(t => `${t.name} · ${t.status} · ${t.category} · ${t.language}${t.rejected_reason && t.rejected_reason !== 'NONE' ? ' · ' + t.rejected_reason : ''}`) })
  }

  // ?admin=mailbox&key=MCP_TOKEN[&user=lumen@thirdhorizon.com][&sendtest=1]: can the Graph app
  // read that mailbox (and send from it)? Probing Lumen's own address.
  // ?admin=readimage&path=inbox/<day>/<file>  (Bearer CRON_SECRET): re-read a filed photo, save its transcription, return it.
  if (req.method === 'GET' && (req.query || {}).admin === 'readimage') {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
    const path = String(req.query.path || '').replace(/^\/+/, '')
    const f = await fetch(`https://cmuvomnmaoseccxpeuxq.supabase.co/storage/v1/object/files/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } })
    if (!f.ok) return res.status(200).json({ ok: false, error: `no such file: ${path}` })
    const bytes = new Uint8Array(await f.arrayBuffer())
    const seen = await readImage(bytes, f.headers.get('content-type') || 'image/jpeg', '')
    let txtPath = null
    if (seen.document) {
      txtPath = path.replace(/\.[a-z0-9]+$/i, '') + '.txt'
      const body = `${seen.document.title || 'Document'}\n\n${seen.document.text}${(seen.document.key_numbers || []).length ? `\n\nKey numbers:\n${seen.document.key_numbers.map(k => `${k.label}: ${k.value}`).join('\n')}` : ''}`
      await putFile(txtPath, new TextEncoder().encode(body), 'text/plain').catch(() => {})
    }
    return res.status(200).json({ ok: true, kind: seen.scan ? 'inbody' : seen.document ? 'document' : 'photo', title: seen.document?.title || null, transcription: txtPath, text: seen.document ? seen.document.text : seen.text, key_numbers: seen.document?.key_numbers || null })
  }
  // ?admin=think&text=...  (Bearer CRON_SECRET): run one brain turn and return reply + trace, nothing sent.
  if (req.method === 'GET' && (req.query || {}).admin === 'think') {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
    let reply
    try { reply = await think({ channel: 'pulse', text: String(req.query.text || '') }) } catch (e) { return res.status(200).json({ error: String(e && e.stack || e).slice(0, 1200) }) }
    const rows = await sbRead(`lumen_messages?select=body&channel=eq.pulse&kind=eq.system&order=id.desc&limit=1`).catch(() => [])
    return res.status(200).json({ reply, trace: rows[0] ? JSON.parse(rows[0].body) : null })
  }
  // ?admin=transcript&id=<granola note id>  (Bearer CRON_SECRET): can we get a transcript?
  if (req.method === 'GET' && (req.query || {}).admin === 'transcript') {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
    if (req.query.raw) {
      const gh = { Authorization: `Bearer ${process.env.GRANOLA_API_KEY}`, Accept: 'application/json' }
      const r = await fetch(`https://public-api.granola.ai/v1/notes/${String(req.query.id || '')}/transcript${req.query.qs ? `?${req.query.qs}` : ''}`, { headers: gh })
      const d = await r.json().catch(() => null)
      const arr = Array.isArray(d) ? d : (d?.transcript || d?.utterances || d?.segments || d?.turns || null)
      return res.status(200).json({ status: r.status, keys: d && !Array.isArray(d) ? Object.keys(d) : 'array', count: Array.isArray(arr) ? arr.length : null, first: Array.isArray(arr) ? arr[0] : null, last: Array.isArray(arr) ? arr[arr.length - 1] : null, meta: d && !Array.isArray(d) ? Object.fromEntries(Object.entries(d).filter(([k]) => !['transcript', 'utterances', 'segments', 'turns'].includes(k))) : null })
    }
    const t = await granolaTranscript(String(req.query.id || ''))
    return res.status(200).json(t.ok ? { ok: true, chars: t.text.length, head: t.text.slice(0, 600) } : t)
  }
  if (req.method === 'GET' && (req.query || {}).admin === 'mailbox') {
    const q = req.query || {}
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (q.key !== process.env.MCP_TOKEN && !(process.env.CRON_SECRET && bearer === process.env.CRON_SECRET)) return res.status(401).json({ error: 'unauthorized' })
    const user = q.user || 'lumen@thirdhorizon.com'
    const mail = await import('./_mail.mjs')
    let token = null
    try { token = await mail.__token() } catch (e) { return res.status(200).json({ ok: false, error: `graph token: ${e.message}` }) }
    const H = { Authorization: `Bearer ${token}` }
    const who = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}?$select=id,displayName,mail,userPrincipalName,accountEnabled`, { headers: H })
    const whoBody = await who.json().catch(() => null)
    const inbox = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}/mailFolders/inbox/messages?$top=3&$select=subject,from,receivedDateTime,isRead&$orderby=receivedDateTime desc`, { headers: H })
    const inboxBody = await inbox.json().catch(() => null)
    // What the pulse's mail sweep would actually see (readUnread) and who may write to Lumen.
    let unread = null
    try { unread = (await mail.readUnread(25)).map(m => ({ subject: m.subject, from: m.from?.emailAddress?.address, sender: m.sender?.emailAddress?.address, at: m.receivedDateTime, id: String(m.id).slice(-12) })) } catch (e) { unread = { error: String(e.message || e).slice(0, 200) } }
    let send = null
    if (q.sendtest === '1') {
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}/sendMail`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { subject: 'Lumen mail door test', body: { contentType: 'Text', content: 'This is Lumen. If you are reading this, the mail door is open.' }, toRecipients: [{ emailAddress: { address: q.to || 'david.smith@thirdhorizon.com' } }] }, saveToSentItems: true }) })
      send = { status: r.status, body: r.status === 202 ? 'accepted' : (await r.text()).slice(0, 300) }
    }
    return res.status(200).json({ ok: who.ok, allowed: mail.mailAllowed(), unread, user: { status: who.status, ...(whoBody || {}) }, inbox: { status: inbox.status, messages: (inboxBody?.value || []).map(m => ({ subject: m.subject, from: m.from?.emailAddress?.address, at: m.receivedDateTime, read: m.isRead })), error: inboxBody?.error?.message }, send })
  }

  if (req.method === 'GET' && (req.query || {}).admin === 'waba') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const waba = (req.query || {}).waba || process.env.WHATSAPP_WABA_ID
    if (!waba) return res.status(400).json({ error: 'waba id required' })
    const list = await fetch(`${GRAPH}/${waba}/subscribed_apps`, { headers: waHeaders() }).then(r => r.json()).catch(e => ({ error: String(e) }))
    let subscribed = null
    if ((req.query || {}).subscribe === '1') {
      subscribed = await fetch(`${GRAPH}/${waba}/subscribed_apps`, { method: 'POST', headers: waHeaders() }).then(r => r.json()).catch(e => ({ error: String(e) }))
    }
    const after = subscribed ? await fetch(`${GRAPH}/${waba}/subscribed_apps`, { headers: waHeaders() }).then(r => r.json()).catch(() => null) : null
    return res.status(200).json({ waba, before: list, subscribe_result: subscribed, after })
  }

  // ---- admin: read-only Graph inspection (?admin=graph&path=<node>&fields=...&key=MCP_TOKEN)
  if (req.method === 'GET' && (req.query || {}).admin === 'graph') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const path = String((req.query || {}).path || '').replace(/[^A-Za-z0-9_\/.-]/g, '')
    const fields = String((req.query || {}).fields || '').replace(/[^A-Za-z0-9_,{}]/g, '')
    const out = await fetch(`${GRAPH}/${path}${fields ? `?fields=${fields}` : ''}`, { headers: waHeaders() }).then(r => r.json()).catch(e => ({ error: String(e) }))
    return res.status(200).json(out)
  }

  // ---- admin: send a test text and surface Meta's full error (?admin=send&to=&text=&key=)
  if (req.method === 'GET' && (req.query || {}).admin === 'send') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const to = String((req.query || {}).to || '').replace(/\D/g, '')
    if (!allowed().includes(to)) return res.status(400).json({ error: 'recipient not allowlisted' })
    const r = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST', headers: { ...waHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: String((req.query || {}).text || 'Lumen test') } }),
    })
    return res.status(200).json({ status: r.status, body: await r.json().catch(() => null) })
  }

  // ---- admin: what can the configured token do? (?admin=tokeninfo&key=)
  if (req.method === 'GET' && (req.query || {}).admin === 'tokeninfo') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const out = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(process.env.WHATSAPP_TOKEN || '')}`, { headers: waHeaders() }).then(r => r.json()).catch(e => ({ error: String(e) }))
    const d = out?.data || out
    return res.status(200).json({ type: d?.type, app_id: d?.app_id, application: d?.application, expires_at: d?.expires_at, scopes: d?.scopes, granular_scopes: d?.granular_scopes, user_id: d?.user_id, error: out?.error })
  }

  // ---- admin: voice probe. Speaks a line with ElevenLabs and sends it as a voice note (?admin=voice&to=&text=&key=)
  if (req.method === 'GET' && (req.query || {}).admin === 'voice') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const to = String((req.query || {}).to || '').replace(/\D/g, '')
    if (!allowed().includes(to)) return res.status(400).json({ error: 'recipient not allowlisted' })
    try {
      const mp3 = await speak(String((req.query || {}).text || 'This is Lumen. The voice line is open.'))
      const id = await waSendAudio(to, mp3)
      return res.status(200).json({ ok: true, bytes: mp3.length, message_id: id, voice: process.env.ELEVENLABS_VOICE_ID ? 'set' : 'missing', whisper_key: process.env.OPENAI_API_KEY ? 'set' : 'missing' })
    } catch (e) { return res.status(200).json({ ok: false, error: String(e.message || e) }) }
  }

  // ---- admin: list ElevenLabs voices on the account (?admin=voices&key=)
  if (req.method === 'GET' && (req.query || {}).admin === 'voices') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const r = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } })
    const j = await r.json().catch(() => null)
    const voices = (j?.voices || []).map(v => ({ id: v.voice_id, name: v.name, category: v.category, labels: v.labels }))
    return res.status(200).json({ status: r.status, count: voices.length, voices })
  }

  // ---- admin: Voice Design. Generates candidate voices from a description and sends each
  // as a voice note (?admin=design&to=&desc=&sample=&key=); save one with ?admin=savevoice&gid=&name=
  if (req.method === 'GET' && (req.query || {}).admin === 'design') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const to = String((req.query || {}).to || '').replace(/\D/g, '')
    if (!allowed().includes(to)) return res.status(400).json({ error: 'recipient not allowlisted' })
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-voice/design?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_description: String((req.query || {}).desc || ''), text: String((req.query || {}).sample || ''), model_id: 'eleven_ttv_v3' }),
    })
    const j = await r.json().catch(() => null)
    if (!r.ok) return res.status(200).json({ ok: false, status: r.status, error: j })
    const out = []
    for (const [i, pv] of (j.previews || []).entries()) {
      try {
        const bytes = Uint8Array.from(Buffer.from(pv.audio_base_64, 'base64'))
        await waSendText(to, `Candidate ${i + 1} of ${j.previews.length}`)
        const id = await waSendAudio(to, bytes)
        out.push({ candidate: i + 1, generated_voice_id: pv.generated_voice_id, sent: id })
      } catch (e) { out.push({ candidate: i + 1, generated_voice_id: pv.generated_voice_id, error: String(e.message || e) }) }
    }
    return res.status(200).json({ ok: true, candidates: out })
  }
  if (req.method === 'GET' && (req.query || {}).admin === 'savevoice') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-voice', {
      method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_name: String((req.query || {}).name || 'Lumen 3'), voice_description: String((req.query || {}).desc || 'Lumen'), generated_voice_id: String((req.query || {}).gid || '') }),
    })
    return res.status(200).json({ status: r.status, body: await r.json().catch(() => null) })
  }

  // ---- admin: plain text-to-speech passthrough (?admin=say&text=&key=) for the Mac listener's cached acks
  if (req.method === 'GET' && (req.query || {}).admin === 'say') {
    if ((req.query || {}).key !== process.env.MCP_TOKEN) return res.status(401).json({ error: 'unauthorized' })
    try {
      const mp3 = await speak(String((req.query || {}).text || 'Yeah?'))
      res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Content-Length', String(mp3.length))
      return res.status(200).end(Buffer.from(mp3))
    } catch (e) { return res.status(200).json({ ok: false, error: String(e.message || e) }) }
  }

  // ---- verification handshake
  if (req.method === 'GET') {
    const q = req.query || {}
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === process.env.LUMEN_VERIFY_TOKEN) {
      return res.status(200).send(q['hub.challenge'])
    }
    return res.status(403).json({ error: 'verification failed' })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

  // Meta posts statuses (delivered/read) on the same hook; only messages matter.
  const changes = (body?.entry || []).flatMap(e => e.changes || []).map(c => c.value).filter(Boolean)
  const inbound = changes.flatMap(v => (v.messages || []).map(m => ({ m, contact: (v.contacts || [])[0] })))
  if (!inbound.length) return res.status(200).json({ ok: true, ignored: 'no messages' })

  for (const { m } of inbound) {
    try {
      const from = String(m.from || '').replace(/\D/g, '')
      if (!allowed().includes(from)) { console.warn('lumen: ignoring unknown sender', from); continue }
      if (!(await claimInbound('whatsapp', m.id, { from, type: m.type }))) continue
      await waMarkRead(m.id)

      let text = ''
      let kind = 'text'
      if (m.type === 'text') text = m.text?.body || ''
      else if (m.type === 'audio') {
        kind = 'audio'
        const { bytes, mime } = await waDownloadMedia(m.audio.id)
        text = await transcribe(bytes, mime)
      } else if (m.type === 'image') {
        kind = 'image'
        const { bytes, mime } = await waDownloadMedia(m.image.id)
        const seen = await readImage(bytes, mime, m.image.caption || '')
        text = seen.text
        if (seen.scan) {
          const day = chiTodayStr()
          try {
            await sbWrite('POST', 'body_scans?on_conflict=day,source', { day, ...seen.scan, source: 'whatsapp', image_ref: m.image.id, note: m.image.caption || null }, 'resolution=merge-duplicates,return=minimal')
            text = `[InBody scan photo, logged for ${day}: weight ${seen.scan.weight_lbs} lbs, skeletal muscle ${seen.scan.smm_lbs} lbs, body fat ${seen.scan.pbf_pct}%, ECW/TBW ${seen.scan.ecw_tbw}]${m.image.caption ? ' ' + m.image.caption : ''}`
          } catch (e) { text = `[InBody scan photo read but not saved: ${String(e.message || e).slice(0, 120)}] ${seen.text}` }
        } else {
          // Any other photo (a receipt, a document, a moment) is filed in the
          // files bucket under inbox/<day>/ so it can be attached to whatever
          // David is closing out.
          try {
            const ext = (mime || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg').split(';')[0]
            const path = `inbox/${chiTodayStr()}/${new Date().toISOString().slice(11, 19).replace(/:/g, '')}-${m.image.id.slice(-6)}.${ext}`
            await putFile(path, bytes, mime)
            if (seen.document) {
              const txtPath = path.replace(/\.[a-z0-9]+$/i, '') + '.txt'
              const body = `${seen.document.title || 'Document'}\n\n${seen.document.text}${(seen.document.key_numbers || []).length ? `\n\nKey numbers:\n${seen.document.key_numbers.map(k => `${k.label}: ${k.value}`).join('\n')}` : ''}`
              await putFile(txtPath, new TextEncoder().encode(body), 'text/plain').catch(() => {})
              text = `[document photo filed at files/${path}; transcription at files/${txtPath}] ${seen.document.title || 'Document'}:\n${String(seen.document.text).slice(0, 6000)}${m.image.caption ? `\n\nCaption from David: ${m.image.caption}` : ''}`
            } else {
              text = `[photo filed at files/${path}] ${seen.text}`
            }
          } catch (e) { text = `[photo not filed: ${String(e.message || e).slice(0, 100)}] ${seen.text}` }
        }
      } else if (m.type === 'document') {
        // A PDF, a Word file, a spreadsheet sent on WhatsApp: filed under
        // inbox/<day>/ and read in full (text extracted) so Lumen can work it.
        kind = 'document'
        try {
          const { bytes, mime } = await waDownloadMedia(m.document.id)
          const name = String(m.document.filename || `document-${m.document.id.slice(-6)}`).replace(/[^A-Za-z0-9._ -]/g, '_')
          const path = `inbox/${chiTodayStr()}/${new Date().toISOString().slice(11, 19).replace(/:/g, '')}-${name}`
          await putFile(path, bytes, mime || m.document.mime_type || 'application/octet-stream')
          let body = ''
          try { body = clip(await extractText(bytes, name, mime || m.document.mime_type || ''), 20000) } catch (e) { body = `(could not extract text: ${String(e.message || e).slice(0, 120)})` }
          text = `[document "${name}" filed at files/${path}${m.document.caption ? `; David's caption: ${m.document.caption}` : ''}]\n${body}`
        } catch (e) { text = `[document message could not be fetched: ${String(e.message || e).slice(0, 140)}]` }
      } else {
        text = `[${m.type} message]`
      }
      // lumen_messages.kind has a check constraint that does not include 'image';
      // the message type lives in meta.type, so photos are stored as text rows.
      await fillInbound('whatsapp', m.id, { kind: (kind === 'image' || kind === 'document') ? 'text' : kind, body: text, meta: { from, type: m.type } })

      // His reply opened the window: deliver anything Lumen knocked about first.
      let flushed = []
      try { flushed = await flushPending(from) } catch (e) { console.error('lumen: flush', e.message) }
      if (flushed.length && /^\s*(ok|okay|yes|yep|sure|go|send|send it|open|k|ready|please|yeah|y)\W*$/i.test(text)) continue

      let reply
      try { reply = await think({ channel: 'whatsapp', text, spoken: kind === 'audio' }) }
      catch (e) { console.error('lumen: think failed', e && e.stack || e); reply = `I hit an error on my side and could not finish that: ${String(e && e.message || e).slice(0, 160)}. Claude has the trace; say it again in a minute.` }

      const sentId = await waSendText(from, reply)
      await remember({ channel: 'whatsapp', direction: 'out', kind: 'text', body: reply, external_id: sentId, meta: { to: from } })
      if (kind === 'audio' && process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
        try {
          const mp3 = await speak(reply)
          const audioId = await waSendAudio(from, mp3)
          await remember({ channel: 'whatsapp', direction: 'out', kind: 'audio', body: reply, external_id: audioId, meta: { to: from, tts: 'elevenlabs' } })
        } catch (e) { console.error('lumen: voice reply failed', e) }
      }
    } catch (e) {
      console.error('lumen: message failed', e)
    }
  }
  return res.status(200).json({ ok: true })
}
