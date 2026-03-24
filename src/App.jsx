import { useState } from 'react'
import { Shield, FolderKanban, ScrollText } from 'lucide-react'
import HUD from './components/HUD'
import PortfolioPage from './components/PortfolioPage'
import TodoPage from './components/TodoPage'
import useSync from './hooks/useSync'
import './index.css'

const TABS = [
  { id: 'hud', label: 'HUD', icon: Shield },
  { id: 'portfolio', label: 'Portfolio', icon: FolderKanban },
  { id: 'todos', label: 'Quests', icon: ScrollText },
]

function App() {
  const [activeTab, setActiveTab] = useState('hud')
  const sync = useSync()

  return (
    <div className="min-h-screen w-full bg-game-darker">
      {/* Tab navigation */}
      <nav className="sticky top-0 z-40 bg-game-darker/95 backdrop-blur-sm border-b border-game-border/50">
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
                    ? 'text-game-gold border-game-gold'
                    : 'text-game-text-dim border-transparent hover:text-game-text-muted hover:border-game-border'
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
    </div>
  )
}

export default App
