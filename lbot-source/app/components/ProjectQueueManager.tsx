"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectDraft } from "../lib/types";
import { PlusIcon, TrashIcon, CheckIcon, SendIcon, ClockIcon, FolderProjectsIcon } from "./Icons";

interface Props {
  projects: ProjectDraft[];
  activeProjectId?: string;
  onSelectProject: (project: ProjectDraft) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onUpdateStatus: (id: string, status: ProjectDraft["status"]) => void;
  isLightMode: boolean;
}

export default function ProjectQueueManager({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onUpdateStatus,
  isLightMode,
}: Props) {
  const [activeTab, setActiveTab] = useState<"projects" | "queue">("projects");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.rawText.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const queuedItems = projects.filter((p) => p.status === "queued");

  const getStatusBadge = (status: ProjectDraft["status"]) => {
    switch (status) {
      case "queued":
        return {
          label: "In Queue",
          bg: isLightMode ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "ready_to_post":
        return {
          label: "Ready to Post",
          bg: isLightMode ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        };
      case "posted":
        return {
          label: "Posted",
          bg: isLightMode ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      default:
        return {
          label: "Draft",
          bg: isLightMode ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white/[0.05] text-white/50 border-white/[0.08]",
        };
    }
  };

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
            isLightMode ? "bg-slate-100 text-slate-800" : "bg-white/10 text-white"
          }`}>
            <FolderProjectsIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold tracking-tight ${isLightMode ? "text-slate-800" : "text-white"}`}>
              Projects & Post Queue
            </h3>
            <p className={`text-[11px] ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
              Manage saved post projects, auto-saved drafts & sending queue
            </p>
          </div>
        </div>

        {/* New Post Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewProject}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer ${
            isLightMode
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25"
          }`}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          + New Post
        </motion.button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4">
        <div className="flex gap-1 p-1 rounded-xl bg-inherit border border-inherit shrink-0">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "projects"
                ? isLightMode ? "bg-slate-900 text-white shadow-sm" : "bg-white/15 text-white"
                : isLightMode ? "text-slate-600 hover:text-slate-900" : "text-white/50 hover:text-white"
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "queue"
                ? isLightMode ? "bg-slate-900 text-white shadow-sm" : "bg-white/15 text-white"
                : isLightMode ? "text-slate-600 hover:text-slate-900" : "text-white/50 hover:text-white"
            }`}
          >
            <span>Send Queue</span>
            {queuedItems.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {queuedItems.length}
              </span>
            )}
          </button>
        </div>

        <input
          type="text"
          placeholder="Search drafts, notes, hashtags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`px-3 py-1.5 rounded-xl text-xs outline-none border transition-all ${
            isLightMode
              ? "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
              : "bg-white/[0.04] border-white/[0.08] text-white placeholder-white/20 focus:border-indigo-500/50"
          }`}
        />
      </div>

      {/* Projects List */}
      <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
        <AnimatePresence>
          {activeTab === "projects" ? (
            filteredProjects.length === 0 ? (
              <div className="py-10 text-center">
                <p className={`text-xs ${isLightMode ? "text-slate-400" : "text-white/30"}`}>
                  No projects found. Click &quot;+ New Post&quot; to start drafting!
                </p>
              </div>
            ) : (
              filteredProjects.map((p) => {
                const badge = getStatusBadge(p.status);
                const isActive = p.id === activeProjectId;
                const dateStr = new Date(p.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSelectProject(p)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer group flex items-start justify-between gap-3 ${
                      isActive
                        ? isLightMode
                          ? "bg-indigo-50/80 border-indigo-300 shadow-sm"
                          : "bg-indigo-950/30 border-indigo-500/40 shadow-md"
                        : isLightMode
                          ? "bg-white hover:bg-slate-50 border-slate-200/80"
                          : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06]"
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs truncate ${
                          isLightMode ? "text-slate-800" : "text-white"
                        }`}>
                          {p.title || (p.rawText.slice(0, 40) + "...") || "Untitled Project"}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      <p className={`text-[11px] line-clamp-2 ${isLightMode ? "text-slate-500" : "text-white/60"}`}>
                        {p.generatedPostText || p.rawText || "Empty draft"}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-[10px]">
                        <span className={`flex items-center gap-1 ${isLightMode ? "text-slate-400" : "text-white/30"}`}>
                          <ClockIcon className="w-3 h-3" /> {dateStr}
                        </span>
                        {p.tags.length > 0 && (
                          <span className={isLightMode ? "text-indigo-600 font-medium" : "text-indigo-400 font-medium"}>
                            {p.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}
                          </span>
                        )}
                        {(p.imageLinks.length > 0 || p.generalImages.length > 0) && (
                          <span className={isLightMode ? "text-slate-400" : "text-white/40"}>
                            📷 {p.imageLinks.reduce((a, b) => a + b.images.length, 0) + p.generalImages.length} images
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(p.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isLightMode
                            ? "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            : "hover:bg-rose-500/10 text-white/40 hover:text-rose-400"
                        }`}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )
          ) : queuedItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className={`text-xs ${isLightMode ? "text-slate-400" : "text-white/30"}`}>
                No posts in queue right now. Queue posts to review & auto-publish.
              </p>
            </div>
          ) : (
            queuedItems.map((p) => (
              <motion.div
                key={p.id}
                layout
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isLightMode ? "bg-amber-50/40 border-amber-200" : "bg-amber-500/5 border-amber-500/20"
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`text-xs font-semibold truncate ${isLightMode ? "text-slate-800" : "text-white"}`}>
                    {p.title || p.rawText.slice(0, 45)}
                  </span>
                  <span className={`text-[10px] ${isLightMode ? "text-slate-500" : "text-white/50"}`}>
                    Ready for background publishing
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectProject(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isLightMode ? "bg-indigo-600 text-white" : "bg-indigo-500 text-white"
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onUpdateStatus(p.id, "draft")}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      isLightMode ? "bg-slate-200 text-slate-700" : "bg-white/10 text-white/70"
                    }`}
                  >
                    Cancel Queue
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
