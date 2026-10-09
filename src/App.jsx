import { useState, useEffect } from 'react'
import {
  LayoutGrid, Network, LogOut, Menu, X, Target, Users,
  FileText, Wallet, CreditCard, ListChecks, Compass, Waves, CalendarDays, BookOpen, Activity, Award, Wrench, GraduationCap, Sparkles, Archive as ArchiveIcon, FolderOpen,
} from 'lucide-react'
import { getSession, onAuthStateChange, signOut } from './lib/auth'
import { statusFor } from './constants/saDesign'
import { fetchProtocolState } from './lib/protocol'
import useGameState from './hooks/useGameState'
import LoginPage from './components/LoginPage'
import ProjectsPage from './components/ProjectsPage'
import EcosystemPage from './components/EcosystemPage'
import MeetingNotesPage from './components/MeetingNotesPage'
import SideMissionsPage from './components/SideMissionsPage'
import ArchivePage from './components/ArchivePage'
import FileCabinetPage from './components/FileCabinetPage'
import RelationshipsPage from './components/RelationshipsPage'
import CompanyFinancePage from './components/CompanyFinancePage'
import PersonalFinancePage from './components/PersonalFinancePage'
import MHPIPage from './components/MHPIPage'
import LandingPage from './components/LandingPage'
import AgendaPage from './components/AgendaPage'
import NarrativePage from './components/NarrativePage'
import ActivityPage from './components/ActivityPage'
import AccomplishmentsPage from './components/AccomplishmentsPage'
import MaintenancePage from './components/MaintenancePage'
import LearningPage from './components/LearningPage'
import AnthropicPage from './components/AnthropicPage'

const NAV_ITEMS = [
  { id: 'river',            label: 'The River',             icon: Waves,          group: 'LANDING' },
  { id: 'agenda',           label: 'Board',                icon: CalendarDays,   group: 'MONITOR' },
  { id: 'narrative',        label: 'Narrative',             icon: BookOpen,       group: 'MONITOR' },
  { id: 'activity',         label: 'Activity',              icon: Activity,       group: 'MONITOR' },
  { id: 'accomplishments',  label: 'Accomplishments',       icon: Award,          group: 'MONITOR' },
  { id: 'notes',            label: 'Notes',                 icon: FileText,       group: 'MONITOR' },
  { id: 'main-missions',    label: 'Main Missions',         icon: LayoutGrid,     group: 'MISSION BOARD' },
  { id: 'side-missions',    label: 'Side Missions',         icon: Target,         group: 'MISSION BOARD' },
  { id: 'maintenance',      label: 'Maintenance',           icon: Wrench,         group: 'MISSION BOARD' },
  { id: 'archive',          label: 'Archive',               icon: ArchiveIcon,    group: 'MISSION BOARD' },
  { id: 'cabinet',          label: 'File Cabinet',          icon: FolderOpen,     group: 'MISSION BOARD' },
  { id: 'company-finance',  label: 'Third Horizon Finance', icon: Wallet,         group: 'RESOURCES' },
  { id: 'personal-finance', label: 'Personal Finance',      icon: CreditCard,     group: 'RESOURCES' },
  { id: 'network',          label: 'Network',               icon: Users,          group: 'RESOURCES' },
  { id: 'ecosystem',        label: 'Ecosystem',             icon: Network,        group: 'RESOURCES' },
  { id: 'mhpi',             label: 'MHPI',                  icon: Compass,        group: 'STRATEGY' },
  { id: 'learning',         label: 'Machine Learning',      icon: GraduationCap,  group: 'LEARNING' },
  { id: 'anthropic',        label: 'Anthropic',             icon: Sparkles,       group: 'LEARNING' },
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
          {/* White bamboo motif: two segmented stalks + leaves, one gold leaf */}
          <svg className="sa-brand-bamboo" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <g stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 31 V5" />
              <path d="M10.6 12.5 h2.8 M10.6 21 h2.8" strokeWidth="1.2" opacity="0.75" />
              <path d="M21 31 V12" opacity="0.8" />
              <path d="M19.7 20.5 h2.6" strokeWidth="1.2" opacity="0.6" />
              <path d="M12 9 C 8.5 7.5, 6.5 5.2, 5.5 2.8 C 9 3.2, 10.9 5.4, 12 9 Z" fill="rgba(255,255,255,0.9)" strokeWidth="0.6" />
              <path d="M21 15 C 24.2 13.8, 26.4 11.8, 27.6 9.4 C 24.2 9.7, 22.2 11.7, 21 15 Z" fill="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            </g>
            <path d="M12 17.5 C 15 16.5, 17 14.8, 18.2 12.6 C 15.1 12.9, 13.2 14.6, 12 17.5 Z" fill="#F8C761" stroke="#F8C761" strokeWidth="0.6" opacity="0.95" />
          </svg>
          <div className="sa-brand-wm">Sovereign<br />Architect</div>
          <div className="sa-brand-sub">Command Center</div>
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

        <button className="sa-signout" onClick={onSignOut}>
          <LogOut size={15} /> Sign out
        </button>
      </aside>
    </>
  )
}

