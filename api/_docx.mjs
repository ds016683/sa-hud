// A small Word writer: markdown-ish text to .docx, no template needed.
// Headings (#, ##, ###), bullets (- or *), numbered lines (1.), bold (**x**),
// italics (*x*), blank lines as spacing. Enough for a scorecard, a memo, a
// draft David forwards. Built on jszip (already a dependency).
import JSZip from 'jszip'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Inline runs: **bold**, *italic*.
function runs(text, base = {}) {
  const out = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0, m
  const push = (t, props) => { if (t) out.push(run(t, { ...base, ...props })) }
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index), {})
    const tok = m[0]
    if (tok.startsWith('**')) push(tok.slice(2, -2), { bold: true })
    else push(tok.slice(1, -1), { italic: true })
    last = m.index + tok.length
  }
  push(text.slice(last), {})
  return out.join('')
}
function run(text, { bold, italic, size, color } = {}) {
  const rpr = [bold ? '<w:b/>' : '', italic ? '<w:i/>' : '', size ? `<w:sz w:val="${size}"/>` : '', color ? `<w:color w:val="${color}"/>` : ''].join('')
  return `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
}
function para(inner, { style, spacingAfter = 120, indent } = {}) {
  const ppr = [style ? `<w:pStyle w:val="${style}"/>` : '', `<w:spacing w:after="${spacingAfter}"/>`, indent ? `<w:ind w:left="${indent}" w:hanging="300"/>` : ''].join('')
  return `<w:p><w:pPr>${ppr}</w:pPr>${inner}</w:p>`
}

export function markdownToDocxXml(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const body = []
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { body.push(para('', { spacingAfter: 60 })); continue }
    let m
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      const level = m[1].length
      const size = level === 1 ? 32 : level === 2 ? 26 : 23
      body.push(para(runs(m[2], { bold: true, size }), { spacingAfter: level === 1 ? 200 : 120 }))
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      body.push(para(run('•  ', {}) + runs(m[1]), { indent: 500, spacingAfter: 80 }))
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      body.push(para(run(`${m[1]}.  `, {}) + runs(m[2]), { indent: 500, spacingAfter: 80 }))
    } else if ((m = line.match(/^([A-Z][A-Za-z0-9 /&'()-]{1,60}):\s*(.*)$/)) && m[2]) {
      // "Label: value" lines read as a form field
      body.push(para(runs(m[1] + ': ', { bold: true }) + runs(m[2])))
    } else {
      body.push(para(runs(line)))
    }
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200"/></w:sectPr></w:body></w:document>`
}

