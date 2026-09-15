// STRATEGY · MHPI. Three views behind Objectives-style pills:
//   General Strategy (TBD; the impact/reach picture gleaned from the inbox)
//   Kennedy Forum (the Year 3 four-domain model, from MHPI Year 3.docx)
//   Partners → AMA (Greg's Year Three outline, no dollar figures) · APF · Ballmer
// Copy is the source documents' own language. Sources are cited on each panel.
import { useState } from 'react'
import { Bell, Lock, Globe, FileText, Landmark, Users, Compass, Building2, HeartPulse, Sparkles } from 'lucide-react'

// ---- Canon tokens (same as ObjectivesPage on the dark stage)
const NAVY = '#EAF1F8'
const NAVY_DEEP = '#0E2336'
const GRAY = 'rgba(234,241,248,0.45)'
const INK2 = 'rgba(234,241,248,0.66)'
const PANEL_BORDER = 'rgba(255,255,255,0.10)'
const PANEL_BG = 'rgba(255,255,255,0.035)'
const GOLD = '#E6B54F'
const BLUE = '#A9C9E8'
const PURPLE = '#B4A3E8'
const GREEN = '#43D392'
const TKF = 'The Kennedy Forum'
const TH = 'Third Horizon'

const S = {
  page: { maxWidth: 1040, margin: '0 auto', padding: '4px 0 80px', fontFamily: 'inherit', color: NAVY },
  h1: { fontSize: 28, fontWeight: 500, margin: 0, color: '#FFFFFF', fontFamily: "'Lora', Georgia, serif", letterSpacing: '-0.01em' },
  sub: { fontSize: 10, color: GRAY, margin: '6px 0 0', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.4px', textTransform: 'uppercase' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16, marginBottom: 12 },
  panelTitle: { fontSize: 10, fontWeight: 600, color: BLUE, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: 10, fontFamily: 'var(--font-mono, monospace)' },
  chip: (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: bg, color: fg, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }),
  source: { fontSize: 10, color: GRAY, marginTop: 10, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.4px' },
}

const Serif = ({ children, size = 20, style }) => (
  <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: size, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25, ...style }}>{children}</div>
)
const Body = ({ children, style }) => <div style={{ fontSize: 13, lineHeight: 1.6, color: INK2, ...style }}>{children}</div>
const Label = ({ children }) => <div style={{ fontSize: 9.5, color: GRAY, textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 5, fontFamily: 'var(--font-mono, monospace)' }}>{children}</div>
const Bullets = ({ items, color = GOLD }) => (
  <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
    {items.map((t, i) => (
      <li key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.55, color: INK2, padding: '3px 0' }}>
        <span style={{ width: 12, height: 2, background: color, opacity: 0.85, flexShrink: 0, marginTop: 9 }} />
        <span>{t}</span>
      </li>
    ))}
  </ul>
)
const Source = ({ children }) => <div style={S.source}>SOURCE · {children}</div>

// Stat tile: big serif number, small label, matching the Monitor scorecard grammar.
const Stat = ({ v, l, color = '#fff' }) => (
  <div style={{ borderLeft: `2px solid ${BLUE}55`, paddingLeft: 12 }}>
    <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 26, fontWeight: 500, color, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{v}</div>
    <div style={{ fontSize: 11, color: GRAY, marginTop: 3, lineHeight: 1.45 }}>{l}</div>
  </div>
)
const StatGrid = ({ items, min = 150 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14 }}>
    {items.map(([v, l, c]) => <Stat key={l} v={v} l={l} color={c} />)}
  </div>
)

