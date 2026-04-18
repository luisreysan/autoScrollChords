"use client";

import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ScrollMode } from "@/lib/types";

import { cn } from "@/lib/utils";

type ScrollControlsProps = {
  isPlaying: boolean;
  onPlayPause: () => void;
  mode: ScrollMode;
  onModeChange: (mode: ScrollMode) => void;
  durationSeconds: number | null;
  onDurationSecondsChange: (value: number | null) => void;
  manualSpeed: number;
  onManualSpeedChange: (value: number) => void;
};

export function ScrollControls({
  isPlaying,
  onPlayPause,
  mode,
  onModeChange,
  durationSeconds,
  onDurationSecondsChange,
  manualSpeed,
  onManualSpeedChange,
}: ScrollControlsProps) {
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
                <Label htmlFor="speed-slider">Speed</Label>
                <span className="font-mono tabular-nums">{manualSpeed}</span>
              </div>
              <Slider
                id="speed-slider"
                min={1}
                max={10}
                step={1}
                value={[manualSpeed]}
                onValueChange={(v) => {
                  const next = Array.isArray(v) ? v[0] : v;
                  onManualSpeedChange(typeof next === "number" ? next : 5);
                }}
                className="py-1"
              />
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
                placeholder="e.g. 180"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
