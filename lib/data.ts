import { asc, eq } from "drizzle-orm";

import { songContents, songs } from "@/db/schema";
import { getDb } from "@/lib/db";
import { extractKeyChords, parseParsedSectionsJson } from "@/lib/parser";

export type SongListItem = typeof songs.$inferSelect & { keyChords: string[] };

export async function listSongsWithKeyChords(): Promise<SongListItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      song: songs,
      content: songContents,
    })
    .from(songs)
    .leftJoin(songContents, eq(songs.id, songContents.songId))
    .orderBy(asc(songs.artist), asc(songs.title));

  return rows.map(({ song, content }) => {
    let keyChords: string[] = [];
    if (content?.parsedSections) {
      try {
        keyChords = extractKeyChords(parseParsedSectionsJson(content.parsedSections), 3);
      } catch {
        keyChords = [];
      }
    }
    return { ...song, keyChords };
  });
}

export async function getSongWithContent(id: string) {
  const db = getDb();
  const songRow = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  if (!songRow[0]) {
    return null;
  }
  const contentRow = await db.select().from(songContents).where(eq(songContents.songId, id)).limit(1);
  return { song: songRow[0], content: contentRow[0] ?? null };
}
