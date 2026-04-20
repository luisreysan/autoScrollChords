import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const songs = sqliteTable(
  "songs",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    sourceUrl: text("source_url").notNull().unique(),
    tuning: text("tuning"),
    capo: integer("capo"),
    difficulty: text("difficulty"),
    durationSeconds: integer("duration_seconds"),
    scrollSpeed: real("scroll_speed"),
    scrollMode: text("scroll_mode").$type<"manual">(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("songs_artist_idx").on(t.artist)],
);

export const songContents = sqliteTable(
  "song_contents",
  {
    id: text("id").primaryKey(),
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    rawText: text("raw_text").notNull(),
    parsedSections: text("parsed_sections").notNull(),
  },
  (t) => [index("song_contents_song_id_idx").on(t.songId)],
);

export const songsRelations = relations(songs, ({ one }) => ({
  content: one(songContents, {
    fields: [songs.id],
    references: [songContents.songId],
  }),
}));

export const songContentsRelations = relations(songContents, ({ one }) => ({
  song: one(songs, {
    fields: [songContents.songId],
    references: [songs.id],
  }),
}));

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type SongContent = typeof songContents.$inferSelect;
export type NewSongContent = typeof songContents.$inferInsert;
