"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  getStoredActiveDraft,
  saveActiveDraft,
  clearActiveDraft,
  getAllProjects,
  saveProject,
  deleteProject,
  markProjectStatus,
  generateUUID,
} from "../lib/storage";
import {
  generatePostDirect,
  generateClarifyingQuestions,
  generatePostSuggestions,
} from "../lib/aiEngine";
import AIChatClarifier from "./AIChatClarifier";
import PostSuggestionsLab from "./PostSuggestionsLab";
import LinkedInPreviewCard from "./LinkedInPreviewCard";
import SettingsDrawer from "./SettingsDrawer";
import {
  SparklesIcon,
  HelpCircleIcon,
  LightbulbIcon,
  EyeIcon,
  FolderProjectsIcon,
  SettingsIcon,
  ImageIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  CheckIcon,
} from "./Icons";

const INSPIRATION_PILLS = [
  { label: "🚀 Feature Launch", text: "We just launched our new project today! Here is the breakdown of why we built it, the architecture we used, and what we learned:" },
  { label: "💡 Hard-Won Lesson", text: "3 days ago, our entire pipeline failed in production. It felt frustrating at first, but here is the exact lesson it taught us about scaling:" },
  { label: "📈 10x Growth", text: "We managed to achieve 10x growth and reduce latency by over 60% with one key architectural change. Here is how:" },
  { label: "🔧 Tech Stack", text: "Here is the raw architectural breakdown of our latest stack — why we chose it, what worked, and what we would do differently:" },
  { label: "🤝 Team Success", text: "Huge milestone for our team this week! Building in public taught us that consistency beats intensity. Here is our story:" },
];

