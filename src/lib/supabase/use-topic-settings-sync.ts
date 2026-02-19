"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./auth-context";
import { createClient } from "./client";
import { useTopicSettingsStore } from "@/store/topicSettings";

const supabase = createClient();

export function useTopicSettingsSync() {
  const { user, profile } = useAuth();
  const store = useTopicSettingsStore();
  const loadedRef = useRef(false);
  const isAdmin = profile?.is_admin ?? false;

  const loadFromDB = useCallback(async () => {
    const { data } = await supabase
      .from("topic_settings")
      .select("*");

    if (data && data.length > 0) {
      for (const row of data) {
        if (row.image_url) {
          store.setTopicImage(row.topic, row.image_url);
        }
      }
    }
  }, [store]);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadFromDB();
    }
  }, [loadFromDB]);

  const saveTopicImage = useCallback(async (topic: string, imageUrl: string) => {
    if (!user || !isAdmin) return;

    await supabase
      .from("topic_settings")
      .upsert({
        topic,
        image_url: imageUrl || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "topic" });
  }, [user, isAdmin]);

  const removeTopicImage = useCallback(async (topic: string) => {
    if (!user || !isAdmin) return;

    await supabase
      .from("topic_settings")
      .delete()
      .eq("topic", topic);
  }, [user, isAdmin]);

  return { saveTopicImage, removeTopicImage, isAdmin };
}
