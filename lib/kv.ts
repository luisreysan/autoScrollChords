import { kv } from "@vercel/kv";

import type { ScrollSessionPayload } from "@/lib/types";

const PREFIX = "scroll-session:";
const DEFAULT_TTL_SECONDS = 3600;

export function scrollSessionKey(songId: string): string {
  return `${PREFIX}${songId}`;
}

export async function getScrollSession(songId: string): Promise<ScrollSessionPayload | null> {
  const key = scrollSessionKey(songId);
  const raw = await kv.get<ScrollSessionPayload>(key);
  return raw ?? null;
}

export async function setScrollSession(
  songId: string,
  payload: ScrollSessionPayload,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const key = scrollSessionKey(songId);
  await kv.set(key, payload, { ex: ttlSeconds });
}
