// SYSTEM · LUMEN PROTOCOLS (David 10/21): three pills, all information. Who Lumen
// is, the rules he holds (live from lumen_rules, plus the standing canon), and
// the mail protocols that govern his address. Nothing here edits; Lumen's rules
// change through Lumen (remember_rule), the persona through a session.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { S, Eyebrow, Serif, Label, INK, INK2, GRAY, GOLD, GREEN, RED, MONO, PANEL_BORDER, PANEL_BG, LABEL, MUTED, TYPE, alpha } from './river/canon'

const PILLS = [{ id: 'identity', label: 'Identity' }, { id: 'rules', label: 'Rules' }, { id: 'mail', label: 'Mail Protocol' }, { id: 'editing', label: 'Editing Protocol' }, { id: 'briefing', label: 'Briefing Protocol' }, { id: 'remind', label: 'Remind Me Protocol' }]

const Block = ({ title, children }) => (
  <div style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
    {title && <Label>{title}</Label>}
    <div style={{ fontSize: TYPE.body, lineHeight: 1.65, color: INK2 }}>{children}</div>
  </div>
)
const Li = ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>

// His voice (David 11/12: "this should be lumen's permanent voice ... documented in the right place in the hud
// with the right build stack reference"). The voice itself is read live from the record Lumen speaks from, so
// this page never goes stale and no person's name sits in the source; the stack reference under it is fixed text.
const Row = ({ k, children }) => <Li><b style={{ color: INK }}>{k}</b>: {children}</Li>
const code = { fontFamily: MONO, fontSize: 12.5, color: INK }
function HisVoice() {
  const [rec, setRec] = useState(undefined)
  useEffect(() => {
    let alive = true
    // A signed link read past storage's cached copy, so a voice changed a minute ago shows as it is now.
    supabase.storage.from('project-files').createSignedUrl('lumen/voice.json', 120)
      .then(async ({ data, error }) => {
        if (error || !data?.signedUrl) throw new Error('no link')
        const r = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) throw new Error('not read')
        const j = await r.json(); if (alive) setRec(j)
      })
      .catch(() => alive && setRec(null))
    return () => { alive = false }
  }, [])
  const v = rec?.personas?.lumen
  const st = v?.settings || {}
  return (
    <>
      <Block title="His Voice">
        {rec === undefined && <span style={{ color: MUTED }}>Reading the voice record.</span>}
        {rec === null && <span style={{ color: MUTED }}>The voice record could not be read from here. Lumen falls back to the voice set in Vercel when that happens.</span>}
        {v && (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <Row k="Voice">{v.name}{v.kind ? ` (${v.kind})` : ''}</Row>
            {v.set_at && <Row k="Locked In">{String(v.set_at).slice(0, 10)}{v.set_by ? `. ${v.set_by}` : ''}</Row>}
            {v.source && <Row k="Made From">{v.source}</Row>}
            {v.consent && <Row k="Permission">{v.consent}</Row>}
            <Row k="Delivery">speed {st.speed ?? 1}, stability {st.stability ?? 0.5}, similarity {st.similarity ?? 0.8}, style {st.style ?? 0.15}</Row>
            <Row k="Speech Model">{v.model || 'eleven_multilingual_v2'} for voice notes and the talk door{v.live_model ? `, ${v.live_model} for the live desk session` : ''}</Row>
            <Row k="Voice Id"><span style={code}>{v.voice_id}</span></Row>
          </ul>
        )}
        {Array.isArray(rec?.kept) && rec.kept.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <b style={{ color: INK }}>Kept Close</b>: {rec.kept.map(k => k.name).join(', ')}. Saved in the same account, not in use.
          </div>
        )}
      </Block>
      <Block title="Voice Build Stack">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Row k="Provider">ElevenLabs. Text to speech for every spoken reply, Instant Voice Clone for a cloned voice, Voice Design and Remix for a designed one. The key is <span style={code}>ELEVENLABS_API_KEY</span> in Vercel on the sa-hud project.</Row>
          <Row k="The Record">Ledger storage, <span style={code}>project-files/lumen/voice.json</span>. One entry per persona: voice id, model, delivery settings, where the voice came from and the permission behind it. Lumen reads it each time he speaks (held for a minute), so changing the record changes his voice with no deploy. If it cannot be read, <span style={code}>ELEVENLABS_VOICE_ID</span> in Vercel still speaks.</Row>
          <Row k="Where He Speaks">WhatsApp voice notes (<span style={code}>api/lumen.mjs</span>), the talk door (<span style={code}>api/lumen-talk.mjs</span>), the live desk session (<span style={code}>api/lumen-realtime.mjs</span>). All three go through <span style={code}>speak()</span> and <span style={code}>voiceOf()</span> in <span style={code}>api/_wa.mjs</span>.</Row>
          <Row k="Voice Hands">In <span style={code}>api/_ledger.mjs</span>: voice_candidates and keep_voice (Lumen has these), clone_voice, voice_sample and remove_voice (a Claude Code session only, through <span style={code}>api/lumen-hud.mjs</span>). A clone is refused without the speaker&rsquo;s permission written down.</Row>
          <Row k="Records And Files">Clones and their permission lines: <span style={code}>project-files/lumen/voice-clones.json</span>. Designed candidates: <span style={code}>project-files/lumen/voice-candidates.json</span>. Audio in the Cabinet under Lumen, in Voice Samples and Voice Candidates.</Row>
          <Row k="To Change It">Tell a Claude Code session which saved voice and which delivery. It rewrites the record; nothing is deployed.</Row>
        </ul>
      </Block>
    </>
  )
}

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
          <Li><b style={{ color: INK }}>Voice</b>: voice notes on WhatsApp, the talk door for hands-free turns from the Mac and the iPhone, and the live desk session. His voice itself is under His Voice below.</Li>
        </ul>
      </Block>
      <Block title="What He Holds">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li>The Ledger: objectives, missions and milestones, clocks, miles, calendar, meetings, mail previews, the Cabinet, Live Files, the Archive.</Li>
          <Li>His own memory of every conversation with David, folded into durable notes, and the rules David gives him (the Rules pill).</Li>
          <Li>Hands: the Board (equip, holster, stash, extract, close out), the calendar, Harvest time, the mailbox and the web, documents and the Archive, and the daily close that mints the miles.</Li>
        </ul>
      </Block>
      <HisVoice />
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
  const chip = (c) => ({ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 6, border: `1px solid ${alpha(c, 40)}`, color: c, background: `${alpha(c, 8)}` })
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


