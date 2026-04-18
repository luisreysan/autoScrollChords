"use client";

import { Link2, Link2Off } from "lucide-react";

import { Button } from "@/components/ui/button";

type SyncButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function SyncButton({ enabled, onToggle }: SyncButtonProps) {
  return (
    <Button
      type="button"
      variant={enabled ? "default" : "outline"}
      className="h-12 min-h-[48px] w-full gap-2"
      onClick={onToggle}
      aria-pressed={enabled}
    >
      {enabled ? <Link2 className="size-5" /> : <Link2Off className="size-5" />}
      {enabled ? "Synced scroll on" : "Sync scroll (off)"}
    </Button>
  );
}
