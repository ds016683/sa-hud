// The Collection Loop's fixed badge taxonomy. Earned by deterministic rules in
// /api/refresh (scorecard.badges); this file only knows how to present them.
// Tracks follow the Volume II growth paths: loot drops on completion and
// deployment, calm water is rewarded, crisis endurance never is.
import {
  Map as MapIcon, Network, CheckCircle2, Shield, Waves, Compass,
  Timer, Mail, BookOpen, Signal,
} from 'lucide-react'

export const BADGES = {
  'cartographer': { label: 'Cartographer', track: 'Master Architect', Icon: MapIcon, desc: 'Work deployed to other hands' },
  'leverage': { label: 'Leverage', track: 'Master Architect', Icon: Network, desc: 'Project tasks closed through the system' },
  'closer': { label: 'Closer', track: 'Master Architect', Icon: CheckCircle2, desc: 'Three or more completions banked' },
  'walling': { label: 'Walling', track: 'Integrated Sovereign', Icon: Shield, desc: 'A boundary held · not yours to carry' },
  'calm-water': { label: 'Calm Water', track: 'Integrated Sovereign', Icon: Waves, desc: 'Real completion, zero emergencies' },
  'prospector': { label: 'Prospector', track: 'Integrated Sovereign', Icon: Compass, desc: 'Every discovery triaged' },
  'deep-work': { label: 'Deep Work', track: 'Playbound Creator', Icon: Timer, desc: 'Four or more hours in the seat' },
  'correspondent': { label: 'Correspondent', track: 'Playbound Creator', Icon: Mail, desc: 'The inbox handled, not hoarded' },
  'chronicler': { label: 'Chronicler', track: 'Playbound Creator', Icon: BookOpen, desc: 'Three or more meetings banked as knowledge' },
  'clear-signal': { label: 'Clear Signal', track: 'Perception', Icon: Signal, desc: 'The day fully documented · notes, time, board, inbox' },
}

// Visibility tiers: how much of the day the Ledger could actually see.
// The grade scores the day; the tier qualifies how trustworthy the read is.
export const signalTier = (s) => {
  if (s == null) return null
  if (s >= 80) return { id: 'clear', label: 'Clear View', ring: 'solid', opacity: 1 }
  if (s >= 50) return { id: 'partial', label: 'Partial View', ring: 'dashed', opacity: 0.85 }
  if (s >= 25) return { id: 'dim', label: 'Dim View', ring: 'dashed', opacity: 0.55 }
  return { id: 'dark', label: 'Dark Water', ring: 'dotted', opacity: 0.35 }
}

export const milesGrade = (m) => {
  if (m == null) return null
  if (m >= 8.5) return 'S'
  if (m >= 6.5) return 'A'
  if (m >= 4.5) return 'B'
  if (m >= 2.5) return 'C'
  return 'D'
}
