"use client";

import Link from "next/link";
import { ChevronUp, Link2, Settings2, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChordViewer } from "@/components/ChordViewer";
import { PairDialog } from "@/components/PairDialog";
import { ScrollControls } from "@/components/ScrollControls";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import type { Song, SongContent } from "@/db/schema";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useSyncSession } from "@/hooks/useSyncSession";
import { normalizeTabTextForDisplay, parseParsedSectionsJson, sectionsToTabText } from "@/lib/parser";
import {
  clearSyncSession,
  isValidSyncCode,
  loadSyncSession,
  normalizeSyncCode,
  saveSyncSession,
  type SyncSession,
} from "@/lib/sync";
import { cn } from "@/lib/utils";

type SongPageClientProps = {
  song: Song;
  content: SongContent;
  initialSyncCode?: string | null;
};

const FONT_STEPS = ["text-sm", "text-base", "text-lg"] as const;
const MIN_MANUAL_SPEED = 0.1;
const MAX_MANUAL_SPEED = 30.0;

export function SongPageClient({ song, content, initialSyncCode }: SongPageClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [fontStep, setFontStep] = useState(1);
  const [pairOpen, setPairOpen] = useState(false);
  const [syncSession, setSyncSession] = useState<SyncSession | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [manualSpeed, setManualSpeed] = useState(() => {
    const s = song.scrollSpeed;
    if (typeof s === "number" && Number.isFinite(s) && s > 0) {
      return Number(Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, s)).toFixed(2));
    }
    return 0.2;
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
    const stored = loadSyncSession();
    const urlCode = initialSyncCode ? normalizeSyncCode(initialSyncCode) : null;

    if (stored) {
      setSyncSession(stored);
      return;
    }

    if (urlCode && isValidSyncCode(urlCode)) {
      const followerSession: SyncSession = { role: "follower", code: urlCode };
      saveSyncSession(followerSession);
      setSyncSession(followerSession);
    }
  }, [initialSyncCode]);

  const handleRoomLost = useCallback(() => {
    clearSyncSession();
    setSyncSession(null);
    toast.message("Sync session ended or expired");
  }, []);

  const handleSessionChange = useCallback((session: SyncSession | null) => {
    if (session) {
      saveSyncSession(session);
    } else {
      clearSyncSession();
    }
    setSyncSession(session);
  }, []);

  const getScrollRatio = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return 0;
    }
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    if (max <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, el.scrollTop / max));
  }, []);

  const { isFollower, isHost } = useSyncSession({
    scrollRef,
    songId: song.id,
    syncSession,
    isPlaying,
    manualSpeed,
    fontStep,
    setIsPlaying,
    setManualSpeed,
    setFontStep,
    onRoomLost: handleRoomLost,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      setHasScrollableContent(true);
      return;
    }

    const evaluateScrollable = () => {
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

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", evaluateScrollable);
    window.addEventListener("orientationchange", evaluateScrollable);
    window.addEventListener("resize", evaluateScrollable);

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
    isPlaying: isFollower ? false : isPlaying,
    onPlayingChange: setIsPlaying,
    manualSpeed,
    onProgress: () => {},
  });

  const patchSong = useCallback(
    async (payload: { scroll_speed?: number | null; scroll_mode?: "manual" | null }) => {
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
        scroll_speed: manualSpeed,
        scroll_mode: "manual",
      });
    }, 650);
    return () => window.clearTimeout(handle);
  }, [manualSpeed, patchSong]);

  const cycleFont = () => {
    if (isFollower) {
      return;
    }
    setFontStep((s) => (s + 1) % FONT_STEPS.length);
  };

  const clampManualSpeed = useCallback((value: number) => {
    if (!Number.isFinite(value)) {
      return MIN_MANUAL_SPEED;
    }
    return Number(Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, value)).toFixed(2));
  }, []);

  const togglePlay = () => {
    if (isFollower) {
      return;
    }

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

    setIsPlaying((p) => !p);
  };

  const syncLabel = syncSession
    ? isHost
      ? `Host · ${syncSession.code}`
      : `Following · ${syncSession.code}`
    : null;

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
            {syncLabel ? (
              <p className="truncate text-xs font-medium text-blue-600 dark:text-blue-400">{syncLabel}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant={syncSession ? "default" : "outline"}
            size="icon-lg"
            className={cn(
              "min-h-[48px] min-w-[48px] shrink-0",
              syncSession && "bg-blue-600 text-white hover:bg-blue-600/90",
            )}
            onClick={() => setPairOpen(true)}
            aria-label="Pair devices"
          >
            <Link2 className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="min-h-[48px] min-w-[48px] shrink-0"
            onClick={cycleFont}
            disabled={isFollower}
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
        className={cn(
          "mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 pb-[calc(14rem+env(safe-area-inset-bottom))] pt-4",
          isFollower && "touch-pan-y",
        )}
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
            canPlay={hasScrollableContent && !isFollower}
            playHint={
              isFollower
                ? "Following host — playback is controlled on the host device."
                : hasScrollableContent
                  ? null
                  : "No scroll area available for this song yet."
            }
            manualSpeed={manualSpeed}
            onManualSpeedChange={(value) => setManualSpeed(clampManualSpeed(value))}
            speedControlsDisabled={isFollower}
          />
        </div>
      </div>

      <PairDialog
        open={pairOpen}
        onOpenChange={setPairOpen}
        songId={song.id}
        scrollRatio={getScrollRatio()}
        isPlaying={isPlaying}
        manualSpeed={manualSpeed}
        fontStep={fontStep}
        syncSession={syncSession}
        onSessionChange={handleSessionChange}
      />
    </div>
  );
}
