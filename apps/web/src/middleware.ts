export { default } from "next-auth/middleware";

// Protect the authenticated app shell + mutating API surface. Public routes:
// /login, /api/auth/*, /api/zoho/webhook (HMAC-verified), /api/health.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/leads/:path*",
    "/budgets/:path*",
    "/vendors/:path*",
    "/scoring/:path*",
    "/roi/:path*",
    "/copilot/:path*",
    "/zoho",
    "/reports/:path*",
  ],
};
