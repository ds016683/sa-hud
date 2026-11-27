// Dev harness: the Gate Extracted yay with its done list, to check the list and the button keep to their own lines.
// ?n=<count> sets how many done lines show. Sample words only.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import { AwardYay } from '../src/components/river/AwardYay'
import { GateGlyph } from '../src/components/river/GatePage'

const n = Number(new URLSearchParams(window.location.search).get('n') || 1)
const DONE = [
  { tag: 'Final', text: 'Platform Modeling.xlsx' },
  { tag: 'Up', text: 'Growth Model, The Five Year Financial Forecast And Its Methods Exhibit' },
  { tag: 'New Gate', text: 'Choose The Round Structure For The Investment Page Before The Deck Is Read Through' },
  { tag: 'Routed', text: 'Ask about the yearly platform fee' },
].slice(0, n).map(x => ({ ...x, color: '#B4A3E8' }))

createRoot(document.getElementById('root')).render(<StrictMode>
  <AwardYay title="Gate Extracted" sub="Gate 3 · Price Increases And Enhancements On Carried Platforms" awards={[{ badge: 'gate', n: 1, miles: 7 }]} banked={null} done={DONE}
    go="Gate 4 · New Subscription Platforms Beyond Compass" onContinue={() => {}} keys={false} lead={<GateGlyph size={17} />}
    extra={<button type="button" className="yay-side" title="Load Gate 4 And Start The Clock"><GateGlyph size={20} /></button>} />
</StrictMode>)
