// Lumen's talk door: hands-free voice turns from the Mac listener and the
// iPhone Siri Shortcut. Same brain, same thread (channel 'voice').
//   POST audio (Content-Type audio/*, raw body)  -> transcribe -> think -> speak
//   POST application/json {text}                 -> think -> speak
// Auth: Authorization: Bearer LUMEN_TALK_TOKEN (or ?key=).
// Response: audio/mpeg by default (Shortcuts plays it straight from
// "Get Contents of URL"), with X-Lumen-Transcript / X-Lumen-Reply headers;
// ?format=json returns {transcript, reply, audio_base64} for the Mac app.

export const config = { maxDuration: 120, api: { bodyParser: false } }

import { think, remember } from './_lumen-brain.mjs'
import { speak, transcribe } from './_wa.mjs'

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
const headerSafe = (s) => String(s || '').replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7E]/g, '?').slice(0, 900)

export default async function handler(req, res) {
  const key = (req.headers.authorization || '').replace(/^Bearer /, '') || (req.query || {}).key
  if (!process.env.LUMEN_TALK_TOKEN || key !== process.env.LUMEN_TALK_TOKEN) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST audio or {text}' })

  const ctype = String(req.headers['content-type'] || '')
  const raw = await readRaw(req)
  let text = '', kind = 'audio'
  try {
    if (ctype.includes('application/json')) {
      kind = 'text'
      text = String((JSON.parse(raw.toString('utf8') || '{}')).text || '').trim()
    } else {
      if (!raw.length) return res.status(400).json({ error: 'empty audio' })
      const mime = ctype.split(';')[0] || 'audio/m4a'
      text = (await transcribe(new Uint8Array(raw), mime)).trim()
    }
  } catch (e) {
    return res.status(200).json({ error: `transcription failed: ${String(e.message || e)}` })
  }
  if (!text) return res.status(200).json({ error: 'nothing heard' })

  await remember({ channel: 'voice', direction: 'in', kind, body: text, meta: { via: (req.query || {}).via || 'talk' } })
  let reply
  try { reply = await think({ channel: 'voice', text, spoken: true }) }
  catch (e) { return res.status(200).json({ transcript: text, error: `brain failed: ${String(e.message || e)}` }) }
  await remember({ channel: 'voice', direction: 'out', kind: 'audio', body: reply, meta: { via: (req.query || {}).via || 'talk' } })

  let mp3 = null
  try { mp3 = await speak(reply) } catch (e) { console.error('talk: tts failed', e.message) }

  if ((req.query || {}).format === 'json' || !mp3) {
    return res.status(200).json({ transcript: text, reply, audio_base64: mp3 ? Buffer.from(mp3).toString('base64') : null })
  }
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('X-Lumen-Transcript', headerSafe(text))
  res.setHeader('X-Lumen-Reply', headerSafe(reply))
  res.setHeader('Content-Length', String(mp3.length))
  return res.status(200).end(Buffer.from(mp3))
}
