# Grammar Oracle Architecture

**System**: Neuro-Symbolic Grammar Validation
**Version**: Phase 4 (Grammar X-Ray + Parser Metrics)

---

## System Overview

Grammar Oracle validates sentences against formal Context-Free Grammars (CFGs) and returns structured parse results. The system uses a 2004-era symbolic parser (modernized) as the validation engine, wrapped by a Python API layer, with LLM integration for generation and a Grammar X-Ray mode for unconstrained paragraph analysis.

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
│  - Token spans      - Validation API       - Parsing       │
│  - Parse trees      - LLM clients          - Rule trace    │
│  - Grammar X-Ray    - Verifier loop        - Diagnostics   │
│  - Retry timeline   - X-Ray orchestrator   - Metrics       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. CFG Parser (Java)

**Location**: `src/`
**Entry point**: `com.grammaroracle.parser.ParserMain`
**Artifact**: `grammar-oracle-parser.jar`

The parser is a **top-down recursive descent parser with backtracking**, based on the [cornish-parser](https://github.com/jamestyack/cornish-parser) (2003–2004). It reads CFG rules and a lexicon from XML, then exhaustively searches for all valid parse trees.

#### Class Diagram

```
ParserMain (CLI)
  │
  ├── Parser (core BFS algorithm)
  │     ├── ProductionRules (loads grammar.xml)
  │     │     └── Rule (LHS → RHS₁ RHS₂ ... RHSₙ)
  │     ├── Lexicon (loads lexicon.xml)
  │     │     └── LexiconEntry (word, POS tags, translation)
  │     ├── Sentence (tokenization)
  │     ├── ParseMemory (backtracking state, Cloneable)
  │     └── ParseMetrics (BFS performance counters)
  │
  ├── JsonSerializer (parse result + metrics → JSON)
  │
  ├── BadSentenceException (failure diagnostics)
  │
  └── Language (enum: SPANISH, CORNISH)
```

#### Parse Algorithm

```
Input: "el perro es grande"

1. Tokenize → ["el", "perro", "es", "grande"]
2. Check all words exist in lexicon
3. Initialize ParseMemory with starting symbol [SENTENCE]
4. Process queue:
   a. Pop symbol from stack
   b. If non-terminal → find matching rules, clone memory for each, push RHS
   c. If terminal (POS tag) → match against next word's lexicon tags
   d. If stack empty AND all words consumed → successful parse
5. Collect all successful parses (max 10)
6. If none found → throw BadSentenceException with diagnostics
```

Key characteristics:
- **Deterministic**: No probabilistic components
- **Exhaustive**: Finds all valid parses (detects ambiguity)
- **Explainable**: Every rule application is recorded in ParseMemory

#### Failure Diagnostics

When parsing fails, the parser tracks the **furthest position reached** across all attempted parse paths and reports which POS categories were expected at that position. This provides actionable feedback for the verifier loop.

```json
{
  "index": 0,
  "token": "grande",
  "expectedCategories": ["DET", "V_EX"],
  "message": "Expected DET or V_EX at position 0, found 'grande'"
}
```

### 2. FastAPI Backend (Python)

**Location**: `backend/`
**Entry point**: `app.main:app`
**Port**: 8000

The backend orchestrates calls to the Java parser via subprocess and exposes a REST API.

#### Module Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app, routes, CORS
│   ├── models.py          # Pydantic models (request/response)
│   ├── parser_client.py   # Java subprocess wrapper
│   ├── llm_client.py      # Anthropic Claude SDK client
│   └── xray.py            # X-Ray orchestrator (sentence splitting, batch parsing)
├── requirements.txt
└── Dockerfile
```

#### API Endpoints

| Method | Path           | Description                                    |
|--------|----------------|------------------------------------------------|
| GET    | `/health`      | Service health check                           |
| POST   | `/validate`    | Validate sentence against CFG                  |
| POST   | `/verify-loop` | LLM generate → CFG validate → retry loop       |
| POST   | `/xray`        | LLM paragraph generation + per-sentence parsing |

#### Parser Integration

The backend calls the Java JAR as a subprocess:

```
FastAPI request
  → parse_sentence()
    → _find_java()           # Locate Java runtime
    → subprocess.run()       # java -jar parser.jar --json --sentence "..."
    → json.loads(stdout)     # Parse JSON output
    → ParseResult model      # Pydantic validation
  → JSON response
```

Subprocess overhead is ~50ms, acceptable for research/demo use.

### 3. Frontend (Next.js) — ✅ Complete

**Location**: `frontend/`
**Port**: 3000

Next.js 16 App Router with TypeScript and Tailwind CSS providing interactive visualization across three modes: Parse Sentence, LLM + Verify, and Grammar X-Ray.

#### Component Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page: three-tab interface
├── components/
│   ├── TokenSpan.tsx             # Color-coded POS tokens with translations
│   ├── ParseTreeView.tsx         # Collapsible tree with word annotations
│   ├── RuleTrace.tsx             # Numbered derivation rule list
│   ├── FailureView.tsx           # Human-readable failure diagnostics
│   ├── AnnotatedParagraph.tsx    # X-Ray: flowing colored text + parser metrics
│   ├── XRayView.tsx              # X-Ray: result container + LLM inspector
│   ├── XRayStatsBar.tsx          # X-Ray: coverage stats display
│   └── XRaySummary.tsx           # X-Ray: analysis summary
└── lib/
    ├── api.ts                    # API client + TypeScript interfaces
    └── tagColors.ts              # Shared POS tag color constants
```

#### Token Color Coding

| POS Tag | Color   |
|---------|---------|
| DET     | Blue    |
| N       | Green   |
| V/V_COP/V_EX | Red |
| A       | Purple  |
| ADV     | Orange  |
| PREP    | Teal    |
| NEG     | Gray    |

---

## Data Contract

### JSON Output Format

**Valid parse**:
```json
{
  "valid": true,
  "sentence": "el perro es grande",
  "tokens": [
    {"word": "el", "tag": "DET", "translation": "the (m.sg)"},
    {"word": "perro", "tag": "N", "translation": "dog"},
    {"word": "es", "tag": "V_COP", "translation": "is"},
    {"word": "grande", "tag": "A", "translation": "big"}
  ],
  "parseTree": {
    "symbol": "SENTENCE",
    "children": [{
      "symbol": "S",
      "children": [
        {"symbol": "NP", "children": [
          {"symbol": "DET", "word": true},
          {"symbol": "N", "word": true}
        ]},
        {"symbol": "V_COP", "word": true},
        {"symbol": "A", "word": true}
      ]
    }]
  },
  "rulesApplied": [
    {"number": 1, "rule": "SENTENCE -> S"},
    {"number": 2, "rule": "S -> NP V_COP A"},
    {"number": 10, "rule": "NP -> DET N"}
  ],
  "parses": 1,
  "ambiguous": false,
  "metrics": {
    "statesExplored": 42,
    "statesGenerated": 58,
    "maxQueueSize": 12,
    "ruleExpansions": 28,
    "terminalAttempts": 14,
    "terminalSuccesses": 4,
    "parseTimeMs": 1.23
  }
}
```

**Invalid parse**:
```json
{
  "valid": false,
  "sentence": "grande perro",
  "tokens": [
    {"word": "grande", "tag": "A", "translation": "big"},
    {"word": "perro", "tag": "N", "translation": "dog"}
  ],
  "failure": {
    "index": 0,
    "token": "grande",
    "expectedCategories": ["DET", "V_EX"],
    "message": "Expected DET or V_EX at position 0, found 'grande'"
  },
  "metrics": {
    "statesExplored": 8,
    "statesGenerated": 12,
    "maxQueueSize": 4,
    "ruleExpansions": 6,
    "terminalAttempts": 2,
    "terminalSuccesses": 0,
    "parseTimeMs": 0.45
  }
}
```

---

## Parser Performance Metrics

The parser tracks BFS search performance via `ParseMetrics`, providing visibility into the work done per parse:

| Metric             | Description                                      |
|--------------------|--------------------------------------------------|
| statesExplored     | Parse states dequeued and processed               |
| statesGenerated    | Total parse states created (including branches)   |
| maxQueueSize       | Peak BFS queue depth                              |
| ruleExpansions     | Non-terminal → production rule expansions         |
| terminalAttempts   | Times a POS tag was checked against a word        |
| terminalSuccesses  | Successful POS tag matches                        |
| parseTimeMs        | Wall-clock parse time in milliseconds             |

The frontend renders these as a plain-English interpretation (e.g., "The parser explored 42 states, trying 14 word matches and succeeding on 4") with collapsible raw metrics.

---

## LLM Integration

### Claude SDK

The backend uses the Anthropic Python SDK (`anthropic` package) to call Claude for:
- **Verifier Loop**: Constrained generation with grammar rules in the system prompt
- **X-Ray Paragraph Generation**: Unconstrained natural Spanish writing

### X-Ray Flow

```
User prompt ("a story about a boy and his dog")
  → generate_paragraph()     # Claude writes natural Spanish
  → split_sentences()        # Regex split on .!?
  → parse_sentence() × N     # CFG parser validates each sentence
  → aggregate stats          # Coverage percentages, POS tags, rules used
  → XRayResponse             # Full analysis with per-sentence results + metrics
```

---

## Grammar Pack Format

Grammars are defined using two XML files per language:

### grammar.xml

```xml
<grammar start="SENTENCE">
  <rule number="1">
    <lhs>SENTENCE</lhs>
    <rhs>S</rhs>
  </rule>
  <rule number="2">
    <lhs>S</lhs>
    <rhs>NP</rhs>
    <rhs>V_COP</rhs>
    <rhs>A</rhs>
  </rule>
</grammar>
```

- `start` attribute defines the root symbol
- Each `<rule>` has a unique number, one `<lhs>`, and one or more `<rhs>` elements
- Non-terminals are phrase types (SENTENCE, S, NP, VP)
- Terminals are POS tags (DET, N, V, A, etc.)

### lexicon.xml

```xml
<lexicon>
  <entry>
    <kw>perro</kw>
    <posTag>N</posTag>
    <en>dog</en>
  </entry>
</lexicon>
```

- `<kw>` — word in the target language
- `<posTag>` — part-of-speech tag (can have multiple per word)
- `<en>` — English translation

### Current POS Tag Set

| Tag    | Category            | Examples              |
|--------|---------------------|-----------------------|
| DET    | Determiner          | el, la, un, una       |
| N      | Noun                | perro, casa, hombre   |
| A      | Adjective           | grande, bueno, rojo   |
| V      | Verb                | corre, come, tiene    |
| V_COP  | Copular verb        | es, está, son         |
| V_EX   | Existential verb    | hay                   |
| ADV    | Adverb              | muy, bien, siempre    |
| NEG    | Negation            | no                    |
| PREP   | Preposition         | en, de, con, para     |
| CONJ   | Conjunction         | (planned)             |
| PRON   | Pronoun             | (planned)             |

---

## Deployment Architecture

### Docker Compose

```yaml
services:
  parser:    # Builds JAR (maven + JDK 21)
  backend:   # FastAPI + JRE 21 (port 8000)
  frontend:  # Next.js Node 20 (port 3000)
```

The parser service builds the JAR artifact during `docker-compose up --build`. The backend service includes an embedded JRE for running the parser subprocess. The frontend service serves the Next.js app.

### Local Development

```
Terminal 1: cd src && mvn clean package
Terminal 2: cd backend && uvicorn app.main:app --reload
```

Requires Java 21+ and Python 3.9+ installed locally.

---

## Design Decisions

### 1. Subprocess over JNI/gRPC

The Java parser runs as a subprocess rather than via JNI, Py4J, or gRPC.

**Rationale**:
- Preserves historical authenticity (2004 code remains a standalone artifact)
- Language isolation (Python orchestration, Java validation)
- Easy to containerize and debug independently
- ~50ms overhead is acceptable for research/demo
- Fits the "2004 engine correcting 2026 LLM" narrative

### 2. XML Grammar Format

Using XML rather than BNF text files or JSON for grammar definitions.

**Rationale**:
- Matches the original cornish-parser format (historical continuity)
- Well-supported by JDOM2 library
- Structured format prevents parsing ambiguity in rule definitions
- Easy to validate with XML schema if needed

### 3. Exhaustive Parse Search

The parser finds all valid parse trees rather than stopping at the first.

**Rationale**:
- Detects ambiguity (multiple valid parses = ambiguous sentence)
- Research value: understanding why a sentence has multiple interpretations
- Bounded by MAX_PARSES (10) to prevent runaway computation

### 4. Failure Diagnostics via Furthest Position

Parse failures report the deepest point reached across all attempted paths.

**Rationale**:
- More informative than "parse failed" — shows where and why
- Enables the verifier loop (Phase 3) to provide structured constraints to LLMs
- The expected categories at the failure point directly map to corrective guidance

---

## Technology Stack

| Component | Technology     | Version | Purpose                    |
|-----------|----------------|---------|----------------------------|
| Parser    | Java           | 21      | CFG validation engine      |
| XML       | JDOM2          | 2.0.6.1 | Grammar/lexicon loading    |
| JSON      | org.json       | 20240303| Parse result serialization |
| Build     | Maven          | 3.9+    | Java build and packaging   |
| Backend   | FastAPI        | 0.115   | REST API                   |
| Models    | Pydantic       | 2.10    | Request/response schemas   |
| Server    | Uvicorn        | 0.34    | ASGI server                |
| Container | Docker Compose | 3       | Multi-service deployment   |
| LLM       | Anthropic SDK  | 0.52    | Claude API client          |
| Frontend  | Next.js        | 16      | React app framework        |
| Styling   | Tailwind CSS   | 4       | Utility-first CSS          |
| Testing   | JUnit 5        | 5.11    | Java unit tests            |
