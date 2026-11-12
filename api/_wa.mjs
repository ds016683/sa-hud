// WhatsApp Cloud API helpers shared by the door (lumen.mjs) and the pulse.
// Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, LUMEN_ALLOWED_NUMBERS,
//      LUMEN_TEMPLATE_NAME (optional; approved template with one body param).

export const GRAPH = 'https://graph.facebook.com/v21.0'
export const waHeaders = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` })
export const allowed = () => (process.env.LUMEN_ALLOWED_NUMBERS || '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean)
export const davidNumber = () => allowed()[0]

async function post(body) {
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST', headers: { ...waHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`wa ${body.type || body.status} -> ${res.status}: ${txt.slice(0, 220)}`)
  try { return JSON.parse(txt).messages?.[0]?.id } catch { return null }
}

export const waSendText = (to, text) => post({ to, type: 'text', text: { body: text } })

// Business-initiated messages outside the 24-hour window must use an approved
// template. Lumen's is a knock: "Your {{1}} from Lumen is ready. Reply to this
// message and I will send it over." The parameter is a short label (e.g.
// "morning read for Tuesday, September 23"); the real text waits as a pending
// pulse and goes out the moment David replies (the reply opens the window).
export async function waSendTemplate(to, label) {
  const name = process.env.LUMEN_TEMPLATE_NAME || 'lumen_knock'
  const lang = { code: process.env.LUMEN_TEMPLATE_LANG || 'en_US' }
  try {
    return await post({
      to, type: 'template',
      template: { name, language: lang, components: [{ type: 'body', parameters: [{ type: 'text', text: String(label).slice(0, 200) }] }] },
    })
  } catch (e) {
    // Until Meta approves lumen_knock, fall back to the sandbox's pre-approved
    // hello_world (no parameters). Cheesy, but it opens the window when David
    // replies, and the parked text follows.
    if (name === 'hello_world') throw e
    console.warn('wa template fallback -> hello_world:', String(e.message || e).slice(0, 160))
    return post({ to, type: 'template', template: { name: 'hello_world', language: { code: 'en_US' } } })
  }
}

export async function waSendAudio(to, mp3Bytes) {
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', 'audio/mpeg')
  form.append('file', new Blob([mp3Bytes], { type: 'audio/mpeg' }), 'lumen.mp3')
  const up = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/media`, { method: 'POST', headers: waHeaders(), body: form })
  if (!up.ok) throw new Error(`wa media upload -> ${up.status}: ${(await up.text()).slice(0, 200)}`)
  const { id } = await up.json()
  return post({ to, type: 'audio', audio: { id } })
}

// Send a file (pdf, docx, xlsx, pptx, images as documents) into the chat.
export async function waSendDocument(to, bytes, { filename = 'file', mime = 'application/octet-stream', caption = '' } = {}) {
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', mime)
  form.append('file', new Blob([bytes], { type: mime }), filename)
  const up = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/media`, { method: 'POST', headers: waHeaders(), body: form })
  if (!up.ok) throw new Error(`wa media upload -> ${up.status}: ${(await up.text()).slice(0, 200)}`)
  const { id } = await up.json()
  return post({ to, type: 'document', document: { id, filename, ...(caption ? { caption: caption.slice(0, 1000) } : {}) } })
}

export function waMarkRead(messageId) {
  return post({ status: 'read', message_id: messageId }).catch(() => null)
}

export async function waDownloadMedia(mediaId) {
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: waHeaders() })
  if (!meta.ok) throw new Error(`wa media meta -> ${meta.status}`)
  const { url, mime_type } = await meta.json()
  const bin = await fetch(url, { headers: waHeaders() })
  if (!bin.ok) throw new Error(`wa media download -> ${bin.status}`)
  return { bytes: new Uint8Array(await bin.arrayBuffer()), mime: mime_type || 'audio/ogg' }
}

// Lumen's voice is a record in the Ledger, not a deploy setting (David 11/12: "this should be lumen's permanent
// voice"). project-files/lumen/voice.json holds one entry per persona: the ElevenLabs voice id, the model and the
// delivery settings. It is read when he speaks (kept a minute), so changing the record changes the voice with no
// deploy. If the record cannot be read, the old ELEVENLABS_VOICE_ID setting still speaks.
const VOICE_REC = 'https://cmuvomnmaoseccxpeuxq.supabase.co/storage/v1/object/project-files/lumen/voice.json'
let voiceCache = { at: 0, rec: null }
export async function voiceOf(persona = 'lumen') {
  if (Date.now() - voiceCache.at > 60000) {
    try {
      const key = process.env.SUPABASE_SERVICE_KEY
      const r = await fetch(`${VOICE_REC}?cb=${Date.now()}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
      voiceCache = { at: Date.now(), rec: r.ok ? await r.json() : voiceCache.rec }
    } catch { voiceCache = { at: Date.now(), rec: voiceCache.rec } }
  }
  const p = voiceCache.rec?.personas?.[persona]
  const n = (v, d) => (v === undefined || v === null || Number.isNaN(Number(v))) ? d : Number(v)
  if (p?.voice_id) {
    const st = p.settings || {}
    return { from: 'record', voice_id: p.voice_id, model: p.model || null, live_model: p.live_model || null, settings: { stability: n(st.stability, 0.5), similarity_boost: n(st.similarity, 0.8), style: n(st.style, 0.15), speed: n(st.speed, 1.0) } }
  }
  return { from: 'env', voice_id: process.env.ELEVENLABS_VOICE_ID, model: null, live_model: null, settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, speed: Number(process.env.LUMEN_VOICE_SPEED || 1.0) } }
}

// speak(text, { format, model, persona }): ElevenLabs, in the voice on record. Default mp3 for
// WhatsApp/Siri; the live desk session asks for raw pcm_24000 and a low-latency model.
export async function speak(text, { format = 'mp3_44100_128', model, persona = 'lumen' } = {}) {
  const v = await voiceOf(persona)
  if (!v.voice_id) throw new Error('no voice on record and no ELEVENLABS_VOICE_ID')
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.voice_id}?output_format=${format}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: model || v.model || 'eleven_multilingual_v2', voice_settings: v.settings }),
  })
  if (!res.ok) throw new Error(`elevenlabs -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return new Uint8Array(await res.arrayBuffer())
}

export async function transcribe(bytes, mime) {
  const form = new FormData()
  form.append('model', 'whisper-1')
  const ext = mime.includes('ogg') ? 'ogg' : mime.includes('webm') ? 'webm' : mime.includes('wav') ? 'wav' : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : 'm4a'
  form.append('file', new Blob([bytes], { type: mime }), `note.${ext}`)
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
  })
  if (!res.ok) throw new Error(`whisper -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).text || ''
}
