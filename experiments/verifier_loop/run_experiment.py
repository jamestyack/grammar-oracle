#!/usr/bin/env python3
"""CLI runner for verifier loop experiments.

Usage:
  python run_experiment.py --baselines structural,none --max-retries 3
  python run_experiment.py --baselines all --templates copular,transitive
  python run_experiment.py --dry-run
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add backend to sys.path so we can import directly
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT / "backend"))

# Load .env for API keys
try:
    from dotenv import load_dotenv
    load_dotenv(_PROJECT_ROOT / "backend" / ".env")
except ImportError:
    pass  # dotenv not required if env vars are set directly


def main():
    parser = argparse.ArgumentParser(
        description="Verifier Loop Experiment Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --dry-run                              # Preview prompts
  %(prog)s --baselines structural --templates copular  # Small test run
  %(prog)s --baselines structural,none            # Compare structural vs single-shot
  %(prog)s --baselines all                        # All three baselines
        """,
    )
    parser.add_argument(
        "--baselines", default="structural,none",
        help="Comma-separated: structural,generic,none,all (default: structural,none)",
    )
    parser.add_argument(
        "--templates", default=None,
        help="Comma-separated template IDs to run (default: all)",
    )
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--language", default="spanish")
    parser.add_argument("--delay", type=float, default=0.5,
                        help="Delay in seconds between prompts (default: 0.5)")
    parser.add_argument("--dry-run", action="store_true",
                        help="List prompts without running experiments")
    parser.add_argument("--output-dir", default=None,
                        help="Output directory (default: results/)")
    args = parser.parse_args()

    # Load prompts
    prompts_file = Path(__file__).parent / "prompts.json"
    if not prompts_file.exists():
        print(f"Error: prompts file not found at {prompts_file}", file=sys.stderr)
        sys.exit(1)

    dataset = json.loads(prompts_file.read_text())
    templates = dataset["templates"]

    # Filter templates if specified
    if args.templates:
        ids = set(args.templates.split(","))
        templates = [t for t in templates if t["id"] in ids]
        if not templates:
            print(f"Error: no templates match {args.templates}", file=sys.stderr)
            sys.exit(1)

    # Determine baselines
    baselines = args.baselines.split(",")
    if "all" in baselines:
        baselines = ["structural", "generic", "none"]

    total_prompts = sum(len(t["prompts"]) for t in templates)

    print(f"Experiment configuration:")
    print(f"  Templates: {[t['id'] for t in templates]}")
    print(f"  Baselines: {baselines}")
    print(f"  Total prompts per baseline: {total_prompts}")
    print(f"  Max retries: {args.max_retries}")
    print(f"  Language: {args.language}")
    print()

    if args.dry_run:
        for template in templates:
            print(f"[{template['id']}] {len(template['prompts'])} prompts:")
            for p in template["prompts"]:
                print(f"  - {p}")
            print()
        print(f"Total: {total_prompts} prompts x {len(baselines)} baselines = {total_prompts * len(baselines)} runs")
        return

    # Import experiment runner (deferred to avoid import errors in dry-run)
    from app.experiment_runner import run_single_prompt

    # Generate run ID
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_dir = Path(args.output_dir) if args.output_dir else Path(__file__).parent / "results"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Run ID: {run_id}")
    print(f"Output: {output_dir}")
    print()

    for baseline in baselines:
        output_file = output_dir / f"{run_id}_{baseline}.jsonl"
        count = 0
        errors = 0

        print(f"=== Baseline: {baseline} ===")

        with open(output_file, "w") as f:
            for template in templates:
                for prompt_text in template["prompts"]:
                    count += 1
                    truncated = prompt_text[:55] + "..." if len(prompt_text) > 55 else prompt_text
                    print(f"  [{baseline}] {count}/{total_prompts}: {truncated}", end="", flush=True)

                    try:
                        result = run_single_prompt(
                            prompt=prompt_text,
                            template_id=template["id"],
                            language=args.language,
                            feedback_mode=baseline,
                            max_retries=args.max_retries,
                        )
                        status = "pass" if result.response.success else "FAIL"
                        attempts = result.response.total_attempts
                        print(f" -> {status} ({attempts} attempt{'s' if attempts > 1 else ''}, {result.elapsed_seconds:.1f}s)")
                        f.write(result.model_dump_json() + "\n")
                        f.flush()
                    except Exception as e:
                        errors += 1
                        print(f" -> ERROR: {e}")

                    if count < total_prompts:
                        time.sleep(args.delay)

        print(f"  Wrote {output_file} ({count} prompts, {errors} errors)")
        print()

    print(f"Done! Run 'python compute_metrics.py {run_id}' to generate summary.")


if __name__ == "__main__":
    main()
