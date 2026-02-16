"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./auth-context";
import { createClient } from "./client";
import { useLessonMetaStore } from "@/store/lessonMeta";

/**
 * Syncs lesson meta (summaries, links) with Supabase.
 * - On mount: load all lesson meta from DB into local store
 * - On admin save: write to DB (if user is admin)
 */
export function useLessonMetaSync() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const metaStore = useLessonMetaStore();
  const loadedRef = useRef(false);

  const isAdmin = profile?.is_admin ?? false;

  // ── Load all lesson meta from DB on mount ──
  const loadAllMeta = useCallback(async () => {
    const { data } = await supabase
      .from("lesson_meta")
      .select("*");

    if (data && data.length > 0) {
      for (const row of data) {
        metaStore.setMeta(row.video_id, {
          summary: row.summary || "",
          transcriptUrl: row.transcript_url || "",
          quizUrl: row.quiz_url || "",
          presentationUrl: row.presentation_url || "",
        });
      }
    }
  }, [supabase, metaStore]);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadAllMeta();
    }
  }, [loadAllMeta]);

  // ── Save meta to DB (admin only) ──
  const saveMetaToDB = useCallback(async (videoId: string) => {
    if (!user || !isAdmin) return;

    const meta = metaStore.getMeta(videoId);
    if (!meta) return;

    await supabase
      .from("lesson_meta")
      .upsert({
        video_id: videoId,
        summary: meta.summary || null,
        transcript_url: meta.transcriptUrl || null,
        quiz_url: meta.quizUrl || null,
        presentation_url: meta.presentationUrl || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "video_id" });
  }, [supabase, user, isAdmin, metaStore]);

  return { saveMetaToDB, isAdmin };
}
