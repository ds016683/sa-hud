// Shared presentational primitives for the TH reskin (from design handoff).
// Pure presentation — no data fetching or business logic.

export function Card({ icon: Icon, title, sub, eyebrow, right, children, style }) {
  return (
    <section className="sa-card" style={style}>
      <div className="sa-card-head">
        <div style={{ display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
          {Icon && <div className="sa-card-icon"><Icon size={17} /></div>}
          <div className="htext">
            {eyebrow && <div className="sa-tele eyebrow">{eyebrow}</div>}
            <div className="title">{title}</div>
            {sub && <div className="sub">{sub}</div>}
          </div>
        </div>
        {right && <div style={{ flex: '0 0 auto' }}>{right}</div>}
      </div>
      {children}
    </section>
  )
}

export function SecHead({ label }) {
  return (
    <div className="col-12 sa-sec-head">
      <span className="sa-tele lbl">{label}</span>
      <span className="ln"></span>
    </div>
  )
}

export function Pill({ kind, children }) {
  return <span className={`sa-pill ${kind || 'muted'}`}>{children}</span>
}

export function SourceChips({ items }) {
  return (
    <div className="sa-srcs">
      {items.map((s, i) => (
        <span key={i} className={`sa-src ${s.kind || ''}`}><span className="d"></span>{s.label}</span>
      ))}
    </div>
  )
}

export function TheoAv({ size }) {
  return <div className={`sa-theo-av${size ? ` ${size}` : ''}`}>T</div>
}

export function Kpis({ items }) {
  return (
    <div className="sa-kpi-row">
      {items.map((k, i) => (
        <div className="sa-kpi" key={i}>
          <div className={`n${k.accent ? ' accent' : ''}`}>{k.n}</div>
          <div className="l sa-tele">{k.l}</div>
          {k.delta && <div className={`delta ${k.dir || 'up'}`}>{k.delta}</div>}
        </div>
      ))}
    </div>
  )
}

export function PageHead({ eyebrow, title, em, desc, right }) {
  return (
    <div className="sa-page-head">
      <div>
        <div className="ph-eyebrow sa-tele"><span className="bar"></span>{eyebrow}</div>
        <h1>{title} {em && <em>{em}</em>}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {right && <div className="ph-right">{right}</div>}
    </div>
  )
}
