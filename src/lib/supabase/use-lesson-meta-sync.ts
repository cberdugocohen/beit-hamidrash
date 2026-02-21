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
const supabase = createClient();

export function useLessonMetaSync() {
  const { user, profile } = useAuth();
  const metaStore = useLessonMetaStore();
  const loadedRef = useRef(false);

  const isAdmin = profile?.is_admin ?? false;

  // ── Load all lesson meta from DB on mount ──
  const loadAllMeta = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("lesson_meta")
        .select("*");

      if (error) {
        console.warn("lesson_meta load failed:", error.message);
        return; // Keep local data as-is
      }

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
    } catch (e) {
      console.warn("lesson_meta load error:", e);
    }
  }, [metaStore]);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadAllMeta();
    }
  }, [loadAllMeta]);

  // ── Save meta to DB (admin only) ──
  // Returns { ok: true } on success, { ok: false, error: string } on failure
  const saveMetaToDB = useCallback(async (videoId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!user || !isAdmin) return { ok: false, error: "אין הרשאת אדמין" };

    const meta = metaStore.getMeta(videoId);
    if (!meta) return { ok: false, error: "אין נתונים לשמור" };

    try {
      const { error } = await supabase
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

      if (error) {
        console.error("lesson_meta save failed:", error.message);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "שגיאה לא ידועה";
      console.error("lesson_meta save error:", msg);
      return { ok: false, error: msg };
    }
  }, [user, isAdmin, metaStore]);

  return { saveMetaToDB, isAdmin };
}
