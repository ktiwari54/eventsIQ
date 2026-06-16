import { logger } from "@/lib/logger";

describe("structured logger", () => {
  const origEnv = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = origEnv;
    jest.restoreAllMocks();
  });

  it("emits a JSON line with level, msg and fields in production", () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    logger.info("lead imported", { count: 3 });
    const out = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(out);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("lead imported");
    expect(parsed.count).toBe(3);
    expect(parsed.time).toBeDefined();
  });

  it("serializes Error objects via errFields", () => {
    const fields = logger.errFields(new Error("boom"));
    expect(fields.error).toBe("boom");
    expect(fields.stack).toContain("boom");
    expect(logger.errFields("plain")).toEqual({ error: "plain" });
  });
});
