import Link from "next/link";
import { Plus } from "lucide-react";

import { SongList } from "@/components/SongList";
import { Button } from "@/components/ui/button";
import { listSongsWithKeyChords } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const songs = await listSongsWithKeyChords();

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-lg px-4 pb-32 pt-8">
        <header className="mb-6 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Chord library</h1>
          <p className="text-sm text-muted-foreground">Your saved tabs with auto-scroll</p>
        </header>
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
