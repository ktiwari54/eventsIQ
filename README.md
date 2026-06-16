# ⚡ EventIQ — Enterprise Event Intelligence SaaS

Production-ready platform for **event ROI tracking, AI lead scoring, lead &
vendor management, budgeting, AI analytics and Zoho CRM integration**. Designed
to scale to **100,000+ leads** and **thousands of events**.

## One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fktiwari54%2FeventsIQ&env=DATABASE_URL,REDIS_URL,NEXTAUTH_URL,NEXTAUTH_SECRET,CRON_SECRET&envDescription=Neon%20Postgres%20%2B%20Upstash%20Redis%20%2B%20auth%20%2B%20cron%20secret&envLink=https%3A%2F%2Fgithub.com%2Fktiwari54%2FeventsIQ%2Fblob%2Fmain%2Fdocs%2FDEPLOYMENT.md&project-name=eventiq&repository-name=eventiq)

Clones the repo into your Vercel account and prompts for the five required
secrets. Before deploying, create a [Neon](https://neon.tech) Postgres database
and an [Upstash](https://upstash.com) Redis instance, then paste their
connection strings as `DATABASE_URL` / `REDIS_URL`. Vercel runs the migrations on
build; a per-minute cron drives scheduled reports. Full walkthrough (and optional
integrations) in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (`?sslmode=require`) |
| `REDIS_URL` | Upstash `rediss://…` URL |
| `NEXTAUTH_URL` | your `https://<project>.vercel.app` URL |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `CRON_SECRET` | any random string (guards `/api/cron/process`) |

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, React Query, Zustand, React Hook Form, Zod, Recharts, Framer Motion |
| Backend | Next.js Route Handlers (typed REST), Node 20 |
| Database | PostgreSQL + Prisma ORM |
| Cache / Queue | Redis + BullMQ |
| Auth | NextAuth / Auth.js — Google SSO, Microsoft (Azure AD) SSO, credentials, JWT + RBAC |
| Storage | AWS S3 |
| AI | Pluggable OpenAI Copilot + deterministic scoring/ROI engines |
| Infra | Docker, Docker Compose, GitHub Actions, Terraform (AWS ECS/RDS/ElastiCache), Vercel + Railway |
| Observability | Sentry, OpenTelemetry, Prometheus, Grafana |

## Monorepo Layout

```
eventiq/
├── apps/web/                # Next.js app: UI + API routes + workers
│   ├── src/app/             # App Router pages + /api route handlers
│   ├── src/components/      # UI components
│   ├── src/lib/             # prisma, redis, auth, rbac, rate-limit, api wrapper
│   ├── src/server/          # business logic: scoring, roi, zoho, copilot, queue, worker
│   ├── tests/               # Jest unit tests
│   └── e2e/                 # Playwright E2E
├── prisma/                  # schema.prisma + seed.ts
├── infrastructure/          # docker/, terraform/
├── scripts/                 # deploy.sh
├── docs/                    # ARCHITECTURE.md, API.md
└── .github/workflows/       # ci.yml, deploy.yml
```

## Quick Start

```bash
# 1. Boot Postgres + Redis
npm run docker:up      # or bring your own DATABASE_URL / REDIS_URL

# 2. Configure env
cp .env.example .env   # set NEXTAUTH_SECRET, DATABASE_URL, etc.

# 3. Install + migrate + seed
npm install
npm run db:generate
npm run db:migrate
npm run db:seed        # demo org → admin@eventiq.dev / Password123!

# 4. Run
npm run dev            # http://localhost:3000

# 5. Background worker (Zoho sync, ROI recompute)
npx tsx apps/web/src/server/worker.ts
```

## Testing

```bash
npm test                       # Jest unit tests (scoring, ROI, RBAC)
npm run test:e2e               # Playwright smoke E2E
```

## User Roles (RBAC)

`SUPER_ADMIN`, `FINANCE_MANAGER`, `EVENT_MANAGER`, `SALES_MANAGER`,
`SALES_EXECUTIVE` (own leads only), `VENDOR` (portal), `MANAGEMENT` (read-only).
The permission matrix lives in `apps/web/src/lib/rbac.ts`.

## Modules

Dashboard · Events (Draft→Submitted→Approved→Active→Completed→Archived) ·
Lead Capture (6 sources) · AI Lead Scoring · Zoho CRM Sync · Budget & Finance
approvals · Vendor Management · ROI Engine · AI Copilot · Reports (CSV/Excel/PDF).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/API.md`](docs/API.md) for details.
