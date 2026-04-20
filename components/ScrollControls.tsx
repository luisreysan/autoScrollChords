"use client";

import { Minus, Pause, Play, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ScrollMode } from "@/lib/types";

import { cn } from "@/lib/utils";

const MIN_MANUAL_SPEED = 0.1;
const MAX_MANUAL_SPEED = 3.0;
const MANUAL_SPEED_STEP = 0.1;

type ScrollControlsProps = {
  isPlaying: boolean;
  onPlayPause: () => void;
  canPlay: boolean;
  playHint?: string | null;
  mode: ScrollMode;
  onModeChange: (mode: ScrollMode) => void;
  durationSeconds: number | null;
  onDurationSecondsChange: (value: number | null) => void;
  manualSpeed: number;
  onManualSpeedChange: (value: number) => void;
};

function formatSecondsAsMinutes(seconds: number): string {
  const safe = Math.max(1, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function ScrollControls({
  isPlaying,
  onPlayPause,
  canPlay,
  playHint,
  mode,
  onModeChange,
  durationSeconds,
  onDurationSecondsChange,
  manualSpeed,
  onManualSpeedChange,
}: ScrollControlsProps) {
  const clampedManualSpeed = Number(
    Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, manualSpeed)).toFixed(1),
  );

  const adjustManualSpeed = (delta: number) => {
    const next = clampedManualSpeed + delta;
    onManualSpeedChange(
      Number(Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, next)).toFixed(1)),
    );
  };

  return (
    <div className="flex flex-col gap-4 px-2 py-3">
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="default"
          className={cn(
            "h-14 min-h-[48px] min-w-[56px] rounded-full px-6 text-base shadow-md",
            "bg-blue-600 text-white hover:bg-blue-600/90",
          )}
          onClick={onPlayPause}
          disabled={!canPlay}
          aria-label={isPlaying ? "Pause scroll" : "Play scroll"}
        >
          {isPlaying ? <Pause className="size-8" /> : <Play className="size-8 pl-0.5" />}
        </Button>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "duration" ? "default" : "outline"}
              className="min-h-[40px] flex-1"
              onClick={() => onModeChange("duration")}
            >
              Duration
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "default" : "outline"}
              className="min-h-[40px] flex-1"
              onClick={() => onModeChange("manual")}
            >
              Manual
            </Button>
          </div>
          {mode === "manual" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Label htmlFor="manual-speed-input">Speed</Label>
                <span className="font-mono tabular-nums">{clampedManualSpeed.toFixed(1)}</span>
              </div>
              <div className="flex h-11 items-center rounded-full border border-input bg-background px-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
                  onClick={() => adjustManualSpeed(-MANUAL_SPEED_STEP)}
                  aria-label="Decrease manual speed"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  id="manual-speed-input"
                  type="text"
                  inputMode="decimal"
                  className="h-full w-full border-none bg-transparent px-2 text-center font-mono text-base tabular-nums outline-none"
                  value={clampedManualSpeed.toFixed(1)}
                  onChange={(e) => {
                    const normalized = e.target.value.replace(",", ".").trim();
                    if (!normalized) {
                      return;
                    }
                    const parsed = Number.parseFloat(normalized);
                    if (Number.isFinite(parsed)) {
                      onManualSpeedChange(
                        Number(
                          Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, parsed)).toFixed(1),
                        ),
                      );
                    }
                  }}
                />
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
                  onClick={() => adjustManualSpeed(MANUAL_SPEED_STEP)}
                  aria-label="Increase manual speed"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="duration-input" className="text-xs text-muted-foreground">
                Duration (seconds)
              </Label>
              <input
                id="duration-input"
                type="number"
                inputMode="numeric"
                min={1}
                className="h-11 min-h-[44px] w-full rounded-lg border border-input bg-background px-3 font-mono text-sm"
                value={durationSeconds ?? ""}
                placeholder="e.g. 180 (3:00)"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    onDurationSecondsChange(null);
                    return;
                  }
                  const n = Number.parseInt(raw, 10);
                  if (Number.isFinite(n) && n > 0) {
                    onDurationSecondsChange(n);
                  }
                }}
              />
              {durationSeconds && durationSeconds > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Formatted: <span className="font-mono">{formatSecondsAsMinutes(durationSeconds)}</span>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
      {playHint ? <p className="text-center text-xs text-muted-foreground">{playHint}</p> : null}
    </div>
  );
}
