"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSettings } from "../lib/types";
import { CopyIcon, CheckIcon, ShareIcon, SendIcon, LinkedInLogo } from "./Icons";

interface Props {
  postText: string;
  images: string[];
  settings: AppSettings;
  isLightMode: boolean;
  onApproveAndPost?: () => void;
  isSubmitting?: boolean;
}

export default function LinkedInPreviewCard({
  postText,
  images,
  settings,
  isLightMode,
  onApproveAndPost,
  isSubmitting,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!postText) return;
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Copy error:", e);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "LinkedIn Post",
          text: postText,
        });
      } catch (e) {
        console.error("Share error:", e);
      }
    } else {
      handleCopy();
    }
  };

  // Truncation logic for "...see more"
  const lines = postText.split("\n");
  const shouldTruncate = lines.length > 5 || postText.length > 280;
  const displayText = !isExpanded && shouldTruncate ? lines.slice(0, 4).join("\n") : postText;

  const initials = settings.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      {/* ─── The Realistic LinkedIn Post Mockup ─── */}
      <div
        className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
          isLightMode
            ? "bg-white border-slate-200/90 shadow-slate-200/50 text-slate-900"
            : "bg-[#1b1f24] border-white/[0.08] shadow-2xl text-white/95"
        }`}
      >
        {/* Post Header */}
        <div className="p-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border ${
              isLightMode ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white/10"
            }`}>
              {settings.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.authorAvatarUrl} alt={settings.authorName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials || "PD"}</span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[14px] leading-snug">
                  {settings.authorName || "Your Name"}
                </span>
                <span className={`text-[11px] font-normal ${isLightMode ? "text-slate-400" : "text-white/40"}`}>
                  • 1st
                </span>
              </div>
              <span className={`text-[11px] leading-tight line-clamp-1 max-w-[240px] sm:max-w-[320px] ${
                isLightMode ? "text-slate-500" : "text-white/60"
              }`}>
                {settings.authorHeadline || "AI Engineer & Innovator"}
              </span>
              <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${
                isLightMode ? "text-slate-400" : "text-white/40"
              }`}>
                <span>Just now</span>
                <span>•</span>
                <span>🌐</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition-all ${
              isLightMode
                ? "text-indigo-600 border-indigo-600/30 hover:bg-indigo-50"
                : "text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
            }`}>
              + Follow
            </button>
          </div>
        </div>

        {/* Post Text Body */}
        <div className="px-4 pb-3">
          <p className="text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-wrap font-normal">
            {displayText}
          </p>

          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs font-semibold mt-1 transition-colors ${
                isLightMode ? "text-slate-500 hover:text-slate-800" : "text-white/50 hover:text-white"
              }`}
            >
              {isExpanded ? "…show less" : "…see more"}
            </button>
          )}
        </div>

        {/* Media Attachments Grid / Carousel */}
        {images && images.length > 0 && (
          <div className={`border-t border-b overflow-hidden ${
            isLightMode ? "border-slate-100 bg-slate-50" : "border-white/[0.06] bg-black/40"
          }`}>
            <div className={`grid gap-1 ${
              images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
            }`}>
              {images.map((imgUrl, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImage(imgUrl)}
                  className="relative aspect-video sm:aspect-square overflow-hidden cursor-pointer group bg-black/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={`Attachment ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-medium bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm transition-opacity">
                      🔍 Tap to Zoom
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Stats Bar */}
        <div className={`px-4 py-2 border-b flex items-center justify-between text-[11px] ${
          isLightMode ? "border-slate-100 text-slate-500" : "border-white/[0.06] text-white/40"
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center -space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">👍</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]">❤️</span>
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">💡</span>
            </span>
            <span>42</span>
          </div>
          <div className="flex items-center gap-2">
            <span>9 comments</span>
            <span>•</span>
            <span>3 reposts</span>
          </div>
        </div>

        {/* Interactive Action Bar (Like, Comment, Repost, Send) */}
        <div className="px-2 py-1.5 grid grid-cols-4 gap-1">
          {[
            { label: "Like", icon: "👍" },
            { label: "Comment", icon: "💬" },
            { label: "Repost", icon: "🔁" },
            { label: "Send", icon: "🚀" },
          ].map((act, i) => (
            <button
              key={i}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                isLightMode
                  ? "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  : "hover:bg-white/[0.06] text-white/60 hover:text-white"
              }`}
            >
              <span>{act.icon}</span>
              <span className="hidden sm:inline">{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Fast Action Buttons Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              copied
                ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                : isLightMode
                  ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
                  : "bg-white/[0.05] hover:bg-white/[0.08] text-white/80 border-white/[0.08]"
            }`}
          >
            {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
            {copied ? "Copied to Clipboard!" : "Copy Post"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNativeShare}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isLightMode
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
                : "bg-white/[0.05] hover:bg-white/[0.08] text-white/80 border-white/[0.08]"
            }`}
          >
            <ShareIcon className="w-3.5 h-3.5" />
            Share / Open LinkedIn
          </motion.button>
        </div>

        {onApproveAndPost && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onApproveAndPost}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${
              isSubmitting
                ? "opacity-50 cursor-not-allowed bg-slate-500"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/25"
            }`}
          >
            <LinkedInLogo className="w-4 h-4" />
            {isSubmitting ? "Publishing via PC..." : "Approve & Publish"}
          </motion.button>
        )}
      </div>

      {/* ─── Image Zoom Lightbox Modal ─── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedImage} alt="Zoomed preview" className="w-full h-full object-contain" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm font-bold border border-white/20"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
