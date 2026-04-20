import type { ChordPosition, ParsedSection } from "@/lib/types";

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

function extractChordPositions(line: string): ChordPosition[] {
  const out: ChordPosition[] = [];
  const tokenRe = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(line)) !== null) {
    const token = match[0];
    if (!CHORD_TOKEN.test(token)) {
      continue;
    }
    out.push({
      chord: token,
      charIndex: match.index,
    });
  }
  return out;
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
      const chordPositions = extractChordPositions(line);
      const chords = chordPositions.length > 0 ? chordPositions.map((c) => c.chord) : splitChordTokens(trimmed);
      const next = lines[i + 1];
      if (next !== undefined && !isChordLine(next.trim()) && !next.trim().match(SECTION_HEADER)) {
        out.push({
          type: "line",
          chords,
          lyrics: next,
          ...(chordPositions.length > 0 ? { chordPositions } : {}),
        });
        i += 2;
        continue;
      }
      out.push({
        type: "line",
        chords,
        lyrics: "",
        ...(chordPositions.length > 0 ? { chordPositions } : {}),
      });
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
  const raw = JSON.parse(json) as unknown;
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: ParsedSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const section = item as Record<string, unknown>;
    if (section.type === "section_header" && typeof section.label === "string") {
      out.push({
        type: "section_header",
        label: section.label,
      });
      continue;
    }
    if (section.type !== "line") {
      continue;
    }

    const lyrics = typeof section.lyrics === "string" ? section.lyrics : "";
    const normalizedChordPositions = Array.isArray(section.chordPositions)
      ? section.chordPositions
          .map((cp) => {
            if (!cp || typeof cp !== "object") {
              return null;
            }
            const rawPos = cp as Record<string, unknown>;
            if (typeof rawPos.chord !== "string" || typeof rawPos.charIndex !== "number") {
              return null;
            }
            if (!Number.isFinite(rawPos.charIndex)) {
              return null;
            }
            return {
              chord: rawPos.chord,
              charIndex: Math.max(0, Math.floor(rawPos.charIndex)),
            };
          })
          .filter((cp): cp is NonNullable<typeof cp> => cp !== null)
      : [];

    const chordsFromArray = Array.isArray(section.chords)
      ? section.chords.filter((c): c is string => typeof c === "string")
      : [];
    const chords = chordsFromArray.length > 0 ? chordsFromArray : normalizedChordPositions.map((c) => c.chord);

    out.push({
      type: "line",
      lyrics,
      chords,
      ...(normalizedChordPositions.length > 0 ? { chordPositions: normalizedChordPositions } : {}),
    });
  }

  return out;
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
