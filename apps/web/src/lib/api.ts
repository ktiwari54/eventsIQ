import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ZodError } from "zod";
import type { Role } from "@prisma/client";
import { assertCan, ForbiddenError, type Permission } from "./rbac";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";
import { incCounter, observeHistogram } from "./metrics";
import { logger } from "./logger";

export interface AuthContext {
  userId: string;
  orgId: string;
  role: Role;
}

/**
 * Wraps an API route handler with: rate limiting, JWT auth, RBAC permission
 * checks, structured error handling and audit logging. This is the single
 * choke point that every protected endpoint flows through.
 */
export function handler(
  permission: Permission | null,
  fn: (req: NextRequest, ctx: AuthContext, params: Record<string, string>) => Promise<unknown>,
  opts: { auditAction?: string } = {},
) {
  return async (req: NextRequest, route: { params: Promise<Record<string, string>> }) => {
    const start = Date.now();
    const path = new URL(req.url).pathname;
    const record = (status: number) => {
      incCounter("eventiq_http_requests_total", { method: req.method, status: String(status) }, "Total API requests");
      observeHistogram("eventiq_http_request_duration_ms", Date.now() - start, { method: req.method }, "API request duration (ms)");
    };
    try {
      const limited = await rateLimit(req);
      if (!limited.ok) {
        record(429);
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      // CSRF: cookie-authenticated mutations must originate from a trusted origin.
      if (!isSafeMethod(req.method) && !verifyOrigin(req)) {
        record(403);
        return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
      }

      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token?.uid) {
        record(401);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const ctx: AuthContext = {
        userId: token.uid as string,
        orgId: token.orgId as string,
        role: token.role as Role,
      };

      if (permission) assertCan(ctx.role, permission);

      const params = route?.params ? await route.params : {};
      const result = await fn(req, ctx, params);

      if (opts.auditAction) {
        await prisma.auditLog
          .create({
            data: {
              orgId: ctx.orgId,
              userId: ctx.userId,
              action: opts.auditAction,
              ip: req.headers.get("x-forwarded-for") ?? undefined,
            },
          })
          .catch(() => {});
      }

      record(200);
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      const res = toErrorResponse(err);
      record(res.status);
      if (res.status >= 500) {
        incCounter("eventiq_http_errors_total", { path }, "Total 5xx API errors");
      }
      return res;
    }
  };
}

function isSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

/**
 * Same-origin check for CSRF protection. The Origin header (sent by browsers on
 * state-changing requests) must match the request host or a configured allowed
 * origin. Requests with no Origin/Referer (e.g. server-to-server with a bearer)
 * are allowed since they aren't cookie-driven CSRF vectors.
 */
export function verifyOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return true; // non-browser caller; not a CSRF vector

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const allowed = new Set<string>();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) allowed.add(host);
  for (const env of [process.env.NEXTAUTH_URL, process.env.APP_URL]) {
    if (env) {
      try {
        allowed.add(new URL(env).host);
      } catch {
        /* ignore malformed env */
      }
    }
  }
  return allowed.has(originHost);
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: err.flatten() },
      { status: 422 },
    );
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  logger.error("Unhandled API error", logger.errFields(err));
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
