// Dev harness: what a badly saved artifact field does to the Artifacts tab, no sign-in.
// Left: Lumen's character-map next_steps (the 10/26 wall) read through textOf.
// Right: an object rendered as a child inside the artifact boundary, caught and shown.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import { textOf, ArtifactBoundary } from '../src/components/river/ArtifactsTab'
import { INK, INK2, GRAY, MONO, SERIF, Label } from '../src/components/river/canon'

const charMap = (s) => Object.fromEntries([...s].map((c, i) => [String(i), c]))
const corrupted = [charMap('Fold the Weekly Finance Review\'s cash view into the 2026 season once a checkpoint copy is picked.'), charMap('Ask Greg how the live pro forma\'s 2026 total squares with the books through September.'), 'A plain string passes through.']

function Bad() { return <div>{{ 0: 'a', 1: 'b', 2: 'c' }}</div> }

function App() {
  return (
    <div style={{ background: 'var(--hud-surface)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 28, color: INK, fontFamily: 'Instrument Sans, system-ui, sans-serif', display: 'grid', gap: 28 }}>
        <div style={{ fontFamily: SERIF, fontSize: 22 }}>A badly saved artifact field, read and contained</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <Label>What the Frame Would Pull, through textOf</Label>
            {corrupted.map((x, i) => <div key={i} style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>{i + 1}. {textOf(x)}</div>)}
            <div style={{ fontFamily: MONO, fontSize: 10, color: GRAY, marginTop: 10 }}>the first two entries are objects keyed 0, 1, 2 ... as Lumen saved them</div>
          </div>
          <div>
            <Label>An object rendered as a child, inside the boundary</Label>
            <ArtifactBoundary resetKey="h"><Bad /></ArtifactBoundary>
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>dev harness · no sign-in · dev/artifacts.html</div>
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

export default App
