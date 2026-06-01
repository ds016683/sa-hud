// supabase/functions/harvest-expense-sync/index.ts
// Pulls David's billable May expenses from Harvest and caches them in
// finance_personal.harvest_reimbursement_cache for the personal finance HUD.
// Triggered by: manual refresh button in HUD, or daily cron (6:00 AM CT).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HARVEST_PAT      = Deno.env.get('HARVEST_PAT')!
const HARVEST_ACCT_ID  = Deno.env.get('HARVEST_ACCOUNT_ID')!
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Determine period — default to previous calendar month; accept ?from=&to= overrides
    const url  = new URL(req.url)
    const now  = new Date()
    const from = url.searchParams.get('from') ?? formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const to   = url.searchParams.get('to')   ?? formatDate(new Date(now.getFullYear(), now.getMonth(), 0))
    const periodLabel = url.searchParams.get('label') ?? monthLabel(new Date(from))

    // Fetch from Harvest (paginated)
    const expenses = await fetchAllExpenses(from, to)
    const billable = expenses.filter((e: any) => e.billable)
    const total    = billable.reduce((s: number, e: any) => s + (e.total_cost || 0), 0)

    const lineItems = billable.map((e: any) => ({
      date:     e.spent_date,
      client:   e.client?.name  ?? 'Unknown',
      project:  e.project?.name ?? 'Unknown',
      category: e.expense_category?.name ?? 'Other',
      amount:   e.total_cost,
      notes:    (e.notes ?? '').slice(0, 120),
    }))

    // Upsert into finance_personal.harvest_reimbursement_cache
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)
    const { error } = await supabase
      .schema('finance_personal')
      .from('harvest_reimbursement_cache')
      .insert({
        period_label:   periodLabel,
        period_from:    from,
        period_to:      to,
        total_billable: Math.round(total * 100) / 100,
        expense_count:  billable.length,
        line_items:     lineItems,
        fetched_at:     new Date().toISOString(),
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, period: periodLabel, total, count: billable.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchAllExpenses(from: string, to: string): Promise<any[]> {
  const all: any[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `https://api.harvestapp.com/v2/expenses?from=${from}&to=${to}&per_page=100&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${HARVEST_PAT}`,
          'Harvest-Account-ID': HARVEST_ACCT_ID,
          'User-Agent': 'Lumen OS (david.smith@thirdhorizon.com)',
        },
      }
    )
    const data = await res.json()
    all.push(...(data.expenses ?? []))
    if (!data.links?.next) break
    page++
  }
  return all
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