function Editing() {
  const chip = (c) => ({ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 6, border: `1px solid ${alpha(c, 40)}`, color: c, background: `${alpha(c, 8)}` })
  return (
    <>
      <Block title="What It Is">
        The Editing Protocol is the house loop for rapid review of a living deliverable: a proposal deck, a platform page, a document. David drives; the session captures, builds, and proves. Every input he fires, a screenshot with commentary, a one-liner, a mid-turn interjection, becomes a numbered row on the Ledger punchlist. The session makes the change, verifies it, and closes the row with an Inspect record David can approve from the Punchlist pill on the item\u2019s Live Protocols pill. Approval is always his. Born on the AMA proposal, October 22, 2026, where it ran ninety-two rows to ship.
      </Block>
      <Block title="The Loop, Per Input">
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <Li><b style={{ color: INK }}>Capture first.</b> Each entry is one checkable change, David\u2019s meaning condensed to a line, before anything is built. Compound messages split into discrete rows.</Li>
          <Li><b style={{ color: INK }}>Build it.</b> House rules apply: sketch language machine-processed into crisp copy, qualified declaratives, Title Case labels, never an em dash, voice aimed at the reader.</Li>
          <Li><b style={{ color: INK }}>Verify it.</b> Typecheck or build, render the changed surface, check that the math or layout actually moved.</Li>
          <Li><b style={{ color: INK }}>Close it</b> with the three Inspect fields, written for a phone: what happened, where to look, what good looks like, plus a link.</Li>
          <Li><b style={{ color: INK }}>Flag instead of guessing.</b> An ambiguous or conflicting edit turns the row red with one crisp question. Never a silent guess.</Li>
        </ol>
      </Block>
      <Block title="Standing Rules Inside It">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li>Mid-turn messages are normal; they fold into the running batch like any other input.</Li>
          <Li>Batches commit separately, so the git log reads as the punchlist\u2019s receipt.</Li>
          <Li>Each batch deploys to a standing draft alias for review; production ships only on David\u2019s word.</Li>
          <Li>Inline prose passes run through the surface\u2019s Edit Text mode: each slide autosaves as David types, and the session folds the autosaves into source verbatim.</Li>
          <Li>Knock-on consistency edits ride with the row that triggered them and are named in its Inspect fields.</Li>
        </ul>
      </Block>
      <Block title="The Pieces">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li><span style={chip(GOLD)}>edit_punchlist</span> <span style={{ marginLeft: 8 }}>the Ledger table every row lives on, scoped to the item\u2019s objective.</span></Li>
          <Li><span style={chip(GREEN)}>punchlist.py</span> <span style={{ marginLeft: 8 }}>the capture helper: add, done, flag, list.</span></Li>
          <Li><span style={chip(LABEL)}>Punchlist pill</span> <span style={{ marginLeft: 8 }}>on the Mission Briefing: rows, Inspect popups, Approve, flagged rows in red.</span></Li>
          <Li><span style={chip(GOLD)}>editing-protocol skill</span> <span style={{ marginLeft: 8 }}>the loop in words, so any Code session runs it the same way.</span></Li>
        </ul>
      </Block>
      <Block title="How To Start One">
        Say \u201cediting protocol\u201d in a Code session, or just start firing edits at a deliverable and ask for the protocol. The session puts a focus on the Board, opens the round, and the Punchlist pill lights on the item\u2019s Mission Briefing. When the pass ends, the session reports what is done, flagged, and waiting on approval, and the deliverable ships on David\u2019s word.
      </Block>
    </>
  )
}

