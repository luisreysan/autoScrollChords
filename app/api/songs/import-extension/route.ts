import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { songContents, songs } from "@/db/schema";
import { getDb } from "@/lib/db";
import { parseTabText, parsedSectionsToJson } from "@/lib/parser";
import type { ExtensionImportPayload } from "@/lib/types";

export const runtime = "nodejs";

function isUgTabUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host.includes("ultimate-guitar.com") && u.pathname.includes("/tab/");
  } catch {
    return false;
  }
}

function parseCapo(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      return Math.max(0, Number.parseInt(match[0], 10));
    }
  }
  return null;
}

function parseBody(raw: unknown): ExtensionImportPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const body = raw as Record<string, unknown>;
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const artist = typeof body.artist === "string" ? body.artist.trim() : "";
  const rawText = typeof body.rawText === "string" ? body.rawText : "";
  const tuning = typeof body.tuning === "string" ? body.tuning.trim() : null;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty.trim() : null;
  const capo = parseCapo(body.capo);

  if (!sourceUrl || !title || !artist || !rawText.trim()) {
    return null;
  }

  return {
    sourceUrl,
    title,
    artist,
    rawText,
    tuning,
    difficulty,
    capo,
  };
}

export async function POST(request: Request) {
  const expectedToken = process.env.EXTENSION_IMPORT_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "Server misconfigured: EXTENSION_IMPORT_TOKEN is missing" },
      { status: 500 },
    );
  }

  const incomingToken = request.headers.get("x-extension-token");
  if (!incomingToken || incomingToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized extension token" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { error: "sourceUrl, title, artist and rawText are required" },
      { status: 400 },
    );
  }

  if (!isUgTabUrl(body.sourceUrl)) {
    return NextResponse.json({ error: "Invalid Ultimate Guitar tab URL" }, { status: 400 });
  }

  const parsed = parseTabText(body.rawText);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Could not parse tab content" }, { status: 422 });
  }

  const db = getDb();
  const existing = await db.select().from(songs).where(eq(songs.sourceUrl, body.sourceUrl)).limit(1);
  if (existing[0]) {
    const content = await db
      .select()
      .from(songContents)
      .where(eq(songContents.songId, existing[0].id))
      .limit(1);

    return NextResponse.json({
      isNew: false,
      song: existing[0],
      content: content[0] ?? null,
    });
  }

  const songId = randomUUID();
  const contentId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(songs).values({
      id: songId,
      title: body.title,
      artist: body.artist,
      sourceUrl: body.sourceUrl,
      tuning: body.tuning ?? null,
      capo: body.capo ?? null,
      difficulty: body.difficulty ?? null,
      durationSeconds: null,
      scrollSpeed: null,
      scrollMode: null,
    });
    await tx.insert(songContents).values({
      id: contentId,
      songId,
      rawText: body.rawText.trim(),
      parsedSections: parsedSectionsToJson(parsed),
    });
  });

  const song = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);
  const content = await db.select().from(songContents).where(eq(songContents.songId, songId)).limit(1);

  return NextResponse.json({
    isNew: true,
    song: song[0],
    content: content[0] ?? null,
  });
}
