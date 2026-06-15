# EventIQ API Reference

All routes are JSON REST handlers under `/api`. Protected routes require a valid
NextAuth JWT (cookie session) and pass through `handler()` in
`apps/web/src/lib/api.ts`, which enforces rate limiting, RBAC and audit logging.

Standard error shape: `{ "error": string, "issues"?: ZodFlattenedError }`.
Status codes: `401` unauthenticated · `403` forbidden · `422` validation ·
`429` rate-limited · `5xx` server.

## Auth
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth (Google, Azure AD, credentials) |

## Dashboard
| Method | Path | Permission |
|---|---|---|
| GET | `/api/dashboard` | `dashboard:read` — KPIs + chart series (cached 60s) |

## Events
| Method | Path | Permission |
|---|---|---|
| GET | `/api/events?page&pageSize&status&q` | `event:read` |
| POST | `/api/events` | `event:create` |
| GET | `/api/events/:id` | `event:read` |
| PUT | `/api/events/:id` | `event:update` |
| DELETE | `/api/events/:id` | `event:delete` |

## Leads
| Method | Path | Permission |
|---|---|---|
| GET | `/api/leads?grade&heat&eventId&q&page` | `lead:read` (execs scoped to own) |
| POST | `/api/leads` | `lead:create` — runs AI scoring + queues Zoho sync |
| PUT | `/api/leads/:id` | `lead:update` — re-scores |
| DELETE | `/api/leads/:id` | `lead:delete` |

## Vendors / Budgets / ROI
| Method | Path | Permission |
|---|---|---|
| GET/POST | `/api/vendors` | `vendor:read` / `vendor:create` |
| GET/POST | `/api/budgets?eventId` | `budget:read` / `budget:create` |
| POST | `/api/budgets/:id/approve` | `budget:update` — workflow transition |
| GET | `/api/roi?recompute=1` | `roi:read` — ranked metrics + forecast |

## Uploads & Files (AWS S3)
| Method | Path | Permission |
|---|---|---|
| POST | `/api/uploads/presign` | `event:read` — returns a presigned S3 PUT URL + canonical publicUrl |
| GET/POST | `/api/events/:id/documents` | `event:read` / `event:update` |
| GET/POST | `/api/expenses?budgetId&eventId` | `expense:read` / `expense:create` — POST rolls amount into budget actuals |

Upload flow: client `POST /api/uploads/presign` → `PUT` file directly to the
returned `uploadUrl` (S3, SSE-AES256) → persist `publicUrl` against the record.

## AI Copilot
| Method | Path | Permission |
|---|---|---|
| POST | `/api/copilot` `{ question }` | `copilot:use` |

## Events — sub-resources
| Method | Path | Permission |
|---|---|---|
| GET/POST/PATCH | `/api/events/:id/checklist` | `event:read` / `event:update` |
| GET/POST | `/api/events/:id/tasks` | `event:read` / `task:create` |
| PUT/DELETE | `/api/tasks/:id` | `task:update` / `task:delete` |
| GET/POST/DELETE | `/api/events/:id/team` | `event:read` / `event:update` |
| GET/POST | `/api/events/:id/documents` | `event:read` / `event:update` |
| GET | `/api/users` | `event:read` — org users for assignment |

## Vendors — scorecards
| Method | Path | Permission |
|---|---|---|
| GET | `/api/vendors/:id` | `vendor:read` — detail + scorecard + spend history |
| POST | `/api/vendors/:id/evaluations` | `vendor:evaluate` — recomputes rating + SLA |

## Reports
| Method | Path | Permission |
|---|---|---|
| GET | `/api/reports/export/:format?type=` | `report:read` — `csv`/`excel`/`pdf` rendered inline |
| GET/POST | `/api/reports/schedules` | `report:read` / `report:create` — cron schedules (BullMQ) |
| PUT/DELETE | `/api/reports/schedules/:id` | `report:create` |
| GET/POST | `/api/reports/runs` | `report:read` — run history; POST renders now (→ S3) |

## Zoho — OAuth & sync
| Method | Path | Auth |
|---|---|---|
| GET | `/api/zoho/oauth/authorize` | session — redirects to Zoho consent |
| GET | `/api/zoho/oauth/callback` | Zoho redirect — exchanges code, stores tokens |
| GET | `/api/zoho/sync-log` | `event:read` — connection status + sync log |

## Integration / Ops
| Method | Path | Auth |
|---|---|---|
| POST | `/api/zoho/webhook?orgId=` | HMAC `x-zoho-signature` |
| GET | `/api/health` | public liveness/readiness |

### Example

```bash
curl -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  --cookie "next-auth.session-token=…" \
  -d '{"name":"Rajan Gupta","company":"Alpha","designation":"Director",
       "monthlyPurchaseVolume":4000000,"interestedBrands":["Samsung"],"city":"Delhi"}'
```
