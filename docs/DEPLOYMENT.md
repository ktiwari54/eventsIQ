# EventIQ — Staging Deployment (Vercel + Neon + Upstash)

Staging runs the Next.js app on **Vercel**, Postgres on **Neon**, and Redis on
**Upstash**. Because Vercel is serverless (no always-on process), time-based work
(scheduled reports) is driven by a **Vercel Cron** hitting `/api/cron/process`.

```
 Browser ─▶ Vercel (Next.js web + API)
                │           │
                │           ├─ Neon Postgres   (DATABASE_URL, pooled)
                │           └─ Upstash Redis    (REDIS_URL, rediss://, cache + rate-limit)
                └─ Vercel Cron ─▶ /api/cron/process (fires due report schedules)
```

> Real-time BullMQ background jobs (e.g. live Zoho lead sync) need a long-running
> worker, which Vercel does not host. Staging functions without it — queued jobs
> simply wait. To enable them, run `npx tsx apps/web/src/server/worker.ts` on any
> small always-on host pointed at the same Neon + Upstash URLs.

## 1. Provision data services
1. **Neon** → create a project + a **`staging`** branch. Copy the **pooled**
   connection string → `DATABASE_URL` (append `?sslmode=require`).
2. **Upstash** → create a Redis database (eu/ap region near `bom1`). Copy the
   `rediss://…` URL → `REDIS_URL`.

## 2. Create the Vercel project
- Import the GitHub repo. **Root Directory: repository root** (the build/output
  are set by `vercel.json`).
- `vercel.json` already configures: install, `buildCommand`
  (`db:generate && db:deploy && build`), `outputDirectory` (`apps/web/.next`),
  region `bom1`, and the per-minute cron.

## 3. Environment variables (Vercel → Settings → Environment Variables)
Required:
```
DATABASE_URL          # Neon pooled URL
REDIS_URL             # Upstash rediss:// URL
NEXTAUTH_URL          # https://<your-staging>.vercel.app
NEXTAUTH_SECRET       # openssl rand -base64 32
CRON_SECRET           # random; Vercel sends it to /api/cron/process
```
Optional (features degrade gracefully if unset): `GOOGLE_CLIENT_ID/SECRET`,
`AZURE_AD_*`, `OPENAI_API_KEY`, `ZOHO_CLIENT_ID/SECRET`, `ZOHO_REDIRECT_URI`,
`AWS_*` (S3), `SMTP_*`, `SENTRY_DSN`, `METRICS_TOKEN`.

See `.env.staging.example` for the full list.

## 4. First deploy & seed
- Push to `main` (or the `staging` branch) → Vercel builds and runs
  `prisma migrate deploy` against Neon automatically.
- Seed demo data once (locally, against the Neon staging URL):
  ```bash
  DATABASE_URL="<neon-staging-url>" npm run db:seed
  # login: admin@eventiq.dev / Password123!
  ```

## 5. CI deploy workflow (optional)
`.github/workflows/deploy-staging.yml` deploys on push to the **`staging`**
branch (or manual dispatch). Add these GitHub repo secrets:
```
VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, STAGING_DATABASE_URL
```
The workflow pulls Vercel env, applies migrations, builds with `vercel build`,
deploys `--prebuilt`, and smoke-checks `/api/health`.

## Row-Level Security (multi-tenant isolation)
Migrations enable Postgres RLS on tenant tables. Enforcement requires the app to
connect as a **non-superuser** role (superusers bypass RLS). **Neon's default
role is non-superuser, so RLS is enforced automatically** — no extra setup. The
app sets `app.current_org` per request via `withTenant()`; when unset (worker,
seed, migrations, org signup) the policy is permissive, so those flows are
unaffected. Locally, a superuser `postgres` role bypasses RLS (fine for dev) —
to exercise enforcement, connect as a non-superuser owner role.

## 6. Verify
- `GET /api/health` → `{ status: "healthy" }` (db + redis reachable).
- `GET /api/metrics` → Prometheus text (add `Authorization: Bearer $METRICS_TOKEN` if set).
- Create a report schedule with cron `* * * * *` and confirm a run appears within
  a minute (driven by the Vercel cron).
