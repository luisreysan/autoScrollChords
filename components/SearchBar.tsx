"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

export function SearchBar({ value, onChange, id = "song-search" }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Label htmlFor={id} className="sr-only">
        Search songs
      </Label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title or artist"
        className="h-12 min-h-[48px] rounded-xl pl-10"
        autoComplete="off"
      />
    </div>
  );
}
