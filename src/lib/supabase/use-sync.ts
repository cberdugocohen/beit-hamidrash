"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./auth-context";
import { createClient } from "./client";
import { useGamificationStore } from "@/store/gamification";

/**
 * Syncs local gamification state (progress, XP, badges, streaks)
 * with Supabase when a user is logged in.
 *
 * Strategy:
 * - On login: load from DB → merge into local store (DB wins if newer)
 * - On local change: debounce-write to DB
 * - On logout: local store stays (offline-first)
 */
export function useSupabaseSync() {
  const { user, profile, updateProfile } = useAuth();
  const supabase = createClient();
  const store = useGamificationStore();
  const syncedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load progress from DB on login ──
  const loadFromDB = useCallback(async (userId: string) => {
    // 1. Load lesson progress
    const { data: progressRows } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed, completed_at")
      .eq("user_id", userId);

    if (progressRows && progressRows.length > 0) {
      const currentProgress = { ...store.lessonProgress };
      let changed = false;
      for (const row of progressRows) {
        if (row.completed && !currentProgress[row.lesson_id]?.completed) {
          currentProgress[row.lesson_id] = {
            lessonId: row.lesson_id,
            completed: true,
            watchedPercent: 100,
            completedAt: row.completed_at || new Date().toISOString(),
          };
          changed = true;
        }
      }
      if (changed) {
        useGamificationStore.setState({ lessonProgress: currentProgress });
      }
    }

    // 2. Load profile stats (XP, streak, badges) — DB wins if higher
    if (profile) {
      const dbXp = profile.xp || 0;
      const localXp = store.xp;
      if (dbXp > localXp) {
        useGamificationStore.setState({
          xp: dbXp,
          currentStreak: profile.current_streak || 0,
          longestStreak: profile.longest_streak || 0,
          earnedBadges: profile.earned_badges || [],
        });
      }
    }
  }, [supabase, store, profile]);

  // ── Save progress to DB ──
  const saveToDB = useCallback(async (userId: string) => {
    const progress = useGamificationStore.getState().lessonProgress;
    const state = useGamificationStore.getState();

    // 1. Upsert all completed lessons
    const rows = Object.entries(progress)
      .filter(([, p]) => p.completed)
      .map(([lessonId, p]) => ({
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: p.completedAt || new Date().toISOString(),
      }));

    if (rows.length > 0) {
      await supabase
        .from("lesson_progress")
        .upsert(rows, { onConflict: "user_id,lesson_id" });
    }

    // 2. Update profile stats
    await updateProfile({
      xp: state.xp,
      current_streak: state.currentStreak,
      longest_streak: state.longestStreak,
      earned_badges: state.earnedBadges,
      last_activity_date: state.lastActivityDate || undefined,
    } as any);
  }, [supabase, updateProfile]);

  // ── On login: load from DB ──
  useEffect(() => {
    if (user && !syncedRef.current) {
      syncedRef.current = true;
      loadFromDB(user.id);
    }
    if (!user) {
      syncedRef.current = false;
    }
  }, [user, loadFromDB]);

  // ── Subscribe to store changes → debounce save to DB ──
  useEffect(() => {
    if (!user) return;

    const unsub = useGamificationStore.subscribe(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveToDB(user.id);
      }, 2000); // 2 second debounce
    });

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, saveToDB]);
}
