# EventIQ Architecture

## System Overview

```
                 ┌──────────────────────────────────────────────┐
   Browser  ───▶ │  Next.js 15 (Vercel)                          │
   (React 19)    │   ├─ App Router pages (RSC + client islands)  │
                 │   ├─ React Query cache · Zustand UI state      │
                 │   └─ /api Route Handlers ──┐                  │
                 └────────────────────────────┼──────────────────┘
                                              │ (handler: rate-limit → JWT → RBAC → audit)
              ┌───────────────────────────────┼───────────────────────────┐
              ▼                               ▼                           ▼
      ┌──────────────┐              ┌──────────────────┐         ┌─────────────────┐
      │ PostgreSQL   │◀── Prisma ──▶│  Business engines │         │  Redis          │
      │ (Neon/RDS)   │              │  scoring/roi/zoho │◀───────▶│  cache + BullMQ │
      └──────────────┘              │  /copilot         │         └────────┬────────┘
                                    └──────────────────┘                  │ jobs
                                              │                           ▼
                                    ┌─────────┴─────────┐         ┌─────────────────┐
                                    │ OpenAI · Zoho CRM │         │ Worker (Railway/ │
                                    │ · AWS S3          │         │ ECS) BullMQ jobs │
                                    └───────────────────┘         └─────────────────┘
```

## Request Lifecycle

Every protected API route is wrapped by `handler(permission, fn, opts)`:

1. **Rate limit** — Redis fixed-window per IP (`lib/rate-limit.ts`), fail-open.
2. **AuthN** — NextAuth JWT decoded; `userId/orgId/role` extracted.
3. **AuthZ** — `assertCan(role, permission)` against the RBAC matrix.
4. **Validation** — Zod schemas (`server/validation.ts`) parse the body.
5. **Business logic** — pure engines (scoring/ROI) + Prisma persistence.
6. **Async work** — long/external tasks (Zoho sync, reports) enqueued to BullMQ.
7. **Audit** — write to `audit_logs` for compliance.

## Scaling to 100k+ leads

- **Indexing**: composite indexes on `(orgId, grade)`, `(orgId, heat)`,
  `eventId`, `zohoId`, `email` (see `schema.prisma`).
- **Pagination everywhere** — list endpoints cap `pageSize` at 100.
- **Caching** — dashboard aggregates cached 60s in Redis (`cached()` helper).
- **Async fan-out** — scoring is synchronous (pure, microseconds) but Zoho sync,
  ROI recompute and report generation run in BullMQ workers with
  exponential-backoff retries, isolating slow external APIs from the request path.
- **Multi-tenancy** — every table is `orgId`-scoped; queries always filter by org.
- **Stateless web tier** — horizontally scalable behind Vercel/ECS; all shared
  state lives in Postgres + Redis.

## AI Lead Scoring (`server/scoring.ts`)

Deterministic weighted model (weights sum to 100): purchase volume (28),
buying timeline (18), designation (16), company size (14), prior interactions
(10), product interest (8), region (6). Outputs 0–100 score → grade
(A+/A/B/C/D) → heat (Hot/Warm/Cold) → next-best-action. Pure and unit-tested;
runnable inside a worker for bulk re-scoring.

## ROI Engine (`server/roi.ts`)

`ROI = (Revenue − Cost) / Cost`, plus cost-per-lead, cost-per-qualified-lead,
revenue-per-lead, conversion rate and a verdict (Repeat/Keep/Review/Avoid).
Linear-regression revenue forecast for predictive planning.

## Zoho CRM Integration (`server/zoho.ts`)

OAuth2 refresh-token flow with cached access tokens, bidirectional Lead sync,
inbound webhooks (Lead Created/Updated, Deal Won/Lost) and a persisted
`ZohoSyncLog` retry queue surfaced on the sync dashboard.

## Security

JWT sessions · role-based access control · per-IP rate limiting · CSRF (NextAuth
built-in) · XSS/clickjacking headers + CSP (`next.config.mjs`) · HMAC-verified
webhooks · audit logging · encryption at rest (RDS `storage_encrypted`) ·
HTTPS/HSTS in production.

## Observability

Sentry (errors), OpenTelemetry traces → OTLP collector, Prometheus metrics +
Grafana dashboards, `/api/health` readiness probe.
