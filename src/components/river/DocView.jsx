// A filed document (a brief, a decision) read as a page: each field a labeled
// paragraph or list, never raw JSON. Shared by the Archive and the yay page.
import { renderMarkdown } from './MeetingCloseout'
import { INK2, GOLD, Label } from './canon'

const SKIP = new Set(['kind', 'title', 'summary', 'slug', 'updated_by', 'updated_at', 'for_claude'])
export default function DocView({ doc }) {
  if (!doc || typeof doc !== 'object') return <div style={{ fontSize: 13, color: INK2 }}>{String(doc ?? '')}</div>
  const fields = Object.entries(doc).filter(([k, v]) => !SKIP.has(k) && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {doc.summary && <div style={{ fontSize: 14, lineHeight: 1.65, color: INK2 }}>{renderMarkdown(String(doc.summary))}</div>}
      {fields.map(([k, v]) => (
        <div key={k}>
          {k !== 'sections' && <Label>{k.replace(/_/g, ' ')}</Label>}
          {k === 'sections' && Array.isArray(v)
            ? <div style={{ display: 'grid', gap: 12 }}>{v.map((sec, i) => <div key={i}>{sec?.heading && <Label>{sec.heading}</Label>}{sec?.body && <div style={{ fontSize: 14, lineHeight: 1.65, color: INK2 }}>{renderMarkdown(String(sec.body))}</div>}</div>)}</div>
            : Array.isArray(v)
              ? <div style={{ display: 'grid', gap: 4 }}>{v.map((x, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: INK2, display: 'flex', gap: 8 }}><span style={{ color: GOLD }}>·</span><span>{typeof x === 'string' ? renderMarkdown(x) : typeof x === 'object' && x ? (x.text || x.title || x.label || JSON.stringify(x)) : String(x)}</span></div>)}</div>
              : typeof v === 'object' ? <DocView doc={v} /> : <div style={{ fontSize: 13.5, lineHeight: 1.65, color: INK2 }}>{renderMarkdown(String(v))}</div>}
        </div>
      ))}
    </div>
  )
}
