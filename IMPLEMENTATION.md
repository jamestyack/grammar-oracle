# Grammar Oracle Implementation Plan

**Status**: Phases 1–2 complete, Phase 3 next
**Timeline**: 8 weeks to research-ready system

---

## Quick Reference

This document provides the detailed implementation plan for Grammar Oracle. For complete architectural details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Implementation Phases

### Phase 1: JSON Output + Basic API (Weeks 1-2) ✅ COMPLETE

**Goal**: Parser outputs JSON, FastAPI validates sentences

**Java Changes** (in `src/`):
1. Add `org.json:json:20240303` dependency to pom.xml
2. Create `JsonSerializer.java` with serializeValidParse() and serializeInvalidParse()
3. Enhance `BadSentenceException.java` with failure diagnostic fields
4. Modify `Parser.java` to capture failure state
5. Add `--json` CLI flag to `ParserMain.java`

**Python Backend** (NEW `backend/` directory):
- FastAPI app with `/validate` endpoint
- Pydantic models for parse results
- Java subprocess wrapper

**Deliverable**:
```bash
curl -X POST http://localhost:8000/validate \
  -d '{"sentence": "el perro es grande", "language": "spanish"}'
```
Returns structured JSON with parse tree or failure diagnostics.

---

### Phase 2: Frontend Visualization (Weeks 3-4) ✅ COMPLETE

**Goal**: Interactive X-ray view (token spans, parse trees, rule traces, failures)

**Next.js 16 App** (`frontend/` directory):
- `ParseTreeView.tsx` - collapsible hierarchical tree with word annotations and English translations
- `TokenSpan.tsx` - color-coded POS tag spans with inline translations and hover tooltips
- `RuleTrace.tsx` - numbered derivation rule list
- `FailureView.tsx` - human-readable failure diagnostics with fix suggestions and POS tag descriptions

**Additional deliverables**:
- Sample sentences organized by category (Simple, Transitive, Prepositional, Adverbs & Negation, Invalid)
- "I'm feeling lucky" random sentence button
- Spanish grammar expanded to 19 rules (added PP, VP+adverb, NP+PP patterns)
- Spanish lexicon expanded to 144 entries (people, animals, places, food, colors, adjectives, verbs, adverbs, prepositions)
- Docker frontend service (Node 20 Alpine, port 3000)

**Deliverable**: User inputs "el perro es grande" → sees colored tokens with translations, expandable parse tree, rule trace. Invalid inputs show actionable diagnostics.

---

### Phase 3: LLM Integration + Verifier Loop (Weeks 5-6) 📋 PLANNED

**Goal**: LLM generates → CFG validates → retry on failure

**Backend Enhancements**:
- LLM client abstraction (Claude + OpenAI)
- `/verify-loop` endpoint with retry logic
- Constraint formatting from failure diagnostics

**Frontend Enhancements**:
- `GenerateMode.tsx` - prompt input
- `VerifierLoopView.tsx` - attempt timeline
- `BeforeAfterView.tsx` - comparison view

**"Wow Moment" Workflow**:
1. Prompt: "Generate Spanish sentence about big dog"
2. LLM Attempt 1: "Grande perro" (invalid)
3. CFG rejects: Expected DET at start
4. LLM Attempt 2: "El perro es grande" (valid)
5. UI shows before/after with parse trees

**Deliverable**: Working verifier loop demo visible to user

---

### Phase 4: Grammar Pack CI/CD (Weeks 7-8) 📋 PLANNED

**Goal**: Versioned grammar packs with automated validation

