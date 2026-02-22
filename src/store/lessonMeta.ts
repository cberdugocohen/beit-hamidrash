import { create } from "zustand";

export interface LessonMeta {
  videoId: string;
  summary?: string;
  transcriptUrl?: string;
  quizUrl?: string;
  presentationUrl?: string;
  notes?: string;
  updatedAt?: string;
}

interface LessonMetaState {
  meta: Record<string, LessonMeta>;
  setMeta: (videoId: string, data: Partial<LessonMeta>) => void;
  getMeta: (videoId: string) => LessonMeta | undefined;
}

export const useLessonMetaStore = create<LessonMetaState>()(
  (set, get) => ({
    meta: {},

    setMeta: (videoId, data) => {
      const existing = get().meta[videoId] || { videoId };
      set({
        meta: {
          ...get().meta,
          [videoId]: { ...existing, ...data, updatedAt: new Date().toISOString() },
        },
      });
    },

    getMeta: (videoId) => get().meta[videoId],
  })
);
