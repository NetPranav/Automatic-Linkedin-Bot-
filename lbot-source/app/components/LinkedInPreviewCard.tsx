"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSettings } from "../lib/types";
import { CopyIcon, CheckIcon, ShareIcon, LinkedInLogo } from "./Icons";

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

  // Truncation logic
  const lines = postText.split("\n");
  const shouldTruncate = lines.length > 6 || postText.length > 320;
  const displayText = !isExpanded && shouldTruncate ? lines.slice(0, 5).join("\n") : postText;

  const initials = settings.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full flex flex-col gap-3">
      {/* ─── The Authentic LinkedIn Card ─── */}
      <div
        className={`rounded-2xl border transition-all overflow-hidden ${
          isLightMode
            ? "bg-white border-slate-200/90 shadow-md text-slate-900"
            : "bg-[#1b1f24] border-white/[0.1] shadow-xl text-white/95"
        }`}
      >
        {/* Post Header */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-[13px] overflow-hidden shrink-0 border ${
              isLightMode
                ? "bg-slate-100 text-slate-800 border-slate-300 shadow-sm"
                : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white/20"
            }`}>
              {settings.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.authorAvatarUrl} alt={settings.authorName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials || "PD"}</span>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[13.5px] leading-tight text-inherit truncate">
                  {settings.authorName || "Your Name"}
                </span>
                <span className={`text-[11px] shrink-0 ${isLightMode ? "text-slate-400" : "text-white/40"}`}>
                  • 1st
                </span>
              </div>
              <span className={`text-[11px] leading-tight line-clamp-1 mt-0.5 ${
                isLightMode ? "text-slate-500" : "text-white/60"
              }`}>
                {settings.authorHeadline || "AI Engineer & Software Innovator"}
              </span>
              <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${
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

          <button className={`px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0 border transition-all cursor-pointer ${
            isLightMode
              ? "text-[#0a66c2] border-[#0a66c2]/30 hover:bg-blue-50"
              : "text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
          }`}>
            + Follow
          </button>
        </div>

        {/* Post Text Body */}
        <div className="px-4 sm:px-5 pb-4">
          <p className="text-[14px] sm:text-[15px] leading-[1.6] whitespace-pre-wrap font-normal select-text">
            {displayText}
          </p>

          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs font-bold mt-1 transition-colors cursor-pointer ${
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
            <div className={`grid gap-0.5 ${
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
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-bold bg-black/70 px-2 py-1 rounded-lg">
                      🔍 Tap to Zoom
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Stats */}
        <div className={`px-4 sm:px-5 py-3 border-b flex items-center justify-between text-[12px] ${
          isLightMode ? "border-slate-100 text-slate-500" : "border-white/[0.06] text-white/50"
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center -space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px]">👍</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]">❤️</span>
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">💡</span>
            </span>
            <span className="font-semibold">{likeCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>12 comments</span>
            <span>•</span>
            <span>4 reposts</span>
          </div>
        </div>

        {/* Reactions Action Bar */}
        <div className="px-2 py-1.5 grid grid-cols-4 gap-1 text-center">
          <button
            onClick={handleLikeToggle}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-semibold cursor-pointer ${
              isLiked
                ? "text-[#0a66c2] bg-blue-50/60 font-bold"
                : isLightMode
                  ? "hover:bg-slate-50 text-slate-600"
                  : "hover:bg-white/[0.06] text-white/60"
            }`}
          >
            <span>👍</span>
            <span className="text-[12px]">{isLiked ? "Liked" : "Like"}</span>
          </button>

          <button className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-semibold cursor-pointer ${
            isLightMode ? "hover:bg-slate-50 text-slate-600" : "hover:bg-white/[0.06] text-white/60"
          }`}>
            <span>💬</span>
            <span className="text-[12px]">Comment</span>
          </button>

          <button className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-semibold cursor-pointer ${
            isLightMode ? "hover:bg-slate-50 text-slate-600" : "hover:bg-white/[0.06] text-white/60"
          }`}>
            <span>🔁</span>
            <span className="text-[12px]">Repost</span>
          </button>

          <button className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-semibold cursor-pointer ${
            isLightMode ? "hover:bg-slate-50 text-slate-600" : "hover:bg-white/[0.06] text-white/60"
          }`}>
            <span>🚀</span>
            <span className="text-[12px]">Send</span>
          </button>
        </div>
      </div>

      {/* ─── Floating Action Dock ─── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-3">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-[13px] font-bold border transition-all cursor-pointer shadow-xs ${
              copied
                ? "bg-emerald-600 text-white border-emerald-600"
                : isLightMode
                  ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300"
                  : "bg-white/[0.05] hover:bg-white/[0.08] text-white border-white/[0.08]"
            }`}
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Post Text"}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-[13px] font-bold border transition-all cursor-pointer shadow-xs ${
              isLightMode
                ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300"
                : "bg-white/[0.05] hover:bg-white/[0.08] text-white border-white/[0.08]"
            }`}
          >
            <ShareIcon className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        {onApproveAndPost && (
          <button
            onClick={onApproveAndPost}
            disabled={isSubmitting}
            className={`flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl text-[14px] font-bold text-white shadow-md transition-all cursor-pointer ${
              isSubmitting
                ? "opacity-50 cursor-not-allowed bg-slate-500"
                : "bg-gradient-to-r from-[#0a66c2] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200"
            }`}
          >
            <LinkedInLogo className="w-4 h-4" />
            <span>{isSubmitting ? "Publishing..." : "Approve & Publish"}</span>
          </button>
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
            <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedImage} alt="Zoomed preview" className="w-full h-full object-contain" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center text-xs font-bold border border-white/20"
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