**Grammar Pack Structure** (NEW `grammar-packs/` directory):
```
grammar-packs/spanish/v0.1/
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

**CI Pipeline** (`.github/workflows/grammar-ci.yml`):
- Test changed grammar packs
- Acceptance criteria: positive ≥95%, negative ≥95%, ambiguity ≤10%

**Deliverable**: Grammar packs as versioned, testable artifacts

---

## Architecture Decisions

### 1. Java Parser Integration: Subprocess Execution

**Decision**: FastAPI calls Java JAR via subprocess with JSON serialization

**Rationale**:
- Preserves historical authenticity (2004 code remains intact)
- Language isolation (Python orchestration, Java validation)
- Easy to containerize and debug independently
- Fits "2004 engine correcting 2026 LLM" narrative
- Subprocess overhead (~20-50ms) is acceptable for demo/research use

**Implementation**:
```python
# FastAPI backend calls Java subprocess
result = subprocess.run(
    ["java", "-jar", "grammar-oracle-parser.jar", "--json", "--sentence", text],
    capture_output=True, text=True, timeout=5
)
parse_result = json.loads(result.stdout)
```

### 2. JSON Data Contract

**Valid Parse**:
```json
{
  "valid": true,
  "sentence": "el perro es grande",
  "tokens": [{"word": "el", "tag": "DET", "translation": "the"}, ...],
  "parseTree": {"symbol": "SENTENCE", "children": [...]},
  "rulesApplied": [{"number": 1, "rule": "SENTENCE->S"}, ...],
  "parses": 1,
  "ambiguous": false
}
```

**Invalid Parse**:
```json
{
  "valid": false,
  "sentence": "grande perro",
  "tokens": [{"word": "grande", "tag": "A"}, ...],
  "failure": {
    "index": 0,
    "token": "grande",
    "expectedCategories": ["DET", "V_EX"],
    "message": "Expected determiner or existential verb at sentence start"
  }
}
```

### 3. Deployment: Multi-Container Docker Compose

**Services**:
1. **parser**: Java 21 Alpine + JAR (no network exposure, called by backend)
2. **backend**: FastAPI Python 3.11 (port 8000, orchestrates LLM + parser)
3. **frontend**: Next.js Node 20 (port 3000, interactive UI)

**Target Platform**: Render (recommended) or Railway for Docker deployment

---

## Verification Strategy

### Phase 1 Testing
```bash
# Java JSON output
cd src
mvn clean package
java -jar target/grammar-oracle-parser.jar --json --language SPANISH --sentence "el perro es grande"
# Expected: Valid JSON with parseTree, rulesApplied, tokens

# FastAPI endpoint
cd backend
uvicorn app.main:app --reload
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{"sentence": "el perro es grande", "language": "spanish"}'
```

### Phase 2 Testing
```bash
# Frontend
cd frontend
npm run dev  # Port 3000
# Test: Input "el perro es grande" → See visualization
```

### Phase 3 Testing
```bash
# Verifier loop
curl -X POST http://localhost:8000/verify-loop \
  -d '{"prompt": "Spanish sentence about big dog", "language": "spanish"}'
# Expected: JSON with attempts showing retry progression
```

### Phase 4 Testing
```bash
# Grammar pack test runner
python -m app.test_runner --pack grammar-packs/spanish/v0.1
# Expected: metrics.json with pass rates ≥95%

# CI simulation (GitHub Actions)
# Modify grammar test file → push → CI validates
```

### Integration Testing
```bash
# Full stack
docker-compose up --build
# Visit http://localhost:3000
# Test: Complete verifier loop workflow
```

---

## Success Metrics

**Technical**:
- API latency: ≤ 100ms validation (95th percentile)
- Verifier loop: ≤ 5 seconds including LLM
- Grammar pack CI: Positive ≥95%, Negative ≥95%, Ambiguity ≤10%

**Demo**:
- "Wow moment" reliable in ≥90% of demos
- Parse trees render correctly
- Failure visualization clear

**Research**:
- CFG catches LLM errors
- Structured constraints improve retry success
- System reveals ambiguities not surfaced elsewhere

---

## Timeline Estimate

- **Phase 1** (JSON + API): 2 weeks
- **Phase 2** (Frontend): 2 weeks
- **Phase 3** (LLM Integration): 2 weeks
- **Phase 4** (Grammar Pack CI/CD): 2 weeks

**Total**: 8 weeks to research-ready system

---

## Risks & Mitigations

**Risk 1: Subprocess Overhead**
- **Mitigation**: Keep Java process warm; acceptable for research/demo

**Risk 2: LLM Retry Non-Convergence**
- **Mitigation**: max_retries=3; constraint prompts include examples; show partial results

**Risk 3: Grammar Pack Scope Creep**
- **Mitigation**: scope.md prominently displayed; error messages include "outside scope" disclaimer

**Risk 4: CI Test Maintenance**
- **Mitigation**: Keep tests focused (10-20 sentences); co-located with packs; CHANGELOG tracks additions

---

## Next Steps After Implementation

**Short Term (Months 1-3)**:
- Expand grammar packs: English v0.1, Cornish v2.0 (155 rules), Spanish v0.2
- User testing: language learners, NLP researchers
- Performance optimization

**Medium Term (Months 4-6)**:
- Research publication: benchmark vs baseline grammar checkers
- Advanced features: multi-parse visualization, backtracking animation
- Community: open source, documentation site

**Long Term (Months 7-12)**:
- Grammar pack marketplace
- Constrained decoding mode integration
- Mobile app

---

**Note**: This implementation builds on the cornish-parser (2004) foundation. Multi-language support (Spanish) provides the starting point for grammar pack development.