// ---- Pills, identical grammar to the Objectives container pills; sub-pills a size down.
function Pills({ items, value, onChange, small = false }) {
  return (
    <div style={{ display: 'inline-flex', gap: small ? 6 : 8, flexWrap: 'wrap' }}>
      {items.map(p => {
        const active = value === p.id
        const Icon = p.icon
        return (
          <button key={p.id} onClick={() => onChange(p.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: small ? '5px 11px' : '7px 14px', borderRadius: 999,
            border: `1px solid ${active ? BLUE : 'rgba(255,255,255,0.16)'}`,
            background: active ? BLUE : 'transparent',
            color: active ? NAVY_DEEP : 'rgba(234,241,248,0.6)',
            fontSize: small ? 10 : 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {Icon && <Icon size={small ? 11 : 12} />} {p.label}{p.tag ? <span style={{ opacity: 0.6, fontWeight: 500 }}> · {p.tag}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

// =============================================================================
// GENERAL STRATEGY — the strategy itself is TBD; this is the impact and reach
// picture assembled from the inbox (Greg's August AMA deck, Nathaniel Counts's
// key-wins note of 8/7, the pilot protocol, the partner-session threads).
// =============================================================================
function GeneralStrategyView() {
  return (
    <>
      <div style={{ ...S.panel, borderLeft: `3px solid ${GOLD}` }}>
        <div style={S.panelTitle}>General Strategy · TBD</div>
        <Body>The strategy view is still to be written. What follows is the impact and reach picture as the inbox states it, so the strategy can be built on numbers that already exist rather than new ones.</Body>
      </div>

      <div style={S.panel}>
        <div style={S.panelTitle}>The parity gap the Index makes visible</div>
        <StatGrid items={[
          ['43', 'states show disparities between mental health coverage and physical health coverage', GOLD],
          ['70%', 'of U.S. counties make it hard to find an in-network mental health provider', GOLD],
          ['0 of 4', 'largest national insurers meet parity benchmarks in every state they serve', GOLD],
          ['16–59%', 'difference in what mental health and substance use clinicians are paid vs. physical health clinicians', GOLD],
        ]} />
        <Source>MHPI Year Three deck for the AMA (August 2026), citing the August 2026 data refresh (v9), The Kennedy Forum, and AMA coverage, 2026</Source>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Reach · behind the data at national scale</div>
          <StatGrid min={130} items={[
            ['50 + DC', 'states in the national index'],
            ['3,044', 'counties in the Index, including rural and frontier markets'],
            ['29', 'carrier plan networks in the v9 national release, with 3 more in post-processing'],
            ['1.67M', 'in-network MH/SUD clinician records across the four national carrier networks'],
            ['14', 'regional insurance plans in Illinois, New York, and Utah'],
            ['641', 'county-level coverage designations added alongside the four national networks'],
            ['75+ TB', 'of raw JSON: negotiated rates for every contracted clinician and every billed service'],
          ]} />
          <Source>MHPI Network Composition v7 → v9 Partner Summary, July 2026, as presented in the August deck</Source>
        </div>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Traction · since the April 2026 national launch</div>
          <StatGrid min={130} items={[
            ['5,800', 'users explored the Parity Index since the April national launch'],
            ['30–100', 'users per day after the initial launch period'],
            ['14', 'national outlets covered the launch'],
            ['2', 'AMA features introducing the Index to physicians'],
            ['4', 'largest carrier networks: Aetna, Cigna, UnitedHealthcare/Optum, BlueCross BlueShield'],
          ]} />
          <Body style={{ marginTop: 12, fontSize: 12 }}>Coverage named on the deck: Politico, STAT, Forbes, Business Insider, Fierce Healthcare, Becker's, American Hospital Association. The coordinated launch event featured AMA President Dr. Bobby Mukkamala.</Body>
          <Source>MHPI Year Three deck for the AMA (August 2026)</Source>
        </div>
      </div>

      <div style={{ ...S.panel, marginTop: 12 }}>
        <div style={S.panelTitle}>Impact · states acting on parity influenced by the Index</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            ['IL', 'December 2025 · signed into law', 'Illinois set a payment floor for behavioral health care: minimum reimbursement for mental health and substance use care set at 142% of Medicare rates. The MHPI was able to show existing disparities in reimbursement rates that helped the bill get passed into law.'],
            ['UT', 'March 2026 · signed into law', 'Utah took on “ghost networks”: insurers must now help members get behavioral health care within set timeframes, and cover out-of-network providers at in-network copays when no one is available. Index data documented the gaps in in-network provider availability.'],
            ['CA', 'Spring 2026 · harmful cap averted', 'A proposed 125%-of-Medicare cap on out-of-network reimbursement risked shrinking networks. Using the MHPI, advocates successfully argued that lower reimbursement would reduce provider participation, weaken network adequacy, increase wait times, and push members out of network.'],
            ['CT', 'April 2026 · enforcement findings', 'Connecticut regulators found that major insurers violated parity requirements related to MH/SUD network adequacy and reimbursement practices, using the MHPI in conjunction with other data.'],
          ].map(([st, when, txt]) => (
            <div key={st} style={{ padding: 12, borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 24, color: GOLD, fontWeight: 500 }}>{st}</span>
                <span style={{ fontSize: 9.5, color: BLUE, textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: 'var(--font-mono, monospace)' }}>{when}</span>
              </div>
              <Body style={{ marginTop: 6, fontSize: 12 }}>{txt}</Body>
            </div>
          ))}
        </div>
        <Source>Nathaniel Counts (The Kennedy Forum), “key wins,” Aug 7, 2026 · August deck, slide 3</Source>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Federal · the rule the Index is timed to</div>
          <Bullets color={BLUE} items={[
            'Enforcement of the 2024 rule is paused while the Departments of Labor, Health and Human Services, and the Treasury rewrite it (announced May 2025).',
            'A new proposed rule is due by December 31, 2026, with “significant revisions,” committed in a March 2026 court filing and on the Spring 2026 regulatory agenda.',
            'Stated priorities: network adequacy and composition, out-of-network reimbursement methods, and the access barriers that harm patients most.',
            'September 2026: DOL’s EBSA reissued its “Warning Signs” checklist alongside Field Assistance Bulletin 2026-03, naming network adequacy as one of three priority enforcement areas for MHPAEA NQTLs; it instructs plans to “compare M/S vs. MH/SUD provider rates relative to a benchmark,” which is the MHPI method in DOL’s own words.',
          ]} />
          <Source>August deck, slide 4 · Greg Williams, Sep 15, 2026 (DOL bulletin note)</Source>
        </div>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Coalition · who is at the table</div>
          <Bullets color={BLUE} items={[
            'Funders: American Medical Association, American Psychological Foundation, Ballmer Group, the Arthur M. Blank Family Foundation, URAC, and the New York Community Trust.',
            'Strategic session, July 29, 2026, Washington DC (Healthsperien, Ste 520W), convened by Rebecca Bagley: AMA (Carol Vargo, Christopher Botts, Daniel Blaney-Koen), APF (Michelle Ryder, Faith Anderson), Ballmer Group (Andi Smith, Val Alduen Fitzgerald), URAC (Shawn Griffin, Karen Watts), TKF, Third Horizon.',
            'Monthly partner sessions: first Wednesday of the month at 4pm Eastern, first recurring meeting October 7, 2026 (a 30-minute touch base was held September 11).',
            'Standing Third Horizon/TKF partnership outreach call, bi-weekly; next moved to October 5 at 12:30 EDT.',
            'Interactive tool pilot protocol: recruit 50–100 clinicians in a PPO network with Aetna, Cigna, UnitedHealthcare, or Blue Cross Blue Shield for a six-month pilot; priority states New York, California, and Illinois.',
          ]} />
          <Source>Strategic Session and Partnership Outreach threads (Alise Wallis, Jun–Sep 2026) · “The Mental Health Parity Index Interactive Tool Pilot” protocol, Aug 7, 2026</Source>
        </div>
      </div>
    </>
  )
}

// =============================================================================
// KENNEDY FORUM — the Year 3 four-domain model (MHPI Year 3.docx, July 21, 2026)
// =============================================================================
const DOMAINS = [
  {
    n: '01', key: 'D1', title: 'The public utility and its funders',
    agreement: 'Master Services Agreement', direction: 'to',
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
    agreement: 'Master Services Agreement', direction: 'to',
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
    agreement: 'Collaboration Agreement', direction: 'back',
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
    agreement: 'Collaboration Agreement · revenue-share amendment', direction: 'back',
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

function FlowDiagram() {
  const rows = [95, 185, 275, 365]
  const pillar = (x, name, sub) => (
    <g>
      <rect x={x} y={34} width={230} height={392} rx={14} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" />
      <foreignObject x={x} y={44} width={230} height={54}>
        <div style={{ textAlign: 'center', color: NAVY }}>
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{name}</div>
          <div style={{ fontSize: 8.5, letterSpacing: '1.6px', color: GRAY, marginTop: 2, fontFamily: 'var(--font-mono, monospace)' }}>{sub}</div>
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
        <line x1={x1} y1={y} x2={x2 + (toTH ? -14 : 14)} y2={y} stroke={GOLD} strokeWidth={2} markerEnd="url(#mhpi-arrow)" />
        <circle cx={toTH ? 272 : 828} cy={y} r={5} fill={GOLD} />
        <text x={550} y={y - 12} textAnchor="middle" fill={NAVY} fontSize="12.5" fontWeight="600">{d.key} · {d.title}</text>
        <text x={550} y={y + 20} textAnchor="middle" fill={GRAY} fontSize="10.5">{mech}</text>
        <text x={toTH ? 262 : 838} y={y - 12} textAnchor={toTH ? 'end' : 'start'} fill={BLUE} fontSize="9.5" letterSpacing="1">COLLECTS FROM</text>
        <text x={toTH ? 262 : 838} y={y + 3} textAnchor={toTH ? 'end' : 'start'} fill={INK2} fontSize="10">{src}</text>
      </g>
    )
  })
  return (
    <svg viewBox="0 0 1100 440" width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <marker id="mhpi-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
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
    <div style={{ ...S.panel, marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `2px solid ${GOLD}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 40, lineHeight: 1, fontWeight: 500, color: GOLD, letterSpacing: '-0.02em' }}>{d.n}</div>
        <div style={{ flex: 1 }}>
          <Serif size={18}>{d.title}</Serif>
          <div style={{ fontSize: 12, color: INK2, fontStyle: 'italic', marginTop: 4 }}>{d.tagline}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={S.chip('rgba(230,181,79,0.14)', GOLD)}>{d.agreement}</span>
        <span style={S.chip('rgba(169,201,232,0.12)', BLUE)}>{toTH ? `Collected by ${TKF}` : `Contracted by ${TH}`}</span>
        <span style={S.chip(toTH ? 'rgba(180,163,232,0.14)' : 'rgba(67,211,146,0.12)', toTH ? PURPLE : GREEN)}>{toTH ? `${TH} delivers` : `Shared back to ${TKF}`}</span>
      </div>
      <div><Label>Who collects and who delivers</Label><Body>{d.collects}</Body></div>
      <div><Label>Primary audiences</Label><Body>{d.audiences}</Body></div>
      <div><Label>What each audience receives</Label><Body>{d.receives}</Body></div>
      <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 12 }}><Label>{d.detailLabel}</Label><Bullets items={d.detail} /></div>
      <div><Label>{d.optionalLabel}</Label><Bullets items={d.optional} /></div>
      <div style={{ marginTop: 'auto', padding: '9px 12px', borderRadius: 8, background: 'rgba(169,201,232,0.08)', border: '1px solid rgba(169,201,232,0.3)', fontSize: 12.5, color: NAVY }}>
        <span style={{ fontSize: 9, letterSpacing: '1.6px', color: BLUE, marginRight: 8, fontFamily: 'var(--font-mono, monospace)' }}>STATUS</span>{d.status}
      </div>
    </div>
  )
}

function FundingBar() {
  const need = 414, fixed = 314, urac = 100, ama = 325
  const W = 900, scale = W / 440
  return (
    <svg viewBox="0 0 960 150" width="100%" style={{ display: 'block' }}>
      <text x={30} y={22} fill={GRAY} fontSize="10" letterSpacing="1.6">YEAR 2 BASELINE NEED</text>
      <rect x={30} y={30} width={need * scale} height={22} rx={4} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <rect x={30} y={30} width={fixed * scale} height={22} rx={4} fill="rgba(169,201,232,0.28)" />
      <text x={30 + fixed * scale / 2} y={45} textAnchor="middle" fill={NAVY} fontSize="11">≈ $314K fixed infrastructure</text>
      <text x={30 + need * scale + 8} y={45} fill={GOLD} fontSize="12" fontWeight="600">$414K</text>
      <text x={30} y={78} fill={GRAY} fontSize="10" letterSpacing="1.6">SOURCES</text>
      <rect x={30} y={86} width={urac * scale} height={22} rx={4} fill={GOLD} />
      <text x={30 + urac * scale / 2} y={101} textAnchor="middle" fill={NAVY_DEEP} fontSize="11" fontWeight="700">URAC $100K confirmed</text>
      <rect x={30 + urac * scale + 6} y={86} width={ama * scale} height={22} rx={4} fill="none" stroke={GOLD} strokeDasharray="5 4" />
      <text x={30 + urac * scale + 6 + ama * scale / 2} y={101} textAnchor="middle" fill={GOLD} fontSize="11">AMA $325K topline proposal, in evaluation</text>
      <text x={30} y={136} fill={GRAY} fontSize="10.5">Fixed cost: the application license (Interknowledgy, targeted for elimination in Year 3), Google Cloud processing of insurer rate files, and the Komodo national reference claims data set.</text>
    </svg>
  )
}

function KennedyForumView() {
  return (
    <>
      <div style={S.panel}>
        <div style={S.panelTitle}>Joint Strategy Memorandum · July 21, 2026</div>
        <Serif size={24}>Revenue Streams and Ancillary Services: the four-domain model</Serif>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          <span style={S.chip('rgba(230,181,79,0.14)', GOLD)}>The Kennedy Forum &amp; Third Horizon</span>
          <span style={S.chip('rgba(169,201,232,0.12)', BLUE)}>From Greg Williams</span>
          <span style={S.chip('rgba(169,201,232,0.12)', BLUE)}>To Rebecca Bagley &amp; Nathaniel Counts</span>
          <span style={S.chip('rgba(255,255,255,0.08)', GRAY)}>Confidential</span>
        </div>
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${PANEL_BORDER}` }}>
          <StatGrid items={[
            ['50 + DC', 'states in the national launch'],
            ['4', 'largest commercial insurance networks covered'],
            ['6', 'funders: AMA, APF, Ballmer Group, Blank Family Foundation, URAC, New York Community Trust'],
            ['2', 'agreements: Master Services Agreement and Collaboration Agreement (effective January 1, 2026)'],
            ['4', 'domains, two directions of revenue between the organizations'],
          ]} />
        </div>
        <Source>MHPI Year 3.docx (Desktop), extracted September 14, 2026</Source>
      </div>

      <div style={{ ...S.panel, borderLeft: `3px solid ${GOLD}` }}>
        <div style={S.panelTitle}>The strategic question</div>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, lineHeight: 1.5, color: '#fff', fontWeight: 400, margin: 0 }}>
          “The strategic question is no longer whether the index matters, but how the partnership converts what has been a philanthropically funded measurement platform into a durable engine for putting parity into practice that can become self-sustaining over time.”
        </p>
      </div>

      <div style={S.panel}>
        <div style={S.panelTitle}>Two directions of revenue</div>
        <Body style={{ marginBottom: 6, maxWidth: '92ch' }}>
          In Domains 1 and 2, all revenue is collected by The Kennedy Forum, which underwrites Third Horizon and its subcontractors under the Master Services Agreement. In Domains 3 and 4 the direction reverses, and revenue flows from Third Horizon back to The Kennedy Forum under the Collaboration Agreement.
        </Body>
        <FlowDiagram />
      </div>

      <div style={{ ...S.panelTitle, marginTop: 4 }}>The four domains</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 12, marginBottom: 12 }}>
        {DOMAINS.map(d => <DomainCard key={d.key} d={d} />)}
      </div>

      <div style={S.panel}>
        <div style={S.panelTitle}>The line between free and paid</div>
        <Body style={{ color: NAVY, marginBottom: 14, maxWidth: '92ch' }}>“The principle separating free from paid is the level of detail and customization of the data environment being provided.”</Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(169,201,232,0.35)', background: 'rgba(169,201,232,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: BLUE }}><Globe size={14} /><span style={{ fontSize: 9.5, letterSpacing: '1.8px', fontFamily: 'var(--font-mono, monospace)' }}>PUBLIC · FREE · OPEN</span></div>
            <Bullets color={BLUE} items={[
              'Full state and county visibility (and potentially adding Metropolitan Statistical Area views).',
              'Interactive maps and the published methodology.',
              'The free Action Tool: the “Take Action” appeals web tool.',
              'Drives mission, reach, press coverage, regulator engagement, and legislative momentum.',
            ]} />
          </div>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(230,181,79,0.4)', background: 'rgba(230,181,79,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GOLD }}><Lock size={14} /><span style={{ fontSize: 9.5, letterSpacing: '1.8px', fontFamily: 'var(--font-mono, monospace)' }}>GATED · PAID · BELOW THE PUBLIC VIEW</span></div>
            <Bullets items={[
              'Taxonomy-specific, provider-identified-level, and billing-code-level depth.',
              'Exact negotiated rates and billing-code-level results.',
              'The tools to act on that detail in their own advocacy or individual contract negotiations.',
              'Members-only, white-label, confidential, or subscription environments (Domains 2, 3, and 4).',
            ]} />
          </div>
        </div>
      </div>

      <div style={S.panel}>
        <div style={S.panelTitle}>Domain 1 · Year 2 baseline (September 1, 2026 to August 31, 2027)</div>
        <FundingBar />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Master Services Agreement</div>
          <Body>Covers the primary MHPI development and ongoing data updates, including the soon-to-be-released/tested free Action Tool (the “Take Action” appeals web tool), and the philanthropically funded Bipolar initiative.</Body>
          <div style={{ marginTop: 10 }}><span style={S.chip('rgba(169,201,232,0.12)', BLUE)}>Domains 1 and 2</span></div>
        </div>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Collaboration Agreement · effective January 1, 2026</div>
          <Body>Covers private-sector work: The Kennedy Forum makes credentialed introductions to private organizations, Third Horizon delivers the work, and The Kennedy Forum receives 50% of net profit on any private-client project that comes through an introduction or uses the MHPI methodology.</Body>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}><span style={S.chip('rgba(169,201,232,0.12)', BLUE)}>Domains 3 and 4</span><span style={S.chip('rgba(230,181,79,0.14)', GOLD)}>First engagement: One Utah Health Collaborative</span></div>
        </div>
      </div>
    </>
  )
}

