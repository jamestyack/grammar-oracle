from dotenv import load_dotenv
load_dotenv()

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import ValidateRequest, ParseResult, VerifyLoopRequest, VerifyLoopResponse, XRayRequest, XRayResponse, GrammarStats, GrammarDetail
from .parser_client import parse_sentence
from .verifier_loop import run_verify_loop
from .xray import run_xray
from .grammar_stats import get_grammar_stats, get_grammar_detail

_EXPERIMENTS_DIR = Path(__file__).resolve().parent.parent.parent / "experiments" / "verifier_loop" / "results"

app = FastAPI(
    title="Grammar Oracle API",
    description="CFG validation API for Grammar Oracle",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
def verify_loop(request: VerifyLoopRequest):
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
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats", response_model=GrammarStats)
def stats(language: str = "spanish"):
    try:
        return get_grammar_stats(language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/grammar-detail", response_model=GrammarDetail)
def grammar_detail(language: str = "spanish"):
    try:
        return get_grammar_detail(language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/xray", response_model=XRayResponse)
def xray(request: XRayRequest):
    try:
        return run_xray(prompt=request.prompt, language=request.language)
    except Exception as e:
        msg = str(e).lower()
        if "api key" in msg or "authentication" in msg or "api_key" in msg:
            raise HTTPException(status_code=503, detail="LLM service not configured. Set ANTHROPIC_API_KEY.")
        raise HTTPException(status_code=500, detail=str(e))


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
    if not _EXPERIMENTS_DIR.exists():
        raise HTTPException(status_code=404, detail="No experiments directory")

    summary_file = _EXPERIMENTS_DIR / f"{run_id}_summary.json"
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
