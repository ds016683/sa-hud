// Tiny markdown renderer — zero deps. Swap for `marked` or `react-markdown`
// later if richer rendering needed. Handles: headings, bold/italic/code,
// lists, blockquotes, code fences, links, tables (basic), HR.
//
// NOT a security boundary — we render vault content trusted by David.

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s) {
  // code spans first
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`)
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`)
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // italic
  s = s.replace(/(^|\W)\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return s
}

export function renderMarkdown(md) {
  if (!md) return ''
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // code fence
    if (/^```/.test(line)) {
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]); i++
      }
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      i++
      continue
    }
    // hr
    if (/^---+\s*$/.test(line)) { out.push('<hr/>'); i++; continue }
    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) { out.push(`<h${h[1].length}>${inline(escapeHtml(h[2]))}</h${h[1].length}>`); i++; continue }
    // blockquote
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, '')); i++
      }
      out.push(`<blockquote>${inline(escapeHtml(buf.join(' ')))}</blockquote>`)
      continue
    }
    // table — two-line minimum: header row + separator
    if (/^\|.*\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const header = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || (arr[0] !== '' && arr[arr.length - 1] !== '')).map(c => c.trim())
      i += 2
      const rows = []
      while (i < lines.length && /^\|.*\|/.test(lines[i])) {
        rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()))
        i++
      }
      let tbl = '<table><thead><tr>' + header.map(h => `<th>${inline(escapeHtml(h))}</th>`).join('') + '</tr></thead><tbody>'
      for (const r of rows) tbl += '<tr>' + r.map(c => `<td>${inline(escapeHtml(c))}</td>`).join('') + '</tr>'
      tbl += '</tbody></table>'
      out.push(tbl)
      continue
    }
    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i++
      }
      out.push('<ul>' + buf.map(b => `<li>${inline(escapeHtml(b))}</li>`).join('') + '</ul>')
      continue
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++
      }
      out.push('<ol>' + buf.map(b => `<li>${inline(escapeHtml(b))}</li>`).join('') + '</ol>')
      continue
    }
    // blank
    if (line.trim() === '') { i++; continue }
    // paragraph — gather until blank
    const buf = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|>\s|```|---+\s*$|\s*[-*+]\s|\s*\d+\.\s|\|.*\|)/.test(lines[i])) {
      buf.push(lines[i]); i++
    }
    out.push(`<p>${inline(escapeHtml(buf.join(' ')))}</p>`)
  }
  return out.join('\n')
}
