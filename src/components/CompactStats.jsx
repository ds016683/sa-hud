const CompactStats = () => {
  const stats = [
    { name: 'PERCEPTION', tier: 'S+', value: 95, color: 'bg-stat-s-plus' },
    { name: 'WILL', tier: 'S', value: 90, color: 'bg-stat-s' },
    { name: 'AGENCY', tier: 'A+', value: 85, color: 'bg-stat-a-plus' },
    { name: 'CREATIVE ENTROPY', tier: 'A+', value: 85, color: 'bg-stat-a-plus' },
    { name: 'RELATIONAL', tier: 'A', value: 75, color: 'bg-stat-a' },
    { name: 'ENDURANCE', tier: 'C', value: 30, color: 'bg-stat-c' }
  ]

  return (
    <div className="game-panel p-2 h-full flex flex-col">
      <h3 className="font-game text-xs text-game-gold mb-2">CORE ATTRIBUTES</h3>

      <div className="space-y-2 flex-1 flex flex-col justify-around">
        {stats.map((stat) => (
          <div key={stat.name}>
            <div className="flex justify-between items-center mb-0.5">
              <div className="flex items-center gap-1">
                <span className={`
                  px-1 py-0.5 text-[9px] font-bold rounded
                  ${stat.tier === 'S+' || stat.tier === 'S' ? 'bg-red-600 text-white' : ''}
                  ${stat.tier.startsWith('A') ? 'bg-yellow-600 text-white' : ''}
                  ${stat.tier === 'C' ? 'bg-gray-600 text-white' : ''}
                `}>
                  {stat.tier}
                </span>
                <span className="text-[10px] font-medium text-game-text-dim">{stat.name}</span>
              </div>
              <span className="text-[10px] font-bold text-game-text-dim">{stat.value}</span>
            </div>

            <div className="stat-bar h-2">
              <div
                className={`stat-bar-fill ${stat.color}`}
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CompactStats
