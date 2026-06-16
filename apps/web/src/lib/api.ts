import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ZodError } from "zod";
import type { Role } from "@prisma/client";
import { assertCan, ForbiddenError, type Permission } from "./rbac";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";

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
  fn: (req: any, ctx: AuthContext, params: Record<string, string>) => Promise<unknown>,
  opts: { auditAction?: string } = {},
) {
  return async (req: any, route: { params: Promise<Record<string, string>> }) => {
    try {
      const limited = await rateLimit(req);
      if (!limited.ok) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token?.uid) {
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

      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
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
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}