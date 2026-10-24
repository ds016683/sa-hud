import { useState, useEffect, useCallback, useMemo } from 'react'
import { Hash, Lock, MessageCircle, Users, Send, Check, Archive, ExternalLink, AtSign, Inbox, Paperclip, RefreshCw, X, BookOpen, Eraser } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BLUE, GOLD, GRAY, GREEN, INK, INK2, NAVY_DEEP, PANEL_BG, PANEL_BORDER, RED } from './river/canon'

const S = {
  page: { maxWidth: 1400, margin: '0 auto', padding: '24px 16px', fontFamily: 'inherit' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  h1: { fontSize: 20, fontWeight: 700, color: INK, margin: 0 },
  sub: { fontSize: 13, color: INK2, margin: '2px 0 0' },
  refreshBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: PANEL_BG, color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  filterBtn: (active) => ({
    padding: '5px 14px', borderRadius: 9999, border: '1px solid', fontSize: 12, cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: active ? 600 : 500,
    background: active ? INK : NAVY_DEEP,
    color: active ? NAVY_DEEP : INK2,
    borderColor: active ? INK : PANEL_BORDER,
    display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
  }),
  body: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' },
  bodyOneCol: { display: 'block' },
  list: { background: PANEL_BG, borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, overflow: 'hidden', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' },
  row: (selected, unread) => ({
    padding: '12px 16px',
    borderBottom: `1px solid ${PANEL_BG}`,
    cursor: 'pointer',
    background: selected ? 'rgba(0,157,224,0.08)' : (unread ? NAVY_DEEP : NAVY_DEEP),
    borderLeft: selected ? `3px solid ${BLUE}` : '3px solid transparent',
    transition: 'background 0.1s',
  }),
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  channelTag: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: INK, background: PANEL_BG, padding: '2px 7px', borderRadius: 4, border: `1px solid ${PANEL_BORDER}`, whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' },
  mentionDot: { width: 8, height: 8, borderRadius: '50%', background: GOLD, flexShrink: 0 },
  rowMeta: { fontSize: 11, color: INK2, marginLeft: 'auto', whiteSpace: 'nowrap' },
  rowAuthor: { fontSize: 13, fontWeight: 700, color: INK },
  rowPreview: (unread) => ({ fontSize: 13, color: unread ? INK : GRAY, lineHeight: 1.4, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
  empty: { padding: 40, textAlign: 'center', color: INK2, fontSize: 13 },
  detail: { background: PANEL_BG, borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, padding: 20, position: 'sticky', top: 16 },
  detailHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  detailTitle: { fontSize: 15, fontWeight: 700, color: INK, margin: 0, lineHeight: 1.4 },
  detailMeta: { fontSize: 12, color: INK2, marginTop: 4 },
  detailText: { fontSize: 14, color: INK, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '12px 0', borderTop: `1px solid ${PANEL_BG}`, borderBottom: `1px solid ${PANEL_BG}`, margin: '12px 0' },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  actionBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: PANEL_BG, color: INK2, border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: BLUE, color: NAVY_DEEP, border: `1px solid ${INK}`, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  actionBtnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: BLUE, color: NAVY_DEEP, border: `1px solid ${INK}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  replyArea: { marginTop: 8 },
  replyLabel: { fontSize: 11, color: INK2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  textarea: { width: '100%', minHeight: 80, maxHeight: 240, padding: 10, fontSize: 13, fontFamily: 'inherit', border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', color: INK },
  replyFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  replyHint: { fontSize: 11, color: INK2 },
  sendBtn: (disabled) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: disabled ? PANEL_BORDER : BLUE, color: NAVY_DEEP, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }),
  toast: (kind) => ({ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: NAVY_DEEP, background: kind === 'err' ? RED : GREEN, boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }),
}

const FILTERS = [
  { id: 'unread',   label: 'Unread',   icon: Inbox    },
  { id: 'mentions', label: 'Mentions', icon: AtSign   },
  { id: 'dms',      label: 'DMs',      icon: MessageCircle },
  { id: 'channels', label: 'Channels', icon: Hash     },
  { id: 'files',    label: 'Files',    icon: Paperclip },
  { id: 'all',      label: 'All',      icon: null     },
  { id: 'archived', label: 'Archived', icon: Archive  },
]

function relTime(ts) {
  // Absolute CT timestamp. Today: "3:42 PM CT". Older: "May 22, 3:42 PM CT".
  // Last year+: "May 22, 2025, 3:42 PM CT".
  const d = new Date(ts)
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  const sameDay = d.toDateString() === now.toDateString()
  const opts = sameDay
    ? { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }
    : sameYear
      ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }
      : { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }
  return d.toLocaleString('en-US', opts) + ' CT'
}

function channelIcon(type) {
  if (type === 'im') return MessageCircle
  if (type === 'mpim') return Users
  if (type === 'group') return Lock
  return Hash
}

export default function SlackPage() {
  const [filter, setFilter] = useState('unread')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [markReadOnSend, setMarkReadOnSend] = useState(true)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, kind = 'ok') => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('slack_messages')
      .select('id,workspace_id,workspace_name,channel_id,channel_name,channel_type,thread_ts,user_name,user_id,ts,text,body_preview,has_mention,has_files,permalink,read_at,archived_at,replied_at')
      .order('ts', { ascending: false })
      .limit(300)

    if (filter === 'unread')   q = q.is('read_at', null).is('archived_at', null)
    if (filter === 'mentions') q = q.eq('has_mention', true).is('archived_at', null)
    if (filter === 'dms')      q = q.in('channel_type', ['im', 'mpim']).is('archived_at', null)
    if (filter === 'channels') q = q.in('channel_type', ['channel', 'group']).is('archived_at', null)
    if (filter === 'files')    q = q.eq('has_files', true).is('archived_at', null)
    if (filter === 'all')      q = q.is('archived_at', null)
    if (filter === 'archived') q = q.not('archived_at', 'is', null)

    const { data, error } = await q
    if (error) {
      showToast(`Load error: ${error.message}`, 'err')
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 30000) // refresh every 30s
    return () => clearInterval(t)
  }, [load])

  const counts = useMemo(() => {
    return rows.reduce((acc, r) => {
      acc.total++
      if (!r.read_at) acc.unread++
      if (r.has_mention) acc.mentions++
      return acc
    }, { total: 0, unread: 0, mentions: 0 })
  }, [rows])

  const markRead = async (row) => {
    if (row.read_at) return
    const { error } = await supabase
      .from('slack_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) { showToast(`Mark read failed: ${error.message}`, 'err'); return }
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r))
    if (selected?.id === row.id) setSelected({ ...selected, read_at: new Date().toISOString() })
  }

  const markUnread = async (row) => {
    const { error } = await supabase
      .from('slack_messages')
      .update({ read_at: null })
      .eq('id', row.id)
    if (error) { showToast(`Mark unread failed: ${error.message}`, 'err'); return }
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, read_at: null } : r))
    if (selected?.id === row.id) setSelected({ ...selected, read_at: null })
  }

  const archive = async (row) => {
    const { error } = await supabase
      .from('slack_messages')
      .update({ archived_at: new Date().toISOString(), read_at: row.read_at || new Date().toISOString() })
      .eq('id', row.id)
    if (error) { showToast(`Archive failed: ${error.message}`, 'err'); return }
    setRows(rs => rs.filter(r => r.id !== row.id))
    if (selected?.id === row.id) setSelected(null)
    showToast('Archived')
  }

  const unarchive = async (row) => {
    const { error } = await supabase
      .from('slack_messages')
      .update({ archived_at: null })
      .eq('id', row.id)
    if (error) { showToast(`Unarchive failed: ${error.message}`, 'err'); return }
    showToast('Unarchived')
    load()
  }

  // "Clear" = mark read AND archive in one click. Single-action triage verb.
  const clear = async (row) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('slack_messages')
      .update({ read_at: row.read_at || now, archived_at: now })
      .eq('id', row.id)
    if (error) { showToast(`Clear failed: ${error.message}`, 'err'); return }
    setRows(rs => rs.filter(r => r.id !== row.id))
    if (selected?.id === row.id) setSelected(null)
    showToast('Cleared')
  }

  // Save current message into daily_notes with a Slack permalink back-ref.
  const saveToNotes = async (row) => {
    if (!row) return
    const title = `${row.channel_name} — ${row.user_name}`
    const body = row.body_full || row.body_preview || ''
    const payload = {
      title,
      body,
      source_type: 'slack',
      source_url: row.permalink || null,
      source_ref: row.id,
      channel_name: row.channel_name,
      author_name: row.user_real_name || row.user_name,
      author_ts: row.ts,
      tags: ['slack', row.channel_name].filter(Boolean),
    }
    const { error } = await supabase.from('daily_notes').insert([payload])
    if (error) {
      if (error.code === '23505') { showToast('Already saved to Daily Notes', 'ok'); return }
      showToast(`Save failed: ${error.message}`, 'err'); return
    }
    showToast('Saved to Daily Notes')
  }

  const send = async () => {
    if (!selected || !reply.trim() || sending) return
    setSending(true)
    const threadTs = selected.thread_ts || (selected.channel_type === 'im' || selected.channel_type === 'mpim' ? null : selected.ts ? String(new Date(selected.ts).getTime() / 1000) : null)
    // For channels, we want to reply IN THE THREAD if the source has thread_ts; otherwise top-level
    const payload = {
      channel_id: selected.channel_id,
      thread_ts: selected.thread_ts || null,
      text: reply,
      in_reply_to: selected.id,
    }
    const { error } = await supabase.from('slack_outbox').insert([payload])
    setSending(false)
    if (error) { showToast(`Queue failed: ${error.message}`, 'err'); return }
    showToast('Queued — sends within 60s')
    setReply('')
    if (markReadOnSend && !selected.read_at) markRead(selected)
  }

  const select = (row) => {
    setSelected(row)
    setReply('')
    if (!row.read_at && filter !== 'archived') {
      // soft auto-mark on selection? No — explicit verb. Leave it.
    }
  }

  const Icon = selected ? channelIcon(selected.channel_type) : null

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Slack</h1>
          <div style={S.sub}>{counts.unread} unread · {counts.mentions} mentions · {counts.total} loaded</div>
        </div>
        <button style={S.refreshBtn} onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div style={S.filterRow}>
        {FILTERS.map(({ id, label, icon: I }) => (
          <button key={id} onClick={() => { setFilter(id); setSelected(null) }} style={S.filterBtn(filter === id)}>
            {I && <I size={12} />} {label}
          </button>
        ))}
      </div>

      <div style={selected ? S.body : S.bodyOneCol}>
        <div style={S.list}>
          {loading && rows.length === 0 && <div style={S.empty}>Loading…</div>}
          {!loading && rows.length === 0 && <div style={S.empty}>No messages match this filter.</div>}
          {rows.map(row => {
            const unread = !row.read_at
            const ChIcon = channelIcon(row.channel_type)
            return (
              <div key={row.id} style={S.row(selected?.id === row.id, unread)} onClick={() => select(row)}>
                <div style={S.rowTop}>
                  <span style={S.channelTag}>
                    <ChIcon size={11} />
                    {row.channel_name}
                  </span>
                  {row.has_mention && <span style={S.mentionDot} title="Mention" />}
                  {row.has_files && <Paperclip size={11} color="${INK2}" />}
                  {row.replied_at && <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>REPLIED</span>}
                  <span style={S.rowMeta}>{relTime(row.ts)}</span>
                </div>
                <div style={S.rowAuthor}>{row.user_name}</div>
                <div style={S.rowPreview(unread)}>{row.body_preview}</div>
              </div>
            )
          })}
        </div>

        {selected && (
          <div style={S.detail}>
            <div style={S.detailHead}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {Icon && <Icon size={14} color="${INK}" />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{selected.channel_name}</span>
                </div>
                <h2 style={S.detailTitle}>{selected.user_name}</h2>
                <div style={S.detailMeta}>{new Date(selected.ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' })} CT</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK2, padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={S.detailText}>{selected.text}</div>

            <div style={S.actionRow}>
              {!selected.archived_at && (
                <button style={S.primaryBtn} onClick={() => clear(selected)} title="Mark read and archive in one step">
                  <Eraser size={12} /> Clear
                </button>
              )}
              <button style={S.actionBtn} onClick={() => saveToNotes(selected)} title="Save to Daily Notes for reference">
                <BookOpen size={12} /> Save to Daily Notes
              </button>
              {selected.read_at
                ? <button style={S.actionBtn} onClick={() => markUnread(selected)}><Check size={12} /> Mark unread</button>
                : <button style={S.actionBtn} onClick={() => markRead(selected)}><Check size={12} /> Mark read</button>}
              {selected.archived_at
                ? <button style={S.actionBtn} onClick={() => unarchive(selected)}><Archive size={12} /> Unarchive</button>
                : <button style={S.actionBtn} onClick={() => archive(selected)}><Archive size={12} /> Archive</button>}
              {selected.permalink && (
                <a href={selected.permalink} target="_blank" rel="noopener noreferrer" style={{ ...S.actionBtn, textDecoration: 'none' }}>
                  <ExternalLink size={12} /> Open in Slack
                </a>
              )}
            </div>

            <div style={S.replyArea}>
              <div style={S.replyLabel}>Reply as David {selected.thread_ts && '(in thread)'}</div>
              <textarea
                style={S.textarea}
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send() }}
                placeholder="Plain text only. ⌘/Ctrl+Enter to send. Mentions, files, and emoji picker live in Slack."
              />
              <div style={S.replyFoot}>
                <label style={{ ...S.replyHint, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={markReadOnSend} onChange={e => setMarkReadOnSend(e.target.checked)} />
                  Mark read on send
                </label>
                <button style={S.sendBtn(!reply.trim() || sending)} onClick={send} disabled={!reply.trim() || sending}>
                  <Send size={13} /> {sending ? 'Queueing…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <div style={S.toast(toast.kind)}>{toast.msg}</div>}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
