"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [activeTab, setActiveTab] = useState<string>(questions[0]?.id || "q1");

  const answeredCount = questions.filter(
    (q) => Boolean(q.selectedAnswer) || Boolean(q.customAnswer?.trim())
  ).length;

  return (
    <div className={`p-4 md:p-6 rounded-2xl border transition-all duration-300 ${
      isLightMode
        ? "bg-white/80 border-slate-200/80 shadow-sm backdrop-blur-md"
        : "bg-[#0d0e14]/80 border-white/[0.08] shadow-2xl backdrop-blur-xl"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-inherit">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isLightMode ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/10 text-indigo-400"
          }`}>
            <HelpCircleIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold tracking-tight ${isLightMode ? "text-slate-800" : "text-white"}`}>
              AI Clarification & Interview
            </h3>
            <p className={`text-[11px] ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
              Answer 1-3 quick questions to give your post punchy, viral details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshQuestions}
            disabled={isLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              isLightMode
                ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                : "bg-white/[0.05] hover:bg-white/[0.08] text-white/70"
            }`}
          >
            <RefreshCwIcon className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            answeredCount > 0
              ? isLightMode ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : isLightMode ? "bg-slate-100 text-slate-500" : "bg-white/[0.05] text-white/40"
          }`}>
            {answeredCount}/{questions.length} answered
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className={`text-xs ${isLightMode ? "text-slate-500" : "text-white/50"}`}>
            Analyzing your notes for missing angles & details...
          </p>
        </div>
      ) : questions.length === 0 ? (
        <div className="py-8 text-center">
          <p className={`text-xs ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
            No questions generated yet. Click &quot;Refresh&quot; or start writing your notes!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Question Cards */}
          <div className="flex flex-col gap-3.5">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(q.selectedAnswer) || Boolean(q.customAnswer?.trim());

              return (
                <motion.div
                  key={q.id}
                  layout
                  className={`p-4 rounded-xl border transition-all ${
                    isLightMode
                      ? isAnswered ? "bg-indigo-50/40 border-indigo-200/80" : "bg-slate-50/70 border-slate-200/70"
                      : isAnswered ? "bg-indigo-950/20 border-indigo-500/30" : "bg-white/[0.02] border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isAnswered
                          ? "bg-emerald-500 text-white"
                          : isLightMode ? "bg-slate-200 text-slate-700" : "bg-white/10 text-white/70"
                      }`}>
                        {isAnswered ? <CheckIcon className="w-3 h-3" /> : idx + 1}
                      </span>
                      <span className={`text-[13px] font-semibold leading-snug ${
                        isLightMode ? "text-slate-800" : "text-white/90"
                      }`}>
                        {q.question}
                      </span>
                    </div>
                  </div>

                  {q.contextHint && (
                    <p className={`text-[11px] mb-3 ml-7 ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
                      💡 {q.contextHint}
                    </p>
                  )}

                  {/* Suggested Answer Chips */}
                  <div className="flex flex-wrap gap-1.5 ml-7 mb-2.5">
                    {q.suggestedAnswers.map((opt) => {
                      const isSelected = q.selectedAnswer === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => onAnswerChange(q.id, isSelected ? "" : opt, false)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                            isSelected
                              ? isLightMode
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                              : isLightMode
                                ? "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-white/[0.05] hover:bg-white/[0.08] text-white/70 border border-white/[0.06]"
                          }`}
                        >
                          {isSelected && <span className="mr-1">✓</span>}
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Answer Input */}
                  <div className="ml-7 mt-1">
                    <input
                      type="text"
                      placeholder="Or type a custom answer..."
                      value={q.customAnswer || ""}
                      onChange={(e) => onAnswerChange(q.id, e.target.value, true)}
                      className={`w-full px-3 py-1.5 rounded-lg text-[12px] outline-none border transition-all ${
                        isLightMode
                          ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400"
                          : "bg-black/30 border-white/[0.06] text-white placeholder-white/20 focus:border-indigo-500/50"
                      }`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onApplyAndGenerate}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer ${
                isLightMode
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/25"
              }`}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              Generate Post with Answers
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
