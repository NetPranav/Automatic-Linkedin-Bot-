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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 sm:p-7 rounded-3xl relative overflow-hidden transition-all duration-300"
    >
      {/* Luminous Top Accent Glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent" />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)] mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
            isLightMode
              ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/25"
              : "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-indigo-500/10"
          }`}>
            <HelpCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                AI Ghostwriter Interview
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isLightMode ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
              }`}>
                Context Booster
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Answer 1–3 quick details to turn raw notes into a viral, high-converting post
            </p>
          </div>
        </div>

        {/* Action Controls & Progress */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefreshQuestions}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isLightMode
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border-white/[0.08]"
            }`}
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
            Refresh
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)]">
            <div className="w-12 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3.5 text-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <SparklesIcon className="w-4 h-4 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Analyzing your notes to craft targeted interview questions...
          </p>
        </div>
      ) : questions.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center gap-2">
          <p className="text-xs text-[var(--text-tertiary)]">
            Write your thoughts in the editor first, then click &quot;Ask AI to Clarify & Interview&quot;.
          </p>
          <button
            onClick={onRefreshQuestions}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            Generate Questions Now
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3.5">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(q.selectedAnswer) || Boolean(q.customAnswer?.trim());

              return (
                <motion.div
                  key={q.id}
                  layout
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                    isAnswered
                      ? isLightMode
                        ? "bg-indigo-50/50 border-indigo-200/90 shadow-sm"
                        : "bg-indigo-950/20 border-indigo-500/30 shadow-lg shadow-indigo-950/20"
                      : isLightMode
                        ? "bg-white border-slate-200 shadow-sm hover:border-indigo-300"
                        : "bg-white/[0.02] border-white/[0.07] hover:border-white/[0.14]"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform ${
                      isAnswered
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                        : isLightMode
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-white/10 text-white/80 border border-white/10"
                    }`}>
                      {isAnswered ? <CheckIcon className="w-3.5 h-3.5" /> : idx + 1}
                    </span>

                    <div className="flex-1">
                      <span className="text-[13.5px] sm:text-sm font-semibold leading-snug text-[var(--text-primary)] block">
                        {q.question}
                      </span>
                      {q.contextHint && (
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
                          <span>💡</span> {q.contextHint}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Suggested Answer Chips */}
                  <div className="flex flex-wrap gap-1.5 ml-9 mb-3 mt-1">
                    {q.suggestedAnswers.map((opt) => {
                      const isSelected = q.selectedAnswer === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => onAnswerChange(q.id, isSelected ? "" : opt, false)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                              : isLightMode
                                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300"
                                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/75 border border-white/[0.08] hover:border-white/20"
                          }`}
                        >
                          {isSelected && <span className="mr-1.5 text-xs font-bold">✓</span>}
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Answer Input */}
                  <div className="ml-9">
                    <input
                      type="text"
                      placeholder="Or type a custom detail/number..."
                      value={q.customAnswer || ""}
                      onChange={(e) => onAnswerChange(q.id, e.target.value, true)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none border transition-all ${
                        isLightMode
                          ? "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500"
                          : "bg-black/40 border-white/[0.08] text-white placeholder-white/25 focus:border-indigo-500/60"
                      }`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Master Generation Trigger */}
          <div className="flex justify-end pt-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onApplyAndGenerate}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white shadow-xl shadow-indigo-600/25 bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 transition-all cursor-pointer"
            >
              <SparklesIcon className="w-4 h-4" />
              Generate Post with Answered Details →
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
