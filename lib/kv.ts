import { Redis } from "@upstash/redis";

import type { ScrollSessionPayload } from "@/lib/types";

const PREFIX = "scroll-session:";
const DEFAULT_TTL_SECONDS = 3600;

function getRedisClient() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Redis REST credentials. Set KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  return new Redis({ url, token });
}

export function scrollSessionKey(songId: string): string {
  return `${PREFIX}${songId}`;
}

export async function getScrollSession(songId: string): Promise<ScrollSessionPayload | null> {
  const key = scrollSessionKey(songId);
  const redis = getRedisClient();
  const raw = await redis.get<ScrollSessionPayload>(key);
  return raw ?? null;
}

export async function setScrollSession(
  songId: string,
  payload: ScrollSessionPayload,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const key = scrollSessionKey(songId);
  const redis = getRedisClient();
  await redis.set(key, payload, { ex: ttlSeconds });
}
