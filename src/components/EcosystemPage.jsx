import { useState } from 'react'
import { Network, ExternalLink, GitBranch, Database, Rocket, Users, ScrollText, ChevronDown } from 'lucide-react'
import { PageHead } from './sa/SaUi'
import { ROOT, GROUPS, PLATFORMS, STATUS_DOT } from '../constants/ecosystemArchitecture'

/* ---------------- node map ---------------- */
function ArchitectureMap({ selected, onSelect }) {
  return (
    <section className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="eco-map" style={{ height: 560 }}>
        <div className="grid"></div>
        <div className="eco-brand"><Network size={13} /> DAVID&rsquo;S ARCHITECTURE · PLATFORM TREE</div>

        <svg className="links" viewBox="0 0 100 100" preserveAspectRatio="none">
          {GROUPS.map((g) => (
            <path key={g.id} d={`M${ROOT.x} ${ROOT.y} L${g.x} ${g.y}`} stroke={g.color} vectorEffect="non-scaling-stroke" />
          ))}
          {PLATFORMS.map((p) => {
            const g = GROUPS.find((x) => x.id === p.group)
            return (
              <path key={p.id} d={`M${g.x} ${g.y} L${p.x} ${p.y}`} stroke={g.color} vectorEffect="non-scaling-stroke"
                style={{ opacity: selected === p.id ? 0.9 : 0.38 }} />
            )
          })}
        </svg>

        <div className="eco-hub">
          <div className="eb">OPERATOR</div>
          <div className="nm">{ROOT.label}</div>
          <div className="sub">{ROOT.sub}</div>
        </div>

        {GROUPS.map((g) => (
          <div key={g.id} className="eco-cat" style={{ left: `${g.x}%`, top: `${g.y}%`, borderTopColor: g.color }}>
            <div className="dom" style={{ color: g.color }}>{g.id.toUpperCase()}</div>
            <div className="nm">{g.label}</div>
            <div className="ds">{g.desc}</div>
            <div className="ct">{PLATFORMS.filter((p) => p.group === g.id).length} PLATFORMS</div>
          </div>
        ))}

        {PLATFORMS.map((p) => (
          <div
            key={p.id}
            className="eco-leaf mine"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              outline: selected === p.id ? '2px solid var(--sa-accent)' : 'none',
              outlineOffset: 2,
            }}
            onClick={() => onSelect(selected === p.id ? null : p.id)}
          >
            <div className="nm"><span className="dia">◆</span>{p.label}</div>
            <div className="meta"><span className="sd" style={{ background: STATUS_DOT[p.status] }}></span>{p.status} · OPEN VIEWER</div>
          </div>
        ))}
      </div>
      <div className="eco-legend">
        {GROUPS.map((g) => <span className="lg" key={g.id}><i style={{ background: g.color }}></i>{g.label}</span>)}
        <span className="lg"><span className="dia">◆</span> Click a platform to open its viewer</span>
      </div>
    </section>
  )
}

/* ---------------- viewer panel ---------------- */
function KV({ k, children, link }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      {link
        ? <a className="v link" href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{children}</a>
        : <span className="v">{children}</span>}
    </div>
  )
}

