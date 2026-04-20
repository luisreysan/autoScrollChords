export type ChordPosition = {
  chord: string;
  charIndex: number;
};

export type ParsedSection =
  | { type: "section_header"; label: string }
  | {
      type: "line";
      chords: string[];
      lyrics: string;
      chordPositions?: ChordPosition[];
      lineLength?: number;
      chordLineRaw?: string;
    };

export type ScrollMode = "manual";

export type ExtensionImportPayload = {
  sourceUrl: string;
  title: string;
  artist: string;
  rawText: string;
  positionedSections?: ParsedSection[];
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
