// Static v1 from David Deployment Plan.md (last updated 2026-05-05).
// Future: replace with output from daily 7AM CT infra audit cron.

const NAVY = '#002C77'
const SKY = '#009DE0'
const GOLD = '#FF8C00'
const BORDER = '#E2E8F0'
const PANEL = '#FFFFFF'
const BG = '#F7F9FC'
const TEXT = '#002C77'
const TEXT_MUTED = '#334E85'

// status: 'live' | 'partial' | 'down' | 'planned'
const ROWS = [
  // Parents
  { name: 'lumen',              kind: 'parent', parent: '—',                  channel: '#general (→ #channel-dos)', last: '2026-05-05', status: 'live',    notes: 'v3 with 25k-char NORTHSTAR prompt. Confirmed live.' },
  { name: 'vela',               kind: 'parent', parent: '—',                  channel: '#vela',                     last: '2026-05-05', status: 'live',    notes: 'Deploying pass — token live, binding active.' },
  { name: 'mr-coo',             kind: 'parent', parent: '—',                  channel: '(no hub channel)',          last: '2026-05-04', status: 'live',    notes: 'Serves #mr-harvest, #mr-pulse, #mr-task.' },
  { name: 'mr-cco',             kind: 'parent', parent: '—',                  channel: '(no hub channel)',          last: '2026-05-06', status: 'live',    notes: 'Serves #mr-mma, #mr-achp.' },
  { name: 'chief-creative-bot', kind: 'parent', parent: '—',                  channel: '—',                         last: '—',          status: 'planned', notes: 'Not yet deployed. Spec map only.' },
  { name: 'chief-growth-bot',   kind: 'parent', parent: '—',                  channel: '—',                         last: '—',          status: 'planned', notes: 'Not yet deployed.' },
  { name: 'chief-strategy-bot', kind: 'parent', parent: '—',                  channel: '—',                         last: '—',          status: 'planned', notes: 'Not yet deployed.' },
  { name: 'safety-net-bot',     kind: 'parent', parent: '—',                  channel: '—',                         last: '—',          status: 'planned', notes: 'Not yet deployed.' },
  { name: 'mr-ledger',          kind: 'parent', parent: '—',                  channel: '—',                         last: '—',          status: 'planned', notes: 'Not yet deployed.' },

  // Sub-agents — Lumen
  { name: 'lumen-th',           kind: 'sub',    parent: 'lumen',              channel: '—',                         last: '—',          status: 'planned', notes: 'TH-flavored Lumen variant. Not yet split.' },

  // Sub-agents — mr-cco (clients)
  { name: 'mr-mma',             kind: 'sub',    parent: 'mr-cco',             channel: '#mr-mma',                   last: '2026-05-05', status: 'partial', notes: 'Migrated to mr-cco. Phase 5 narrowing pending.' },
  { name: 'mr-achp',            kind: 'sub',    parent: 'mr-cco',             channel: '#mr-achp',                  last: '2026-05-06', status: 'live',    notes: 'Deployed 2026-05-06. Federal Affairs Intelligence Platform.' },
  { name: 'mr-pomegranate',     kind: 'sub',    parent: 'mr-cco',             channel: '—',                         last: '—',          status: 'planned', notes: 'Not yet deployed.' },
  { name: 'mr-purple',          kind: 'sub',    parent: 'mr-cco',             channel: '—',                         last: '—',          status: 'planned', notes: 'Not yet deployed.' },

  // Sub-agents — mr-coo (ops)
  { name: 'mr-harvest',         kind: 'sub',    parent: 'mr-coo',             channel: '#mr-harvest',               last: '2026-05-05', status: 'live',    notes: 'Booking receipts end-to-end. 25+ processed.' },
  { name: 'mr-pulse',           kind: 'sub',    parent: 'mr-coo',             channel: '#mr-pulse',                 last: '2026-05-05', status: 'live',    notes: 'Email router. Summary posts landing.' },
  { name: 'mr-task',            kind: 'sub',    parent: 'mr-coo',             channel: '#mr-task',                  last: '2026-05-05', status: 'live',    notes: 'Deployed 2026-05-05.' },

  // Sub-agents — chief-creative-bot
  { name: 'mr-hfma',            kind: 'sub',    parent: 'chief-creative-bot', channel: '—', last: '—', status: 'planned', notes: '' },
  { name: 'mr-wellness',        kind: 'sub',    parent: 'chief-creative-bot', channel: '—', last: '—', status: 'planned', notes: '' },
  { name: 'mr-diablo',          kind: 'sub',    parent: 'chief-creative-bot', channel: '—', last: '—', status: 'planned', notes: '' },
  { name: 'mr-tcoc',            kind: 'sub',    parent: 'chief-creative-bot', channel: '—', last: '—', status: 'planned', notes: '' },
  { name: 'mr-baseball',        kind: 'sub',    parent: 'chief-creative-bot', channel: '—', last: '—', status: 'planned', notes: '' },

  // chief-growth-bot
  { name: 'mr-relationship',    kind: 'sub',    parent: 'chief-growth-bot',   channel: '—', last: '—', status: 'planned', notes: '' },

  // chief-strategy-bot
  { name: 'mr-framework',       kind: 'sub',    parent: 'chief-strategy-bot', channel: '—', last: '—', status: 'planned', notes: '' },
  { name: 'mr-strategist',      kind: 'sub',    parent: 'chief-strategy-bot', channel: '—', last: '—', status: 'planned', notes: '' },

  // safety-net-bot
  { name: 'mr-snmi',            kind: 'sub',    parent: 'safety-net-bot',     channel: '—', last: '—', status: 'planned', notes: '' },
  { name: 'mr-snh',             kind: 'sub',    parent: 'safety-net-bot',     channel: '—', last: '—', status: 'planned', notes: '' },

  // mr-ledger
  { name: 'mr-ledger-personal', kind: 'sub',    parent: 'mr-ledger',          channel: '—', last: '—', status: 'planned', notes: '' },
  { name: 'mr-ledger-th',       kind: 'sub',    parent: 'mr-ledger',          channel: '—', last: '—', status: 'planned', notes: '' },
]

