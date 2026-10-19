// Clients (David, 10/19). A Client card gathers a client's Main Missions and
// its program timeline, drawn as a waterfall. Lanes are color assignments per
// client; the baseline lane carries the client's own plan and dates.
export const CLIENTS = [
  {
    key: 'Client.MMA',
    name: 'Marsh McLennan Agency',
    short: 'MMA',
    // Main Missions that belong to the client: by key family, or by name when a mission has no key.
    missionPrefix: 'Client.MMA',
    nameMatch: /\bMMA\b/,
    lanes: [
      { id: 'NetNav 2.0', color: '#A9C9E8', baseline: true },
      { id: 'Data Production', color: '#43D392' },
      { id: 'Regional Engagement', color: '#E6B54F' },
      { id: 'Dynamic Tooling Dev', color: '#B4A3E8' },
      { id: 'Static Tooling Dev', color: '#E8836F' },
    ],
  },
]

export const clientByKey = (key) => CLIENTS.find(c => c.key === key) || null
export const laneColor = (client, lane) => client?.lanes.find(l => l.id === lane)?.color || 'rgba(234,241,248,0.45)'
export const missionsOf = (client, projects) => (projects || []).filter(p =>
  (p.key && (p.key === client.missionPrefix || p.key.startsWith(client.missionPrefix + '.'))) ||
  (!p.key && client.nameMatch && client.nameMatch.test(p.name || '')))

export const STATUS_LABEL = { planned: 'Planned', in_motion: 'In Motion', done: 'Done' }
export const STATUS_ORDER = ['planned', 'in_motion', 'done']
