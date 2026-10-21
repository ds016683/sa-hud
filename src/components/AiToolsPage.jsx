// RESOURCES · AI TOOLS (10/21): the house tooling a session or a teammate can
// pick up. One pill for now, Skills Files: the deck skills in their two skins,
// each with the SKILL.md, the HTML template mini-app, the whole skill as a zip
// (unzip into ~/.claude/skills/), and a PPTX template with the same tokens.
// Files are served from public/ai-tools/<skill>/.
import { useState } from 'react'
import { FileText, Download, ExternalLink, Presentation, Package, BookOpen } from 'lucide-react'
import { S, Eyebrow, Serif, Label, INK, INK2, GRAY, GOLD, PURPLE, BLUE, GREEN, MONO, PANEL_BORDER, PANEL_BG, LABEL, MUTED, TYPE } from './river/canon'

const PILLS = [{ id: 'skills', label: 'Skills Files' }]

const SKILLS = [
  {
    id: 'apnc-deck',
    name: 'APNC Deck',
    skin: 'The APNC Field Hub skin: white paper on warm canvas, one red, Geist. Light, not navy.',
    use: 'Any APNC talk, conference session, or proposal. In a Code session say "use apnc-deck" or "APNC skin".',
    swatches: ['#E8331C', '#1A1714', '#5B5650', '#F7F5F2', '#E8E3DD'],
    base: '/ai-tools/apnc-deck',
    pptx: 'APNC Deck Template.pptx',
    zip: 'apnc-deck-skill.zip',
    extras: [{ label: 'Outline Schema', file: 'outline.md' }],
  },
  {
    id: 'th-deck',
    name: 'Third Horizon Deck (CIP)',
    skin: 'The CIP Executive Summary frame: one navy surface, Lora story beats, Instrument Sans chrome, a single accent, gold for wayfinding only, the confidentiality footer on every slide.',
    use: 'Any Third Horizon deck, investor material, executive summary, or anything "in the TH frame". In a Code session say "use th-deck" or "on brand".',
    swatches: ['#0F2334', '#F3F1EA', '#9BC2E6', '#F8C761', '#57BE97'],
    base: '/ai-tools/th-deck',
    pptx: 'Third Horizon Deck Template.pptx',
    zip: 'th-deck-skill.zip',
    extras: [],
  },
]

const btn = (color, filled = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${filled ? color : `${color}88`}`, background: filled ? `${color}22` : 'transparent', color, textDecoration: 'none' })

function SkillCard({ k }) {
  const href = (f) => `${k.base}/${encodeURIComponent(f)}`
  return (
    <div style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: TYPE.meta, letterSpacing: '0.12em', textTransform: 'uppercase', color: LABEL }}>skill · {k.id}</span>
            <span style={{ display: 'inline-flex', gap: 4 }}>{k.swatches.map(c => <span key={c} title={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid rgba(255,255,255,0.18)' }} />)}</span>
          </div>
          <Serif size={20} style={{ color: INK, lineHeight: 1.3 }}>{k.name}</Serif>
          <div style={{ fontSize: TYPE.body, lineHeight: 1.6, color: INK2, marginTop: 8, maxWidth: 760 }}>{k.skin}</div>
          <div style={{ fontSize: TYPE.body, lineHeight: 1.6, color: MUTED, marginTop: 6, maxWidth: 760 }}>{k.use}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 16 }}>
        <div style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
          <Label style={{ fontSize: TYPE.subhead }}>PowerPoint Template</Label>
          <div style={{ fontSize: TYPE.meta + 1.5, color: MUTED, lineHeight: 1.5, marginBottom: 10 }}>16:9, the skin's theme colors and fonts, one finished example slide per archetype, a how-to note on every slide. Duplicate a slide, replace the words.</div>
          <a href={href(k.pptx)} download style={btn(PURPLE, true)}><Presentation size={12} /> Download PPTX</a>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
          <Label style={{ fontSize: TYPE.subhead }}>The Skill</Label>
          <div style={{ fontSize: TYPE.meta + 1.5, color: MUTED, lineHeight: 1.5, marginBottom: 10 }}>For Claude Code: unzip into ~/.claude/skills/ and the next session can use it by name. SKILL.md is the canon in words.</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <a href={href(k.zip)} download style={btn(GOLD)}><Package size={12} /> Skill Zip</a>
            <a href={href('SKILL.md')} target="_blank" rel="noreferrer" style={btn(INK2)}><BookOpen size={12} /> SKILL.md</a>
            {k.extras.map(x => <a key={x.file} href={href(x.file)} target="_blank" rel="noreferrer" style={btn(INK2)}><FileText size={12} /> {x.label}</a>)}
          </div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
          <Label style={{ fontSize: TYPE.subhead }}>HTML Template</Label>
          <div style={{ fontSize: TYPE.meta + 1.5, color: MUTED, lineHeight: 1.5, marginBottom: 10 }}>The self-contained deck mini-app the skill builds from: keyboard and hash navigation, notes, fullscreen, print to PDF. Open it to see the archetypes live.</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <a href={href('template.html')} target="_blank" rel="noreferrer" style={btn(BLUE)}><ExternalLink size={12} /> Open Template</a>
            <a href={href('template.html')} download style={btn(INK2)}><Download size={12} /> Download</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AiToolsPage() {
  const [pill, setPill] = useState('skills')
  return (
    <div style={S.page}>
      <Eyebrow>RESOURCES · AI TOOLS</Eyebrow>
      <h1 style={S.h1}>AI Tools</h1>
      <p style={S.sub}>the house tooling a session or a teammate can pick up</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0 22px' }}>
        {PILLS.map(p => (
          <button key={p.id} onClick={() => setPill(p.id)} style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${pill === p.id ? 'rgba(230,181,79,0.6)' : PANEL_BORDER}`, background: pill === p.id ? 'rgba(230,181,79,0.12)' : 'rgba(255,255,255,0.03)', color: pill === p.id ? GOLD : INK }}>{p.label}</button>
        ))}
      </div>
      {pill === 'skills' && (
        <>
          <div style={{ fontSize: TYPE.body, color: INK2, lineHeight: 1.6, maxWidth: 820, marginBottom: 16 }}>Two deck skins, packaged three ways: the Claude Code skill, the HTML template it builds from, and a PowerPoint template with the same tokens for anyone working in slides by hand.</div>
          {SKILLS.map(k => <SkillCard key={k.id} k={k} />)}
          <div style={{ fontSize: TYPE.meta + 1.5, color: GRAY, fontFamily: MONO }}>Fonts: Geist for APNC, Lora and Instrument Sans for Third Horizon, all free on Google Fonts. The PPTX falls back to Calibri and Georgia until they are installed.</div>
        </>
      )}
    </div>
  )
}
