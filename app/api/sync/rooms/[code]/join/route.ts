import { NextResponse } from "next/server";

import { getSyncRoom } from "@/lib/sync-data";
import { isValidSyncCode, normalizeSyncCode } from "@/lib/sync";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
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
