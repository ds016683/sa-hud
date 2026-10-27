// LANDING · JOURNEY (David 10/27): a standing space that keeps track of his
// journey, the part of the HUD that is linked to the manual, the River, Vela.
// Structure comes later, on his word. For now the space exists, and it points
// at the pieces it belongs to. Nothing here is logged or scored.
import { Waves, BookOpen, Compass, Sparkles, Moon } from 'lucide-react'
import { S, Eyebrow, Panel, Serif, Body, Label, INK, INK2, MUTED, PANEL_BORDER, PANEL_BG, MONO, GOLD, alpha } from './river/canon'

const LINKS = [
  { icon: BookOpen, title: 'The Manual', note: 'The Sovereign Architect volumes: the class, the loop phases, the skills, the growth paths, Rapids to Open Water. Lives in the David Vault under Lumen OS. The HUD carries only the operational vocabulary.', where: 'David Vault · Lumen OS · Agents · vela' },
  { icon: Waves, title: 'The River', note: 'The landing: miles, the badges, the day hands, the Narrative. Where the journey shows as motion.', nav: 'river' },
  { icon: Sparkles, title: 'Vela', note: 'The personal OS coach. Folded into Lumen on September 27, so one being holds the whole picture. Her source files stay in the Vault.', where: 'David Vault · Lumen OS · Agents · vela' },
  { icon: Compass, title: 'Narrative and Analytics', note: 'The day read back, the printed Narrative, the analytics over the Ledger.', nav: 'narrative' },
  { icon: Moon, title: 'Release', note: 'The manual’s phase for letting go. The personal timers on the Board, tracked only here.', nav: 'agenda' },
]

function LinkCard({ item, onNavigate }) {
  const Icon = item.icon
  const clickable = !!item.nav && !!onNavigate
  return (
    <div onClick={clickable ? () => onNavigate(item.nav) : undefined} style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, borderRadius: 12, padding: '16px 18px', cursor: clickable ? 'pointer' : 'default', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: alpha(GOLD, 14), color: GOLD }}><Icon size={14} /></span>
        <Label style={{ marginBottom: 0 }}>{item.title}</Label>
      </div>
      <Body>{item.note}</Body>
      <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: clickable ? GOLD : MUTED }}>{clickable ? 'Open' : item.where}</div>
    </div>
  )
}

export default function JourneyPage({ onNavigate }) {
  return (
    <div style={S.page}>
      <Eyebrow>LANDING · JOURNEY</Eyebrow>
      <h1 style={S.h1}>Journey</h1>
      <p style={S.sub}>the part of the house that keeps track of where David is going</p>
      <Panel style={{ marginTop: 18 }}>
        <Serif size={18}>A space held open</Serif>
        <Body style={{ marginTop: 6 }}>This page keeps track of the journey itself, the part the manual describes and the River measures. Its structure gets worked out with David at a sitting of its own. Until then it stands here, linked to the pieces it belongs to, so nothing about the journey has to live in a mission card or a note.</Body>
      </Panel>
      <Label style={{ marginTop: 22 }}>Linked To</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {LINKS.map(l => <LinkCard key={l.title} item={l} onNavigate={onNavigate} />)}
      </div>
      <div style={{ marginTop: 22, fontSize: 12.5, color: INK2, lineHeight: 1.6, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
        <span style={{ color: INK, fontWeight: 600 }}>What goes here later.</span> The phases as David moves through them, the moments worth keeping, the revelations, and the thread back to the volumes. Nothing on this page earns miles. It is the record, not the game.
      </div>
    </div>
  )
}
