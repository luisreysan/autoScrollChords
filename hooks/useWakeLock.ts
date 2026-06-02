"use client";

import { useEffect, useRef } from "react";

type UseWakeLockOptions = {
  enabled: boolean;
};

export function useWakeLock({ enabled }: UseWakeLockOptions) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let cancelled = false;

    const release = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // already released
        }
        wakeLockRef.current = null;
      }
    };

    const request = async () => {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }
      try {
        await release();
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // unsupported or denied
      }
    };

    void request();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void request();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [enabled]);
}
