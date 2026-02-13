"""Anthropic Claude client for sentence generation."""

import os
import random
from typing import Optional, List, Dict
from anthropic import Anthropic


_client: Optional[Anthropic] = None
_MOCK_LLM = os.environ.get("MOCK_LLM", "").lower() in ("1", "true", "yes")

# Canned responses for mock mode — valid sentences the parser can handle
_MOCK_SENTENCES = {
    "copular": [
        "el perro es grande",
        "la gata es bonita",
        "el niño es alto",
        "la casa es pequeña",
    ],
    "transitive": [
        "el hombre come la manzana",
        "la mujer lee un libro",
        "el niño bebe la leche",
        "la niña come una manzana",
    ],
    "existential": [
        "hay un gato en la casa",
        "hay una mujer en el parque",
        "hay un perro",
        "hay un libro en la mesa",
    ],
    "pp": [
        "el perro corre en el parque",
        "la mujer camina por la calle",
        "el gato duerme en la casa",
        "el niño lee un libro en la casa",
    ],
    "negation": [
        "el perro no es grande",
        "el niño no come la manzana",
        "la mujer no corre",
        "el gato no duerme",
    ],
    "conjunction": [
        "el perro corre y el gato duerme",
        "la mujer lee un libro y el hombre come",
        "el niño es alto pero la niña es pequeña",
        "hay un gato y hay un perro",
    ],
}
_MOCK_ALL = [s for group in _MOCK_SENTENCES.values() for s in group]

_MOCK_PARAGRAPH = (
    "El perro grande corre en el parque. "
    "La mujer camina por la calle con su gato. "
    "Hay un niño en la casa. "
    "El niño lee un libro y la niña come una manzana. "
    "El día es bonito."
)


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
- NP + verb + NP + PP: "el niño lee un libro en la casa"
- NP + NEG + verb + NP: "el niño no come la manzana"
- hay + NP + PP: "hay un gato en la casa"
- CLAUSE y/o/pero CLAUSE: "el perro corre y el gato duerme"

NOUN PHRASE (NP) must start with a determiner:
- DET + noun: "el perro"
- DET + noun + adjective: "el perro grande"
- DET + adjective + noun: "el gran perro"
- DET + noun + PP: "el libro de la mujer"
- NP y/o NP: "el perro y el gato"

VERB PHRASES can include:
- verb alone: "corre"
- negation + verb: "no corre"
- verb + adverb: "come bien"
- adverb + verb: "siempre corre"

PREPOSITIONAL PHRASES: preposition + NP: "en la casa", "de la mujer"

AVAILABLE DETERMINERS: el, la, los, las, un, una, su, sus, mi, mis, tu, tus, nuestro, nuestra
AVAILABLE PREPOSITIONS: en, de, con, para, por, sin, sobre, entre, hacia, hasta, desde, bajo
AVAILABLE COPULAR VERBS: es, está, son, están, era, fue, eran, fueron, estaba, estaban
AVAILABLE EXISTENTIAL: hay, había
AVAILABLE ADVERBS: muy, bien, mal, siempre, nunca, rápido, lento, también, después, ahora, aquí, juntos, mucho, poco, mejor, hoy, allí
AVAILABLE CONJUNCTIONS: y, o, pero, porque, cuando, mientras, aunque, si
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
    user_msg = f"Generate a grammatically valid {language} sentence matching this description: {prompt}"
    messages: List[Dict[str, str]] = [{"role": "user", "content": user_msg}]

    if previous_attempts:
        for attempt in previous_attempts:
            messages.append({"role": "assistant", "content": attempt["sentence"]})
            messages.append({"role": "user", "content": attempt["feedback"]})

    if _MOCK_LLM:
        sentence = random.choice(_MOCK_ALL)
        full_messages = messages + [{"role": "assistant", "content": sentence}]
        return GenerateResult(
            sentence=sentence,
            system_prompt=SYSTEM_PROMPT + "\n\n[MOCK MODE — no LLM call made]",
            messages=full_messages,
        )

    client = _get_client()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=150,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    raw = response.content[0].text.strip()
    raw = raw.strip('"').strip("'").strip(".").strip("!").strip("?")
    sentence = raw.lower()

    full_messages = messages + [{"role": "assistant", "content": sentence}]

    return GenerateResult(
        sentence=sentence,
        system_prompt=SYSTEM_PROMPT,
        messages=full_messages,
    )


