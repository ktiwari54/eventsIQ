import { Role } from "@prisma/client";

// Permission strings are "<resource>:<action>". "*" is a wildcard.
export type Permission = string;

const ALL = ["*"];

// Role → permissions matrix. Super Admin gets everything; other roles get a
// scoped subset that matches the product's role definitions.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  FINANCE_MANAGER: [
    "dashboard:read",
    "budget:*",
    "expense:*",
    "vendor:read",
    "vendor:pay",
    "vendor:evaluate",
    "report:*",
    "event:read",
    "roi:read",
  ],
  EVENT_MANAGER: [
    "dashboard:read",
    "event:*",
    "task:*",
    "vendor:read",
    "vendor:evaluate",
    "budget:read",
    "budget:create",
    "lead:read",
    "report:*",
    "roi:read",
  ],
  SALES_MANAGER: [
    "dashboard:read",
    "lead:*",
    "roi:read",
    "event:read",
    "report:read",
    "copilot:use",
  ],
  SALES_EXECUTIVE: [
    "dashboard:read",
    "lead:read:own",
    "lead:update:own",
    "lead:create",
    "event:read",
  ],
  VENDOR: ["vendor:portal", "expense:read:own"],
  MANAGEMENT: ["dashboard:read", "report:read", "roi:read", "event:read", "lead:read", "org:read"],
};

export function can(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  // Wildcard at resource level, e.g. "budget:*" grants "budget:create".
  const [resource] = permission.split(":");
  return perms.includes(`${resource}:*`);
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(permission: string) {
    super(`Missing permission: ${permission}`);
  }
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(permission);
}
