export type SyncStatus = "Offline" | "Queued" | "Synced" | "AI Disconnected" | "Connected" | "StandAlone";

export type AIProvider = "auto" | "gemini" | "nvidia" | "local_backend";

export type ProjectStatus = "draft" | "queued" | "ready_to_post" | "posted" | "archived";

export interface ImageAttachment {
  id: string;
  url: string; // Base64 data URI or image URL
  name: string;
  size?: number;
}

export interface TextImageLink {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  images: ImageAttachment[];
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  contextHint?: string;
  suggestedAnswers: string[];
  selectedAnswer?: string;
  customAnswer?: string;
}

export interface PostSuggestions {
  alternativeHooks: {
    style: "Contrarian" | "Storyteller" | "Metric-Driven" | "Curiosity-Gap";
    text: string;
  }[];
  suggestedCTAs: string[];
  toneVariations: {
    tone: "Executive" | "Casual & Relatable" | "High-Energy" | "Technical Deep-Dive";
    previewText: string;
  }[];
  viralScore: number; // 0-100
  scoreCritique: string[];
  recommendedHashtags: string[];
  bestPostingTime: string;
}

export interface ProjectDraft {
  id: string;
  title: string;
  rawText: string;
  tags: string[];
  imageLinks: TextImageLink[];
  generalImages: ImageAttachment[];
  
  // AI Outputs
  generatedPostText?: string;
  finalApprovedText?: string;
  visionSummary?: string;
  suggestedImages?: string[];
  
  // Interactive Questions & Suggestions
  clarificationQuestions?: ClarificationQuestion[];
  suggestions?: PostSuggestions;
  
  // Status & Timestamps
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  
  // Sync
  backendDraftId?: string;
  syncError?: string;
}

export interface AppSettings {
  aiProvider: AIProvider;
  geminiApiKey: string;
  nvidiaApiKey: string;
  backendUrl: string;
  autoSaveEnabled: boolean;
  theme: "minimal-light" | "gemini-aurora" | "nvidia-cyber" | "deep-dark";
  authorName: string;
  authorHeadline: string;
  authorAvatarUrl: string;
}

export interface GenerationProgress {
  stage: string;
  progressPercent: number;
  currentOutputChunk?: string;
  error?: string;
}
