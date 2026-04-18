import Link from "next/link";
import { Plus } from "lucide-react";

import { SongList } from "@/components/SongList";
import { Button } from "@/components/ui/button";
import type { SongListItem } from "@/lib/data";
import { listSongsWithKeyChords } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  let songs: SongListItem[] = [];
  let loadError: string | null = null;
  try {
    songs = await listSongsWithKeyChords();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load songs from the database.";
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-lg px-4 pb-32 pt-8">
        <header className="mb-6 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Chord library</h1>
          <p className="text-sm text-muted-foreground">Your saved tabs with auto-scroll</p>
        </header>
        {loadError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Database not available</p>
            <p className="mt-2 whitespace-pre-wrap break-words opacity-90">{loadError}</p>
            <p className="mt-3 text-xs leading-relaxed opacity-90">
              In Vercel: Project → Settings → Environment Variables. Add{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono dark:bg-amber-900/80">
                TURSO_DATABASE_URL
              </code>{" "}
              (and{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono dark:bg-amber-900/80">
                TURSO_AUTH_TOKEN
              </code>{" "}
              for hosted Turso), apply to <strong>Production</strong>, then redeploy. Run{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono dark:bg-amber-900/80">
                npm run db:push
              </code>{" "}
              locally against that database so tables exist.
            </p>
          </div>
        ) : null}
        <SongList songs={songs} />
      </div>
      <Link
        href="/songs/add"
        className="fixed bottom-6 right-4 z-20"
        aria-label="Add song"
      >
        <Button
          size="icon-lg"
          className="h-14 w-14 min-h-[48px] min-w-[48px] rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-600/90"
        >
          <Plus className="size-7" />
        </Button>
      </Link>
    </div>
  );
}
