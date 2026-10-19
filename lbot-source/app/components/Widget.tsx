"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ProjectDraft,
  AppSettings,
  TextImageLink,
  ImageAttachment,
  SyncStatus,
  ClarificationQuestion,
  PostSuggestions,
} from "../lib/types";
import {
  DEFAULT_SETTINGS,
  getStoredSettings,
  saveStoredSettings,
  saveActiveDraft,
  clearActiveDraft,
  getAllProjects,
  saveProject,
  deleteProject,
  generateUUID,
} from "../lib/storage";
import {
  generatePostDirect,
  generateClarifyingQuestions,
  generatePostSuggestions,
} from "../lib/aiEngine";

/* ═══════════════════════════════════════
   Inline Icons (Lucide-style SVG)
   ═══════════════════════════════════════ */
const I = ({ d, className = "w-4 h-4", fill = false }: { d: string; className?: string; fill?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
}
function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}
function IconSparkles({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
}
function IconSettings({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
}
function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>;
}
function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconClose({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
}
function IconImage({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
}
function IconHash({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>;
}
function IconUpload({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>;
}
function IconFile({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
}
function IconLinkedIn({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>;
}
function IconRefresh({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
}
function IconLightbulb({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
}
function IconEye({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconRocket({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
}
function IconSend({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
}
function IconTarget({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function IconTrendingUp({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
}


/* ═══════════════════════════════════════
   Templates / Inspiration
   ═══════════════════════════════════════ */
const INSPIRATION_PILLS = [
  { label: "🚀 Feature Launch", text: "We just launched our new project today! Here is the breakdown of why we built it, the architecture we used, and what we learned:" },
  { label: "💡 Hard-Won Lesson", text: "3 days ago, our entire pipeline failed in production. It felt frustrating at first, but here is the exact lesson it taught us about scaling:" },
  { label: "📈 10x Growth", text: "We managed to achieve 10x growth and reduce latency by over 60% with one key architectural change. Here is how:" },
  { label: "🔧 Tech Stack", text: "Here is the raw architectural breakdown of our latest stack — why we chose it, what worked, and what we would do differently:" },
  { label: "🤝 Team Win", text: "Huge milestone for our team this week! Building in public taught us that consistency beats intensity. Here is our story:" },
];


/* ═══════════════════════════════════════
   CSS-in-JS Styles
   ═══════════════════════════════════════ */
const s = {
  // Layout
  shell: { display: "flex", flexDirection: "column" as const, minHeight: "100vh", background: "#FAFBFE", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", paddingBottom: "max(var(--safe-bottom), 0px)" },

  // Header (with Safe-Area Inset Top to avoid status bar overlap)
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingTop: "max(var(--safe-top), 0px)",
    paddingBottom: 0,
    paddingLeft: "max(12px, var(--safe-left))",
    paddingRight: "max(12px, var(--safe-right))",
    borderBottom: "1px solid #E5E7EB",
    background: "#FFFFFF",
    flexShrink: 0,
    gap: 8,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  headerLogo: { width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 },
  headerTitle: { fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" },
  headerNav: { display: "flex", alignItems: "center", gap: 2 },
  navBtn: (active: boolean) => ({
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? "#4F46E5" : "#6B7280",
    background: active ? "#EEF2FF" : "transparent",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  }),
  headerRight: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  statusDot: (connected: boolean) => ({
    width: 7, height: 7, borderRadius: "50%", background: connected ? "#059669" : "#D97706",
    boxShadow: connected ? "0 0 0 3px rgba(5,150,105,0.15)" : "0 0 0 3px rgba(217,119,6,0.15)",
  }),
  headerBtn: { padding: "6px 8px", background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center" },
  newPostBtn: { display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#4F46E5", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const },

  // Container
  main: { flex: 1, overflow: "hidden" as const, display: "flex" },

  // ── HOME SCREEN ──
  homeContainer: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" as const },
  homeHeader: { padding: "20px 16px 0", display: "flex", flexDirection: "column" as const, gap: 16 },
  homeTitle: { fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" },
  homeSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  homeStats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 },
  statCard: { padding: "14px 16px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, display: "flex", flexDirection: "column" as const, gap: 4 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  statValue: { fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" },
  searchBar: { display: "flex", alignItems: "center", gap: 8, padding: "0 16px", marginTop: 14 },
  searchInput: { width: "100%", height: 38, padding: "0 12px 0 36px", fontSize: 13, color: "#111827", background: "#F4F6FB", border: "1px solid #E5E7EB", borderRadius: 10, outline: "none", boxSizing: "border-box" as const },
  filterBtns: { display: "flex", gap: 4, padding: "0 16px", marginTop: 10, overflowX: "auto" as const },
  filterBtn: (active: boolean) => ({
    padding: "5px 12px", fontSize: 12, fontWeight: active ? 600 : 500,
    color: active ? "#4F46E5" : "#6B7280",
    background: active ? "#EEF2FF" : "transparent",
    border: active ? "1px solid #C7D2FE" : "1px solid transparent",
    borderRadius: 8, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const,
  }),
  homeGrid: { flex: 1, overflow: "auto" as const, padding: "14px 16px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, alignContent: "start" as const },
  draftCard: { padding: "16px 18px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column" as const, gap: 8 },
  draftTitle: { fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.4 },
  draftPreview: { fontSize: 12, color: "#6B7280", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" as const },
  draftMeta: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  draftDate: { fontSize: 11, color: "#9CA3AF" },
  draftActions: { display: "flex", gap: 4 },
  draftActBtn: { width: 28, height: 28, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  statusBadge: (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      draft: { bg: "#F4F6FB", text: "#6B7280" },
      ready_to_post: { bg: "#ECFDF5", text: "#059669" },
      posted: { bg: "#EEF2FF", text: "#4F46E5" },
    };
    const c = colors[status] || colors.draft;
    return { padding: "2px 8px", fontSize: 10, fontWeight: 600, borderRadius: 6, background: c.bg, color: c.text };
  },
  emptyState: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 16, padding: "60px 0", color: "#9CA3AF" },

  // ── MOBILE SWITCHER ──
  mobileSwitcher: {
    display: "flex",
    background: "#F4F6FB",
    borderRadius: 10,
    padding: 3,
    gap: 4,
    margin: "8px 14px 0",
  },
  mobileSwitcherBtn: (active: boolean) => ({
    flex: 1,
    padding: "7px 0",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    color: active ? "#4F46E5" : "#6B7280",
    background: active ? "#FFFFFF" : "transparent",
    borderRadius: 8,
    border: active ? "1px solid #E5E7EB" : "1px solid transparent",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "center" as const,
  }),

  // ── EDITOR ──
  editorContainer: { flex: 1, display: "flex", overflow: "hidden" as const },
  editorLeft: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" as const, borderRight: "1px solid #E5E7EB", minWidth: 0 },
  editorToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #E5E7EB", background: "#fff", flexShrink: 0, flexWrap: "wrap" as const, gap: 8 },
  editorToolbarLeft: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  editorToolbarRight: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" as const },
  toolBtn: { display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", fontSize: 12, fontWeight: 500, color: "#6B7280", background: "transparent", border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const },
  toolBtnAccent: { display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#fff", background: "#4F46E5", border: "none", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const },
  editorBody: { flex: 1, overflow: "auto" as const, padding: "20px 16px" },
  titleInput: { width: "100%", fontSize: 18, fontWeight: 700, color: "#111827", background: "transparent", border: "none", outline: "none", letterSpacing: "-0.02em", marginBottom: 14 },
  textarea: { width: "100%", minHeight: 220, fontSize: 14, lineHeight: 1.8, color: "#111827", background: "transparent", border: "none", outline: "none", resize: "none" as const },
  editorFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid #E5E7EB", background: "#FAFBFE", flexShrink: 0 },
  footerMeta: { fontSize: 11, color: "#9CA3AF" },

  // Tags
  tagArea: { display: "flex", flexWrap: "wrap" as const, gap: 6, padding: "10px 16px", borderTop: "1px solid #F4F6FB" },
  tagChip: { display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500, color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 6, cursor: "default" },
  tagRemove: { cursor: "pointer", color: "#4F46E5", opacity: 0.6, background: "transparent", border: "none", fontSize: 14, lineHeight: 1 },
  tagInputField: { padding: "3px 8px", fontSize: 11, color: "#111827", background: "transparent", border: "1px solid #E5E7EB", borderRadius: 6, outline: "none", width: 100 },

  // Images row
  imageRow: { display: "flex", gap: 8, flexWrap: "wrap" as const, padding: "8px 16px" },
  imageThumbnail: { width: 56, height: 56, borderRadius: 8, objectFit: "cover" as const, border: "1px solid #E5E7EB" },
  imageRemoveBtn: { position: "absolute" as const, top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" },

  // Inspiration pills
  pillsRow: { display: "flex", gap: 8, flexWrap: "wrap" as const, padding: "10px 16px" },
  pill: { padding: "5px 12px", fontSize: 11, fontWeight: 500, color: "#6B7280", background: "#F4F6FB", border: "1px solid #E5E7EB", borderRadius: 20, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const },

  // ── RIGHT PANEL ──
  rightPanel: { display: "flex", flexDirection: "column" as const, overflow: "hidden" as const, background: "#fff", minWidth: 0 },
  rightTabs: { display: "flex", borderBottom: "1px solid #E5E7EB", flexShrink: 0 },
  rightTab: (active: boolean) => ({
    flex: 1, padding: "12px 0", fontSize: 12, fontWeight: active ? 600 : 500,
    color: active ? "#4F46E5" : "#6B7280",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #4F46E5" : "2px solid transparent",
    cursor: "pointer", transition: "all 0.15s",
    textAlign: "center" as const,
  }),
  rightBody: { flex: 1, overflow: "auto" as const, padding: "16px" },

  // ── Preview Card (LinkedIn) ──
  previewCard: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" as const },
  previewHeader: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" },
  previewAvatar: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0 },
  previewName: { fontSize: 13, fontWeight: 600, color: "#111827" },
  previewHeadline: { fontSize: 11, color: "#6B7280" },
  previewTime: { fontSize: 10, color: "#9CA3AF" },
  previewBody: { padding: "0 16px 14px", fontSize: 13, lineHeight: 1.75, color: "#111827", whiteSpace: "pre-wrap" as const },
  previewActions: { display: "flex", borderTop: "1px solid #E5E7EB", padding: "8px 16px", gap: 8 },
  previewActionBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 0", fontSize: 12, color: "#6B7280", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer" },

  // ── Suggestions / Optimize ──
  sugSection: { marginBottom: 20 },
  sugTitle: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 },
  sugCard: { padding: "12px 14px", background: "#F4F6FB", borderRadius: 10, cursor: "pointer", transition: "all 0.15s", marginBottom: 8, fontSize: 12, lineHeight: 1.6, color: "#374151" },
  sugLabel: { fontSize: 10, fontWeight: 600, color: "#4F46E5", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 4 },
  viralMeter: { display: "flex", alignItems: "center", gap: 12, padding: "16px", background: "#F4F6FB", borderRadius: 12, marginBottom: 16 },
  viralScore: { fontSize: 32, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.04em" },

  // ── Clarify ──
  clarifyCard: { padding: "16px", background: "#F4F6FB", borderRadius: 12, marginBottom: 12 },
  clarifyQ: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 },
  clarifyHint: { fontSize: 11, color: "#6B7280", marginBottom: 10 },
  clarifyOptions: { display: "flex", flexDirection: "column" as const, gap: 6 },
  clarifyOption: (selected: boolean) => ({
    padding: "8px 12px", fontSize: 12, color: selected ? "#4F46E5" : "#374151",
    background: selected ? "#EEF2FF" : "#fff",
    border: selected ? "1px solid #C7D2FE" : "1px solid #E5E7EB",
    borderRadius: 8, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const,
  }),

  // ── Settings Modal ──
  overlay: { position: "fixed" as const, inset: 0, zIndex: 50, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" },
  modal: { maxWidth: "min(520px, calc(100vw - 32px))", width: "100%", maxHeight: "85vh", background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", overflow: "auto" as const },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E5E7EB" },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#111827" },
  modalBody: { padding: "18px 20px", display: "flex", flexDirection: "column" as const, gap: 16 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 },
  fieldInput: { width: "100%", height: 38, padding: "0 12px", fontSize: 13, color: "#111827", background: "#F4F6FB", border: "1px solid #E5E7EB", borderRadius: 8, outline: "none" },
  fieldSelect: { width: "100%", height: 38, padding: "0 12px", fontSize: 13, color: "#111827", background: "#F4F6FB", border: "1px solid #E5E7EB", borderRadius: 8, outline: "none", cursor: "pointer" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid #E5E7EB" },
  modalBtnSecondary: { padding: "7px 16px", fontSize: 13, fontWeight: 500, color: "#6B7280", background: "#F4F6FB", border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer" },
  modalBtnPrimary: { padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#4F46E5", border: "none", borderRadius: 8, cursor: "pointer" },

  // ── Import Modal ──
  importTextarea: { width: "100%", minHeight: 140, padding: 14, fontSize: 13, lineHeight: 1.7, color: "#111827", background: "#F4F6FB", border: "1px solid #E5E7EB", borderRadius: 10, outline: "none", resize: "none" as const },

  // ── Generation Loading ──
  loadingOverlay: { position: "absolute" as const, inset: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 16, zIndex: 10 },
  loadingSpinner: { width: 32, height: 32, border: "3px solid #E5E7EB", borderTop: "3px solid #4F46E5", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { fontSize: 13, fontWeight: 500, color: "#4F46E5" },
};


/* ═══════════════════════════════════════
   MAIN WIDGET COMPONENT
   ═══════════════════════════════════════ */
export default function Widget() {
  // ─── Settings ───
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ─── Active Navigation View ───
  const [activeView, setActiveView] = useState<"home" | "editor">("home");
  const [homeFilter, setHomeFilter] = useState<"all" | "draft" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Desktop Editor Dock Tab ───
  const [desktopDockTab, setDesktopDockTab] = useState<"preview" | "optimize" | "clarify">("preview");

  // ─── Mobile View Mode (Write vs Preview) ───
  const [mobileTab, setMobileTab] = useState<"write" | "preview">("write");

  // ─── Import Modal ───
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // ─── Active Draft State ───
  const [currentProjectId, setCurrentProjectId] = useState<string>(generateUUID());
  const [projectTitle, setProjectTitle] = useState("Untitled Post");
  const [rawText, setRawText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [textImageLinks, setTextImageLinks] = useState<TextImageLink[]>([]);
  const [generalImages, setGeneralImages] = useState<ImageAttachment[]>([]);
  const [currentStatus, setCurrentStatus] = useState<ProjectDraft["status"]>("draft");

  // ─── AI Results ───
  const [generatedPostText, setGeneratedPostText] = useState("");
  const [visionSummary, setVisionSummary] = useState("");
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [suggestions, setSuggestions] = useState<PostSuggestions | null>(null);

  // ─── Processing State ───
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);
  const [generationStage, setGenerationStage] = useState<string | null>(null);
  const [liveStreamOutput, setLiveStreamOutput] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("StandAlone");
  const [allProjects, setAllProjects] = useState<ProjectDraft[]>([]);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generalFileRef = useRef<HTMLInputElement>(null);

  // ─── Load ───
  useEffect(() => {
    const loadedSettings = getStoredSettings();
    setSettings(loadedSettings);
    setAllProjects(getAllProjects());
  }, []);

  // ─── Autosave ───
  useEffect(() => {
    if (!settings.autoSaveEnabled || activeView === "home") return;
    const timeout = setTimeout(() => {
      saveActiveDraft({
        id: currentProjectId, title: projectTitle, rawText, tags,
        imageLinks: textImageLinks, generalImages, generatedPostText, visionSummary,
      });
      if (rawText.trim() || generatedPostText.trim()) {
        const project: ProjectDraft = {
          id: currentProjectId,
          title: projectTitle || rawText.slice(0, 35) || "Untitled Draft",
          rawText, tags, imageLinks: textImageLinks, generalImages,
          generatedPostText, visionSummary, clarificationQuestions,
          suggestions: suggestions || undefined,
          status: currentStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveProject(project);
        setAllProjects(getAllProjects());
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [currentProjectId, projectTitle, rawText, tags, textImageLinks, generalImages,
      generatedPostText, visionSummary, clarificationQuestions, suggestions, currentStatus,
      activeView, settings.autoSaveEnabled]);

  // ─── Backend Ping ───
  const testBackend = useCallback(async () => {
    try {
      const targetUrl = settings.backendUrl?.trim() || "http://localhost:8000";
      const res = await fetch(`${targetUrl}/health`, { cache: "no-store" });
      if (res.ok) { setSyncStatus("Connected"); return; }
      const localRes = await fetch("http://localhost:8000/health", { cache: "no-store" });
      setSyncStatus(localRes.ok ? "Connected" : "AI Disconnected");
    } catch {
      try {
        const localRes = await fetch("http://localhost:8000/health", { cache: "no-store" });
        if (localRes.ok) { setSyncStatus("Connected"); return; }
      } catch {}
      setSyncStatus("StandAlone");
    }
  }, [settings.backendUrl]);

  useEffect(() => {
    testBackend();
    const interval = setInterval(testBackend, 12000);
    return () => clearInterval(interval);
  }, [testBackend]);

  // ─── Settings Save ───
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    setIsSettingsOpen(false);
  };

  // ─── Media ───
  const handleGeneralFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setGeneralImages((prev) => [...prev, {
          id: generateUUID(), url: ev.target?.result as string, name: file.name, size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // ─── Tags ───
  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, "").replace(",", "");
      if (clean && !tags.includes(clean) && tags.length < 10) setTags((prev) => [...prev, clean]);
      setTagInput("");
    }
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  // ─── New Post ───
  const handleStartNewPost = () => {
    clearActiveDraft();
    const newId = generateUUID();
    setCurrentProjectId(newId); setProjectTitle("Untitled Post");
    setRawText(""); setTags([]); setTextImageLinks([]); setGeneralImages([]);
    setGeneratedPostText(""); setVisionSummary(""); setClarificationQuestions([]);
    setSuggestions(null); setCurrentStatus("draft");
    setActiveView("editor");
  };

  const handleStartWithTemplate = (text: string, title = "New Draft") => {
    clearActiveDraft();
    const newId = generateUUID();
    setCurrentProjectId(newId); setProjectTitle(title); setRawText(text);
    setTags([]); setTextImageLinks([]); setGeneralImages([]);
    setGeneratedPostText(""); setVisionSummary(""); setClarificationQuestions([]);
    setSuggestions(null); setCurrentStatus("draft");
    setActiveView("editor");
  };

  // ─── Import ───
  const handleConfirmImport = () => {
    if (!importText.trim()) return;
    handleStartWithTemplate(importText.trim(), importText.trim().split("\n")[0].slice(0, 35) || "Imported Post");
    setImportText(""); setIsImportModalOpen(false);
  };

  // ─── Open Project ───
  const handleOpenProject = (p: ProjectDraft) => {
    setCurrentProjectId(p.id); setProjectTitle(p.title); setRawText(p.rawText);
    setTags(p.tags || []); setTextImageLinks(p.imageLinks || []);
    setGeneralImages(p.generalImages || []);
    setGeneratedPostText(p.generatedPostText || ""); setVisionSummary(p.visionSummary || "");
    setClarificationQuestions(p.clarificationQuestions || []);
    setSuggestions(p.suggestions || null); setCurrentStatus(p.status || "draft");
    setActiveView("editor");
    setMobileTab(p.generatedPostText ? "preview" : "write");
  };

  // ─── Delete ───
  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject(id);
    setAllProjects(getAllProjects());
  };

  // ─── Copy ───
  const handleQuickCopy = async (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDraftId(id); setTimeout(() => setCopiedDraftId(null), 2000);
    } catch {}
  };

  // ─── AI Clarify ───
  const handleTriggerClarify = async () => {
    if (!rawText.trim()) return;
    setIsClarifying(true);
    setDesktopDockTab("clarify");
    setMobileTab("preview");
    try {
      const qList = await generateClarifyingQuestions(rawText, settings);
      setClarificationQuestions(qList);
    } catch (e) { console.error("Clarification error:", e); }
    finally { setIsClarifying(false); }
  };

  const handleAnswerQuestion = (questionId: string, answer: string, isCustom = false) => {
    setClarificationQuestions((prev) =>
      prev.map((q) => q.id === questionId
        ? { ...q, selectedAnswer: isCustom ? undefined : answer, customAnswer: isCustom ? answer : undefined }
        : q
      )
    );
  };

  // ─── AI Generate ───
  const handleGeneratePost = async () => {
    if (!rawText.trim()) return;
    setIsGenerating(true); setGenerationStage("Drafting..."); setLiveStreamOutput("");
    setDesktopDockTab("preview");
    setMobileTab("preview");
    try {
      const result = await generatePostDirect({
        rawText, tags, imageLinks: textImageLinks, generalImages,
        answeredQuestions: clarificationQuestions, settings,
        onProgress: (stage, chunk) => { setGenerationStage(stage); if (chunk) setLiveStreamOutput(chunk); },
      });
      setGeneratedPostText(result.postText); setVisionSummary(result.visionSummary);
      setCurrentStatus("ready_to_post");
      const project: ProjectDraft = {
        id: currentProjectId, title: projectTitle || rawText.slice(0, 35) || "Untitled Post",
        rawText, tags, imageLinks: textImageLinks, generalImages,
        generatedPostText: result.postText, visionSummary: result.visionSummary,
        clarificationQuestions, suggestions: suggestions || undefined,
        status: "ready_to_post", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      saveProject(project); setAllProjects(getAllProjects());
      generatePostSuggestions(result.postText, rawText, settings)
        .then((sug) => setSuggestions(sug))
        .catch((err) => console.warn("Suggestions error:", err));
    } catch (err: any) {
      alert(`Generation Error: ${err.message || "Failed to generate post."}`);
    } finally { setIsGenerating(false); setGenerationStage(null); }
  };

  // ─── Computed ───
  const filteredProjects = allProjects.filter((p) => {
    const matchesFilter =
      homeFilter === "all" ||
      (homeFilter === "draft" && (p.status === "draft" || !p.status)) ||
      (homeFilter === "completed" && (p.status === "ready_to_post" || p.status === "posted"));
    if (!matchesFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.title?.toLowerCase().includes(q) ||
      (p.generatedPostText || p.rawText || "").toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q));
  });

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;
  const draftCount = allProjects.filter((p) => p.status === "draft" || !p.status).length;
  const completedCount = allProjects.filter((p) => p.status === "ready_to_post" || p.status === "posted").length;
  const isConnected = syncStatus === "Connected";

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
    catch { return ""; }
  };

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <div style={s.shell}>
      {/* ── Hidden file input ── */}
      <input ref={generalFileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleGeneralFiles} />

      {/* ═══ GLOBAL STYLE (keyframes & responsive rules) ═══ */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.2s ease-out; }
        .hover-lift:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: #D1D5DB !important; }
        .hover-accent:hover { background: #EEF2FF !important; color: #4F46E5 !important; }

        @media (min-width: 900px) {
          .editor-split-container { display: flex !important; }
          .editor-pane-left { display: flex !important; flex: 1 1 0% !important; border-right: 1px solid #E5E7EB !important; min-width: 0 !important; }
          .editor-pane-right { display: flex !important; width: 480px !important; flex-shrink: 0 !important; min-width: 0 !important; }
          .mobile-mode-switcher { display: none !important; }
          .header-full-title { display: inline !important; }
          .header-short-title { display: none !important; }
          .header-status-text { display: inline !important; }
        }

        @media (max-width: 899px) {
          .editor-split-container { display: flex !important; flex-direction: column !important; }
          .mobile-mode-switcher { display: flex !important; }
          .editor-pane-left.mobile-hidden,
          .editor-pane-right.mobile-hidden { display: none !important; }
          .editor-pane-left { flex: 1 1 0% !important; width: 100% !important; border-right: none !important; min-width: 0 !important; }
          .editor-pane-right { flex: 1 1 0% !important; width: 100% !important; border-left: none !important; min-width: 0 !important; }
          .header-full-title { display: none !important; }
          .header-short-title { display: inline !important; }
          .header-status-text { display: none !important; }
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerLogo}><IconLinkedIn className="w-4 h-4" /></div>
          <span style={s.headerTitle}>
            <span className="header-full-title">LinkedIn AI Studio</span>
            <span className="header-short-title">LinkedIn AI</span>
          </span>
        </div>

        <nav style={s.headerNav}>
          <button style={s.navBtn(activeView === "home")} onClick={() => setActiveView("home")}>Library</button>
          <button style={s.navBtn(activeView === "editor")} onClick={() => activeView === "editor" ? null : handleStartNewPost()}>Studio</button>
        </nav>

        <div style={s.headerRight}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={s.statusDot(isConnected)} />
            <span className="header-status-text" style={{ fontSize: 11, fontWeight: 500, color: isConnected ? "#059669" : "#D97706" }}>
              {isConnected ? "Connected" : syncStatus}
            </span>
          </div>
          <button style={s.headerBtn} onClick={() => setIsSettingsOpen(true)} title="Settings" className="hover-accent">
            <IconSettings className="w-4 h-4" />
          </button>
          <button style={s.newPostBtn} onClick={handleStartNewPost} onMouseOver={(e) => (e.currentTarget.style.background = "#4338CA")} onMouseOut={(e) => (e.currentTarget.style.background = "#4F46E5")}>
            <IconPlus className="w-3.5 h-3.5" />
            <span className="header-full-title">New Post</span>
            <span className="header-short-title">New</span>
          </button>
        </div>
      </header>

      <div style={s.main}>
        {/* ═══════════════════════════════════════
            HOME / LIBRARY VIEW
            ═══════════════════════════════════════ */}
        {activeView === "home" && (
          <div style={s.homeContainer} className="fade-in">
            <div style={s.homeHeader}>
              <div>
                <h1 style={s.homeTitle}>Content Library</h1>
                <p style={s.homeSubtitle}>Your AI-powered LinkedIn post workspace</p>
              </div>
              <div style={s.homeStats}>
                <div style={s.statCard}>
                  <span style={s.statLabel}>Total Posts</span>
                  <span style={s.statValue}>{allProjects.length}</span>
                </div>
                <div style={s.statCard}>
                  <span style={s.statLabel}>Drafts</span>
                  <span style={s.statValue}>{draftCount}</span>
                </div>
                <div style={s.statCard}>
                  <span style={s.statLabel}>Ready</span>
                  <span style={s.statValue}>{completedCount}</span>
                </div>
                <div style={s.statCard}>
                  <span style={s.statLabel}>Backend</span>
                  <span style={{ ...s.statValue, fontSize: 15, color: isConnected ? "#059669" : "#D97706" }}>
                    {isConnected ? "● Online" : "○ Offline"}
                  </span>
                </div>
              </div>
            </div>

            {/* Search & Filter */}
            <div style={s.searchBar}>
              <div style={{ position: "relative", flex: 1 }}>
                <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>
                  <IconSearch className="w-3.5 h-3.5" />
                </div>
                <input
                  style={s.searchInput}
                  placeholder="Search posts by title, content, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#4F46E5")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                />
              </div>
              <button style={{ ...s.toolBtn }} onClick={() => setIsImportModalOpen(true)}>
                <IconUpload className="w-3.5 h-3.5" /> Import
              </button>
            </div>

            <div style={s.filterBtns}>
              {(["all", "draft", "completed"] as const).map((f) => (
                <button key={f} style={s.filterBtn(homeFilter === f)} onClick={() => setHomeFilter(f)}>
                  {f === "all" ? "All" : f === "draft" ? "Drafts" : "Completed"}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div style={s.homeGrid} className="no-scrollbar">
              {filteredProjects.length === 0 ? (
                <div style={{ ...s.emptyState, gridColumn: "1 / -1" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "#F4F6FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconFile className="w-6 h-6" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#6B7280" }}>No posts yet</p>
                  <p style={{ fontSize: 12, color: "#9CA3AF" }}>Click &quot;New Post&quot; to start creating</p>
                </div>
              ) : (
                filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    style={s.draftCard}
                    className="hover-lift"
                    onClick={() => handleOpenProject(p)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={s.draftTitle}>{p.title || "Untitled"}</span>
                      <span style={s.statusBadge(p.status || "draft")}>{(p.status || "draft").replace(/_/g, " ")}</span>
                    </div>
                    <p style={s.draftPreview}>
                      {p.generatedPostText || p.rawText || "Empty draft"}
                    </p>
                    <div style={s.draftMeta}>
                      <span style={s.draftDate}>{formatDate(p.updatedAt)}</span>
                      <div style={s.draftActions}>
                        {(p.generatedPostText || p.rawText) && (
                          <button
                            style={s.draftActBtn}
                            className="hover-accent"
                            onClick={(e) => handleQuickCopy(p.generatedPostText || p.rawText, p.id, e)}
                            title="Copy"
                          >
                            {copiedDraftId === p.id ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          style={s.draftActBtn}
                          onClick={(e) => handleDeleteDraft(p.id, e)}
                          title="Delete"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            EDITOR VIEW (Split: Left Editor + Right Panel)
            ═══════════════════════════════════════ */}
        {activeView === "editor" && (
          <div style={s.editorContainer} className="editor-split-container fade-in">
            {/* ── Mobile Mode Segmented Switcher ── */}
            <div className="mobile-mode-switcher" style={s.mobileSwitcher}>
              <button
                style={s.mobileSwitcherBtn(mobileTab === "write")}
                onClick={() => setMobileTab("write")}
              >
                ✍️ Write & Notes
              </button>
              <button
                style={s.mobileSwitcherBtn(mobileTab === "preview")}
                onClick={() => setMobileTab("preview")}
              >
                👁️ Preview & AI {generatedPostText ? "✓" : ""}
              </button>
            </div>

            {/* ── LEFT: Editor ── */}
            <div style={s.editorLeft} className={`editor-pane-left ${mobileTab !== "write" ? "mobile-hidden" : ""}`}>
              {/* Toolbar */}
              <div style={s.editorToolbar}>
                <div style={s.editorToolbarLeft}>
                  <button style={{ ...s.headerBtn, marginRight: 4 }} onClick={() => setActiveView("home")} title="Back to Library" className="hover-accent">
                    <IconArrowLeft className="w-4 h-4" />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{projectTitle}</span>
                  <span style={s.statusBadge(currentStatus)}>{(currentStatus || "draft").replace(/_/g, " ")}</span>
                </div>
                <div style={s.editorToolbarRight}>
                  <button style={s.toolBtn} onClick={() => generalFileRef.current?.click()} className="hover-accent">
                    <IconImage className="w-3.5 h-3.5" /> Media
                  </button>
                  <button style={s.toolBtn} onClick={() => setShowTagInput(!showTagInput)} className="hover-accent">
                    <IconHash className="w-3.5 h-3.5" /> Tags
                  </button>
                  <button style={s.toolBtn} onClick={handleTriggerClarify} disabled={isClarifying || !rawText.trim()} className="hover-accent"
                    onMouseOver={(e) => { if (!isClarifying && rawText.trim()) e.currentTarget.style.borderColor = "#4F46E5"; }}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                  >
                    <IconLightbulb className="w-3.5 h-3.5" /> {isClarifying ? "Analyzing..." : "Refine"}
                  </button>
                  <button
                    style={{ ...s.toolBtnAccent, opacity: isGenerating || !rawText.trim() ? 0.5 : 1 }}
                    onClick={handleGeneratePost}
                    disabled={isGenerating || !rawText.trim()}
                    onMouseOver={(e) => { if (!isGenerating && rawText.trim()) e.currentTarget.style.background = "#4338CA"; }}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#4F46E5")}
                  >
                    <IconSparkles className="w-3.5 h-3.5" /> {isGenerating ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>

              {/* Tag area */}
              {(showTagInput || tags.length > 0) && (
                <div style={s.tagArea}>
                  {tags.map((t) => (
                    <span key={t} style={s.tagChip}>
                      #{t} <button style={s.tagRemove} onClick={() => removeTag(t)}>×</button>
                    </span>
                  ))}
                  {showTagInput && (
                    <input
                      style={s.tagInputField}
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={addTag}
                      autoFocus
                    />
                  )}
                </div>
              )}

              {/* Images */}
              {generalImages.length > 0 && (
                <div style={s.imageRow}>
                  {generalImages.map((img) => (
                    <div key={img.id} style={{ position: "relative" }}>
                      <img src={img.url} alt={img.name} style={s.imageThumbnail} />
                      <button style={s.imageRemoveBtn} onClick={() => setGeneralImages((prev) => prev.filter((x) => x.id !== img.id))}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Inspiration pills */}
              {!rawText.trim() && (
                <div style={s.pillsRow}>
                  {INSPIRATION_PILLS.map((p, i) => (
                    <button key={i} style={s.pill} onClick={() => handleStartWithTemplate(p.text, p.label.replace(/^.\s/, ""))}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.background = "#EEF2FF"; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "#F4F6FB"; }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Main writing area */}
              <div style={s.editorBody}>
                <input
                  style={s.titleInput}
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Post Title"
                />
                <textarea
                  ref={textareaRef}
                  style={s.textarea}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Start writing your raw notes, ideas, bullet points, or full draft here...&#10;&#10;The AI will transform your notes into a polished, engaging LinkedIn post."
                />
              </div>

              {/* Footer */}
              <div style={s.editorFooter}>
                <span style={s.footerMeta}>{wordCount} words · {charCount} chars</span>
                <span style={{ ...s.footerMeta, color: "#4F46E5", fontWeight: 500 }}>Auto-saved</span>
              </div>
            </div>

            {/* ── RIGHT: Preview / Optimize / Clarify Panel ── */}
            <div style={s.rightPanel} className={`editor-pane-right ${mobileTab !== "preview" ? "mobile-hidden" : ""}`}>
              <div style={s.rightTabs}>
                <button style={s.rightTab(desktopDockTab === "preview")} onClick={() => setDesktopDockTab("preview")}>
                  <span style={{ display: "inline-flex", marginRight: 4 }}><IconEye className="w-3 h-3" /></span> Preview
                </button>
                <button style={s.rightTab(desktopDockTab === "optimize")} onClick={() => setDesktopDockTab("optimize")}>
                  <span style={{ display: "inline-flex", marginRight: 4 }}><IconTarget className="w-3 h-3" /></span> Optimize
                </button>
                <button style={s.rightTab(desktopDockTab === "clarify")} onClick={() => setDesktopDockTab("clarify")}>
                  <span style={{ display: "inline-flex", marginRight: 4 }}><IconLightbulb className="w-3 h-3" /></span> Clarify
                </button>
              </div>

              <div style={{ ...s.rightBody, position: "relative" }}>
                {/* Generation loading overlay */}
                {isGenerating && (
                  <div style={s.loadingOverlay}>
                    <div style={s.loadingSpinner} />
                    <p style={s.loadingText}>{generationStage || "Generating..."}</p>
                    {liveStreamOutput && (
                      <p style={{ fontSize: 12, color: "#6B7280", maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>
                        {liveStreamOutput.slice(0, 200)}...
                      </p>
                    )}
                  </div>
                )}

                {/* ── Tab: Preview ── */}
                {desktopDockTab === "preview" && (
                  <div className="fade-in">
                    {generatedPostText ? (
                      <>
                        <div style={s.previewCard}>
                          <div style={s.previewHeader}>
                            <div style={s.previewAvatar}>
                              {settings.authorName ? settings.authorName.charAt(0).toUpperCase() : "P"}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={s.previewName}>{settings.authorName || "Author"}</p>
                              <p style={s.previewHeadline}>{settings.authorHeadline || "LinkedIn AI Studio"}</p>
                              <p style={s.previewTime}>Just now · 🌐</p>
                            </div>
                          </div>
                          <div style={s.previewBody}>{generatedPostText}</div>
                          {generalImages.length > 0 && (
                            <div style={{ padding: "0 16px 12px", display: "flex", gap: 6, overflowX: "auto" }}>
                              {generalImages.map((img) => (
                                <img key={img.id} src={img.url} alt="" style={{ height: 120, borderRadius: 8, objectFit: "cover" }} />
                              ))}
                            </div>
                          )}
                          <div style={s.previewActions}>
                            <button style={s.previewActionBtn}>👍 Like</button>
                            <button style={s.previewActionBtn}>💬 Comment</button>
                            <button style={s.previewActionBtn}>🔄 Repost</button>
                            <button style={s.previewActionBtn}>📤 Send</button>
                          </div>
                        </div>

                        {/* Copy button */}
                        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                          <button
                            style={{ ...s.toolBtnAccent, flex: 1, justifyContent: "center" }}
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(generatedPostText); setCopiedDraftId(currentProjectId); setTimeout(() => setCopiedDraftId(null), 2000); } catch {}
                            }}
                          >
                            {copiedDraftId === currentProjectId ? <><IconCheck className="w-3.5 h-3.5" /> Copied!</> : <><IconCopy className="w-3.5 h-3.5" /> Copy to Clipboard</>}
                          </button>
                        </div>

                        {visionSummary && (
                          <div style={{ marginTop: 12, padding: "10px 12px", background: "#F4F6FB", borderRadius: 8, fontSize: 11, color: "#6B7280" }}>
                            <strong style={{ color: "#374151" }}>Vision Analysis:</strong> {visionSummary}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={s.emptyState}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F4F6FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <IconEye className="w-5 h-5" />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}>Post preview will appear here</p>
                        <p style={{ fontSize: 11, color: "#9CA3AF" }}>Write your notes and click Generate</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tab: Optimize ── */}
                {desktopDockTab === "optimize" && (
                  <div className="fade-in">
                    {suggestions ? (
                      <>
                        {/* Viral Score */}
                        <div style={s.viralMeter}>
                          <div>
                            <span style={s.viralScore}>{suggestions.viralScore}</span>
                            <span style={{ fontSize: 14, color: "#6B7280" }}>/100</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Viral Score</p>
                            <div style={{ width: "100%", height: 6, background: "#E5E7EB", borderRadius: 3 }}>
                              <div style={{ width: `${suggestions.viralScore}%`, height: "100%", background: suggestions.viralScore >= 80 ? "#059669" : suggestions.viralScore >= 60 ? "#D97706" : "#DC2626", borderRadius: 3, transition: "width 0.5s ease" }} />
                            </div>
                          </div>
                        </div>

                        {/* Critique */}
                        {suggestions.scoreCritique && suggestions.scoreCritique.length > 0 && (
                          <div style={s.sugSection}>
                            <p style={s.sugTitle}><span style={{ color: "#4F46E5" }}><IconTrendingUp className="w-3.5 h-3.5" /></span> Score Breakdown</p>
                            {suggestions.scoreCritique.map((c, i) => (
                              <div key={i} style={{ ...s.sugCard, cursor: "default" }}>• {c}</div>
                            ))}
                          </div>
                        )}

                        {/* Alternative Hooks */}
                        {suggestions.alternativeHooks && suggestions.alternativeHooks.length > 0 && (
                          <div style={s.sugSection}>
                            <p style={s.sugTitle}><span style={{ color: "#4F46E5" }}><IconRocket className="w-3.5 h-3.5" /></span> Alternative Hooks</p>
                            {suggestions.alternativeHooks.map((h, i) => (
                              <div key={i} style={s.sugCard} onClick={() => setGeneratedPostText((prev) => h.text + "\n\n" + prev.split("\n").slice(1).join("\n"))}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.background = "#EEF2FF"; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "#F4F6FB"; }}
                              >
                                <p style={s.sugLabel}>{h.style}</p>
                                <p>{h.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CTAs */}
                        {suggestions.suggestedCTAs && suggestions.suggestedCTAs.length > 0 && (
                          <div style={s.sugSection}>
                            <p style={s.sugTitle}><span style={{ color: "#4F46E5" }}><IconSend className="w-3.5 h-3.5" /></span> Suggested CTAs</p>
                            {suggestions.suggestedCTAs.map((c, i) => (
                              <div key={i} style={s.sugCard} onClick={() => setGeneratedPostText((prev) => prev + "\n\n" + c)}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.background = "#EEF2FF"; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "#F4F6FB"; }}
                              >
                                {c}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tone Variations */}
                        {suggestions.toneVariations && suggestions.toneVariations.length > 0 && (
                          <div style={s.sugSection}>
                            <p style={s.sugTitle}><span style={{ color: "#4F46E5" }}><IconSparkles className="w-3.5 h-3.5" /></span> Tone Variations</p>
                            {suggestions.toneVariations.map((t, i) => (
                              <div key={i} style={s.sugCard}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.background = "#EEF2FF"; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "#F4F6FB"; }}
                              >
                                <p style={s.sugLabel}>{t.tone}</p>
                                <p>{t.previewText}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Hashtags */}
                        {suggestions.recommendedHashtags && suggestions.recommendedHashtags.length > 0 && (
                          <div style={s.sugSection}>
                            <p style={s.sugTitle}><span style={{ color: "#4F46E5" }}><IconHash className="w-3.5 h-3.5" /></span> Recommended Hashtags</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {suggestions.recommendedHashtags.map((h, i) => (
                                <span key={i} style={s.tagChip}>{h}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Best time */}
                        {suggestions.bestPostingTime && (
                          <div style={{ ...s.sugCard, cursor: "default", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#4F46E5", flexShrink: 0 }}><IconClock className="w-4 h-4" /></span>
                            <div>
                              <p style={{ fontSize: 10, fontWeight: 600, color: "#4F46E5", textTransform: "uppercase", letterSpacing: "0.04em" }}>Best Posting Time</p>
                              <p style={{ fontSize: 12, color: "#374151" }}>{suggestions.bestPostingTime}</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={s.emptyState}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F4F6FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <IconTarget className="w-5 h-5" />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}>Optimization insights appear here</p>
                        <p style={{ fontSize: 11, color: "#9CA3AF" }}>Generate a post first to see recommendations</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tab: Clarify ── */}
                {desktopDockTab === "clarify" && (
                  <div className="fade-in">
                    {isClarifying ? (
                      <div style={s.emptyState}>
                        <div style={s.loadingSpinner} />
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#4F46E5" }}>Analyzing your notes for clarification...</p>
                      </div>
                    ) : clarificationQuestions.length > 0 ? (
                      <>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
                          AI Clarification Questions
                        </p>
                        {clarificationQuestions.map((q) => (
                          <div key={q.id} style={s.clarifyCard}>
                            <p style={s.clarifyQ}>{q.question}</p>
                            {q.contextHint && <p style={s.clarifyHint}>💡 {q.contextHint}</p>}
                            <div style={s.clarifyOptions}>
                              {q.suggestedAnswers.map((a, ai) => (
                                <button
                                  key={ai}
                                  style={s.clarifyOption(q.selectedAnswer === a)}
                                  onClick={() => handleAnswerQuestion(q.id, a)}
                                  onMouseOver={(e) => { if (q.selectedAnswer !== a) e.currentTarget.style.borderColor = "#C7D2FE"; }}
                                  onMouseOut={(e) => { if (q.selectedAnswer !== a) e.currentTarget.style.borderColor = "#E5E7EB"; }}
                                >
                                  {a}
                                </button>
                              ))}
                              <input
                                style={{ ...s.tagInputField, width: "100%", padding: "8px 12px" }}
                                placeholder="Custom answer..."
                                value={q.customAnswer || ""}
                                onChange={(e) => handleAnswerQuestion(q.id, e.target.value, true)}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={s.emptyState}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F4F6FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <IconLightbulb className="w-5 h-5" />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#6B7280" }}>AI clarification panel</p>
                        <p style={{ fontSize: 11, color: "#9CA3AF" }}>Click &quot;Refine&quot; in the toolbar to get AI questions</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ SETTINGS MODAL ═══ */}
      {isSettingsOpen && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}>
          <div style={s.modal} className="fade-in">
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Settings</h2>
              <button style={s.headerBtn} onClick={() => setIsSettingsOpen(false)} className="hover-accent">
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <div style={s.modalBody}>
              <div>
                <label style={s.fieldLabel}>AI Provider</label>
                <select
                  style={s.fieldSelect}
                  value={settings.aiProvider}
                  onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value as AppSettings["aiProvider"] })}
                >
                  <option value="auto">Auto (try all)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="nvidia">NVIDIA NIM</option>
                  <option value="local_backend">Local Backend Only</option>
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Gemini API Key</label>
                <input style={s.fieldInput} type="password" value={settings.geminiApiKey} onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })} placeholder="Enter your Gemini API key" />
              </div>
              <div>
                <label style={s.fieldLabel}>NVIDIA API Key</label>
                <input style={s.fieldInput} type="password" value={settings.nvidiaApiKey} onChange={(e) => setSettings({ ...settings, nvidiaApiKey: e.target.value })} placeholder="Enter your NVIDIA API key" />
              </div>
              <div>
                <label style={s.fieldLabel}>Backend URL</label>
                <input style={s.fieldInput} value={settings.backendUrl} onChange={(e) => setSettings({ ...settings, backendUrl: e.target.value })} placeholder="http://localhost:8000" />
              </div>
              <div>
                <label style={s.fieldLabel}>Author Name</label>
                <input style={s.fieldInput} value={settings.authorName} onChange={(e) => setSettings({ ...settings, authorName: e.target.value })} />
              </div>
              <div>
                <label style={s.fieldLabel}>Author Headline</label>
                <input style={s.fieldInput} value={settings.authorHeadline} onChange={(e) => setSettings({ ...settings, authorHeadline: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={settings.autoSaveEnabled}
                  onChange={(e) => setSettings({ ...settings, autoSaveEnabled: e.target.checked })}
                  style={{ accentColor: "#4F46E5" }}
                />
                <label style={{ fontSize: 13, color: "#374151" }}>Auto-save enabled</label>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.modalBtnSecondary} onClick={() => setIsSettingsOpen(false)}>Cancel</button>
              <button style={s.modalBtnPrimary} onClick={() => handleSaveSettings(settings)}
                onMouseOver={(e) => (e.currentTarget.style.background = "#4338CA")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#4F46E5")}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ IMPORT MODAL ═══ */}
      {isImportModalOpen && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setIsImportModalOpen(false); }}>
          <div style={{ ...s.modal, width: 480 }} className="fade-in">
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Import Content</h2>
              <button style={s.headerBtn} onClick={() => setIsImportModalOpen(false)} className="hover-accent">
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <div style={s.modalBody}>
              <p style={{ fontSize: 12, color: "#6B7280" }}>Paste an existing LinkedIn post, bullet points, or raw notes</p>
              <textarea
                style={s.importTextarea}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your content here..."
              />
            </div>
            <div style={s.modalFooter}>
              <button style={s.modalBtnSecondary} onClick={() => setIsImportModalOpen(false)}>Cancel</button>
              <button style={s.modalBtnPrimary} onClick={handleConfirmImport}
                onMouseOver={(e) => (e.currentTarget.style.background = "#4338CA")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#4F46E5")}
              >
                Import & Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}