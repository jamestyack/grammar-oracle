"""Anthropic Claude client for sentence generation."""

from typing import Optional, List, Dict
from anthropic import Anthropic


_client: Optional[Anthropic] = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic()  # reads ANTHROPIC_API_KEY from env
    return _client


SYSTEM_PROMPT = """You are a Spanish sentence generator for a formal grammar validation system.

The grammar you must satisfy is a Context-Free Grammar (CFG) with these structural rules:

SENTENCE PATTERNS (pick one):
- NP + copular verb + adjective: "el perro es grande"
- NP + verb: "el niño corre"
- hay + NP: "hay un gato"
- NP + verb + NP: "el hombre come la manzana"
- NP + copular verb + adverb + adjective: "el perro es muy grande"
- NP + negation + copular verb + adjective: "el perro no es grande"
- NP + copular verb + PP: "el gato está en la casa"
- NP + verb + PP: "el niño corre en el parque"

NOUN PHRASE (NP) must start with a determiner:
- DET + noun: "el perro"
- DET + noun + adjective: "el perro grande"
- DET + adjective + noun: "el gran perro"
- DET + noun + PP: "el libro de la mujer"

VERB PHRASES can include:
- verb alone: "corre"
- negation + verb: "no corre"
- verb + adverb: "come bien"
- adverb + verb: "siempre corre"

PREPOSITIONAL PHRASES: preposition + NP: "en la casa", "de la mujer"

AVAILABLE DETERMINERS: el, la, los, las, un, una
AVAILABLE PREPOSITIONS: en, de, con, para, por, sin, sobre
AVAILABLE COPULAR VERBS: es, está, son, están
AVAILABLE ADVERBS: muy, bien, mal, siempre, nunca, rápido, lento
NEGATION: no

Use simple, common Spanish vocabulary. The lexicon is limited to basic words.

CRITICAL: Output ONLY the Spanish sentence. No quotes, no explanation, no translation, no punctuation marks."""


class GenerateResult:
    """Result from a Claude generation call, including the messages sent."""
    def __init__(self, sentence: str, system_prompt: str, messages: List[Dict[str, str]]):
        self.sentence = sentence
        self.system_prompt = system_prompt
        self.messages = messages


def generate_sentence(
    prompt: str,
    language: str,
    previous_attempts: Optional[List[Dict[str, str]]] = None,
) -> GenerateResult:
    """Call Claude to generate a sentence. Returns result with messages context."""
    client = _get_client()

    messages = []

    messages.append({
        "role": "user",
        "content": f"Generate a grammatically valid {language} sentence matching this description: {prompt}",
    })

    if previous_attempts:
        for attempt in previous_attempts:
            messages.append({
                "role": "assistant",
                "content": attempt["sentence"],
            })
            messages.append({
                "role": "user",
                "content": attempt["feedback"],
            })

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=150,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    raw = response.content[0].text.strip()
    raw = raw.strip('"').strip("'").strip(".").strip("!").strip("?")
    sentence = raw.lower()

    # Include Claude's response in the message log
    full_messages = messages + [{"role": "assistant", "content": sentence}]

    return GenerateResult(
        sentence=sentence,
        system_prompt=SYSTEM_PROMPT,
        messages=full_messages,
    )
