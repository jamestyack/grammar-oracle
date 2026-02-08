import { RuleApplied } from "@/lib/api";

interface RuleTraceProps {
  rules: RuleApplied[];
}

export default function RuleTrace({ rules }: RuleTraceProps) {
  return (
    <ol className="space-y-1">
      {rules.map((rule, i) => (
        <li key={i} className="flex items-baseline gap-3 text-sm">
          <span className="text-gray-400 font-mono w-6 text-right shrink-0">
            {rule.number}.
          </span>
          <span className="font-mono text-gray-700">
            {rule.rule.replace("->", "\u2192")}
          </span>
        </li>
      ))}
    </ol>
  );
}
