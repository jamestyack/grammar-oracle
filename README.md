# Grammar Oracle

**A Neuro-Symbolic System for Validating LLM Output Against Formal Grammars**

[![License: All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

*"A 2004 grammar engine correcting a 2026 LLM — visibly, deterministically, and explainably."*

---

## Overview

Grammar Oracle is a **neuro-symbolic research system** that augments Large Language Models (LLMs) with deterministic grammatical validation using Context-Free Grammars (CFGs). The system provides:

- **Deterministic Validation** - Formal pass/fail results relative to declared grammars
- **Structural Explainability** - Parse trees, rule traces, and failure diagnostics
- **Interactive Visualization** - "X-ray view" of grammatical structure
- **Verifier Loops** - LLM generation → CFG validation → constraint feedback → retry
- **Versioned Grammar Packs** - Testable grammar artifacts with CI/CD

## Origin Story

Grammar Oracle evolved from [cornish-parser](https://github.com/jamestyack/cornish-parser), a 2003-2004 university project that implemented a CFG parser for the Cornish language. That historical artifact demonstrated how symbolic AI could provide:

- **Formal grammatical proof** (sentence either parses or doesn't)
- **Explicit, auditable rules** (every decision is traceable)
- **Complete explainability** (rule-by-rule derivation)

Grammar Oracle takes this 2004 parser and layers it over modern LLM outputs, creating a "grammar lens" that validates fluent neural generation against formal constraints.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Grammar Oracle System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐     ┌───────────┐ │
│  │   Frontend   │ ←──→ │   Backend    │ ←──→│   Parser  │ │
│  │   Next.js    │      │   FastAPI    │     │   Java    │ │
│  │  (Port 3000) │      │  (Port 8000) │     │    JAR    │ │
│  └──────────────┘      └──────────────┘     └───────────┘ │
│                                                             │
│  User Interface     Orchestration Layer    CFG Validator   │
│  - Token spans      - LLM clients          - Parsing       │
│  - Parse trees      - Validation API       - Rule trace    │
│  - Retry timeline   - Verifier loop        - Diagnostics   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **CFG Validator (Java)** - 2004 parser modernized for JSON output
2. **FastAPI Backend (Python)** - Orchestrates LLM + parser, manages grammar packs
3. **Next.js Frontend (TypeScript)** - Interactive visualization and user interface

## Key Features

### 1. Deterministic Grammatical Validation

Unlike heuristic grammar checkers, Grammar Oracle provides **formal proofs**:

```json
{
  "valid": true,
  "parseTree": { "symbol": "SENTENCE", "children": [...] },
  "rulesApplied": [
    {"number": 1, "rule": "SENTENCE → S"},
    {"number": 2, "rule": "S → NP V_COP A"}
  ],
  "tokens": [
    {"word": "el", "tag": "DET", "translation": "the"}
  ]
}
```

### 2. Actionable Failure Diagnostics

When validation fails, the system explains **why and where**:

```json
{
  "valid": false,
  "failure": {
    "index": 0,
    "token": "grande",
    "expectedCategories": ["DET"],
    "message": "Expected determiner at sentence start"
  }
}
```

### 3. LLM Verifier Loop

The "wow moment" workflow:

1. **User Prompt**: "Generate Spanish sentence about big dog"
2. **LLM Attempt 1**: "Grande perro" → ❌ Fails validation
3. **Constraint Feedback**: "Expected DET at start, found A"
4. **LLM Attempt 2**: "El perro es grande" → ✅ Passes validation
5. **Visualization**: Before/after comparison with parse trees

### 4. Grammar X-Ray

Claude generates a natural Spanish paragraph from a creative prompt. The CFG parser then acts as an **X-ray lens** — parsing each sentence, color-coding every word by POS tag, and revealing the structure:

- **Annotated paragraph** — words colored by part of speech (DET=blue, N=green, V=red, A=purple, etc.) with hover tooltips showing translations
- **Click-to-expand** — each sentence reveals its parse tree, grammar rules applied, and parser performance metrics
- **Natural translations** — Claude-powered English translations under each sentence
- **Coverage stats** — sentence and word recognition percentages
- **LLM prompt inspector** — view the exact system prompt, user message, and raw Claude response
- **Analysis summary** — vocabulary gaps, structural issues, and LLM compliance problems
- **Parser performance metrics** — states explored, rule expansions, terminal match rates, parse time, with plain-English interpretation of what the parser did

### 5. Grammar Packs with CI/CD

Grammars are versioned, testable artifacts:

```
grammar-packs/spanish/v0.1/
├── grammar.xml          # CFG rules
├── lexicon.xml          # Token → POS mappings
├── scope.md             # Coverage contract
├── tests/
│   ├── positive.txt     # MUST parse
│   ├── negative.txt     # MUST fail
│   └── ambiguous.txt    # Multiple parses OK
├── metrics.json         # Auto-generated stats
└── CHANGELOG.md
```

Acceptance criteria (enforced by CI):
- Positive test pass rate ≥ 95%
- Negative test rejection ≥ 95%
- Ambiguity rate ≤ 10%

## Quick Start

### Prerequisites

- **Java 21** - For CFG parser
- **Python 3.11+** - For backend
- **Node 20+** - For frontend
- **Docker** (optional) - For containerized deployment

### Installation

```bash
# Clone the repository
git clone https://github.com/jamestyack/grammar-oracle.git
cd grammar-oracle

# Build Java parser
cd src
mvn clean package

# Set up Python backend
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up frontend
cd ../frontend
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your API keys (Claude/OpenAI)
```

### Running Locally

```bash
# Terminal 1: Java parser (if testing independently)
java -jar src/target/grammar-oracle-parser.jar --json --sentence "el perro es grande"

# Terminal 2: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 3: Frontend
cd frontend
npm run dev

# Visit http://localhost:3000
```

### Running with Docker

```bash
docker-compose up --build
# Visit http://localhost:3000
```

## API Usage

### Validate Sentence

```bash
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{
    "sentence": "el perro es grande",
    "language": "spanish"
  }'
```

### Verifier Loop

```bash
curl -X POST http://localhost:8000/verify-loop \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate Spanish sentence about big dog",
    "language": "spanish",
    "max_retries": 3
  }'
```

### Grammar X-Ray

```bash
curl -X POST http://localhost:8000/xray \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a short story about a boy and his dog",
    "language": "spanish"
  }'
```

## Project Status

**Current Phase**: Phase 6 — Verifier Loop Experiment Harness (infrastructure built, awaiting first full run)

- ✅ **Phase 1**: Java CFG parser with JSON output + FastAPI backend
- ✅ **Phase 2**: Next.js frontend with interactive visualization (token spans, parse trees, rule traces, failure diagnostics)
- ✅ **Phase 3**: LLM verifier loop — generate → validate → constraint feedback → retry
- ✅ **Phase 4**: Grammar X-Ray, parser performance metrics, Grammar & Lexicon viewer
- ✅ **Phase 5**: Grammar hardening — position-aware NP types (`NP_EX` for existential frames), bare noun object rejection
- 🔧 **Phase 6** (in progress): Experiment harness — 198 prompts, 3 baselines, failure classification, metrics dashboard (CLI runner built; web-triggered runs planned)
- 📋 **Phase 7**: Minimal morphology layer — plural handling, gender/number agreement, `PROPN` tag
- 📋 **Phase 8**: Earley parser + packed parse forest — replace BFS with polynomial-time parsing
- 📋 **Phase 9**: Grammar Pack CI/CD — versioned, testable grammar artifacts
- 📋 **Phase 10** (future): Multi-language support — Cornish grammar (the parser's original 2004 language) alongside Spanish

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed roadmap.

## Research Goals

### Testable Hypothesis

> Integrating a symbolic CFG verifier with an LLM through a structured verifier loop improves grammatical structural correctness (relative to a scoped grammar) and provides interpretable failure explanations more effectively than existing heuristic or statistical grammar checkers.

### Success Metrics

- **Verification accuracy**: CFG rejects invalid sentences within scope more consistently than general grammar checkers
- **Correction efficacy**: Constraint feedback increases second-attempt success rate
- **Explainability**: Parse trees improve user understanding vs. surface-level error flags
- **Ambiguity exposure**: System reveals structural ambiguities not surfaced elsewhere

## Scope and Limitations

### What Grammar Oracle IS

- **Formal validator** for explicitly scoped grammars
- **Research tool** for neuro-symbolic AI patterns
- **Pedagogical demonstration** of structure visualization

### What Grammar Oracle IS NOT

- ❌ General natural language validator
- ❌ Semantic/pragmatic correctness guarantee
- ❌ Production-grade grammar correction tool
- ❌ Replacement for LanguageTool/Grammarly

**Important**: Grammar Oracle validates against **declared grammar scope**. Rejection of a natural sentence outside scope is expected behavior, not a bug.

### Known Limitations

- **BFS parser is exponential**: The parser uses exhaustive breadth-first search — it works because the grammar is small (~41 rules, ~991 words), but it cannot scale to larger grammars. Phase 8 will replace BFS with an Earley parser (O(n^3) worst case, O(n^2) for unambiguous grammars), which also enables packed parse forests for representing ambiguity efficiently.
- **Bare proper names not supported**: After the Phase 5 NP fix, bare proper names like "Carlos corre" no longer parse because all NP positions require a determiner. A future `PROPN` terminal tag (Phase 7) will restore proper name support.
- **No morphological analysis**: Words must be in the lexicon exactly as written. "perros" (plural) requires a separate entry from "perro" (singular). Phase 7 will add basic inflection handling.
- **No gender/number agreement**: "el perra" or "la perro" are accepted if both words are in the lexicon. Phase 7 will add post-parse agreement checking.
- **Spanish only**: The parser architecture supports multiple languages (the Java `Language` enum already includes `CORNISH` from the original 2004 thesis), but only Spanish grammar/lexicon XML files exist. Phase 10 would add Cornish as a second language — the original language this parser was built for.
- **Experiment runner is CLI-only**: The Phase 6 experiment harness currently runs via command line. A future update will add web-triggered experiment runs so the Experiments tab is fully self-contained.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design decisions
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Phase-by-phase implementation plan
- [RESEARCH.md](RESEARCH.md) - Research hypothesis and evaluation strategy
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## Related Work

Grammar Oracle builds on:

- **Grammar-Constrained Decoding**: XGrammar (ICML 2025), Outlines, Guidance
- **Neuro-Symbolic AI**: Garcez et al. (2022), Marcus (2020)
- **Grammatical Error Correction**: Bryant et al. (2023)
- **LLM Syntax**: Wang et al. (2025), McCoy et al. (2020)

See [RESEARCH.md](RESEARCH.md) for full references.

## License

© 2025 James Tyack. All rights reserved.

## Contact

- **Repository**: https://github.com/jamestyack/grammar-oracle
- **Historical Origin**: https://github.com/jamestyack/cornish-parser
- **Author**: [James Tyack](https://github.com/jamestyack)

---

**Built on**: 2004 symbolic AI + 2026 neural AI = neuro-symbolic validation
