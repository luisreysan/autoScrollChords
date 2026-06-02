"use client";

import { Minus, Pause, Play, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

const MIN_MANUAL_SPEED = 0.1;
const MAX_MANUAL_SPEED = 30.0;
const MANUAL_SPEED_STEP = 0.05;

const speedButtonClassName = cn(
  "h-14 min-h-[48px] min-w-[56px] rounded-full px-6 text-base shadow-md",
  "bg-muted text-foreground hover:bg-muted/80",
);

type ScrollControlsProps = {
  isPlaying: boolean;
  onPlayPause: () => void;
  canPlay: boolean;
  playHint?: string | null;
  manualSpeed: number;
  onManualSpeedChange: (value: number) => void;
  speedControlsDisabled?: boolean;
};

export function ScrollControls({
  isPlaying,
  onPlayPause,
  canPlay,
  playHint,
  manualSpeed,
  onManualSpeedChange,
  speedControlsDisabled = false,
}: ScrollControlsProps) {
  const clampedManualSpeed = Number(
    Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, manualSpeed)).toFixed(2),
  );

  const adjustManualSpeed = (delta: number) => {
    const next = clampedManualSpeed + delta;
    onManualSpeedChange(
      Number(Math.min(MAX_MANUAL_SPEED, Math.max(MIN_MANUAL_SPEED, next)).toFixed(2)),
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
        <div className="flex flex-1 items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className={speedButtonClassName}
            onClick={() => adjustManualSpeed(-MANUAL_SPEED_STEP)}
            disabled={speedControlsDisabled}
            aria-label="Decrease manual speed"
          >
            <Minus className="size-6" />
          </Button>
          <span
            className="min-w-[4rem] text-center font-mono text-lg tabular-nums"
            aria-live="polite"
            aria-label={`Speed ${clampedManualSpeed.toFixed(2)}`}
          >
            {clampedManualSpeed.toFixed(2)}
          </span>
          <Button
            type="button"
            variant="secondary"
            className={speedButtonClassName}
            onClick={() => adjustManualSpeed(MANUAL_SPEED_STEP)}
            disabled={speedControlsDisabled}
            aria-label="Increase manual speed"
          >
            <Plus className="size-6" />
          </Button>
        </div>
      </div>
      {playHint ? <p className="text-center text-xs text-muted-foreground">{playHint}</p> : null}
    </div>
  );
}
