"use client";

import Link from "next/link";
import { ChevronUp, Settings2, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChordViewer } from "@/components/ChordViewer";
import { ScrollControls } from "@/components/ScrollControls";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import type { Song, SongContent } from "@/db/schema";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { normalizeTabTextForDisplay, parseParsedSectionsJson, sectionsToTabText } from "@/lib/parser";
import type { ScrollMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type SongPageClientProps = {
  song: Song;
  content: SongContent;
};

const FONT_STEPS = ["text-sm", "text-base", "text-lg"] as const;
const MIN_MANUAL_SPEED = 0.1;
const MAX_MANUAL_SPEED = 30.0;

export function SongPageClient({ song, content }: SongPageClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
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
      // Backward compatibility:
      // Previous decimal range was 0.1..3.0. New range is 0.1..30.0 where 1.0 ~= old 0.1.
      if (s > 0 && s <= 3) {
        return Number(Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, s * 10)).toFixed(1));
      }
      // Older integer-style values (and already-migrated values) remain valid in new range.
      return Number(Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, s)).toFixed(1));
    }
    return 1.0;
  });

  const [hasScrollableContent, setHasScrollableContent] = useState(true);

  const sections = useMemo(
    () => parseParsedSectionsJson(content.parsedSections),
    [content.parsedSections],
  );
  const tabText = useMemo(() => {
    const raw = typeof content.rawText === "string" ? normalizeTabTextForDisplay(content.rawText) : "";
    if (raw.length > 0) {
      return raw;
    }
    return sectionsToTabText(sections);
  }, [content.rawText, sections]);

  const fontClass = FONT_STEPS[fontStep] ?? FONT_STEPS[1];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      setHasScrollableContent(true);
      return;
    }

    const evaluateScrollable = () => {
      // Use a small tolerance because Android viewport/toolbars can produce +/-1px noise.
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      setHasScrollableContent(maxScroll > 1);
    };

    evaluateScrollable();

    const observer = new ResizeObserver(evaluateScrollable);
    observer.observe(el);
    const contentEl = scrollContentRef.current;
    if (contentEl) {
      observer.observe(contentEl);
    }

    const mutationObserver = new MutationObserver(evaluateScrollable);
    if (contentEl) {
      mutationObserver.observe(contentEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Chrome Android can change effective viewport as URL bars expand/collapse.
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", evaluateScrollable);
    window.addEventListener("orientationchange", evaluateScrollable);
    window.addEventListener("resize", evaluateScrollable);

    // Re-check after fonts and initial paints settle.
    const rafA = window.requestAnimationFrame(evaluateScrollable);
    const rafB = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(evaluateScrollable);
    });
    void document.fonts?.ready.then(() => {
      evaluateScrollable();
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      viewport?.removeEventListener("resize", evaluateScrollable);
      window.removeEventListener("orientationchange", evaluateScrollable);
      window.removeEventListener("resize", evaluateScrollable);
      window.cancelAnimationFrame(rafA);
      window.cancelAnimationFrame(rafB);
    };
  }, [fontStep, sections.length]);

  useAutoScroll({
    scrollRef,
    isPlaying,
    onPlayingChange: setIsPlaying,
    mode,
    durationSeconds,
    manualSpeed,
    onProgress: () => {},
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

  const cycleFont = () => {
    setFontStep((s) => (s + 1) % FONT_STEPS.length);
  };

  const clampManualSpeed = useCallback((value: number) => {
    if (!Number.isFinite(value)) {
      return MIN_MANUAL_SPEED;
    }
    return Number(Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, value)).toFixed(1));
  }, []);

  const togglePlay = () => {
    const el = scrollRef.current;
    if (!el) {
      toast.message("Scroll container is not ready yet.");
      return;
    }

    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    if (maxScroll <= 0) {
      toast.message("This song has no scrollable content at the current font size.");
      return;
    }

    if (mode === "duration" && (!durationSeconds || durationSeconds <= 0)) {
      toast.message("Set a duration in seconds or switch to manual mode.");
      return;
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
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
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="min-h-[48px] min-w-[48px] shrink-0"
            onClick={() => setMetaOpen((open) => !open)}
            aria-expanded={metaOpen}
            aria-label={metaOpen ? "Hide capo and tuning" : "Show capo and tuning"}
          >
            {metaOpen ? <ChevronUp className="size-5" /> : <Settings2 className="size-5" />}
          </Button>
        </div>
        <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
          <div className="mx-auto max-w-lg px-3">
            <CollapsibleContent className="space-y-1 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
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
        className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 pb-[calc(14rem+env(safe-area-inset-bottom))] pt-4"
      >
        <div ref={scrollContentRef}>
          <ChordViewer sections={sections} tabText={tabText} fontSizeClass={fontClass} />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto max-w-lg space-y-2 px-3 pt-2">
          <ScrollControls
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            canPlay={hasScrollableContent}
            playHint={hasScrollableContent ? null : "No scroll area available for this song yet."}
            mode={mode}
            onModeChange={setMode}
            durationSeconds={durationSeconds}
            onDurationSecondsChange={setDurationSeconds}
            manualSpeed={manualSpeed}
            onManualSpeedChange={(value) => setManualSpeed(clampManualSpeed(value))}
          />
        </div>
      </div>
    </div>
  );
}
