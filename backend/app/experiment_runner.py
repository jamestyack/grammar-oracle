"""Core experiment logic for verifier loop experiments."""

import time
from typing import Literal, Optional

from .models import ParseResult, VerifyLoopResponse
from .verifier_loop import run_verify_loop
from .experiment_models import ExperimentResult

FeedbackMode = Literal["structural", "generic", "none"]

GENERIC_FEEDBACK = (
    "Your sentence was invalid. Please try again with a different sentence."
)


def _generic_feedback_formatter(result: ParseResult) -> str:
    """Generic feedback that gives no structural information."""
    return GENERIC_FEEDBACK


def run_single_prompt(
    prompt: str,
    template_id: str,
    language: str,
    feedback_mode: FeedbackMode,
    max_retries: int = 3,
) -> ExperimentResult:
    """Run a single prompt through the verifier loop and record timing."""
    start = time.time()

    if feedback_mode == "none":
        response = run_verify_loop(prompt, language, max_retries=1)
    elif feedback_mode == "generic":
        response = run_verify_loop(
            prompt, language, max_retries=max_retries,
            feedback_formatter=_generic_feedback_formatter,
        )
    else:  # structural (default)
        response = run_verify_loop(prompt, language, max_retries=max_retries)

    elapsed = time.time() - start

    return ExperimentResult(
        prompt=prompt,
        template_id=template_id,
        feedback_mode=feedback_mode,
        response=response,
        elapsed_seconds=elapsed,
        failure_category=classify_failure(response) if not response.success else None,
    )


def classify_failure(response: VerifyLoopResponse) -> str:
    """Categorize why the final attempt failed."""
    last_attempt = response.attempts[-1]
    result = last_attempt.result

    if result.error:
        return "error"

    if result.tokens:
        has_unknown = any(t.tag == "UNKNOWN" for t in result.tokens)
        if has_unknown:
            return "oov_word"

    if result.failure:
        expected = result.failure.expectedCategories
        if "DET" in expected and result.failure.index == 0:
            return "missing_det"
        if expected:
            return "wrong_pos"

    return "unsupported_construction"
