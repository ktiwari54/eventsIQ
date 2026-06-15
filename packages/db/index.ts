// Re-export the generated Prisma client + types so other workspace packages can
// depend on a single shared data-access entry point.
export * from "@prisma/client";
export { PrismaClient } from "@prisma/client";
