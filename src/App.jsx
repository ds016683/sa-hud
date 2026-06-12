import { useState, useEffect } from 'react'
import {
  LayoutGrid, Lightbulb, Network, LogOut, Menu, X, Target, Users, Sparkles,
  FileText, MessageSquare, Wallet, CreditCard, LayoutDashboard, Brain,
} from 'lucide-react'
import { getSession, onAuthStateChange, signOut } from './lib/auth'
import { statusFor, greetingFor, TIER_COLORS } from './constants/saDesign'
import useGameState from './hooks/useGameState'
import LoginPage from './components/LoginPage'
import DailyDashboardPage from './components/DailyDashboardPage'
import PortfolioPage from './components/PortfolioPage'
import IdeasPage from './components/IdeasPage'
import EcosystemPage from './components/EcosystemPage'
import MeetingNotesPage from './components/MeetingNotesPage'
import ObjectivesPage from './components/ObjectivesPage'
import AccomplishmentsPage from './components/AccomplishmentsPage'
import RelationshipsPage from './components/RelationshipsPage'
import SlackPage from './components/SlackPage'
import CompanyFinancePage from './components/CompanyFinancePage'
import PersonalFinancePage from './components/PersonalFinancePage'

const NAV_ITEMS = [
  { id: 'daily-dashboard', label: 'Daily Dashboard',  icon: LayoutDashboard, group: 'COMMAND' },
  { id: 'brain',           label: 'The Brain',        icon: Brain,           group: 'COMMAND' },
  { id: 'objectives',      label: 'Objectives',       icon: Target,          group: 'COMMAND' },
  { id: 'accomplishments', label: 'Daily Summary',    icon: Sparkles,        group: 'COMMAND' },
  { id: 'meeting-notes',   label: 'Meeting Notes',    icon: FileText,        group: 'COMMAND' },
  { id: 'company-finance', label: 'Company Finance',  icon: Wallet,          group: 'MONEY STUFF' },
  { id: 'personal-finance', label: 'Personal Finance', icon: CreditCard,     group: 'MONEY STUFF' },
  { id: 'relationships',   label: 'Relationships',    icon: Users,           group: 'NETWORK' },
  { id: 'slack',           label: 'Slack',            icon: MessageSquare,   group: 'NETWORK' },
  { id: 'portfolio',       label: 'My Projects',      icon: LayoutGrid,      group: 'NETWORK' },
  { id: 'ideas',           label: 'Ideas Pipeline',   icon: Lightbulb,       group: 'NETWORK' },
  { id: 'ecosystem',       label: 'Ecosystem',        icon: Network,         group: 'NETWORK' },
]

