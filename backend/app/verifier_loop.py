"""Verifier loop: generate sentence via LLM, validate via CFG parser, retry on failure."""

from typing import List, Dict
from .models import ParseResult, VerifyAttempt, VerifyLoopResponse, ClaudeMessage
from .parser_client import parse_sentence
from .llm_client import generate_sentence
from .constraint_formatter import format_constraint_feedback


def run_verify_loop(prompt: str, language: str, max_retries: int = 3) -> VerifyLoopResponse:
    """Run the generate -> validate -> feedback loop."""
    attempts: List[VerifyAttempt] = []
    previous_attempts: List[Dict[str, str]] = []

    for attempt_num in range(1, max_retries + 1):
        gen_result = generate_sentence(
            prompt=prompt,
            language=language,
            previous_attempts=previous_attempts if previous_attempts else None,
        )

        result = parse_sentence(sentence=gen_result.sentence, language=language)

        claude_messages = [
            ClaudeMessage(role=m["role"], content=m["content"])
            for m in gen_result.messages
        ]

        if result.valid:
            attempts.append(VerifyAttempt(
                attempt_number=attempt_num,
                sentence=gen_result.sentence,
                result=result,
                constraint_feedback=None,
                system_prompt=gen_result.system_prompt,
                claude_messages=claude_messages,
            ))
            return VerifyLoopResponse(
                prompt=prompt,
                language=language,
                attempts=attempts,
                final_result=result,
                success=True,
                total_attempts=attempt_num,
            )

        feedback = format_constraint_feedback(result)
        attempts.append(VerifyAttempt(
            attempt_number=attempt_num,
            sentence=gen_result.sentence,
            result=result,
            constraint_feedback=feedback,
            system_prompt=gen_result.system_prompt,
            claude_messages=claude_messages,
        ))
        previous_attempts.append({
            "sentence": gen_result.sentence,
            "feedback": feedback,
        })

    return VerifyLoopResponse(
        prompt=prompt,
        language=language,
        attempts=attempts,
        final_result=attempts[-1].result,
        success=False,
        total_attempts=len(attempts),
    )
