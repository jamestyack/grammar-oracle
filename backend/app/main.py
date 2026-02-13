from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import ValidateRequest, ParseResult, VerifyLoopRequest, VerifyLoopResponse, XRayRequest, XRayResponse, GrammarStats, GrammarDetail
from .parser_client import parse_sentence
from .verifier_loop import run_verify_loop
from .xray import run_xray
from .grammar_stats import get_grammar_stats, get_grammar_detail

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
