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

export const config = { maxDuration: 120 }

import { think, remember, alreadySeen } from './_lumen-brain.mjs'

const GRAPH = 'https://graph.facebook.com/v21.0'
const waHeaders = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` })

async function waSendText(to, body) {
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST', headers: { ...waHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  })
  if (!res.ok) throw new Error(`wa send text -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).messages?.[0]?.id
}

async function waSendAudio(to, mp3Bytes) {
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', 'audio/mpeg')
  form.append('file', new Blob([mp3Bytes], { type: 'audio/mpeg' }), 'lumen.mp3')
  const up = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/media`, { method: 'POST', headers: waHeaders(), body: form })
  if (!up.ok) throw new Error(`wa media upload -> ${up.status}: ${(await up.text()).slice(0, 200)}`)
  const { id } = await up.json()
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST', headers: { ...waHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'audio', audio: { id } }),
  })
  if (!res.ok) throw new Error(`wa send audio -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).messages?.[0]?.id
}

async function waMarkRead(messageId) {
  await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST', headers: { ...waHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(() => {})
}

// Inbound voice note: resolve the media URL, download, transcribe with Whisper.
async function waDownloadMedia(mediaId) {
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: waHeaders() })
  if (!meta.ok) throw new Error(`wa media meta -> ${meta.status}`)
  const { url, mime_type } = await meta.json()
  const bin = await fetch(url, { headers: waHeaders() })
  if (!bin.ok) throw new Error(`wa media download -> ${bin.status}`)
  return { bytes: new Uint8Array(await bin.arrayBuffer()), mime: mime_type || 'audio/ogg' }
}

async function transcribe(bytes, mime) {
  const form = new FormData()
  form.append('model', 'whisper-1')
  form.append('file', new Blob([bytes], { type: mime }), mime.includes('ogg') ? 'note.ogg' : 'note.m4a')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
  })
  if (!res.ok) throw new Error(`whisper -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).text || ''
}

async function speak(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8 } }),
  })
  if (!res.ok) throw new Error(`elevenlabs -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return new Uint8Array(await res.arrayBuffer())
}

const allowed = () => (process.env.LUMEN_ALLOWED_NUMBERS || '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean)

export default async function handler(req, res) {
  // ---- admin: is the WhatsApp Business Account subscribed to this app? (?admin=waba&key=MCP_TOKEN)
  // Meta registers the webhook on the app, but inbound traffic only flows once
  // the WABA itself is subscribed; the dashboard does not always do that step.
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
