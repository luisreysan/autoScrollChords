import { NextResponse } from "next/server";

import { deleteSyncRoom, getSyncRoom, updateSyncRoom } from "@/lib/sync-data";
import {
  clampFontStep,
  clampManualSpeed,
  clampScrollRatio,
  isValidSyncCode,
  normalizeSyncCode,
} from "@/lib/sync";

export const runtime = "nodejs";

type PatchBody = {
  songId?: unknown;
  scrollRatio?: unknown;
  isPlaying?: unknown;
  manualSpeed?: unknown;
  fontStep?: unknown;
};

function getHostSecret(request: Request): string | null {
  const secret = request.headers.get("x-host-secret");
  return secret && secret.trim().length > 0 ? secret.trim() : null;
}

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = normalizeSyncCode(code);
  if (!isValidSyncCode(normalized)) {
    return NextResponse.json({ error: "Invalid sync code" }, { status: 400 });
  }

  const state = await getSyncRoom(normalized);
  if (!state) {
    return NextResponse.json({ error: "Sync room not found or expired" }, { status: 404 });
  }

  return NextResponse.json({ state });
}

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = normalizeSyncCode(code);
  if (!isValidSyncCode(normalized)) {
    return NextResponse.json({ error: "Invalid sync code" }, { status: 400 });
  }

  const hostSecret = getHostSecret(request);
  if (!hostSecret) {
    return NextResponse.json({ error: "Missing x-host-secret header" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateSyncRoom>[2] = {};
  if (body.songId !== undefined) {
    if (typeof body.songId !== "string" || body.songId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid songId" }, { status: 400 });
    }
    patch.songId = body.songId.trim();
  }
  if (body.scrollRatio !== undefined) {
    if (typeof body.scrollRatio !== "number" || !Number.isFinite(body.scrollRatio)) {
      return NextResponse.json({ error: "Invalid scrollRatio" }, { status: 400 });
    }
    patch.scrollRatio = clampScrollRatio(body.scrollRatio);
  }
  if (body.isPlaying !== undefined) {
    if (typeof body.isPlaying !== "boolean") {
      return NextResponse.json({ error: "Invalid isPlaying" }, { status: 400 });
    }
    patch.isPlaying = body.isPlaying;
  }
  if (body.manualSpeed !== undefined) {
    if (typeof body.manualSpeed !== "number" || !Number.isFinite(body.manualSpeed)) {
      return NextResponse.json({ error: "Invalid manualSpeed" }, { status: 400 });
    }
    patch.manualSpeed = clampManualSpeed(body.manualSpeed);
  }
  if (body.fontStep !== undefined) {
    if (typeof body.fontStep !== "number" || !Number.isFinite(body.fontStep)) {
      return NextResponse.json({ error: "Invalid fontStep" }, { status: 400 });
    }
    patch.fontStep = clampFontStep(body.fontStep);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const state = await updateSyncRoom(normalized, hostSecret, patch);
  if (!state) {
    return NextResponse.json({ error: "Sync room not found or unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ state });
}

export async function DELETE(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = normalizeSyncCode(code);
  if (!isValidSyncCode(normalized)) {
    return NextResponse.json({ error: "Invalid sync code" }, { status: 400 });
  }

  const hostSecret = getHostSecret(request);
  if (!hostSecret) {
    return NextResponse.json({ error: "Missing x-host-secret header" }, { status: 401 });
  }

  const deleted = await deleteSyncRoom(normalized, hostSecret);
  if (!deleted) {
    return NextResponse.json({ error: "Sync room not found or unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
