// To PDF (David 10/21): "for all files going forward, have a pdf button". A
// readable PDF from what the cabinet holds: PDFs pass through; Word, Excel,
// PowerPoint, Markdown and text are rendered as plain typeset pages (Helvetica,
// letter size, the words and the order, not the original layout). The cabinet
// door caches the result beside the file under _pdf/.
import JSZip from 'jszip'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const ext = (name) => (String(name).split('.').pop() || '').toLowerCase()

async function textOf(name, bytes) {
  const e = ext(name)
  if (e === 'docx') {
    const mammoth = (await import('mammoth')).default || (await import('mammoth'))
    const r = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    return r.value || ''
  }
  if (e === 'xlsx' || e === 'xls' || e === 'csv') {
    const XLSX = (await import('xlsx')).default || (await import('xlsx'))
    const wb = XLSX.read(Buffer.from(bytes), { type: 'buffer' })
    return wb.SheetNames.map(s => `## ${s}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[s], { FS: '  |  ', blankrows: false })).join('\n\n')
  }
  if (e === 'pptx') {
    const zip = await JSZip.loadAsync(bytes)
    const slides = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    const out = []
    for (const k of slides) {
      const xml = await zip.files[k].async('string')
      const paras = xml.split(/<\/a:p>/).map(p => (p.match(/<a:t>([^<]*)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, '')).join('')).filter(Boolean)
      out.push(`## Slide ${k.match(/\d+/)[0]}\n` + paras.join('\n'))
    }
    return out.join('\n\n')
  }
  return Buffer.from(bytes).toString('utf8')
}

export async function toPdf(name, bytes) {
  if (ext(name) === 'pdf') return bytes
  const text = (await textOf(name, bytes)).replace(/\r/g, '').replace(/[^\x09\x0A\x20-\x7E -ɏ‐-‧‰-⁞]/g, '')
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const W = 612, H = 792, M = 64, size = 10.5, lead = 15, maxW = W - 2 * M
  let page = pdf.addPage([W, H]), y = H - M
  const title = String(name).replace(/\.[^.]+$/, '')
  const draw = (line, f, s) => {
    if (y < M + lead) { page = pdf.addPage([W, H]); y = H - M }
    page.drawText(line, { x: M, y, size: s, font: f, color: rgb(0.1, 0.1, 0.12) }); y -= lead * (s / size)
  }
  const wrap = (s, f, sz) => {
    const words = s.split(/\s+/); const lines = []; let cur = ''
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (f.widthOfTextAtSize(t, sz) > maxW && cur) { lines.push(cur); cur = w } else cur = t }
    if (cur) lines.push(cur); return lines.length ? lines : ['']
  }
  for (const l of wrap(title, bold, 15)) draw(l, bold, 15)
  y -= lead
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) { y -= lead * 0.6; continue }
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) { y -= lead * 0.3; for (const l of wrap(h[2], bold, h[1].length === 1 ? 13 : 11.5)) draw(l, bold, h[1].length === 1 ? 13 : 11.5); continue }
    for (const l of wrap(line.replace(/\*\*/g, ''), font, size)) draw(l, font, size)
  }
  return await pdf.save()
}
