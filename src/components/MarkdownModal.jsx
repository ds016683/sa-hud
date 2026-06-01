import { useEffect, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { renderMarkdown } from '../lib/markdown'
import { readFile } from '../lib/dropbox-vault'

const NAVY = '#002C77'
const SKY = '#009DE0'
const TEXT_MUTED = '#334E85'
const BORDER = '#E2E8F0'
const PANEL = '#FFFFFF'
const BG = '#F7F9FC'

// Renders a Dropbox markdown file inline. If `paths` is an array, concatenates
// each file with a divider so `IDENTITY.md + SYSTEM-PROMPT.md` can render together.
export default function MarkdownModal({ open, onClose, title, path, paths }) {
  const targets = paths && paths.length ? paths : (path ? [path] : [])
  const [chunks, setChunks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || targets.length === 0) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setChunks([])
    ;(async () => {
      try {
        const results = []
        for (const p of targets) {
          const r = await readFile(p)
          results.push({ path: p, content: r.content })
        }
        if (!cancelled) setChunks(results)
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, targets.join('|')])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,44,119,0.35)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PANEL, borderRadius: 12, maxWidth: 980, width: '100%',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,44,119,0.25)', border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>HUD · Vault</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || (targets[0] || '').split('/').pop()}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 6 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 28px', background: BG, flex: 1 }}>
          {loading && <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Loading…</div>}
          {error && (
            <div style={{ color: '#EF4E45', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Vault fetch failed</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{error}</div>
              <div style={{ marginTop: 8, color: TEXT_MUTED }}>
                Dropbox env vars likely not wired in this environment. See <code>scripts/README-DROPBOX-WIRING.md</code>.
              </div>
            </div>
          )}
          {!loading && !error && chunks.map((c, idx) => (
            <div key={c.path}>
              {idx > 0 && <hr style={{ margin: '24px 0', border: 0, borderTop: `1px dashed ${BORDER}` }} />}
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: TEXT_MUTED, marginBottom: 12 }}>
                <ExternalLink size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                {c.path}
              </div>
              <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.content) }} />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .md-body { color: ${NAVY}; font-size: 14px; line-height: 1.55; }
        .md-body h1 { font-size: 22px; margin: 20px 0 12px; color: ${NAVY}; }
        .md-body h2 { font-size: 18px; margin: 18px 0 10px; color: ${NAVY}; border-bottom: 1px solid ${BORDER}; padding-bottom: 4px; }
        .md-body h3 { font-size: 15px; margin: 14px 0 6px; color: ${NAVY}; }
        .md-body h4, .md-body h5, .md-body h6 { font-size: 13px; margin: 12px 0 6px; color: ${TEXT_MUTED}; }
        .md-body p { margin: 8px 0; }
        .md-body ul, .md-body ol { margin: 8px 0 8px 20px; padding: 0; }
        .md-body li { margin: 3px 0; }
        .md-body code { background: #EFF4FA; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; color: ${NAVY}; }
        .md-body pre { background: ${NAVY}; color: #E2E8F0; padding: 12px; border-radius: 8px; overflow-x: auto; }
        .md-body pre code { background: transparent; color: #E2E8F0; padding: 0; }
        .md-body blockquote { border-left: 3px solid ${SKY}; margin: 8px 0; padding: 4px 12px; color: ${TEXT_MUTED}; background: #E6F5FD33; }
        .md-body a { color: ${SKY}; text-decoration: none; }
        .md-body a:hover { text-decoration: underline; }
        .md-body table { border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .md-body th, .md-body td { border: 1px solid ${BORDER}; padding: 6px 10px; text-align: left; vertical-align: top; }
        .md-body th { background: #EFF4FA; font-weight: 700; }
        .md-body hr { border: 0; border-top: 1px solid ${BORDER}; margin: 16px 0; }
      `}</style>
    </div>
  )
}
