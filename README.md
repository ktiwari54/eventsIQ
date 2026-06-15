# ⚡ EventIQ — Enterprise Event Intelligence SaaS

Production-ready platform for **event ROI tracking, AI lead scoring, lead &
vendor management, budgeting, AI analytics and Zoho CRM integration**. Designed
to scale to **100,000+ leads** and **thousands of events**.

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
