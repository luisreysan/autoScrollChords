"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SyncRoomState, SyncSession } from "@/lib/sync";
import {
  isValidSyncCode,
  normalizeSyncCode,
  saveSyncSession,
  type SyncRole,
} from "@/lib/sync";

type PairDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string;
  scrollRatio: number;
  isPlaying: boolean;
  manualSpeed: number;
  fontStep: number;
  syncSession: SyncSession | null;
  onSessionChange: (session: SyncSession | null) => void;
};

type Step = "choose" | "host" | "follower";

export function PairDialog({
  open,
  onOpenChange,
  songId,
  scrollRatio,
  isPlaying,
  manualSpeed,
  fontStep,
  syncSession,
  onSessionChange,
}: PairDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [hostCode, setHostCode] = useState<string | null>(syncSession?.role === "host" ? syncSession.code : null);
  const [joinCode, setJoinCode] = useState("");

  const resetToChoose = () => {
    setStep("choose");
    setJoinCode("");
    if (syncSession?.role !== "host") {
      setHostCode(null);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (!syncSession) {
        resetToChoose();
      }
    } else if (syncSession?.role === "host") {
      setStep("host");
      setHostCode(syncSession.code);
    } else if (syncSession?.role === "follower") {
      setStep("follower");
    } else {
      resetToChoose();
    }
    onOpenChange(next);
  };

  const startHost = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          scrollRatio,
          isPlaying,
          manualSpeed,
          fontStep,
        }),
      });
      const data = (await res.json()) as {
        code?: string;
        hostSecret?: string;
        error?: string;
      };
      if (!res.ok || !data.code || !data.hostSecret) {
        throw new Error(data.error ?? "Failed to create sync room");
      }
      const session: SyncSession = {
        role: "host",
        code: data.code,
        hostSecret: data.hostSecret,
      };
      saveSyncSession(session);
      onSessionChange(session);
      setHostCode(data.code);
      setStep("host");
      toast.success(`Room created: ${data.code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setLoading(false);
    }
  };

  const joinAsFollower = async () => {
    const code = normalizeSyncCode(joinCode);
    if (!isValidSyncCode(code)) {
      toast.error("Enter a valid 5-character code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sync/rooms/${code}/join`, { method: "POST" });
      const data = (await res.json()) as { state?: SyncRoomState; error?: string };
      if (!res.ok || !data.state) {
        throw new Error(data.error ?? "Room not found or expired");
      }

      const session: SyncSession = { role: "follower", code };
      saveSyncSession(session);
      onSessionChange(session);
      toast.success(`Connected to ${code}`);

      if (data.state.songId !== songId) {
        router.push(`/songs/${data.state.songId}?sync=${code}`);
      } else {
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not join room");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!syncSession) {
      return;
    }
    setLoading(true);
    try {
      if (syncSession.role === "host" && syncSession.hostSecret) {
        await fetch(`/api/sync/rooms/${syncSession.code}`, {
          method: "DELETE",
          headers: { "x-host-secret": syncSession.hostSecret },
        });
      }
      onSessionChange(null);
      setHostCode(null);
      resetToChoose();
      toast.message("Disconnected");
      onOpenChange(false);
    } catch {
      toast.error("Could not disconnect");
    } finally {
      setLoading(false);
    }
  };

  const pickRole = (role: SyncRole) => {
    if (role === "host") {
      if (syncSession?.role === "host") {
        setStep("host");
        setHostCode(syncSession.code);
        return;
      }
      void startHost();
      return;
    }
    setStep("follower");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pair devices</DialogTitle>
          <DialogDescription>
            Host controls scroll, play, speed, and font size. Followers mirror the Host in real time.
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="flex flex-col gap-3">
            <Button type="button" className="h-12" disabled={loading} onClick={() => pickRole("host")}>
              Host session
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12"
              disabled={loading}
              onClick={() => pickRole("follower")}
            >
              Follow session
            </Button>
          </div>
        )}

        {step === "host" && hostCode && (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-sm text-muted-foreground">Share this code with your partner</p>
            <p className="font-mono text-4xl font-bold tracking-[0.35em]">{hostCode}</p>
            <Button type="button" variant="outline" disabled={loading} onClick={() => void disconnect()}>
              Disconnect
            </Button>
          </div>
        )}

        {step === "follower" && (
          <div className="flex flex-col gap-3">
            {syncSession?.role === "follower" ? (
              <p className="text-center text-sm text-muted-foreground">
                Following room <span className="font-mono font-semibold">{syncSession.code}</span>
              </p>
            ) : (
              <>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="ABCDE"
                  className="h-12 text-center font-mono text-lg tracking-widest"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  maxLength={5}
                />
                <Button type="button" className="h-12" disabled={loading} onClick={() => void joinAsFollower()}>
                  Join
                </Button>
              </>
            )}
            {syncSession?.role === "follower" && (
              <Button type="button" variant="outline" disabled={loading} onClick={() => void disconnect()}>
                Disconnect
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
