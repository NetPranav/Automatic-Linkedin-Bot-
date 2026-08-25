"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PostSuggestions } from "../lib/types";
import { LightbulbIcon, RocketIcon } from "./Icons";

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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 sm:p-12 rounded-3xl text-center flex flex-col items-center justify-center gap-3"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <LightbulbIcon className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-[var(--text-primary)]">
          Optimization Lab Locked
        </h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm">
          Generate or review an active post draft to unlock 1-click hook variations, CTA multipliers, and viral score diagnostics.
        </p>
      </motion.div>
    );
  }

  const scoreColor =
    suggestions.viralScore >= 85
      ? "text-emerald-500"
      : suggestions.viralScore >= 70
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 sm:p-7 rounded-3xl relative overflow-hidden transition-all duration-300"
    >
      {/* Luminous Top Glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)] mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
            isLightMode
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/25"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-amber-500/10"
          }`}>
            <LightbulbIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              Post Optimization Lab
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              1-Click hook swaps, CTA enhancers & virality score diagnostics
            </p>
          </div>
        </div>

        {/* Viral Score Badge Card */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] shadow-sm">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <RocketIcon className={`w-4 h-4 ${scoreColor}`} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-0.5">
              <span className={`text-sm font-extrabold ${scoreColor}`}>
                {suggestions.viralScore}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-bold">/100</span>
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] uppercase font-semibold tracking-wider">
              Viral Score
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Bar */}
      <div className="flex gap-1.5 p-1 rounded-2xl mb-5 bg-[var(--bg-input)] border border-[var(--border-subtle)]">
        {[
          { id: "hooks", label: "Hook Swapper", count: suggestions.alternativeHooks.length },
          { id: "ctas", label: "CTA Multiplier", count: suggestions.suggestedCTAs.length },
          { id: "tones", label: "Tone Morpher", count: suggestions.toneVariations.length },
          { id: "virality", label: "Score Breakdown", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
              activeTab === tab.id
                ? isLightMode
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white/15 text-white shadow-lg shadow-black/40"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-3"
          >
            <p className="text-xs text-[var(--text-tertiary)] mb-1">
              Select any hook below to immediately replace your post&apos;s opening line:
            </p>
            {suggestions.alternativeHooks.map((h, i) => {
              const isApplied = appliedHook === h.text;
              return (
                <div
                  key={i}
                  onClick={() => {
                    onReplaceHook(h.text);
                    setAppliedHook(h.text);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    isApplied
                      ? isLightMode
                        ? "bg-emerald-50 border-emerald-300 shadow-sm"
                        : "bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-950/20"
                      : isLightMode
                        ? "bg-white hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-300 shadow-sm"
                        : "bg-white/[0.02] hover:bg-indigo-500/10 border-white/[0.07] hover:border-indigo-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${
                      isLightMode ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-300"
                    }`}>
                      {h.style} Angle
                    </span>
                    <span className={`text-xs font-semibold flex items-center gap-1 ${
                      isApplied ? "text-emerald-500 font-bold" : "opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity"
                    }`}>
                      {isApplied ? "✓ Applied to Post" : "1-Click Swap →"}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed font-semibold text-[var(--text-primary)]">
                    &ldquo;{h.text}&rdquo;
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "ctas" && (
          <motion.div
            key="ctas"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-3"
          >
            <p className="text-xs text-[var(--text-tertiary)] mb-1">
              Select a conversation-provoking question to maximize comments and reach:
            </p>
            {suggestions.suggestedCTAs.map((cta, i) => {
              const isApplied = appliedCTA === cta;
              return (
                <div
                  key={i}
                  onClick={() => {
                    onReplaceCTA(cta);
                    setAppliedCTA(cta);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    isApplied
                      ? isLightMode ? "bg-emerald-50 border-emerald-300 shadow-sm" : "bg-emerald-500/10 border-emerald-500/30"
                      : isLightMode
                        ? "bg-white hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-300 shadow-sm"
                        : "bg-white/[0.02] hover:bg-indigo-500/10 border-white/[0.07] hover:border-indigo-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">
                      CTA #{i + 1}
                    </span>
                    <span className={`text-xs font-semibold ${
                      isApplied ? "text-emerald-500 font-bold" : "opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity"
                    }`}>
                      {isApplied ? "✓ Applied" : "Swap CTA →"}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed font-medium text-[var(--text-primary)]">
                    {cta}
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "tones" && (
          <motion.div
            key="tones"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-3"
          >
            <p className="text-xs text-[var(--text-tertiary)] mb-1">
              Refactor your draft with a dedicated psychological framing:
            </p>
            {suggestions.toneVariations.map((t, i) => (
              <div
                key={i}
                onClick={() => onApplyTone(t.tone)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                  isLightMode
                    ? "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.07] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {t.tone}
                  </span>
                  <span className="text-xs font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Rewrite in this tone →
                  </span>
                </div>
                <p className="text-xs italic text-[var(--text-secondary)]">
                  &ldquo;{t.previewText}&rdquo;
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "virality" && (
          <motion.div
            key="virality"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-4"
          >
            {/* Checklist */}
            <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                Algorithm Diagnostics:
              </span>
              <div className="flex flex-col gap-2">
                {suggestions.scoreCritique.map((critique, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-emerald-500 font-bold text-xs mt-0.5">✓</span>
                    <span className="text-xs leading-relaxed text-[var(--text-primary)]">
                      {critique}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hashtag Recommendations */}
            <div>
              <span className="text-xs font-bold text-[var(--text-primary)] block mb-2">
                Recommended High-Reach Hashtags:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestions.recommendedHashtags.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => onAddHashtag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isLightMode
                        ? "bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 shadow-sm"
                        : "bg-white/[0.04] hover:bg-indigo-500/20 text-white/80 hover:text-indigo-300 border border-white/[0.08]"
                    }`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Best Posting Time */}
            {suggestions.bestPostingTime && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 font-medium ${
                isLightMode
                  ? "bg-amber-50 text-amber-900 border border-amber-200/80"
                  : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
              }`}>
                <span>⏰</span>
                <span><strong>Peak Publishing Window:</strong> {suggestions.bestPostingTime}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
