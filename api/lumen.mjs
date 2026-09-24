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

export const config = { maxDuration: 300 }

import { think, remember, alreadySeen } from './_lumen-brain.mjs'
import { flushPending } from './pulse.mjs'

import { GRAPH, waHeaders, allowed, waSendText, waSendAudio, waMarkRead, waDownloadMedia, speak, transcribe } from './_wa.mjs'

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
    return res.status(200).json({ waba, name, existing: existing || null, submitted, deleted, all: (list.data || []).map(t => `${t.name} · ${t.status} · ${t.category} · ${t.language}${t.rejected_reason && t.rejected_reason !== 'NONE' ? ' · ' + t.rejected_reason : ''}`) })
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
      if (await alreadySeen('whatsapp', m.id)) continue
      await waMarkRead(m.id)

      let text = ''
      let kind = 'text'
      if (m.type === 'text') text = m.text?.body || ''
      else if (m.type === 'audio') {
        kind = 'audio'
        const { bytes, mime } = await waDownloadMedia(m.audio.id)
        text = await transcribe(bytes, mime)
      } else {
        text = `[${m.type} message]`
      }
      await remember({ channel: 'whatsapp', direction: 'in', kind, body: text, external_id: m.id, meta: { from, type: m.type } })

      // His reply opened the window: deliver anything Lumen knocked about first.
      let flushed = []
      try { flushed = await flushPending(from) } catch (e) { console.error('lumen: flush', e.message) }
      if (flushed.length && /^\s*(ok|okay|yes|yep|sure|go|send|send it|open|k|ready|please|yeah|y)\W*$/i.test(text)) continue

      const reply = await think({ channel: 'whatsapp', text, spoken: kind === 'audio' })

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
