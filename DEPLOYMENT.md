# Deployment

| Piece | Host | Trigger |
| --- | --- | --- |
| Frontend (`frontend/`, Vite + React) | **Vercel** | Vercel's GitHub integration builds every push. `main` → production, other branches → preview. |
| Backend API (repo root, Express) | **Railway** | `.github/workflows/deploy.yml` runs `npm test`, then `railway up`. `main` → production, `dev` → staging. |
| Database, auth, storage | **Supabase** | Migrations in `database_migrations/` are applied manually. |

Hetzner is no longer used. The old SSH + `rsync` + `pm2` deploy has been removed.

## Domains

| Domain | Points at |
| --- | --- |
| `hustlevillage.app`, `www.hustlevillage.app` | Vercel |
| `api.hustlevillage.app` | Railway — production service |
| `staging-api.hustlevillage.app` | Railway — staging service |

## Railway setup

One project with two environments, `production` and `staging`, each holding a
service built from the repo root.

1. **Create the project and services.** From the repo root, `railway login`,
   then `railway init` and add a service per environment. Railway reads
   `railway.json` for the build/start/healthcheck config, so there is nothing to
   configure in the dashboard for those.
2. **Set environment variables** (below) on each service. `PORT` is injected by
   Railway — do not set it.
3. **Attach the custom domains** with `railway domain api.hustlevillage.app`
   (production) and `railway domain staging-api.hustlevillage.app` (staging),
   then add the `CNAME` records Railway prints to DNS.
4. **Create a project token per environment**: Railway dashboard → project →
   Settings → Tokens. A project token is scoped to one environment, which is how
   the workflow targets staging vs production.

### GitHub Environments

The workflow expects two GitHub Environments, `railway-production` and
`railway-staging`, each with:

| Name | Kind | Value |
| --- | --- | --- |
| `RAILWAY_TOKEN` | secret | Railway project token for that environment |
| `RAILWAY_SERVICE` | variable | Name of the Railway service to deploy to |
| `API_DOMAIN` | variable | `api.hustlevillage.app` / `staging-api.hustlevillage.app` |

## Backend environment variables

Required — the process refuses to start without them:

| Name | Notes |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS. Backend only. |
| `PAYMENT_PROVIDER` | `paystack` or `momo_manual`. **No default** — an unset or unrecognised value exits the process on boot (`src/config/paymentMode.js`). |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Used for CORS and email links |

Payments, depending on `PAYMENT_PROVIDER`:

- `paystack` → `PAYSTACK_SECRET_KEY`, `PAYSTACK_BASE_URL`, `PAYSTACK_CURRENCY`
- `momo_manual` → `MOMO_MERCHANT_NAME`, `MOMO_DISPLAY_NUMBER`, `MOMO_NETWORKS`,
  `MOMO_PAYMENT_SLA_HOURS`, `MOMO_INSTRUCTIONS` (optional), `MOMO_PROOF_BUCKET`

Email — `RESEND_API_KEY` is tried first, Zoho SMTP is the fallback
(`src/services/emailService.js`):

- `RESEND_API_KEY`, `FROM_EMAIL`
- `ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`
- `ADMIN_EMAIL`

> **Prefer Resend on Railway.** Railway blocks outbound SMTP on trial and
> free-tier plans, which makes the Zoho transport fail silently at send time
> rather than at boot. Set `RESEND_API_KEY` and email routes over HTTPS instead.

Optional: `AUTH_SITE_URL` (overrides `FRONTEND_URL` for Supabase verification
emails only), `WEBHOOK_SECRET`, `LOG_LEVEL`.

## Frontend environment variables

Set per-environment in the Vercel project:

| Name | Production | Preview |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.hustlevillage.app/api` | `https://staging-api.hustlevillage.app/api` |
| `VITE_SUPABASE_URL` | Production Supabase project | Staging Supabase project |
| `VITE_SUPABASE_ANON_KEY` | | |

`VITE_*` values are baked in at build time, so changing one needs a redeploy.

## CORS

`src/server.js` hardcodes the production origins and additionally allows
`FRONTEND_URL`. Vercel preview deployments get a generated `*.vercel.app`
hostname that is **not** in the allowlist — point local and preview work at a
listed origin, or add the hostname, rather than expecting previews to reach the
API cross-origin.

## Rollback

Railway keeps previous deployments: dashboard → service → Deployments → **Redeploy**
on the last good one. Or `railway redeploy`. Reverting the commit and pushing
also works, since every push to `main`/`dev` redeploys.
