import QRCode from "qrcode";

// QR code generation for event lead-capture links and attendee badges.
// Returns either a PNG buffer (for downloads / PDF embedding) or a data URL
// (for inline <img> rendering in the UI).

const QR_OPTS = {
  errorCorrectionLevel: "M" as const,
  margin: 1,
  width: 320,
  color: { dark: "#0A0E1A", light: "#FFFFFF" },
};

export function qrPngBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, { ...QR_OPTS, type: "png" });
}

export function qrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, QR_OPTS);
}

/** Canonical public lead-capture URL for an event (scanned at the booth). */
export function eventCaptureUrl(origin: string, eventId: string): string {
  return `${origin}/leads/capture?event=${eventId}`;
}
