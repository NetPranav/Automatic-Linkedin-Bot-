"use client";

import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    setForm(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    onSaveSettings(form);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const handleTest = async () => {
    setTesting(true);
    await onTestBackend();
    setTesting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={`w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center font-bold">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  App Settings & AI Engine
                </h3>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 flex-1">
              {/* Theme Picker */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-2">
                  Theme Appearance:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "minimal-light", label: "Studio Light", preview: "bg-white text-slate-800" },
                    { id: "gemini-aurora", label: "Gemini Aurora", preview: "bg-[#0f1123] text-indigo-300" },
                    { id: "nvidia-cyber", label: "NVIDIA Cyber", preview: "bg-[#09100c] text-emerald-400" },
                    { id: "deep-dark", label: "Deep Obsidian", preview: "bg-black text-white" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setForm({ ...form, theme: t.id as any })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        form.theme === t.id
                          ? "border-indigo-500 ring-2 ring-indigo-500/30"
                          : "border-[var(--border-subtle)] hover:border-slate-400"
                      } ${t.preview}`}
                    >
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Engine Choice */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-2">
                  Primary AI Generation Engine:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "auto", label: "Smart Auto", desc: "Gemini + NIM Fallback" },
                    { id: "gemini", label: "Gemini Direct", desc: "Google Flash 2.0 / 1.5" },
                    { id: "nvidia", label: "NVIDIA NIM", desc: "Llama 3.2 90B Vision" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setForm({ ...form, aiProvider: p.id as any })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        form.aiProvider === p.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <div className="truncate">{p.label}</div>
                      <div className="text-[9px] font-normal opacity-75 truncate">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gemini API Key */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Google Gemini API Key (Optional):
                </label>
                <input
                  type="password"
                  value={form.geminiApiKey}
                  onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
                  placeholder="AIzaSy... (leave blank to use system default)"
                  className="w-full px-3.5 py-2 rounded-xl text-xs outline-none border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:border-indigo-500"
                />
              </div>

              {/* NVIDIA NIM API Key */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  NVIDIA NIM API Key:
                </label>
                <input
                  type="password"
                  value={form.nvidiaApiKey}
                  onChange={(e) => setForm({ ...form, nvidiaApiKey: e.target.value })}
                  placeholder="nvapi-..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs outline-none border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:border-indigo-500"
                />
              </div>

              {/* PC Backend Sync URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Local PC Backend URL:
                  </label>
                  <span className={`text-[10px] font-bold ${
                    syncStatus === "Connected" ? "text-emerald-500" : "text-amber-500"
                  }`}>
                    {syncStatus === "Connected" ? "● Connected" : "● Standalone / Offline"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.backendUrl}
                    onChange={(e) => setForm({ ...form, backendUrl: e.target.value })}
                    placeholder="http://192.168.x.x:8000"
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs outline-none border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:border-indigo-500"
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] cursor-pointer shrink-0"
                  >
                    <RefreshCwIcon className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Author Profile */}
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] flex flex-col gap-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Author Profile Customization:
                </span>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  placeholder="Your Full Name"
                  className="w-full px-3 py-1.5 rounded-lg text-xs outline-none border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  value={form.authorHeadline}
                  onChange={(e) => setForm({ ...form, authorHeadline: e.target.value })}
                  placeholder="Your LinkedIn Headline"
                  className="w-full px-3 py-1.5 rounded-lg text-xs outline-none border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2 shrink-0 bg-[var(--bg-surface)] pb-notch">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
              >
                {saved ? <CheckIcon className="w-4 h-4" /> : null}
                {saved ? "Saved!" : "Save Settings"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
