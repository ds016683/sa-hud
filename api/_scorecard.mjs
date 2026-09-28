// Fill NACDD's Round 2 scorecard template from a scorecard artifact.
// Works on the template's own document.xml so Stephanie gets her exact form
// back: boxes ticked ([ ] -> [X]), notes typed into the notes cells, the
// competency grid marked, the overall evaluation and recommendation filled.
//
// Template anatomy (tables in body order, found by their heading text):
//   CANDIDATE INFORMATION  4 label/value cells
//   PRESENTATION           notes cell, 5 criteria rows, Q&A notes, overall row
//   INTERVIEW QUESTIONS    Q1 table (heading row + question), then Q2..Q8 tables:
//                          row 0 question, row 1 Notes, row 2 rating
//   COMPETENCY SUMMARY     rows of [name, Exceeds, Meets, Below, N/A]
//   OVERALL EVALUATION     rating row, strengths, concerns, probe, comments
//   RECOMMENDATION         four options, date completed
import JSZip from 'jszip'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const T = /<w:t(?: [^>]*)?>(.*?)<\/w:t>/gs
const textOf = (xml) => [...String(xml).matchAll(T)].map(m => m[1]).join('')
const run = (text) => `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
const para = (text) => `<w:p>${run(text)}</w:p>`
const lines = (s) => String(s ?? '').replace(/\r\n/g, '\n').split('\n')

// Tick the box that sits right before `label` in this xml (first match).
function tick(xml, label) {
  // Walk every empty box; tick the one whose following text starts with the label.
  // A box is "[ ]" with a plain or non-breaking space, or split across runs ("[" ... " ]").
  const BOX = /\[(?:[ \u00a0]|<\/w:t><\/w:r>(?:(?!<w:t)[\s\S])*?<w:t[^>]*>[ \u00a0]?)\]/g
  let m
  while ((m = BOX.exec(xml))) {
    const idx = m.index, len = m[0].length
    // The box sits inside a text node: take the rest of that node directly,
    // then the text of every node after it (labels can be split across runs).
    const tail = xml.slice(idx + len)
    const lt = tail.indexOf('<')
    const direct = lt >= 0 ? tail.slice(0, lt) : tail
    const following = (direct + textOf(tail.slice(direct.length))).replace(/^[\s\u00a0]+/, '')
    if (following.startsWith(label)) {
      // Keep any run boundary inside the box; just turn the space into an X.
      const ticked = m[0].replace(/[ \u00a0]\]$/, 'X]').replace(/^\[[ \u00a0]\]$/, '[X]')
      return xml.slice(0, idx) + ticked + xml.slice(idx + len)
    }
  }
  return xml
}
// Put text into a cell: fill the empty paragraphs after the label, add more if needed.
function fillCell(cellXml, text, { keepFirst = true } = {}) {
  const ls = lines(text).filter((l, i, a) => l.trim() || (i < a.length - 1))
  if (!ls.length) return cellXml
  const paras = [...cellXml.matchAll(/<w:p[ >].*?<\/w:p>|<w:p\/>/gs)].map(m => ({ xml: m[0], start: m.index, end: m.index + m[0].length }))
  let out = cellXml, offset = 0, li = 0
  const targets = paras.filter((p, i) => !(keepFirst && i === 0) && !textOf(p.xml).trim())
  for (const p of targets) {
    if (li >= ls.length) break
    const withRun = p.xml.endsWith('/>') ? `<w:p>${run(ls[li])}</w:p>` : p.xml.replace(/<\/w:p>$/, `${run(ls[li])}</w:p>`)
    out = out.slice(0, p.start + offset) + withRun + out.slice(p.end + offset)
    offset += withRun.length - p.xml.length
    li++
  }
  if (li < ls.length) {
    const extra = ls.slice(li).map(para).join('')
    out = out.replace(/<\/w:tc>\s*$/, `${extra}</w:tc>`)
  }
  return out
}
// Cell with no paragraphs at all, or one empty paragraph: put the value in.
function setCell(cellXml, text) {
  if (!String(text ?? '').trim()) return cellXml
  const paras = [...cellXml.matchAll(/<w:p[ >].*?<\/w:p>|<w:p\/>/gs)]
  if (!paras.length) return cellXml.replace(/<\/w:tc>\s*$/, `${para(text)}</w:tc>`)
  const p = paras[paras.length - 1]
  const withRun = p[0].endsWith('/>') ? para(text) : p[0].replace(/<\/w:p>$/, `${run(text)}</w:p>`)
  return cellXml.slice(0, p.index) + withRun + cellXml.slice(p.index + p[0].length)
}
const rowsOf = (tbl) => [...tbl.matchAll(/<w:tr[ >].*?<\/w:tr>/gs)]
const cellsOf = (row) => [...row.matchAll(/<w:tc>.*?<\/w:tc>/gs)]
function mapCells(rowXml, fn) {
  let out = '', last = 0
  cellsOf(rowXml).forEach((m, i) => { out += rowXml.slice(last, m.index) + (fn(m[0], i) ?? m[0]); last = m.index + m[0].length })
  return out + rowXml.slice(last)
}
function mapRows(tblXml, fn) {
  let out = '', last = 0
  rowsOf(tblXml).forEach((m, i) => { out += tblXml.slice(last, m.index) + (fn(m[0], i, textOf(m[0])) ?? m[0]); last = m.index + m[0].length })
  return out + tblXml.slice(last)
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const RATING_LABELS = { exceeds: 'Exceeds', meets: 'Meets', below: 'Below', 'does not meet': 'Does Not Meet', 'n a': 'N/A', na: 'N/A' }
const ratingLabel = (r) => RATING_LABELS[norm(r)] || null
const REC = [['strong yes', 'Strong Yes'], ['yes', 'Yes'], ['no', 'No'], ['strong no', 'Strong No']]

export function fillScorecardXml(xml, doc) {
  const missing = []
  const need = (ok, what) => { if (!ok) missing.push(what) }
  const bodyStart = xml.indexOf('<w:body>') + 8, bodyEnd = xml.indexOf('<w:sectPr')
  let body = xml.slice(bodyStart, bodyEnd)
  const items = [...body.matchAll(/<w:tbl>.*?<\/w:tbl>/gs)]
  let out = '', last = 0
  let qSeen = 0
  for (const m of items) {
    let tbl = m[0]
    const head = textOf(cellsOf(rowsOf(tbl)[0]?.[0] || '')[0]?.[0] || '').trim()
    if (head.startsWith('CANDIDATE INFORMATION')) {
      tbl = mapRows(tbl, (row, i) => {
        if (i === 1) return mapCells(row, (c, ci) => ci === 1 ? setCell(c, doc.candidate) : ci === 3 ? setCell(c, doc.interview_date) : c)
        if (i === 2) return mapCells(row, (c, ci) => ci === 1 ? setCell(c, doc.interviewer) : ci === 3 ? setCell(c, doc.interviewer_title) : c)
      })
    } else if (head.startsWith('PRESENTATION')) {
      const P = doc.presentation || {}
      tbl = mapRows(tbl, (row, i, t) => {
        if (t.startsWith('Presentation Notes')) { need(!!(P.notes || '').trim(), 'presentation notes'); return mapCells(row, c => fillCell(c, P.notes)) }
        if (t.startsWith('Q&amp;A Notes') || t.startsWith('Q&A Notes')) return mapCells(row, c => fillCell(c, P.qa_notes))
        if (t.startsWith('Overall Presentation Rating')) { const r = ratingLabel(P.overall); need(!!r, 'presentation overall rating'); return r ? tick(row, r) : row }
        for (const [k, v] of Object.entries(P.ratings || {})) {
          // Compare with punctuation stripped: the template's "Board-CEO" uses a non-breaking hyphen.
          if (norm(t.replace(/&amp;/g, '&')).startsWith(norm(k).slice(0, 22))) { const r = ratingLabel(v); need(!!r, `presentation rating: ${k}`); return r ? tick(row, r) : row }
        }
      })
    } else if (/^Q\d\./.test(head) || head.startsWith('INTERVIEW QUESTIONS')) {
      tbl = mapRows(tbl, (row, i, t) => {
        const qm = t.match(/^(Q\d)\.\s/)
        if (qm && !t.includes('Rating:')) { qSeen = qm[1]; return row }
        const q = (doc.questions || []).find(x => x.id === qSeen)
        if (!q) return row
        if (t.startsWith('Notes:')) { if (q.mine) need(!!(q.notes || '').trim(), `${q.id} notes`); return mapCells(row, c => fillCell(c, q.notes)) }
        if (t.startsWith(`${qSeen}. Rating`)) { const r = ratingLabel(q.rating); need(!!r, `${q.id} rating`); return r ? tick(row, r) : row }
      })
    } else if (head.startsWith('COMPETENCY SUMMARY')) {
      tbl = mapRows(tbl, (row, i, t) => {
        const cells = cellsOf(row)
        if (cells.length < 5) return row
        const name = textOf(cells[0][0]).trim()
        const c = (doc.competencies || []).find(x => norm(x.name).slice(0, 30) === norm(name).slice(0, 30))
        if (!c) return row
        const r = ratingLabel(c.rating); need(!!r, `competency: ${name}`)
        if (!r) return row
        const col = { 'Exceeds': 1, 'Meets': 2, 'Below': 3, 'N/A': 4 }[r]
        return mapCells(row, (cell, ci) => ci === col ? cell.replace(/\[[ \u00a0]\]/, '[X]') : cell)
      })
    } else if (head.startsWith('OVERALL EVALUATION')) {
      const O = doc.overall || {}
      tbl = mapRows(tbl, (row, i, t) => {
        if (t.startsWith('Overall Rating')) { const r = ratingLabel(O.rating); need(!!r, 'overall rating'); return r ? tick(row, r) : row }
        if (t.startsWith('Key Strengths')) { need(!!(O.strengths || '').trim(), 'key strengths'); return mapCells(row, c => fillCell(c, O.strengths)) }
        if (t.startsWith('Key Concerns')) { need(!!(O.concerns || '').trim(), 'key concerns'); return mapCells(row, c => fillCell(c, O.concerns)) }
        if (t.startsWith('Questions or Topics')) return mapCells(row, c => fillCell(c, O.probe))
        if (t.startsWith('Additional Comments')) return mapCells(row, c => fillCell(c, O.comments))
      })
    } else if (head.startsWith('RECOMMENDATION')) {
      const O = doc.overall || {}
      const rec = REC.find(([k]) => norm(O.recommendation) === k)
      need(!!rec, 'recommendation')
      tbl = mapRows(tbl, (row, i, t) => {
        if (i === 1 && rec) {
          const label = rec[1] === 'Yes' ? 'Yes - Advance' : rec[1] === 'No' ? 'No - Do Not' : rec[1]
          return tick(row, label)
        }
        if (t.startsWith('Date Completed')) return row.replace('______________', esc(O.date_completed || new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' })))
      })
    }
    out += body.slice(last, m.index) + tbl
    last = m.index + m[0].length
  }
  body = out + body.slice(last)
  return { xml: xml.slice(0, bodyStart) + body + xml.slice(bodyEnd), missing }
}

export async function fillScorecard(templateBytes, doc) {
  const zip = await JSZip.loadAsync(templateBytes)
  const xml = await zip.file('word/document.xml').async('string')
  const { xml: filled, missing } = fillScorecardXml(xml, doc)
  zip.file('word/document.xml', filled)
  const bytes = new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }))
  return { bytes, missing }
}
