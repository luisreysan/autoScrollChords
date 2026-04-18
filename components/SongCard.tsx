import Link from "next/link";

import type { SongListItem } from "@/lib/data";

type SongCardProps = {
  song: SongListItem;
};

export function SongCard({ song }: SongCardProps) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-muted/60"
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold leading-snug text-foreground">{song.title}</p>
        <p className="text-sm text-muted-foreground">{song.artist}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {song.capo != null && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">Capo {song.capo}</span>
          )}
          {song.keyChords.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {song.keyChords.map((c) => (
                <span
                  key={c}
                  className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700"
                >
                  {c}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
