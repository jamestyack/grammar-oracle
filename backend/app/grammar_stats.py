"""Compute grammar and lexicon statistics from XML files."""

from pathlib import Path
from xml.etree import ElementTree

from .models import GrammarStats

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_RESOURCES = _PROJECT_ROOT / "src" / "src" / "main" / "resources"


def get_grammar_stats(language: str = "spanish") -> GrammarStats:
    lang = language.lower()
    grammar_path = _RESOURCES / f"{lang}_grammar.xml"
    lexicon_path = _RESOURCES / f"{lang}_lexicon.xml"

    # Count grammar rules
    grammar_rules = 0
    if grammar_path.exists():
        tree = ElementTree.parse(grammar_path)
        grammar_rules = len(tree.findall(".//rule"))

    # Count unique lexicon words and POS tags
    lexicon_words = 0
    pos_tags: set[str] = set()
    if lexicon_path.exists():
        tree = ElementTree.parse(lexicon_path)
        entries = tree.findall(".//entry")
        words_seen: set[str] = set()
        for entry in entries:
            kw = entry.findtext("kw", "").strip().lower()
            if kw:
                words_seen.add(kw)
            for tag_el in entry.findall("posTag"):
                tag = (tag_el.text or "").strip()
                if tag:
                    pos_tags.add(tag)
        lexicon_words = len(words_seen)

    return GrammarStats(
        language=lang,
        grammar_rules=grammar_rules,
        lexicon_words=lexicon_words,
        pos_tags=sorted(pos_tags),
    )
