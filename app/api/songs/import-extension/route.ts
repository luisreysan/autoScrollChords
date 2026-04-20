import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { songContents, songs } from "@/db/schema";
import { getDb } from "@/lib/db";
import { parseTabText, parsedSectionsToJson } from "@/lib/parser";
import type { ExtensionImportPayload, ParsedSection } from "@/lib/types";

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
  const positionedSections = parsePositionedSections(body.positionedSections);
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
    positionedSections,
    tuning,
    difficulty,
    capo,
  };
}

function parsePositionedSections(value: unknown): ParsedSection[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sections: ParsedSection[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const raw = item as Record<string, unknown>;
    if (raw.type === "section_header" && typeof raw.label === "string" && raw.label.trim()) {
      sections.push({
        type: "section_header",
        label: raw.label.trim(),
      });
      continue;
    }

    if (raw.type === "line" && typeof raw.lyrics === "string") {
      const lyrics = raw.lyrics.replace(/\u00A0/g, " ").replace(/\t/g, "    ");
      const chords = Array.isArray(raw.chords)
        ? raw.chords.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        : [];

      const chordPositions = Array.isArray(raw.chordPositions)
        ? raw.chordPositions
            .map((cp) => {
              if (!cp || typeof cp !== "object") {
                return null;
              }
              const rawPos = cp as Record<string, unknown>;
              if (typeof rawPos.chord !== "string" || typeof rawPos.charIndex !== "number") {
                return null;
              }
              if (!Number.isFinite(rawPos.charIndex)) {
                return null;
              }
              return {
                chord: rawPos.chord.trim(),
                charIndex: Math.max(0, Math.floor(rawPos.charIndex)),
              };
            })
            .filter((cp): cp is NonNullable<typeof cp> => Boolean(cp))
        : undefined;

      const lineLengthRaw = typeof raw.lineLength === "number" && Number.isFinite(raw.lineLength)
        ? Math.max(0, Math.floor(raw.lineLength))
        : undefined;
      const chordLineRaw = typeof raw.chordLineRaw === "string"
        ? raw.chordLineRaw.replace(/\u00A0/g, " ").replace(/\t/g, "    ")
        : undefined;

      const inferredLineLength = Math.max(
        lyrics.length,
        chordLineRaw?.length ?? 0,
        ...(chordPositions?.map((cp) => cp.charIndex + cp.chord.length) ?? [0]),
      );
      const lineLength = Math.max(lineLengthRaw ?? 0, inferredLineLength);

      sections.push({
        type: "line",
        lyrics,
        chords,
        ...(chordPositions && chordPositions.length > 0 ? { chordPositions } : {}),
        ...(lineLength > 0 ? { lineLength } : {}),
        ...(chordLineRaw && chordLineRaw.length > 0 ? { chordLineRaw } : {}),
      });
    }
  }

  return sections.length > 0 ? sections : undefined;
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

  const parsed = body.positionedSections && body.positionedSections.length > 0
    ? body.positionedSections
    : parseTabText(body.rawText);
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

    await db.transaction(async (tx) => {
      await tx
        .update(songs)
        .set({
          title: body.title,
          artist: body.artist,
          tuning: body.tuning ?? null,
          capo: body.capo ?? null,
          difficulty: body.difficulty ?? null,
        })
        .where(eq(songs.id, existing[0].id));

      if (content[0]) {
        await tx
          .update(songContents)
          .set({
            rawText: body.rawText.trim(),
            parsedSections: parsedSectionsToJson(parsed),
          })
          .where(eq(songContents.id, content[0].id));
      } else {
        await tx.insert(songContents).values({
          id: randomUUID(),
          songId: existing[0].id,
          rawText: body.rawText.trim(),
          parsedSections: parsedSectionsToJson(parsed),
        });
      }
    });

    const refreshedSong = await db.select().from(songs).where(eq(songs.id, existing[0].id)).limit(1);
    const refreshedContent = await db
      .select()
      .from(songContents)
      .where(eq(songContents.songId, existing[0].id))
      .limit(1);

    return NextResponse.json({
      isNew: false,
      song: refreshedSong[0] ?? existing[0],
      content: refreshedContent[0] ?? null,
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
      scrollMode: "manual",
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
