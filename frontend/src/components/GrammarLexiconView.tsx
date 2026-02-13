"use client";

import { useState, useMemo } from "react";
import { GrammarDetail, GrammarRule as GrammarRuleType } from "@/lib/api";
import { TAG_COLORS, TAG_LABELS } from "@/lib/tagColors";

const NON_TERMINAL_COLORS: Record<string, string> = {
  SENTENCE: "text-gray-900 bg-gray-100",
  S: "text-gray-800 bg-gray-100",
  CLAUSE: "text-indigo-800 bg-indigo-50",
  NP: "text-green-800 bg-green-50",
  NP_EX: "text-emerald-800 bg-emerald-50",
  BASE_NP: "text-green-700 bg-green-50",
  VP: "text-red-800 bg-red-50",
  PP: "text-yellow-800 bg-yellow-50",
};

const LHS_ORDER = ["SENTENCE", "S", "CLAUSE", "NP", "NP_EX", "BASE_NP", "VP", "PP"];

function SymbolBadge({ symbol }: { symbol: string }) {
  const isTerminal = TAG_COLORS[symbol] !== undefined;
  if (isTerminal) {
    return (
      <span
        className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-medium ${TAG_COLORS[symbol]}`}
      >
        {symbol}
      </span>
    );
  }
  const color = NON_TERMINAL_COLORS[symbol] || "text-gray-700 bg-gray-50";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-medium border border-current/10 ${color}`}
    >
      {symbol}
    </span>
  );
}

function RuleRow({ rule }: { rule: GrammarRuleType }) {
  return (
    <div className="flex items-start gap-2 py-1.5 group">
      <span className="text-[10px] text-gray-400 font-mono w-6 text-right shrink-0 pt-0.5">
        #{rule.number}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <SymbolBadge symbol={rule.lhs} />
        <span className="text-gray-400 mx-0.5">&rarr;</span>
        {rule.rhs.map((sym, i) => (
          <SymbolBadge key={i} symbol={sym} />
        ))}
      </div>
      {rule.comment && (
        <span className="text-xs text-gray-400 italic ml-2 hidden sm:inline">
          {rule.comment}
        </span>
      )}
    </div>
  );
}

function RuleGroup({
  lhs,
  rules,
  defaultExpanded,
}: {
  lhs: string;
  rules: GrammarRuleType[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const color = NON_TERMINAL_COLORS[lhs] || "text-gray-700 bg-gray-50";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400 text-xs">{expanded ? "\u25BC" : "\u25B6"}</span>
        <span
          className={`inline-block px-2 py-0.5 rounded text-sm font-mono font-bold ${color}`}
        >
          {lhs}
        </span>
        <span className="text-xs text-gray-400">
          {rules.length} rule{rules.length !== 1 ? "s" : ""}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-2 border-t border-gray-100 bg-gray-50/50">
          {rules.map((rule) => (
            <RuleRow key={rule.number} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}

function POSTagLegend({ tags }: { tags: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Part-of-Speech Tags
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div key={tag} className="flex items-center gap-1.5">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${
                TAG_COLORS[tag] || TAG_COLORS.UNKNOWN
              }`}
            >
              {tag}
            </span>
            <span className="text-xs text-gray-500">
              {TAG_LABELS[tag] || tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LexiconTable({
  entries,
  posTags,
}: {
  entries: GrammarDetail["lexicon_entries"];
  posTags: string[];
}) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = entries;
    if (tagFilter) {
      result = result.filter((e) => e.tag === tagFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.word.toLowerCase().includes(q) ||
          e.translation.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, search, tagFilter]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.tag] = (counts[e.tag] || 0) + 1;
    }
    return counts;
  }, [entries]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Lexicon
        </p>
        <span className="text-xs text-gray-400">
          Showing {filtered.length} of {entries.length} words
        </span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search words or translations..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />

      {/* Tag filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTagFilter(null)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            tagFilter === null
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {posTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              tagFilter === tag
                ? TAG_COLORS[tag] || TAG_COLORS.UNKNOWN
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tag} ({tagCounts[tag] || 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                Spanish
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                POS
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                English
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((entry, i) => (
              <tr key={`${entry.word}-${entry.tag}-${i}`} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 font-medium text-gray-900">
                  {entry.word}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                      TAG_COLORS[entry.tag] || TAG_COLORS.UNKNOWN
                    }`}
                  >
                    {entry.tag}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-gray-500">{entry.translation}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-gray-400 italic">
                  No matches found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface GrammarLexiconViewProps {
  detail: GrammarDetail;
}

export default function GrammarLexiconView({ detail }: GrammarLexiconViewProps) {
  const rulesByLhs = useMemo(() => {
    const groups: Record<string, GrammarRuleType[]> = {};
    for (const rule of detail.grammar_rules) {
      if (!groups[rule.lhs]) groups[rule.lhs] = [];
      groups[rule.lhs].push(rule);
    }
    // Sort by logical order
    const ordered: { lhs: string; rules: GrammarRuleType[] }[] = [];
    for (const lhs of LHS_ORDER) {
      if (groups[lhs]) {
        ordered.push({ lhs, rules: groups[lhs] });
        delete groups[lhs];
      }
    }
    // Any remaining
    for (const [lhs, rules] of Object.entries(groups)) {
      ordered.push({ lhs, rules });
    }
    return ordered;
  }, [detail.grammar_rules]);

  return (
    <div className="space-y-6">
      {/* POS Tag Legend */}
      <POSTagLegend tags={detail.pos_tags} />

      {/* Grammar Rules */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Grammar Rules ({detail.grammar_rules.length} rules)
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Rules define how symbols combine to form valid sentences. The parser tries every
          combination using breadth-first search, starting from SENTENCE and expanding
          downward until reaching terminal POS tags that match words in the lexicon.
        </p>
        <div className="space-y-2">
          {rulesByLhs.map(({ lhs, rules }) => (
            <RuleGroup
              key={lhs}
              lhs={lhs}
              rules={rules}
              defaultExpanded={lhs === "CLAUSE" || lhs === "SENTENCE" || lhs === "S"}
            />
          ))}
        </div>
      </div>

      {/* Lexicon */}
      <LexiconTable entries={detail.lexicon_entries} posTags={detail.pos_tags} />
    </div>
  );
}
