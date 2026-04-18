"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ScrollMode } from "@/lib/types";

type UseAutoScrollOptions = {
  scrollRef: React.RefObject<HTMLElement | null>;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  mode: ScrollMode;
  durationSeconds: number | null;
  manualSpeed: number;
  onProgress: (progress: number) => void;
};

export function useAutoScroll({
  scrollRef,
  isPlaying,
  onPlayingChange,
  mode,
  durationSeconds,
  manualSpeed,
  onProgress,
}: UseAutoScrollOptions) {
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pxPerMsRef = useRef(0);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && isPlaying) {
        onPlayingChange(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isPlaying, onPlayingChange]);

  useEffect(() => {
    if (!isPlaying) {
      stopRaf();
      return;
    }

    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);

    if (mode === "duration" && durationSeconds && durationSeconds > 0) {
      pxPerMsRef.current = maxScroll / (durationSeconds * 1000);
    } else {
      pxPerMsRef.current = manualSpeed * 0.05;
    }

    lastTsRef.current = performance.now();

    const tick = (now: number) => {
      const elInner = scrollRef.current;
      if (!elInner) {
        return;
      }

      if (document.visibilityState === "hidden") {
        onPlayingChange(false);
        return;
      }

      const last = lastTsRef.current ?? now;
      const dt = now - last;
      lastTsRef.current = now;

      const max = Math.max(0, elInner.scrollHeight - elInner.clientHeight);
      elInner.scrollTop += pxPerMsRef.current * dt;

      const progress = max > 0 ? Math.min(1, elInner.scrollTop / max) : 1;
      onProgress(progress);

      if (elInner.scrollTop >= max - 0.75) {
        onPlayingChange(false);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      stopRaf();
    };
  }, [
    isPlaying,
    mode,
    durationSeconds,
    manualSpeed,
    onPlayingChange,
    onProgress,
    scrollRef,
    stopRaf,
  ]);

  return { stopRaf };
}
