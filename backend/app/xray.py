"""Grammar X-Ray: generate natural text, parse each sentence through CFG."""

import re
from typing import List
from .models import (
    ParseResult, Token, SentenceAnalysis, XRayStats, XRayResponse, RuleApplied,
)
from .parser_client import parse_sentence
from .llm_client import generate_paragraph, translate_sentences


def split_sentences(text: str) -> List[dict]:
    """Split text into sentences, preserving original punctuation."""
    raw_sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    results = []
    for s in raw_sentences:
        s = s.strip()
        if not s:
            continue
        original = s
        cleaned = re.sub(r'[.!?,;:"\'\-\u00bf\u00a1]+', '', original).strip().lower()
        if cleaned:
            results.append({"original": original, "cleaned": cleaned})
    return results


def _make_unknown_tokens(sentence: str) -> List[Token]:
    """Create UNKNOWN-tagged tokens for sentences the parser couldn't handle."""
    return [Token(word=w, tag="UNKNOWN", translation="") for w in sentence.split()]


def run_xray(prompt: str, language: str) -> XRayResponse:
    """Generate paragraph, parse each sentence, compute stats."""
    paragraph = generate_paragraph(prompt, language)
    generated_text = paragraph.text
    sentence_parts = split_sentences(generated_text)
    analyses: List[SentenceAnalysis] = []

    all_rules: dict[str, RuleApplied] = {}
    all_pos_tags: set[str] = set()
    total_words = 0
    known_words = 0

    for part in sentence_parts:
        result = parse_sentence(sentence=part["cleaned"], language=language)

        # If parser returned no tokens (e.g. unknown word error), synthesize them
        tokens = result.tokens if result.tokens else _make_unknown_tokens(part["cleaned"])
        if not result.tokens and tokens:
            result = ParseResult(
                valid=result.valid,
                sentence=result.sentence,
                tokens=tokens,
                parseTree=result.parseTree,
                rulesApplied=result.rulesApplied,
                parses=result.parses,
                ambiguous=result.ambiguous,
                failure=result.failure,
                error=result.error,
            )

        for token in result.tokens:
            total_words += 1
            all_pos_tags.add(token.tag)
            if token.tag != "UNKNOWN":
                known_words += 1

        for rule in result.rulesApplied:
            all_rules[rule.rule] = rule

        analyses.append(SentenceAnalysis(
            sentence=part["cleaned"],
            original=part["original"],
            result=result,
            in_grammar_scope=result.valid,
        ))

    # Translate all original sentences in a single Claude call
    originals = [a.original for a in analyses]
    translations = translate_sentences(originals)
    for analysis, translation in zip(analyses, translations):
        analysis.translation = translation

    total = len(analyses)
    parsed = sum(1 for a in analyses if a.in_grammar_scope)

    stats = XRayStats(
        total_sentences=total,
        parsed_sentences=parsed,
        coverage_percentage=round((parsed / total * 100) if total > 0 else 0, 1),
        total_words=total_words,
        known_words=known_words,
        word_coverage_percentage=round((known_words / total_words * 100) if total_words > 0 else 0, 1),
        rules_used=list(all_rules.values()),
        unique_pos_tags=sorted(all_pos_tags),
    )

    return XRayResponse(
        prompt=prompt,
        language=language,
        generated_text=generated_text,
        system_prompt=paragraph.system_prompt,
        user_message=paragraph.user_message,
        sentences=analyses,
        stats=stats,
    )
