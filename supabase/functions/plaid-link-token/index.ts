// supabase/functions/plaid-link-token/index.ts
// Issues a Plaid Link token so the browser can open Plaid Link.
// Auth: caller must be an authed Supabase user (verified via JWT).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Require auth — must have a Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "missing auth" }, 401);
    }

    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID")!;
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET")!;
    const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
    const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`;

    // Use the auth user id as the Plaid `client_user_id`. Plaid requires a stable
    // identifier per end-user; the Supabase auth uid is perfect.
    const jwt = authHeader.slice(7);
    const userId = parseJwtSub(jwt) ?? "anon";

    const r = await fetch(`${PLAID_BASE}/link/token/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        user: { client_user_id: userId },
        client_name: "SA-HUD",
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
      }),
    });

    const data = await r.json();
    if (!r.ok) return json({ error: "plaid_link_token_failed", detail: data }, 500);
    return json({ link_token: data.link_token, expiration: data.expiration });
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

function parseJwtSub(jwt: string): string | null {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
