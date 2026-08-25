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
      <div className="glass-panel p-8 sm:p-12 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <LightbulbIcon className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-[var(--text-primary)]">
          Optimization Lab Locked
        </h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs">
          Generate a post draft first to unlock 1-click hook variations, CTA multipliers, and viral score diagnostics.
        </p>
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
    <div className="w-full flex flex-col gap-3.5">
      {/* Header Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
            isLightMode
              ? "bg-amber-500 text-white"
              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          }`}>
            <LightbulbIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Post Optimization Lab
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              1-Click hook swaps, CTA multipliers & virality diagnostics
            </p>
          </div>
        </div>

        {/* Viral Score Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] shrink-0">
          <RocketIcon className={`w-4 h-4 ${scoreColor}`} />
          <div className="flex items-baseline gap-0.5">
            <span className={`text-sm font-extrabold ${scoreColor}`}>
              {suggestions.viralScore}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)] font-bold">/100</span>
          </div>
        </div>
      </div>

      {/* Segmented Sub-Tabs */}
      <div className="flex gap-1 p-1 rounded-xl glass-panel overflow-x-auto hide-scrollbar">
        {[
          { id: "hooks", label: "Hooks", count: suggestions.alternativeHooks.length },
          { id: "ctas", label: "CTAs", count: suggestions.suggestedCTAs.length },
          { id: "tones", label: "Tones", count: suggestions.toneVariations.length },
          { id: "virality", label: "Score Breakdown" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? isLightMode
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white/15 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label} {typeof tab.count === "number" && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === "hooks" && (
          <motion.div
            key="hooks"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2.5"
          >
            <p className="text-[11px] text-[var(--text-tertiary)] px-1">
              Tap any hook to instantly replace the first sentence of your post:
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
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isApplied
                      ? isLightMode
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-emerald-500/10 border-emerald-500/30"
                      : isLightMode
                        ? "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-indigo-500/15 text-indigo-500">
                      {h.style} Angle
                    </span>
                    <span className={`text-[11px] font-semibold ${
                      isApplied ? "text-emerald-500 font-bold" : "text-indigo-500"
                    }`}>
                      {isApplied ? "✓ Applied" : "1-Tap Swap →"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-[var(--text-primary)]">
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2.5"
          >
            <p className="text-[11px] text-[var(--text-tertiary)] px-1">
              Tap a conversation starter to add to your post ending:
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
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isApplied
                      ? isLightMode ? "bg-emerald-50 border-emerald-300" : "bg-emerald-500/10 border-emerald-500/30"
                      : isLightMode
                        ? "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">
                      CTA #{i + 1}
                    </span>
                    <span className={`text-[11px] font-semibold ${
                      isApplied ? "text-emerald-500 font-bold" : "text-indigo-500"
                    }`}>
                      {isApplied ? "✓ Added" : "Add to End →"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-[var(--text-primary)]">
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2.5"
          >
            <p className="text-[11px] text-[var(--text-tertiary)] px-1">
              Refactor draft with a targeted psychological framing:
            </p>
            {suggestions.toneVariations.map((t, i) => (
              <div
                key={i}
                onClick={() => onApplyTone(t.tone)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isLightMode
                    ? "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {t.tone}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-500">
                    Rewrite in this tone →
                  </span>
                </div>
                <p className="text-xs italic text-[var(--text-secondary)] line-clamp-2">
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
            <div className="glass-panel p-4 rounded-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2.5">
                Algorithm Diagnostics:
              </span>
              <div className="flex flex-col gap-2">
                {suggestions.scoreCritique.map((critique, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold text-xs mt-0.5">✓</span>
                    <span className="text-xs leading-relaxed text-[var(--text-primary)]">
                      {critique}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--text-primary)] block mb-2">
                Recommended Hashtags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.recommendedHashtags.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => onAddHashtag(tag)}
                    className="px-3 py-1 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-indigo-400 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
