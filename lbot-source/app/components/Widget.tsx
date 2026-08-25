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
} from "./Icons";

const INSPIRATION_STARTERS = [
  { label: "🚀 Feature / Project Launch", text: "We just launched our new project today! Here is the breakdown of why we built it, the architecture we used, and what we learned along the way:" },
  { label: "💡 Hard-Won Lesson", text: "3 days ago, our entire pipeline failed in production. It felt frustrating at first, but here is the exact lesson it taught us about scaling:" },
  { label: "📈 10x Performance Win", text: "We managed to reduce latency by over 60% with one key architectural change. Here is the technical breakdown:" },
  { label: "🛠️ Tech Architecture", text: "Here is the raw architectural breakdown of our latest stack — why we chose it, what worked, and what we would do differently:" },
];

export default function Widget() {
  // ─── App Settings & Theme ───
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isLightMode = settings.theme === "minimal-light";

  // ─── Active Project & Editor State ───
  const [currentProjectId, setCurrentProjectId] = useState<string>(generateUUID());
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

  // ─── Navigation Tabs ───
  const [activeTab, setActiveTab] = useState<"editor" | "clarify" | "preview" | "suggestions" | "projects">("editor");

  // ─── Processing & Status ───
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

  // ─── Load Settings & Active Draft on Mount ───
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

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // ─── Autosave ───
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
    const interval = setInterval(testBackend, 10000);
    return () => clearInterval(interval);
  }, [testBackend]);

  // ─── Text Selection for Image Context ───
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
        id: generateUUID(),
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
          id: generateUUID(),
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

  // ─── AI Clarification ───
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

  // ─── Direct AI Post Generation ───
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

      // Generate suggestions in background
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
    setCurrentProjectId(generateUUID());
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

  // Collect image URLs
  const allImageUrls = [
    ...textImageLinks.flatMap((l) => l.images.map((i) => i.url)),
    ...generalImages.map((i) => i.url),
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-3 sm:p-5 md:p-8 relative">
      {/* Background Animated Ambient Glow */}
      <div className="ambient-mesh" />

      {/* Hidden File Inputs */}
      <input ref={linkFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleLinkFiles} />
      <input ref={generalFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGeneralFiles} />

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

      {/* ─── Flagship Master Navigation Header ─── */}
      <div className="w-full max-w-4xl glass-panel p-3.5 sm:p-4 rounded-3xl mb-4 flex flex-wrap items-center justify-between gap-3 relative z-10">
        {/* Brand & AI Engine Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-tr from-indigo-600 via-indigo-700 to-cyan-500 shadow-indigo-600/30">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)]">
                LinkedIn AI Studio
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--accent-primary)] flex items-center gap-1.5 shadow-sm">
                <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === "Connected" ? "bg-emerald-500" : "bg-cyan-500 animate-pulse"}`} />
                {syncStatus === "Connected" ? "PC Connected" : "Standalone Mobile AI"}
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Direct Gemini 2.0 & NVIDIA NIM Multi-Model Pipeline
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartNewProject}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border border-[var(--border-subtle)] bg-[var(--bg-input)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Post</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
            title="App Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Glowing Segmented Navigation Tabs ─── */}
      <div className="w-full max-w-4xl p-1.5 rounded-3xl glass-panel mb-5 flex items-center justify-between gap-1 overflow-x-auto relative z-10 shadow-sm">
        {[
          { id: "editor", label: "Create & Notes", icon: SparklesIcon },
          { id: "clarify", label: "AI Clarifier", icon: HelpCircleIcon, badge: clarificationQuestions.length },
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
              className={`flex-1 min-w-[85px] py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer relative ${
                isActive
                  ? isLightMode
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/35"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[11.5px] sm:text-xs">{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className={`w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center ml-0.5 ${
                  isActive ? "bg-white text-slate-900" : "bg-[var(--border-subtle)] text-[var(--text-primary)]"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Live Generation Progress Toast ─── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="w-full max-w-4xl p-4 sm:p-5 rounded-3xl glass-panel-elevated mb-5 flex flex-col gap-2.5 shadow-2xl relative z-10 border border-indigo-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {generationStage || "AI is drafting your LinkedIn post in real-time..."}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400">
                Streaming
              </span>
            </div>

            {liveStreamOutput && (
              <div className="p-3.5 rounded-2xl text-xs font-mono max-h-32 overflow-y-auto leading-relaxed border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)]">
                {liveStreamOutput}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main View Switcher ─── */}
      <div className="w-full max-w-4xl flex-1 flex flex-col relative z-10">
        {/* ─── TAB 1: Editor & Notes ─── */}
        {activeTab === "editor" && (
          <motion.div
            ref={editorCardRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-5 sm:p-7 rounded-3xl relative overflow-hidden transition-all duration-300 shadow-sm"
          >
            {/* Luminous Top Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent" />

            {/* Floating Highlight Selection Toolbar */}
            <AnimatePresence>
              {showToolbar && selectionRange && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.94 }}
                  className="absolute z-50 flex items-center gap-2 p-1.5 rounded-2xl shadow-2xl border bg-slate-950 text-white border-white/20 backdrop-blur-2xl"
                  style={{
                    left: `${Math.min(Math.max(toolbarPos.x - 90, 16), 260)}px`,
                    top: `${toolbarPos.y - 48}px`,
                  }}
                >
                  <button
                    onClick={createTextLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Attach Photos to &quot;{selectionRange.text.slice(0, 16)}...&quot;
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project Title Input */}
            <div className="mb-4">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Post Topic or Project Name..."
                className="w-full text-lg font-extrabold outline-none bg-transparent text-[var(--text-primary)] placeholder-[var(--text-placeholder)]"
              />
            </div>

            {/* Inspiration Angle Starters */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
                ✨ Quick Inspiration Angles:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_STARTERS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setRawText((prev) => (prev.trim() ? `${prev}\n\n${s.text}` : s.text))}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-indigo-400 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Raw Notes Textarea */}
            <div className="relative mb-5">
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onSelect={handleTextSelect}
                onBlur={() => setTimeout(() => setShowToolbar(false), 250)}
                placeholder="Write your unfiltered notes, bullet points, story, metrics, or project milestones... (Select text to link specific photos!)"
                rows={9}
                className="w-full p-4 sm:p-5 rounded-2xl resize-none text-[15px] leading-relaxed outline-none border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:border-indigo-500/80 transition-all shadow-inner"
              />

              <div className="flex items-center justify-between mt-2 text-[11px] px-1 text-[var(--text-tertiary)]">
                <span>
                  {textImageLinks.length > 0
                    ? `🔗 ${textImageLinks.length} contextually linked photo(s)`
                    : "💡 Highlight text to attach related screenshots"}
                </span>
                <span className="font-semibold">{rawText.length} chars</span>
              </div>
            </div>

            {/* Contextual Linked Images Panel */}
            {textImageLinks.length > 0 && (
              <div className="mb-5 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Contextually Linked Images:
                </span>
                <div className="flex flex-col gap-2">
                  {textImageLinks.map((link) => (
                    <div
                      key={link.id}
                      className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-xs italic font-bold text-indigo-500 truncate max-w-[220px]">
                          &ldquo;{link.text}&rdquo;
                        </span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                          ({link.images.length} photos)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveLinkForUpload(link.id);
                            linkFileRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-indigo-400 cursor-pointer transition-all"
                        >
                          + Add Photo
                        </button>
                        <button
                          onClick={() => setTextImageLinks((p) => p.filter((l) => l.id !== link.id))}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Media Gallery Attachments */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Post Photos / Media ({generalImages.length}):
                </span>
                <button
                  onClick={() => generalFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold border border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-indigo-400 text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
                >
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  Attach Media
                </button>
              </div>

              {generalImages.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {generalImages.map((img) => (
                    <div key={img.id} className="relative w-18 h-18 rounded-2xl overflow-hidden shrink-0 border border-[var(--border-subtle)] group shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setGeneralImages((p) => p.filter((i) => i.id !== img.id))}
                        className="absolute inset-0 bg-black/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-sm transition-opacity"
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
              <span className="text-xs font-bold text-[var(--text-primary)] block mb-2">
                Hashtags ({tags.length}/10):
              </span>
              <div className="p-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] flex flex-wrap items-center gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/20"
                  >
                    #{t}
                    <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100 font-bold">✕</button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={tags.length === 0 ? "Type tag & hit Enter..." : "+ tag"}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-[var(--text-primary)] placeholder-[var(--text-placeholder)]"
                />
              </div>
            </div>

            {/* Master Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={handleTriggerClarify}
                disabled={!rawText.trim() || isClarifying}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-indigo-400 text-[var(--text-primary)] transition-all cursor-pointer shadow-sm"
              >
                <HelpCircleIcon className="w-4 h-4 text-indigo-500" />
                {isClarifying ? "Analyzing Notes..." : "Ask AI to Clarify & Interview"}
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGeneratePost}
                disabled={!rawText.trim() || isGenerating}
                className={`flex items-center gap-2 px-7 py-3 rounded-2xl text-xs font-extrabold text-white shadow-xl shadow-indigo-600/30 transition-all cursor-pointer ${
                  !rawText.trim() || isGenerating
                    ? "opacity-50 cursor-not-allowed bg-slate-500"
                    : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600"
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                {isGenerating ? "Drafting Post..." : "Generate LinkedIn Post →"}
              </motion.button>
            </div>
          </motion.div>
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

        {/* ─── TAB 3: LinkedIn Live Mockup ─── */}
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
              <div className="glass-panel p-12 rounded-3xl text-center flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-[var(--text-secondary)]">No post generated to preview yet.</p>
                <button
                  onClick={() => setActiveTab("editor")}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                >
                  Go to Editor →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: Optimization Lab ─── */}
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