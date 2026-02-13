from dotenv import load_dotenv
load_dotenv()

import json
import logging
import os
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request

from .models import ValidateRequest, ParseResult, VerifyLoopRequest, VerifyLoopResponse, XRayRequest, XRayResponse, GrammarStats, GrammarDetail, SUPPORTED_LANGUAGES
from .parser_client import parse_sentence
from .verifier_loop import run_verify_loop
from .xray import run_xray
from .grammar_stats import get_grammar_stats, get_grammar_detail

logger = logging.getLogger(__name__)

_EXPERIMENTS_DIR = Path(__file__).resolve().parent.parent.parent / "experiments" / "verifier_loop" / "results"

# Strict pattern for experiment run IDs (alphanumeric, hyphens, underscores only)
_RUN_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")

# CORS origins from env var (comma-separated) or default to localhost
_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Grammar Oracle API",
    description="CFG validation API for Grammar Oracle",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _safe_error(e: Exception) -> str:
    """Return a sanitized error message safe for clients."""
    msg = str(e).lower()
    if "api key" in msg or "authentication" in msg or "api_key" in msg:
        return "LLM service not configured"
    logger.exception("Request failed")
    return "Internal server error"


@app.get("/health")
def health():
    return {"status": "ok", "service": "grammar-oracle-backend"}


@app.post("/validate", response_model=ParseResult)
def validate(request: ValidateRequest):
    return parse_sentence(
        sentence=request.sentence,
        language=request.language,
    )


@app.post("/verify-loop", response_model=VerifyLoopResponse)
@limiter.limit("10/minute")
def verify_loop(request: VerifyLoopRequest, req: Request):
    try:
        return run_verify_loop(
            prompt=request.prompt,
            language=request.language,
            max_retries=request.max_retries,
        )
    except Exception as e:
        msg = str(e).lower()
        if "api key" in msg or "authentication" in msg or "api_key" in msg:
            raise HTTPException(status_code=503, detail="LLM service not configured. Set ANTHROPIC_API_KEY.")
        raise HTTPException(status_code=500, detail=_safe_error(e))


@app.get("/stats", response_model=GrammarStats)
def stats(language: str = Query(default="spanish", pattern="^[a-z]+$")):
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    try:
        return get_grammar_stats(language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_error(e))


@app.get("/grammar-detail", response_model=GrammarDetail)
def grammar_detail(language: str = Query(default="spanish", pattern="^[a-z]+$")):
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    try:
        return get_grammar_detail(language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_error(e))


@app.post("/xray", response_model=XRayResponse)
@limiter.limit("10/minute")
def xray(request: XRayRequest, req: Request):
    try:
        return run_xray(prompt=request.prompt, language=request.language)
    except Exception as e:
        msg = str(e).lower()
        if "api key" in msg or "authentication" in msg or "api_key" in msg:
            raise HTTPException(status_code=503, detail="LLM service not configured. Set ANTHROPIC_API_KEY.")
        raise HTTPException(status_code=500, detail=_safe_error(e))


@app.get("/experiment-results")
def list_experiment_results():
    """List available experiment summaries."""
    if not _EXPERIMENTS_DIR.exists():
        return []
    summaries = sorted(_EXPERIMENTS_DIR.glob("*_summary.json"), reverse=True)
    results = []
    for s in summaries[:10]:
        results.append(json.loads(s.read_text()))
    return results


@app.get("/experiment-results/{run_id}")
def get_experiment_result(run_id: str):
    """Get a specific experiment run's summary and individual results."""
    # Validate run_id to prevent path traversal and glob injection
    if not _RUN_ID_PATTERN.match(run_id):
        raise HTTPException(status_code=400, detail="Invalid run ID format")

    if not _EXPERIMENTS_DIR.exists():
        raise HTTPException(status_code=404, detail="No experiments directory")

    summary_file = _EXPERIMENTS_DIR / f"{run_id}_summary.json"

    # Verify resolved path stays within experiments dir
    if not summary_file.resolve().parent == _EXPERIMENTS_DIR.resolve():
        raise HTTPException(status_code=400, detail="Invalid run ID")

    if not summary_file.exists():
        raise HTTPException(status_code=404, detail="Run not found")

    summary = json.loads(summary_file.read_text())

    # Load individual results from JSONL files
    details = []
    for f in sorted(_EXPERIMENTS_DIR.glob(f"{run_id}_*.jsonl")):
        for line in f.read_text().strip().split("\n"):
            if line:
                details.append(json.loads(line))

    return {"summary": summary, "results": details}
