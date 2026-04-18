"use client";

import { useEffect, useRef } from "react";

import type { ScrollMode } from "@/lib/types";

type UseScrollSyncOptions = {
  songId: string;
  enabled: boolean;
  isLeader: boolean;
  isPlaying: boolean;
  progress: number;
  speed: number;
  mode: ScrollMode;
  scrollRef: React.RefObject<HTMLElement | null>;
};

export function useScrollSync({
  songId,
  enabled,
  isLeader,
  isPlaying,
  progress,
  speed,
  mode,
  scrollRef,
}: UseScrollSyncOptions) {
  const progressRef = useRef(progress);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  const modeRef = useRef(mode);

  progressRef.current = progress;
  isPlayingRef.current = isPlaying;
  speedRef.current = speed;
  modeRef.current = mode;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const tick = async () => {
      try {
        if (isLeader) {
          await fetch(`/api/scroll/${songId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isPlaying: isPlayingRef.current,
              progress: progressRef.current,
              speed: speedRef.current,
              mode: modeRef.current,
            }),
          });
          return;
        }

        const res = await fetch(`/api/scroll/${songId}`, { method: "GET" });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          session: {
            isPlaying: boolean;
            progress: number;
            speed: number;
            mode: ScrollMode;
          } | null;
        };
        const session = data.session;
        if (!session) {
          return;
        }

        const el = scrollRef.current;
        if (!el) {
          return;
        }
        const max = Math.max(0, el.scrollHeight - el.clientHeight);
        el.scrollTop = session.progress * max;
      } catch {
        /* network errors ignored for polling */
      }
    };

    const intervalRef = setInterval(tick, 500);
    void tick();

    return () => clearInterval(intervalRef);
  }, [enabled, isLeader, scrollRef, songId]);
}
