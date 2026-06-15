import nodemailer, { type Transporter } from "nodemailer";

// SMTP email service. Env-gated: when SMTP isn't configured, send() becomes a
// logged no-op so local dev and CI never fail on missing mail credentials.

let cached: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (cached !== undefined) return cached;
  const host = process.env.SMTP_HOST;
  if (!host) {
    cached = null;
    return null;
  }
  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return cached;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(msg: MailMessage): Promise<{ sent: boolean }> {
  const recipients = Array.isArray(msg.to) ? msg.to : [msg.to];
  if (!recipients.length) return { sent: false };

  const transport = getTransport();
  if (!transport) {
    console.info(`[email] (no SMTP configured) would send "${msg.subject}" to ${recipients.join(", ")}`);
    return { sent: false };
  }
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "EventIQ <no-reply@eventiq.app>",
      to: recipients.join(", "),
      subject: msg.subject,
      html: msg.html,
      text: msg.text ?? stripHtml(msg.html),
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { sent: false };
  }
}

/** Small branded HTML wrapper for transactional emails. */
export function emailLayout(title: string, body: string): string {
  return `<div style="font-family:system-ui,sans-serif;background:#0A0E1A;color:#F1F5F9;padding:24px;border-radius:12px;max-width:560px">
    <div style="color:#3B82F6;font-weight:800;font-size:18px;margin-bottom:12px">⚡ EVENT IQ</div>
    <h2 style="font-size:16px;margin:0 0 12px">${title}</h2>
    <div style="font-size:14px;line-height:1.6;color:#CBD5E1">${body}</div>
  </div>`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
