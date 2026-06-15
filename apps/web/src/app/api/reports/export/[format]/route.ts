import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { assertCan } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import { buildDataset, toCsv } from "@/server/report-data";
import { generateReport } from "@/server/reports";

// GET /api/reports/export/:format?type=roi|leads|events|vendors|budget
// CSV is streamed inline; PDF/Excel are rendered on the fly and returned as a
// binary attachment (and also uploadable via the scheduled-report worker).
export async function GET(req: NextRequest, route: { params: Promise<{ format: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertCan(token.role as Role, "report:read");

  const orgId = token.orgId as string;
  const { format } = await route.params;
  const type = new URL(req.url).searchParams.get("type") ?? "roi";
  const ds = await buildDataset(orgId, type);

  if (format === "csv") {
    return new NextResponse(toCsv(ds), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="eventiq-${type}.csv"`,
      },
    });
  }

  if (format === "excel" || format === "xlsx") {
    const buf = await generateReport(ds, "EXCEL");
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="eventiq-${type}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const buf = await generateReport(ds, "PDF");
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="eventiq-${type}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
