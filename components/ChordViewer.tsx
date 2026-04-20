"use client";

import type { ParsedSection } from "@/lib/types";

import { cn } from "@/lib/utils";

type ChordViewerProps = {
  sections: ParsedSection[];
  tabText?: string;
  fontSizeClass?: string;
  className?: string;
};

const CHORD_TOKEN =
  /^(?:N\.?C\.?|[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G](?:#|b)?)?)$/i;

function isChordOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  if (/^\[[^\]]+\]$/.test(trimmed)) {
    return false;
  }
  const parts = trimmed.split(/\s+/);
  return parts.length > 0 && parts.every((p) => CHORD_TOKEN.test(p));
}

type ChordLyricSegment = {
  id: string;
  chord: string | null;
  text: string;
};

function ChordToken({ chord }: { chord: string }) {
  return (
    <span className="inline-flex items-center rounded bg-blue-100 px-1 py-0.5 font-mono text-blue-700">
      {chord}
    </span>
  );
}

function buildChordLyricSegments(
  section: Extract<ParsedSection, { type: "line" }>,
): ChordLyricSegment[] {
  const positions = section.chordPositions ?? [];
  if (positions.length === 0 || section.lyrics.length === 0) {
    return [{ id: "plain-0", chord: null, text: section.lyrics }];
  }

  const sorted = [...positions]
    .filter((cp) => typeof cp.chord === "string" && cp.chord.trim().length > 0)
    .map((cp) => ({
      chord: cp.chord.trim(),
      charIndex: Math.max(0, Math.min(section.lyrics.length, Math.floor(cp.charIndex))),
    }))
    .sort((a, b) => a.charIndex - b.charIndex);

  if (sorted.length === 0) {
    return [{ id: "plain-0", chord: null, text: section.lyrics }];
  }

  const segments: ChordLyricSegment[] = [];
  let cursor = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i]!;
    const next = sorted[i + 1];
    const start = current.charIndex;
    const end = next ? next.charIndex : section.lyrics.length;

    if (start > cursor) {
      segments.push({
        id: `plain-${i}`,
        chord: null,
        text: section.lyrics.slice(cursor, start),
      });
    }

    const chunk = section.lyrics.slice(start, end);
    segments.push({
      id: `chord-${i}`,
      chord: current.chord,
      text: chunk.length > 0 ? chunk : " ",
    });

    cursor = end;
  }

  if (cursor < section.lyrics.length) {
    segments.push({
      id: "plain-tail",
      chord: null,
      text: section.lyrics.slice(cursor),
    });
  }

  return segments.length > 0 ? segments : [{ id: "plain-fallback", chord: null, text: section.lyrics }];
}

export function ChordViewer({ sections, tabText, fontSizeClass = "text-base", className }: ChordViewerProps) {
  if (tabText && tabText.trim().length > 0) {
    const lines = tabText.replace(/\r\n/g, "\n").split("\n");
    return (
      <div
        className={cn(
          "max-w-full overflow-x-hidden font-mono leading-[1.8] text-foreground",
          fontSizeClass,
          className,
        )}
      >
        <pre className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-transparent p-0">
          {lines.map((line, idx) => (
            <span key={`pre-line-${idx}`} className={isChordOnlyLine(line) ? "font-bold" : undefined}>
              {line}
              {idx < lines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </pre>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "max-w-full overflow-x-hidden font-mono leading-[1.8] text-foreground break-words",
        fontSizeClass,
        className,
      )}
    >
      {sections.map((section, idx) => {
        if (section.type === "section_header") {
          return (
            <p
              key={`h-${idx}`}
              className="mb-3 mt-6 first:mt-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              [{section.label}]
            </p>
          );
        }

        return (
          <div key={`l-${idx}`} className="mb-4">
            {section.chordPositions && section.chordPositions.length > 0 ? (
              <div className="mb-1 flex flex-wrap items-start gap-x-0 gap-y-1">
                {buildChordLyricSegments(section).map((segment) =>
                  segment.chord ? (
                    <span key={`${idx}-${segment.id}`} className="inline-flex max-w-full flex-col align-top">
                      <span className="mb-0.5 leading-none">
                        <ChordToken chord={segment.chord} />
                      </span>
                      <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{segment.text}</span>
                    </span>
                  ) : (
                    <span
                      key={`${idx}-${segment.id}`}
                      className="whitespace-pre-wrap [overflow-wrap:anywhere]"
                    >
                      {segment.text}
                    </span>
                  ),
                )}
              </div>
            ) : section.chords.length > 0 ? (
              <div className="mb-1 flex flex-wrap gap-x-2 gap-y-1">
                {section.chords.map((c, i) => (
                  <ChordToken key={`${idx}-c-${i}`} chord={c} />
                ))}
              </div>
            ) : null}
            <p className="whitespace-pre-wrap text-foreground">{section.lyrics}</p>
          </div>
        );
      })}
    </div>
  );
}
