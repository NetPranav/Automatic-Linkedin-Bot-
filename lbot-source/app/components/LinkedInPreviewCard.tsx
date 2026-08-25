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
  const [likeCount, setLikeCount] = useState(48);
  const [isLiked, setIsLiked] = useState(false);

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

  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* ─── The Realistic LinkedIn Post Card ─── */}
      <div
        className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
          isLightMode
            ? "bg-white border-slate-200/90 shadow-xl shadow-slate-200/60 text-slate-900"
            : "bg-[#1b1f24] border-white/[0.1] shadow-2xl shadow-black/80 text-white/95"
        }`}
      >
        {/* Card Header */}
        <div className="p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border ${
              isLightMode
                ? "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 border-slate-300 shadow-sm"
                : "bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 text-white border-white/20 shadow-md"
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
                <span className="font-bold text-[14.5px] leading-tight text-inherit">
                  {settings.authorName || "Your Name"}
                </span>
                <span className={`text-[11px] font-normal ${isLightMode ? "text-slate-400" : "text-white/40"}`}>
                  • 1st
                </span>
              </div>
              <span className={`text-[11.5px] leading-tight line-clamp-1 max-w-[220px] sm:max-w-[340px] mt-0.5 ${
                isLightMode ? "text-slate-500" : "text-white/60"
              }`}>
                {settings.authorHeadline || "AI Engineer & Software Innovator"}
              </span>
              <div className={`flex items-center gap-1 text-[10px] mt-1 ${
                isLightMode ? "text-slate-400" : "text-white/40"
              }`}>
                <span>Just now</span>
                <span>•</span>
                <span>Edited</span>
                <span>•</span>
                <span>🌐</span>
              </div>
            </div>
          </div>

          <button className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
            isLightMode
              ? "text-[#0a66c2] border-[#0a66c2]/30 hover:bg-blue-50"
              : "text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
          }`}>
            + Follow
          </button>
        </div>

        {/* Post Text Content */}
        <div className="px-4 sm:px-5 pb-4">
          <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed whitespace-pre-wrap font-normal select-text">
            {displayText}
          </p>

          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs font-bold mt-1.5 transition-colors cursor-pointer ${
                isLightMode ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"
              }`}
            >
              {isExpanded ? "…show less" : "…see more"}
            </button>
          )}
        </div>

        {/* Media Attachments Layout */}
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
                  className="relative aspect-video sm:aspect-square overflow-hidden cursor-pointer group bg-black/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={`Attachment ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-bold bg-black/70 px-3 py-1.5 rounded-xl backdrop-blur-md transition-opacity">
                      🔍 Tap to Zoom
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reaction Stats */}
        <div className={`px-4 sm:px-5 py-2.5 border-b flex items-center justify-between text-[11px] ${
          isLightMode ? "border-slate-100 text-slate-500" : "border-white/[0.06] text-white/50"
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center -space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] shadow-sm">👍</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] shadow-sm">❤️</span>
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px] shadow-sm">💡</span>
            </span>
            <span className="font-semibold">{likeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>12 comments</span>
            <span>•</span>
            <span>4 reposts</span>
          </div>
        </div>

        {/* Authentic Reaction Action Buttons */}
        <div className="px-2 py-1.5 grid grid-cols-4 gap-1">
          <button
            onClick={handleLikeToggle}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              isLiked
                ? "text-[#0a66c2] bg-blue-50/60 font-bold"
                : isLightMode
                  ? "hover:bg-slate-100 text-slate-600"
                  : "hover:bg-white/[0.06] text-white/60"
            }`}
          >
            <span>{isLiked ? "👍" : "👍"}</span>
            <span className="hidden sm:inline">{isLiked ? "Liked" : "Like"}</span>
          </button>

          <button className={`py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            isLightMode ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/[0.06] text-white/60"
          }`}>
            <span>💬</span>
            <span className="hidden sm:inline">Comment</span>
          </button>

          <button className={`py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            isLightMode ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/[0.06] text-white/60"
          }`}>
            <span>🔁</span>
            <span className="hidden sm:inline">Repost</span>
          </button>

          <button className={`py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            isLightMode ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/[0.06] text-white/60"
          }`}>
            <span>🚀</span>
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>

      {/* ─── Bottom Actions Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
              copied
                ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25"
                : isLightMode
                  ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm"
                  : "bg-white/[0.05] hover:bg-white/[0.08] text-white border-white/[0.08]"
            }`}
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? "Copied Post Text!" : "Copy Post Text"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNativeShare}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
              isLightMode
                ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm"
                : "bg-white/[0.05] hover:bg-white/[0.08] text-white border-white/[0.08]"
            }`}
          >
            <ShareIcon className="w-4 h-4" />
            Share / Open App
          </motion.button>
        </div>

        {onApproveAndPost && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onApproveAndPost}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white shadow-xl transition-all cursor-pointer ${
              isSubmitting
                ? "opacity-50 cursor-not-allowed bg-slate-500"
                : "bg-gradient-to-r from-[#0a66c2] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/30"
            }`}
          >
            <LinkedInLogo className="w-4 h-4" />
            {isSubmitting ? "Publishing via PC..." : "Approve & Publish to LinkedIn"}
          </motion.button>
        )}
      </div>

      {/* ─── Lightbox Modal ─── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
          >
            <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedImage} alt="Zoomed preview" className="w-full h-full object-contain" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center text-sm font-bold border border-white/20 hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
