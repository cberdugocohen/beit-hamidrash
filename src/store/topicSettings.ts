import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TopicSettings {
  imageUrl?: string;
}

interface TopicSettingsState {
  topics: Record<string, TopicSettings>;
  setTopicImage: (topic: string, imageUrl: string) => void;
  removeTopicImage: (topic: string) => void;
  getTopicImage: (topic: string) => string | undefined;
}

export const useTopicSettingsStore = create<TopicSettingsState>()(
  persist(
    (set, get) => ({
      topics: {},

      setTopicImage: (topic, imageUrl) => {
        set({
          topics: {
            ...get().topics,
            [topic]: { ...get().topics[topic], imageUrl },
          },
        });
      },

      removeTopicImage: (topic) => {
        const { [topic]: _, ...rest } = get().topics;
        set({ topics: rest });
      },

      getTopicImage: (topic) => get().topics[topic]?.imageUrl,
    }),
    {
      name: "lms-topic-settings",
    }
  )
);
