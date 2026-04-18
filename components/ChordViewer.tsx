"use client";

import type { ParsedSection } from "@/lib/types";

import { cn } from "@/lib/utils";

type ChordViewerProps = {
  sections: ParsedSection[];
  fontSizeClass?: string;
  className?: string;
};

function ChordToken({ chord }: { chord: string }) {
  return (
    <span className="inline-flex items-center rounded bg-blue-100 px-1 py-0.5 font-mono text-blue-700">
      {chord}
    </span>
  );
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
            {section.chords.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-x-2 gap-y-1">
                {section.chords.map((c, i) => (
                  <ChordToken key={`${idx}-c-${i}`} chord={c} />
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap text-foreground">{section.lyrics}</p>
          </div>
        );
      })}
    </div>
  );
}
