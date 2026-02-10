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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
