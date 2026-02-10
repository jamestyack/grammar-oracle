"use client";

import { useState } from "react";
import {
  ParseResult,
  VerifyLoopResponse,
  validateSentence,
  generateSentence,
} from "@/lib/api";
import TokenSpan from "@/components/TokenSpan";
import ParseTreeView from "@/components/ParseTreeView";
import RuleTrace from "@/components/RuleTrace";
import FailureView from "@/components/FailureView";
import VerifierLoopView from "@/components/VerifierLoopView";

const SAMPLE_CATEGORIES = [
  {
    label: "Simple",
    sentences: [
      "el perro es grande",
      "la gata es bonita",
      "hay un gato",
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
    sentences: ["grande perro", "el niño lee libro", "corre el"],
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

export default function Home() {
  const [mode, setMode] = useState<"validate" | "generate">("validate");
  const [sentence, setSentence] = useState("");
  const [language, setLanguage] = useState("spanish");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate mode state
  const [prompt, setPrompt] = useState("");
  const [generateResult, setGenerateResult] =
    useState<VerifyLoopResponse | null>(null);

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
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setMode("validate")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "validate"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Validate
          </button>
          <button
            onClick={() => setMode("generate")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "generate"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Generate
          </button>
        </div>

        {/* === VALIDATE MODE === */}
        {mode === "validate" && (
          <>
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
