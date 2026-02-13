# Grammar Oracle Implementation Plan

**Current Phase**: Phase 6 — Verifier Loop Experiment Harness (harness built, awaiting first run)
**Origin**: [cornish-parser](https://github.com/jamestyack/cornish-parser) (2004 university thesis)

---

## Completed Phases

### Phase 1: JSON Output + Basic API ✅

**Goal**: Parser outputs JSON, FastAPI validates sentences

- Added `JsonSerializer.java` for structured JSON output (parse trees, tokens, rule traces, failure diagnostics)
- Created FastAPI backend with `/validate` endpoint
- Java subprocess wrapper for parser invocation
- Pydantic request/response models

### Phase 2: Frontend Visualization ✅

**Goal**: Interactive X-ray view of parse results

- Next.js 16 app with `ParseTreeView`, `TokenSpan`, `RuleTrace`, `FailureView` components
- Color-coded POS tags with English translations and hover tooltips
- Sample sentences organized by category
- Docker Compose for local deployment (parser + backend + frontend)

### Phase 3: LLM Verifier Loop ✅

**Goal**: LLM generates → CFG validates → constraint feedback → retry

- Claude integration via Anthropic SDK
- `/verify-loop` endpoint with up to 3 retry attempts
- Constraint formatter converts parser failure diagnostics into LLM-friendly feedback
- `VerifierLoopView` component showing attempt timeline with before/after comparison

### Phase 4: Grammar X-Ray + Parser Metrics + Grammar & Lexicon Viewer ✅

**Goal**: Unconstrained LLM generation analyzed by CFG parser

- **Grammar X-Ray**: Claude writes natural Spanish paragraph → CFG parser X-rays every sentence
- Color-coded flowing text with per-word POS annotation, click-to-expand parse trees
- **Parser performance metrics**: states explored, rule expansions, terminal match rates, branching factor, parse time — with plain-English interpretation
- **Grammar & Lexicon viewer**: Browse all grammar rules grouped by non-terminal, searchable/filterable lexicon table
- Dynamic stats via `/stats` and `/grammar-detail` endpoints (computed from XML at runtime)
- LLM prompt inspector showing system prompt, user message, and raw Claude response
- Coverage statistics (sentence and word recognition percentages)

### Phase 5: Grammar Hardening — NP Bare Noun Fix ✅

**Goal**: Eliminate overgeneration of bare noun phrases

- **Problem**: `BASE_NP → N` (rule 17) allowed bare nouns in all positions, incorrectly accepting sentences like "el niño lee libro" (should require determiner for object)
- **Fix**: Removed rule 17. Created position-aware `NP_EX` non-terminal for existential frames only (`hay perro`). All other NP positions now require determiners.
- Added 4 new grammar rules (NP_EX variants) and updated 2 existential clause rules
- Added 6 targeted Java parser tests (26 total, all passing)
- **Trade-off**: Bare proper names ("Carlos corre") no longer parse — requires future `PROPN` terminal tag

### Phase 6: Verifier Loop Experiment Harness 🔧 IN PROGRESS

**Goal**: Turn the verifier loop demo into measurable, repeatable results

**Completed** (harness built, awaiting first full experiment run):
- **Prompt dataset**: 198 prompts across 6 grammar templates (copular, transitive, existential, PP, negation, conjunction) in `experiments/verifier_loop/prompts.json`
- **Pluggable feedback**: `run_verify_loop()` now accepts optional `feedback_formatter` parameter, enabling baseline comparisons without code duplication
- **CLI experiment runner**: `experiments/verifier_loop/run_experiment.py` — reads prompts, runs each through the verifier loop, writes JSONL results. Supports `--baselines`, `--templates`, `--dry-run`, `--delay` flags
- **Three baselines**: structural feedback (current), generic NL feedback ("try again"), single-shot (no feedback)
- **Failure classification**: Categorizes failures as OOV word, missing DET, wrong POS, unsupported construction, or error
- **Metrics computation**: `compute_metrics.py` computes pass@1, pass@k, mean retries-to-pass, mean/p95 latency, failure histogram, per-template breakdown
- **Report generation**: `generate_report.py` produces Markdown summary tables
- **API endpoints**: `GET /experiment-results` and `GET /experiment-results/{run_id}` serve pre-computed results
- **Frontend "Experiments" tab** (5th tab): Dashboard with metrics summary cards, baseline comparison table, per-template breakdown, failure histogram, and individual result browser with drill-down into full `VerifierLoopView`

**Next**: Run first full experiment (`python3 run_experiment.py --baselines structural,none`), analyze results, iterate on prompt quality

---

## Research Roadmap

### Phase 7: Minimal Morphology Layer 📋 PLANNED

**Goal**: Reduce lexicon brittleness; enable basic agreement checks

- Handle plural -s/-es for nouns/adjectives
- Determiner gender/number variants (el/la/los/las; un/una/unos/unas)
- Token → lemma + features (gender, number) normalization pipeline
- Post-parse agreement checker: DET↔N and ADJ↔N agreement
- Report "syntactically in-scope, agreement violation" when parse succeeds but agreement fails
- Add `PROPN` terminal tag for proper names (fixes Phase 5 trade-off)

### Phase 8: Earley Parser + Packed Forest 📋 PLANNED

**Goal**: Scale parsing; preserve explainability; represent ambiguity without explosion

- Replace BFS with Earley parser (predict/scan/complete operations)
- Build packed parse forest (SPPF-like shared substructures)
- Ambiguity metrics: packed nodes, packed edges, estimated derivation count
- Preserve current diagnostics: expected categories at position k, best-failure frontier
- Performance benchmarks against current BFS on same sentence set
- Feature-flagged: JSON output supports both forest and sampled tree expansion

### Phase 9: Grammar Pack CI/CD 📋 PLANNED

**Goal**: Versioned grammar packs with automated validation

```
grammar-packs/spanish/v0.2/
├── grammar.xml          # CFG rules
├── lexicon.xml          # Token → POS mappings
├── scope.md             # Coverage contract
├── tests/
│   ├── positive.txt     # MUST parse
│   ├── negative.txt     # MUST fail
│   └── ambiguous.txt    # Multiple parses OK
├── metrics.json         # Auto-generated
└── CHANGELOG.md
```

- GitHub Actions CI pipeline
- Acceptance criteria: positive ≥95%, negative ≥95%, ambiguity ≤10%

---

## Architecture Decisions

### Java Parser Integration: Subprocess Execution

FastAPI calls Java JAR via subprocess with JSON serialization. Preserves historical authenticity (2004 code), provides language isolation, and fits the "2004 engine correcting 2026 LLM" narrative. Subprocess overhead (~20-50ms) is acceptable for research use.

### JSON Data Contract

Stable JSON schema across all phases. Valid parses include: parse tree, tokens with translations, rules applied, parse count, ambiguity flag, performance metrics. Invalid parses include: failure index, expected categories, human-readable message.

### Deployment

Docker Compose with three services: parser (Java 21), backend (FastAPI Python 3.11, port 8000), frontend (Next.js Node 20, port 3000).

---

## Current Grammar Statistics

| Metric | Value |
|--------|-------|
| Grammar rules | 41 (was 38 before Phase 5) |
| Lexicon words | ~991 unique |
| POS tag categories | 10 (DET, N, V, V_COP, V_EX, A, ADV, NEG, PREP, CONJ) |
| Non-terminal symbols | 8 (SENTENCE, S, CLAUSE, NP, NP_EX, BASE_NP, VP, PP) |
| Java parser tests | 26 (all passing) |
| API endpoints | 8 (health, validate, verify-loop, xray, stats, grammar-detail, experiment-results, experiment-results/{id}) |
| Frontend modes | 5 (Parse Sentence, LLM + Verify, Grammar X-Ray, Grammar & Lexicon, Experiments) |
| Experiment prompts | 198 across 6 templates (copular, transitive, existential, PP, negation, conjunction) |

---

## Success Metrics

**Technical**: API latency ≤100ms (95th percentile), verifier loop ≤5s including LLM, grammar pack CI positive/negative ≥95%

**Research**: CFG catches LLM structural errors, constraint feedback improves retry success rate, parse trees provide interpretable explanations, system reveals structural ambiguities

---

**Note**: This implementation builds on the cornish-parser (2004) foundation. The research roadmap prioritizes measurability (Phase 6), linguistic coverage (Phase 7), scalability (Phase 8), and CI/CD (Phase 9).
