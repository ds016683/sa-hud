import { useState, useEffect } from 'react'
import { Shield, FolderKanban, ScrollText, Lightbulb, Network, LogOut } from 'lucide-react'
import HUD from './components/HUD'
import PortfolioPage from './components/PortfolioPage'
import TodoPage from './components/TodoPage'
import IdeasPage from './components/IdeasPage'
import EcosystemPage from './components/EcosystemPage'
import LoginPage from './components/LoginPage'
import { getSession, onAuthStateChange, signOut } from './lib/auth'
import './index.css'

const TABS = [
  { id: 'hud', label: 'HUD', icon: Shield },
  { id: 'portfolio', label: 'Portfolio', icon: FolderKanban },
  { id: 'todos', label: 'Quests', icon: ScrollText },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'ecosystem', label: 'Ecosystem', icon: Network },
]

function App() {
  const [activeTab, setActiveTab] = useState('hud')
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    // Check initial session
    getSession().then(s => setSession(s))

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((s) => {
      setSession(s)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    const s = await getSession()
    setSession(s)
  }

  const handleLogout = async () => {
    await signOut()
    setSession(null)
  }

  // Loading state
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#1E1033', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '2px' }}>
          LOADING...
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Authenticated - show full HUD
  return (
    <div className="min-h-screen w-full bg-game-dark">
      {/* Tab navigation */}
      <nav className="sticky top-0 z-40 bg-game-nav backdrop-blur-sm border-b border-game-nav/80"
           style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 items-center">
          <div className="flex gap-1 flex-1">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all rounded-md my-1.5 border-b-0 ${
                    isActive
                      ? 'bg-white text-game-nav font-bold shadow-sm'
                      : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-white/40 hover:text-white/80 transition-colors rounded-md hover:bg-white/10"
            title="Sign out"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      {activeTab === 'hud' && <HUD />}
      {activeTab === 'portfolio' && <PortfolioPage />}
      {activeTab === 'todos' && <TodoPage />}
      {activeTab === 'ideas' && <IdeasPage />}
      {activeTab === 'ecosystem' && <EcosystemPage />}
    </div>
  )
}

export default App