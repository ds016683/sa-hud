import { useState, useEffect } from 'react'
import {
  LayoutGrid, Lightbulb, ScrollText, Network, Shield, LogOut, Menu, X
} from 'lucide-react'
import { getSession, onAuthStateChange, signOut } from './lib/auth'
import LoginPage from './components/LoginPage'
import HUD from './components/HUD'
import PortfolioPage from './components/PortfolioPage'
import TodoPage from './components/TodoPage'
import IdeasPage from './components/IdeasPage'
import EcosystemPage from './components/EcosystemPage'
import DailyBriefingsPage from './components/DailyBriefingsPage'

const NAV_ITEMS = [
  { id: 'portfolio', label: 'Portfolio',        icon: LayoutGrid },
  { id: 'ideas',     label: 'Ideas Pipeline',   icon: Lightbulb  },
  { id: 'todos',     label: 'Quests',           icon: ScrollText },
  { id: 'briefings', label: 'Daily Briefings',  icon: BookOpen   },
  { id: 'hud',       label: 'HUD',              icon: Shield     },
  { id: 'ecosystem', label: 'Ecosystem',         icon: Network    },
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

  const drawerVisible = open || isDesktop

  const handleNav = (id) => {
    onChange(id)
    if (!isDesktop) setOpen(false)
  }

  return (
    <>
      {/* Mobile hamburger */}
      {!isDesktop && (
        <button
          onClick={() => setOpen(!open)}
          className="fixed top-3.5 left-3.5 z-[1000] flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[#001A41] text-white shadow-lg hover:bg-[#003366] transition-all"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Mobile overlay */}
      {open && !isDesktop && (
        <div className="fixed inset-0 z-[998] bg-[#001A41]/45" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-[999] flex h-screen w-[260px] flex-col shadow-[4px_0_24px_rgba(0,0,0,0.3)] transition-transform duration-300 ${
          drawerVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, #001A41 0%, #00111F 100%)', fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* Header */}
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-white font-bold text-lg tracking-wide">COMMAND CENTER</div>
          <div className="text-white/50 text-xs tracking-widest mt-0.5">FOR DAVID SMITH</div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 py-4">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '0.9rem' }}
                className={`flex w-full items-center gap-3 border-none bg-transparent px-5 py-3.5 text-left font-medium transition-all ${
                  isActive
                    ? 'border-l-[3px] border-l-[#009DE0] bg-[#009DE0]/20 pl-[calc(1.25rem-3px)] text-[#009DE0]'
                    : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3">
          <button
            onClick={onSignOut}
            style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '0.85rem' }}
            className="flex w-full items-center gap-3 rounded-md border-none bg-transparent px-2 py-2 text-left text-white/50 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Desktop spacer */}
      {isDesktop && <div className="w-[260px] flex-shrink-0" />}
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [active, setActive] = useState('portfolio')

  useEffect(() => {
    getSession().then(s => setSession(s))
    const { data: { subscription } } = onAuthStateChange(s => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ color: '#8096B2', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  if (!session) return <LoginPage onLogin={() => getSession().then(s => setSession(s))} />

  const handleSignOut = async () => {
    await signOut()
    setSession(null)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F9FC', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <Sidebar active={active} onChange={setActive} onSignOut={handleSignOut} />
      <main style={{ flex: 1, minHeight: '100vh', overflowY: 'auto' }}>
        {active === 'portfolio'  && <PortfolioPage />}
        {active === 'ideas'      && <IdeasPage />}
        {active === 'todos'      && <TodoPage />}
        {active === 'hud'        && <HUD />}
        {active === 'ecosystem'  && <EcosystemPage />}
        {active === 'briefings'  && <DailyBriefingsPage />}
      </main>
    </div>
  )
}
