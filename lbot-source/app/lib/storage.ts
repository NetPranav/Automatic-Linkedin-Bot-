import { ProjectDraft, AppSettings, TextImageLink, ImageAttachment } from "./types";

const DRAFTS_KEY = "lbot_project_drafts_v2";
const ACTIVE_DRAFT_KEY = "lbot_active_draft_v2";
const SETTINGS_KEY = "lbot_app_settings_v2";

export const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: "auto",
  geminiApiKey: "",
  nvidiaApiKey: "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",
  backendUrl: "http://192.168.29.224:8000",
  autoSaveEnabled: true,
  theme: "minimal-light",
  authorName: "Pranav Dubey",
  authorHeadline: "AI Engineer & Software Innovator | Building the Future of Tech",
  authorAvatarUrl: "",
};

export interface ActiveDraftState {
  id: string;
  title: string;
  rawText: string;
  tags: string[];
  imageLinks: TextImageLink[];
  generalImages: ImageAttachment[];
  generatedPostText?: string;
  visionSummary?: string;
  lastSaved: string;
}

// ─── Settings Storage ───
export function getStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
  }
}

// ─── Active Draft Auto-Save ───
export function getStoredActiveDraft(): ActiveDraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveActiveDraft(draft: Partial<ActiveDraftState>): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredActiveDraft() || {
      id: crypto.randomUUID(),
      title: "Untitled Draft",
      rawText: "",
      tags: [],
      imageLinks: [],
      generalImages: [],
      lastSaved: new Date().toISOString(),
    };
    const updated = {
      ...current,
      ...draft,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to auto-save active draft:", e);
  }
}

export function clearActiveDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
  } catch {}
}

// ─── Project Drafts Collection ───
export function getAllProjects(): ProjectDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const items: ProjectDraft[] = JSON.parse(raw);
    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export function saveProject(project: ProjectDraft): void {
  if (typeof window === "undefined") return;
  try {
    const all = getAllProjects();
    const index = all.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      all[index] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      all.unshift({ ...project, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to save project draft:", e);
  }
}

export function getProjectById(id: string): ProjectDraft | null {
  const all = getAllProjects();
  return all.find((p) => p.id === id) || null;
}

export function deleteProject(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = getAllProjects().filter((p) => p.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to delete project draft:", e);
  }
}

export function getQueuedProjects(): ProjectDraft[] {
  return getAllProjects().filter((p) => p.status === "queued");
}

export function markProjectStatus(id: string, status: ProjectDraft["status"], extra?: Partial<ProjectDraft>): void {
  const project = getProjectById(id);
  if (!project) return;
  saveProject({
    ...project,
    ...extra,
    status,
    updatedAt: new Date().toISOString(),
  });
}
