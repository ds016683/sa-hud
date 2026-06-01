# Dropbox API wiring for SA-HUD Ecosystem tab

The Ecosystem **File Tree** mode fetches David's Lumen OS vault directly from
Dropbox via a Vercel serverless function at `/api/vault`. The function holds
the Dropbox refresh token in env vars and exchanges it for a short-lived
access token on each request (with in-memory caching).

## Required env vars

All three must be set in Vercel (Project Settings → Environment Variables) for
**Production**, **Preview**, and **Development** scopes:

| Var | Purpose |
|---|---|
| `DROPBOX_APP_KEY` | App key from the Dropbox developer app |
| `DROPBOX_APP_SECRET` | App secret from the Dropbox developer app |
| `DROPBOX_REFRESH_TOKEN` | Long-lived refresh token (offline access) |

These mirror what's in `~/.hermes/secrets/dropbox.env` on the dev box:

```
DROPBOX_APP_KEY=…
DROPBOX_APP_SECRET=…
DROPBOX_REFRESH_TOKEN=…
DROPBOX_ACCOUNT_ID=…    # not needed for SA-HUD
DROPBOX_UID=…           # not needed for SA-HUD
```

## To wire up Vercel (one-time)

```bash
# from your local machine, in the sa-hud repo
vercel env add DROPBOX_APP_KEY        # paste value, select all envs
vercel env add DROPBOX_APP_SECRET
vercel env add DROPBOX_REFRESH_TOKEN
vercel --prod                          # redeploy so envs take effect
```

Or paste them into the Vercel web UI under **Settings → Environment Variables**.

## Local dev

`vite` doesn't ship serverless functions — `vercel dev` does. To run locally
with vault access:

```bash
cd ~/sa-hud
echo 'DROPBOX_APP_KEY=…' > .env.local
echo 'DROPBOX_APP_SECRET=…' >> .env.local
echo 'DROPBOX_REFRESH_TOKEN=…' >> .env.local
vercel dev   # runs vite + /api/* routes together
```

If `.env.local` is missing, the File Tree mode shows an error banner but
the rest of the Ecosystem tab (Map, Status) works fine. `npm run dev` still
boots clean — it just can't fetch the vault.

## Security

- `.env.local` is gitignored (verify before committing).
- Tokens never reach the browser — only `/api/vault` sees them.
- The access token is cached in serverless memory until ~1 minute before
  expiry (Dropbox default: 4 hours).

## Token rotation

If `DROPBOX_REFRESH_TOKEN` rotates (revoked, re-issued), update the Vercel
env var and redeploy. No code change needed.
