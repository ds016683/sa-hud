const StatsPanel = () => {
  const stats = [
    { name: 'PERCEPTION', subtitle: 'Pattern Recognition', tier: 'S+', value: 95, color: 'bg-stat-s-plus' },
    { name: 'WILL', subtitle: 'Autonomy + Drive', tier: 'S', value: 90, color: 'bg-stat-s' },
    { name: 'AGENCY', subtitle: 'Decisive Force', tier: 'A+', value: 85, color: 'bg-stat-a-plus' },
    { name: 'CREATIVE ENTROPY', subtitle: 'Generative Chaos', tier: 'A+', value: 85, color: 'bg-stat-a-plus' },
    { name: 'RELATIONAL SENSITIVITY', subtitle: 'Human Attunement', tier: 'A', value: 75, color: 'bg-stat-a' },
    { name: 'ENDURANCE', subtitle: 'Sustainment & Completion', tier: 'C', value: 30, color: 'bg-stat-c' }
  ]

  const tierBg = {
    'S+': 'bg-red-100 text-red-700',
    'S': 'bg-orange-100 text-orange-700',
    'A+': 'bg-amber-100 text-amber-700',
    'A': 'bg-green-100 text-green-700',
    'C': 'bg-gray-100 text-game-text-muted',
  }

  return (
    <div className="game-panel">
      <h3 className="font-game text-lg text-game-gold mb-4">CORE ATTRIBUTES</h3>

      <div className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.name} className="group">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${tierBg[stat.tier] || tierBg['C']}`}>
                  {stat.tier}
                </span>
                <div>
                  <span className="text-sm font-bold text-game-text">{stat.name}</span>
                  <span className="text-xs text-game-text-muted ml-2">{stat.subtitle}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-game-text-muted">{stat.value}%</span>
            </div>

            <div className="stat-bar h-4">
              <div
                className={`stat-bar-fill ${stat.color} group-hover:opacity-90 transition-opacity`}
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-game-border text-xs text-game-text-muted italic">
        "You are not broken where you are low. You are specialized."
      </div>
    </div>
  )
}

export default StatsPanel
