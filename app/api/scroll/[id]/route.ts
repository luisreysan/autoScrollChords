import { NextResponse } from "next/server";

import { getScrollSession, setScrollSession } from "@/lib/kv";
import type { ScrollMode, ScrollSessionPayload } from "@/lib/types";

export const runtime = "nodejs";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const session = await getScrollSession(id);
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ session: null });
  }
}

type PostBody = {
  isPlaying?: unknown;
  progress?: unknown;
  speed?: unknown;
  mode?: unknown;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const progress =
    typeof body.progress === "number" && Number.isFinite(body.progress)
      ? clamp(body.progress, 0, 1)
      : 0;
  const speed = typeof body.speed === "number" && Number.isFinite(body.speed) ? body.speed : 0;
  const mode: ScrollMode = body.mode === "manual" ? "manual" : "duration";

  const payload: ScrollSessionPayload = {
    isPlaying: Boolean(body.isPlaying),
    progress,
    speed,
    mode,
    updatedAt: Date.now(),
  };

  try {
    await setScrollSession(id, payload);
  } catch {
    return NextResponse.json({ error: "KV unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, session: payload });
}
