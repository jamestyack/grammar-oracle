"use client";

import { useState } from "react";
import { XRayStats } from "@/lib/api";
import { TAG_TEXT_COLORS, TAG_LABELS } from "@/lib/tagColors";

interface XRayStatsBarProps {
  stats: XRayStats;
}

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function XRayStatsBar({ stats }: XRayStatsBarProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Sentence coverage */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Sentence Coverage
        </p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {stats.parsed_sentences}
          </span>
          <span className="text-sm text-gray-500">
            of {stats.total_sentences} sentences
          </span>
        </div>
        <ProgressBar
          value={stats.parsed_sentences}
          max={stats.total_sentences}
          color="bg-emerald-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {stats.coverage_percentage}% within grammar scope
        </p>
      </div>

      {/* Word coverage */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Word Recognition
        </p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {stats.known_words}
          </span>
          <span className="text-sm text-gray-500">
            of {stats.total_words} words
          </span>
        </div>
        <ProgressBar
          value={stats.known_words}
          max={stats.total_words}
          color="bg-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {stats.word_coverage_percentage}% in lexicon
        </p>
      </div>

      {/* POS tags + rules */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Grammar Features Found
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {stats.unique_pos_tags
            .filter((t) => t !== "UNKNOWN")
            .map((tag) => (
              <span
                key={tag}
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  TAG_TEXT_COLORS[tag] || "text-gray-500"
                } bg-gray-50 border border-gray-200`}
              >
                {TAG_LABELS[tag] || tag}
              </span>
            ))}
        </div>
        {stats.rules_used.length > 0 && (
          <button
            onClick={() => setShowRules(!showRules)}
            className="text-xs text-emerald-600 hover:text-emerald-700 underline"
          >
            {showRules
              ? "Hide rules"
              : `${stats.rules_used.length} grammar rules used`}
          </button>
        )}
        {showRules && (
          <div className="mt-2 space-y-0.5">
            {stats.rules_used.map((r) => (
              <p key={r.number} className="text-xs text-gray-600 font-mono">
                {r.rule.replace("->", "\u2192")}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
