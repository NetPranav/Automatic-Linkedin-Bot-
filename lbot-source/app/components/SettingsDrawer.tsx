"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSettings, SyncStatus } from "../lib/types";
import { SettingsIcon, CheckIcon, CloseIcon, RefreshCwIcon } from "./Icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  syncStatus: SyncStatus;
  onTestBackend: () => Promise<void>;
  isLightMode: boolean;
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  syncStatus,
  onTestBackend,
  isLightMode,
}: Props) {
  const [form, setForm] = useState<AppSettings>(settings);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveSettings(form);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleTest = async () => {
    setTesting(true);
    await onTestBackend();
    setTesting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
              isLightMode
                ? "bg-white border-slate-200 text-slate-900"
                : "bg-[#12131a] border-white/[0.1] text-white"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-inherit mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isLightMode ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/10 text-indigo-400"}`}>
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">App Configuration & AI Setup</h3>
                  <p className={`text-xs ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
                    Configure AI keys, themes, and author profile
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLightMode ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/10 text-white/40"
                }`}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              {/* Theme Selector */}
              <div>
                <label className="font-semibold block mb-1.5">Visual Design & Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "minimal-light", label: "Classic Minimal White" },
                    { id: "gemini-aurora", label: "Gemini Luminous Aurora" },
                    { id: "nvidia-cyber", label: "NVIDIA Cyber Emerald" },
                    { id: "deep-dark", label: "Deep Obsidian Stealth" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, theme: t.id as any })}
                      className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                        form.theme === t.id
                          ? isLightMode
                            ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm"
                            : "bg-indigo-500/15 border-indigo-500 text-white shadow"
                          : isLightMode
                            ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-white/70"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Provider Strategy */}
              <div>
                <label className="font-semibold block mb-1.5">AI Generation Engine</label>
                <select
                  value={form.aiProvider}
                  onChange={(e) => setForm({ ...form, aiProvider: e.target.value as any })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-medium ${
                    isLightMode
                      ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                      : "bg-black/40 border-white/[0.1] text-white focus:border-indigo-500"
                  }`}
                >
                  <option value="auto">Auto-Smart (Gemini 2.5/2.0 Flash → NVIDIA NIM Fallback)</option>
                  <option value="gemini">Google Gemini Direct (2.0 Flash / 1.5 Pro)</option>
                  <option value="nvidia">NVIDIA NIM Direct (Llama 3.2 90B Vision)</option>
                  <option value="local_backend">Local PC Server Only (FastAPI)</option>
                </select>
              </div>

              {/* Gemini API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">Google Gemini API Key</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-500 hover:underline"
                  >
                    Get Free Key →
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={form.geminiApiKey}
                  onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                    isLightMode
                      ? "bg-slate-50 border-slate-200 text-slate-800"
                      : "bg-black/40 border-white/[0.1] text-white"
                  }`}
                />
              </div>

              {/* NVIDIA NIM Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">NVIDIA NIM API Key</label>
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-500 hover:underline"
                  >
                    Get NVIDIA Key →
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="nvapi-..."
                  value={form.nvidiaApiKey}
                  onChange={(e) => setForm({ ...form, nvidiaApiKey: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                    isLightMode
                      ? "bg-slate-50 border-slate-200 text-slate-800"
                      : "bg-black/40 border-white/[0.1] text-white"
                  }`}
                />
              </div>

              {/* PC Backend URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">Local PC Backend URL</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    syncStatus === "Connected"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {syncStatus}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="http://192.168.x.x:8000"
                    value={form.backendUrl}
                    onChange={(e) => setForm({ ...form, backendUrl: e.target.value })}
                    className={`flex-1 p-2.5 rounded-xl border outline-none font-mono ${
                      isLightMode
                        ? "bg-slate-50 border-slate-200 text-slate-800"
                        : "bg-black/40 border-white/[0.1] text-white"
                    }`}
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className={`px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 shrink-0 ${
                      isLightMode ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/15 text-white"
                    }`}
                  >
                    <RefreshCwIcon className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
                    Test
                  </button>
                </div>
              </div>

              {/* Author Profile Settings */}
              <div className="border-t border-inherit pt-3">
                <label className="font-semibold block mb-2">Author Profile (LinkedIn Mockup)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className={`text-[10px] block mb-1 ${isLightMode ? "text-slate-500" : "text-white/40"}`}>Display Name</span>
                    <input
                      type="text"
                      value={form.authorName}
                      onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                      className={`w-full p-2 rounded-lg border outline-none ${
                        isLightMode ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/[0.1] text-white"
                      }`}
                    />
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-1 ${isLightMode ? "text-slate-500" : "text-white/40"}`}>Headline / Tagline</span>
                    <input
                      type="text"
                      value={form.authorHeadline}
                      onChange={(e) => setForm({ ...form, authorHeadline: e.target.value })}
                      className={`w-full p-2 rounded-lg border outline-none ${
                        isLightMode ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/[0.1] text-white"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-inherit">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isLightMode ? "text-slate-600 hover:bg-slate-100" : "text-white/60 hover:bg-white/10"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
              >
                {saved && <CheckIcon className="w-3.5 h-3.5" />}
                {saved ? "Saved!" : "Save Settings"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
