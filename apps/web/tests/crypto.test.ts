import { encryptSecret, decryptSecret, isEncryptionConfigured } from "@/lib/crypto";

describe("secret encryption", () => {
  const KEY = "0".repeat(64); // 32-byte hex key

  describe("with ENCRYPTION_KEY set", () => {
    const prev = process.env.ENCRYPTION_KEY;
    beforeAll(() => (process.env.ENCRYPTION_KEY = KEY));
    afterAll(() => (process.env.ENCRYPTION_KEY = prev));

    it("round-trips a secret through AES-256-GCM", () => {
      expect(isEncryptionConfigured()).toBe(true);
      const ct = encryptSecret("super-secret-refresh-token");
      expect(ct.startsWith("v1:")).toBe(true);
      expect(ct).not.toContain("super-secret");
      expect(decryptSecret(ct)).toBe("super-secret-refresh-token");
    });

    it("produces a different ciphertext each time (random IV)", () => {
      expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
    });

    it("returns null on tampered ciphertext", () => {
      const ct = encryptSecret("value");
      const parts = ct.split(":");
      parts[3] = Buffer.from("tampered").toString("base64");
      expect(decryptSecret(parts.join(":"))).toBeNull();
    });
  });

  describe("without ENCRYPTION_KEY (dev fallback)", () => {
    const prev = process.env.ENCRYPTION_KEY;
    beforeAll(() => delete process.env.ENCRYPTION_KEY);
    afterAll(() => (process.env.ENCRYPTION_KEY = prev));

    it("passes through with a plain marker and decrypts back", () => {
      expect(isEncryptionConfigured()).toBe(false);
      const v = encryptSecret("hello");
      expect(v).toBe("plain:hello");
      expect(decryptSecret(v)).toBe("hello");
    });

    it("decrypts null as null", () => {
      expect(decryptSecret(null)).toBeNull();
    });
  });
});
