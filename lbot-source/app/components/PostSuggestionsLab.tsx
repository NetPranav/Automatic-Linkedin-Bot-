"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PostSuggestions } from "../lib/types";
import { LightbulbIcon, SparklesIcon, CheckIcon, RocketIcon } from "./Icons";

interface Props {
  suggestions: PostSuggestions | null;
  currentPostText: string;
  onReplaceHook: (newHook: string) => void;
  onReplaceCTA: (newCTA: string) => void;
  onApplyTone: (toneName: string) => void;
  onAddHashtag: (tag: string) => void;
  isLightMode: boolean;
}

export default function PostSuggestionsLab({
  suggestions,
  currentPostText,
  onReplaceHook,
  onReplaceCTA,
  onApplyTone,
  onAddHashtag,
  isLightMode,
}: Props) {
  const [activeTab, setActiveTab] = useState<"hooks" | "ctas" | "tones" | "virality">("hooks");
  const [appliedHook, setAppliedHook] = useState<string | null>(null);
  const [appliedCTA, setAppliedCTA] = useState<string | null>(null);

  if (!suggestions) {
    return (
      <div className={`p-6 rounded-2xl border text-center ${
        isLightMode ? "bg-white border-slate-200 text-slate-500" : "bg-[#0d0e14]/80 border-white/[0.08] text-white/50"
      }`}>
        <p className="text-xs">Generate a post draft to unlock the Post Optimization Lab & Hook Switcher!</p>
      </div>
    );
  }

  const scoreColor =
    suggestions.viralScore >= 85
      ? "text-emerald-500"
      : suggestions.viralScore >= 70
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <div className={`p-4 md:p-6 rounded-2xl border transition-all ${
      isLightMode
        ? "bg-white/90 border-slate-200 shadow-sm backdrop-blur-md"
        : "bg-[#0d0e14]/80 border-white/[0.08] shadow-2xl backdrop-blur-xl"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-inherit">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isLightMode ? "bg-amber-50 text-amber-600" : "bg-amber-500/10 text-amber-400"
          }`}>
            <LightbulbIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold tracking-tight ${isLightMode ? "text-slate-800" : "text-white"}`}>
              Optimization Lab & Suggestions
            </h3>
            <p className={`text-[11px] ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
              1-Click hook swaps, CTA enhancers & virality score
            </p>
          </div>
        </div>

        {/* Viral Score Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
          isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/[0.08]"
        }`}>
          <RocketIcon className={`w-3.5 h-3.5 ${scoreColor}`} />
          <div className="flex flex-col">
            <span className={`text-xs font-bold leading-none ${scoreColor}`}>
              {suggestions.viralScore}/100
            </span>
            <span className={`text-[9px] ${isLightMode ? "text-slate-400" : "text-white/30"}`}>
              Viral Score
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl mb-4 bg-inherit border border-inherit">
        {[
          { id: "hooks", label: "Hook Swapper", count: suggestions.alternativeHooks.length },
          { id: "ctas", label: "CTA Booster", count: suggestions.suggestedCTAs.length },
          { id: "tones", label: "Tone Morph", count: suggestions.toneVariations.length },
          { id: "virality", label: "Score Breakdown", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all text-center ${
              activeTab === tab.id
                ? isLightMode
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white/15 text-white shadow"
                : isLightMode
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-white/50 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "hooks" && (
          <motion.div
            key="hooks"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2.5"
          >
            <p className={`text-[11px] mb-1 ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
              Click any hook below to immediately replace the first paragraph of your post:
            </p>
            {suggestions.alternativeHooks.map((h, i) => (
              <div
                key={i}
                onClick={() => {
                  onReplaceHook(h.text);
                  setAppliedHook(h.text);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                  appliedHook === h.text
                    ? isLightMode ? "bg-emerald-50 border-emerald-300" : "bg-emerald-500/10 border-emerald-500/30"
                    : isLightMode
                      ? "bg-slate-50/70 hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-200"
                      : "bg-white/[0.02] hover:bg-indigo-500/10 border-white/[0.06] hover:border-indigo-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    isLightMode ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-300"
                  }`}>
                    {h.style}
                  </span>
                  <span className={`text-[10px] font-medium flex items-center gap-1 ${
                    appliedHook === h.text ? "text-emerald-500" : "opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500"
                  }`}>
                    {appliedHook === h.text ? "✓ Applied" : "Swap Hook →"}
                  </span>
                </div>
                <p className={`text-[12px] leading-relaxed font-medium ${
                  isLightMode ? "text-slate-800" : "text-white/90"
                }`}>
                  &ldquo;{h.text}&rdquo;
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "ctas" && (
          <motion.div
            key="ctas"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2.5"
          >
            <p className={`text-[11px] mb-1 ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
              Click to replace the closing call-to-action question to maximize comments:
            </p>
            {suggestions.suggestedCTAs.map((cta, i) => (
              <div
                key={i}
                onClick={() => {
                  onReplaceCTA(cta);
                  setAppliedCTA(cta);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                  appliedCTA === cta
                    ? isLightMode ? "bg-emerald-50 border-emerald-300" : "bg-emerald-500/10 border-emerald-500/30"
                    : isLightMode
                      ? "bg-slate-50/70 hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-200"
                      : "bg-white/[0.02] hover:bg-indigo-500/10 border-white/[0.06] hover:border-indigo-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-medium ${isLightMode ? "text-slate-400" : "text-white/40"}`}>
                    Option {i + 1}
                  </span>
                  <span className={`text-[10px] font-medium flex items-center gap-1 ${
                    appliedCTA === cta ? "text-emerald-500" : "opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500"
                  }`}>
                    {appliedCTA === cta ? "✓ Applied" : "Swap CTA →"}
                  </span>
                </div>
                <p className={`text-[12px] leading-relaxed ${isLightMode ? "text-slate-800" : "text-white/90"}`}>
                  {cta}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "tones" && (
          <motion.div
            key="tones"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2.5"
          >
            <p className={`text-[11px] mb-1 ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
              Explore different framing angles for your audience:
            </p>
            {suggestions.toneVariations.map((t, i) => (
              <div
                key={i}
                onClick={() => onApplyTone(t.tone)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                  isLightMode
                    ? "bg-slate-50/70 hover:bg-slate-100 border-slate-200 hover:border-slate-300"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-semibold ${isLightMode ? "text-slate-800" : "text-white"}`}>
                    {t.tone}
                  </span>
                  <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Rewrite in this tone →
                  </span>
                </div>
                <p className={`text-[11px] italic ${isLightMode ? "text-slate-600" : "text-white/60"}`}>
                  &ldquo;{t.previewText}&rdquo;
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "virality" && (
          <motion.div
            key="virality"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-3"
          >
            <div className={`p-3 rounded-xl border ${
              isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.06]"
            }`}>
              <span className={`text-[11px] font-semibold uppercase tracking-wider block mb-2 ${
                isLightMode ? "text-slate-600" : "text-white/60"
              }`}>
                Diagnostic Breakdown:
              </span>
              <div className="flex flex-col gap-1.5">
                {suggestions.scoreCritique.map((critique, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 text-[11px] mt-0.5">✓</span>
                    <span className={`text-[11px] leading-relaxed ${isLightMode ? "text-slate-700" : "text-white/80"}`}>
                      {critique}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Hashtags */}
            <div>
              <span className={`text-[11px] font-semibold block mb-1.5 ${isLightMode ? "text-slate-700" : "text-white/70"}`}>
                Algorithm-Recommended Hashtags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.recommendedHashtags.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => onAddHashtag(tag)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      isLightMode
                        ? "bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200"
                        : "bg-white/[0.04] hover:bg-indigo-500/10 text-white/70 hover:text-indigo-400 border border-white/[0.08]"
                    }`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Optimal Posting Time */}
            {suggestions.bestPostingTime && (
              <div className={`p-2.5 rounded-lg text-[11px] ${
                isLightMode ? "bg-amber-50/80 text-amber-800 border border-amber-200" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
              }`}>
                ⏰ <strong>Best Posting Window:</strong> {suggestions.bestPostingTime}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
