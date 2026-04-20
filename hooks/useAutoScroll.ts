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
  const virtualScrollTopRef = useRef(0);
  const loopRunningRef = useRef(false);
  const debugUntilRef = useRef(0);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
    loopRunningRef.current = false;
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
    if (maxScroll <= 0) {
      onProgress(1);
      onPlayingChange(false);
      return;
    }

    virtualScrollTopRef.current = el.scrollTop;

    if (mode === "duration" && durationSeconds && durationSeconds > 0) {
      pxPerMsRef.current = maxScroll / (durationSeconds * 1000);
    } else {
      // Manual mode needs visibly faster movement on mobile screens.
      // Slider 1..10 -> 0.12..1.20 px/ms
      pxPerMsRef.current = Math.max(0.14, manualSpeed * 0.14);
    }

    debugUntilRef.current =
      process.env.NODE_ENV === "development" ? performance.now() + 2000 : 0;
    lastTsRef.current = performance.now();
    loopRunningRef.current = true;

    if (debugUntilRef.current > 0) {
      console.debug("[useAutoScroll] play-start", {
        isPlaying,
        mode,
        durationSeconds,
        manualSpeed,
        maxScroll,
        pxPerMs: pxPerMsRef.current,
        scrollTop: virtualScrollTopRef.current,
      });
    }

    const tick = (now: number) => {
      const elInner = scrollRef.current;
      if (!elInner) {
        stopRaf();
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
      if (max <= 0) {
        onProgress(1);
        onPlayingChange(false);
        return;
      }

      virtualScrollTopRef.current = Math.min(
        max,
        Math.max(0, virtualScrollTopRef.current + pxPerMsRef.current * dt),
      );
      elInner.scrollTop = virtualScrollTopRef.current;

      const progress = max > 0 ? Math.min(1, elInner.scrollTop / max) : 1;
      onProgress(progress);

      if (debugUntilRef.current > now) {
        console.debug("[useAutoScroll] tick", {
          dt,
          maxScroll: max,
          pxPerMs: pxPerMsRef.current,
          scrollTop: elInner.scrollTop,
          virtualTop: virtualScrollTopRef.current,
          progress,
        });
      }

      if (elInner.scrollTop >= max - 0.75) {
        onPlayingChange(false);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (!loopRunningRef.current || rafRef.current == null) {
      rafRef.current = requestAnimationFrame(tick);
    }

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
