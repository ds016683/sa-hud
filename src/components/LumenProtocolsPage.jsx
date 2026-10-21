// SYSTEM · LUMEN PROTOCOLS (David 10/21): three pills, all information. Who Lumen
// is, the rules he holds (live from lumen_rules, plus the standing canon), and
// the mail protocols that govern his address. Nothing here edits; Lumen's rules
// change through Lumen (remember_rule), the persona through a session.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { S, Eyebrow, Serif, Label, INK, INK2, GRAY, GOLD, GREEN, RED, MONO, PANEL_BORDER, PANEL_BG, LABEL, MUTED, TYPE } from './river/canon'

const PILLS = [{ id: 'identity', label: 'Identity' }, { id: 'rules', label: 'Rules' }, { id: 'mail', label: 'Mail Protocols' }]

const Block = ({ title, children }) => (
  <div style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
    {title && <Label>{title}</Label>}
    <div style={{ fontSize: TYPE.body, lineHeight: 1.65, color: INK2 }}>{children}</div>
  </div>
)
const Li = ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>

function Identity() {
  return (
    <>
      <Block title="Who Lumen Is">
        Lumen is the one friend in the Jarvis construct: many pipes, one Ledger, one face, one friend. He is the continuous companion on the Ledger stack, written to David's own manual, and he carries the same memory across every channel.
      </Block>
      <Block title="Where He Lives">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li><b style={{ color: INK }}>WhatsApp</b>: the primary channel. Timers, close-outs, the morning and evening protocols, the board, mail and files, in conversation.</Li>
          <Li><b style={{ color: INK }}>The HUD</b>: the Command Center is his face. The River, the Board, the missions, Live Files, the Archive and the Cabinet are the same Ledger he reads and writes.</Li>
          <Li><b style={{ color: INK }}>Mail</b>: lumen@thirdhorizon.com, under the Mail Protocols on this page.</Li>
          <Li><b style={{ color: INK }}>Voice</b>: the talk door for hands-free turns from the Mac and the iPhone (Milestone 4 of Lumen Production shapes his voice).</Li>
        </ul>
      </Block>
      <Block title="What He Holds">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li>The Ledger: objectives, missions and milestones, clocks, miles, calendar, meetings, mail previews, the Cabinet, Live Files, the Archive.</Li>
          <Li>His own memory of every conversation with David, folded into durable notes, and the rules David gives him (the Rules pill).</Li>
          <Li>Hands: the Board (equip, holster, stash, extract, close out), the calendar, Harvest time, the mailbox and the web, documents and the Archive, and the daily close that mints the miles.</Li>
        </ul>
      </Block>
      <Block title="How He Speaks">
        Plain prose, shorter on WhatsApp, never an em dash, Title Case for labels, David's spelling of a name wins, his words carried verbatim for Polaris lines and Achieved. He asks once and never twice.
      </Block>
    </>
  )
}

const STANDING = [
  'One clock runs at a time. Equipping an item holsters every other clock.',
  'Three slots of planned work; a Bounty takes 1, a Contract 2, a Mythic 3; one Heavy at most. No stamina rule.',
  'Miles pay only on verified completion. Ad Hoc 1, Bounty 4, Contract 15, Mythic 50, a Main Mission milestone 10, a Main Mission 100.',
  'Main Missions and their milestones are David\'s. Agents never add them; agent work is Ad Hoc.',
  'Files ride with their item. A live file is on the Board only while its item is; close-outs surface and file what an item carries.',
  'Every mission steers by one line, the Polaris Objective, in David\'s words. Close-out asks once: is it true, what is different now.',
  'Canceled meetings: canceled by them credits the meeting; canceled by David does not.',
  'A follow-up Bounty closes on proof: a sent note in David\'s Sent Items.',
  'Processing pays: a milestone ruled downstream still closes for its miles; the idea goes to Future Development Ideas.',
  'Never an em dash. Verbatim source language for mission, vision, copy and data.',
]

