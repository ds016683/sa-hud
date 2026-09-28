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
