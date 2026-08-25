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
} from "../lib/storage";
import {
  generatePostDirect,
  generateClarifyingQuestions,
  generatePostSuggestions,
} from "../lib/aiEngine";
import AIChatClarifier from "./AIChatClarifier";
import PostSuggestionsLab from "./PostSuggestionsLab";
import LinkedInPreviewCard from "./LinkedInPreviewCard";
import ProjectQueueManager from "./ProjectQueueManager";
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
  RefreshCwIcon,
  RocketIcon,
} from "./Icons";

export default function Widget() {
  // ─── App Settings & Theme ───
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isLightMode = settings.theme === "minimal-light";

  // ─── Active Project & Editor State ───
  const [currentProjectId, setCurrentProjectId] = useState<string>(crypto.randomUUID());
  const [projectTitle, setProjectTitle] = useState("Untitled Post");
  const [rawText, setRawText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [textImageLinks, setTextImageLinks] = useState<TextImageLink[]>([]);
  const [generalImages, setGeneralImages] = useState<ImageAttachment[]>([]);

  // ─── AI Generated Results ───
  const [generatedPostText, setGeneratedPostText] = useState("");
  const [visionSummary, setVisionSummary] = useState("");
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [suggestions, setSuggestions] = useState<PostSuggestions | null>(null);

  // ─── Navigation & Views ───
  const [activeTab, setActiveTab] = useState<"editor" | "clarify" | "preview" | "suggestions" | "projects">("editor");

  // ─── Processing & Status State ───
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);
  const [generationStage, setGenerationStage] = useState<string | null>(null);
  const [liveStreamOutput, setLiveStreamOutput] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("StandAlone");
  const [allProjects, setAllProjects] = useState<ProjectDraft[]>([]);

  // ─── Text Selection Toolbar ───
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [activeLinkForUpload, setActiveLinkForUpload] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linkFileRef = useRef<HTMLInputElement>(null);
  const generalFileRef = useRef<HTMLInputElement>(null);
  const editorCardRef = useRef<HTMLDivElement>(null);

  // ─── Load Settings & Projects on Mount ───
  useEffect(() => {
    const loadedSettings = getStoredSettings();
    setSettings(loadedSettings);
    document.documentElement.setAttribute("data-theme", loadedSettings.theme);

    const projects = getAllProjects();
    setAllProjects(projects);

    const savedDraft = getStoredActiveDraft();
    if (savedDraft) {
      setCurrentProjectId(savedDraft.id);
      setProjectTitle(savedDraft.title || "Untitled Post");
      setRawText(savedDraft.rawText || "");
      setTags(savedDraft.tags || []);
      setTextImageLinks(savedDraft.imageLinks || []);
      setGeneralImages(savedDraft.generalImages || []);
      if (savedDraft.generatedPostText) {
        setGeneratedPostText(savedDraft.generatedPostText);
      }
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // ─── Realtime Auto-Save ───
  useEffect(() => {
    if (!settings.autoSaveEnabled) return;
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

      // Also persist to projects database
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
          status: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveProject(project);
        setAllProjects(getAllProjects());
      }
    }, 600);
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
    settings.autoSaveEnabled,
  ]);

  // ─── Test Backend Health ───
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

  // ─── Text Selection for Image Linking ───
  const handleTextSelect = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      setShowToolbar(false);
      return;
    }
    const selected = rawText.slice(start, end).trim();
    if (!selected) {
      setShowToolbar(false);
      return;
    }

    const rect = el.getBoundingClientRect();
    const cardRect = editorCardRef.current?.getBoundingClientRect();
    const offsetX = rect.left - (cardRect?.left ?? 0);
    const offsetY = rect.top - (cardRect?.top ?? 0);

    setSelectionRange({ start, end, text: selected });
    setToolbarPos({ x: offsetX + rect.width / 2, y: offsetY - 8 });
    setShowToolbar(true);
  }, [rawText]);

  const createTextLink = () => {
    if (!selectionRange) return;
    const existing = textImageLinks.find(
      (l) => l.startIndex === selectionRange.start && l.endIndex === selectionRange.end
    );
    if (existing) {
      setActiveLinkForUpload(existing.id);
    } else {
      const newLink: TextImageLink = {
        id: crypto.randomUUID(),
        text: selectionRange.text,
        startIndex: selectionRange.start,
        endIndex: selectionRange.end,
        images: [],
      };
      setTextImageLinks((prev) => [...prev, newLink]);
      setActiveLinkForUpload(newLink.id);
    }
    setShowToolbar(false);
    setTimeout(() => linkFileRef.current?.click(), 100);
  };

  const handleLinkFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeLinkForUpload) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const attachment: ImageAttachment = {
          id: crypto.randomUUID(),
          url: ev.target?.result as string,
          name: file.name,
          size: file.size,
        };
        setTextImageLinks((prev) =>
          prev.map((l) =>
            l.id === activeLinkForUpload ? { ...l, images: [...l.images, attachment] } : l
          )
        );
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleGeneralFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const attachment: ImageAttachment = {
          id: crypto.randomUUID(),
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

  // ─── AI Clarification Flow ───
  const handleTriggerClarify = async () => {
    if (!rawText.trim()) return;
    setIsClarifying(true);
    setActiveTab("clarify");
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

  // ─── Generate Post (Direct Standalone AI with Fallback) ───
  const handleGeneratePost = async () => {
    if (!rawText.trim()) return;
    setIsGenerating(true);
    setGenerationStage("Initializing AI drafting pipeline...");
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
      setActiveTab("preview");

      // Proactively compute post optimization suggestions in background
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

  // ─── Project Management ───
  const handleStartNewProject = () => {
    clearActiveDraft();
    setCurrentProjectId(crypto.randomUUID());
    setProjectTitle("Untitled Post");
    setRawText("");
    setTags([]);
    setTextImageLinks([]);
    setGeneralImages([]);
    setGeneratedPostText("");
    setVisionSummary("");
    setClarificationQuestions([]);
    setSuggestions(null);
    setActiveTab("editor");
  };

  const handleSelectProject = (p: ProjectDraft) => {
    setCurrentProjectId(p.id);
    setProjectTitle(p.title);
    setRawText(p.rawText);
    setTags(p.tags);
    setTextImageLinks(p.imageLinks || []);
    setGeneralImages(p.generalImages || []);
    setGeneratedPostText(p.generatedPostText || "");
    setVisionSummary(p.visionSummary || "");
    setClarificationQuestions(p.clarificationQuestions || []);
    setSuggestions(p.suggestions || null);
    setActiveTab(p.generatedPostText ? "preview" : "editor");
  };

  // Collect all image URLs for preview
  const allImageUrls = [
    ...textImageLinks.flatMap((l) => l.images.map((i) => i.url)),
    ...generalImages.map((i) => i.url),
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 transition-colors duration-300">
      {/* Hidden File Inputs */}
      <input ref={linkFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleLinkFiles} />
      <input ref={generalFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGeneralFiles} />

      {/* Settings Drawer */}
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

      {/* ─── Top Master Navigation Header ─── */}
      <div className={`w-full max-w-4xl p-3 md:p-4 rounded-2xl border mb-4 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl transition-all shadow-sm ${
        isLightMode
          ? "bg-white/80 border-slate-200/80 shadow-slate-200/40"
          : "bg-[#0d0e14]/80 border-white/[0.08] shadow-2xl"
      }`}>
        {/* App Title & Status */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
            isLightMode
              ? "bg-gradient-to-br from-indigo-600 to-blue-600 shadow-indigo-600/20"
              : "bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-indigo-500/20"
          }`}>
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm sm:text-base tracking-tight ${isLightMode ? "text-slate-900" : "text-white"}`}>
                LinkedIn AI Studio
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                syncStatus === "Connected"
                  ? isLightMode ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : isLightMode ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white/[0.06] text-white/60 border-white/[0.08]"
              }`}>
                {syncStatus === "Connected" ? "PC Connected" : "Mobile Direct Mode"}
              </span>
            </div>
            <span className={`text-[11px] ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
              Ultra-fast AI post generation & live preview
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleStartNewProject}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isLightMode
                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border-white/[0.08]"
            }`}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Post</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-xl border transition-all ${
              isLightMode
                ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border-white/[0.08]"
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs Bar ─── */}
      <div className={`w-full max-w-4xl p-1 rounded-2xl border mb-4 flex items-center justify-between gap-1 overflow-x-auto shadow-sm ${
        isLightMode ? "bg-white border-slate-200" : "bg-[#0d0e14]/80 border-white/[0.08]"
      }`}>
        {[
          { id: "editor", label: "Editor & Notes", icon: SparklesIcon },
          { id: "clarify", label: "AI Interview", icon: HelpCircleIcon, badge: clarificationQuestions.length },
          { id: "preview", label: "LinkedIn Mockup", icon: EyeIcon },
          { id: "suggestions", label: "Optimization Lab", icon: LightbulbIcon },
          { id: "projects", label: "Projects & Queue", icon: FolderProjectsIcon, badge: allProjects.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                isActive
                  ? isLightMode
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : isLightMode
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-white/50 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] sm:text-xs">{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ml-0.5 ${
                  isActive ? "bg-white text-slate-900" : isLightMode ? "bg-slate-200 text-slate-700" : "bg-white/15 text-white"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Live Generation Progress Toast / Banner ─── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`w-full max-w-4xl p-4 rounded-2xl border mb-4 flex flex-col gap-2 shadow-xl ${
              isLightMode
                ? "bg-indigo-50/90 border-indigo-200 text-indigo-900"
                : "bg-indigo-950/40 border-indigo-500/30 text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold">{generationStage || "AI is drafting your post..."}</span>
              </div>
              <span className="text-[11px] opacity-60">Real-time Stream</span>
            </div>

            {liveStreamOutput && (
              <div className={`p-2.5 rounded-xl text-xs font-mono max-h-28 overflow-y-auto leading-relaxed border ${
                isLightMode ? "bg-white/80 border-indigo-100 text-slate-800" : "bg-black/40 border-white/[0.06] text-white/80"
              }`}>
                {liveStreamOutput}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main View Switcher ─── */}
      <div className="w-full max-w-4xl flex-1 flex flex-col">
        {/* ─── TAB 1: Editor ─── */}
        {activeTab === "editor" && (
          <div
            ref={editorCardRef}
            className={`relative p-4 md:p-6 rounded-2xl border transition-all shadow-sm ${
              isLightMode
                ? "bg-white border-slate-200"
                : "bg-[#0d0e14]/90 border-white/[0.08] shadow-2xl"
            }`}
          >
            {/* Floating Selection Toolbar */}
            <AnimatePresence>
              {showToolbar && selectionRange && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.94 }}
                  className="absolute z-50 flex items-center gap-2 p-1.5 rounded-xl shadow-2xl border bg-slate-900 text-white border-slate-700"
                  style={{
                    left: `${Math.min(Math.max(toolbarPos.x - 90, 16), 260)}px`,
                    top: `${toolbarPos.y - 45}px`,
                  }}
                >
                  <button
                    onClick={createTextLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Attach Images to &quot;{selectionRange.text.slice(0, 18)}...&quot;
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project Title */}
            <div className="mb-3">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Project Title / Concept..."
                className={`w-full text-base font-bold outline-none bg-transparent ${
                  isLightMode ? "text-slate-900 placeholder-slate-300" : "text-white placeholder-white/20"
                }`}
              />
            </div>

            {/* Main Raw Notes Textarea */}
            <div className="relative mb-4">
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onSelect={handleTextSelect}
                onBlur={() => setTimeout(() => setShowToolbar(false), 250)}
                placeholder="Write your raw post notes, bullet points, story, or project updates here... (Select text to link specific photos!)"
                rows={9}
                className={`w-full p-4 rounded-xl resize-none text-[15px] leading-relaxed outline-none border transition-all ${
                  isLightMode
                    ? "bg-slate-50/70 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500"
                    : "bg-black/30 border-white/[0.08] text-white placeholder-white/25 focus:border-indigo-500/50"
                }`}
              />

              <div className="flex items-center justify-between mt-1 text-[11px] px-1">
                <span className={isLightMode ? "text-slate-400" : "text-white/40"}>
                  {textImageLinks.length > 0
                    ? `${textImageLinks.length} contextual image link(s)`
                    : "Tip: Highlight text to attach related images"}
                </span>
                <span className={isLightMode ? "text-slate-400" : "text-white/40"}>
                  {rawText.length} characters
                </span>
              </div>
            </div>

            {/* Contextual Linked Images Panel */}
            {textImageLinks.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                <span className={`text-xs font-semibold ${isLightMode ? "text-slate-700" : "text-white/70"}`}>
                  Contextually Linked Images:
                </span>
                <div className="flex flex-col gap-2">
                  {textImageLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`text-xs italic truncate max-w-[200px] ${isLightMode ? "text-indigo-600 font-medium" : "text-indigo-400 font-medium"}`}>
                          &ldquo;{link.text}&rdquo;
                        </span>
                        <span className={`text-[11px] ${isLightMode ? "text-slate-400" : "text-white/40"}`}>
                          ({link.images.length} images)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveLinkForUpload(link.id);
                            linkFileRef.current?.click();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            isLightMode ? "bg-white text-slate-700 border-slate-200" : "bg-white/10 text-white border-white/10"
                          }`}
                        >
                          + Add Photo
                        </button>
                        <button
                          onClick={() => setTextImageLinks((p) => p.filter((l) => l.id !== link.id))}
                          className={`p-1.5 rounded-lg text-rose-500 ${isLightMode ? "hover:bg-rose-50" : "hover:bg-rose-500/10"}`}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Media Attachments */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isLightMode ? "text-slate-700" : "text-white/70"}`}>
                  Post Photos / Screenshots ({generalImages.length}):
                </span>
                <button
                  onClick={() => generalFileRef.current?.click()}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isLightMode
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                      : "bg-white/[0.05] hover:bg-white/[0.08] text-white border-white/[0.08]"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Attach Media
                </button>
              </div>

              {generalImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {generalImages.map((img) => (
                    <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-inherit group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setGeneralImages((p) => p.filter((i) => i.id !== img.id))}
                        className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hashtag Manager */}
            <div className="mb-6">
              <span className={`text-xs font-semibold block mb-1.5 ${isLightMode ? "text-slate-700" : "text-white/70"}`}>
                Hashtags ({tags.length}/10):
              </span>
              <div className={`p-2 rounded-xl border flex flex-wrap items-center gap-1.5 ${
                isLightMode ? "bg-slate-50/70 border-slate-200" : "bg-black/20 border-white/[0.06]"
              }`}>
                {tags.map((t) => (
                  <span
                    key={t}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      isLightMode ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-300"
                    }`}
                  >
                    #{t}
                    <button onClick={() => removeTag(t)} className="opacity-50 hover:opacity-100">✕</button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={tags.length === 0 ? "Type hashtag & press Enter..." : "+ tag"}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  className={`flex-1 min-w-[100px] text-xs outline-none bg-transparent ${
                    isLightMode ? "text-slate-800 placeholder-slate-400" : "text-white placeholder-white/20"
                  }`}
                />
              </div>
            </div>

            {/* Master Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-inherit">
              <button
                onClick={handleTriggerClarify}
                disabled={!rawText.trim() || isClarifying}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  isLightMode
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    : "bg-white/[0.05] hover:bg-white/[0.08] text-white border-white/[0.08]"
                }`}
              >
                <HelpCircleIcon className="w-4 h-4 text-indigo-500" />
                {isClarifying ? "Analyzing..." : "Ask AI to Clarify & Interview"}
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGeneratePost}
                disabled={!rawText.trim() || isGenerating}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${
                  !rawText.trim() || isGenerating
                    ? "opacity-50 cursor-not-allowed bg-slate-500"
                    : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-600/25"
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate LinkedIn Post"}
              </motion.button>
            </div>
          </div>
        )}

        {/* ─── TAB 2: AI Clarification & Questions ─── */}
        {activeTab === "clarify" && (
          <AIChatClarifier
            questions={clarificationQuestions}
            isLoading={isClarifying}
            onAnswerChange={handleAnswerQuestion}
            onRefreshQuestions={handleTriggerClarify}
            onApplyAndGenerate={handleGeneratePost}
            isLightMode={isLightMode}
          />
        )}

        {/* ─── TAB 3: Realistic LinkedIn Live Mockup ─── */}
        {activeTab === "preview" && (
          <div className="flex flex-col gap-4">
            {generatedPostText ? (
              <LinkedInPreviewCard
                postText={generatedPostText}
                images={allImageUrls}
                settings={settings}
                isLightMode={isLightMode}
              />
            ) : (
              <div className={`p-10 rounded-2xl border text-center ${
                isLightMode ? "bg-white border-slate-200 text-slate-500" : "bg-[#0d0e14]/80 border-white/[0.08] text-white/50"
              }`}>
                <p className="text-xs mb-3">No generated post to preview yet.</p>
                <button
                  onClick={() => setActiveTab("editor")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
                >
                  Go to Editor →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: Post Suggestions & Optimization Lab ─── */}
        {activeTab === "suggestions" && (
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
              // Replace last non-hashtag line with new CTA
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
        )}

        {/* ─── TAB 5: Projects & Queue ─── */}
        {activeTab === "projects" && (
          <ProjectQueueManager
            projects={allProjects}
            activeProjectId={currentProjectId}
            onSelectProject={handleSelectProject}
            onNewProject={handleStartNewProject}
            onDeleteProject={(id) => {
              deleteProject(id);
              setAllProjects(getAllProjects());
            }}
            onUpdateStatus={(id, status) => {
              markProjectStatus(id, status);
              setAllProjects(getAllProjects());
            }}
            isLightMode={isLightMode}
          />
        )}
      </div>
    </div>
  );
}