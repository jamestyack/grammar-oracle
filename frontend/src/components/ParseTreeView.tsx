"use client";

import { ParseTreeNode, Token } from "@/lib/api";
import { useState, useMemo } from "react";

interface ParseTreeViewProps {
  tree: ParseTreeNode;
  tokens: Token[];
}

interface AnnotatedNode {
  symbol: string;
  children: AnnotatedNode[];
  isLeaf: boolean;
  matchedWord: string | null;
  matchedTranslation: string | null;
}

function annotateTree(
  node: ParseTreeNode,
  tokens: Token[],
  tokenIndex: { current: number }
): AnnotatedNode {
  const isLeaf = !!node.word;

  let matchedWord: string | null = null;
  let matchedTranslation: string | null = null;

  if (isLeaf && tokenIndex.current < tokens.length) {
    const tok = tokens[tokenIndex.current++];
    matchedWord = tok.word;
    matchedTranslation = tok.translation || null;
  }

  const children = (node.children || []).map((child) =>
    annotateTree(child, tokens, tokenIndex)
  );

  return { symbol: node.symbol, children, isLeaf, matchedWord, matchedTranslation };
}

function TreeNode({
  node,
  depth,
}: {
  node: AnnotatedNode;
  depth: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-gray-200 pl-3" : ""}>
      <div className="flex items-center gap-2 py-1">
        {hasChildren && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs font-mono"
          >
            {collapsed ? "+" : "\u2212"}
          </button>
        )}
        {!hasChildren && !node.isLeaf && (
          <span className="w-5 h-5 inline-block" />
        )}

        <span
          className={`inline-block px-2 py-0.5 rounded text-sm font-mono ${
            node.isLeaf
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-700 font-semibold"
          }`}
        >
          {node.symbol}
        </span>

        {node.matchedWord && (
          <span className="text-sm text-gray-600">
            &quot;{node.matchedWord}&quot;
            {node.matchedTranslation && (
              <span className="text-gray-400 ml-1">
                [{node.matchedTranslation}]
              </span>
            )}
          </span>
        )}
      </div>

      {hasChildren && !collapsed && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParseTreeView({ tree, tokens }: ParseTreeViewProps) {
  const annotated = useMemo(
    () => annotateTree(tree, tokens, { current: 0 }),
    [tree, tokens]
  );

  return (
    <div className="font-mono text-sm">
      <TreeNode node={annotated} depth={0} />
    </div>
  );
}