// =============================================================================
// PARTNERS — AMA (Greg's Year Three outline, no dollar figures) · APF · Ballmer
// =============================================================================
function AMAView() {
  return (
    <>
      <div style={S.panel}>
        <div style={S.panelTitle}>Concept memorandum · Year Three Strategic Partnership</div>
        <Serif size={22}>Year Three Research Agreement Concept: renewal proposal</Serif>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 14 }}>
          <div><Label>To</Label><Body>Carol Vargo and Michael Tutty, American Medical Association</Body></div>
          <div><Label>From</Label><Body>Rebecca O. Bagley, President and CEO, The Kennedy Forum (drafted by Greg Williams, Third Horizon)</Body></div>
          <div><Label>Dated</Label><Body>May 17, 2026 · sent to David May 18 · re-sent September 14</Body></div>
          <div><Label>Term proposed</Label><Body>July 1, 2026 through June 30, 2027 (the current Year Two Research Agreement ended July 1, 2026)</Body></div>
        </div>
        <Body style={{ marginTop: 14, maxWidth: '92ch' }}>Year Three would extend the AMA’s founding strategic partnership and fund three priority investments built directly on the national platform delivered in Year Two. The memo is intended to support AMA review and feedback in advance of a formal Research Agreement amendment.</Body>
        <div style={{ marginTop: 10, fontSize: 11, color: GRAY }}>Dollar figures intentionally omitted from this sketch.</div>
        <Source>“AMA - MHPI Memo Draft,” Greg Williams, May 18, 2026 (attachment MHPI_Year3_Concept_Memo.docx); re-sent Sep 14, 2026</Source>
      </div>

      <div style={S.panel}>
        <div style={S.panelTitle}>Where Year Two leaves things</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            ['Year One', 'May 2025', 'Launched the MHPI as an Illinois pilot.'],
            ['Year Two', 'April 2026', 'Scaled the index to all 50 states and Washington DC. The site visualizes commercial coverage and access to MH/SUD services across the four largest national carrier networks: Aetna, Cigna, UnitedHealthcare/Optum, and the BlueCross BlueShield network.'],
            ['Year Three', 'July 2026 to June 2027', 'Sustains this work and adds an action layer that converts the index from a measurement product into a tool clinicians can use directly.'],
          ].map(([y, when, txt]) => (
            <div key={y} style={{ padding: 12, borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
              <Serif size={17}>{y}</Serif>
              <div style={{ fontSize: 9.5, color: BLUE, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', margin: '3px 0 6px' }}>{when}</div>
              <Body style={{ fontSize: 12 }}>{txt}</Body>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Label>Year Two delivered the items set out in Exhibit A of AMA 72980</Label>
          <Bullets color={BLUE} items={[
            'Methodology updates, including a refined Network Composition Index and Outpatient Professional Reimbursement Index.',
            'Processing of national MRF data and supplemental national claims data across all 50 states.',
            'Design and public launch of the national interface at ParityIndex.org, with the AMA recognized as a key partner.',
            'Coordinated stakeholder launch event with the AMA and featured President, Dr. Bobby Mukkamala, along with ongoing engagement with regulators, payers, and physician organizations.',
          ]} />
        </div>
      </div>

      <div style={{ ...S.panelTitle, marginTop: 4 }}>Year Three scope of work · three priority investments</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 12 }}>
        {[
          ['1', 'Ongoing data refreshes', 'Two scheduled refreshes per year, in roughly September and March, across the four national networks already included. Each refresh updates the underlying data tables, recalculates both indexes, and republishes results on ParityIndex.org.', [
            'Network composition shifts continuously as plans add and drop clinicians. A stale index loses credibility with regulators and members.',
            'Contracted rates change with annual contract cycles.',
            'Advocacy and enforcement use cases require current data. A six-month refresh cadence balances data freshness against processing cost.',
          ]],
          ['2', 'Expanded network coverage', 'Year Two covered the four largest commercial networks. Year Three expands coverage in two directions.', [
            'Kaiser Permanente is integrated into the national index: the largest multi-state commercial network in the US not currently in MHPI (California, Colorado, the Mid-Atlantic, the Pacific Northwest, and Hawaii).',
            'Selected regional and marketplace plans added in Illinois, New York, Utah, and other states as regional funding partners identify additional plans of interest.',
            'New MHPI inclusions promoted as they are released so users, regulators, and member physicians can see which plans are new in any given state.',
          ]],
          ['3', 'Clinician Action Tool', 'The major new investment in Year Three: co-developed by TKF and TH, in collaboration with the AMA, linked from ParityIndex.org, letting MH/SUD clinicians use the index to act.', [
            'A clinician-facing view to compare their rates to the in-network rate benchmarks in their specific geography across the participating carriers.',
            'Comparison reports showing how a clinician’s contracted rates compare to the geographic benchmarks reported in the MHPI.',
            'A downloadable letter template for rate negotiation conversations with specific payers, network adequacy filings, and parity advocacy with employers and state regulators.',
          ]],
        ].map(([n, title, lead, items]) => (
          <div key={n} style={{ ...S.panel, marginBottom: 0, borderTop: `2px solid ${GOLD}` }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 34, color: GOLD, lineHeight: 1, fontWeight: 500 }}>{n}</div>
              <div><Serif size={17}>{title}</Serif><Body style={{ marginTop: 4, fontSize: 12.5 }}>{lead}</Body></div>
            </div>
            <Bullets items={items} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Continued stakeholder engagement and recognition</div>
          <Bullets color={BLUE} items={[
            'Recurring internal strategy calls between TKF, TH, and AMA staff.',
            'External presentations at AMA House of Delegates, state medical association meetings, and federation events where the MHPI and the Provider Action Tool are relevant.',
            'Targeted engagement with state and federal regulators in states where the MHPI surfaces meaningful network and payment disparities.',
            'Coordinated communications with employer purchasers, insurance brokers, and trade associations who can apply the MHPI in benefit design conversations.',
            'The AMA continues to be publicly recognized as a key partner of the MHPI on ParityIndex.org, in all supplemental materials, and in any public communications about the Provider Action Tool.',
          ]} />
        </div>
        <div style={{ ...S.panel, marginBottom: 0 }}>
          <div style={S.panelTitle}>Investment components (amounts omitted)</div>
          <Bullets items={[
            'Data refreshes: semiannual MRF processing across four national networks.',
            'Expanded network coverage: Kaiser Permanente plus selected regional and marketplace plans.',
            'Provider Action Tool design, build, and launch.',
            'Stakeholder engagement, AMA member outreach, and program management.',
          ]} />
          <Body style={{ marginTop: 10, fontSize: 12 }}>TKF and TH will continue to seek matching contributions from other funders so that total program costs are shared across stakeholders, consistent with the existing partner model established in Year Two.</Body>
        </div>
      </div>

      <div style={{ ...S.panel, marginTop: 12 }}>
        <div style={S.panelTitle}>The August deck Greg prepped for Michael Tutty · “From concept to national impact”</div>
        <Body style={{ marginBottom: 12 }}>Eight slides: the parity gap, states acting on parity, the federal rule, Year Two’s national impact, the data at national scale, the Parity Action beta, and the Year Three agenda.</Body>
        <StatGrid min={130} items={[
          ['43', 'states show disparities', GOLD],
          ['70%', 'of counties: hard to find an in-network MH provider', GOLD],
          ['0 of 4', 'largest insurers meet parity benchmarks in every state they serve', GOLD],
          ['16–59%', 'MH/SUD vs. physical health clinician pay difference', GOLD],
          ['5,800', 'users since the April launch; 30–100 per day'],
          ['14 + 2', 'national outlets covered the launch, plus two AMA features'],
          ['1.67M', 'in-network MH/SUD clinician records'],
          ['3,044', 'counties across all 50 states and DC'],
        ]} />
        <div style={{ marginTop: 14 }}>
          <Label>The Year Three agenda on the deck · July 2026 to June 2027</Label>
          <Bullets color={BLUE} items={[
            'Keep the data current: three full national refreshes, September 2026, March 2027, and July 2027, recalculating both indexes as networks and negotiated rates change.',
            'See more of the market: bring in additional multi-state commercial networks not yet in the Index, plus new regional and marketplace plans in Illinois, New York, Utah, and beyond.',
            'Ship Parity Action: test and deploy the clinician tool to generate letters for rate negotiation, network adequacy filings, and other parity advocacy needs.',
            '“Year Three converts the Index from a measurement product into a working instrument for clinicians, timed to the new federal parity rule.”',
          ]} />
        </div>
        <Source>MHPI_Year3_AMA_1.pptx, Greg Williams, Sep 14, 2026 (“prepped this for you for use with Tutty”)</Source>
      </div>

      <div style={{ ...S.panel, borderLeft: `3px solid ${GREEN}` }}>
        <div style={S.panelTitle}>New talking point · September 15, 2026</div>
        <Body style={{ maxWidth: '92ch' }}>DOL released a bulletin last week that leveraged a ton of our logic: EBSA’s “Warning Signs” checklist, reissued alongside Field Assistance Bulletin 2026-03, which names network adequacy as one of three priority enforcement areas for MHPAEA NQTLs. It instructs fiduciaries to “compare M/S vs. MH/SUD provider rates relative to a benchmark,” which is the MHPI method in DOL’s own words. For the AMA: the guidance treats reimbursement disparity as a parity violation rather than a contracting outcome, the argument for why a physician organization should keep funding rate transparency research.</Body>
        <Body style={{ marginTop: 8, fontSize: 12, color: GRAY }}>Caution from the same note: the checklist is guidance, not a rule; describe it as a signal of enforcement priority rather than a new legal requirement.</Body>
        <Source>Greg Williams, “Re: AMA - MHPI Memo Draft,” Sep 15, 2026</Source>
      </div>
    </>
  )
}

function StubView({ name, who, facts, source }) {
  return (
    <div style={{ ...S.panel, borderLeft: `3px solid ${PURPLE}` }}>
      <div style={S.panelTitle}>{name} · TBD</div>
      <Body>No partner-specific strategy has been written yet. What the inbox holds so far:</Body>
      <div style={{ marginTop: 10 }}><Label>People</Label><Body>{who}</Body></div>
      <Bullets color={PURPLE} items={facts} />
      <Source>{source}</Source>
    </div>
  )
}
const APFView = () => (
  <StubView name="American Psychological Foundation" who="Michelle Quist Ryder, PhD, Chief Executive Officer · Faith Anderson · Chris Fees, Executive Operations Manager" facts={[
    'A named funder in the MHPI coalition; at the July 29 strategic session in DC.',
    'August 4: Michelle followed up on the materials and updates from the session “to help guide our next steps as we meet with National Register about the potential for a pilot study.”',
    'Confirmed for the monthly partner sessions (first Wednesday, 4pm Eastern, from October 7) and the September 11 touch base.',
  ]} source="Strategic Session thread (Michelle Ryder, Aug 4; Chris Fees, Aug 26 to Sep 8, 2026)" />
)
const BallmerView = () => (
  <StubView name="Ballmer Group" who="Andi Smith · Val Alduen Fitzgerald" facts={[
    'A named funder in the MHPI coalition; invited to the July 29 strategic session in DC and to the monthly partner sessions.',
    'No Ballmer-specific proposal, scope, or correspondence found in the mailbox beyond the coalition threads.',
  ]} source="Strategic Session invitations (Alise Wallis, Jun 30 to Aug 25, 2026)" />
)

// =============================================================================
export default function MHPIPage() {
  const [view, setView] = useState(() => { try { return localStorage.getItem('mhpi-view') || 'kennedy' } catch { return 'kennedy' } })
  const [partner, setPartner] = useState(() => { try { return localStorage.getItem('mhpi-partner') || 'ama' } catch { return 'ama' } })
  const pick = (v) => { setView(v); try { localStorage.setItem('mhpi-view', v) } catch { /* ignore */ } }
  const pickPartner = (p) => { setPartner(p); try { localStorage.setItem('mhpi-partner', p) } catch { /* ignore */ } }
  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={S.h1}><Compass size={22} color={BLUE} style={{ verticalAlign: '-3px', marginRight: 8 }} />Mental Health Parity Index</h1>
          <div style={S.sub}>Strategy · MHPI · The Kennedy Forum · American Medical Association · Third Horizon</div>
        </div>
      </div>
      <div style={{ marginBottom: 6 }}>
        <Pills value={view} onChange={pick} items={[
          { id: 'general', label: 'General Strategy', tag: 'TBD', icon: Sparkles },
          { id: 'kennedy', label: 'Kennedy Forum', icon: Landmark },
          { id: 'partners', label: 'Partners', icon: Users },
        ]} />
      </div>
      {view === 'partners' && (
        <div style={{ margin: '4px 0 12px 8px' }}>
          <Pills small value={partner} onChange={pickPartner} items={[
            { id: 'ama', label: 'AMA', icon: HeartPulse },
            { id: 'apf', label: 'APF', icon: FileText },
            { id: 'ballmer', label: 'Ballmer', icon: Building2 },
          ]} />
        </div>
      )}
      <div style={{ marginTop: view === 'partners' ? 0 : 12 }}>
        {view === 'general' && <GeneralStrategyView />}
        {view === 'kennedy' && <KennedyForumView />}
        {view === 'partners' && partner === 'ama' && <AMAView />}
        {view === 'partners' && partner === 'apf' && <APFView />}
        {view === 'partners' && partner === 'ballmer' && <BallmerView />}
      </div>
      <div style={{ fontSize: 10.5, color: GRAY, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={11} /> Follow-up nudges for MHPI items live on the Daily Monitor.</div>
    </div>
  )
}
