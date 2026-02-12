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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
