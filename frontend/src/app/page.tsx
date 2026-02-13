"use client";

import { useState, useEffect } from "react";
import {
  ParseResult,
  VerifyLoopResponse,
  XRayResponse,
  GrammarStats,
  GrammarDetail,
  validateSentence,
  generateSentence,
  xrayText,
  fetchGrammarStats,
  fetchGrammarDetail,
} from "@/lib/api";
import TokenSpan from "@/components/TokenSpan";
import ParseTreeView from "@/components/ParseTreeView";
import RuleTrace from "@/components/RuleTrace";
import FailureView from "@/components/FailureView";
import VerifierLoopView from "@/components/VerifierLoopView";
import XRayView from "@/components/XRayView";
import GrammarLexiconView from "@/components/GrammarLexiconView";

const SAMPLE_CATEGORIES = [
  {
    label: "Simple",
    sentences: [
      "el perro es grande",
      "la gata es bonita",
      "hay un gato",
      "hay perro",
      "el niño corre",
    ],
  },
  {
    label: "Transitive",
    sentences: [
      "la mujer come la manzana",
      "el niño lee un libro",
      "el hombre compra el pan",
      "la profesora escribe una carta",
    ],
  },
  {
    label: "Prepositional",
    sentences: [
      "el gato está en la casa",
      "el niño corre en el parque",
      "el libro de la mujer es bueno",
      "el perro grande de la casa es bonito",
    ],
  },
  {
    label: "Adverbs & Negation",
    sentences: [
      "el perro es muy grande",
      "el perro no es malo",
      "el niño come bien",
      "la mujer siempre corre",
    ],
  },
  {
    label: "Invalid",
    sentences: ["grande perro", "corre el", "el niño lee libro"],
  },
];

const ALL_VALID_SENTENCES = SAMPLE_CATEGORIES
  .filter((c) => c.label !== "Invalid")
  .flatMap((c) => c.sentences);

const SAMPLE_PROMPTS = [
  "a sentence about a big dog",
  "a sentence saying there is a cat in the house",
  "a sentence about a woman who eats an apple",
  "a sentence about a boy running in the park",
  "a sentence using negation",
  "a sentence with an adverb",
];

const XRAY_PROMPTS = [
  "a short story about a boy and his dog",
  "describe a day at the beach",
  "a family going to the park",
  "describe the weather in a small town",
  "a cat who lives in a big house",
  "a recipe for a simple meal",
];

