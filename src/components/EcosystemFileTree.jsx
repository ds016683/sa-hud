import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Search, RefreshCw, AlertTriangle } from 'lucide-react'
import { listVault } from '../lib/dropbox-vault'
import MarkdownModal from './MarkdownModal'

const NAVY = '#002C77'
const SKY = '#009DE0'
const BORDER = '#E2E8F0'
const PANEL = '#FFFFFF'
const BG = '#F7F9FC'
const TEXT = '#002C77'
const TEXT_MUTED = '#334E85'
const TEXT_DIM = '#6B8CBE'

const LS_OPEN_KEY = 'sa-hud.ecosystem.tree.openFolders'

function loadOpenSet() {
  try {
    const raw = localStorage.getItem(LS_OPEN_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch { return new Set() }
}
function saveOpenSet(s) {
  try { localStorage.setItem(LS_OPEN_KEY, JSON.stringify([...s])) } catch {}
}

// Recursively collect any file under a node whose name matches the query.
// Returns the set of folder paths that should auto-expand to reveal matches.
function findMatches(node, q, hitFolders, hitFiles) {
  if (!node) return false
  const name = node.name.toLowerCase()
  let hit = name.includes(q)
  if (node.type === 'file') {
    if (hit) hitFiles.add(node.path)
    return hit
  }
  let childHit = false
  for (const c of node.children || []) {
    if (findMatches(c, q, hitFolders, hitFiles)) childHit = true
  }
  if (hit || childHit) hitFolders.add(node.path)
  return hit || childHit
}

function TreeNode({ node, depth, openSet, toggleOpen, onFileClick, searchActive, hitFolders, hitFiles }) {
  const isFolder = node.type === 'folder'
  const open = isFolder && (openSet.has(node.path) || (searchActive && hitFolders.has(node.path)))
  const isMd = node.name.toLowerCase().endsWith('.md')

  // search dimming: if search active and this node isn't on a hit path, hide it
  if (searchActive) {
    if (isFolder && !hitFolders.has(node.path)) return null
    if (!isFolder && !hitFiles.has(node.path)) return null
  }

  return (
    <div>
      <div
        onClick={() => {
          if (isFolder) toggleOpen(node.path)
          else if (isMd) onFileClick(node)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px',
          paddingLeft: 8 + depth * 14,
          fontSize: 13,
          color: isMd ? TEXT : (isFolder ? NAVY : TEXT_DIM),
          cursor: (isFolder || isMd) ? 'pointer' : 'default',
          borderRadius: 4,
          userSelect: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF4FA' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {isFolder ? (
          <>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {open ? <FolderOpen size={14} color={SKY} /> : <Folder size={14} color={SKY} />}
            <span style={{ fontWeight: 600 }}>{node.name}</span>
            <span style={{ marginLeft: 6, color: TEXT_DIM, fontSize: 11 }}>{(node.children || []).length}</span>
          </>
        ) : (
          <>
            <span style={{ width: 13 }} />
            <FileText size={13} color={isMd ? NAVY : TEXT_DIM} />
            <span style={{ fontWeight: isMd ? 500 : 400 }}>{node.name}</span>
          </>
        )}
      </div>
      {isFolder && open && (node.children || []).map((c) => (
        <TreeNode
          key={c.path}
          node={c}
          depth={depth + 1}
          openSet={openSet}
          toggleOpen={toggleOpen}
          onFileClick={onFileClick}
          searchActive={searchActive}
          hitFolders={hitFolders}
          hitFiles={hitFiles}
        />
      ))}
    </div>
  )
}

export default function EcosystemFileTree() {
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openSet, setOpenSet] = useState(() => loadOpenSet())
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(null) // { name, path }

  const fetchTree = () => {
    setLoading(true); setError(null)
    listVault().then((t) => {
      setTree(t)
      // auto-open the root level
      const next = new Set(openSet)
      if (t && t.path) next.add(t.path)
      setOpenSet(next); saveOpenSet(next)
    }).catch((e) => setError(e.message || String(e))).finally(() => setLoading(false))
  }

  useEffect(() => { fetchTree() }, [])

  const toggleOpen = (path) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path); else next.add(path)
      saveOpenSet(next)
      return next
    })
  }

  const { hitFolders, hitFiles, searchActive } = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !tree) return { hitFolders: new Set(), hitFiles: new Set(), searchActive: false }
    const f = new Set(), fi = new Set()
    findMatches(tree, q, f, fi)
    return { hitFolders: f, hitFiles: fi, searchActive: true }
  }, [query, tree])

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Tree panel */}
      <div style={{ flex: '0 0 380px', background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: TEXT_DIM }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by filename…"
              style={{
                width: '100%', padding: '7px 10px 7px 32px', fontSize: 13,
                border: `1px solid ${BORDER}`, borderRadius: 6, outline: 'none',
                fontFamily: 'inherit', color: TEXT, background: BG,
              }}
            />
          </div>
          <button
            onClick={fetchTree}
            title="Refresh"
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, padding: 6, cursor: 'pointer', color: TEXT_MUTED }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {loading && <div style={{ padding: 12, color: TEXT_MUTED, fontSize: 13 }}>Loading vault…</div>}
          {error && (
            <div style={{ padding: 12, fontSize: 12, color: '#EF4E45' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 6 }}>
                <AlertTriangle size={14} /> Vault unreachable
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>{error}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 12 }}>
                Wire <code>DROPBOX_APP_KEY</code>, <code>DROPBOX_APP_SECRET</code>, <code>DROPBOX_REFRESH_TOKEN</code> in Vercel env vars. See <code>scripts/README-DROPBOX-WIRING.md</code>.
              </div>
            </div>
          )}
          {tree && !error && (
            <TreeNode
              node={tree}
              depth={0}
              openSet={openSet}
              toggleOpen={toggleOpen}
              onFileClick={(n) => setActive({ name: n.name, path: n.path })}
              searchActive={searchActive}
              hitFolders={hitFolders}
              hitFiles={hitFiles}
            />
          )}
        </div>
        <div style={{ padding: '6px 12px', borderTop: `1px solid ${BORDER}`, fontSize: 10, color: TEXT_DIM, fontFamily: 'monospace' }}>
          /0. David Vault/Lumen OS
        </div>
      </div>

      {/* Hint panel */}
      <div style={{ flex: 1, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 460, color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>HUD · Vault Tree</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Browse the Lumen OS vault.</div>
          <p>Click a folder to expand. Click a <strong>.md</strong> file to preview rendered markdown.</p>
          <p>Folder state persists in localStorage. Search filters live by filename across the entire tree.</p>
          <p style={{ marginTop: 16, fontFamily: 'monospace', fontSize: 11, color: TEXT_DIM }}>
            data: Dropbox API direct · vault root: /0. David Vault/Lumen OS
          </p>
        </div>
      </div>

      <MarkdownModal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name}
        path={active?.path}
      />
    </div>
  )
}
