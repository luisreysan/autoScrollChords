import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { songContents, songs } from "@/db/schema";
import { getDb } from "@/lib/db";
import { parseTabText, parsedSectionsToJson } from "@/lib/parser";
import { scrapeUltimateGuitarTab } from "@/lib/scraper";

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

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !isUgTabUrl(url)) {
    return NextResponse.json({ error: "Invalid Ultimate Guitar tab URL" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.select().from(songs).where(eq(songs.sourceUrl, url)).limit(1);
  if (existing[0]) {
    const content = await db
      .select()
      .from(songContents)
      .where(eq(songContents.songId, existing[0].id))
      .limit(1);
    return NextResponse.json({
      song: existing[0],
      content: content[0] ?? null,
      isNew: false,
    });
  }

  let scraped;
  try {
    scraped = await scrapeUltimateGuitarTab(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch tab";
    console.error("[songs/import] scrape failed", { url, error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const parsed = parseTabText(scraped.rawText);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Could not parse tab content" }, { status: 422 });
  }

  const songId = randomUUID();
  const contentId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(songs).values({
      id: songId,
      title: scraped.title,
      artist: scraped.artist,
      sourceUrl: url,
      tuning: scraped.tuning ?? null,
      capo: scraped.capo ?? null,
      difficulty: scraped.difficulty ?? null,
      durationSeconds: null,
      scrollSpeed: null,
      scrollMode: null,
    });
    await tx.insert(songContents).values({
      id: contentId,
      songId,
      rawText: scraped.rawText,
      parsedSections: parsedSectionsToJson(parsed),
    });
  });

  const song = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);
  const content = await db.select().from(songContents).where(eq(songContents.songId, songId)).limit(1);

  return NextResponse.json({
    song: song[0],
    content: content[0],
    isNew: true,
  });
}
