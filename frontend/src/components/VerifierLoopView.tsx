"use client";

import { useState } from "react";
import { VerifyLoopResponse, ClaudeMessage } from "@/lib/api";
import TokenSpan from "./TokenSpan";
import FailureView from "./FailureView";
import ParseTreeView from "./ParseTreeView";
import RuleTrace from "./RuleTrace";

interface VerifierLoopViewProps {
  response: VerifyLoopResponse;
}

function StepLabel({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${color}`}
    >
      <span>{icon}</span>
      {label}
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: ClaudeMessage;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-blue-50 border border-blue-200 text-blue-900"
            : "bg-purple-50 border border-purple-200 text-purple-900"
        }`}
      >
        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
          isUser ? "text-blue-500" : "text-purple-500"
        }`}>
          {isUser ? "User" : "Claude"}
        </p>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

export default function VerifierLoopView({ response }: VerifierLoopViewProps) {
  const [expandedAttempt, setExpandedAttempt] = useState<number | null>(
    response.attempts.length - 1
  );
  const [showMessagesFor, setShowMessagesFor] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div
        className={`rounded-lg p-4 flex items-center justify-between ${
          response.success
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {response.success ? "\u2705" : "\u274C"}
          </span>
          <div>
            <p
              className={`font-semibold ${
                response.success ? "text-green-800" : "text-red-800"
              }`}
            >
              {response.success
                ? `Valid sentence generated${
                    response.total_attempts > 1
                      ? ` after ${response.total_attempts} attempts`
                      : " on first try"
                  }`
                : `Failed after ${response.total_attempts} attempts`}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              Prompt: &ldquo;{response.prompt}&rdquo;
            </p>
          </div>
        </div>
        {response.success && (
          <div className="text-right">
            <p className="text-lg font-semibold text-green-800">
              &ldquo;{response.final_result.sentence}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Attempt timeline */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Verifier Loop Journey
        </h3>

        <div className="space-y-3">
          {response.attempts.map((attempt, idx) => {
            const isSuccess = attempt.result.valid;
            const isExpanded = expandedAttempt === idx;
            const isLast = idx === response.attempts.length - 1;
            const showMessages = showMessagesFor === idx;

            return (
              <div key={attempt.attempt_number}>
                <div
                  className={`border rounded-lg overflow-hidden ${
                    isLast && isSuccess
                      ? "border-green-300"
                      : "border-gray-200"
                  }`}
                >
                  {/* Clickable header */}
                  <button
                    onClick={() =>
                      setExpandedAttempt(isExpanded ? null : idx)
                    }
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
                      isLast && isSuccess ? "bg-green-50" : "bg-gray-50"
                    } hover:bg-gray-100 transition-colors`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        isSuccess ? "bg-green-500" : "bg-red-400"
                      }`}
                    >
                      {attempt.attempt_number}
                    </span>

                    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                      <StepLabel
                        icon="🤖"
                        label="Claude"
                        color="bg-purple-100 text-purple-700"
                      />
                      <span className="text-gray-300">&rarr;</span>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        &ldquo;{attempt.sentence}&rdquo;
                      </span>
                      <span className="text-gray-300">&rarr;</span>
                      <StepLabel
                        icon="📐"
                        label="CFG Parser"
                        color="bg-blue-100 text-blue-700"
                      />
                      <span className="text-gray-300">&rarr;</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          isSuccess
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isSuccess ? "\u2713 Valid" : "\u2717 Invalid"}
                      </span>
                    </div>

                    <span className="text-gray-400 text-sm shrink-0">
                      {isExpanded ? "\u25B2" : "\u25BC"}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 space-y-4 bg-white">
                      {/* Full Claude Request toggle */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 text-sm">
                          🤖
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                              Claude Generated
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMessagesFor(showMessages ? null : idx);
                              }}
                              className="text-xs text-purple-500 hover:text-purple-700 underline"
                            >
                              {showMessages
                                ? "Hide full request"
                                : "Show full request"}
                            </button>
                          </div>
                          <p className="text-base font-medium text-gray-900">
                            &ldquo;{attempt.sentence}&rdquo;
                          </p>

                          {/* Full Claude messages panel */}
                          {showMessages && (
                            <div className="mt-3 border border-purple-200 rounded-lg overflow-hidden">
                              {/* System prompt */}
                              <div className="bg-slate-800 text-slate-200 p-3 text-xs">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                  System Prompt
                                </p>
                                <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                                  {attempt.system_prompt}
                                </pre>
                              </div>
                              {/* Messages */}
                              <div className="bg-gray-50 p-3 space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                                  Messages
                                </p>
                                {attempt.claude_messages.map((msg, msgIdx) => (
                                  <MessageBubble
                                    key={msgIdx}
                                    message={msg}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parser tokenized */}
                      {attempt.result.tokens.length > 0 && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-sm">
                            📐
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">
                              Parser Tokenized
                            </p>
                            <TokenSpan
                              tokens={attempt.result.tokens}
                              failure={attempt.result.failure}
                            />
                          </div>
                        </div>
                      )}

                      {/* Validation result */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${
                            isSuccess ? "bg-green-100" : "bg-red-100"
                          }`}
                        >
                          {isSuccess ? "\u2705" : "\u274C"}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                              isSuccess ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {isSuccess
                              ? "Validation Passed"
                              : "Validation Failed"}
                          </p>

                          {attempt.result.failure && (
                            <FailureView
                              failure={attempt.result.failure}
                              tokens={attempt.result.tokens}
                            />
                          )}

                          {attempt.result.parseTree && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <ParseTreeView
                                tree={attempt.result.parseTree}
                                tokens={attempt.result.tokens}
                              />
                            </div>
                          )}

                          {attempt.result.rulesApplied.length > 0 && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
                              <RuleTrace rules={attempt.result.rulesApplied} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Constraint feedback */}
                      {attempt.constraint_feedback && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-sm">
                            💬
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">
                              Constraint Feedback Sent to Claude
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 italic">
                              &ldquo;{attempt.constraint_feedback}&rdquo;
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow between attempts */}
                {!isLast && (
                  <div className="flex justify-center py-1">
                    <span className="text-gray-300 text-lg">&darr;</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
