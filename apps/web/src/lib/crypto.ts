import crypto from "crypto";

// Application-level encryption for secrets at rest (Zoho tokens, etc.).
// AES-256-GCM with a key derived from ENCRYPTION_KEY. Ciphertext is stored as
// "v1:<iv>:<authTag>:<data>" (all base64). If ENCRYPTION_KEY is unset, values
// pass through unencrypted with a "plain:" marker so local dev still works —
// production MUST set a 32-byte key.

const PREFIX = "v1";
const PLAIN = "plain:";

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Accept a 32-byte base64/hex key, or derive via SHA-256 of an arbitrary string.
  if (/^[A-Fa-f0-9]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) return PLAIN + plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (value.startsWith(PLAIN)) return value.slice(PLAIN.length);
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) return value; // legacy/plain value
  const key = getKey();
  if (!key) return value;
  try {
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}
