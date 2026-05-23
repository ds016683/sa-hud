import { useState, useEffect, useCallback, useMemo } from 'react'
import { Hash, Lock, MessageCircle, Users, Send, Check, Archive, ExternalLink, AtSign, Inbox, Paperclip, RefreshCw, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const S = {
  page: { maxWidth: 1400, margin: '0 auto', padding: '24px 16px', fontFamily: 'Arial, Helvetica, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  h1: { fontSize: 20, fontWeight: 700, color: '#002C77', margin: 0 },
  sub: { fontSize: 13, color: '#8096B2', margin: '2px 0 0' },
  refreshBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'white', color: '#002C77', border: '1px solid #CBD8E8', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  filterBtn: (active) => ({
    padding: '5px 14px', borderRadius: 9999, border: '1px solid', fontSize: 12, cursor: 'pointer',
    fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: active ? 600 : 500,
    background: active ? '#002C77' : 'white',
    color: active ? 'white' : '#334E85',
    borderColor: active ? '#002C77' : '#CBD8E8',
    display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
  }),
  body: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' },
  bodyOneCol: { display: 'block' },
  list: { background: 'white', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' },
  row: (selected, unread) => ({
    padding: '12px 16px',
    borderBottom: '1px solid #EEF2F7',
    cursor: 'pointer',
    background: selected ? 'rgba(0,157,224,0.08)' : (unread ? 'white' : '#F7F9FC'),
    borderLeft: selected ? '3px solid #009DE0' : '3px solid transparent',
    transition: 'background 0.1s',
  }),
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  channelTag: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#002C77', background: '#EEF2F7', padding: '2px 7px', borderRadius: 4, border: '1px solid #CBD8E8', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' },
  mentionDot: { width: 8, height: 8, borderRadius: '50%', background: '#D4A106', flexShrink: 0 },
  rowMeta: { fontSize: 11, color: '#8096B2', marginLeft: 'auto', whiteSpace: 'nowrap' },
  rowAuthor: { fontSize: 13, fontWeight: 700, color: '#002C77' },
  rowPreview: (unread) => ({ fontSize: 13, color: unread ? '#202E47' : '#566778', lineHeight: 1.4, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
  empty: { padding: 40, textAlign: 'center', color: '#8096B2', fontSize: 13 },
  detail: { background: 'white', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20, position: 'sticky', top: 16 },
  detailHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  detailTitle: { fontSize: 15, fontWeight: 700, color: '#002C77', margin: 0, lineHeight: 1.4 },
  detailMeta: { fontSize: 12, color: '#8096B2', marginTop: 4 },
  detailText: { fontSize: 14, color: '#202E47', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '12px 0', borderTop: '1px solid #EEF2F7', borderBottom: '1px solid #EEF2F7', margin: '12px 0' },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  actionBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'white', color: '#334E85', border: '1px solid #CBD8E8', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' },
  actionBtnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#002C77', color: 'white', border: '1px solid #002C77', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' },
  replyArea: { marginTop: 8 },
  replyLabel: { fontSize: 11, color: '#8096B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  textarea: { width: '100%', minHeight: 80, maxHeight: 240, padding: 10, fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif', border: '1px solid #CBD8E8', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', color: '#202E47' },
  replyFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  replyHint: { fontSize: 11, color: '#8096B2' },
  sendBtn: (disabled) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: disabled ? '#CBD8E8' : '#009DE0', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Arial, Helvetica, sans-serif' }),
  toast: (kind) => ({ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif', color: 'white', background: kind === 'err' ? '#B91C1C' : '#059669', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }),
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
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                  {row.has_files && <Paperclip size={11} color="#8096B2" />}
                  {row.replied_at && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>REPLIED</span>}
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
                  {Icon && <Icon size={14} color="#002C77" />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#002C77' }}>{selected.channel_name}</span>
                </div>
                <h2 style={S.detailTitle}>{selected.user_name}</h2>
                <div style={S.detailMeta}>{new Date(selected.ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8096B2', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={S.detailText}>{selected.text}</div>

            <div style={S.actionRow}>
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
