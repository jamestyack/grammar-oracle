"use client";

import { useState } from "react";
import { SentenceAnalysis, Token, ParseMetrics } from "@/lib/api";
import { TAG_TEXT_COLORS, TAG_UNDERLINE_COLORS, TAG_LABELS } from "@/lib/tagColors";
import ParseTreeView from "./ParseTreeView";
import RuleTrace from "./RuleTrace";

function AnnotatedWord({
  token,
  isLast,
}: {
  token: Token;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isUnknown = token.tag === "UNKNOWN";
  const textColor = TAG_TEXT_COLORS[token.tag] || TAG_TEXT_COLORS.UNKNOWN;
  const underlineColor =
    TAG_UNDERLINE_COLORS[token.tag] || TAG_UNDERLINE_COLORS.UNKNOWN;
  const label = TAG_LABELS[token.tag] || token.tag;

  return (
    <span className="relative inline">
      <span
        className={`underline decoration-2 underline-offset-4 cursor-default ${textColor} ${underlineColor} ${
          isUnknown ? "italic opacity-60" : "font-medium"
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {token.word}
      </span>
      {!isLast && <span className="text-gray-800"> </span>}

      {hovered && (
        <span className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
          <span className="font-semibold">{label}</span>
          {token.tag !== "UNKNOWN" && (
            <span className="text-gray-400 ml-1">({token.tag})</span>
          )}
          {token.translation && (
            <>
              <br />
              <span className="text-gray-300">{token.translation}</span>
            </>
          )}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

function buildInterpretation(
  metrics: ParseMetrics,
  wordCount: number,
  valid: boolean,
  ruleCount: number,
  parseCount: number,
): string[] {
  const lines: string[] = [];

  // What the parser does
  lines.push(
    `The parser used breadth-first search (BFS) to try every possible way to build a grammar tree for this ${wordCount}-word sentence.`
  );

  // Search effort
  lines.push(
    `It explored ${metrics.statesExplored.toLocaleString()} possible parsing states, expanding ${metrics.ruleExpansions.toLocaleString()} grammar rules along the way. At its busiest, ${metrics.maxQueueSize.toLocaleString()} candidate parses were being tracked simultaneously.`
  );

  // Terminal matching
  const termRate =
    metrics.terminalAttempts > 0
      ? Math.round((metrics.terminalSuccesses / metrics.terminalAttempts) * 100)
      : 0;
  lines.push(
    `Of ${metrics.terminalAttempts.toLocaleString()} attempts to match words against expected part-of-speech tags, ${metrics.terminalSuccesses.toLocaleString()} succeeded (${termRate}%). The other ${(metrics.terminalAttempts - metrics.terminalSuccesses).toLocaleString()} were dead ends where a word didn\u2019t fit the pattern being tried.`
  );

  // Outcome
  if (valid) {
    lines.push(
      `The search found ${parseCount > 1 ? `${parseCount} valid parse trees (the sentence is ambiguous)` : "a valid parse tree"}, applying ${ruleCount} grammar rules to build the structure from SENTENCE down to individual words. Each word was identified with its part of speech (DET, N, V, etc.) and the full tree shows how they combine.`
    );
  } else {
    lines.push(
      `After exhausting all possibilities, no valid parse tree could be built. This means the sentence\u2019s structure doesn\u2019t match any combination of the ${metrics.ruleExpansions > 0 ? "grammar rules" : "known words in the lexicon"}.`
    );
  }

  // Efficiency note
  const statesPerWord = wordCount > 0 ? metrics.statesExplored / wordCount : 0;
  if (statesPerWord > 500) {
    lines.push(
      `At ~${Math.round(statesPerWord)} states per word, this sentence required significant exploration \u2014 likely due to structural ambiguity or compound clauses that create many branching paths.`
    );
  } else if (statesPerWord > 200) {
    lines.push(
      `At ~${Math.round(statesPerWord)} states per word, this is a moderate amount of work for the parser.`
    );
  } else if (statesPerWord > 0) {
    lines.push(
      `At ~${Math.round(statesPerWord)} states per word, this was relatively efficient to parse.`
    );
  }

  // Speed
  lines.push(
    `Total parse time: ${metrics.parseTimeMs} ms.`
  );

  return lines;
}

function ParserMetricsView({
  metrics,
  wordCount,
  valid,
  ruleCount,
  parseCount,
}: {
  metrics: ParseMetrics;
  wordCount: number;
  valid: boolean;
  ruleCount: number;
  parseCount: number;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const statesPerWord = wordCount > 0 ? (metrics.statesExplored / wordCount).toFixed(1) : "—";
  const terminalSuccessRate =
    metrics.terminalAttempts > 0
      ? Math.round((metrics.terminalSuccesses / metrics.terminalAttempts) * 100)
      : 0;
  const branchingFactor =
    metrics.statesExplored > 0
      ? (metrics.statesGenerated / metrics.statesExplored).toFixed(1)
      : "—";

  const interpretation = buildInterpretation(metrics, wordCount, valid, ruleCount, parseCount);

  const stats = [
    { label: "States explored", value: metrics.statesExplored.toLocaleString(), hint: "BFS states dequeued" },
    { label: "States generated", value: metrics.statesGenerated.toLocaleString(), hint: "Total states created" },
    { label: "Max queue depth", value: metrics.maxQueueSize.toLocaleString(), hint: "Peak memory pressure" },
    { label: "Rule expansions", value: metrics.ruleExpansions.toLocaleString(), hint: "Non-terminal expansions" },
    {
      label: "Terminal matches",
      value: `${metrics.terminalSuccesses}/${metrics.terminalAttempts} (${terminalSuccessRate}%)`,
      hint: "Successful / attempted",
    },
    { label: "Branching factor", value: branchingFactor, hint: "Avg states generated per state explored" },
    { label: "States per word", value: statesPerWord, hint: "Parser effort relative to sentence length" },
    { label: "Parse time", value: `${metrics.parseTimeMs} ms`, hint: "Wall-clock time in Java parser" },
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
        Parser Performance
      </p>

      {/* Interpretation */}
      <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">
        {interpretation.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {/* Raw metrics toggle */}
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="text-[10px] text-slate-400 hover:text-slate-600 uppercase tracking-wide transition-colors"
      >
        {showRaw ? "\u25B2 Hide raw metrics" : "\u25BC Show raw metrics"}
      </button>

      {showRaw && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 pt-1 border-t border-slate-200">
          {stats.map((s) => (
            <div key={s.label} title={s.hint}>
              <p className="text-[10px] text-slate-400 uppercase">{s.label}</p>
              <p className="text-sm font-mono text-slate-700">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AnnotatedSentenceProps {
  analysis: SentenceAnalysis;
  index: number;
}

function AnnotatedSentence({ analysis, index }: AnnotatedSentenceProps) {
  const [expanded, setExpanded] = useState(false);
  const { result, in_grammar_scope, original, translation } = analysis;
  const tokens = result.tokens;

  return (
    <div className="mb-4">
      {/* Sentence text with clickable wrapper */}
      <div
        className={`group cursor-pointer rounded-lg px-3 py-2 -mx-3 transition-colors ${
          expanded
            ? in_grammar_scope
              ? "bg-green-50"
              : "bg-gray-50"
            : "hover:bg-gray-50"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Sentence number + scope indicator */}
        <span className="inline-flex items-center mr-2">
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${
              in_grammar_scope ? "bg-green-500" : "bg-gray-400"
            }`}
          >
            {index + 1}
          </span>
        </span>

        {/* Annotated words */}
        {tokens.length > 0 ? (
          tokens.map((token, i) => (
            <AnnotatedWord
              key={i}
              token={token}
              isLast={i === tokens.length - 1}
            />
          ))
        ) : (
          <span className="text-gray-400 italic">{original}</span>
        )}

        {/* Scope badge */}
        <span
          className={`inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            in_grammar_scope
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {in_grammar_scope ? "\u2713 parsed" : "outside scope"}
        </span>

        {/* Expand indicator */}
        <span className="text-gray-400 text-xs ml-1">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </div>

      {/* Translation */}
      {translation && (
        <p className="text-sm text-gray-400 italic ml-10 mt-0.5">
          {translation}
        </p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="ml-7 mt-2 space-y-3">
          {/* Original text */}
          <p className="text-xs text-gray-500 italic">
            Original: &ldquo;{original}&rdquo;
          </p>

          {/* Parse tree */}
          {result.parseTree && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
                Parse Tree
              </p>
              <ParseTreeView tree={result.parseTree} tokens={tokens} />
            </div>
          )}

          {/* Rule trace */}
          {result.rulesApplied.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
                Grammar Rules Applied
              </p>
              <RuleTrace rules={result.rulesApplied} />
            </div>
          )}

          {/* Parser performance metrics */}
          {result.metrics && (
            <ParserMetricsView
              metrics={result.metrics}
              wordCount={tokens.length}
              valid={in_grammar_scope}
              ruleCount={result.rulesApplied.length}
              parseCount={result.parses}
            />
          )}

          {/* Failure info for out-of-scope sentences */}
          {!in_grammar_scope && result.error && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Parser Note
              </p>
              <p className="text-xs text-gray-600">{result.error}</p>
            </div>
          )}

          {!in_grammar_scope && result.failure && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Structure Issue
              </p>
              <p className="text-xs text-gray-600">{result.failure.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AnnotatedParagraphProps {
  sentences: SentenceAnalysis[];
}

export default function AnnotatedParagraph({
  sentences,
}: AnnotatedParagraphProps) {
  return (
    <div className="text-lg leading-relaxed">
      {sentences.map((analysis, i) => (
        <AnnotatedSentence key={i} analysis={analysis} index={i} />
      ))}
    </div>
  );
}
