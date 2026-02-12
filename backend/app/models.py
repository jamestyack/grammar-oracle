from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field


class ValidateRequest(BaseModel):
    sentence: str = Field(..., min_length=1, description="Sentence to validate")
    language: str = Field(default="spanish", description="Grammar language")


class Token(BaseModel):
    word: str
    tag: str
    translation: str = ""


class ParseTreeNode(BaseModel):
    symbol: str
    children: list[ParseTreeNode] = []
    word: bool = False


class RuleApplied(BaseModel):
    number: int
    rule: str


class FailureInfo(BaseModel):
    index: int
    token: str
    expectedCategories: list[str] = []
    message: str


class ParseMetrics(BaseModel):
    statesExplored: int = 0
    statesGenerated: int = 0
    maxQueueSize: int = 0
    ruleExpansions: int = 0
    terminalAttempts: int = 0
    terminalSuccesses: int = 0
    parseTimeMs: float = 0.0


class ParseResult(BaseModel):
    valid: bool
    sentence: str
    tokens: list[Token] = []
    parseTree: Optional[ParseTreeNode] = None
    rulesApplied: List[RuleApplied] = []
    parses: int = 0
    ambiguous: bool = False
    failure: Optional[FailureInfo] = None
    error: Optional[str] = None
    metrics: Optional[ParseMetrics] = None


class VerifyLoopRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Natural language description of desired sentence")
    language: str = Field(default="spanish", description="Grammar language")
    max_retries: int = Field(default=3, ge=1, le=10, description="Maximum generation attempts")


class ClaudeMessage(BaseModel):
    role: str
    content: str


class VerifyAttempt(BaseModel):
    attempt_number: int
    sentence: str
    result: ParseResult
    constraint_feedback: Optional[str] = None
    system_prompt: str = ""
    claude_messages: List[ClaudeMessage] = []


class VerifyLoopResponse(BaseModel):
    prompt: str
    language: str
    attempts: List[VerifyAttempt]
    final_result: ParseResult
    success: bool
    total_attempts: int


class XRayRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Creative prompt for paragraph generation")
    language: str = Field(default="spanish", description="Grammar language")


class SentenceAnalysis(BaseModel):
    sentence: str
    original: str
    result: ParseResult
    in_grammar_scope: bool
    translation: str = ""


class XRayStats(BaseModel):
    total_sentences: int
    parsed_sentences: int
    coverage_percentage: float
    total_words: int
    known_words: int
    word_coverage_percentage: float
    rules_used: List[RuleApplied]
    unique_pos_tags: List[str]


class XRayResponse(BaseModel):
    prompt: str
    language: str
    generated_text: str
    system_prompt: str = ""
    user_message: str = ""
    sentences: List[SentenceAnalysis]
    stats: XRayStats


class GrammarStats(BaseModel):
    language: str
    grammar_rules: int
    lexicon_words: int
    pos_tags: List[str]