const STATUS_META = {
  live:    { dot: '🟢', label: 'Live',    color: '#00968F', bg: '#E6F4F2' },
  partial: { dot: '🟡', label: 'Partial', color: '#B45309', bg: '#FEF3C7' },
  down:    { dot: '🔴', label: 'Down',    color: '#EF4E45', bg: '#FEE2E2' },
  planned: { dot: '⚪', label: 'Planned', color: '#6B7280', bg: '#F1F5F9' },
}

export default function EcosystemStatus() {
  const counts = ROWS.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  const total = ROWS.length

  const summary = ['live', 'partial', 'down', 'planned'].map(s => ({ key: s, n: counts[s] || 0 }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {summary.map(({ key, n }) => {
          const m = STATUS_META[key]
          return (
            <div key={key} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', flex: '0 0 auto', minWidth: 130 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.color, marginTop: 4 }}>{n}</div>
            </div>
          )
        })}
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', flex: '0 0 auto', minWidth: 130 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>Total agents</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: NAVY, marginTop: 4 }}>{total}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: TEXT_MUTED, alignSelf: 'flex-end' }}>
          Source: David Deployment Plan.md · last updated 2026-05-05 · v1 static (cron-fed later)
        </div>
      </div>

      {/* Table */}
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
              <Th>Agent</Th>
              <Th>Kind</Th>
              <Th>Parent</Th>
              <Th>Discord channel</Th>
              <Th>Last activity</Th>
              <Th>Status</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const m = STATUS_META[r.status]
              return (
                <tr key={r.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Td bold mono>{r.name}</Td>
                  <Td>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: r.kind === 'parent' ? '#FEF3C7' : '#E6F5FD', color: r.kind === 'parent' ? GOLD : SKY, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{r.kind}</span>
                  </Td>
                  <Td mono>{r.parent}</Td>
                  <Td mono>{r.channel}</Td>
                  <Td mono dim>{r.last}</Td>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 12, background: m.bg, color: m.color, fontWeight: 700, fontSize: 12 }}>
                      <span>{m.dot}</span>{m.label}
                    </span>
                  </Td>
                  <Td dim>{r.notes}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }) {
  return <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>{children}</th>
}
function Td({ children, bold, mono, dim }) {
  return <td style={{ padding: '10px 12px', color: dim ? TEXT_MUTED : TEXT, fontWeight: bold ? 600 : 400, fontFamily: mono ? 'monospace' : 'inherit', fontSize: 12.5, verticalAlign: 'top' }}>{children}</td>
}