function Viewer({ platform }) {
  const [logOpen, setLogOpen] = useState(false)

  if (!platform) {
    return (
      <section className="sa-card" style={{ textAlign: 'center', padding: '72px 24px', position: 'sticky', top: 84 }}>
        <div className="sa-card-icon" style={{ margin: '0 auto 16px', width: 48, height: 48 }}><Network size={24} /></div>
        <div className="sa-serif" style={{ fontSize: 22, color: 'var(--sa-ink)' }}>Select a platform</div>
        <p style={{ fontSize: 13, color: 'var(--sa-ink-2)', maxWidth: '30ch', margin: '10px auto 0', lineHeight: 1.55 }}>
          Click any ◆ node on the tree to open its production, repo, database, deploy, and access details.
        </p>
      </section>
    )
  }

  const p = platform
  const g = GROUPS.find((x) => x.id === p.group)
  const commitsUrl = `https://github.com/${p.github.repo}/commits/${p.github.branch}`

  return (
    <section
      className="sa-card"
      style={{
        position: 'sticky', top: 84, padding: 0,
        maxHeight: 'calc(100vh - 108px)', overflowY: 'auto',
        background: 'linear-gradient(177deg, #1F4060 0%, #0E2336 92%)',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {/* header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)' }}>
        <div className="sa-tele" style={{ color: g.color }}>{g.label.toUpperCase()} · {p.status.toUpperCase()}</div>
        <div className="sa-serif" style={{ fontSize: 24, color: '#fff', marginTop: 5, lineHeight: 1.15 }}>{p.name}</div>
        <a
          href={p.production.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sa-accent)', textDecoration: 'none' }}
        >
          <ExternalLink size={12} /> {p.production.url.replace('https://', '')}
        </a>
        {p.production.note && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 0.8, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>{p.production.note.toUpperCase()}</div>}
      </div>

      <div style={{ padding: '6px 20px 20px' }}>
        <div className="dpanel">
          <div className="ph"><GitBranch size={13} /> GitHub</div>
          <KV k="Repo" link={`https://github.com/${p.github.repo}`}>{p.github.repo}</KV>
          <KV k="Branch">{p.github.branch}</KV>
          <KV k="Visibility">{p.github.visibility}</KV>
        </div>

        <div className="dpanel">
          <div className="ph"><Database size={13} /> Supabase</div>
          <KV k="Project">{p.supabase.project}</KV>
          {p.supabase.rls && <KV k="RLS">{p.supabase.rls}</KV>}
        </div>

        <div className="dpanel">
          <div className="ph"><Rocket size={13} /> Vercel</div>
          <KV k="Project">{p.vercel.project}</KV>
          <KV k="Scope">{p.vercel.scope}</KV>
          <KV k="Deploy">{p.vercel.deploy}</KV>
        </div>

        <div className="dpanel">
          <div className="ph"><Users size={13} /> Co-collaborators · {p.collaborators.length}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {p.collaborators.map((c) => (
              <span key={c} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '3px 9px' }}>{c}</span>
            ))}
          </div>
        </div>

        <div className="dpanel">
          <div className="ph"><Users size={13} /> Users</div>
          {p.users.map((u, i) => (
            <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', padding: '4px 0' }}>{u}</div>
          ))}
        </div>

        {/* change log */}
        <div className="dpanel">
          <button
            onClick={() => setLogOpen(!logOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}
          >
            <span className="ph" style={{ marginBottom: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScrollText size={13} /> Change log · {p.changelog.length}
            </span>
            <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.5)', transform: logOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {logOpen && (
            <div style={{ marginTop: 10 }}>
              {p.changelog.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: i ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sa-accent)', flex: '0 0 74px' }}>{c.date}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>{c.entry}</span>
                </div>
              ))}
              <a
                href={commitsUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--sa-accent)', textDecoration: 'none' }}
              >
                FULL HISTORY ON GITHUB <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------------- page ---------------- */
export default function EcosystemPage() {
  const [selected, setSelected] = useState(null)
  const platform = PLATFORMS.find((p) => p.id === selected) || null

  return (
    <div className="sa-grid">
      <div className="col-12">
        <PageHead
          eyebrow="NETWORK · ECOSYSTEM"
          title="Ecosystem"
          em="— the platforms you've built"
          desc="Your digital architecture as a living tree: client platforms and sandbox builds branching from the center. Select any node to open its full operating picture."
        />
      </div>
      <div className="col-8"><ArchitectureMap selected={selected} onSelect={setSelected} /></div>
      <div className="col-4"><Viewer platform={platform} /></div>
    </div>
  )
}
