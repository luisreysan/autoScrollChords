export type ParsedSection =
  | { type: "section_header"; label: string }
  | { type: "line"; chords: string[]; lyrics: string };

export type ScrollMode = "duration" | "manual";

export type ScrollSessionPayload = {
  isPlaying: boolean;
  progress: number;
  speed: number;
  mode: ScrollMode;
  updatedAt: number;
};
