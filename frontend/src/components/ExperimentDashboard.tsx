"use client";

import { useState, useMemo } from "react";
import {
  ExperimentSummary,
  ExperimentDetail,
  ExperimentResult,
  BaselineMetrics,
  VerifyLoopResponse,
} from "@/lib/api";
import VerifierLoopView from "./VerifierLoopView";

// --- Feedback mode display names ---
const MODE_LABELS: Record<string, string> = {
  structural: "Structural Feedback",
  generic: "Generic Feedback",
  none: "Single-shot (No Feedback)",
};

const MODE_COLORS: Record<string, string> = {
  structural: "bg-green-100 text-green-800",
  generic: "bg-amber-100 text-amber-800",
  none: "bg-gray-100 text-gray-700",
};

const TEMPLATE_LABELS: Record<string, string> = {
  copular: "Copular",
  transitive: "Transitive",
  existential: "Existential",
  pp: "Prepositional",
  negation: "Negation",
  conjunction: "Conjunction",
};

const FAILURE_LABELS: Record<string, string> = {
  oov_word: "Out-of-Vocabulary Word",
  missing_det: "Missing Determiner",
  wrong_pos: "Wrong Part of Speech",
  unsupported_construction: "Unsupported Construction",
  error: "Parser Error",
};

const FAILURE_COLORS: Record<string, string> = {
  oov_word: "bg-purple-200",
  missing_det: "bg-blue-200",
  wrong_pos: "bg-orange-200",
  unsupported_construction: "bg-red-200",
  error: "bg-gray-200",
};

// --- Progress Bar ---
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function pctColor(pct: number): string {
  if (pct >= 80) return "bg-green-400";
  if (pct >= 60) return "bg-amber-400";
  return "bg-red-400";
}

function pctTextColor(pct: number): string {
  if (pct >= 80) return "text-green-700";
  if (pct >= 60) return "text-amber-700";
  return "text-red-700";
}

