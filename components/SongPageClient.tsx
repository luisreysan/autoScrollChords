"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChordViewer } from "@/components/ChordViewer";
import { ScrollControls } from "@/components/ScrollControls";
import { SyncButton } from "@/components/SyncButton";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Song, SongContent } from "@/db/schema";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useScrollSync } from "@/hooks/useScrollSync";
import { parseParsedSectionsJson } from "@/lib/parser";
import type { ScrollMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type SongPageClientProps = {
  song: Song;
  content: SongContent;
};

const FONT_STEPS = ["text-sm", "text-base", "text-lg"] as const;

export function SongPageClient({ song, content }: SongPageClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [fontStep, setFontStep] = useState(1);

  const [isPlaying, setIsPlaying] = useState(false);
  const initialMode: ScrollMode =
    song.scrollMode ?? (song.durationSeconds && song.durationSeconds > 0 ? "duration" : "manual");
  const [mode, setMode] = useState<ScrollMode>(initialMode);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(song.durationSeconds);
  const [manualSpeed, setManualSpeed] = useState(() => {
    const s = song.scrollSpeed;
    if (typeof s === "number" && Number.isFinite(s)) {
      return Math.min(10, Math.max(1, Math.round(s)));
    }
    return 5;
  });

  const [syncEnabled, setSyncEnabled] = useState(false);
  const [progress, setProgress] = useState(0);

  const sections = useMemo(
    () => parseParsedSectionsJson(content.parsedSections),
    [content.parsedSections],
  );

  const fontClass = FONT_STEPS[fontStep] ?? FONT_STEPS[1];

  const isLeader = syncEnabled && isPlaying;

  useAutoScroll({
    scrollRef,
    isPlaying,
    onPlayingChange: setIsPlaying,
    mode,
    durationSeconds,
    manualSpeed,
    onProgress: setProgress,
  });

  const syncSpeed = mode === "manual" ? manualSpeed : durationSeconds ?? 0;

  useScrollSync({
    songId: song.id,
    enabled: syncEnabled,
    isLeader,
    isPlaying,
    progress,
    speed: syncSpeed,
    mode,
    scrollRef,
  });

  const patchSong = useCallback(
    async (payload: {
      duration_seconds?: number | null;
      scroll_speed?: number | null;
      scroll_mode?: ScrollMode | null;
    }) => {
      try {
        const res = await fetch(`/api/songs/${song.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(typeof err.error === "string" ? err.error : "Failed to save");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save preferences");
      }
    },
    [song.id],
  );

  const skipFirstPatch = useRef(true);
  useEffect(() => {
    if (skipFirstPatch.current) {
      skipFirstPatch.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      void patchSong({
        duration_seconds: durationSeconds,
        scroll_speed: manualSpeed,
        scroll_mode: mode,
      });
    }, 650);
    return () => window.clearTimeout(handle);
  }, [durationSeconds, manualSpeed, mode, patchSong]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    setProgress(max > 0 ? el.scrollTop / max : 0);
  };

  const cycleFont = () => {
    setFontStep((s) => (s + 1) % FONT_STEPS.length);
  };

  const togglePlay = () => {
    if (mode === "duration" && (!durationSeconds || durationSeconds <= 0)) {
      toast.message("Set a duration in seconds or switch to manual mode.");
      return;
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-3">
          <Link
            href="/"
            aria-label="Back to library"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-lg" }),
              "inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center",
            )}
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight">{song.title}</h1>
            <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="min-h-[48px] min-w-[48px] shrink-0"
            onClick={cycleFont}
            aria-label="Change font size"
          >
            <Type className="size-5" />
          </Button>
        </div>
        <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
          <div className="mx-auto flex max-w-lg flex-col px-3 pb-2">
            <CollapsibleTrigger
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "flex h-11 min-h-[44px] w-full items-center justify-between px-2 text-sm text-muted-foreground",
              )}
            >
              Capo &amp; tuning
              {metaOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 px-2 pb-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Capo: </span>
                {song.capo != null ? song.capo : "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Tuning: </span>
                {song.tuning ?? "—"}
              </p>
              {song.difficulty && (
                <p>
                  <span className="font-medium text-foreground">Difficulty: </span>
                  {song.difficulty}
                </p>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      </header>

      <main
        ref={scrollRef}
        onScroll={onScroll}
        className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-[calc(14rem+env(safe-area-inset-bottom))] pt-4"
      >
        <ChordViewer sections={sections} fontSizeClass={fontClass} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto max-w-lg space-y-2 px-3 pt-2">
          <SyncButton enabled={syncEnabled} onToggle={() => setSyncEnabled((s) => !s)} />
          <ScrollControls
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            mode={mode}
            onModeChange={setMode}
            durationSeconds={durationSeconds}
            onDurationSecondsChange={setDurationSeconds}
            manualSpeed={manualSpeed}
            onManualSpeedChange={setManualSpeed}
          />
        </div>
      </div>
    </div>
  );
}
