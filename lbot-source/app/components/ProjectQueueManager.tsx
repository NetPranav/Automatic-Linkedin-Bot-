"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectDraft } from "../lib/types";
import { PlusIcon, TrashIcon, ClockIcon, FolderProjectsIcon } from "./Icons";

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 sm:p-7 rounded-3xl relative overflow-hidden transition-all duration-300 shadow-sm"
    >
      {/* Luminous Top Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)] mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
            isLightMode
              ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-500/25"
              : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
          }`}>
            <FolderProjectsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              Projects & Sending Queue
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Manage saved drafts, completed posts & scheduled sending queue
            </p>
          </div>
        </div>

        {/* New Post Primary Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          Create New Post
        </motion.button>
      </div>

      {/* Top Controls: Search and Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        {/* Search Bar */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search drafts by title, content or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl text-xs outline-none border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:border-indigo-500/80 transition-all shadow-inner"
          />
        </div>

        {/* View Switcher */}
        <div className="flex gap-1 p-1 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "projects"
                ? isLightMode ? "bg-slate-900 text-white shadow-sm" : "bg-white/15 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            All Drafts ({filteredProjects.length})
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "queue"
                ? isLightMode ? "bg-slate-900 text-white shadow-sm" : "bg-white/15 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Send Queue
            {queuedItems.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[9px] flex items-center justify-center">
                {queuedItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Projects List */}
      <AnimatePresence mode="wait">
        {activeTab === "projects" && (
          <motion.div
            key="projects"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-3"
          >
            {filteredProjects.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center gap-2">
                <p className="text-xs text-[var(--text-secondary)]">No drafts found matching your search.</p>
                <button
                  onClick={onNewProject}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md"
                >
                  Create Your First Post →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProjects.map((p) => {
                  const isActive = p.id === activeProjectId;
                  const badge = getStatusBadge(p.status);
                  const dateStr = new Date(p.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectProject(p)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between gap-3 ${
                        isActive
                          ? isLightMode
                            ? "bg-indigo-50/60 border-indigo-300 shadow-md ring-2 ring-indigo-500/20"
                            : "bg-indigo-950/30 border-indigo-500/50 shadow-xl ring-2 ring-indigo-500/30"
                          : isLightMode
                            ? "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                            : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.07]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate flex-1">
                            {p.title || "Untitled Post"}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-xs line-clamp-2 text-[var(--text-secondary)] leading-relaxed">
                          {p.generatedPostText || p.rawText || "Empty draft"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[10px]">
                        <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                          <ClockIcon className="w-3 h-3" /> {dateStr}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(p.id);
                          }}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Queue View */}
        {activeTab === "queue" && (
          <motion.div
            key="queue"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-3"
          >
            {queuedItems.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center gap-2">
                <p className="text-xs text-[var(--text-secondary)]">Your send queue is currently empty.</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  When you approve posts for LinkedIn, they will appear here before publishing.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {queuedItems.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] flex items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                        {p.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                        {p.generatedPostText || p.rawText}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateStatus(p.id, "draft")}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] cursor-pointer"
                      >
                        Cancel Queue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
