"use client";

import { Token, FailureInfo } from "@/lib/api";
import { TAG_COLORS } from "@/lib/tagColors";
import { useState } from "react";

interface TokenSpanProps {
  tokens: Token[];
  failure?: FailureInfo | null;
}

export default function TokenSpan({ tokens, failure }: TokenSpanProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-wrap gap-3 items-start">
      {tokens.map((token, i) => {
        const isFailure = failure && failure.index === i;
        const colorClass = isFailure
          ? "bg-red-200 text-red-900 border-red-500"
          : TAG_COLORS[token.tag] || TAG_COLORS.UNKNOWN;

        return (
          <div key={i} className="relative flex flex-col items-center gap-1">
            <span
              className={`inline-block px-3 py-1.5 rounded-md border text-sm font-medium cursor-default transition-shadow ${colorClass} ${
                isFailure ? "ring-2 ring-red-400" : ""
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {token.word}
            </span>

            {token.translation && (
              <span className="text-xs text-gray-400">
                [{token.translation}]
              </span>
            )}

            {hoveredIndex === i && (
              <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                <div className="font-semibold">{token.tag}</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
