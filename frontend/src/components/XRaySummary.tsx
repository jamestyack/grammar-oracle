"use client";

import { XRayResponse, SentenceAnalysis } from "@/lib/api";

interface XRaySummaryProps {
  response: XRayResponse;
}

interface LLMIssue {
  sentence: string;
  issue: string;
}

function detectLLMIssues(sentences: SentenceAnalysis[]): LLMIssue[] {
  const issues: LLMIssue[] = [];
  const patterns: [RegExp, string][] = [
    [/\bse\b/i, "Reflexive pronoun \"se\" detected"],
    [/\b(le|lo|la|les|los|las)\b(?=\s+\w+(a|e|i|o|u|á|é|í|ó|ú))/i, "Possible object pronoun before verb"],
    [/\bestá\w*\s+\w+ndo\b/i, "Progressive tense (está + gerund)"],
    [/\bestaba\w*\s+\w+ndo\b/i, "Progressive tense (estaba + gerund)"],
    [/\bque\s+(es|tiene|está|era|son|hay|puede|quiere)\b/i, "Relative clause with \"que\""],
    [/\b(puede|quiere|necesita|debe|va\s+a)\s+\w+(ar|er|ir)\b/i, "Infinitive after modal verb"],
    [/\bpara\s+\w+(ar|er|ir)\b/i, "Infinitive after \"para\""],
  ];

  for (const analysis of sentences) {
    if (analysis.in_grammar_scope) continue;
    const text = analysis.sentence;
    for (const [pattern, description] of patterns) {
      if (pattern.test(text)) {
        issues.push({ sentence: analysis.original, issue: description });
      }
    }
  }
  return issues;
}

function getUnknownWords(sentences: SentenceAnalysis[]): Map<string, string[]> {
  const unknowns = new Map<string, string[]>();
  for (const analysis of sentences) {
    for (const token of analysis.result.tokens) {
      if (token.tag === "UNKNOWN") {
        const existing = unknowns.get(token.word) || [];
        if (!existing.includes(analysis.original)) {
          existing.push(analysis.original);
        }
        unknowns.set(token.word, existing);
      }
    }
  }
  return unknowns;
}

function getStructuralFailures(sentences: SentenceAnalysis[]): SentenceAnalysis[] {
  return sentences.filter((s) => {
    if (s.in_grammar_scope) return false;
    const hasUnknown = s.result.tokens.some((t) => t.tag === "UNKNOWN");
    return !hasUnknown;
  });
}

export default function XRaySummary({ response }: XRaySummaryProps) {
  const { stats, sentences } = response;
  const unknowns = getUnknownWords(sentences);
  const structuralFailures = getStructuralFailures(sentences);
  const llmIssues = detectLLMIssues(sentences);
  const failedSentences = sentences.filter((s) => !s.in_grammar_scope);
  const parsedSentences = sentences.filter((s) => s.in_grammar_scope);

  const allGood =
    stats.coverage_percentage === 100 &&
    stats.word_coverage_percentage === 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        Analysis Summary
      </h3>

      {/* Overall verdict */}
      <div
        className={`rounded-md p-3 text-sm ${
          allGood
            ? "bg-emerald-50 text-emerald-800"
            : stats.coverage_percentage >= 50
              ? "bg-amber-50 text-amber-800"
              : "bg-red-50 text-red-800"
        }`}
      >
        {allGood ? (
          <p>
            All {stats.total_sentences} sentences parsed successfully with 100%
            word recognition. The generated text fits entirely within the
            grammar&apos;s scope.
          </p>
        ) : (
          <p>
            {stats.parsed_sentences} of {stats.total_sentences} sentences (
            {stats.coverage_percentage}%) were successfully parsed.{" "}
            {stats.word_coverage_percentage}% of words were recognized by the
            lexicon.
            {failedSentences.length > 0 &&
              ` ${failedSentences.length} sentence${failedSentences.length > 1 ? "s" : ""} fell outside the grammar's scope.`}
          </p>
        )}
      </div>

      {/* Parsed sentences */}
      {parsedSentences.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
            Successfully Parsed ({parsedSentences.length})
          </h4>
          <ul className="space-y-1">
            {parsedSentences.map((s, i) => {
              const ruleCount = s.result.rulesApplied.length;
              const parseCount = s.result.parses;
              return (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-emerald-500 shrink-0">&#10003;</span>
                  <span>
                    <span className="italic">&ldquo;{s.original}&rdquo;</span>
                    <span className="text-gray-400 ml-1">
                      &mdash; {ruleCount} rules applied
                      {parseCount > 1 && `, ${parseCount} parses (ambiguous)`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Unknown words */}
      {unknowns.size > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
            Vocabulary Gaps ({unknowns.size} unknown word
            {unknowns.size > 1 ? "s" : ""})
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            These words were not found in the lexicon and prevented their
            sentences from parsing.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(unknowns.keys())
              .sort()
              .map((word) => (
                <span
                  key={word}
                  className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-mono border border-red-200"
                >
                  {word}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Structural failures (all words known but sentence still fails) */}
      {structuralFailures.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Structural Gaps ({structuralFailures.length})
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            All words were recognized, but the sentence structure doesn&apos;t
            match any grammar rule pattern. This may indicate a missing clause
            pattern or a structure the CFG doesn&apos;t cover.
          </p>
          <ul className="space-y-1.5">
            {structuralFailures.map((s, i) => {
              const tagSequence = s.result.tokens
                .map((t) => t.tag)
                .join(" ");
              return (
                <li key={i} className="text-sm">
                  <span className="text-amber-500 mr-1">&#9888;</span>
                  <span className="italic text-gray-700">
                    &ldquo;{s.original}&rdquo;
                  </span>
                  <div className="ml-5 text-xs text-gray-400 font-mono mt-0.5">
                    {tagSequence}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* LLM output issues */}
      {llmIssues.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
            LLM Output Issues ({llmIssues.length})
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            The LLM generated constructions that the grammar cannot handle.
            These patterns were explicitly discouraged in the prompt but still
            appeared.
          </p>
          <ul className="space-y-1.5">
            {llmIssues.map((issue, i) => (
              <li key={i} className="text-sm">
                <span className="text-purple-500 mr-1">&#9670;</span>
                <span className="font-medium text-purple-700 text-xs">
                  {issue.issue}
                </span>
                <span className="text-gray-500 text-xs ml-1">
                  in &ldquo;{issue.sentence.slice(0, 60)}
                  {issue.sentence.length > 60 ? "..." : ""}&rdquo;
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* If everything parsed, show a congratulatory note */}
      {allGood && (
        <p className="text-xs text-gray-400">
          No vocabulary gaps, structural issues, or LLM compliance problems
          detected.
        </p>
      )}
    </div>
  );
}
