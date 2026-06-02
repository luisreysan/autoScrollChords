"use client";

import { useCallback, useEffect, useRef } from "react";

import type { SyncRoomState, SyncSession } from "@/lib/sync";

const HOST_BROADCAST_MS = 80;
const FOLLOWER_POLL_MS = 100;

type UseSyncSessionOptions = {
  scrollRef: React.RefObject<HTMLElement | null>;
  songId: string;
  syncSession: SyncSession | null;
  isPlaying: boolean;
  manualSpeed: number;
  fontStep: number;
  setIsPlaying: (playing: boolean) => void;
  setManualSpeed: (speed: number) => void;
  setFontStep: (step: number) => void;
  onRoomLost?: () => void;
};

export function useSyncSession({
  scrollRef,
  songId,
  syncSession,
  isPlaying,
  manualSpeed,
  fontStep,
  setIsPlaying,
  setManualSpeed,
  setFontStep,
  onRoomLost,
}: UseSyncSessionOptions) {
  const isProgrammaticScrollRef = useRef(false);
  const broadcastTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pendingScrollRatioRef = useRef<number | null>(null);
  const lastAppliedFontStepRef = useRef(fontStep);
  const stateRef = useRef({ isPlaying, manualSpeed, fontStep, songId });

  useEffect(() => {
    stateRef.current = { isPlaying, manualSpeed, fontStep, songId };
  }, [isPlaying, manualSpeed, fontStep, songId]);

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
  }, [scrollRef]);

  const applyScrollRatio = useCallback(
    (ratio: number) => {
      const el = scrollRef.current;
      if (!el) {
        return;
      }
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      isProgrammaticScrollRef.current = true;
      el.scrollTop = ratio * max;
      isProgrammaticScrollRef.current = false;
    },
    [scrollRef],
  );

  const applyRemoteState = useCallback(
    (state: SyncRoomState) => {
      const speed = Number(state.manualSpeed.toFixed(2));
      if (stateRef.current.manualSpeed !== speed) {
        setManualSpeed(speed);
      }
      if (stateRef.current.isPlaying !== state.isPlaying) {
        setIsPlaying(state.isPlaying);
      }

      const fontChanged = lastAppliedFontStepRef.current !== state.fontStep;
      if (fontChanged) {
        lastAppliedFontStepRef.current = state.fontStep;
        setFontStep(state.fontStep);
        pendingScrollRatioRef.current = state.scrollRatio;
        return;
      }

      applyScrollRatio(state.scrollRatio);
    },
    [applyScrollRatio, setFontStep, setIsPlaying, setManualSpeed],
  );

  useEffect(() => {
    if (syncSession?.role !== "follower") {
      return;
    }
    if (pendingScrollRatioRef.current == null) {
      return;
    }
    const ratio = pendingScrollRatioRef.current;
    let rafB = 0;
    const rafA = requestAnimationFrame(() => {
      rafB = requestAnimationFrame(() => {
        applyScrollRatio(ratio);
        pendingScrollRatioRef.current = null;
      });
    });
    return () => {
      cancelAnimationFrame(rafA);
      cancelAnimationFrame(rafB);
    };
  }, [fontStep, syncSession?.role, applyScrollRatio]);

  const broadcastNow = useCallback(async () => {
    if (!syncSession || syncSession.role !== "host" || !syncSession.hostSecret) {
      return;
    }
    const { isPlaying: playing, manualSpeed: speed, fontStep: step, songId: currentSongId } =
      stateRef.current;

    try {
      const res = await fetch(`/api/sync/rooms/${syncSession.code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-host-secret": syncSession.hostSecret,
        },
        body: JSON.stringify({
          songId: currentSongId,
          scrollRatio: getScrollRatio(),
          isPlaying: playing,
          manualSpeed: speed,
          fontStep: step,
        }),
      });
      if (res.status === 403 || res.status === 404) {
        onRoomLost?.();
      }
    } catch {
      // ignore transient network errors
    }
  }, [getScrollRatio, onRoomLost, syncSession]);

  const scheduleBroadcast = useCallback(() => {
    if (!syncSession || syncSession.role !== "host") {
      return;
    }
    if (broadcastTimerRef.current != null) {
      return;
    }
    broadcastTimerRef.current = window.setTimeout(() => {
      broadcastTimerRef.current = null;
      void broadcastNow();
    }, HOST_BROADCAST_MS);
  }, [broadcastNow, syncSession]);

  useEffect(() => {
    if (!syncSession || syncSession.role !== "host") {
      return;
    }

    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const onScroll = () => {
      if (isProgrammaticScrollRef.current) {
        return;
      }
      scheduleBroadcast();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    scheduleBroadcast();

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (broadcastTimerRef.current != null) {
        window.clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
    };
  }, [scheduleBroadcast, scrollRef, syncSession]);

  useEffect(() => {
    if (!syncSession || syncSession.role !== "host") {
      return;
    }
    scheduleBroadcast();
  }, [isPlaying, manualSpeed, fontStep, songId, scheduleBroadcast, syncSession]);

  useEffect(() => {
    if (!syncSession || syncSession.role !== "host" || !isPlaying) {
      return;
    }
    let raf = 0;
    const loop = () => {
      scheduleBroadcast();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, scheduleBroadcast, syncSession]);

  useEffect(() => {
    if (!syncSession || syncSession.role !== "follower") {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await fetch(`/api/sync/rooms/${syncSession.code}`);
        if (!res.ok) {
          if (res.status === 404) {
            onRoomLost?.();
          }
          return;
        }
        const data = (await res.json()) as { state?: SyncRoomState };
        if (data.state) {
          applyRemoteState(data.state);
        }
      } catch {
        // ignore transient network errors
      }
    };

    void poll();
    pollTimerRef.current = window.setInterval(() => {
      void poll();
    }, FOLLOWER_POLL_MS);

    return () => {
      cancelled = true;
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [applyRemoteState, onRoomLost, syncSession]);

  const isFollower = syncSession?.role === "follower";
  const isHost = syncSession?.role === "host";

  return { isFollower, isHost, isProgrammaticScrollRef };
}
