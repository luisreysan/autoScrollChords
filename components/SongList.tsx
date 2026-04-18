"use client";

import { useMemo, useState } from "react";

import type { SongListItem } from "@/lib/data";

import { SearchBar } from "@/components/SearchBar";
import { SongCard } from "@/components/SongCard";

type SongListProps = {
  songs: SongListItem[];
};

function filterSongs(songs: SongListItem[], query: string): SongListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return songs;
  }
  return songs.filter(
    (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
  );
}

function groupByArtist(items: SongListItem[]): Record<string, SongListItem[]> {
  const map: Record<string, SongListItem[]> = {};
  for (const s of items) {
    const key = s.artist || "Unknown artist";
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(s);
  }
  for (const k of Object.keys(map)) {
    map[k]!.sort((a, b) => a.title.localeCompare(b.title));
  }
  return map;
}

export function SongList({ songs }: SongListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterSongs(songs, query), [songs, query]);
  const grouped = useMemo(() => groupByArtist(filtered), [filtered]);
  const artists = useMemo(() => Object.keys(grouped).sort((a, b) => a.localeCompare(b)), [grouped]);

  if (songs.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-medium text-foreground">No songs yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Import your first chord sheet from Ultimate Guitar to start playing with auto-scroll.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={query} onChange={setQuery} />
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No songs match your search.</p>
      ) : (
        <div className="flex flex-col gap-8 pb-28">
          {artists.map((artist) => (
            <section key={artist} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {artist}
              </h2>
              <ul className="flex flex-col gap-3">
                {grouped[artist]!.map((song) => (
                  <li key={song.id}>
                    <SongCard song={song} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
