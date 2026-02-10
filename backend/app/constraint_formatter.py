"""Convert parse failure diagnostics into natural language feedback for LLM retry."""

from typing import Optional, List
from .models import ParseResult, Token


TAG_NAMES = {
    "DET": "a determiner (el, la, un, una)",
    "N": "a noun",
    "V": "a verb",
    "V_COP": "a copular verb (es, está)",
    "V_EX": "an existential verb (hay)",
    "A": "an adjective",
    "ADV": "an adverb (muy, bien, siempre)",
    "NEG": "a negation word (no)",
    "PREP": "a preposition (en, de, con, para)",
    "CONJ": "a conjunction",
    "PRON": "a pronoun",
}


def format_constraint_feedback(result: ParseResult) -> str:
    """Convert a failed ParseResult into natural language feedback for Claude."""
    parts: List[str] = []
    parts.append(f'Your sentence "{result.sentence}" was invalid.')

    if result.failure:
        failure = result.failure
        token_tag = _find_token_tag(failure.token, result.tokens)

        if failure.expectedCategories:
            expected_desc = _describe_categories(failure.expectedCategories)
            actual_desc = TAG_NAMES.get(token_tag, "unknown category") if token_tag else "an unknown word"
            parts.append(
                f"At position {failure.index}, the parser found '{failure.token}' "
                f"({actual_desc}), but expected {expected_desc}."
            )

        if failure.index == 0 and failure.expectedCategories:
            if "DET" in failure.expectedCategories:
                parts.append(
                    "Spanish sentences in this grammar must begin with a determiner "
                    "(el/la/los/las/un/una) or an existential verb (hay)."
                )

        if failure.message:
            parts.append(f"Parser message: {failure.message}")

    elif result.error:
        parts.append(f"Error: {result.error}")

    parts.append("Please generate a new sentence that avoids this issue.")
    return " ".join(parts)


def _describe_categories(categories: List[str]) -> str:
    descs = [TAG_NAMES.get(c, c.lower()) for c in categories]
    if len(descs) == 1:
        return descs[0]
    if len(descs) == 2:
        return f"{descs[0]} or {descs[1]}"
    return ", ".join(descs[:-1]) + f", or {descs[-1]}"


def _find_token_tag(word: str, tokens: List[Token]) -> Optional[str]:
    for t in tokens:
        if t.word == word:
            return t.tag
    return None
