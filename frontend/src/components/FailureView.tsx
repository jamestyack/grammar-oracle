import { FailureInfo, Token } from "@/lib/api";

const TAG_NAMES: Record<string, string> = {
  DET: "a determiner (e.g. el, la, un, una)",
  N: "a noun",
  V: "a verb",
  V_COP: "a copular verb (e.g. es, está)",
  V_EX: "an existential verb (e.g. hay)",
  A: "an adjective",
  ADV: "an adverb",
  NEG: "a negation (no)",
  PREP: "a preposition",
  CONJ: "a conjunction",
  PRON: "a pronoun",
};

function describeExpected(categories: string[]): string {
  const descriptions = categories.map(
    (cat) => TAG_NAMES[cat] || cat.toLowerCase()
  );
  if (descriptions.length === 1) return descriptions[0];
  if (descriptions.length === 2)
    return `${descriptions[0]} or ${descriptions[1]}`;
  return (
    descriptions.slice(0, -1).join(", ") +
    ", or " +
    descriptions[descriptions.length - 1]
  );
}

function describeActual(token: string, tokens: Token[]): string | null {
  const found = tokens.find((t) => t.word === token);
  if (!found) return null;
  const name = TAG_NAMES[found.tag];
  return name
    ? `"${token}" is ${name}`
    : `"${token}" is tagged as ${found.tag}`;
}

function buildExplanation(
  failure: FailureInfo,
  tokens: Token[]
): string | null {
  if (failure.expectedCategories.length === 0) return null;

  const expected = describeExpected(failure.expectedCategories);
  const actual = describeActual(failure.token, tokens);

  const parts: string[] = [];
  parts.push(
    `The grammar expected ${expected} at position ${failure.index}`
  );

  if (actual) {
    parts[0] += `, but ${actual}.`;
  } else {
    parts[0] += `.`;
  }

  // Suggest a fix for common cases
  if (
    failure.expectedCategories.includes("DET") &&
    tokens.find((t) => t.word === failure.token)?.tag === "N"
  ) {
    parts.push(
      `Tip: Try adding a determiner before "${failure.token}" (e.g. "el ${failure.token}" or "un ${failure.token}").`
    );
  } else if (
    failure.expectedCategories.includes("DET") &&
    tokens.find((t) => t.word === failure.token)?.tag === "A"
  ) {
    parts.push(
      `Tip: Sentences in this grammar must start with a determiner or existential verb, not an adjective.`
    );
  }

  return parts.join(" ");
}

interface FailureViewProps {
  failure: FailureInfo;
  tokens: Token[];
}

export default function FailureView({ failure, tokens }: FailureViewProps) {
  const explanation = buildExplanation(failure, tokens);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-red-500 text-lg">&#x2717;</span>
        <span className="font-semibold text-red-800">Parse Failed</span>
      </div>

      {explanation && (
        <p className="text-sm text-red-800 leading-relaxed">{explanation}</p>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Position:</span>{" "}
          <span className="font-mono text-red-800">{failure.index}</span>
        </div>
        <div>
          <span className="text-gray-500">Token:</span>{" "}
          <span className="font-mono text-red-800">
            &quot;{failure.token}&quot;
          </span>
        </div>
      </div>

      {failure.expectedCategories.length > 0 && (
        <div>
          <span className="text-sm text-gray-500">Expected:</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {failure.expectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-mono rounded"
              >
                {cat}
                {TAG_NAMES[cat] && (
                  <span className="text-red-400 font-sans ml-1">
                    ({TAG_NAMES[cat].replace(/^an? /, "")})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
