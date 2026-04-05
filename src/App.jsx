import { useState } from 'react'
import { Shield, FolderKanban, ScrollText, Lightbulb, Network } from 'lucide-react'
import HUD from './components/HUD'
import PortfolioPage from './components/PortfolioPage'
import TodoPage from './components/TodoPage'
import IdeasPage from './components/IdeasPage'
import EcosystemPage from './components/EcosystemPage'
import useSync from './hooks/useSync'
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
  const sync = useSync()

  return (
    <div className="min-h-screen w-full bg-game-dark">
      {/* Tab navigation — dark nav bar */}
      <nav className="sticky top-0 z-40 bg-game-nav backdrop-blur-sm border-b border-game-nav/80"
           style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 ${
                  isActive
                    ? 'text-white/80 border-violet-400'
                    : 'text-game-text-dim border-transparent hover:text-white hover:border-white/20'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Content */}
      {activeTab === 'hud' && <HUD sync={sync} />}
      {activeTab === 'portfolio' && <PortfolioPage sync={sync} />}
      {activeTab === 'todos' && <TodoPage sync={sync} />}
      {activeTab === 'ideas' && <IdeasPage sync={sync} />}
      {activeTab === 'ecosystem' && <EcosystemPage />}
    </div>
  )
}

export default App
