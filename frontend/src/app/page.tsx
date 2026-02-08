"use client";

import { useState } from "react";
import { ParseResult, validateSentence } from "@/lib/api";
import TokenSpan from "@/components/TokenSpan";
import ParseTreeView from "@/components/ParseTreeView";
import RuleTrace from "@/components/RuleTrace";
import FailureView from "@/components/FailureView";

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
    sentences: [
      "grande perro",
      "el niño lee libro",
      "corre el",
    ],
  },
];

const ALL_VALID_SENTENCES = SAMPLE_CATEGORIES
  .filter((c) => c.label !== "Invalid")
  .flatMap((c) => c.sentences);

export default function Home() {
  const [sentence, setSentence] = useState("");
  const [language, setLanguage] = useState("spanish");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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

  function handleSample(s: string) {
    setSentence(s);
  }

  function handleFeelingLucky() {
    const pick = ALL_VALID_SENTENCES[Math.floor(Math.random() * ALL_VALID_SENTENCES.length)];
    setSentence(pick);
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
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Sample sentences by category */}
          <div className="space-y-2">
            {SAMPLE_CATEGORIES.map((cat) => (
              <div key={cat.label} className="flex flex-wrap items-center gap-2">
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

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Status Badge */}
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
                  {result.parses} parse{result.parses !== 1 ? "s" : ""} found
                  {result.ambiguous && " (ambiguous)"}
                </span>
              )}
            </div>

            {/* Backend error */}
            {result.error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                {result.error}
              </div>
            )}

            {/* Tokens */}
            {result.tokens.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Tokens
                </h2>
                <TokenSpan tokens={result.tokens} failure={result.failure} />
              </section>
            )}

            {/* Failure */}
            {result.failure && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Failure Diagnostics
                </h2>
                <FailureView failure={result.failure} tokens={result.tokens} />
              </section>
            )}

            {/* Parse Tree */}
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

            {/* Rule Trace */}
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
      </main>
    </div>
  );
}
