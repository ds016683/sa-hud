// Reading (David 11/18): "feed any notes to Lumen through Whats App that can be documented under a new tab
// called Reading, then a separate section for books." One file in project-files, written here only:
//   reading/index.json  { v, books: [{ id, title, author, status, started_at, notes: [{ id, at, text, page, via }] }] }
// A note is kept in David's words, unchanged. A book is added only when David names it.
import { readJson, writeJson } from './_canvass.mjs'

const PATH = 'reading/index.json'
const slug = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const clean = (t, max) => String(t || '').replace(/\r/g, '').trim().slice(0, max)

export async function readReading() {
  const d = await readJson(PATH, { v: 1, books: [] })
  return { v: 1, books: Array.isArray(d?.books) ? d.books : [] }
}
const find = (books, name) => {
  const q = slug(name)
  return q ? (books.find(b => b.id === q) || books.find(b => slug(b.title).includes(q) || q.includes(slug(b.title).split('-').slice(0, 3).join('-')))) : null
}
// The book he is in now: the one reading with the latest note, else the latest started.
const current = (books) => [...books].filter(b => b.status !== 'finished').sort((a, b) => String((b.notes || []).slice(-1)[0]?.at || b.started_at).localeCompare(String((a.notes || []).slice(-1)[0]?.at || a.started_at)))[0] || null

// The book he is in now, by title, for Lumen's turn note.
export async function currentBook() { const b = current((await readReading()).books); return b ? { title: b.title, author: b.author || null, notes: (b.notes || []).length } : null }

export async function addBook({ title, author = null }) {
  const t = clean(title, 200)
  if (!t) throw new Error('title required')
  const doc = await readReading()
  const had = find(doc.books, t)
  if (had) return { book: had, added: false }
  const book = { id: slug(t), title: t, author: clean(author, 120) || null, status: 'reading', started_at: new Date().toISOString(), notes: [] }
  await writeJson(PATH, { v: 1, books: [...doc.books, book] })
  return { book, added: true }
}

export async function addNote({ note, book = null, author = null, page = null, via = 'lumen' }) {
  const text = clean(note, 6000)
  if (!text) throw new Error('note required')
  let doc = await readReading()
  let b = book ? find(doc.books, book) : current(doc.books)
  if (!b && book) { await addBook({ title: book, author }); doc = await readReading(); b = find(doc.books, book) }
  if (!b) throw new Error('no book is on the Reading page yet; ask David which book this is from')
  const row = { id: Date.now().toString(36), at: new Date().toISOString(), text, page: clean(page, 40) || null, via }
  await writeJson(PATH, { v: 1, books: doc.books.map(x => x.id === b.id ? { ...x, notes: [...(x.notes || []), row] } : x) })
  return { book: b.title, author: b.author, note: row, notes: (b.notes || []).length + 1 }
}