function Sidebar({ active, onChange, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (!desktop) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleNav = (id) => {
    onChange(id)
    if (!isDesktop) setOpen(false)
  }

  const groups = []
  NAV_ITEMS.forEach((it) => {
    let g = groups.find((x) => x.name === it.group)
    if (!g) { g = { name: it.group, items: [] }; groups.push(g) }
    g.items.push(it)
  })

  return (
    <>
      {!isDesktop && (
        <button className="sa-burger" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {open && !isDesktop && <div className="sa-scrim" onClick={() => setOpen(false)} />}

      <aside className={`sa-sidebar${open ? ' sa-open' : ''}`}>
        <div className="sa-brand">
          <div className="sa-brand-glyph" aria-hidden="true">
            <span style={{ height: '11px', opacity: 0.55 }}></span>
            <span style={{ height: '18px', opacity: 0.78 }}></span>
            <span style={{ height: '26px' }}></span>
          </div>
          <div className="sa-brand-wm">Sovereign<br />Architect</div>
          <div className="sa-brand-sub">Command Center</div>
          <div className="sa-brand-op"><span className="sa-op-dot"></span><b>David Smith</b> · Operator</div>
        </div>

        <nav className="sa-nav">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="sa-nav-group">{g.name}</div>
              {g.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`sa-nav-item${active === id ? ' active' : ''}`}
                  onClick={() => handleNav(id)}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sa-class-chip">
          <div className="sa-tele lbl">CLASS</div>
          <div className="cls">Sovereign Architect</div>
          <div className="sa-class-tiers" title="Attribute spread">
            {TIER_COLORS.map((c, i) => <i key={i} style={{ background: c }}></i>)}
          </div>
        </div>
        <button className="sa-signout" onClick={onSignOut}>
          <LogOut size={15} /> Sign out
        </button>
      </aside>
    </>
  )
}

function Topbar({ active, now, sov }) {
  const greet = greetingFor(now.getHours())
  const navItem = NAV_ITEMS.find((n) => n.id === active) || {}
  const st = statusFor(sov)
  const ctx = navItem.group ? `${navItem.group} · ${(navItem.label || '').toUpperCase()}` : 'DAILY DASHBOARD'
  const title = active === 'daily-dashboard' ? 'Command Center' : navItem.label

  return (
    <header className="sa-topbar">
      <div className="crumb">
        <div className="sa-tele ctx">{ctx}</div>
        <div className="ttl">{title}</div>
      </div>
      <div className="spacer"></div>
      <div className="sa-protocol-pill">
        <span className="dot"></span>
        <span className="sa-tele">PROTOCOL</span>
        <b style={{ fontSize: '12px' }}>{greet.g}</b>
      </div>
      <div className="sa-mini-sov" title="Sovereignty">
        <span className="sa-tele" style={{ color: 'var(--sa-ink-3)' }}>SOV</span>
        <div className="sa-mini-track"><div className="sa-mini-fill" style={{ width: `${sov}%`, background: st.color }}></div></div>
        <span className="sa-mini-val">{sov}%</span>
      </div>
      <div className="sa-clock">
        <div className="t">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="d sa-tele">{now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      </div>
    </header>
  )
}

function BrainPlaceholder() {
  return (
    <div className="sa-grid">
      <div className="col-12 sa-card" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="sa-card-icon" style={{ margin: '0 auto 18px', width: '52px', height: '52px' }}>
          <Brain size={26} />
        </div>
        <div className="sa-serif" style={{ fontSize: '30px', color: 'var(--sa-ink)' }}>The Brain</div>
        <p style={{ maxWidth: '46ch', margin: '12px auto 0', fontSize: '14px', lineHeight: 1.6, color: 'var(--sa-ink-2)' }}>
          Theo&rsquo;s daily brief lands here — what matters today, pulled from every connected source.
        </p>
        <div className="sa-tele" style={{ color: 'var(--sa-ink-3)', marginTop: '22px' }}>NEW SURFACE · COMING ONLINE</div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [active, setActive] = useState('daily-dashboard')
  const [now, setNow] = useState(new Date())
  const { sovereigntyLevel } = useGameState()

  useEffect(() => {
    getSession().then(s => setSession(s))
    const { data: { subscription } } = onAuthStateChange(s => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--sa-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sa-tele" style={{ color: 'var(--sa-ink-3)' }}>Loading…</div>
      </div>
    )
  }

  if (!session) return <LoginPage onLogin={() => getSession().then(s => setSession(s))} />

  const handleSignOut = async () => {
    await signOut()
    setSession(null)
  }

  return (
    <div className="sa-app">
      <Sidebar active={active} onChange={setActive} onSignOut={handleSignOut} />
      <div className="sa-main">
        <Topbar active={active} now={now} sov={sovereigntyLevel} />
        <div className="sa-content">
          {active === 'daily-dashboard' && <DailyDashboardPage />}
          {active === 'brain'           && <BrainPlaceholder />}
          {active === 'objectives'      && <ObjectivesPage />}
          {active === 'accomplishments' && <AccomplishmentsPage />}
          {active === 'meeting-notes'   && <MeetingNotesPage />}
          {active === 'company-finance' && <CompanyFinancePage />}
          {active === 'personal-finance' && <PersonalFinancePage />}
          {active === 'relationships'   && <RelationshipsPage />}
          {active === 'slack'           && <SlackPage />}
          {active === 'portfolio'       && <PortfolioPage />}
          {active === 'ideas'           && <IdeasPage />}
          {active === 'ecosystem'       && <EcosystemPage />}
        </div>
      </div>
    </div>
  )
}
