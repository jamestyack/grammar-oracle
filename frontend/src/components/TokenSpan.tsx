"use client";

import { Token, FailureInfo } from "@/lib/api";
import { useState } from "react";

const TAG_COLORS: Record<string, string> = {
  DET: "bg-blue-100 text-blue-800 border-blue-300",
  N: "bg-green-100 text-green-800 border-green-300",
  V: "bg-red-100 text-red-800 border-red-300",
  V_COP: "bg-red-100 text-red-800 border-red-300",
  V_EX: "bg-red-100 text-red-800 border-red-300",
  A: "bg-purple-100 text-purple-800 border-purple-300",
  ADV: "bg-orange-100 text-orange-800 border-orange-300",
  NEG: "bg-gray-100 text-gray-600 border-gray-300",
  PREP: "bg-yellow-100 text-yellow-800 border-yellow-300",
  CONJ: "bg-teal-100 text-teal-800 border-teal-300",
  PRON: "bg-indigo-100 text-indigo-800 border-indigo-300",
  UNKNOWN: "bg-gray-200 text-gray-500 border-gray-400",
};

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
