"""Compute grammar and lexicon statistics from XML files."""

from pathlib import Path
from xml.etree import ElementTree
import re

from .models import GrammarStats, GrammarDetail, GrammarRule, LexiconEntry

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


def _extract_comment_before(element: ElementTree.Element, parent_text: str) -> str:
    """Extract the XML comment immediately preceding a rule element."""
    # We parse comments from raw XML since ElementTree doesn't preserve them
    return ""


def get_grammar_detail(language: str = "spanish") -> GrammarDetail:
    lang = language.lower()
    grammar_path = _RESOURCES / f"{lang}_grammar.xml"
    lexicon_path = _RESOURCES / f"{lang}_lexicon.xml"

    rules: list[GrammarRule] = []
    pos_tags: set[str] = set()

    if grammar_path.exists():
        # Parse comments from raw XML
        raw_xml = grammar_path.read_text(encoding="utf-8")
        # Map rule numbers to their immediately preceding comment
        comment_map: dict[int, str] = {}
        for match in re.finditer(
            r"<!--\s*([^>]*?)\s*-->\s*\n\s*<rule\s+number=\"(\d+)\"",
            raw_xml,
        ):
            comment_text = match.group(1).strip()
            # Skip section header comments (those starting with ===)
            if comment_text.startswith("==="):
                continue
            rule_num = int(match.group(2))
            comment_map[rule_num] = comment_text

        tree = ElementTree.parse(grammar_path)
        for rule_el in tree.findall(".//rule"):
            number = int(rule_el.get("number", "0"))
            lhs = (rule_el.findtext("lhs") or "").strip()
            rhs_elements = [
                (r.text or "").strip() for r in rule_el.findall("rhs")
            ]
            comment = comment_map.get(number, "")
            rules.append(GrammarRule(
                number=number,
                lhs=lhs,
                rhs=rhs_elements,
                comment=comment,
            ))

    entries: list[LexiconEntry] = []
    if lexicon_path.exists():
        tree = ElementTree.parse(lexicon_path)
        for entry_el in tree.findall(".//entry"):
            word = (entry_el.findtext("kw") or "").strip()
            tag = (entry_el.findtext("posTag") or "").strip()
            translation = (entry_el.findtext("en") or "").strip()
            if word and tag:
                entries.append(LexiconEntry(
                    word=word,
                    tag=tag,
                    translation=translation,
                ))
                pos_tags.add(tag)

    return GrammarDetail(
        language=lang,
        grammar_rules=rules,
        lexicon_entries=entries,
        pos_tags=sorted(pos_tags),
    )
