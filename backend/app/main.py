from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import ValidateRequest, ParseResult
from .parser_client import parse_sentence

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
