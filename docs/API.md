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

## AI Copilot
| Method | Path | Permission |
|---|---|---|
| POST | `/api/copilot` `{ question }` | `copilot:use` |

## Reports
| Method | Path | Permission |
|---|---|---|
| GET | `/api/reports/export/:format?type=` | `report:read` — `csv` inline, `pdf`/`excel` queued |

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
