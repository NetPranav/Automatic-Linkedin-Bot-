"use client";

import React from "react";
import { motion } from "framer-motion";
import { ClarificationQuestion } from "../lib/types";
import { SparklesIcon, CheckIcon, HelpCircleIcon, RefreshCwIcon } from "./Icons";

interface Props {
  questions: ClarificationQuestion[];
  isLoading: boolean;
  onAnswerChange: (questionId: string, answer: string, isCustom?: boolean) => void;
  onRefreshQuestions: () => void;
  onApplyAndGenerate: () => void;
  isLightMode: boolean;
}

export default function AIChatClarifier({
  questions,
  isLoading,
  onAnswerChange,
  onRefreshQuestions,
  onApplyAndGenerate,
  isLightMode,
}: Props) {
  const answeredCount = questions.filter(
    (q) => Boolean(q.selectedAnswer) || Boolean(q.customAnswer?.trim())
  ).length;

  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
            isLightMode
              ? "bg-indigo-600 text-white"
              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
          }`}>
            <HelpCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              AI Ghostwriter Interview
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Answer 1–3 quick questions to sharpen hooks & quantifiable metrics
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshQuestions}
          disabled={isLoading}
          className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shrink-0"
          title="Regenerate Questions"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
        </button>
      </div>

      {/* Progress Bar */}
      {questions.length > 0 && (
        <div className="glass-panel px-4 py-2.5 rounded-xl flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Progress: {answeredCount} of {questions.length} answered
          </span>
          <div className="w-24 sm:w-36 h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="glass-panel py-16 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Analyzing your notes to craft targeted interview questions...
          </p>
        </div>
      ) : questions.length === 0 ? (
        <div className="glass-panel py-12 px-4 rounded-2xl text-center flex flex-col items-center gap-3">
          <p className="text-xs text-[var(--text-tertiary)] max-w-xs">
            Write your thoughts in the Create tab first, then click &quot;Ask AI to Clarify & Interview&quot;.
          </p>
          <button
            onClick={onRefreshQuestions}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
          >
            Generate Questions Now
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {questions.map((q, idx) => {
            const isAnswered = Boolean(q.selectedAnswer) || Boolean(q.customAnswer?.trim());

            return (
              <div
                key={q.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isAnswered
                    ? isLightMode
                      ? "bg-indigo-50/50 border-indigo-200/90 shadow-sm"
                      : "bg-indigo-950/20 border-indigo-500/30 shadow-md"
                    : isLightMode
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-white/[0.02] border-white/[0.08]"
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start gap-3 mb-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isAnswered
                      ? "bg-emerald-500 text-white"
                      : isLightMode
                        ? "bg-slate-100 text-slate-700"
                        : "bg-white/10 text-white/80"
                  }`}>
                    {isAnswered ? <CheckIcon className="w-3.5 h-3.5" /> : idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-bold leading-snug text-[var(--text-primary)] block">
                      {q.question}
                    </span>
                    {q.contextHint && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
                        <span>💡</span> {q.contextHint}
                      </p>
                    )}
                  </div>
                </div>

                {/* Suggested Chips */}
                <div className="flex flex-wrap gap-1.5 ml-9 mb-3">
                  {q.suggestedAnswers.map((opt) => {
                    const isSelected = q.selectedAnswer === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => onAnswerChange(q.id, isSelected ? "" : opt, false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : isLightMode
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-white/[0.05] hover:bg-white/[0.1] text-white/80 border border-white/[0.08]"
                        }`}
                      >
                        {isSelected && <span className="mr-1">✓</span>}
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Input */}
                <div className="ml-9">
                  <input
                    type="text"
                    placeholder="Or type custom detail/number..."
                    value={q.customAnswer || ""}
                    onChange={(e) => onAnswerChange(q.id, e.target.value, true)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs outline-none border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            );
          })}

          {/* Generate Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onApplyAndGenerate}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-2xl text-xs font-bold text-white shadow-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 transition-all cursor-pointer mt-2"
          >
            <SparklesIcon className="w-4 h-4" />
            Generate Post with Answered Details →
          </motion.button>
        </div>
      )}
    </div>
  );
}