function Briefing() {
  const chip = (c) => ({ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 6, border: `1px solid ${alpha(c, 40)}`, color: c, background: `${alpha(c, 8)}` })
  return (
    <>
      <Block title="What It Is">
        The Briefing Protocol inverts the usual direction. David states one objective, a picture to complete (a meeting\u2019s notes and artifacts, a plan, a decision record), and the session takes charge until he ends it. It inventories what it can and cannot see, keeps the gap map itself, and pulls what it needs out of him one item at a time, never a list, so he is not the one mapping the work. Born on the MMA October 19 quarterly, October 23, 2026.
      </Block>
      <Block title="The Loop">
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <Li><b style={{ color: INK }}>Inventory first, silently.</b> The Ledger, the file store, the mailbox, Granola and the client tool. The gap map lands as Briefing rows on the item: the need, why it is needed, and who supplies it (David, a file, a tool).</Li>
          <Li><b style={{ color: INK }}>Open with the picture.</b> What I can see. What I cannot see. The first ask. Nothing else.</Li>
          <Li><b style={{ color: INK }}>One ask at a time.</b> The row marked as the current ask is the one that only David can supply and that unblocks the most. He answers in chat or straight from the pill; the session records it and asks the next.</Li>
          <Li><b style={{ color: INK }}>Rulings count.</b> \u201cLeave it\u201d, \u201cdefer to November 10\u201d, \u201cnot needed\u201d closes a row as ruled, with the ruling written where the gap was.</Li>
          <Li><b style={{ color: INK }}>Hand-offs are rows too.</b> An upload in a tool the session cannot write to, a photo on his phone: the ask names the place and the session hands him the file.</Li>
          <Li><b style={{ color: INK }}>Protocol off.</b> A four-line close: filled, ruled, left open with an owner, where the record lives. Then the session moves to what he named next.</Li>
        </ol>
      </Block>
      <Block title="Where It Shows">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li><span style={chip(GOLD)}>Live Protocols pill</span> <span style={{ marginLeft: 8 }}>on the item\u2019s Mission Briefing: the rows, the current ask, Answer and Rule in place.</span></Li>
          <Li><span style={chip(GOLD)}>Live Protocols window</span> <span style={{ marginLeft: 8 }}>on the Board beside Live Files: every item with a protocol on, its open count and the current ask.</span></Li>
          <Li><span style={chip(GOLD)}>briefing-protocol skill</span> <span style={{ marginLeft: 8 }}>the loop in words, so any Code session runs it the same way.</span></Li>
        </ul>
      </Block>
      <Block title="How To Start One">
        Say \u201cactivate the Briefing Protocol until \u2026\u201d with the objective in one sentence. The session puts a focus on the Board, writes the gap map, opens with the picture and the first ask, and ends every volley with the same progress line, a ten-block bar with the count and the percent (done and ruled both count; an answer that adds rows can move it down), so David can see where he is for his own energy. Say \u201cprotocol off\u201d to end it early.
      </Block>
    </>
  )
}