function Rules() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let on = true
    supabase.from('lumen_rules').select('*').eq('active', true).order('created_at', { ascending: false }).then(({ data, error }) => { if (!on) return; if (error) setErr(error.message); else setRows(data || []) })
    return () => { on = false }
  }, [])
  return (
    <>
      <Block title="Rules David Has Given Lumen">
        <div style={{ fontSize: TYPE.meta + 1.5, color: MUTED, marginBottom: 10 }}>Live from the Ledger. Lumen adds one when David says remember this; forget this retires it.</div>
        {err && <div style={{ color: RED }}>Could not read the rules: {err}</div>}
        {rows && !rows.length && <div style={{ color: GRAY }}>No rules on record yet.</div>}
        {rows && rows.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {rows.map(r => <Li key={r.id}><span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: LABEL, marginRight: 8 }}>{r.kind || 'rule'}</span>{r.text}</Li>)}
          </ul>
        )}
      </Block>
      <Block title="Standing Canon">
        <ul style={{ margin: 0, paddingLeft: 18 }}>{STANDING.map((s, i) => <Li key={i}>{s}</Li>)}</ul>
      </Block>
    </>
  )
}

function Mail() {
  const chip = (c) => ({ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 6, border: `1px solid ${c}66`, color: c, background: `${c}14` })
  return (
    <>
      <Block title="Who May Write To Lumen">
        Only David and Topher, ever. Mail from anyone else, Dacia included, is never answered, whether they write Lumen directly, loop him on a thread, forward him a document, or ask him to set a meeting. It stays unread for David to see.
      </Block>
      <Block title="Two Triggers, In David's Words">
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <span style={chip(GOLD)}>@Lumen</span>
            <div style={{ marginTop: 8 }}>Directs Lumen without joining the thread. He does <b style={{ color: INK }}>not</b> respond to the message. He sends a new note to David alone, with the confirmation, the result, or the one question he needs, and what was received quoted under it. No one else is ever on that note.</div>
          </div>
          <div>
            <span style={chip(GREEN)}>LUMEN</span>
            <div style={{ marginTop: 8 }}>All caps, case sensitive. Invites Lumen into the thread directly. He replies in the thread, and the reply goes to David <b style={{ color: INK }}>only</b>, never to the others on it. Same standing rule: he can only respond to David.</div>
          </div>
          <div>
            <span style={chip(LABEL)}>no trigger</span>
            <div style={{ marginTop: 8 }}>A plain note to Lumen with nobody else on it is answered in place, to the sender. Anything with other people on it is handled like @Lumen.</div>
          </div>
        </div>
      </Block>
      <Block title="How It Runs">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li>The mail door sweeps lumen@thirdhorizon.com at 12 and 42 past each hour and answers up to three fresh notes per sweep.</Li>
          <Li>The trigger is read from the fresh part of the message, above any quoted history, so an old @Lumen deeper in a thread does not fire again.</Li>
          <Li>The door enforces the recipients. Lumen writes the substance; he cannot address anyone outside the allow list.</Li>
          <Li>Receipts, invoices and anything older than the mailbox going live are marked read and never answered.</Li>
        </ul>
      </Block>
      <Block title="Smoke Test">
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <Li>Send a thread with Topher and Lumen on it. In the fresh text write @Lumen and an instruction. Expect: no reply in the thread; a new note to you alone, your instruction quoted.</Li>
          <Li>Reply in a thread with others on it and write LUMEN with a question. Expect: a reply in the thread addressed to you only.</Li>
          <Li>Have someone outside the list write Lumen. Expect: silence.</Li>
        </ol>
      </Block>
    </>
  )
}

export default function LumenProtocolsPage() {
  const [pill, setPill] = useState('identity')
  return (
    <div style={S.page}>
      <Eyebrow>SYSTEM · LUMEN PROTOCOLS</Eyebrow>
      <h1 style={S.h1}>Lumen Protocols</h1>
      <p style={S.sub}>who he is, the rules he holds, and how his mail behaves</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0 22px' }}>
        {PILLS.map(p => (
          <button key={p.id} onClick={() => setPill(p.id)} style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${pill === p.id ? 'rgba(230,181,79,0.6)' : PANEL_BORDER}`, background: pill === p.id ? 'rgba(230,181,79,0.12)' : 'rgba(255,255,255,0.03)', color: pill === p.id ? GOLD : INK }}>{p.label}</button>
        ))}
      </div>
      {pill === 'identity' && <Identity />}
      {pill === 'rules' && <Rules />}
      {pill === 'mail' && <Mail />}
    </div>
  )
}