export async function markdownToDocx(text) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`)
  zip.file('word/document.xml', markdownToDocxXml(text))
  return new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }))
}

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// ---- letterhead (David 11/10: "get it on a third horizon letterhead ... able to be
// replicated as we design the others") --------------------------------------------------
// A letterhead is an existing Word file. Its header, footer, logo, styles, page setup and
// numbering are kept exactly; only the body is replaced. The new body is typed in the
// template's own look, learned from the template's body: its title, its section heading,
// its sub-heading, its body text, its bullets and its table. Markdown in:
//   # Title line            (each # line is one line of the title block)
//   ## Section Heading      ### Sub-Heading
//   plain paragraphs, - bullets, 1. numbered lines, **bold**, *italic*
//   | Label | Value |       consecutive lines are one table; <br> breaks a line in a cell;
//                           a |---|---| row under the first row makes it a header row
// {{title}} and {{date}} in the template's headers and footers are filled; `replace` swaps
// other header or footer words ({ "old words": "new words" }).
const unesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const T_RE = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g
const textIn = (xml) => unesc([...String(xml).matchAll(T_RE)].map(m => m[1]).join(''))

// The body's own children, in order (paragraphs, tables, the section properties), with
// nesting respected: a table holds paragraphs, a text box holds paragraphs.
export function topLevel(body) {
  const out = []
  const re = /<w:(p|tbl|sectPr|sdt)(?=[ >/])/g
  let i = 0
  while (i < body.length) {
    re.lastIndex = i
    const m = re.exec(body)
    if (!m) break
    const tag = m[1], start = m.index, gt = body.indexOf('>', start)
    if (gt < 0) break
    if (body[gt - 1] === '/') { out.push({ kind: tag, xml: body.slice(start, gt + 1) }); i = gt + 1; continue }
    const open = new RegExp(`<w:${tag}(?=[ >/])[^>]*>`, 'g'), close = `</w:${tag}>`
    let depth = 1, j = gt + 1
    while (depth > 0) {
      const c = body.indexOf(close, j)
      if (c < 0) { j = body.length; break }
      open.lastIndex = j
      let o
      while ((o = open.exec(body)) && o.index < c) if (!o[0].endsWith('/>')) depth++
      depth--; j = c + close.length
    }
    out.push({ kind: tag, xml: body.slice(start, j) }); i = j
  }
  return out
}

const pPrOf = (p) => (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0]
const rPrOf = (p) => { const r = p.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').match(/<w:r(?: [^>]*)?>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/); return r ? r[1] : '' }
const isBold = (rPr) => /<w:b\/>|<w:b w:val="(1|true|on)"\/>/.test(rPr)
const styleOf = (pPr) => (pPr.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || ''

// What the template looks like: one exemplar for each kind of line.
export function learnLook(bodyXml, numberingXml = '') {
  const items = topLevel(bodyXml)
  const bulletIds = new Set()
  for (const m of String(numberingXml).matchAll(/<w:num w:numId="(\d+)"[^>]*>\s*<w:abstractNumId w:val="(\d+)"/g)) {
    const ab = String(numberingXml).match(new RegExp(`<w:abstractNum w:abstractNumId="${m[2]}"[\\s\\S]*?</w:abstractNum>`))
    const lvl0 = ab && ab[0].match(/<w:lvl w:ilvl="0"[\s\S]*?<\/w:lvl>/)
    if (lvl0 && /<w:numFmt w:val="bullet"\/>/.test(lvl0[0])) bulletIds.add(m[1])
  }
  const look = { title: null, heading: null, sub: null, body: null, bullet: null, table: null }
  let seenHeading = false, seenBreak = false
  for (const it of items) {
    if (it.kind === 'tbl') {
      seenBreak = true
      if (!look.table) {
        const row = (it.xml.match(/<w:tr(?=[ >])[\s\S]*?<\/w:tr>/) || [''])[0]
        const cells = [...row.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map(c => ({ tcPr: (c[0].match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0], pPr: pPrOf(c[0].replace(/<w:tcPr>[\s\S]*?<\/w:tcPr>/, '')), rPr: rPrOf(c[0].replace(/<w:tcPr>[\s\S]*?<\/w:tcPr>/, '')) }))
        look.table = { tblPr: (it.xml.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/) || [''])[0], grid: [...it.xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(g => Number(g[1])), trPr: (row.match(/<w:trPr>[\s\S]*?<\/w:trPr>/) || [''])[0], cells }
      }
      continue
    }
    if (it.kind !== 'p') continue
    const text = textIn(it.xml).trim()
    if (!text) continue
    const pPr = pPrOf(it.xml), rPr = rPrOf(it.xml), style = styleOf(pPr)
    const numId = (pPr.match(/<w:numId w:val="(\d+)"/) || [])[1]
    if (/^(heading|title)/i.test(style)) { seenHeading = true; if (!look.heading) look.heading = { pPr, rPr }; continue }
    if (numId) { if (!look.bullet && (bulletIds.has(numId) || !bulletIds.size)) look.bullet = { pPr, rPr }; continue }
    if (!seenHeading && !seenBreak) { if (!look.title) look.title = { pPr, rPr }; continue }
    if (isBold(rPr) && text.length < 90) { if (!look.sub) look.sub = { pPr, rPr }; continue }
    if (!look.body) look.body = { pPr, rPr }
  }
  return look
}

// rPr with bold or italic added in schema order (after the style and the fonts).
function marked(rPr, { bold, italic }) {
  const add = (bold && !isBold(rPr) ? '<w:b/><w:bCs/>' : '') + (italic && !/<w:i\/>/.test(rPr) ? '<w:i/><w:iCs/>' : '')
  if (!add) return rPr
  if (!rPr) return `<w:rPr>${add}</w:rPr>`
  const at = rPr.match(/^<w:rPr>(?:<w:rStyle [^>]*\/>)?(?:<w:rFonts [^>]*\/>)?/)[0].length
  return rPr.slice(0, at) + add + rPr.slice(at)
}
const unmarked = (rPr) => String(rPr || '').replace(/<w:b\/>|<w:bCs\/>|<w:b w:val="[^"]*"\/>|<w:bCs w:val="[^"]*"\/>/g, '')
const R = (rPr, text) => `<w:r>${rPr || ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
function inline(text, rPr) {
  const out = []
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(R(rPr, text.slice(last, m.index)))
    out.push(m[0].startsWith('**') ? R(marked(rPr, { bold: true }), m[0].slice(2, -2)) : R(marked(rPr, { italic: true }), m[0].slice(1, -1)))
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(R(rPr, text.slice(last)))
  return out.join('')
}

export function letterheadBody(text, look, { pageWidth = 9360 } = {}) {
  const body = look.body || { pPr: '', rPr: '' }
  const heading = look.heading || { pPr: body.pPr, rPr: marked(`<w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>`, { bold: true }) }
  const sub = look.sub || { pPr: body.pPr, rPr: marked(body.rPr, { bold: true }) }
  const title = look.title || heading
  const plain = unmarked(body.rPr)
  const P = (pPr, inner) => `<w:p>${pPr || ''}${inner}</w:p>`
  const cellParas = (content, pPr, rPr) => String(content).split(/<br\s*\/?>/i).map(s => P(pPr, inline(s.trim(), rPr))).join('')
  const table = (rows, headed) => {
    const cols = Math.max(...rows.map(r => r.length))
    const t = look.table
    const total = t?.grid?.length ? t.grid.reduce((a, b) => a + b, 0) : pageWidth
    const widths = t?.grid?.length === cols ? t.grid : Array.from({ length: cols }, () => Math.floor(total / cols))
    const tblPr = t?.tblPr || '<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>'
    // The template's first column is its label column when it is bold there; a header row is bold across.
    const labelCol = !headed && t?.cells?.[0] && isBold(t.cells[0].rPr)
    const cellLook = (ci) => t?.cells?.[Math.min(ci, t.cells.length - 1)] || { pPr: '', rPr: plain }
    const trs = rows.map((r, ri) => `<w:tr>${t?.trPr || ''}${Array.from({ length: cols }, (_, ci) => {
      const c = cellLook(ci)
      const bold = (headed && ri === 0) || (labelCol && ci === 0)
      const rPr = bold ? marked(unmarked(c.rPr), { bold: true }) : unmarked(c.rPr)
      return `<w:tc><w:tcPr><w:tcW w:w="${widths[ci]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${cellParas(r[ci] || '', c.pPr, rPr)}</w:tc>`
    }).join('')}</w:tr>`).join('')
    return `<w:tbl>${tblPr}<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${trs}</w:tbl>`
  }
  const lines = String(text || '').replace(/\r\n/g, '\n').replace(/&nbsp;/g, '\u00A0').split('\n').map(l => l.trimEnd())
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const out = []
  let blank = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) { if (!blank) out.push(P(body.pPr, '')); blank = true; continue }
    blank = false
    let m
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = []
      let headed = false
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (cells.every(c => /^:?-{2,}:?$/.test(c))) { if (rows.length === 1) headed = true } else rows.push(cells)
        i++
      }
      i--
      if (rows.length) out.push(table(rows, headed))
      // Word wants a paragraph after a table that ends the document; a blank line usually follows anyway.
      if (i === lines.length - 1) out.push(P(body.pPr, ''))
    } else if ((m = line.match(/^#\s+(.*)$/))) out.push(P(title.pPr, inline(m[1], title.rPr)))
    else if ((m = line.match(/^##\s+(.*)$/))) out.push(P(heading.pPr, inline(m[1], heading.rPr)))
    else if ((m = line.match(/^#{3,}\s+(.*)$/))) out.push(P(sub.pPr, inline(m[1], sub.rPr)))
    else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) out.push(look.bullet ? P(look.bullet.pPr, inline(m[1], look.bullet.rPr || plain)) : P(body.pPr, R(plain, '•  ') + inline(m[1], plain)))
    else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) out.push(P(body.pPr, R(plain, `${m[1]}.  `) + inline(m[2], plain)))
    else out.push(P(body.pPr, inline(line, plain)))
  }
  return out.join('')
}

// Words in a header or footer: a placeholder inside one run is swapped in place (the run
// keeps its look); words that span runs are swapped at the paragraph, into its first run.
function swapWords(xml, pairs) {
  if (!pairs.length) return xml
  let out = xml.replace(T_RE, (whole, t) => {
    let next = unesc(t)
    for (const [a, b] of pairs) next = next.split(a).join(b)
    return next === unesc(t) ? whole : `<w:t xml:space="preserve">${esc(next)}</w:t>`
  })
  out = out.replace(/<w:p(?=[ >])[\s\S]*?<\/w:p>/g, (p) => {
    const whole = textIn(p)
    let next = whole
    for (const [a, b] of pairs) next = next.split(a).join(b)
    if (next === whole) return p
    let first = true
    return p.replace(T_RE, () => { if (first) { first = false; return `<w:t xml:space="preserve">${esc(next)}</w:t>` } return '<w:t xml:space="preserve"></w:t>' })
  })
  return out
}

export async function letterheadDocx(templateBytes, text, { title = '', date = '', replace = {} } = {}) {
  const zip = await JSZip.loadAsync(templateBytes)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('the letterhead is not a Word document')
  const xml = await docFile.async('string')
  const a = xml.indexOf('<w:body>'), b = xml.lastIndexOf('</w:body>')
  if (a < 0 || b < 0) throw new Error('the letterhead has no body to write into')
  const bodyXml = xml.slice(a + 8, b)
  const items = topLevel(bodyXml)
  const sect = [...items].reverse().find(it => it.kind === 'sectPr')?.xml || '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
  const numbering = zip.file('word/numbering.xml') ? await zip.file('word/numbering.xml').async('string') : ''
  const look = learnLook(bodyXml, numbering)
  const pg = sect.match(/<w:pgSz w:w="(\d+)"/), mar = sect.match(/<w:pgMar[^>]*w:right="(\d+)"[^>]*w:left="(\d+)"/) || sect.match(/<w:pgMar[^>]*w:left="(\d+)"[^>]*w:right="(\d+)"/)
  const pageWidth = pg && mar ? Number(pg[1]) - Number(mar[1]) - Number(mar[2]) : 9360
  const firstTitle = (String(text || '').match(/^#\s+(.*)$/m) || [])[1] || ''
  const pairs = [['{{title}}', title || firstTitle], ['{{date}}', date], ...Object.entries(replace || {}).filter(([k]) => k)]
  // The template's opening blank lines (the air under a first-page logo) are kept.
  const lead = []
  for (const it of items) { if (it.kind === 'p' && !textIn(it.xml).trim() && !/<w:drawing|<w:pict|<w:sectPr/.test(it.xml) && lead.length < 3) lead.push(it.xml); else break }
  zip.file('word/document.xml', xml.slice(0, a + 8) + lead.join('') + letterheadBody(swapPlain(text, pairs.slice(0, 2)), look, { pageWidth }) + sect + xml.slice(b))
  for (const name of Object.keys(zip.files).filter(n => /^word\/(header|footer)\d*\.xml$/.test(n))) zip.file(name, swapWords(await zip.file(name).async('string'), pairs))
  return { bytes: new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })), look: Object.fromEntries(Object.entries(look).map(([k, v]) => [k, !!v])) }
}
const swapPlain = (text, pairs) => pairs.reduce((s, [a, b]) => String(s).split(a).join(b), String(text || ''))

// ---- what a Word file carries (David 11/10: Lumen "can't see images inside a .docx") ----
// The headers, the footers, the body's shape, and every picture with where it sits.
const IMG_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }
export async function inspectDocx(bytes) {
  const zip = await JSZip.loadAsync(bytes)
  const read = async (n) => zip.file(n) ? zip.file(n).async('string') : ''
  const doc = await read('word/document.xml')
  if (!doc) throw new Error('not a Word document')
  const rels = async (part) => Object.fromEntries([...(await read(`word/_rels/${part}.rels`)).matchAll(/<Relationship\b[^>]*>/g)].map(m => [(m[0].match(/Id="([^"]+)"/) || [])[1], (m[0].match(/Target="([^"]+)"/) || [])[1]]))
  const docRels = await rels('document.xml')
  const kinds = {}
  for (const m of doc.matchAll(/<w:(header|footer)Reference w:type="(\w+)" r:id="([^"]+)"/g)) kinds[docRels[m[3]]] = `the ${m[2] === 'first' ? 'first-page ' : m[2] === 'even' ? 'even-page ' : ''}${m[1]}${m[2] === 'default' && /<w:titlePg\/>/.test(doc) ? ' on later pages' : ''}`
  const parts = [['document.xml', 'the body'], ...Object.keys(zip.files).filter(n => /^word\/(header|footer)\d*\.xml$/.test(n)).sort().map(n => [n.slice(5), kinds[n.slice(5)] || (n.includes('header') ? 'a header' : 'a footer')])]
  const pictures = new Map(), lines = []
  for (const [part, label] of parts) {
    const xml = part === 'document.xml' ? doc : await read(`word/${part}`)
    const r = part === 'document.xml' ? docRels : await rels(part)
    if (part !== 'document.xml') {
      const fields = [...xml.matchAll(/<w:instrText[^>]*>\s*(\w+)/g)].map(m => m[1])
      const words = [...xml.matchAll(/<w:p(?=[ >])[\s\S]*?<\/w:p>/g)].map(m => textIn(m[0]).trim()).filter(Boolean).join(' / ')
      lines.push(`${label[0].toUpperCase()}${label.slice(1)}: ${words ? `"${words.slice(0, 200)}"` : 'no words'}${fields.length ? ` (fields: ${[...new Set(fields)].join(', ')})` : ''}`)
    }
    for (const m of xml.matchAll(/<w:drawing>[\s\S]*?<\/w:drawing>/g)) {
      const id = (m[0].match(/r:embed="([^"]+)"/) || [])[1], ext = m[0].match(/<wp:extent cx="(\d+)" cy="(\d+)"/)
      const target = r[id]
      if (!target) continue
      const key = `word/${target.replace(/^\.?\//, '')}`
      const p = pictures.get(key) || { path: key, where: [] }
      p.where.push(`${label}${ext ? ` at ${(Number(ext[1]) / 914400).toFixed(2)} by ${(Number(ext[2]) / 914400).toFixed(2)} inches` : ''}`)
      pictures.set(key, p)
    }
  }
  const items = topLevel(doc.slice(doc.indexOf('<w:body>') + 8, doc.lastIndexOf('</w:body>')))
  const paras = items.filter(i => i.kind === 'p' && textIn(i.xml).trim())
  const heads = items.filter(i => i.kind === 'p' && /^(heading|title)/i.test(styleOf(pPrOf(i.xml)))).map(i => textIn(i.xml).trim()).filter(Boolean)
  lines.push(`Body: ${paras.length} paragraphs with words, ${items.filter(i => i.kind === 'tbl').length} table(s). Opens: "${paras.slice(0, 2).map(p => textIn(p.xml).trim()).join(' / ').slice(0, 160)}"${heads.length ? `. Section headings: ${heads.slice(0, 14).join('; ')}` : ''}`)
  const images = []
  for (const p of pictures.values()) {
    const f = zip.file(p.path)
    if (!f) continue
    const ext = (p.path.split('.').pop() || '').toLowerCase()
    const buf = Buffer.from(await f.async('uint8array'))
    images.push({ name: p.path.split('/').pop(), mime: IMG_MIME[ext] || null, bytes: buf, where: p.where })
  }
  lines.push(images.length ? `Pictures: ${images.map(i => `${i.name} (${(i.bytes.length / 1024).toFixed(0)} KB) in ${i.where.join(' and ')}`).join('; ')}` : 'Pictures: none')
  return { text: lines.join('\n'), images }
}
