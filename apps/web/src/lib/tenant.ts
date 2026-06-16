import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Tenant context for Row-Level Security. `withTenant` runs `fn` inside a
// transaction that sets the `app.current_org` GUC, so Postgres RLS policies
// restrict every query in `fn` to that organization — defence in depth beyond
// application-level orgId filtering. The GUC is transaction-local (SET LOCAL via
// set_config's third arg = true), so it never leaks across pooled connections.

export type Tx = Prisma.TransactionClient;

export async function withTenant<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // set_config(name, value, is_local=true) scopes the setting to this tx.
    await tx.$executeRaw`SELECT set_config('app.current_org', ${orgId}, true)`;
    return fn(tx);
  });
}
