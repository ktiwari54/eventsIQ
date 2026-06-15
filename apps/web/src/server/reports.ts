import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { Dataset } from "./report-data";
import type { ReportFormat } from "@prisma/client";

// Renders a Dataset to a real PDF or XLSX binary buffer. Used both for on-demand
// downloads and for scheduled reports (whose output is uploaded to S3).

export async function generateReport(ds: Dataset, format: ReportFormat | "PDF" | "EXCEL"): Promise<Buffer> {
  return format === "EXCEL" ? generateExcel(ds) : generatePdf(ds);
}

function generatePdf(ds: Dataset): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#3B82F6").text(`EventIQ — ${ds.title}`, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#666").text(`Generated ${new Date().toISOString()}`);
    doc.moveDown(0.8);

    const startX = doc.x;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usableWidth / ds.headers.length;

    // Header row
    doc.fontSize(9).fillColor("#000");
    let y = doc.y;
    ds.headers.forEach((h, i) => {
      doc.font("Helvetica-Bold").text(String(h), startX + i * colWidth, y, {
        width: colWidth,
        ellipsis: true,
      });
    });
    y += 16;
    doc.moveTo(startX, y - 4).lineTo(startX + usableWidth, y - 4).strokeColor("#ccc").stroke();

    // Data rows (cap for PDF readability)
    doc.font("Helvetica").fontSize(8);
    for (const row of ds.rows.slice(0, 500)) {
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      row.forEach((cell, i) => {
        doc.text(cell == null ? "—" : String(cell), startX + i * colWidth, y, {
          width: colWidth,
          ellipsis: true,
        });
      });
      y += 14;
    }
    if (ds.rows.length > 500) {
      doc.moveDown().fontSize(8).fillColor("#666").text(`… ${ds.rows.length - 500} more rows (see Excel/CSV export)`);
    }
    doc.end();
  });
}

async function generateExcel(ds: Dataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EventIQ";
  const ws = wb.addWorksheet(ds.title.slice(0, 31));

  ws.addRow(ds.headers);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A2235" },
  };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  ds.rows.forEach((r) => ws.addRow(r));

  // Auto-size columns to content.
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      max = Math.max(max, String(cell.value ?? "").length + 2);
    });
    col.width = Math.min(max, 50);
  });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