// The Remind Me Protocol (David 11/11, on a reply that closed with the open choices as a
// short numbered list: "hahahaha this is so awesome. we should call it the remind me protocol").
function RemindMe() {
  const chip = (c) => ({ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 6, border: `1px solid ${alpha(c, 40)}`, color: c, background: `${alpha(c, 8)}` })
  return (
    <>
      <Block title="What It Is">
        The Remind Me Protocol keeps what waits on David in front of him. He works many threads in one session and several sessions at once, and a decision asked once scrolls away. So the session carries the list: every reply closes with what still waits on him, one short numbered line each, until he rules. He never has to ask what he was supposed to decide. Born on the Side Mission Briefing build, November 11, 2026, from his ask to {'“'}keep them fresh on the turns so they{'’'}re top of mind.{'”'}
      </Block>
      <Block title="What Goes On The List">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li><b style={{ color: INK }}>A choice</b> the session made on its own judgment that he has not ruled on.</Li>
          <Li><b style={{ color: INK }}>A question</b> he has not answered.</Li>
          <Li><b style={{ color: INK }}>A hand-off</b> only he can do: a line to send Lumen, a secret to enter, a file to upload.</Li>
          <Li><b style={{ color: INK }}>Something he parked</b>: {'“'}come back to this in a bit.{'”'}</Li>
          <Li>Never the session{'’'}s own to-dos, status, or finished work. If the session can find the answer itself, it finds it.</Li>
        </ul>
      </Block>
      <Block title="The Loop">
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <Li><b style={{ color: INK }}>Raise it in full once.</b> The first time, the item gets its real explanation in the reply.</Li>
          <Li><b style={{ color: INK }}>Put it on the list.</b> One row in the Ledger: a line of about twelve words, shaped so a yes, a no, or a pick answers it. The detail stays behind the line.</Li>
          <Li><b style={{ color: INK }}>Close every reply with it.</b> The open rows, numbered, under the words Remind Me, even when the reply is about something else. Read from the Ledger, never from memory.</Li>
          <Li><b style={{ color: INK }}>Numbers never change.</b> A row keeps its number, so {'“'}4: yes{'”'} works three replies later.</Li>
          <Li><b style={{ color: INK }}>When he rules, close it and act.</b> The ruling is recorded in his words, the work follows, and the line leaves the list. {'“'}Leave it{'”'} and {'“'}drop it{'”'} are rulings.</Li>
        </ol>
      </Block>
      <Block title="Standing Rules Inside It">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li>Only David closes an item. The session never rules for him, never drops an item because it is old, and never reads silence as a yes.</Li>
          <Li>One line per item, every turn. No re-explaining and no nagging in the body of the reply; the list at the bottom is the whole reminder.</Li>
          <Li>Nothing is created from the list. An item is a question to David, not a task, a Side Mission or a milestone.</Li>
          <Li>With the Briefing Protocol on, its progress line is still the last line; the Remind Me list sits right above it.</Li>
          <Li>An empty list is silent.</Li>
        </ul>
      </Block>
      <Block title="The Pieces">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Li><span style={chip(GREEN)}>remind.py</span> <span style={{ marginLeft: 8 }}>the helper: add, rule, done, list, show.</span></Li>
          <Li><span style={chip(GOLD)}>edit_punchlist</span> <span style={{ marginLeft: 8 }}>the Ledger table the rows live on, named remind and keyed by the session, so the list survives a long session and a change of focus.</span></Li>
          <Li><span style={chip(GOLD)}>remind-me-protocol skill</span> <span style={{ marginLeft: 8 }}>the loop in words, so any Code session runs it the same way.</span></Li>
          <Li><span style={chip(LABEL)}>Lumen</span> <span style={{ marginLeft: 8 }}>follows the same protocol in his own threads by rule, and keeps his list in the conversation.</span></Li>
        </ul>
      </Block>
      <Block title="How To Start One">
        Say {'“'}remind me protocol{'”'}, {'“'}keep them fresh{'”'}, {'“'}keep that open{'”'}, or park something with {'“'}come back to this.{'”'} The list starts with that item and rides on every reply from there. Answer by number whenever it suits: {'“'}2: yes. 7: mark.{'”'}
      </Block>
    </>
  )
}

export default function LumenProtocolsPage() {
  const [pill, setPill] = useState('identity')
  return (
    <div style={S.page}>
      <Eyebrow>SYSTEM · PROTOCOLS</Eyebrow>
      <h1 style={S.h1}>Protocols</h1>
      <p style={S.sub}>the formal loops the house runs on: Lumen, the mail door, the editing floor, the briefing, and the remind me list</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0 22px' }}>
        {PILLS.map(p => (
          <button key={p.id} onClick={() => setPill(p.id)} style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${pill === p.id ? 'rgba(230,181,79,0.6)' : PANEL_BORDER}`, background: pill === p.id ? 'rgba(230,181,79,0.12)' : 'rgba(255,255,255,0.03)', color: pill === p.id ? GOLD : INK }}>{p.label}</button>
        ))}
      </div>
      {pill === 'identity' && <Identity />}
      {pill === 'rules' && <Rules />}
      {pill === 'mail' && <Mail />}
      {pill === 'editing' && <Editing />}
      {pill === 'briefing' && <Briefing />}
      {pill === 'remind' && <RemindMe />}
    </div>
  )
}
