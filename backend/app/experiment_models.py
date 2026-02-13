"""Pydantic models for verifier loop experiment results."""

from typing import Dict, List, Optional
from pydantic import BaseModel
from .models import VerifyLoopResponse


class ExperimentResult(BaseModel):
    prompt: str
    template_id: str
    feedback_mode: str  # "structural" | "generic" | "none"
    response: VerifyLoopResponse
    elapsed_seconds: float
    failure_category: Optional[str] = None


class BaselineMetrics(BaseModel):
    feedback_mode: str
    total_prompts: int
    pass_at_1: float
    pass_at_k: float
    mean_retries_to_pass: float
    median_retries_to_pass: float
    mean_latency_seconds: float
    p95_latency_seconds: float
    failure_histogram: Dict[str, int]
    template_breakdown: Dict[str, Dict[str, float]]


class ExperimentSummary(BaseModel):
    run_id: str
    timestamp: str
    language: str
    max_retries: int
    total_prompts: int
    baselines: List[BaselineMetrics]
