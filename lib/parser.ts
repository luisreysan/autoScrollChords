import type { ParsedSection } from "@/lib/types";

/** Matches common guitar chord symbols (letters, #/b, sus/add/dim/aug variants, slash bass). */
const CHORD_TOKEN =
  /^(?:N\.?C\.?|[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G](?:#|b)?)?)$/i;

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  const parts = trimmed.split(/\s+/);
  return parts.every((p) => CHORD_TOKEN.test(p));
}

function splitChordTokens(line: string): string[] {
  return line
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const SECTION_HEADER = /^\[([A-Z][^\]]*)\]$/;

/**
 * Parses Ultimate Guitar-style plain text into structured sections and chord/lyric pairs.
 */
export function parseTabText(raw: string): ParsedSection[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: ParsedSection[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const sectionMatch = trimmed.match(SECTION_HEADER);
    if (sectionMatch) {
      out.push({ type: "section_header", label: sectionMatch[1]!.trim() });
      i += 1;
      continue;
    }

    if (isChordLine(trimmed)) {
      const chords = splitChordTokens(trimmed);
      const next = lines[i + 1];
      if (next !== undefined && !isChordLine(next.trim()) && !next.trim().match(SECTION_HEADER)) {
        out.push({ type: "line", chords, lyrics: next });
        i += 2;
        continue;
      }
      out.push({ type: "line", chords, lyrics: "" });
      i += 1;
      continue;
    }

    out.push({ type: "line", chords: [], lyrics: line });
    i += 1;
  }

  return out;
}

export function parsedSectionsToJson(sections: ParsedSection[]): string {
  return JSON.stringify(sections);
}

export function parseParsedSectionsJson(json: string): ParsedSection[] {
  return JSON.parse(json) as ParsedSection[];
}

/**
 * Collects up to `limit` unique chord tokens in first-seen order from parsed sections.
 */
export function extractKeyChords(sections: ParsedSection[], limit = 3): string[] {
  const seen = new Set<string>();
  const chords: string[] = [];
  for (const s of sections) {
    if (s.type !== "line") {
      continue;
    }
    for (const c of s.chords) {
      const key = c.trim();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      chords.push(key);
      if (chords.length >= limit) {
        return chords;
      }
    }
  }
  return chords;
}
