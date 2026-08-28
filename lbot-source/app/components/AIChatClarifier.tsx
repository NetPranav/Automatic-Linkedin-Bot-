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
    <div className="w-full flex flex-col gap-5">
      {/* Header Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 shrink-0">
            <HelpCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold tracking-tight text-slate-900">
              AI Ghostwriter Interview
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Answer quick questions to sharpen hooks & metrics
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshQuestions}
          disabled={isLoading}
          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
          title="Regenerate Questions"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Progress Bar */}
      {questions.length > 0 && (
        <div className="px-5 py-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold text-slate-700">
            {answeredCount} of {questions.length} answered
          </span>
          <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-20 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-3.5 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-600 animate-spin" />
          <p className="text-[13px] font-semibold text-slate-600">
            Analyzing your notes for interview questions...
          </p>
        </div>
      ) : questions.length === 0 ? (
        <div className="py-14 px-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center flex flex-col items-center gap-4">
          <p className="text-[13px] text-slate-500 max-w-xs">
            Write your thoughts in the editor first, then click &quot;Ask AI to Refine&quot;.
          </p>
          <button
            onClick={onRefreshQuestions}
            className="px-5 py-3 rounded-xl text-[13px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
          >
            Generate Questions Now
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q, idx) => {
            const isAnswered = Boolean(q.selectedAnswer) || Boolean(q.customAnswer?.trim());

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isAnswered
                    ? "bg-indigo-50/40 border-indigo-200/80 shadow-xs"
                    : "bg-white border-slate-200/80 shadow-xs"
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start gap-3.5 mb-3.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5 ${
                    isAnswered
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {isAnswered ? <CheckIcon className="w-3.5 h-3.5" /> : idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-bold leading-snug text-slate-900 block">
                      {q.question}
                    </span>
                    {q.contextHint && (
                      <p className="text-[12px] text-slate-500 mt-1.5 flex items-center gap-1">
                        <span>💡</span> {q.contextHint}
                      </p>
                    )}
                  </div>
                </div>

                {/* Suggested Chips */}
                <div className="flex flex-wrap gap-2 ml-10 mb-3.5">
                  {q.suggestedAnswers.map((opt) => {
                    const isSelected = q.selectedAnswer === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => onAnswerChange(q.id, isSelected ? "" : opt, false)}
                        className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isSelected && <span className="mr-1">✓</span>}
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Input */}
                <div className="ml-10">
                  <input
                    type="text"
                    placeholder="Or type custom detail/metric..."
                    value={q.customAnswer || ""}
                    onChange={(e) => onAnswerChange(q.id, e.target.value, true)}
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] font-medium outline-none border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white transition-all"
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
            className="flex items-center justify-center gap-2.5 w-full py-4 px-5 rounded-2xl text-[14px] font-bold text-white shadow-lg shadow-indigo-200/60 bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer mt-3"
          >
            <SparklesIcon className="w-4 h-4" />
            Generate Post with Insights →
          </motion.button>
        </div>
      )}
    </div>
  );
}
