// STRATEGY · MHPI — the Year 3 four-domain model as an infographic.
// Source: "MHPI Year 3.docx" (Joint Strategy Memorandum, The Kennedy Forum &
// Third Horizon, July 21, 2026, RE: Mental Health Parity Index Revenue
// Streams and Ancillary Services). Copy is the memo's language; nothing here
// is restated.
import { Compass, Lock, Globe } from 'lucide-react'

const GOLD = '#F8C761'
const PERI = '#96A8F0'
const INK = '#EAF1F8'
const INK2 = 'rgba(234,241,248,0.66)'
const INK3 = 'rgba(234,241,248,0.42)'
const CARD = { background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 22 }
const TKF = 'The Kennedy Forum'
const TH = 'Third Horizon'

const Eyebrow = ({ children, color = GOLD }) => (
  <div className="sa-tele" style={{ fontSize: 9.5, letterSpacing: '2px', color, display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: `6px solid ${color}` }} />
    {children}
  </div>
)
const Chip = ({ children, color = PERI }) => (
  <span className="sa-tele" style={{ fontSize: 8.5, letterSpacing: '1.2px', padding: '3px 9px', borderRadius: 999, color, border: `1px solid ${color}55`, background: `${color}14`, whiteSpace: 'nowrap' }}>{children}</span>
)
const Label = ({ children }) => <div className="sa-tele" style={{ fontSize: 8.5, letterSpacing: '1.6px', color: INK3, marginBottom: 5 }}>{children}</div>
const Body = ({ children, style }) => <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, ...style }}>{children}</div>
const Bullets = ({ items }) => (
  <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
    {items.map((t, i) => (
      <li key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.55, color: INK2, padding: '3px 0' }}>
        <span style={{ width: 12, height: 2, background: GOLD, opacity: 0.8, flexShrink: 0, marginTop: 9 }} />
        <span>{t}</span>
      </li>
    ))}
  </ul>
)

