// supabase/functions/plaid-exchange/index.ts
// Exchanges a Plaid public_token → access_token, fetches account metadata,
// and saves an Item row to finance_personal.plaid_items with the chosen scope.
//
// Body: { public_token: string, scope: "personal" | "th", institution: { name, institution_id } }
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

    const { public_token, scope, institution } = await req.json();
    if (!public_token || !["personal", "th"].includes(scope)) {
      return json({ error: "bad_request", detail: "public_token + scope required" }, 400);
    }

    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID")!;
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET")!;
    const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
    const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`;

    // 1. Exchange public_token → access_token
    const exch = await fetch(`${PLAID_BASE}/item/public_token/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, public_token,
      }),
    });
    const exchData = await exch.json();
    if (!exch.ok) return json({ error: "exchange_failed", detail: exchData }, 500);
    const { access_token, item_id } = exchData;

    // 2. Fetch accounts so we have metadata to store
    const acctR = await fetch(`${PLAID_BASE}/accounts/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, access_token }),
    });
    const acctData = await acctR.json();
    if (!acctR.ok) return json({ error: "accounts_get_failed", detail: acctData }, 500);

    // 3. Upsert into plaid_items via service-role client
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { db: { schema: "finance_personal" } },
    );

    const { data: item, error: itemErr } = await sb
      .from("plaid_items")
      .upsert({
        scope,
        access_token,
        item_id,
        institution_id: institution?.institution_id ?? null,
        institution_name: institution?.name ?? null,
        accounts: acctData.accounts ?? [],
      }, { onConflict: "item_id" })
      .select()
      .single();

    if (itemErr) return json({ error: "db_insert_failed", detail: itemErr }, 500);

    return json({
      ok: true,
      item_id: item.id,
      institution: item.institution_name,
      account_count: acctData.accounts?.length ?? 0,
      scope,
    });
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
