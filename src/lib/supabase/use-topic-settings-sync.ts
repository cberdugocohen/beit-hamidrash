"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./auth-context";
import { createClient } from "./client";
import { useTopicSettingsStore } from "@/store/topicSettings";

const supabase = createClient();
const BUCKET = "data";
const FILE = "topic-settings.json";

type SettingsMap = Record<string, { image_url?: string }>;

async function loadSettingsFile(): Promise<SettingsMap> {
  try {
    const { data } = await supabase.storage.from(BUCKET).download(FILE);
    if (data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch { /* file may not exist yet */ }
  return {};
}

async function writeSettingsFile(settings: SettingsMap) {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
  await supabase.storage.from(BUCKET).upload(FILE, blob, {
    contentType: "application/json",
    upsert: true,
  });
}

export function useTopicSettingsSync() {
  const { user, profile } = useAuth();
  const store = useTopicSettingsStore();
  const loadedRef = useRef(false);
  const isAdmin = profile?.is_admin ?? false;

  const loadFromStorage = useCallback(async () => {
    const settings = await loadSettingsFile();
    for (const [topic, val] of Object.entries(settings)) {
      if (val.image_url) {
        store.setTopicImage(topic, val.image_url);
      }
    }
  }, [store]);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadFromStorage();
    }
  }, [loadFromStorage]);

  const saveTopicImage = useCallback(async (topic: string, imageUrl: string) => {
    if (!user || !isAdmin) return;
    const settings = await loadSettingsFile();
    settings[topic] = { image_url: imageUrl || undefined };
    await writeSettingsFile(settings);
  }, [user, isAdmin]);

  const removeTopicImage = useCallback(async (topic: string) => {
    if (!user || !isAdmin) return;
    const settings = await loadSettingsFile();
    delete settings[topic];
    await writeSettingsFile(settings);
  }, [user, isAdmin]);

  return { saveTopicImage, removeTopicImage, isAdmin };
}
