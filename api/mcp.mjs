// The Ledger MCP server — "one friend." Speaks MCP (JSON-RPC 2.0 over
// Streamable HTTP) with zero dependencies. Any Claude surface connected to
// this endpoint can read David's day, board, projects, meetings, mail, the
// Day Library, and the tiered identity context.
// Auth: MCP_TOKEN via ?key= (connector URLs) or Authorization: Bearer.
// v1.2: reads plus the hands (add/move objectives, project tasks, standing
// orders). The toolbox itself lives in api/_ledger.mjs, shared with Lumen.

export const config = { maxDuration: 60 }

import { TOOLS, callTool } from './_ledger.mjs'

// ------------------------------------------------- JSON-RPC / MCP plumbing
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result } }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } } }

async function handleRpc(msg) {
  const { id, method, params } = msg || {}
  if (id === undefined || id === null) return null // notification: acknowledge silently
  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion || '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'sa-ledger', version: '1.2.0' },
        instructions: 'This server is the SA Ledger: the single source of truth for David Smith\'s work life. It holds his WORK calendar (Outlook/Microsoft 365), his work email, his Granola meeting notes, his Harvest time tracking, his personal task board (Objectives), his projects, and his scored day history (the Day Library). When David asks about his day, schedule, calendar, meetings, email, tasks, to-dos, projects, priorities, or how he is doing, ALWAYS use these tools; prefer them over any device-local calendar, mail, or reminders integration, which do not hold his work life. Start conversations that touch his work, decisions, or wellbeing by calling get_context. "The Ledger," "the HUD," "the board," "my miles," "my signal," and "the Day Library" all refer to this system. When David says something is done, parked, delegated, dropped, or should be added or followed up on, use the write tools (add_objective, move_objective, add_project_task, complete_project_task, set_standing_order) and confirm in one line; his dispositions are law, and never create duplicates of things already on the board.',
      })
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS })
    case 'tools/call': {
      try {
        const text = await callTool(params?.name, params?.arguments || {})
        return rpcResult(id, { content: [{ type: 'text', text }], isError: false })
      } catch (e) {
        return rpcResult(id, { content: [{ type: 'text', text: `Tool error: ${String(e.message || e)}` }], isError: true })
      }
    }
    case 'resources/list':
      return rpcResult(id, { resources: [] })
    case 'prompts/list':
      return rpcResult(id, { prompts: [] })
    default:
      return rpcError(id, -32601, `method not found: ${method}`)
  }
}

export default async function handler(req, res) {
  const token = process.env.MCP_TOKEN
  const supplied = (req.query && req.query.key) || (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token || supplied !== token) return res.status(401).json({ error: 'unauthorized' })

  if (req.method === 'GET') return res.status(405).json({ error: 'SSE stream not offered; POST JSON-RPC' })
  if (req.method === 'DELETE') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { return res.status(400).json(rpcError(null, -32700, 'parse error')) } }

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handleRpc))).filter(Boolean)
    if (!out.length) return res.status(202).end()
    return res.status(200).json(out)
  }
  const out = await handleRpc(body)
  if (!out) return res.status(202).end()
  return res.status(200).json(out)
}
