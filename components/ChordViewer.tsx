"use client";

import type { ReactNode } from "react";

import { wordStart } from "@/lib/chord-layout";
import type { ChordPosition, ParsedSection } from "@/lib/types";

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

function MonoLyricSegment({ chord, text }: { chord: string | null; text: string }) {
  const chordRow = chord ?? "\u00a0";
  return (
    <span className="inline-flex max-w-full flex-col align-top">
      <span
        className={cn("font-bold leading-none whitespace-pre", !chord && "invisible select-none")}
        aria-hidden={!chord ? true : undefined}
      >
        {chordRow}
      </span>
      <span className="whitespace-pre-wrap break-words">{text}</span>
    </span>
  );
}

function renderChordLyricSegmentRow(segments: ChordLyricSegment[], keyPrefix: string) {
  return (
    <div className="flex flex-wrap items-end gap-x-0 gap-y-1">
      {segments.map((segment) => (
        <MonoLyricSegment
          key={`${keyPrefix}-${segment.id}`}
          chord={segment.chord}
          text={segment.text}
        />
      ))}
    </div>
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
    const segmentStart = wordStart(section.lyrics, current.charIndex);
    const segmentEnd = next
      ? wordStart(section.lyrics, next.charIndex)
      : section.lyrics.length;

    if (segmentStart > cursor) {
      segments.push({
        id: `plain-${i}`,
        chord: null,
        text: section.lyrics.slice(cursor, segmentStart),
      });
    }

    const chunk = section.lyrics.slice(segmentStart, segmentEnd);
    segments.push({
      id: `chord-${i}`,
      chord: current.chord,
      text: chunk.length > 0 ? chunk : " ",
    });

    cursor = segmentEnd;
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

function isSectionHeaderLine(line: string): boolean {
  return /^\[[^\]]+\]$/.test(line.trim());
}

function extractChordPositionsFromLine(chordLine: string): ChordPosition[] {
  const out: ChordPosition[] = [];
  const tokenRe = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(chordLine)) !== null) {
    const token = match[0];
    if (CHORD_TOKEN.test(token)) {
      out.push({ chord: token, charIndex: match.index });
    }
  }
  return out;
}

function canPairChordLineWithNext(chordLine: string, nextLine: string | undefined): boolean {
  if (!isChordOnlyLine(chordLine) || nextLine === undefined) {
    return false;
  }
  const next = nextLine.trim();
  if (!next || isSectionHeaderLine(nextLine) || isChordOnlyLine(nextLine)) {
    return false;
  }
  return true;
}

function renderMonoChordLyricSegments(chordLine: string, lyricLine: string, blockKey: string) {
  const chordPositions = extractChordPositionsFromLine(chordLine);
  const section: Extract<ParsedSection, { type: "line" }> = {
    type: "line",
    chords: chordPositions.map((cp) => cp.chord),
    lyrics: lyricLine,
    ...(chordPositions.length > 0 ? { chordPositions } : {}),
  };
  const segments = buildChordLyricSegments(section);
  return renderChordLyricSegmentRow(segments, blockKey);
}

function renderTabTextBlocks(lines: string[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let blockIdx = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") {
      nodes.push(<br key={`br-${blockIdx}`} />);
      i += 1;
      blockIdx += 1;
      continue;
    }

    if (isSectionHeaderLine(line)) {
      nodes.push(
        <span key={`hdr-${blockIdx}`} className="block whitespace-pre-wrap [overflow-wrap:anywhere]">
          {line}
        </span>,
      );
      i += 1;
      blockIdx += 1;
      continue;
    }

    if (canPairChordLineWithNext(line, lines[i + 1])) {
      const lyricLine = lines[i + 1] ?? "";
      nodes.push(
        <div key={`pair-${blockIdx}`} className="block">
          {renderMonoChordLyricSegments(line, lyricLine, `pair-${blockIdx}`)}
        </div>,
      );
      i += 2;
      blockIdx += 1;
      continue;
    }

    if (isChordOnlyLine(line)) {
      nodes.push(
        <span
          key={`chord-${blockIdx}`}
          className="block font-bold whitespace-pre-wrap [overflow-wrap:anywhere]"
        >
          {line}
        </span>,
      );
      i += 1;
      blockIdx += 1;
      continue;
    }

    nodes.push(
      <span key={`txt-${blockIdx}`} className="block whitespace-pre-wrap [overflow-wrap:anywhere]">
        {line}
      </span>,
    );
    i += 1;
    blockIdx += 1;
  }

  return nodes;
}

export function ChordViewer({ sections, tabText, fontSizeClass = "text-base", className }: ChordViewerProps) {
  if (tabText && tabText.trim().length > 0) {
    const lines = tabText.replace(/\r\n/g, "\n").split("\n");
    return (
      <div
        className={cn(
          "max-w-full overflow-x-hidden font-mono leading-[1.8] text-foreground break-words",
          fontSizeClass,
          className,
        )}
      >
        {renderTabTextBlocks(lines)}
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
              <div className="mb-1">{renderChordLyricSegmentRow(buildChordLyricSegments(section), `l-${idx}`)}</div>
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
