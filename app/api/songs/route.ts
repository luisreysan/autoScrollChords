import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { songContents, songs } from "@/db/schema";
import { getDb } from "@/lib/db";
import {
  extractKeyChords,
  parseParsedSectionsJson,
  parseTabText,
  parsedSectionsToJson,
} from "@/lib/parser";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select({
      song: songs,
      content: songContents,
    })
    .from(songs)
    .leftJoin(songContents, eq(songs.id, songContents.songId))
    .orderBy(asc(songs.artist), asc(songs.title));

  const data = rows.map(({ song, content }) => {
    let keyChords: string[] = [];
    if (content?.parsedSections) {
      try {
        const parsed = parseParsedSectionsJson(content.parsedSections);
        keyChords = extractKeyChords(parsed, 3);
      } catch {
        keyChords = [];
      }
    }
    return { ...song, keyChords };
  });

  return NextResponse.json({ songs: data });
}

type ManualBody = {
  title?: unknown;
  artist?: unknown;
  rawText?: unknown;
  duration_seconds?: unknown;
  source_url?: unknown;
};

export async function POST(request: Request) {
  let body: ManualBody;
  try {
    body = (await request.json()) as ManualBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const artist = typeof body.artist === "string" ? body.artist.trim() : "";
  const rawText = typeof body.rawText === "string" ? body.rawText : "";

  if (!title || !artist || !rawText.trim()) {
    return NextResponse.json(
      { error: "title, artist, and rawText are required" },
      { status: 400 },
    );
  }

  const parsed = parseTabText(rawText);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Could not parse tab content" }, { status: 422 });
  }

  const durationSeconds =
    typeof body.duration_seconds === "number" && Number.isFinite(body.duration_seconds)
      ? Math.round(body.duration_seconds)
      : null;

  const sourceUrl =
    typeof body.source_url === "string" && body.source_url.trim()
      ? body.source_url.trim()
      : `manual:${randomUUID()}`;

  const db = getDb();
  const existing = await db.select().from(songs).where(eq(songs.sourceUrl, sourceUrl)).limit(1);
  if (existing[0]) {
    return NextResponse.json({ error: "A song with this source_url already exists" }, { status: 409 });
  }

  const songId = randomUUID();
  const contentId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(songs).values({
      id: songId,
      title,
      artist,
      sourceUrl,
      tuning: null,
      capo: null,
      difficulty: null,
      durationSeconds,
      scrollSpeed: null,
      scrollMode: null,
    });
    await tx.insert(songContents).values({
      id: contentId,
      songId,
      rawText,
      parsedSections: parsedSectionsToJson(parsed),
    });
  });

  const song = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);
  const content = await db.select().from(songContents).where(eq(songContents.songId, songId)).limit(1);

  return NextResponse.json({ song: song[0], content: content[0] }, { status: 201 });
}
