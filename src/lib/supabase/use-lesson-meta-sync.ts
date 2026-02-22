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

  // ── Load all lesson meta from API on mount ──
  const loadAllMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/lesson-meta");
      if (!res.ok) {
        console.warn("lesson_meta API failed:", res.status);
        return;
      }
      const json = await res.json();
      const rows = json.data;

      if (Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          metaStore.setMeta(row.video_id, {
            summary: row.summary || "",
            transcriptUrl: row.transcript_url || "",
            quizUrl: row.quiz_url || "",
            presentationUrl: row.presentation_url || "",
          });
        }
        console.log("lesson_meta loaded:", rows.length, "rows");
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

  // ── Save meta to DB via API (admin only, uses service role to bypass RLS) ──
  const saveMetaToDB = useCallback(async (videoId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!user || !isAdmin) return { ok: false, error: "אין הרשאת אדמין" };

    const meta = metaStore.getMeta(videoId);
    if (!meta) return { ok: false, error: "אין נתונים לשמור" };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return { ok: false, error: "לא מחובר" };

      const res = await fetch("/api/admin/lesson-meta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoId,
          summary: meta.summary || "",
          transcriptUrl: meta.transcriptUrl || "",
          quizUrl: meta.quizUrl || "",
          presentationUrl: meta.presentationUrl || "",
        }),
      });

      const json = await res.json();
      if (json.ok) return { ok: true };
      return { ok: false, error: json.error || "שגיאה לא ידועה" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "שגיאה לא ידועה";
      console.error("lesson_meta save error:", msg);
      return { ok: false, error: msg };
    }
  }, [user, isAdmin, metaStore]);

  return { saveMetaToDB, isAdmin };
}
