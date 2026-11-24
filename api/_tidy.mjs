// The broom (David 11/24: "could we build in some functionality where i can click some kind of a button with a broom
// on it and have lumen organize files, primarily by archiving non active files?"). Lumen reads a card's file list and
// proposes which files to archive and why. It writes nothing: David checks the list, and only what he keeps moves into
// the card's Archive folder (CardFiles), where nothing is deleted and any file can be moved back out.
const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const clean = (t, max = 200) => flat(t, max).replace(/\s*[—–]\s*/g, ', ')
const TOOL = { name: 'tidy_files', description: 'Hand David the files to archive.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['archive', 'summary'], properties: {
  summary: { type: 'string' },
  archive: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'why'], properties: { id: { type: 'string' }, why: { type: 'string' } } } },
} } }

export async function tidyFiles({ files = [], card = '', model }) {
  if (!model) throw new Error('no model named for the broom')
  const list = (Array.isArray(files) ? files : []).slice(0, 200).map(f => ({ id: flat(f.id, 60), name: flat(f.name, 160), version: Number(f.version) || 1, added: flat(f.added, 40), source: flat(f.source, 60), size: flat(f.size, 20), folder: flat(f.folder, 60) || null, note: flat(f.note, 200) || null, locked: !!f.locked, pinned: !!f.pinned }))
  const open = list.filter(f => !f.locked && !f.pinned && f.folder !== 'Archive')
  if (!open.length) return { summary: 'Nothing to tidy: every file is locked, pinned or already archived.', archive: [] }
  const prompt = `You are Lumen. David pressed the broom on the files of one card in his HUD${card ? ` ("${flat(card, 160)}")` : ''}. Propose which files to archive: the ones no longer in active use.

Archive a file when another file on the card plainly replaces it: an earlier version or cut of the same thing (v7 when v9 is here, an older copy of the same workbook or video in the same size), a draft superseded by its final, a duplicate. When two forms of the same newest thing exist (a 4K and a 1080p of the same cut), keep both. Keep anything that is the newest of its kind, anything you cannot tell is replaced, links to live tools, and anything whose name or note says it is current or in use. When in doubt, keep it. Never propose a locked, pinned or already archived file (they are marked).

why: a few plain words naming what replaces it ("Replaced by v9"). summary: one short sentence on what you found. No em dashes.

The files (newest first):
${list.map(f => `- id ${f.id} · ${f.name}${f.version > 1 ? ` · version ${f.version}` : ''} · added ${f.added} · ${f.source}${f.size ? ` · ${f.size}` : ''}${f.folder ? ` · in folder ${f.folder}` : ''}${f.locked ? ' · LOCKED' : ''}${f.pinned ? ' · PINNED' : ''}${f.note ? ` · note: ${f.note}` : ''}`).join('\n')}

Hand it back by calling the tidy_files tool exactly once.`
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 3000, tools: [TOOL], tool_choice: { type: 'auto' }, messages: [{ role: 'user', content: prompt }] }) })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const msg = await res.json()
  const call = (msg.content || []).find(c => c.type === 'tool_use')
  if (!call || !call.input) throw new Error('Lumen answered in prose instead of a list; try again')
  const ok = new Map(open.map(f => [f.id, f]))
  const seen = new Set()
  const archive = (Array.isArray(call.input.archive) ? call.input.archive : []).filter(a => ok.has(String(a.id)) && !seen.has(String(a.id)) && seen.add(String(a.id))).map(a => ({ id: String(a.id), why: clean(a.why) }))
  return { summary: clean(call.input.summary, 300), archive }
}
