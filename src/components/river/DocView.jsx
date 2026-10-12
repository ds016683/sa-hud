// A filed document (a brief, a decision) read as a page: each field a labeled
// paragraph or list, never raw JSON. Shared by the Archive and the yay page.
import { renderMarkdown } from './MeetingCloseout'
import { INK2, GOLD, BLUE, SERIF, Label } from './canon'

// Section headings: Lora in baby blue, a step larger than the text under them.
const BODY = 15.5
const H = { fontFamily: SERIF, fontWeight: 500, fontSize: 17.5, letterSpacing: '-0.01em', color: BLUE, margin: '6px 0 4px', lineHeight: 1.3 }
const cleanSections = (v) => { const out = []; for (const s of v) { if (!s || !String(s.body || '').trim()) continue; const prev = out[out.length - 1]; if (prev && prev.heading === s.heading && prev.body === s.body) continue; out.push(s) } return out }

const SKIP = new Set(['kind', 'title', 'summary', 'slug', 'updated_by', 'updated_at', 'for_claude'])
export default function DocView({ doc }) {
  if (!doc || typeof doc !== 'object') return <div style={{ fontSize: 13, color: INK2 }}>{String(doc ?? '')}</div>
  const fields = Object.entries(doc).filter(([k, v]) => !SKIP.has(k) && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {doc.summary && <div style={{ color: INK2 }}>{renderMarkdown(String(doc.summary), { size: BODY })}</div>}
      {fields.map(([k, v]) => (
        <div key={k}>
          {k !== 'sections' && <div style={H}>{k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}</div>}
          {k === 'sections' && Array.isArray(v)
            ? <div style={{ display: 'grid', gap: 14 }}>{cleanSections(v).map((sec, i) => <div key={i}>{sec.heading && <div style={H}>{sec.heading}</div>}<div style={{ color: INK2 }}>{renderMarkdown(String(sec.body), { size: BODY })}</div></div>)}</div>
            : Array.isArray(v)
              ? <div style={{ display: 'grid', gap: 6 }}>{v.map((x, i) => <div key={i} style={{ fontSize: BODY, lineHeight: 1.6, color: INK2, display: 'flex', gap: 10 }}><span style={{ color: GOLD, flexShrink: 0 }}>·</span><span style={{ minWidth: 0 }}>{typeof x === 'string' ? renderMarkdown(x, { size: BODY }) : typeof x === 'object' && x ? (x.text || x.title || x.label || JSON.stringify(x)) : String(x)}</span></div>)}</div>
              : typeof v === 'object' ? <DocView doc={v} /> : <div style={{ color: INK2 }}>{renderMarkdown(String(v), { size: BODY })}</div>}
        </div>
      ))}
    </div>
  )
}
