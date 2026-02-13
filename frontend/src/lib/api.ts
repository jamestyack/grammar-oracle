export interface Token {
  word: string;
  tag: string;
  translation: string;
}

export interface ParseTreeNode {
  symbol: string;
  children?: ParseTreeNode[];
  word?: boolean;
}

export interface RuleApplied {
  number: number;
  rule: string;
}

export interface FailureInfo {
  index: number;
  token: string;
  expectedCategories: string[];
  message: string;
}

export interface ParseMetrics {
  statesExplored: number;
  statesGenerated: number;
  maxQueueSize: number;
  ruleExpansions: number;
  terminalAttempts: number;
  terminalSuccesses: number;
  parseTimeMs: number;
}

export interface ParseResult {
  valid: boolean;
  sentence: string;
  tokens: Token[];
  parseTree: ParseTreeNode | null;
  rulesApplied: RuleApplied[];
  parses: number;
  ambiguous: boolean;
  failure: FailureInfo | null;
  error: string | null;
  metrics: ParseMetrics | null;
}

export interface ClaudeMessage {
  role: string;
  content: string;
}

export interface VerifyAttempt {
  attempt_number: number;
  sentence: string;
  result: ParseResult;
  constraint_feedback: string | null;
  system_prompt: string;
  claude_messages: ClaudeMessage[];
}

export interface VerifyLoopResponse {
  prompt: string;
  language: string;
  attempts: VerifyAttempt[];
  final_result: ParseResult;
  success: boolean;
  total_attempts: number;
}

export interface SentenceAnalysis {
  sentence: string;
  original: string;
  result: ParseResult;
  in_grammar_scope: boolean;
  translation: string;
}

export interface XRayStats {
  total_sentences: number;
  parsed_sentences: number;
  coverage_percentage: number;
  total_words: number;
  known_words: number;
  word_coverage_percentage: number;
  rules_used: RuleApplied[];
  unique_pos_tags: string[];
}

export interface XRayResponse {
  prompt: string;
  language: string;
  generated_text: string;
  system_prompt: string;
  user_message: string;
  sentences: SentenceAnalysis[];
  stats: XRayStats;
}

export interface GrammarStats {
  language: string;
  grammar_rules: number;
  lexicon_words: number;
  pos_tags: string[];
}

export interface GrammarRule {
  number: number;
  lhs: string;
  rhs: string[];
  comment: string;
}

export interface LexiconEntry {
  word: string;
  tag: string;
  translation: string;
}

export interface GrammarDetail {
  language: string;
  grammar_rules: GrammarRule[];
  lexicon_entries: LexiconEntry[];
  pos_tags: string[];
}

// --- Experiment types ---

export interface BaselineMetrics {
  feedback_mode: string;
  total_prompts: number;
  pass_at_1: number;
  pass_at_k: number;
  mean_retries_to_pass: number;
  median_retries_to_pass: number;
  mean_latency_seconds: number;
  p95_latency_seconds: number;
  failure_histogram: Record<string, number>;
  template_breakdown: Record<string, { pass_at_1: number; pass_at_k: number; total?: number }>;
}

export interface ExperimentSummary {
  run_id: string;
  timestamp: string;
  language: string;
  max_retries: number;
  total_prompts: number;
  baselines: BaselineMetrics[];
}

export interface ExperimentResult {
  prompt: string;
  template_id: string;
  feedback_mode: string;
  response: VerifyLoopResponse;
  elapsed_seconds: number;
  failure_category: string | null;
}

export interface ExperimentDetail {
  summary: ExperimentSummary;
  results: ExperimentResult[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchGrammarDetail(
  language: string = "spanish"
): Promise<GrammarDetail> {
  const response = await fetch(
    `${API_BASE}/grammar-detail?language=${encodeURIComponent(language)}`
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchGrammarStats(
  language: string = "spanish"
): Promise<GrammarStats> {
  const response = await fetch(
    `${API_BASE}/stats?language=${encodeURIComponent(language)}`
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function validateSentence(
  sentence: string,
  language: string = "spanish"
): Promise<ParseResult> {
  const response = await fetch(`${API_BASE}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentence, language }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function generateSentence(
  prompt: string,
  language: string = "spanish",
  max_retries: number = 3
): Promise<VerifyLoopResponse> {
  const response = await fetch(`${API_BASE}/verify-loop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, language, max_retries }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API error: ${response.status}`);
  }

  return response.json();
}

export async function xrayText(
  prompt: string,
  language: string = "spanish"
): Promise<XRayResponse> {
  const response = await fetch(`${API_BASE}/xray`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, language }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchExperimentResults(): Promise<ExperimentSummary[]> {
  const response = await fetch(`${API_BASE}/experiment-results`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function fetchExperimentDetail(
  runId: string
): Promise<ExperimentDetail> {
  const response = await fetch(
    `${API_BASE}/experiment-results/${encodeURIComponent(runId)}`
  );
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
