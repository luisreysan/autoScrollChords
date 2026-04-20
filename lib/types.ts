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

export type ExtensionImportPayload = {
  sourceUrl: string;
  title: string;
  artist: string;
  rawText: string;
  tuning?: string | null;
  capo?: number | null;
  difficulty?: string | null;
};

export type ExtensionImportResponse =
  | {
      isNew: boolean;
      song: unknown;
      content: unknown;
    }
  | {
      error: string;
    };
