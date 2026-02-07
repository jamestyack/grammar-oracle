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
- `backend/` — Python FastAPI backend (calls parser JAR via subprocess)
- `frontend/` — Next.js frontend (Phase 2+)
- `grammar-packs/` — Versioned grammar/lexicon XML packs (Phase 4)

## Build & Test

- Java parser: `cd src && mvn clean package` (runs 20 JUnit tests)
- Python backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
- Docker: `docker-compose up --build`

## Architecture

- Parser is a top-down recursive descent CFG parser with backtracking
- Backend calls parser JAR as a subprocess with `--json` flag
- See ARCHITECTURE.md for full details

## Conventions

- Java package: `com.grammaroracle.parser`
- Grammar/lexicon XML files use `{language}_grammar.xml` / `{language}_lexicon.xml` naming
- POS tags: DET, N, V, V_COP, V_EX, A, ADV, NEG, PREP, CONJ, PRON
- Dockerfiles use Eclipse Temurin JDK/JRE 21
