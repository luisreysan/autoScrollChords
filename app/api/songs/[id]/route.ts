import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { songContents, songs } from "@/db/schema";
import { getDb } from "@/lib/db";
import type { ScrollMode } from "@/lib/types";

export const runtime = "nodejs";

type PatchBody = {
  scroll_speed?: unknown;
  scroll_mode?: unknown;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();

  const songRow = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  if (!songRow[0]) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const contentRow = await db.select().from(songContents).where(eq(songContents.songId, id)).limit(1);

  return NextResponse.json({
    song: songRow[0],
    content: contentRow[0] ?? null,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const updates: Partial<{
    scrollSpeed: number | null;
    scrollMode: ScrollMode | null;
  }> = {};

  if (body.scroll_speed !== undefined) {
    if (body.scroll_speed === null) {
      updates.scrollSpeed = null;
    } else if (typeof body.scroll_speed === "number" && Number.isFinite(body.scroll_speed)) {
      updates.scrollSpeed = body.scroll_speed;
    } else {
      return NextResponse.json({ error: "Invalid scroll_speed" }, { status: 400 });
    }
  }

  if (body.scroll_mode !== undefined) {
    if (body.scroll_mode === null) {
      updates.scrollMode = null;
    } else if (body.scroll_mode === "manual") {
      updates.scrollMode = body.scroll_mode;
    } else {
      return NextResponse.json({ error: "Invalid scroll_mode" }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(songs).set(updates).where(eq(songs.id, id));

  const song = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  return NextResponse.json({ song: song[0] });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();

  const existing = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  await db.delete(songs).where(eq(songs.id, id));

  return NextResponse.json({ ok: true });
}
