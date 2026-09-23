// Learning · Machine Learning: a curriculum with a pill selector. Algebra is
// the only track with content so far; the rest are placeholders by design.
import { useState } from 'react'
import { S, Eyebrow, Panel, Serif, Body, Label, GRAY, GOLD, PANEL_BORDER, MONO } from './river/canon'

const TRACKS = [
  { id: 'algebra', label: 'Algebra', ready: true },
  { id: 'linear-algebra', label: 'Linear Algebra' },
  { id: 'calculus', label: 'Calculus' },
  { id: 'probability', label: 'Probability & Statistics' },
  { id: 'python', label: 'Python for ML' },
  { id: 'models', label: 'Models & Training' },
  { id: 'llms', label: 'LLMs & Agents' },
]

const ALGEBRA = [
  { unit: '1 · Expressions and equations', items: ['Variables, terms, coefficients', 'Order of operations', 'Solving linear equations in one variable', 'Word problems to equations'] },
  { unit: '2 · Functions', items: ['Function notation f(x)', 'Domain and range', 'Linear functions: slope, intercept', 'Graphing and reading graphs'] },
  { unit: '3 · Systems and inequalities', items: ['Two-variable systems: substitution, elimination', 'Inequalities and their graphs', 'Absolute value'] },
  { unit: '4 · Exponents and polynomials', items: ['Exponent rules', 'Polynomial arithmetic', 'Factoring', 'Quadratics: completing the square, the formula'] },
  { unit: '5 · Bridges to ML', items: ['Summation notation Σ', 'Vectors as lists of numbers', 'Why lines matter: the linear model y = wx + b', 'Error as a function: the first loss curve'] },
]

export default function LearningPage() {
  const [track, setTrack] = useState(() => { try { return localStorage.getItem('learn-track') || 'algebra' } catch { return 'algebra' } })
  const pick = (id) => { setTrack(id); try { localStorage.setItem('learn-track', id) } catch { /* no-op */ } }
  const cur = TRACKS.find(t => t.id === track) || TRACKS[0]
  return (
    <div style={S.page}>
      <Eyebrow>LEARNING · MACHINE LEARNING</Eyebrow>
      <h1 style={S.h1}>Machine Learning</h1>
      <p style={S.sub}>curriculum · one track at a time</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0 22px' }}>
        {TRACKS.map(t => (
          <button key={t.id} onClick={() => pick(t.id)} style={{
            fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${track === t.id ? 'rgba(230,181,79,0.6)' : PANEL_BORDER}`, background: track === t.id ? 'rgba(230,181,79,0.12)' : 'rgba(255,255,255,0.03)', color: track === t.id ? GOLD : (t.ready ? '#EAF1F8' : GRAY),
          }}>{t.label}</button>
        ))}
      </div>
      {cur.ready ? ALGEBRA.map(u => (
        <Panel key={u.unit} title={u.unit}>
          {u.items.map(i => <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'rgba(234,241,248,0.72)', padding: '4px 0' }}><span style={{ width: 12, height: 2, background: GOLD, marginTop: 9, flexShrink: 0 }} />{i}</div>)}
        </Panel>
      )) : (
        <Panel><Serif size={18}>{cur.label}</Serif><Body style={{ marginTop: 6 }}>Blank for now. This track fills in when we get to it.</Body><Label style={{ marginTop: 10 }}>placeholder</Label></Panel>
      )}
    </div>
  )
}
