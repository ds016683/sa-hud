import { useState } from 'react'
import { FolderTree, Network, Activity } from 'lucide-react'
import EcosystemFileTree from '../components/EcosystemFileTree'
import EcosystemMap from '../components/EcosystemMap'
import EcosystemStatus from '../components/EcosystemStatus'

const NAVY = '#002C77'
const SKY = '#009DE0'
const BORDER = '#E2E8F0'
const PANEL = '#FFFFFF'
const TEXT = '#002C77'
const TEXT_MUTED = '#334E85'

const MODES = [
  { id: 'tree',   label: 'File Tree',     icon: FolderTree, sub: 'Lumen OS vault' },
  { id: 'map',    label: 'Ecosystem Map', icon: Network,    sub: 'Visual org / domains' },
  { id: 'status', label: 'Agent Status',  icon: Activity,   sub: 'Live deployment state' },
]

const LS_KEY = 'sa-hud.ecosystem.mode'

export default function Ecosystem() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || 'tree' } catch { return 'tree' }
  })
  const change = (id) => {
    setMode(id)
    try { localStorage.setItem(LS_KEY, id) } catch {}
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: 0 }}>HUD · Ecosystem</h1>
        <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
          Third Horizon · Lumen OS multi-agent fleet
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {MODES.map(({ id, label, icon: Icon, sub }) => {
          const active = mode === id
          return (
            <button
              key={id}
              onClick={() => change(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px',
                background: active ? NAVY : PANEL,
                color: active ? 'white' : TEXT_MUTED,
                border: `1px solid ${active ? NAVY : BORDER}`,
                borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 600, textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={18} />
              <div style={{ lineHeight: 1.2 }}>
                <div>{label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Body */}
      {mode === 'tree'   && <EcosystemFileTree />}
      {mode === 'map'    && <EcosystemMap />}
      {mode === 'status' && <EcosystemStatus />}
    </div>
  )
}
