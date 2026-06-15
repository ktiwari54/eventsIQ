import type { NextRequest } from "next/server";
import { redis } from "./redis";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 120; // per IP per window

/**
 * Sliding-window-ish fixed-window rate limiter backed by Redis. Fails open if
 * Redis is unavailable so a cache outage never takes down the API.
 */
export async function rateLimit(req: NextRequest): Promise<{ ok: boolean; remaining: number }> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const key = `rl:${ip}:${Math.floor(Date.now() / 1000 / WINDOW_SECONDS)}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    return { ok: count <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - count) };
  } catch {
    return { ok: true, remaining: MAX_REQUESTS };
  }
}
