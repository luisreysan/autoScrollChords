"use client";

import type { ParsedSection } from "@/lib/types";

import { cn } from "@/lib/utils";

type ChordViewerProps = {
  sections: ParsedSection[];
  fontSizeClass?: string;
  className?: string;
};

type ChordRenderSlot = {
  chord: string;
  originalCharIndex: number;
  renderCharIndex: number;
};

function ChordToken({ chord }: { chord: string }) {
  return (
    <span className="inline-flex items-center rounded bg-blue-100 px-1 py-0.5 font-mono text-blue-700">
      {chord}
    </span>
  );
}

function buildChordRenderSlots(section: Extract<ParsedSection, { type: "line" }>): ChordRenderSlot[] {
  const positions = section.chordPositions ?? [];
  if (positions.length === 0) {
    return [];
  }

  const sorted = [...positions].sort((a, b) => a.charIndex - b.charIndex);
  const lineLength = section.lineLength ?? section.lyrics.length;
  const spread = sorted.length > 1 ? sorted[sorted.length - 1]!.charIndex - sorted[0]!.charIndex : 0;
  const looksClusteredNearStart =
    sorted.length >= 2 &&
    lineLength >= 24 &&
    spread <= Math.max(2, sorted.length * 2) &&
    sorted[0]!.charIndex <= 1;

  const wordStartColumns = Array.from(section.lyrics.matchAll(/\S+/g)).map((m) => m.index ?? 0);
  let basePositions = sorted;
  if (looksClusteredNearStart && wordStartColumns.length > 0) {
    const maxIdx = Math.max(1, sorted.length - 1);
    const maxWordIdx = Math.max(0, wordStartColumns.length - 1);
    basePositions = sorted.map((cp, idx) => {
      const wordIdx = Math.round((idx / maxIdx) * maxWordIdx);
      return {
        chord: cp.chord,
        charIndex: wordStartColumns[wordIdx] ?? cp.charIndex,
      };
    });
  }

  const slots: ChordRenderSlot[] = [];
  for (const cp of basePositions) {
    const prev = slots[slots.length - 1];
    const minStart = prev ? prev.renderCharIndex + prev.chord.length + 1 : 0;
    const renderCharIndex = Math.max(cp.charIndex, minStart);
    slots.push({
      chord: cp.chord,
      originalCharIndex: cp.charIndex,
      renderCharIndex,
    });
  }
  return slots;
}

export function ChordViewer({ sections, fontSizeClass = "text-base", className }: ChordViewerProps) {
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
              <div className="mb-1 min-h-6 overflow-x-auto">
                {(() => {
                  const slots = buildChordRenderSlots(section);
                  const lineLength = section.lineLength ?? section.lyrics.length;
                  const requiredFromSlots = slots.reduce(
                    (max, slot) => Math.max(max, slot.renderCharIndex + slot.chord.length),
                    0,
                  );
                  const gridWidth = Math.max(24, lineLength + 2, requiredFromSlots + 1);

                  return (
                    <div className="relative h-6 min-w-full" style={{ width: `${gridWidth}ch` }}>
                      {slots.map((slot, i) => (
                        <span
                          key={`${idx}-cp-${i}`}
                          className="absolute top-0"
                          title={
                            slot.renderCharIndex !== slot.originalCharIndex
                              ? `Adjusted from column ${slot.originalCharIndex}`
                              : undefined
                          }
                          style={{ left: `${slot.renderCharIndex}ch` }}
                        >
                          <ChordToken chord={slot.chord} />
                        </span>
                      ))}
                    </div>
                  );
                })()}
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
