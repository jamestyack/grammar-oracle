"use client";

import { useState } from "react";
import { XRayResponse } from "@/lib/api";
import { TAG_TEXT_COLORS, TAG_LABELS } from "@/lib/tagColors";
import XRayStatsBar from "./XRayStatsBar";
import AnnotatedParagraph from "./AnnotatedParagraph";
import XRaySummary from "./XRaySummary";

function LLMInspector({ response }: { response: XRayResponse }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          LLM Prompt &amp; Response
        </span>
        <span className="text-gray-400 text-xs">
          {open ? "\u25B2" : "\u25BC"}
        </span>
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {/* System prompt */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1.5">
              System Prompt
            </p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-purple-50 rounded-md p-3 max-h-64 overflow-y-auto leading-relaxed">
              {response.system_prompt}
            </pre>
          </div>

          {/* User message */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1.5">
              User Message
            </p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-blue-50 rounded-md p-3 leading-relaxed">
              {response.user_message}
            </pre>
          </div>

          {/* LLM response */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5">
              Claude Response
            </p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-emerald-50 rounded-md p-3 leading-relaxed">
              {response.generated_text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface XRayViewProps {
  response: XRayResponse;
}

export default function XRayView({ response }: XRayViewProps) {
  const uniqueTags = response.stats.unique_pos_tags.filter(
    (t) => t !== "UNKNOWN"
  );

  return (
    <div className="space-y-6">
      {/* Generated text header */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-2">
          Claude Generated
        </p>
        <p className="text-base text-gray-800 italic leading-relaxed">
          &ldquo;{response.generated_text}&rdquo;
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Prompt: &ldquo;{response.prompt}&rdquo;
        </p>
      </div>

      {/* LLM Prompt & Response Inspector */}
      <LLMInspector response={response} />

      {/* Stats */}
      <XRayStatsBar stats={response.stats} />

      {/* POS Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          Color Key:
        </span>
        {uniqueTags.map((tag) => (
          <span key={tag} className="flex items-center gap-1">
            <span
              className={`text-sm font-medium ${TAG_TEXT_COLORS[tag] || "text-gray-500"}`}
            >
              {TAG_LABELS[tag] || tag}
            </span>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="text-sm italic text-gray-400">Unknown</span>
        </span>
      </div>

      {/* Annotated paragraph */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Grammar X-Ray
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <AnnotatedParagraph sentences={response.sentences} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Click any sentence to expand its parse tree. Hover over words for POS
          tags and translations.
        </p>
      </div>

      {/* Analysis Summary */}
      <XRaySummary response={response} />
    </div>
  );
}