export default function Widget() {
  // ─── Settings & Theme ───
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isLightMode = settings.theme === "minimal-light";

  // ─── Active Navigation View (Starts on Home) ───
  const [activeView, setActiveView] = useState<"home" | "editor" | "clarify" | "preview" | "suggestions">("home");
  const [homeFilter, setHomeFilter] = useState<"all" | "draft" | "completed">("all");

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generalFileRef = useRef<HTMLInputElement>(null);

  // ─── Load Initial State ───
  useEffect(() => {
    const loadedSettings = getStoredSettings();
    setSettings(loadedSettings);
    document.documentElement.setAttribute("data-theme", loadedSettings.theme);

    const projects = getAllProjects();
    setAllProjects(projects);
  }, []);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // ─── Realtime Autosave ───
  useEffect(() => {
    if (!settings.autoSaveEnabled || activeView === "home") return;
    const timeout = setTimeout(() => {
      saveActiveDraft({
        id: currentProjectId,
        title: projectTitle,
        rawText,
        tags,
        imageLinks: textImageLinks,
        generalImages,
        generatedPostText,
        visionSummary,
      });

      if (rawText.trim() || generatedPostText.trim()) {
        const project: ProjectDraft = {
          id: currentProjectId,
          title: projectTitle || rawText.slice(0, 35) || "Untitled Draft",
          rawText,
          tags,
          imageLinks: textImageLinks,
          generalImages,
          generatedPostText,
          visionSummary,
          clarificationQuestions,
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
  }, [
    currentProjectId,
    projectTitle,
    rawText,
    tags,
    textImageLinks,
    generalImages,
    generatedPostText,
    visionSummary,
    clarificationQuestions,
    suggestions,
    currentStatus,
    activeView,
    settings.autoSaveEnabled,
  ]);

  // ─── Backend Connectivity Ping ───
  const testBackend = useCallback(async () => {
    try {
      const res = await fetch(`${settings.backendUrl}/health`, { cache: "no-store" });
      if (res.ok) {
        setSyncStatus("Connected");
      } else {
        setSyncStatus("AI Disconnected");
      }
    } catch {
      setSyncStatus("StandAlone");
    }
  }, [settings.backendUrl]);

  useEffect(() => {
    testBackend();
    const interval = setInterval(testBackend, 12000);
    return () => clearInterval(interval);
  }, [testBackend]);

  // ─── Media Attachment ───
  const handleGeneralFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const attachment: ImageAttachment = {
          id: generateUUID(),
          url: ev.target?.result as string,
          name: file.name,
          size: file.size,
        };
        setGeneralImages((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // ─── Tag Management ───
  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, "").replace(",", "");
      if (clean && !tags.includes(clean) && tags.length < 10) {
        setTags((prev) => [...prev, clean]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // ─── Start New Post Flow ───
  const handleStartNewPost = () => {
    clearActiveDraft();
    const newId = generateUUID();
    setCurrentProjectId(newId);
    setProjectTitle("Untitled Post");
    setRawText("");
    setTags([]);
    setTextImageLinks([]);
    setGeneralImages([]);
    setGeneratedPostText("");
    setVisionSummary("");
    setClarificationQuestions([]);
    setSuggestions(null);
    setCurrentStatus("draft");
    setActiveView("editor");
  };

  // ─── Open Existing Post from Home ───
  const handleOpenProject = (p: ProjectDraft) => {
    setCurrentProjectId(p.id);
    setProjectTitle(p.title);
    setRawText(p.rawText);
    setTags(p.tags || []);
    setTextImageLinks(p.imageLinks || []);
    setGeneralImages(p.generalImages || []);
    setGeneratedPostText(p.generatedPostText || "");
    setVisionSummary(p.visionSummary || "");
    setClarificationQuestions(p.clarificationQuestions || []);
    setSuggestions(p.suggestions || null);
    setCurrentStatus(p.status || "draft");

    if (p.status === "ready_to_post" || p.status === "posted" || p.generatedPostText) {
      setActiveView("preview");
    } else {
      setActiveView("editor");
    }
  };

  // ─── Delete Draft ───
  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject(id);
    setAllProjects(getAllProjects());
  };

  // ─── AI Clarification (Refine) ───
  const handleTriggerClarify = async () => {
    if (!rawText.trim()) return;
    setIsClarifying(true);
    setActiveView("clarify");
    try {
      const qList = await generateClarifyingQuestions(rawText, settings);
      setClarificationQuestions(qList);
    } catch (e) {
      console.error("Clarification error:", e);
    } finally {
      setIsClarifying(false);
    }
  };

  const handleAnswerQuestion = (questionId: string, answer: string, isCustom = false) => {
    setClarificationQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              selectedAnswer: isCustom ? undefined : answer,
              customAnswer: isCustom ? answer : undefined,
            }
          : q
      )
    );
  };

  // ─── AI Generate Post ───
  const handleGeneratePost = async () => {
    if (!rawText.trim()) return;
    setIsGenerating(true);
    setGenerationStage("Drafting high-converting post...");
    setLiveStreamOutput("");

    try {
      const result = await generatePostDirect({
        rawText,
        tags,
        imageLinks: textImageLinks,
        generalImages,
        answeredQuestions: clarificationQuestions,
        settings,
        onProgress: (stage, chunk) => {
          setGenerationStage(stage);
          if (chunk) setLiveStreamOutput(chunk);
        },
      });

      setGeneratedPostText(result.postText);
      setVisionSummary(result.visionSummary);
      setCurrentStatus("ready_to_post");

      // Save as completed
      const project: ProjectDraft = {
        id: currentProjectId,
        title: projectTitle || rawText.slice(0, 35) || "Untitled Post",
        rawText,
        tags,
        imageLinks: textImageLinks,
        generalImages,
        generatedPostText: result.postText,
        visionSummary: result.visionSummary,
        clarificationQuestions,
        suggestions: suggestions || undefined,
        status: "ready_to_post",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveProject(project);
      setAllProjects(getAllProjects());

      setActiveView("preview");

      // Background suggestions
      generatePostSuggestions(result.postText, rawText, settings)
        .then((sug) => setSuggestions(sug))
        .catch((err) => console.warn("Suggestions error:", err));

    } catch (err: any) {
      alert(`Generation Error: ${err.message || "Failed to generate post."}`);
    } finally {
      setIsGenerating(false);
      setGenerationStage(null);
    }
  };

  const allImageUrls = [
    ...textImageLinks.flatMap((l) => l.images.map((i) => i.url)),
    ...generalImages.map((i) => i.url),
  ];

  // Filter projects for Home feed
  const filteredProjects = allProjects.filter((p) => {
    if (homeFilter === "draft") return p.status === "draft" || !p.status;
    if (homeFilter === "completed") return p.status === "ready_to_post" || p.status === "posted";
    return true;
  });

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-[#f8fafc] text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Hidden File Input */}
      <input
        ref={generalFileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGeneralFiles}
      />

      {/* Settings Modal */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSet) => {
          setSettings(newSet);
          saveStoredSettings(newSet);
        }}
        syncStatus={syncStatus}
        onTestBackend={testBackend}
        isLightMode={isLightMode}
      />

      {/* Mobile Card Shell (390px - 440px Centered) */}
      <div className="w-full max-w-md min-h-[100dvh] bg-white flex flex-col shadow-xl relative">
        
        {/* ─── 1. TOP HEADER (Exact Clean Style) ─── */}
        <header className="pt-10 pb-3 px-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          {activeView === "home" ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
                <SparklesIcon className="w-4 h-4" />
              </div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                LinkedIn AI Studio
              </h1>
            </div>
          ) : (
            <button
              onClick={() => setActiveView("home")}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              ← Back
            </button>
          )}

          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            {activeView === "home"
              ? ""
              : activeView === "editor"
              ? "New Post"
              : activeView === "clarify"
              ? "Ask AI to Refine"
              : activeView === "preview"
              ? "Post Preview"
              : "Optimization Lab"}
          </h2>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </header>

        {/* ─── 2. MAIN BODY ─── */}
        <main className="flex-1 flex flex-col px-5 py-4 overflow-y-auto">
          {/* Live Streaming Banner */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full p-3 rounded-2xl bg-indigo-50 border border-indigo-100 mb-3 flex flex-col gap-2 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-indigo-900">{generationStage}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Streaming
                  </span>
                </div>
                {liveStreamOutput && (
                  <div className="p-2.5 rounded-xl text-[11px] font-mono max-h-24 overflow-y-auto bg-white border border-indigo-100 text-slate-800">
                    {liveStreamOutput}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════════════════════════════════════════════
              HOME VIEW: DRAFTS & COMPLETED FEED / EMPTY STATE
             ══════════════════════════════════════════════════ */}
          {activeView === "home" && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {/* Home Filter Segmented Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
                  {[
                    { id: "all", label: "All Posts", count: allProjects.length },
                    { id: "draft", label: "Drafts", count: allProjects.filter((p) => p.status === "draft" || !p.status).length },
                    { id: "completed", label: "Completed", count: allProjects.filter((p) => p.status === "ready_to_post" || p.status === "posted").length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setHomeFilter(tab.id as any)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
                        homeFilter === tab.id
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {tab.label} {tab.count > 0 && `(${tab.count})`}
                    </button>
                  ))}
                </div>

                {/* ─── EMPTY STATE (No Drafts Available) ─── */}
                {filteredProjects.length === 0 ? (
                  <div className="py-20 px-4 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                      <FolderProjectsIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      No Drafts Available
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      You don&apos;t have any saved drafts or completed posts yet. Tap below to start drafting your next LinkedIn story!
                    </p>
                  </div>
                ) : (
                  /* ─── DRAFTS & COMPLETED FEED LIST ─── */
                  <div className="flex flex-col gap-3">
                    {filteredProjects.map((p) => {
                      const isCompleted = p.status === "ready_to_post" || p.status === "posted";
                      const dateStr = new Date(p.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      // First image if any
                      const firstImg =
                        p.generalImages?.[0]?.url ||
                        p.imageLinks?.[0]?.images?.[0]?.url;

                      // Display snippet (first few lines)
                      const previewLines = (p.generatedPostText || p.rawText || "Empty draft")
                        .split("\n")
                        .filter((l) => l.trim().length > 0)
                        .slice(0, 3)
                        .join(" ");

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleOpenProject(p)}
                          className="p-4 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 shadow-sm transition-all cursor-pointer flex flex-col gap-2.5 active:scale-[0.99]"
                        >
                          {/* Card Top: Status Pill + Date + Delete */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {isCompleted ? "✓ Completed" : "Draft"}
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" /> {dateStr}
                              </span>
                              <button
                                onClick={(e) => handleDeleteDraft(p.id, e)}
                                className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Card Content + Optional Thumbnail */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate mb-1">
                                {p.title || "Untitled Draft"}
                              </h4>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {previewLines}
                              </p>
                            </div>

                            {firstImg && (
                              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={firstImg} alt="Thumbnail" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Home Bottom "+ New Post" Master Button */}
              <div className="pt-4 pb-6">
                <button
                  onClick={handleStartNewPost}
                  className="w-full py-4 px-4 rounded-2xl bg-[#16191f] hover:bg-black text-white text-[14px] font-bold shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  + Create New Post
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              EDITOR VIEW (1:1 Exact Match with Reference Image)
             ══════════════════════════════════════════════════ */}
          {activeView === "editor" && (
            <div className="flex-1 flex flex-col gap-4 justify-between">
              <div className="flex flex-col gap-4">
                {/* Inspiration Pills Row */}
                <div className="flex flex-wrap gap-2">
                  {INSPIRATION_PILLS.map((pill, i) => (
                    <button
                      key={i}
                      onClick={() => setRawText((prev) => (prev.trim() ? `${prev}\n\n${pill.text}` : pill.text))}
                      className="bg-[#f0f2f5] hover:bg-[#e4e7eb] text-slate-800 text-[12.5px] font-medium px-3.5 py-1.5 rounded-full border border-slate-200/50 shadow-sm transition-all cursor-pointer"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Story / Notes Textarea Box */}
                <div className="border border-slate-200 rounded-3xl p-4 flex flex-col min-h-[300px] shadow-sm bg-white">
                  <textarea
                    ref={textareaRef}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Share your story..."
                    className="w-full flex-1 resize-none text-[15px] leading-relaxed outline-none text-slate-800 placeholder-slate-400 min-h-[200px]"
                  />

                  {/* Attached Images Preview if any */}
                  {generalImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2 border-t border-slate-100 mt-2">
                      {generalImages.map((img) => (
                        <div key={img.id} className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setGeneralImages((p) => p.filter((i) => i.id !== img.id))}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center font-bold text-xs opacity-0 group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags preview if any */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                      {tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          #{t}
                          <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-slate-700">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Tools Row: Attach Media & Add Hashtags */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => generalFileRef.current?.click()}
                    className="flex items-center gap-2 text-[13.5px] font-medium text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
                  >
                    <span className="text-base">📷</span> Attach Media
                    {generalImages.length > 0 && ` (${generalImages.length})`}
                  </button>

                  <button
                    onClick={() => setShowTagInput(!showTagInput)}
                    className="flex items-center gap-1.5 text-[13.5px] font-medium text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
                  >
                    <span className="text-base font-bold">#</span> Add Hashtags
                    {tags.length > 0 && ` (${tags.length})`}
                  </button>
                </div>

                {/* Expandable Hashtag Input */}
                {showTagInput && (
                  <div className="p-2 border border-slate-200 rounded-2xl flex items-center gap-2 bg-slate-50">
                    <input
                      type="text"
                      placeholder="Type hashtag and press Enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={addTag}
                      className="w-full text-xs outline-none bg-transparent px-2 py-1 text-slate-800 placeholder-slate-400"
                    />
                    <button
                      onClick={() => {
                        if (tagInput.trim()) {
                          const clean = tagInput.trim().replace(/^#/, "");
                          if (!tags.includes(clean)) setTags([...tags, clean]);
                          setTagInput("");
                        }
                      }}
                      className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900 text-white"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* ─── ACTION BUTTONS (Exact Match with Reference Image) ─── */}
              <div className="flex flex-col gap-3 pt-2 pb-6">
                {/* Ask AI to Refine ✨ */}
                <button
                  onClick={handleTriggerClarify}
                  disabled={!rawText.trim() || isClarifying}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#1e232d] hover:bg-[#161a22] text-white text-[14px] font-semibold shadow-lg shadow-slate-900/10 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isClarifying ? "Analyzing Notes..." : "Ask AI to Refine ✨"}
                </button>

                {/* Generate Post */}
                <button
                  onClick={handleGeneratePost}
                  disabled={!rawText.trim() || isGenerating}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#16191f] hover:bg-black text-white text-[14px] font-bold shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? "Generating Post..." : "Generate Post"}
                </button>
              </div>
            </div>
          )}

          {/* ─── CLARIFY VIEW ─── */}
          {activeView === "clarify" && (
            <div className="flex-1 flex flex-col gap-3 pb-6">
              <AIChatClarifier
                questions={clarificationQuestions}
                isLoading={isClarifying}
                onAnswerChange={handleAnswerQuestion}
                onRefreshQuestions={handleTriggerClarify}
                onApplyAndGenerate={handleGeneratePost}
                isLightMode={isLightMode}
              />
            </div>
          )}

          {/* ─── PREVIEW VIEW ─── */}
          {activeView === "preview" && (
            <div className="flex-1 flex flex-col gap-3 pb-6">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => setActiveView("home")}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  ← Home
                </button>

                <button
                  onClick={() => setActiveView("suggestions")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  Optimization Lab →
                </button>
              </div>

              {generatedPostText ? (
                <LinkedInPreviewCard
                  postText={generatedPostText}
                  images={allImageUrls}
                  settings={settings}
                  isLightMode={isLightMode}
                />
              ) : (
                <div className="p-12 text-center text-slate-400">
                  No post generated yet.
                </div>
              )}
            </div>
          )}

          {/* ─── SUGGESTIONS VIEW ─── */}
          {activeView === "suggestions" && (
            <div className="flex-1 flex flex-col gap-3 pb-6">
              <button
                onClick={() => setActiveView("preview")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 cursor-pointer"
              >
                ← Back to Preview
              </button>

              <PostSuggestionsLab
                suggestions={suggestions}
                currentPostText={generatedPostText}
                onReplaceHook={(newHook) => {
                  const paragraphs = generatedPostText.split("\n\n");
                  if (paragraphs.length > 0) {
                    paragraphs[0] = newHook;
                    setGeneratedPostText(paragraphs.join("\n\n"));
                  }
                }}
                onReplaceCTA={(newCTA) => {
                  const lines = generatedPostText.split("\n");
                  const updated = [...lines, `\n${newCTA}`].join("\n");
                  setGeneratedPostText(updated);
                }}
                onApplyTone={(tone) => {
                  setRawText((prev) => `${prev}\n[Target Tone: ${tone}]`);
                  handleGeneratePost();
                }}
                onAddHashtag={(tag) => {
                  const clean = tag.replace(/^#/, "");
                  if (!tags.includes(clean)) setTags((p) => [...p, clean]);
                }}
                isLightMode={isLightMode}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}