XRAY_SYSTEM_PROMPT = """You are a Spanish language writer. Write natural, fluent Spanish text.
The user will give you a creative prompt. Respond with a short paragraph of 4-6 sentences in Spanish.

IMPORTANT RULES for sentence structure:
1. Every sentence MUST follow one of these patterns:
   - Subject + verb: "Carlos corre"
   - Subject + verb + object: "Miguel come una manzana"
   - Subject + copular verb + adjective: "el perro es grande"
   - "hay" + noun phrase: "hay un gato en la casa"
   - Two clauses joined by y/o/pero/mientras/cuando: "el niño corre y el perro duerme"
2. Subjects can be proper names (Carlos, María, Miguel, Ana, Pedro) or DET+noun (el niño, la mujer)
3. You may add prepositional phrases: "en el parque", "de la casa", "con su perro"
4. Use simple present tense or past tense (preterite/imperfect)

STRICTLY AVOID:
- Reflexive verbs: NO "se llama", "se sienta", "se levanta"
- Object pronouns: NO "le", "lo", "la", "les", "los" as pronouns
- Infinitives after verbs: NO "quiere correr", "puede ver", "para mostrar"
- Relative clauses: NO "que tiene", "que es", "que corre"
- Progressive tenses: NO "está corriendo", "estaba comiendo"
- The word "se" in any context

GOOD EXAMPLES:
"Carlos camina por el parque con su perro. El perro corre entre los árboles. María observa los pájaros en el cielo. El día es bonito y el sol brilla."

Output ONLY the Spanish paragraph. No English, no explanation, no translation."""


class ParagraphResult:
    """Result from paragraph generation, including prompt details."""
    def __init__(self, text: str, system_prompt: str, user_message: str):
        self.text = text
        self.system_prompt = system_prompt
        self.user_message = user_message


def generate_paragraph(prompt: str, language: str) -> ParagraphResult:
    """Generate a natural paragraph of Spanish text (unconstrained by CFG)."""
    user_message = f"Write a short paragraph (3-5 sentences) in {language} about: {prompt}"

    if _MOCK_LLM:
        return ParagraphResult(
            text=_MOCK_PARAGRAPH,
            system_prompt=XRAY_SYSTEM_PROMPT + "\n\n[MOCK MODE — no LLM call made]",
            user_message=user_message,
        )

    client = _get_client()
    messages = [{"role": "user", "content": user_message}]
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=XRAY_SYSTEM_PROMPT,
        messages=messages,
    )
    return ParagraphResult(
        text=response.content[0].text.strip(),
        system_prompt=XRAY_SYSTEM_PROMPT,
        user_message=user_message,
    )


_MOCK_TRANSLATIONS = {
    "el perro es grande": "The dog is big",
    "la gata es bonita": "The cat is pretty",
    "el niño es alto": "The boy is tall",
    "la casa es pequeña": "The house is small",
    "el hombre come la manzana": "The man eats the apple",
    "la mujer lee un libro": "The woman reads a book",
    "el niño bebe la leche": "The boy drinks the milk",
    "la niña come una manzana": "The girl eats an apple",
    "hay un gato en la casa": "There is a cat in the house",
    "hay una mujer en el parque": "There is a woman in the park",
    "hay un perro": "There is a dog",
    "hay un libro en la mesa": "There is a book on the table",
    "el perro corre en el parque": "The dog runs in the park",
    "la mujer camina por la calle": "The woman walks along the street",
    "el gato duerme en la casa": "The cat sleeps in the house",
    "el niño lee un libro en la casa": "The boy reads a book in the house",
    "el perro no es grande": "The dog is not big",
    "el niño no come la manzana": "The boy does not eat the apple",
    "la mujer no corre": "The woman does not run",
    "el gato no duerme": "The cat does not sleep",
    "el perro corre y el gato duerme": "The dog runs and the cat sleeps",
    "la mujer lee un libro y el hombre come": "The woman reads a book and the man eats",
    "el niño es alto pero la niña es pequeña": "The boy is tall but the girl is small",
    "hay un gato y hay un perro": "There is a cat and there is a dog",
    "el perro grande corre en el parque": "The big dog runs in the park",
    "la mujer camina por la calle con su gato": "The woman walks along the street with her cat",
    "hay un niño en la casa": "There is a boy in the house",
    "el niño lee un libro y la niña come una manzana": "The boy reads a book and the girl eats an apple",
    "el día es bonito": "The day is nice",
}


def translate_sentences(sentences: List[str]) -> List[str]:
    """Translate a list of Spanish sentences into natural English using Claude."""
    if not sentences:
        return []

    if _MOCK_LLM:
        return [_MOCK_TRANSLATIONS.get(s.lower().strip(), f"[mock translation of: {s}]") for s in sentences]

    import re
    client = _get_client()
    numbered = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences))
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system="You are a Spanish-to-English translator. Translate each sentence naturally and fluently. Output ONLY the numbered translations, one per line, matching the input numbering. Do not add explanations.",
        messages=[{
            "role": "user",
            "content": f"Translate each sentence:\n{numbered}",
        }],
    )
    raw = response.content[0].text.strip()
    lines = [line.strip() for line in raw.split("\n") if line.strip()]
    # Strip the numbering prefix (e.g. "1. ", "1) ")
    translations = []
    for line in lines:
        cleaned = re.sub(r"^\d+[\.\)]\s*", "", line)
        translations.append(cleaned)
    # Pad if Claude returned fewer lines than expected
    while len(translations) < len(sentences):
        translations.append("")
    return translations[:len(sentences)]