// ---- the four domains, from the memo's summary table plus each section's specifics
const DOMAINS = [
  {
    n: '01', key: 'D1', title: 'The public utility and its funders',
    owner: TKF, agreement: 'Master Services Agreement', direction: 'to',
    tagline: 'ParityIndex.org remains free, open, and owned and controlled by The Kennedy Forum.',
    collects: 'The Kennedy Forum owns and controls ParityIndex.org and collects grants, research, and state-partner funding; Third Horizon delivers and maintains the platform under Master Services Agreement schedules.',
    audiences: 'The general public, press, policymakers, and regulators; state agencies; research partners; and national funders (AMA, APF, Ballmer Group, Blank Family Foundation, URAC, New York Community Trust).',
    receives: 'Free, open public access to state- and county-level index results, interactive maps, and the published methodology. Funders and state partners additionally underwrite platform enhancements such as expanded insurer coverage, an MSA map layer, the free Action Tool, and regular data refreshes.',
    detailLabel: 'Year 2 enhancements within the baseline',
    detail: [
      'Expand insurer coverage: add Kaiser Permanente (the fifth largest insurance network) to the four national insurers already covered.',
      'Add an MSA map layer in addition to the State and County views.',
      'Launch the free Action Tool that turns index data into action for individuals/families, clinicians, employers, or regulators.',
      'Maintain a regular data-refresh cadence: twice-yearly updates that keep the index up to date.',
    ],
    optionalLabel: 'Optional expansion items if additional budget can be secured',
    optional: [
      'Regional and local plans on demand (similar to IL, NY, and UT).',
      'A taxonomy-comparison view or tool: individual provider type rates relative to Medicare and network composition.',
      'A new Inpatient Reimbursement Index.',
      'A new Community-Based Facility Index.',
      'Bespoke research outputs for publication and dissemination.',
      'Priority-population and regional views for foundation partners (youth and adolescents, perinatal, veterans, rural communities).',
    ],
    status: 'Year 2 baseline runs September 1, 2026 to August 31, 2027.',
  },
  {
    n: '02', key: 'D2', title: 'MH/SUD stakeholder white-label and special-population projects',
    owner: TKF, agreement: 'Master Services Agreement', direction: 'to',
    tagline: 'A new gated layer built on bespoke white-label new-tech infrastructure, serving organizations and their members, or specific funders’ interests.',
    collects: 'The Kennedy Forum convenes stakeholders and collects membership, white-label, and ongoing platform support fees; Third Horizon builds, operates, and supports the products under Master Services Agreement schedules.',
    audiences: 'Provider associations (e.g., NASW, APA, National Council, ASAM, CASP, NAATP), employer coalitions, and philanthropic funders with priority-population interests.',
    receives: 'A gated, white-label layer on the public infrastructure with members-only depth the public site does not show. Organizations receive customized provider-type views, negotiated rates against parity-compliant benchmarks, and tools to make the case for billing at parity.',
    detailLabel: 'Priority segments, in order',
    detail: [
      'Provider associations: the flagship offering. Medical societies, psychological associations, and provider trade groups license a members-only version of the MHPI as a member benefit.',
      'Employer coalitions: The Kennedy Forum convenes regional business groups on health and purchaser coalitions; Third Horizon delivers the MHPI-grounded analytic products their members use.',
      'Philanthropic priority populations: bespoke index analyses and views focused on the populations and geographies a funder’s mission prioritizes.',
    ],
    optionalLabel: 'Feature sets beyond the public tool',
    optional: [
      'Organizational customization: members-only access through the organization’s own login or website.',
      'A customized provider-type view: the billing codes that matter most to them with current negotiated rates next to the gaps for parity-compliant rates and network composition.',
      'Billing expansion: new billing codes present in the insurer files that may be missing from a clinician’s revenue cycle (e.g., collaborative care codes).',
      'Making the case inside health care systems: what billing at parity would mean for monthly revenue, plus draft letters and talking points for the chief financial officer.',
    ],
    status: 'First engagement underway: the philanthropically funded Bipolar initiative, a special-population platform now in development.',
  },
  {
    n: '03', key: 'D3', title: 'Confidential single-stakeholder engagements',
    owner: TH, agreement: 'Collaboration Agreement', direction: 'back',
    tagline: 'The confidential, one-to-one counterpart to Domain 2’s shared products.',
    collects: 'Third Horizon contracts directly with the stakeholder under the Collaboration Agreement and delivers the work, sharing net profit back to The Kennedy Forum; The Kennedy Forum makes the credentialed introduction.',
    audiences: 'Individual stakeholders (self-insured employers, health plans, advisory businesses, or other health care entities) seeking confidential, proprietary analysis (e.g., DOL audit exposure or plan parity self-assessments).',
    receives: 'A bespoke, private engagement built on MHPI data and methodology, contracted and delivered one-to-one rather than as a shared members’ product.',
    detailLabel: 'Where demand comes from',
    detail: [
      'Large self-insured employers facing Department of Labor audit exposure.',
      'Health plans that need the same rate and network analysis for their required parity self-assessments.',
      'Advisory firms or other health care entities seeking a private, tailored analysis.',
    ],
    optionalLabel: 'How the revenue runs',
    optional: [
      'The Kennedy Forum makes the credentialed introduction.',
      'Third Horizon contracts directly with the stakeholder and delivers the work.',
      'Third Horizon shares net profit back to The Kennedy Forum (the 50% net-profit arrangement the Collaboration Agreement already sets) on a case-by-case basis.',
      'Handled separately from Domain 2 to keep confidential, stakeholder-specific analysis out of the shared members’ products.',
    ],
    status: 'First engagement under the Collaboration Agreement already underway with the One Utah Health Collaborative.',
  },
  {
    n: '04', key: 'D4', title: 'Individual provider subscription platform',
    owner: TH, agreement: 'Collaboration Agreement · revenue-share amendment', direction: 'back',
    tagline: 'Third Horizon’s emerging subscription platform that turns payer transparency data into behavioral health contracting intelligence.',
    collects: 'Third Horizon operates the subscription platform and solely bears all cost, infrastructure, and liability, paying The Kennedy Forum a share of qualified revenue.',
    audiences: 'Individual clinicians, group practices, and provider organizations, including subscribers referred by The Kennedy Forum through tracked coupon codes.',
    receives: 'A paid annual subscription turns payer transparency data into contracting intelligence, benchmarking rates against comparable providers, Medicare, and Medicaid.',
    detailLabel: 'What the platform does',
    detail: [
      'Lets CCBHCs, CMHCs, SUD facilities, and other behavioral health providers see precisely how commercial payers reimburse peer organizations in their state and across the country.',
      'Organizes published contracted rates by payer, service line, level of care, geography, and facility type.',
      'Benchmarks against comparable providers, Medicare, and Medicaid, with a negotiation calculator that moves providers from rate opacity to market leverage.',
      'An affordable annual subscription, available state-by-state, for clinicians, group practices, and provider organizations of any size.',
    ],
    optionalLabel: 'Qualified revenue',
    optional: [
      'Each subscriber referred by The Kennedy Forum is issued a unique coupon code, so every conversion is tracked.',
      'Subscriptions generated through Kennedy Forum referrals, MHPI audiences, and portfolio relationships are the “qualified revenue” the partnership shares.',
      'To be formalized in a dedicated revenue-share amendment to the Collaboration Agreement.',
      'All costs, infrastructure, and liabilities shouldered solely by Third Horizon; The Kennedy Forum shares in the upside without operating risk, additional costs, or mission drift.',
    ],
    status: 'In development using the same payer files that underpin the MHPI.',
  },
]

