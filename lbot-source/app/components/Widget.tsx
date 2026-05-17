"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Backend URL (change this if your PC's IP changes) ───
const BACKEND_URL = "http://192.168.29.224:8000";

// ─── Types ───
type SyncStatus = "Offline" | "Queued" | "Synced" | "AI Disconnected" | "Connected";

interface ImageAttachment {
  id: string;
  url: string;
  name: string;
}

interface TextImageLink {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  images: ImageAttachment[];
}

interface DraftPreview {
  id: string;
  status: string;
  generated_post_text: string;
  tags: string[];
  suggested_images: string[];
  vision_summary: string;
  created_at: string;
}

// ─── Animation Config ───
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};
const spring = { type: "spring" as const, stiffness: 400, damping: 22 };

// ─── Tiny Components ───
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function StatusBadge({ status }: { status: SyncStatus }) {
  const dot = { Offline: "#6b7280", Queued: "#fbbf24", Synced: "#34d399", "AI Disconnected": "#f87171", Connected: "#10b981" }[status];
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] tracking-wide whitespace-nowrap"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
      <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }}
        animate={{ opacity: status === "Queued" ? [0.4, 1, 0.4] : 1 }}
        transition={{ duration: 1.5, repeat: Infinity }} />
      {status}
    </div>
  );
}

function TagPill({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <motion.span layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }} transition={spring}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-default group"
      style={{ background: "var(--pill-bg)", color: "var(--pill-text)", border: "1px solid var(--pill-border)" }}>
      #{tag}
      <button onClick={onRemove} className="ml-0.5 opacity-40 group-hover:opacity-100 transition-opacity text-[10px]">✕</button>
    </motion.span>
  );
}

