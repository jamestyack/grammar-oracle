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