// ---- Revenue direction between the two organizations, one rail per domain.
function FlowDiagram() {
  const W = 1100, rows = [95, 185, 275, 365]
  const pillar = (x, name, sub) => (
    <g>
      <rect x={x} y={34} width={230} height={392} rx={14} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" />
      <foreignObject x={x} y={44} width={230} height={54}>
        <div style={{ textAlign: 'center', color: INK }}>
          <div className="sa-serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{name}</div>
          <div className="sa-tele" style={{ fontSize: 8.5, letterSpacing: '1.6px', color: INK3, marginTop: 2 }}>{sub}</div>
        </div>
      </foreignObject>
    </g>
  )
  const rails = DOMAINS.map((d, i) => {
    const y = rows[i] + 30
    const toTH = d.direction === 'to'
    const x1 = toTH ? 272 : 828, x2 = toTH ? 828 : 272
    const src = ['Funders and research partners', 'Members, white-label, and platform fees', 'A single stakeholder', 'Individual subscribers'][i]
    const mech = ['Underwrites delivery under MSA schedules', 'Funds build, operation, and support under MSA schedules', '50% of net profit shared back', 'Share of qualified revenue shared back'][i]
    return (
      <g key={d.key}>
        <line x1={272} y1={y} x2={828} y2={y} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 5" />
        <line x1={x1} y1={y} x2={x2 + (toTH ? -14 : 14)} y2={y} stroke={GOLD} strokeWidth={2} markerEnd="url(#arrow)" />
        <circle cx={toTH ? 272 : 828} cy={y} r={5} fill={GOLD} />
        <text x={550} y={y - 12} textAnchor="middle" fill={INK} fontSize="12.5" fontWeight="600">{d.key} · {d.title}</text>
        <text x={550} y={y + 20} textAnchor="middle" fill={INK3} fontSize="10.5">{mech}</text>
        <text x={toTH ? 262 : 838} y={y - 12} textAnchor={toTH ? 'end' : 'start'} fill={PERI} fontSize="9.5" letterSpacing="1">{'collects from'.toUpperCase()}</text>
        <text x={toTH ? 262 : 838} y={y + 3} textAnchor={toTH ? 'end' : 'start'} fill={INK2} fontSize="10">{src}</text>
      </g>
    )
  })
  return (
    <svg viewBox={`0 0 ${W} 440`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={GOLD} />
        </marker>
      </defs>
      {pillar(40, TKF, 'CONVENES · OWNS THE PUBLIC UTILITY')}
      {pillar(830, TH, 'DELIVERS · OPERATES')}
      {rails}
    </svg>
  )
}

function DomainCard({ d }) {
  const toTH = d.direction === 'to'
  return (
    <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 14, borderTop: `2px solid ${GOLD}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div className="sa-serif" style={{ fontSize: 44, lineHeight: 1, fontWeight: 500, color: GOLD, letterSpacing: '-0.02em' }}>{d.n}</div>
        <div style={{ flex: 1 }}>
          <div className="sa-serif" style={{ fontSize: 19, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25 }}>{d.title}</div>
          <div style={{ fontSize: 12.5, color: INK2, fontStyle: 'italic', marginTop: 4 }}>{d.tagline}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip color={GOLD}>{d.agreement}</Chip>
        <Chip>{toTH ? `Revenue collected by ${TKF}` : `Contracted by ${TH}`}</Chip>
        <Chip color={toTH ? PERI : '#43D392'}>{toTH ? `${TH} delivers` : `Shared back to ${TKF}`}</Chip>
      </div>
      <div><Label>WHO COLLECTS AND WHO DELIVERS</Label><Body>{d.collects}</Body></div>
      <div><Label>PRIMARY AUDIENCES</Label><Body>{d.audiences}</Body></div>
      <div><Label>WHAT EACH AUDIENCE RECEIVES</Label><Body>{d.receives}</Body></div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.09)', paddingTop: 12 }}>
        <Label>{d.detailLabel.toUpperCase()}</Label><Bullets items={d.detail} />
      </div>
      <div><Label>{d.optionalLabel.toUpperCase()}</Label><Bullets items={d.optional} /></div>
      <div style={{ marginTop: 'auto', padding: '10px 12px', borderRadius: 8, background: 'rgba(248,199,97,0.07)', border: '1px solid rgba(248,199,97,0.25)', fontSize: 12.5, color: INK }}>
        <span className="sa-tele" style={{ fontSize: 8.5, letterSpacing: '1.6px', color: GOLD, marginRight: 8 }}>STATUS</span>{d.status}
      </div>
    </div>
  )
}

// ---- Year 2 baseline: need vs. what is confirmed or in evaluation (Domain 1).
function FundingBar() {
  const need = 414, fixed = 314, urac = 100, ama = 325
  const W = 900, scale = W / 440
  return (
    <svg viewBox="0 0 960 150" width="100%" style={{ display: 'block' }}>
      <text x={30} y={22} fill={INK3} fontSize="10" letterSpacing="1.6">YEAR 2 BASELINE NEED</text>
      <rect x={30} y={30} width={need * scale} height={22} rx={4} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <rect x={30} y={30} width={fixed * scale} height={22} rx={4} fill="rgba(150,168,240,0.28)" />
      <text x={30 + fixed * scale / 2} y={45} textAnchor="middle" fill={INK} fontSize="11">≈ $314K fixed infrastructure</text>
      <text x={30 + need * scale + 8} y={45} fill={GOLD} fontSize="12" fontWeight="600">$414K</text>
      <text x={30} y={78} fill={INK3} fontSize="10" letterSpacing="1.6">SOURCES</text>
      <rect x={30} y={86} width={urac * scale} height={22} rx={4} fill={GOLD} />
      <text x={30 + urac * scale / 2} y={101} textAnchor="middle" fill="#16324A" fontSize="11" fontWeight="700">URAC $100K confirmed</text>
      <rect x={30 + urac * scale + 6} y={86} width={ama * scale} height={22} rx={4} fill="none" stroke={GOLD} strokeDasharray="5 4" />
      <text x={30 + urac * scale + 6 + ama * scale / 2} y={101} textAnchor="middle" fill={GOLD} fontSize="11">AMA $325K topline proposal, in evaluation</text>
      <text x={30} y={136} fill={INK3} fontSize="10.5">Fixed cost: the application license (Interknowledgy, targeted for elimination in Year 3), Google Cloud processing of insurer rate files, and the Komodo national reference claims data set.</text>
    </svg>
  )
}

export default function MHPIPage() {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', color: INK, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ ...CARD, padding: '26px 28px' }}>
        <Eyebrow>STRATEGY · MHPI · YEAR 3</Eyebrow>
        <div className="sa-serif" style={{ fontSize: 34, fontWeight: 500, letterSpacing: '-0.01em', color: '#fff', marginTop: 10, lineHeight: 1.15 }}>
          Mental Health Parity Index
        </div>
        <div style={{ fontSize: 15, color: INK2, marginTop: 4 }}>Revenue Streams and Ancillary Services: the four-domain model</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          <Chip color={GOLD}>Joint Strategy Memorandum · July 21, 2026</Chip>
          <Chip>The Kennedy Forum &amp; Third Horizon</Chip>
          <Chip>From Greg Williams, Third Horizon Strategies</Chip>
          <Chip>Confidential</Chip>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.09)' }}>
          {[
            ['50 + DC', 'states in the national launch'],
            ['4', 'largest commercial insurance networks covered'],
            ['6', 'funders: AMA, APF, Ballmer Group, Blank Family Foundation, URAC, New York Community Trust'],
            ['2', 'agreements: Master Services Agreement and Collaboration Agreement (effective January 1, 2026)'],
            ['4', 'domains, two directions of revenue between the organizations'],
          ].map(([v, l]) => (
            <div key={l} style={{ borderLeft: `2px solid rgba(248,199,97,0.45)`, paddingLeft: 12 }}>
              <div className="sa-serif" style={{ fontSize: 28, fontWeight: 500, color: '#fff', lineHeight: 1.1 }}>{v}</div>
              <div style={{ fontSize: 11, color: INK3, marginTop: 3, lineHeight: 1.45 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* The strategic question */}
      <div style={{ ...CARD, borderLeft: `3px solid ${GOLD}` }}>
        <Eyebrow>THE STRATEGIC QUESTION</Eyebrow>
        <p className="sa-serif" style={{ fontSize: 19, lineHeight: 1.5, color: '#fff', fontWeight: 400, margin: '10px 0 0' }}>
          “The strategic question is no longer whether the index matters, but how the partnership converts what has been a philanthropically funded measurement platform into a durable engine for putting parity into practice that can become self-sustaining over time.”
        </p>
      </div>

      {/* Flow */}
      <div style={CARD}>
        <Eyebrow>TWO DIRECTIONS OF REVENUE</Eyebrow>
        <div style={{ fontSize: 13, color: INK2, margin: '8px 0 6px', maxWidth: '92ch' }}>
          In Domains 1 and 2, all revenue is collected by The Kennedy Forum, which underwrites Third Horizon and its subcontractors under the Master Services Agreement. In Domains 3 and 4 the direction reverses, and revenue flows from Third Horizon back to The Kennedy Forum under the Collaboration Agreement.
        </div>
        <FlowDiagram />
      </div>

      {/* Four domains */}
      <div>
        <Eyebrow>THE FOUR DOMAINS</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 18, marginTop: 12 }}>
          {DOMAINS.map(d => <DomainCard key={d.key} d={d} />)}
        </div>
      </div>

      {/* Free vs paid */}
      <div style={CARD}>
        <Eyebrow>THE LINE BETWEEN FREE AND PAID</Eyebrow>
        <p style={{ fontSize: 13.5, color: INK, margin: '10px 0 16px', maxWidth: '92ch', lineHeight: 1.6 }}>
          “The principle separating free from paid is the level of detail and customization of the data environment being provided.”
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 10, border: '1px solid rgba(150,168,240,0.35)', background: 'rgba(150,168,240,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PERI }}><Globe size={15} /><span className="sa-tele" style={{ fontSize: 9.5, letterSpacing: '1.8px' }}>PUBLIC · FREE · OPEN</span></div>
            <Bullets items={[
              'Full state and county visibility (and potentially adding Metropolitan Statistical Area views).',
              'Interactive maps and the published methodology.',
              'The free Action Tool: the “Take Action” appeals web tool.',
              'Drives mission, reach, press coverage, regulator engagement, and legislative momentum.',
            ]} />
          </div>
          <div style={{ padding: 16, borderRadius: 10, border: '1px solid rgba(248,199,97,0.4)', background: 'rgba(248,199,97,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GOLD }}><Lock size={15} /><span className="sa-tele" style={{ fontSize: 9.5, letterSpacing: '1.8px' }}>GATED · PAID · BELOW THE PUBLIC VIEW</span></div>
            <Bullets items={[
              'Taxonomy-specific, provider-identified-level, and billing-code-level depth.',
              'Exact negotiated rates and billing-code-level results.',
              'The tools to act on that detail in their own advocacy or individual contract negotiations.',
              'Members-only, white-label, confidential, or subscription environments (Domains 2, 3, and 4).',
            ]} />
          </div>
        </div>
      </div>

      {/* Year 2 funding */}
      <div style={CARD}>
        <Eyebrow>DOMAIN 1 · YEAR 2 BASELINE (SEPTEMBER 1, 2026 TO AUGUST 31, 2027)</Eyebrow>
        <FundingBar />
      </div>

      {/* Foundation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <div style={CARD}>
          <Eyebrow>MASTER SERVICES AGREEMENT</Eyebrow>
          <Body style={{ marginTop: 10 }}>Covers the primary MHPI development and ongoing data updates, including the soon-to-be-released/tested free Action Tool (the “Take Action” appeals web tool), and the philanthropically funded Bipolar initiative.</Body>
          <div style={{ marginTop: 10 }}><Chip>Domains 1 and 2</Chip></div>
        </div>
        <div style={CARD}>
          <Eyebrow>COLLABORATION AGREEMENT · EFFECTIVE JANUARY 1, 2026</Eyebrow>
          <Body style={{ marginTop: 10 }}>Covers private-sector work: The Kennedy Forum makes credentialed introductions to private organizations, Third Horizon delivers the work, and The Kennedy Forum receives 50% of net profit on any private-client project that comes through an introduction or uses the MHPI methodology.</Body>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}><Chip>Domains 3 and 4</Chip><Chip color={GOLD}>First engagement: One Utah Health Collaborative</Chip></div>
        </div>
        <div style={{ ...CARD, borderLeft: `3px solid ${PERI}` }}>
          <Eyebrow color={PERI}>NEXT ON THE CALENDAR</Eyebrow>
          <Body style={{ marginTop: 10 }}>The Year 1 MHPI partners are meeting on July 29th, 2026, in DC to walk through opportunities for Year 2 of the MHPI public utility.</Body>
          <div style={{ fontSize: 11.5, color: INK3, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Compass size={12} /> Source: MHPI Year 3.docx (Desktop), extracted September 14, 2026.</div>
        </div>
      </div>
    </div>
  )
}