export default function Home() {
  const [mode, setMode] = useState<"validate" | "generate" | "xray" | "grammar">("validate");
  const [sentence, setSentence] = useState("");
  const [language, setLanguage] = useState("spanish");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate mode state
  const [prompt, setPrompt] = useState("");
  const [generateResult, setGenerateResult] =
    useState<VerifyLoopResponse | null>(null);

  // X-Ray mode state
  const [xrayPrompt, setXrayPrompt] = useState("");
  const [xrayResult, setXrayResult] = useState<XRayResponse | null>(null);

  // Grammar stats (loaded once)
  const [grammarStats, setGrammarStats] = useState<GrammarStats | null>(null);

  // Grammar detail (loaded when grammar tab is selected)
  const [grammarDetail, setGrammarDetail] = useState<GrammarDetail | null>(null);
  const [grammarDetailLoading, setGrammarDetailLoading] = useState(false);

  useEffect(() => {
    fetchGrammarStats(language).then(setGrammarStats).catch(() => {});
  }, [language]);

  useEffect(() => {
    if (mode === "grammar" && !grammarDetail) {
      setGrammarDetailLoading(true);
      fetchGrammarDetail(language)
        .then(setGrammarDetail)
        .catch(() => {})
        .finally(() => setGrammarDetailLoading(false));
    }
  }, [mode, language, grammarDetail]);

  async function handleValidateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sentence.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await validateSentence(sentence, language);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setGenerateResult(null);

    try {
      const data = await generateSentence(prompt, language);
      setGenerateResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSample(s: string) {
    setSentence(s);
  }

  function handleFeelingLucky() {
    const pick =
      ALL_VALID_SENTENCES[
        Math.floor(Math.random() * ALL_VALID_SENTENCES.length)
      ];
    setSentence(pick);
  }

  function handleSamplePrompt(p: string) {
    setPrompt(p);
  }

  async function handleXRaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!xrayPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setXrayResult(null);

    try {
      const data = await xrayText(xrayPrompt, language);
      setXrayResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleXRayPrompt(p: string) {
    setXrayPrompt(p);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Grammar Oracle</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deterministic CFG validation with structural explainability
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1.5">
          <button
            onClick={() => setMode("validate")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-left transition-colors ${
              mode === "validate"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="block text-sm font-semibold">Parse Sentence</span>
            <span className="block text-[11px] mt-0.5 opacity-60">
              Test a sentence against the CFG
            </span>
          </button>
          <button
            onClick={() => setMode("generate")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-left transition-colors ${
              mode === "generate"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="block text-sm font-semibold">LLM + Verify</span>
            <span className="block text-[11px] mt-0.5 opacity-60">
              AI generates, grammar verifies
            </span>
          </button>
          <button
            onClick={() => setMode("xray")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-left transition-colors ${
              mode === "xray"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="block text-sm font-semibold">Grammar X-Ray</span>
            <span className="block text-[11px] mt-0.5 opacity-60">
              AI writes, CFG analyzes every word
            </span>
          </button>
          <button
            onClick={() => setMode("grammar")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-left transition-colors ${
              mode === "grammar"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="block text-sm font-semibold">Grammar & Lexicon</span>
            <span className="block text-[11px] mt-0.5 opacity-60">
              Explore rules and vocabulary
            </span>
          </button>
        </div>

        {/* === VALIDATE MODE === */}
        {mode === "validate" && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
              <p>
                <strong>Parse Sentence</strong> tests any Spanish sentence against a formal Context-Free Grammar (CFG) using a deterministic parser.
                {grammarStats && <> The grammar currently has <strong>{grammarStats.grammar_rules} rules</strong> and a lexicon of <strong>{grammarStats.lexicon_words} words</strong>.</>}
              </p>
              <p className="text-blue-600">
                Sentences outside the grammar&apos;s scope will be rejected — this is expected behavior, not a bug. The parser validates structure, not meaning.
              </p>
              <p className="text-blue-500 text-xs">
                Questions or feedback? <a href="https://medium.com/@jamestyack/i-found-my-2004-ai-thesis-in-a-drawer-it-explains-todays-ai-problem-68f370a23427" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">Join the discussion</a>
              </p>
            </div>
            <form onSubmit={handleValidateSubmit} className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  placeholder='Enter a sentence, e.g. "el perro es grande"'
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="spanish">Spanish</option>
                </select>
                <button
                  type="submit"
                  disabled={loading || !sentence.trim()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Validating..." : "Validate"}
                </button>
              </div>

              <div className="space-y-2">
                {SAMPLE_CATEGORIES.map((cat) => (
                  <div
                    key={cat.label}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="text-xs text-gray-400 py-1 w-24 shrink-0">
                      {cat.label}:
                    </span>
                    {cat.sentences.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSample(s)}
                        className={`px-2.5 py-1 text-xs rounded hover:bg-gray-200 transition-colors ${
                          cat.label === "Invalid"
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleFeelingLucky}
                    className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                  >
                    I&apos;m feeling lucky
                  </button>
                </div>
              </div>
            </form>

            {result && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      result.valid
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <span>{result.valid ? "\u2713" : "\u2717"}</span>
                    {result.valid ? "Valid" : "Invalid"}
                  </span>
                  {result.parses > 0 && (
                    <span className="text-sm text-gray-500">
                      {result.parses} parse{result.parses !== 1 ? "s" : ""}{" "}
                      found
                      {result.ambiguous && " (ambiguous)"}
                    </span>
                  )}
                </div>

                {result.error && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    {result.error}
                  </div>
                )}

                {result.tokens.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Tokens
                    </h2>
                    <TokenSpan
                      tokens={result.tokens}
                      failure={result.failure}
                    />
                  </section>
                )}

                {result.failure && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Failure Diagnostics
                    </h2>
                    <FailureView
                      failure={result.failure}
                      tokens={result.tokens}
                    />
                  </section>
                )}

                {result.parseTree && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Parse Tree
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <ParseTreeView
                        tree={result.parseTree}
                        tokens={result.tokens}
                      />
                    </div>
                  </section>
                )}

                {result.rulesApplied.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Rule Trace
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <RuleTrace rules={result.rulesApplied} />
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {/* === GENERATE MODE === */}
        {mode === "generate" && (
          <>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800 space-y-1">
              <p>
                <strong>LLM + Verify</strong> asks Claude to generate a Spanish sentence from your prompt, then the CFG parser validates it.
                If validation fails, the parser&apos;s error feedback is sent back to Claude for retry — demonstrating neuro-symbolic correction.
                {grammarStats && <> Claude is constrained to work within the grammar&apos;s <strong>{grammarStats.grammar_rules} rules</strong> and <strong>{grammarStats.lexicon_words}-word</strong> vocabulary.</>}
              </p>
              <p className="text-purple-600">
                The LLM is guided by grammar rules but may still produce sentences outside scope. Up to 3 retry attempts are made automatically.
              </p>
              <p className="text-purple-500 text-xs">
                Questions or feedback? <a href="https://medium.com/@jamestyack/i-found-my-2004-ai-thesis-in-a-drawer-it-explains-todays-ai-problem-68f370a23427" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-700">Join the discussion</a>
              </p>
            </div>
            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Describe a sentence, e.g. "a sentence about a big dog"'
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="spanish">Spanish</option>
                </select>
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Generating..." : "Generate"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 py-1">Try:</span>
                {SAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSamplePrompt(p)}
                    className="px-2.5 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="text-sm text-gray-500 animate-pulse">
                  Generating and validating... this may take a few seconds
                </div>
              )}
            </form>

            {generateResult && (
              <VerifierLoopView response={generateResult} />
            )}
          </>
        )}

        {/* === X-RAY MODE === */}
        {mode === "xray" && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 space-y-1">
              <p>
                <strong>Grammar X-Ray</strong> asks Claude to write a natural Spanish paragraph (unconstrained by grammar rules), then the CFG parser X-rays every sentence — color-coding each word by part of speech and revealing which structures it can formally validate.
                {grammarStats && <> Coverage depends on the grammar&apos;s <strong>{grammarStats.grammar_rules} rules</strong> and <strong>{grammarStats.lexicon_words}-word</strong> lexicon.</>}
              </p>
              <p className="text-emerald-600">
                Sentences outside scope get a &quot;not in grammar scope&quot; label — this shows the boundaries of the formal grammar, which is part of the insight. Click any sentence to expand its parse tree and parser metrics.
              </p>
              <p className="text-emerald-500 text-xs">
                Questions or feedback? <a href="https://medium.com/@jamestyack/i-found-my-2004-ai-thesis-in-a-drawer-it-explains-todays-ai-problem-68f370a23427" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-700">Join the discussion</a>
              </p>
            </div>
            <form onSubmit={handleXRaySubmit} className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={xrayPrompt}
                  onChange={(e) => setXrayPrompt(e.target.value)}
                  placeholder='Describe a topic, e.g. "a short story about a boy and his dog"'
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="spanish">Spanish</option>
                </select>
                <button
                  type="submit"
                  disabled={loading || !xrayPrompt.trim()}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Analyzing..." : "X-Ray"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 py-1">Try:</span>
                {XRAY_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleXRayPrompt(p)}
                    className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="text-sm text-gray-500 animate-pulse">
                  Generating paragraph and analyzing grammar... this may take a
                  few seconds
                </div>
              )}
            </form>

            {xrayResult && <XRayView response={xrayResult} />}
          </>
        )}

        {/* === GRAMMAR MODE === */}
        {mode === "grammar" && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
              <p>
                <strong>Grammar & Lexicon</strong> shows the complete set of rules and vocabulary that the CFG parser uses to validate sentences.
                {grammarStats && <> Currently: <strong>{grammarStats.grammar_rules} grammar rules</strong> and a <strong>{grammarStats.lexicon_words}-word</strong> lexicon across <strong>{grammarStats.pos_tags.length} POS tag categories</strong>.</>}
              </p>
              <p className="text-amber-600">
                Grammar rules define valid sentence structures (e.g. &quot;a sentence is a noun phrase followed by a verb phrase&quot;). The lexicon maps every known Spanish word to its part of speech and English translation.
              </p>
              <p className="text-amber-500 text-xs">
                Questions or feedback? <a href="https://medium.com/@jamestyack/i-found-my-2004-ai-thesis-in-a-drawer-it-explains-todays-ai-problem-68f370a23427" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-700">Join the discussion</a>
              </p>
            </div>

            {grammarDetailLoading && (
              <div className="text-sm text-gray-500 animate-pulse">
                Loading grammar and lexicon data...
              </div>
            )}

            {grammarDetail && <GrammarLexiconView detail={grammarDetail} />}
          </>
        )}

        {/* Error (shared) */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
