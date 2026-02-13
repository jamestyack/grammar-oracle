#!/usr/bin/env python3
"""Compute metrics from experiment JSONL files and generate summary.

Usage:
  python compute_metrics.py <run_id>
  python compute_metrics.py 20260207_153000
"""

import json
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT / "backend"))

from app.experiment_models import BaselineMetrics, ExperimentSummary


def load_results(results_dir: Path, run_id: str, baseline: str) -> list[dict]:
    """Load JSONL results for a specific run and baseline."""
    path = results_dir / f"{run_id}_{baseline}.jsonl"
    if not path.exists():
        return []
    results = []
    for line in path.read_text().strip().split("\n"):
        if line:
            results.append(json.loads(line))
    return results


def compute_baseline_metrics(results: list[dict], feedback_mode: str) -> BaselineMetrics:
    """Compute aggregate metrics for a single baseline."""
    total = len(results)
    if total == 0:
        return BaselineMetrics(
            feedback_mode=feedback_mode,
            total_prompts=0,
            pass_at_1=0.0,
            pass_at_k=0.0,
            mean_retries_to_pass=0.0,
            median_retries_to_pass=0.0,
            mean_latency_seconds=0.0,
            p95_latency_seconds=0.0,
            failure_histogram={},
            template_breakdown={},
        )

    # pass@1: first attempt succeeds
    pass_at_1_count = sum(
        1 for r in results
        if r["response"]["attempts"][0]["result"]["valid"]
    )

    # pass@k: any attempt succeeds
    pass_at_k_count = sum(1 for r in results if r["response"]["success"])

    # Retries for successful runs
    successful_retries = [
        r["response"]["total_attempts"]
        for r in results
        if r["response"]["success"]
    ]

    # Latency
    latencies = [r["elapsed_seconds"] for r in results]
    sorted_latencies = sorted(latencies)
    p95_idx = min(int(total * 0.95), total - 1)

    # Failure histogram
    failure_hist: dict[str, int] = {}
    for r in results:
        cat = r.get("failure_category")
        if cat:
            failure_hist[cat] = failure_hist.get(cat, 0) + 1

    # Per-template breakdown
    template_groups: dict[str, list[dict]] = {}
    for r in results:
        tid = r["template_id"]
        if tid not in template_groups:
            template_groups[tid] = []
        template_groups[tid].append(r)

    template_breakdown: dict[str, dict[str, float]] = {}
    for tid, group in template_groups.items():
        t_total = len(group)
        t_pass1 = sum(
            1 for r in group
            if r["response"]["attempts"][0]["result"]["valid"]
        )
        t_passk = sum(1 for r in group if r["response"]["success"])
        template_breakdown[tid] = {
            "pass_at_1": round(t_pass1 / t_total * 100, 1) if t_total else 0.0,
            "pass_at_k": round(t_passk / t_total * 100, 1) if t_total else 0.0,
            "total": float(t_total),
        }

    return BaselineMetrics(
        feedback_mode=feedback_mode,
        total_prompts=total,
        pass_at_1=round(pass_at_1_count / total * 100, 1),
        pass_at_k=round(pass_at_k_count / total * 100, 1),
        mean_retries_to_pass=round(
            statistics.mean(successful_retries), 2
        ) if successful_retries else 0.0,
        median_retries_to_pass=round(
            statistics.median(successful_retries), 2
        ) if successful_retries else 0.0,
        mean_latency_seconds=round(statistics.mean(latencies), 2),
        p95_latency_seconds=round(sorted_latencies[p95_idx], 2),
        failure_histogram=failure_hist,
        template_breakdown=template_breakdown,
    )


def main():
    if len(sys.argv) < 2:
        print("Usage: python compute_metrics.py <run_id>", file=sys.stderr)
        sys.exit(1)

    run_id = sys.argv[1]
    results_dir = Path(__file__).parent / "results"

    # Discover baselines for this run
    baselines = []
    for f in sorted(results_dir.glob(f"{run_id}_*.jsonl")):
        baseline = f.stem.replace(f"{run_id}_", "")
        baselines.append(baseline)

    if not baselines:
        print(f"Error: no JSONL files found for run_id={run_id}", file=sys.stderr)
        sys.exit(1)

    print(f"Computing metrics for run {run_id}")
    print(f"Baselines found: {baselines}")

    baseline_metrics = []
    total_prompts = 0
    max_retries = 3  # default

    for baseline in baselines:
        results = load_results(results_dir, run_id, baseline)
        if not results:
            print(f"  {baseline}: no results")
            continue

        # Infer max_retries from data
        max_attempts = max(r["response"]["total_attempts"] for r in results)
        if max_attempts > max_retries:
            max_retries = max_attempts

        metrics = compute_baseline_metrics(results, baseline)
        baseline_metrics.append(metrics)
        total_prompts = max(total_prompts, metrics.total_prompts)

        print(f"\n  [{baseline}] {metrics.total_prompts} prompts")
        print(f"    pass@1: {metrics.pass_at_1}%")
        print(f"    pass@k: {metrics.pass_at_k}%")
        print(f"    mean retries: {metrics.mean_retries_to_pass}")
        print(f"    mean latency: {metrics.mean_latency_seconds}s")
        print(f"    p95 latency: {metrics.p95_latency_seconds}s")
        if metrics.failure_histogram:
            print(f"    failures: {metrics.failure_histogram}")

    summary = ExperimentSummary(
        run_id=run_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        language="spanish",
        max_retries=max_retries,
        total_prompts=total_prompts,
        baselines=baseline_metrics,
    )

    summary_file = results_dir / f"{run_id}_summary.json"
    summary_file.write_text(summary.model_dump_json(indent=2))
    print(f"\nSummary written to {summary_file}")


if __name__ == "__main__":
    main()
