// supabase/functions/plaid-sync/index.ts
// Iterates every plaid_items row, fetches balances + new transactions,
// and upserts to the right schema based on item.scope.
//
// No body required — syncs everything. Returns { synced: [{item, balances, txs}, ...] }
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!req.headers.get("Authorization")?.startsWith("Bearer ")) {
      return json({ error: "missing auth" }, 401);
    }

    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID")!;
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET")!;
    const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
    const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`;

    const sb_personal = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { db: { schema: "finance_personal" } },
    );
    const sb_th = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { db: { schema: "finance" } },
    );

    const { data: items, error: listErr } = await sb_personal
      .from("plaid_items").select("*");
    if (listErr) return json({ error: "list_failed", detail: listErr }, 500);

    const results: any[] = [];

    // Load account-level scope overrides (last4 -> personal|th) from finance.account_scope
    const { data: scopeRows } = await sb_th.from("account_scope").select("account_last4, scope");
    const scopeByLast4: Record<string, "personal" | "th"> = {};
    for (const r of scopeRows ?? []) scopeByLast4[r.account_last4] = r.scope;

    // Helper: decide which schema target an individual Plaid account goes to.
    function resolveScope(acct: any, fallback: "personal" | "th"): "personal" | "th" {
      const last4 = (acct.mask ?? "").toString().slice(-4);
      if (last4 && scopeByLast4[last4]) return scopeByLast4[last4];
      return fallback;
    }

    for (const item of items ?? []) {
      try {
        const itemScope = item.scope as "personal" | "th";

        // 1. Balances
        const balR = await fetch(`${PLAID_BASE}/accounts/balance/get`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET,
            access_token: item.access_token,
          }),
        });
        const balData = await balR.json();
        if (!balR.ok) throw new Error("balance_get: " + JSON.stringify(balData));

        // Build per-account scope map for this item's accounts (used by both balances + txs)
        const acctScopes: Record<string, "personal" | "th"> = {};
        const acctLast4: Record<string, string> = {};
        for (const acct of balData.accounts ?? []) {
          acctScopes[acct.account_id] = resolveScope(acct, itemScope);
          acctLast4[acct.account_id] = (acct.mask ?? "").toString().slice(-4);
        }

        // Upsert balances per account into the right schema
        let balRowsWritten = 0;
        for (const acct of balData.accounts ?? []) {
          const acctScope = acctScopes[acct.account_id];
          const last4 = acctLast4[acct.account_id];
          const sb = acctScope === "personal" ? sb_personal : sb_th;
          const tableName = acctScope === "personal" ? "balances" : "balances_plaid";
          const row: any = {
            account_name: acct.name,
            account_type: acct.subtype ?? acct.type ?? "checking",
            institution: item.institution_name,
            current_balance: acct.balances.current ?? 0,
            available_balance: acct.balances.available ?? acct.balances.current ?? 0,
            currency: acct.balances.iso_currency_code ?? "USD",
            as_of: new Date().toISOString(),
            plaid_account_id: acct.account_id,
            plaid_item_id: item.id,
          };
          if (acctScope === "th") row.account_last4 = last4;
          const { error: bErr } = await sb.from(tableName).upsert(row, {
            onConflict: "plaid_account_id",
          });
          if (bErr) throw new Error(`upsert ${tableName} (${acct.name}): ${bErr.message}`);
          balRowsWritten++;
        }

        // 2. Transactions via /transactions/sync (incremental cursor)
        let cursor = item.sync_cursor ?? null;
        let added: any[] = [];
        let modified: any[] = [];
        let removed: any[] = [];
        let hasMore = true;

        while (hasMore) {
          const txR = await fetch(`${PLAID_BASE}/transactions/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET,
              access_token: item.access_token,
              cursor: cursor ?? undefined,
            }),
          });
          const txData = await txR.json();
          if (!txR.ok) throw new Error("tx_sync: " + JSON.stringify(txData));
          added = added.concat(txData.added ?? []);
          modified = modified.concat(txData.modified ?? []);
          removed = removed.concat(txData.removed ?? []);
          cursor = txData.next_cursor;
          hasMore = txData.has_more;
        }

        // Upsert added + modified — route each tx to the right schema by its account
        let txWritten = 0;
        for (const tx of [...added, ...modified]) {
          const acctScope = acctScopes[tx.account_id] ?? itemScope;
          const last4 = acctLast4[tx.account_id] ?? null;
          const sb = acctScope === "personal" ? sb_personal : sb_th;
          const tableName = acctScope === "personal" ? "transactions" : "transactions_plaid";
          const row: any = {
            occurred_on: tx.date,
            merchant: tx.merchant_name ?? null,
            memo: tx.name ?? tx.merchant_name ?? "(unknown)",
            // Plaid: positive amount = money OUT. SA-HUD convention:
            // negative = out, positive = in. Flip the sign.
            amount: -1 * (tx.amount ?? 0),
            category: (tx.personal_finance_category?.primary ?? tx.category?.[0]) ?? null,
            account_name: balData.accounts?.find((a: any) => a.account_id === tx.account_id)?.name ?? null,
            plaid_transaction_id: tx.transaction_id,
            plaid_account_id: tx.account_id,
            plaid_item_id: item.id,
          };
          if (acctScope === "th") row.account_last4 = last4;
          const { error: tErr } = await sb.from(tableName).upsert(row, {
            onConflict: "plaid_transaction_id",
          });
          if (tErr) throw new Error(`upsert ${tableName}: ${tErr.message}`);
          txWritten++;
        }

        // Update item cursor + last_synced_at
        await sb_personal.from("plaid_items").update({
          sync_cursor: cursor,
          last_synced_at: new Date().toISOString(),
          last_sync_error: null,
        }).eq("id", item.id);

        results.push({
          institution: item.institution_name,
          scope: itemScope, balances_written: balRowsWritten,
          txs_added: added.length, txs_modified: modified.length, txs_removed: removed.length,
          txs_written: txWritten,
        });
      } catch (e) {
        // Record per-item failure, keep going on the others
        await sb_personal.from("plaid_items").update({
          last_sync_error: String(e),
        }).eq("id", item.id);
        results.push({ institution: item.institution_name, error: String(e) });
      }
    }

    return json({ ok: true, synced_at: new Date().toISOString(), items: results });
  } catch (e) {
    return json({ error: "exception", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
