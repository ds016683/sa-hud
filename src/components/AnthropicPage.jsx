// Learning · Anthropic: a placeholder page, content to follow.
import { S, Eyebrow, Panel, Serif, Body } from './river/canon'
export default function AnthropicPage() {
  return (
    <div style={S.page}>
      <Eyebrow>LEARNING · ANTHROPIC</Eyebrow>
      <h1 style={S.h1}>Anthropic</h1>
      <p style={S.sub}>models, tools, and how this whole thing is built</p>
      <Panel style={{ marginTop: 18 }}><Serif size={18}>Blank for now</Serif><Body style={{ marginTop: 6 }}>This page fills in when we decide what belongs here: model notes, the Claude Code and connector setup, prompt patterns that work for Lumen.</Body></Panel>
    </div>
  )
}