// ─── Linked Image Thumbnail ───
function LinkedImageThumb({ img, onRemove }: { img: ImageAttachment; onRemove: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }} transition={spring}
      className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <img src={img.url} alt={img.name} className="w-full h-full object-cover"
        style={{ filter: hover ? "brightness(0.35)" : "brightness(0.75)", transition: "filter 0.2s" }} />
      <AnimatePresence>
        {hover && (
          <motion.button onClick={onRemove} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════
//  MAIN WIDGET
// ═══════════════════════════════════
export default function Widget() {
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("Offline");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Text-image linking state
  const [textImageLinks, setTextImageLinks] = useState<TextImageLink[]>([]);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  const [previewDraft, setPreviewDraft] = useState<DraftPreview | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [hasEdits, setHasEdits] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<string | null>(null);
  const [currentGeneration, setCurrentGeneration] = useState<string | null>(null);
  const [previewImageBlobs, setPreviewImageBlobs] = useState<Record<string, string>>({});

  // Track edits
  useEffect(() => {
    if (previewDraft && previewText !== previewDraft.generated_post_text) {
      setHasEdits(true);
    } else {
      setHasEdits(false);
    }
  }, [previewText, previewDraft]);

  // ─── Load preview images as blobs (fixes Capacitor/mobile image loading) ───
  useEffect(() => {
    if (!previewDraft?.suggested_images?.length) {
      setPreviewImageBlobs({});
      return;
    }
    const loadImages = async () => {
      const blobs: Record<string, string> = {};
      for (const url of previewDraft.suggested_images) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          blobs[url] = URL.createObjectURL(blob);
        } catch (e) {
          console.error("Failed to load preview image:", url, e);
        }
      }
      setPreviewImageBlobs(blobs);
    };
    loadImages();
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(previewImageBlobs).forEach((blobUrl) => {
        try { URL.revokeObjectURL(blobUrl); } catch {}
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewDraft?.suggested_images]);

  // ─── Backend Connection & Draft Polling ───
  useEffect(() => {
    let isChecking = false;
    const pollBackend = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const healthRes = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
        if (healthRes.ok) {
          setSyncStatus((prev) => (prev === "Offline" || prev === "AI Disconnected" ? "Connected" : prev));

          // Poll for pending drafts if we don't already have one open
          setPreviewDraft((currentPreview) => {
            if (!currentPreview) {
              fetch(`${BACKEND_URL}/check-drafts`, { cache: "no-store" })
                .then(r => r.json())
                .then(async data => {
                  if (data.pending_count > 0 && data.drafts && data.drafts.length > 0) {
                    const draft = data.drafts.find((d: any) => d.status === "awaiting_approval");
                    if (draft) {
                      setPreviewText(draft.generated_post_text);
                      setPreviewDraft(draft);

                      // Trigger Native Notification via Capacitor
                      try {
                        const { LocalNotifications } = await import('@capacitor/local-notifications');
                        const perm = await LocalNotifications.requestPermissions();
                        if (perm.display === 'granted') {
                          await LocalNotifications.schedule({
                            notifications: [{
                              title: 'LinkedIn Draft Ready',
                              body: 'The AI has finished drafting your post. Click to review.',
                              id: Date.now(),
                            }],
                          });
                        }
                      } catch (e) {
                        console.error("Notification error:", e);
                      }
                    }
                  }
                })
                .catch(err => console.error("Draft poll error:", err));
            }
            return currentPreview;
          });
        } else {
          setSyncStatus("AI Disconnected");
        }
      } catch (e) {
        setSyncStatus("AI Disconnected");
      } finally {
        isChecking = false;
      }
    };
    pollBackend();
    const interval = setInterval(pollBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── Pipeline Status Polling (every 2s while processing) ───
  useEffect(() => {
    const pollPipeline = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/pipeline-status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.processing_count > 0 && data.drafts.length > 0) {
            setPipelineStage(data.drafts[0].stage_label);
            setCurrentGeneration(data.drafts[0].current_generation);
          } else {
            setPipelineStage(null);
            setCurrentGeneration(null);
          }
        }
      } catch (e) {
        // Silently ignore - health check handles connectivity
      }
    };
    const interval = setInterval(pollPipeline, 2000);
    pollPipeline();
    return () => clearInterval(interval);
  }, []);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [activeLink, setActiveLink] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linkFileRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);



  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; }
  }, [text]);

  // ─── Text Selection → Floating Toolbar ───
  const handleTextSelect = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) { setShowToolbar(false); return; }

    const selected = text.slice(start, end).trim();
    if (!selected) { setShowToolbar(false); return; }

    // Position toolbar above the textarea
    const rect = el.getBoundingClientRect();
    const cardRect = cardRef.current?.getBoundingClientRect();
    const offsetX = rect.left - (cardRect?.left ?? 0);
    const offsetY = rect.top - (cardRect?.top ?? 0);

    setSelectionRange({ start, end, text: selected });
    setToolbarPos({ x: offsetX + rect.width / 2, y: offsetY - 8 });
    setShowToolbar(true);
  }, [text]);

  // ─── Create a new text-image link for current selection ───
  const createLink = () => {
    if (!selectionRange) return;
    const existingLink = textImageLinks.find(
      (l) => l.startIndex === selectionRange.start && l.endIndex === selectionRange.end
    );
    if (existingLink) {
      setActiveLink(existingLink.id);
    } else {
      const link: TextImageLink = {
        id: crypto.randomUUID(),
        text: selectionRange.text,
        startIndex: selectionRange.start,
        endIndex: selectionRange.end,
        images: [],
      };
      setTextImageLinks((prev) => [...prev, link]);
      setActiveLink(link.id);
    }
    setShowToolbar(false);
    // Trigger file input
    setTimeout(() => linkFileRef.current?.click(), 100);
  };

  // ─── Add images to active link ───
  const handleLinkFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeLink) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const attachment: ImageAttachment = {
          id: crypto.randomUUID(),
          url: ev.target?.result as string,
          name: file.name,
        };
        setTextImageLinks((prev) =>
          prev.map((l) => l.id === activeLink ? { ...l, images: [...l.images, attachment] } : l)
        );
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // ─── Remove image from link ───
  const removeImageFromLink = (linkId: string, imgId: string) => {
    setTextImageLinks((prev) =>
      prev.map((l) => l.id === linkId ? { ...l, images: l.images.filter((i) => i.id !== imgId) } : l)
        .filter((l) => l.images.length > 0 || l.id === linkId)
    );
  };

  // ─── Remove entire link ───
  const removeLink = (linkId: string) => {
    setTextImageLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  // ─── Add more images to an existing link ───
  const addMoreToLink = (linkId: string) => {
    setActiveLink(linkId);
    setTimeout(() => linkFileRef.current?.click(), 100);
  };

  // ─── Tags ───
  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/^#/, "").replace(",", "");
      if (t && !tags.includes(t) && tags.length < 8) setTags((p) => [...p, t]);
      setTagInput("");
    }
  };

  // ─── Submit ───
  /*
   * ══════════════════════════════════════════════════
   *  POST http://192.168.1.150:8000/process-post
   *
   *  Payload:
   *  {
   *    text: string,
   *    tags: string[],
   *    imageLinks: [{ text, startIndex, endIndex, images: [base64...] }],
   *    timestamp: ISO string
   *  }
   * ══════════════════════════════════════════════════
   */
  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setSyncStatus("Queued");
    const payload = {
      text,
      tags,
      imageLinks: textImageLinks.map((l) => ({
        text: l.text,
        startIndex: l.startIndex,
        endIndex: l.endIndex,
        images: l.images.map((i) => i.url),
      })),
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${BACKEND_URL}/submit-raw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSyncStatus("Synced");
      } else {
        const errBody = await response.text();
        console.error("Backend Error on /submit-raw:", response.status, errBody);
        alert(`Backend Error: ${response.status} - ${errBody}`);
        setSyncStatus("Connected"); // Revert to connected since backend is alive, just rejected the payload
      }
    } catch (e) {
      console.error("Fetch exception during /submit-raw:", e);
      setSyncStatus("AI Disconnected");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSyncStatus("Connected"), 4000);
    }
  };

  const charCount = text.length;
  const isValid = text.trim().length > 0;

  // ─── Handle Approve / Reject ───
  const handleApprove = async () => {
    if (!previewDraft) return;
    setIsSubmitting(true);
    
    if (hasEdits) {
      // User changed text -> Send for rewrite
      try {
        const res = await fetch(`${BACKEND_URL}/rewrite-draft/${previewDraft.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edited_text: previewText })
        });
        if (res.ok) {
          setPreviewDraft(null);
          // Don't clear text/tags yet, they stay in background while rewriting
        } else {
          alert("Failed to submit rewrite.");
        }
      } catch (e) {
        console.error(e);
        alert("Network error submitting rewrite.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // No changes -> Post to LinkedIn
      try {
        const res = await fetch(`${BACKEND_URL}/approve-draft/${previewDraft.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ final_text: previewText, selected_image_paths: [] }) // Add image selection logic later if needed
        });
        if (res.ok) {
          setPreviewDraft(null);
          setText("");
          setTags([]);
          setTextImageLinks([]);
        } else {
          alert("Failed to approve draft.");
        }
      } catch (e) {
        console.error(e);
        alert("Network error approving draft.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleReject = async () => {
    if (!previewDraft) return;
    setIsSubmitting(true);
    try {
      await fetch(`${BACKEND_URL}/reject-draft/${previewDraft.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: "User rejected from widget." })
      });
      setPreviewDraft(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ══════════════════════
  //  FULLSCREEN APP VIEW
  // ══════════════════════
  return (
    <div className="w-full h-screen flex flex-col">

      {/* Hidden multi-file input for image linking */}
      <input ref={linkFileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={handleLinkFiles} />

      {/* ─── Main Card ─── */}
      <div className="relative w-full flex-1 flex flex-col">
        {/* Floating toolbar rendered outside overflow-hidden */}
        <AnimatePresence>
          {showToolbar && selectionRange && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={spring}
              className="absolute z-50 flex items-center gap-1.5 px-2.5 py-2 rounded-xl"
              style={{
                left: `${Math.min(Math.max(toolbarPos.x - 90, 16), 200)}px`,
                top: `${toolbarPos.y - 40}px`,
                background: "rgba(22,22,28,0.95)", backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}>
              <motion.button onClick={createLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer"
                style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)" }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <path d="M12 8v8M8 12h8" strokeLinecap="round" />
                </svg>
                Attach Images
              </motion.button>
              <div className="max-w-[100px] truncate text-[10px] px-1" style={{ color: "var(--text-tertiary)" }}>
                &ldquo;{selectionRange.text}&rdquo;
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="relative noise-overlay flex-1 flex flex-col"
          style={{
            background: "rgba(14,14,18,0.85)", backdropFilter: "blur(50px) saturate(1.7)",
            WebkitBackdropFilter: "blur(50px) saturate(1.7)",
          }}
          variants={stagger} initial="hidden" animate="visible">

          {/* ── Header ── */}
          <motion.div variants={fadeUp} className="flex items-center justify-between relative z-10" style={{ padding: "24px 28px 16px 28px" }}>
            <div className="flex items-center gap-2.5 pointer-events-none">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-glow)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" fill="#818cf8" opacity="0.7" />
                  <rect x="2" y="9" width="4" height="12" rx="0.5" fill="#818cf8" opacity="0.7" />
                  <circle cx="4" cy="4" r="2" fill="#818cf8" opacity="0.7" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Draft Post
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={syncStatus} />
            </div>
          </motion.div>

          <div className="h-px" style={{ background: "var(--border-subtle)", marginLeft: "28px", marginRight: "28px" }} />

          {/* ── Pipeline Status Banner ── */}
          <AnimatePresence>
            {pipelineStage && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div
                  className="flex flex-col gap-2 mx-7 my-2 px-4 py-3 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(129,140,248,0.04))",
                    border: "1px solid rgba(99,102,241,0.15)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#818cf8" }}
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[12px] font-medium" style={{ color: "#c7d2fe" }}>
                      {pipelineStage}
                    </span>
                  </div>
                  {currentGeneration && (
                    <div className="mt-1 p-2.5 rounded-lg max-h-32 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {currentGeneration}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Textarea ── */}
          <motion.div variants={fadeUp} className="relative z-10 flex-1 flex flex-col" style={{ padding: "16px 28px 16px 28px" }}>
            <textarea ref={textareaRef} value={text}
              onChange={(e) => setText(e.target.value)}
              onSelect={handleTextSelect}
              onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
              placeholder="Write your post... Select text to attach images."
              rows={12}
              className="w-full h-full flex-1 bg-transparent resize-none text-[16px] leading-relaxed font-normal"
              style={{ color: "var(--text-primary)", fontFamily: "inherit" }} />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                {textImageLinks.length > 0 ? `${textImageLinks.length} image link${textImageLinks.length > 1 ? "s" : ""}` : "Select text → attach images"}
              </span>
              <span className="text-[10px] tabular-nums"
                style={{ color: charCount > 2800 ? "var(--accent-error)" : "var(--text-tertiary)" }}>
                {charCount.toLocaleString()} / 3,000
              </span>
            </div>
          </motion.div>

          {/* ── Image Links Panel ── */}
          <AnimatePresence>
            {textImageLinks.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden">
                <div className="h-px" style={{ background: "var(--border-subtle)", marginLeft: "28px", marginRight: "28px" }} />
                <div className="relative z-10" style={{ padding: "16px 28px 12px 28px" }}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pill-text)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      Linked Images
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {textImageLinks.map((link) => (
                      <motion.div key={link.id} layout
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={spring}
                        className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {/* Link header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-medium truncate max-w-[200px]"
                            style={{ color: "var(--pill-text)" }}>
                            &ldquo;{link.text}&rdquo;
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <motion.button onClick={() => addMoreToLink(link.id)}
                              className="px-2 py-0.5 rounded-md text-[10px] cursor-pointer"
                              style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.15)" }}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              + Add
                            </motion.button>
                            <motion.button onClick={() => removeLink(link.id)}
                              className="w-5 h-5 rounded-md flex items-center justify-center cursor-pointer"
                              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.12)" }}
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                              </svg>
                            </motion.button>
                          </div>
                        </div>
                        {/* Thumbnails row */}
                        {link.images.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            <AnimatePresence>
                              {link.images.map((img) => (
                                <LinkedImageThumb key={img.id} img={img}
                                  onRemove={() => removeImageFromLink(link.id, img.id)} />
                              ))}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <div className="text-[10px] py-2 text-center" style={{ color: "var(--text-tertiary)" }}>
                            No images yet — click &ldquo;+ Add&rdquo;
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-px" style={{ background: "var(--border-subtle)", marginLeft: "28px", marginRight: "28px" }} />

          {/* ── Tags ── */}
          <motion.div variants={fadeUp} className="relative z-10" style={{ padding: "16px 28px 12px 28px" }}>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
              <AnimatePresence>
                {tags.map((tag) => (
                  <TagPill key={tag} tag={tag} onRemove={() => setTags((t) => t.filter((x) => x !== tag))} />
                ))}
              </AnimatePresence>
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag}
                placeholder={tags.length === 0 ? "Add tags..." : ""}
                className="flex-1 min-w-[80px] bg-transparent text-[12px] outline-none"
                style={{ color: "var(--text-secondary)" }} />
            </div>
          </motion.div>

          {/* ── Footer ── */}
          <motion.div variants={fadeUp} className="flex items-center justify-between relative z-10" style={{ padding: "12px 28px 24px 28px" }}>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {tags.length}/8 tags · {textImageLinks.reduce((a, l) => a + l.images.length, 0)} images
            </span>
            <motion.button onClick={handleSubmit} disabled={!isValid || isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting ? "rgba(99,102,241,0.08)"
                  : "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.12))",
                color: "#c7d2fe", border: "1px solid rgba(99,102,241,0.2)",
                boxShadow: isValid && !isSubmitting ? "0 0 20px rgba(99,102,241,0.08)" : "none",
              }}
              whileHover={isValid && !isSubmitting ? { scale: 1.03, boxShadow: "0 0 30px rgba(99,102,241,0.15)" } : {}}
              whileTap={isValid && !isSubmitting ? { scale: 0.96 } : {}} transition={spring}>
              {isSubmitting ? (<><Spinner /><span>Queuing…</span></>) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Queue for AI
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Preview Modal Overlay ─── */}
      <AnimatePresence>
        {previewDraft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 md:p-12"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-full overflow-y-auto flex flex-col rounded-2xl border"
              style={{
                background: "rgba(18,18,22,0.95)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
              }}
            >
              <div className="p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h2 className="text-xl font-medium tracking-tight text-white">Review AI Draft</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Make any final adjustments before publishing to LinkedIn.</p>
              </div>

              <div className="p-6 flex-1 flex flex-col gap-4">
                <textarea
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full min-h-[300px] p-4 rounded-xl bg-black/40 resize-none text-[15px] leading-relaxed text-white outline-none border"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                />

                {previewDraft.suggested_images?.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-medium mb-3 uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Attached Media ({previewDraft.suggested_images.length})</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {previewDraft.suggested_images.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {previewImageBlobs[imgUrl] ? (
                            <img src={previewImageBlobs[imgUrl]} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                              <svg className="animate-spin w-5 h-5 text-white/30" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t flex items-center justify-end gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}
                >
                  Discard
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
                  style={{ background: hasEdits ? "var(--accent-secondary)" : "var(--accent-primary)", color: "white" }}
                >
                  {isSubmitting ? "Processing..." : hasEdits ? "Rewrite with Changes" : "Approve & Post"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}