# Grammar Oracle — Claude Code Instructions

## Git Workflow

- **NEVER push directly to main.** Always work on a feature branch.
- Before starting new work, pull latest from origin/main and create a feature branch (e.g., `feature/phase-1-json-api`).
- Push feature branches to origin and create pull requests for review.
- Never force push to any branch.

## Security

- Never access, read, or discuss `.env` files, API keys, or secrets. These are off limits.

## Project Structure

- `src/` — Java CFG parser (Maven project, builds `grammar-oracle-parser.jar`)
  - Key classes: `Parser`, `ParseMetrics`, `JsonSerializer`, `ParserMain`, `Lexicon`, `ProductionRules`
- `backend/` — Python FastAPI backend (calls parser JAR via subprocess)
  - `app/main.py` — Routes: `/validate`, `/verify-loop`, `/xray`, `/health`
  - `app/models.py` — Pydantic models (ParseResult, ParseMetrics, XRayResponse, etc.)
  - `app/parser_client.py` — Java subprocess wrapper
  - `app/llm_client.py` — Anthropic Claude SDK client (ParagraphResult, generate_paragraph)
  - `app/xray.py` — X-Ray orchestrator (sentence splitting, batch parsing, stats)
- `frontend/` — Next.js 16 frontend with TypeScript and Tailwind CSS
  - Three modes: Parse Sentence, LLM + Verify, Grammar X-Ray
  - Key components: `AnnotatedParagraph`, `XRayView`, `XRayStatsBar`, `XRaySummary`, `TokenSpan`, `ParseTreeView`
  - `lib/tagColors.ts` — Shared POS tag color constants
- `grammar-packs/` — Versioned grammar/lexicon XML packs (planned)

## Build & Test

- Java parser: `cd src && mvn clean package` (runs 20 JUnit tests, ~990 lexicon entries, 19 grammar rules)
- Python backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
- Frontend: `cd frontend && npm install && npm run dev`
- Docker: `docker-compose up --build`

## Architecture

- Parser is a top-down BFS CFG parser with backtracking, instrumented with ParseMetrics
- Backend calls parser JAR as a subprocess with `--json` flag
- Backend calls Claude via Anthropic SDK for verifier loop and X-Ray generation
- Frontend has three tabs: Parse Sentence, LLM + Verify, Grammar X-Ray
- See ARCHITECTURE.md for full details

## Conventions

- Java package: `com.grammaroracle.parser`
- Grammar/lexicon XML files use `{language}_grammar.xml` / `{language}_lexicon.xml` naming
- POS tags: DET, N, V, V_COP, V_EX, A, ADV, NEG, PREP, CONJ, PRON
- Dockerfiles use Eclipse Temurin JDK/JRE 21