// --- Metric Card ---
function MetricCard({
  label,
  value,
  subtitle,
  pct,
}: {
  label: string;
  value: string;
  subtitle?: string;
  pct?: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${pct !== undefined ? pctTextColor(pct) : "text-gray-900"}`}>
        {value}
      </p>
      {pct !== undefined && (
        <div className="mt-2">
          <ProgressBar value={pct} color={pctColor(pct)} />
        </div>
      )}
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// --- Metrics Summary ---
function MetricsSummary({ baseline }: { baseline: BaselineMetrics }) {
  const isMultiAttempt = baseline.feedback_mode !== "none";
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        label="pass@1"
        value={`${baseline.pass_at_1}%`}
        subtitle="Valid on first attempt"
        pct={baseline.pass_at_1}
      />
      {isMultiAttempt ? (
        <MetricCard
          label={`pass@k`}
          value={`${baseline.pass_at_k}%`}
          subtitle="Valid within all attempts"
          pct={baseline.pass_at_k}
        />
      ) : (
        <MetricCard
          label="pass@k"
          value="--"
          subtitle="N/A for single-shot"
        />
      )}
      <MetricCard
        label="Mean Retries"
        value={isMultiAttempt ? baseline.mean_retries_to_pass.toFixed(1) : "--"}
        subtitle={isMultiAttempt ? "For successful generations" : "N/A for single-shot"}
      />
      <MetricCard
        label="Latency"
        value={`${baseline.mean_latency_seconds.toFixed(1)}s`}
        subtitle={`p95: ${baseline.p95_latency_seconds.toFixed(1)}s`}
      />
    </div>
  );
}

// --- Baseline Comparison Table ---
function BaselineComparison({ baselines }: { baselines: BaselineMetrics[] }) {
  if (baselines.length < 2) return null;

  const rows = [
    { label: "pass@1", fmt: (b: BaselineMetrics) => `${b.pass_at_1}%` },
    {
      label: "pass@k",
      fmt: (b: BaselineMetrics) =>
        b.feedback_mode !== "none" ? `${b.pass_at_k}%` : "--",
    },
    {
      label: "Mean retries",
      fmt: (b: BaselineMetrics) =>
        b.feedback_mode !== "none" ? b.mean_retries_to_pass.toFixed(2) : "--",
    },
    {
      label: "Mean latency",
      fmt: (b: BaselineMetrics) => `${b.mean_latency_seconds.toFixed(1)}s`,
    },
    {
      label: "p95 latency",
      fmt: (b: BaselineMetrics) => `${b.p95_latency_seconds.toFixed(1)}s`,
    },
  ];

  // Collect all template IDs
  const allTemplates = new Set<string>();
  baselines.forEach((b) =>
    Object.keys(b.template_breakdown).forEach((t) => allTemplates.add(t))
  );
  const templateIds = Array.from(allTemplates).sort();

  return (
    <div className="space-y-6">
      {/* Main comparison table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                Metric
              </th>
              {baselines.map((b) => (
                <th
                  key={b.feedback_mode}
                  className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase"
                >
                  {MODE_LABELS[b.feedback_mode] || b.feedback_mode}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-700">
                  {row.label}
                </td>
                {baselines.map((b) => (
                  <td
                    key={b.feedback_mode}
                    className="px-4 py-2 text-right text-gray-900 font-mono"
                  >
                    {row.fmt(b)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-template breakdown */}
      {templateIds.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Per-Template pass@k
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {templateIds.map((tid) => (
              <div key={tid} className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  {TEMPLATE_LABELS[tid] || tid}
                </p>
                <div className="space-y-1">
                  {baselines.map((b) => {
                    const td = b.template_breakdown[tid];
                    const pk = b.feedback_mode !== "none" ? td?.pass_at_k : td?.pass_at_1;
                    const val = pk ?? 0;
                    return (
                      <div key={b.feedback_mode} className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${MODE_COLORS[b.feedback_mode] || "bg-gray-100 text-gray-600"}`}>
                          {b.feedback_mode}
                        </span>
                        <div className="flex-1">
                          <ProgressBar value={val} color={pctColor(val)} />
                        </div>
                        <span className="text-xs font-mono text-gray-600 w-10 text-right">
                          {val}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Failure Histogram ---
function FailureHistogram({ baselines }: { baselines: BaselineMetrics[] }) {
  // Merge all failure categories
  const allCategories = new Set<string>();
  baselines.forEach((b) =>
    Object.keys(b.failure_histogram).forEach((c) => allCategories.add(c))
  );

  if (allCategories.size === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        No failures recorded — all prompts passed!
      </p>
    );
  }

  const categories = Array.from(allCategories).sort();

  return (
    <div className="space-y-4">
      {baselines.map((b) => {
        const total = Object.values(b.failure_histogram).reduce(
          (a, c) => a + c,
          0
        );
        if (total === 0) return null;

        const maxCount = Math.max(...Object.values(b.failure_histogram));

        return (
          <div key={b.feedback_mode}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {MODE_LABELS[b.feedback_mode] || b.feedback_mode} — {total} failures
            </p>
            <div className="space-y-2">
              {categories.map((cat) => {
                const count = b.failure_histogram[cat] || 0;
                if (count === 0) return null;
                const pct = Math.round((count / total) * 100);
                const barWidth = (count / maxCount) * 100;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-44 shrink-0">
                      {FAILURE_LABELS[cat] || cat}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${FAILURE_COLORS[cat] || "bg-gray-300"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-500 w-16 text-right shrink-0">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Run Browser ---
function RunBrowser({ results }: { results: ExperimentResult[] }) {
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const templates = useMemo(() => {
    const ids = new Set(results.map((r) => r.template_id));
    return Array.from(ids).sort();
  }, [results]);

  const modes = useMemo(() => {
    const ids = new Set(results.map((r) => r.feedback_mode));
    return Array.from(ids).sort();
  }, [results]);

  const filtered = useMemo(() => {
    let items = results;
    if (templateFilter) items = items.filter((r) => r.template_id === templateFilter);
    if (modeFilter) items = items.filter((r) => r.feedback_mode === modeFilter);
    if (outcomeFilter === "pass") items = items.filter((r) => r.response.success);
    if (outcomeFilter === "fail") items = items.filter((r) => !r.response.success);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.prompt.toLowerCase().includes(q) ||
          r.response.attempts.some((a) => a.sentence.toLowerCase().includes(q))
      );
    }
    return items;
  }, [results, templateFilter, modeFilter, outcomeFilter, search]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts or sentences..."
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent flex-1 min-w-48"
        />
        <select
          value={templateFilter || ""}
          onChange={(e) => setTemplateFilter(e.target.value || null)}
          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All templates</option>
          {templates.map((t) => (
            <option key={t} value={t}>
              {TEMPLATE_LABELS[t] || t}
            </option>
          ))}
        </select>
        {modes.length > 1 && (
          <select
            value={modeFilter || ""}
            onChange={(e) => setModeFilter(e.target.value || null)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All baselines</option>
            {modes.map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m] || m}
              </option>
            ))}
          </select>
        )}
        <select
          value={outcomeFilter || ""}
          onChange={(e) => setOutcomeFilter(e.target.value || null)}
          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All outcomes</option>
          <option value="pass">Pass only</option>
          <option value="fail">Fail only</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {results.length} results
      </p>

      {/* Result list */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.map((r, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                    r.response.success ? "bg-green-500" : "bg-red-400"
                  }`}
                >
                  {r.response.success ? "\u2713" : "\u2717"}
                </span>
                <span className="text-sm text-gray-800 flex-1 truncate">
                  {r.prompt}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    MODE_COLORS[r.feedback_mode] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {r.feedback_mode}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                  {TEMPLATE_LABELS[r.template_id] || r.template_id}
                </span>
                {r.response.success ? (
                  <span className="text-xs text-gray-400">
                    {r.response.total_attempts} attempt{r.response.total_attempts > 1 ? "s" : ""}
                  </span>
                ) : (
                  r.failure_category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
                      {FAILURE_LABELS[r.failure_category] || r.failure_category}
                    </span>
                  )
                )}
                <span className="text-xs text-gray-300 shrink-0">
                  {isExpanded ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <VerifierLoopView response={r.response} />
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-4">
            No results match filters
          </p>
        )}
      </div>
    </div>
  );
}

// --- Main Dashboard ---

type DetailTab = "comparison" | "failures" | "browse";

interface ExperimentDashboardProps {
  summaries: ExperimentSummary[];
  onLoadDetail: (runId: string) => Promise<ExperimentDetail>;
}

export default function ExperimentDashboard({
  summaries,
  onLoadDetail,
}: ExperimentDashboardProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    summaries.length > 0 ? summaries[0].run_id : null
  );
  const [detail, setDetail] = useState<ExperimentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("comparison");

  const selectedSummary = summaries.find((s) => s.run_id === selectedRunId);

  async function loadDetail(runId: string) {
    setDetailLoading(true);
    try {
      const d = await onLoadDetail(runId);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleRunChange(runId: string) {
    setSelectedRunId(runId);
    setDetail(null);
    loadDetail(runId);
  }

  // Auto-load first run detail
  if (selectedRunId && !detail && !detailLoading) {
    loadDetail(selectedRunId);
  }

  // Primary baseline for metrics summary (prefer structural)
  const primaryBaseline = selectedSummary?.baselines.find(
    (b) => b.feedback_mode === "structural"
  ) || selectedSummary?.baselines[0];

  if (summaries.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-lg font-semibold text-gray-700 mb-2">
          No Experiment Results Yet
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Run the experiment CLI to generate results, then view them here.
        </p>
        <div className="bg-gray-800 text-gray-200 rounded-lg p-4 text-left text-sm font-mono max-w-lg mx-auto">
          <p className="text-gray-400"># From the project root:</p>
          <p>cd experiments/verifier_loop</p>
          <p>python run_experiment.py --baselines structural,none</p>
          <p>python compute_metrics.py &lt;run_id&gt;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Run selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Experiment Run
        </label>
        <select
          value={selectedRunId || ""}
          onChange={(e) => handleRunChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {summaries.map((s) => (
            <option key={s.run_id} value={s.run_id}>
              {s.run_id} — {s.total_prompts} prompts, {s.baselines.length} baseline{s.baselines.length > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        {selectedSummary && (
          <span className="text-xs text-gray-400">
            {new Date(selectedSummary.timestamp).toLocaleString()}
          </span>
        )}
      </div>

      {/* Metrics summary cards */}
      {primaryBaseline && <MetricsSummary baseline={primaryBaseline} />}

      {/* Detail tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(
          [
            ["comparison", "Baseline Comparison"],
            ["failures", "Failure Analysis"],
            ["browse", "Browse Results"],
          ] as [DetailTab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setDetailTab(tab)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              detailTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Detail content */}
      {detailLoading && (
        <p className="text-sm text-gray-500 animate-pulse">
          Loading experiment data...
        </p>
      )}

      {!detailLoading && selectedSummary && (
        <>
          {detailTab === "comparison" && (
            <BaselineComparison baselines={selectedSummary.baselines} />
          )}
          {detailTab === "failures" && (
            <FailureHistogram baselines={selectedSummary.baselines} />
          )}
          {detailTab === "browse" && detail && (
            <RunBrowser results={detail.results} />
          )}
          {detailTab === "browse" && !detail && (
            <p className="text-sm text-gray-400 italic">
              Loading individual results...
            </p>
          )}
        </>
      )}
    </div>
  );
}