// The protocol pill reads what David is doing from the Ledger every 30s.
function useProtocol() {
  const [p, setP] = useState(null)
  useEffect(() => {
    let alive = true
    const pull = () => fetchProtocolState().then(x => { if (alive) setP(x) }).catch(() => {})
    const t0 = setTimeout(pull, 50)
    const t = setInterval(pull, 30_000)
    const onFocus = () => pull()
    window.addEventListener('focus', onFocus)
    return () => { alive = false; clearTimeout(t0); clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [])
  return p
}

function Topbar({ active, now, sov, onBack }) {
  const proto = useProtocol()
  const navItem = NAV_ITEMS.find((n) => n.id === active) || {}
  const st = statusFor(sov)
  const ctx = navItem.group
    ? (navItem.group === (navItem.label || '').toUpperCase()
        ? navItem.group
        : `${navItem.group} · ${(navItem.label || '').toUpperCase()}`)
    : 'DAILY MONITOR'
  const title = navItem.label || 'Command Center'

  return (
    <header className="sa-topbar">
      {active !== 'river' && (
        <button onClick={onBack} title="Back" aria-label="Back" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 14, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)', color: 'rgba(234,241,248,0.85)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)',
        }}>← Back</button>
      )}
      <div className="crumb">
        <div className="sa-tele ctx">{ctx}</div>
        <div className="ttl">{title}</div>
      </div>
      <div className="spacer"></div>
      <div className="sa-protocol-pill" title={proto ? `${proto.title}${proto.detail ? ` · ${proto.detail}` : ''}` : 'reading the Ledger'} style={{ borderColor: proto ? `${proto.color}66` : undefined, maxWidth: 420 }}>
        <span className="dot" style={{ background: proto?.color, boxShadow: proto && proto.id !== 'off' ? `0 0 0 3px ${proto.color}33` : 'none', animation: proto?.blink ? 'rcblink 1s ease-in-out infinite' : 'none' }}></span>
        <span className="sa-tele">PROTOCOL</span>
        <b style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{proto ? proto.label : '…'}</b>
        {proto && proto.id !== 'off' && <span style={{ fontSize: 11, color: 'rgba(234,241,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>· {proto.title}</span>}
        {proto?.pct != null && <span style={{ display: 'inline-block', width: 54, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginLeft: 6 }}><span style={{ display: 'block', width: `${proto.pct}%`, height: '100%', background: proto.color }} /></span>}
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

export default function App() {
  const [session, setSession] = useState(undefined)
  // Hash routing so the browser's back and forward work between pages.
  // #/page or #/page/segment/segment: the page id first, deep-link params after
  // (main-missions/<projectId>/<tab>/<slug> opens a mission on a tab, on an artifact).
  const parseHash = () => {
    const parts = (window.location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean)
    const page = NAV_ITEMS.some(n => n.id === parts[0]) ? parts[0] : 'river'
    return { page, params: page === parts[0] ? parts.slice(1).map(decodeURIComponent) : [] }
  }
  const readHash = () => parseHash().page
  const [active, setActiveState] = useState(readHash)
  const [params, setParams] = useState(() => parseHash().params)
  const setActive = (id) => {
    if (id === active && !params.length) return
    try { window.history.pushState({ page: id }, '', `#/${id}`) } catch { /* no-op */ }
    setParams([])
    setActiveState(id)
  }
  // Route with segments, e.g. setRoute('main-missions', [projectId, 'artifacts', slug]).
  const setRoute = (id, segs = []) => {
    try { window.history.pushState({ page: id }, '', `#/${[id, ...segs.map(encodeURIComponent)].join('/')}`) } catch { /* no-op */ }
    setParams(segs)
    setActiveState(id)
  }
  const goBack = () => {
    if (window.history.state && window.history.state.page) window.history.back()
    else setActive('river')
  }
  useEffect(() => {
    const onPop = () => { const h = parseHash(); setParams(h.params); setActiveState(h.page) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const [now, setNow] = useState(new Date())
  const gameState = useGameState()

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
      <div className={`sa-main sa-surface-dark${active === 'ecosystem' ? '' : ' sa-dark-scroll'}`}>
        <Topbar active={active} now={now} sov={gameState.sovereigntyLevel} onBack={goBack} />
        <div className="sa-content">
          {active === 'river'            && <LandingPage onNavigate={setActive} />}
          {active === 'agenda'           && <AgendaPage onNavigate={setRoute} />}
          {active === 'narrative'        && <NarrativePage />}
          {active === 'activity'         && <ActivityPage />}
          {active === 'accomplishments'  && <AccomplishmentsPage />}
          {active === 'notes'            && <MeetingNotesPage />}
          {active === 'main-missions'    && <ProjectsPage deepLink={params} onNavigate={setRoute} />}
          {active === 'side-missions'    && <SideMissionsPage onNavigate={setRoute} />}
          {active === 'maintenance'      && <MaintenancePage deepLink={params} />}
          {active === 'archive'          && <ArchivePage />}
          {active === 'cabinet'          && <FileCabinetPage />}
          {active === 'company-finance'  && <CompanyFinancePage />}
          {active === 'personal-finance' && <PersonalFinancePage />}
          {active === 'network'          && <RelationshipsPage />}
          {active === 'ecosystem'        && <EcosystemPage />}
          {active === 'mhpi'             && <MHPIPage />}
          {active === 'learning'         && <LearningPage />}
          {active === 'anthropic'        && <AnthropicPage />}
        </div>
      </div>
    </div>
  )
}
