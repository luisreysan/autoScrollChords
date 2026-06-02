import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createSyncRoom } from "@/lib/sync-data";
import { clampFontStep, clampManualSpeed, clampScrollRatio } from "@/lib/sync";

export const runtime = "nodejs";

type CreateBody = {
  songId?: unknown;
  scrollRatio?: unknown;
  isPlaying?: unknown;
  manualSpeed?: unknown;
  fontStep?: unknown;
};

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.songId !== "string" || body.songId.trim().length === 0) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  const hostSecret = randomUUID();
  const scrollRatio =
    typeof body.scrollRatio === "number" ? clampScrollRatio(body.scrollRatio) : 0;
  const isPlaying = body.isPlaying === true;
  const manualSpeed =
    typeof body.manualSpeed === "number" ? clampManualSpeed(body.manualSpeed) : 0.2;
  const fontStep = typeof body.fontStep === "number" ? clampFontStep(body.fontStep) : 1;

  try {
    const room = await createSyncRoom({
      songId: body.songId.trim(),
      hostSecret,
      scrollRatio,
      isPlaying,
      manualSpeed,
      fontStep,
    });

    return NextResponse.json({
      code: room.code,
      hostSecret,
      state: room,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create sync room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
