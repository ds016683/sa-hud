// Turn a document's bytes into text so the Friend can read what David reads:
// PDF (unpdf), DOCX (mammoth), XLSX/CSV (SheetJS), PPTX (slide XML), plain text.
import JSZip from 'jszip'

export async function extractText(bytes, filename = '', mime = '') {
  const name = filename.toLowerCase()
  const is = (ext) => name.endsWith(ext)
  if (is('.pdf') || mime.includes('pdf')) {
    const { extractText: pdfText } = await import('unpdf')
    const { text, totalPages } = await pdfText(new Uint8Array(bytes), { mergePages: true })
    return { kind: 'pdf', pages: totalPages, text: String(text || '') }
  }
  if (is('.docx') || mime.includes('wordprocessingml')) {
    const mammoth = (await import('mammoth')).default || await import('mammoth')
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    return { kind: 'docx', text: value || '' }
  }
  if (is('.xlsx') || is('.xls') || is('.csv') || mime.includes('spreadsheetml') || mime.includes('csv')) {
    const XLSX = (await import('xlsx')).default || await import('xlsx')
    const wb = XLSX.read(Buffer.from(bytes), { type: 'buffer' })
    const parts = wb.SheetNames.map(s => `## ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`)
    return { kind: 'sheet', sheets: wb.SheetNames, text: parts.join('\n\n') }
  }
  if (is('.pptx') || mime.includes('presentationml')) {
    const zip = await JSZip.loadAsync(bytes)
    const slides = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    const out = []
    for (const f of slides) {
      const xml = await zip.file(f).async('string')
      const t = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join(' ')
      out.push(`## Slide ${f.match(/\d+/)[0]}\n${t}`)
    }
    return { kind: 'pptx', slides: slides.length, text: out.join('\n\n') }
  }
  if (is('.txt') || is('.md') || is('.json') || mime.startsWith('text/')) return { kind: 'text', text: Buffer.from(bytes).toString('utf8') }
  return { kind: 'binary', text: '', note: `cannot extract text from ${filename || mime || 'this file type'}` }
}

// Trim a long document to what fits a turn, keeping the head and the tail.
export function clip(text, max = 24000) {
  if (text.length <= max) return text
  return `${text.slice(0, max * 0.7)}\n\n[... ${text.length - max} characters omitted ...]\n\n${text.slice(-max * 0.3)}`
}
