import PDFDocument from "pdfkit";
import { qrPngBuffer } from "./qr";

export interface BadgeInput {
  name: string;
  company?: string | null;
  designation?: string | null;
  eventName: string;
  grade?: string | null;
  qrData: string; // encoded into the badge QR (e.g. lead id / vCard)
}

// Renders a printable attendee badge (A6-ish card) as a PDF buffer, with the
// attendee's details, event name, grade chip and a QR code for fast check-in.
export async function generateBadge(input: BadgeInput): Promise<Buffer> {
  const qr = await qrPngBuffer(input.qrData);

  return new Promise((resolve, reject) => {
    // 105 x 148 mm (A6) in points (1mm ≈ 2.835pt).
    const doc = new PDFDocument({ size: [297.6, 419.5], margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = 297.6;

    // Header band
    doc.rect(0, 0, W, 70).fill("#3B82F6");
    doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text("EVENT IQ", 0, 22, { width: W, align: "center" });
    doc.fontSize(10).font("Helvetica").text(input.eventName, 0, 48, { width: W, align: "center" });

    // Attendee block
    doc.fillColor("#0A0E1A").fontSize(22).font("Helvetica-Bold").text(input.name, 20, 110, { width: W - 40, align: "center" });
    if (input.designation)
      doc.fontSize(12).font("Helvetica").fillColor("#444").text(input.designation, 20, 142, { width: W - 40, align: "center" });
    if (input.company)
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#111").text(input.company, 20, 162, { width: W - 40, align: "center" });

    // Grade chip
    if (input.grade) {
      const chipW = 70;
      doc.roundedRect((W - chipW) / 2, 192, chipW, 22, 11).fill("#10B981");
      doc.fillColor("#FFFFFF").fontSize(11).font("Helvetica-Bold").text(`Grade ${input.grade}`, (W - chipW) / 2, 197, { width: chipW, align: "center" });
    }

    // QR code
    doc.image(qr, (W - 130) / 2, 235, { width: 130, height: 130 });
    doc.fillColor("#888").fontSize(8).font("Helvetica").text("Scan to capture / check-in", 0, 372, { width: W, align: "center" });

    doc.end();
  });
}
