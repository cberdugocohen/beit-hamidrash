"use client";

import Shell from "@/components/Shell";
import { useGamificationStore, LEVELS } from "@/store/gamification";
import { useAuth } from "@/lib/supabase/auth-context";
import { useToast } from "@/components/Toast";
import { getAllVideos, setVideos, isLoaded, Video } from "@/data/content";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Star, BookOpen, Coins, Flame, Trophy, Zap, TrendingUp } from "lucide-react";

export default function ProfilePage() {
  const store = useGamificationStore();
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const displayName = profile?.display_name || store.displayName || "";
  const [nameInput, setNameInput] = useState(displayName);
  const [totalLessons, setTotalLessons] = useState(getAllVideos().length);
  const level = store.getLevel();
  const levelProgress = store.getLevelProgress();
  const completedCount = store.getCompletedLessonsCount();

  useEffect(() => {
    if (!isLoaded()) {
      fetch("/api/videos")
        .then((r) => r.json())
        .then((data: Video[]) => {
          setVideos(data);
          setTotalLessons(data.length);
        });
    }
  }, []);

  useEffect(() => {
    if (displayName) setNameInput(displayName);
  }, [displayName]);

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      await updateProfile({ display_name: nameInput.trim() });
      toast("השם עודכן בהצלחה");
    }
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold gradient-text mb-8">הפרופיל שלי</h1>

        {/* Name Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h2 className="font-bold text-slate-700 mb-3 text-sm">שם תצוגה</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="הכנס את שמך..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-torah-300 focus:border-transparent bg-slate-50 placeholder:text-slate-300"
              dir="rtl"
            />
            <button
              onClick={handleSaveName}
              className="bg-gradient-to-l from-torah-600 to-torah-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-torah-500/20 transition-all"
            >
              שמור
            </button>
          </div>
        </div>

        {/* Level Hero Card */}
        <div className="bg-gradient-to-l from-torah-700 via-torah-800 to-torah-900 rounded-2xl p-7 mb-6 text-white shadow-xl shadow-torah-900/20 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/[0.03] rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/[0.02] rounded-full translate-x-1/4 translate-y-1/4" />
          <div className="relative flex items-center gap-5 mb-5">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl drop-shadow-lg"
            >
              {level.icon}
            </motion.div>
            <div>
              <div className="text-2xl font-extrabold text-gold-300">{level.name}</div>
              <div className="text-white/40 text-sm">רמה {level.level} מתוך {LEVELS.length}</div>
            </div>
          </div>
          <div className="relative w-full bg-white/10 rounded-full h-3 mb-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="bg-gradient-to-l from-gold-300 to-gold-500 h-full rounded-full"
            />
          </div>
          <div className="relative flex justify-between text-xs text-white/35">
            <span>{store.xp.toLocaleString()} XP</span>
            {level.level < LEVELS.length && (
              <span>{LEVELS[level.level].xpRequired.toLocaleString()} XP לרמה הבאה</span>
            )}
          </div>
        </div>

        {/* Stats Grid - using static Tailwind classes instead of dynamic */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-xs text-slate-400 font-medium">XP כולל</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{store.xp.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-torah-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-torah-500" />
              </div>
              <span className="text-xs text-slate-400 font-medium">נקודות תורה</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{store.torahPoints.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs text-slate-400 font-medium">מטבעות חכמה</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{store.wisdomCoins.toString()}</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-xs text-slate-400 font-medium">רצף נוכחי</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{store.currentStreak} ימים</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-xs text-slate-400 font-medium">רצף שיא</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{store.longestStreak} ימים</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-xs text-slate-400 font-medium">שיעורים שהושלמו</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{completedCount}/{totalLessons}</div>
          </div>
        </div>

        {/* All Levels */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-700 mb-5 text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-gold-500" /> מסלול הרמות
          </h2>
          <div className="space-y-2">
            {LEVELS.map((lvl) => {
              const isCurrentLevel = lvl.level === level.level;
              const isPast = lvl.level < level.level;

              return (
                <div
                  key={lvl.level}
                  className={`flex items-center gap-4 p-3.5 rounded-xl transition-all ${
                    isCurrentLevel
                      ? "bg-torah-50 border border-torah-200 shadow-sm"
                      : isPast
                      ? "bg-emerald-50/40"
                      : "opacity-40"
                  }`}
                >
                  <span className="text-2xl w-10 text-center">{lvl.icon}</span>
                  <div className="flex-1">
                    <div className={`font-bold text-sm ${
                      isCurrentLevel ? "text-torah-700" : isPast ? "text-emerald-700" : "text-slate-400"
                    }`}>
                      רמה {lvl.level} — {lvl.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{lvl.xpRequired.toLocaleString()} XP</div>
                  </div>
                  {isPast && (
                    <span className="text-emerald-500 text-xs font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">✓</span>
                  )}
                  {isCurrentLevel && (
                    <span className="text-torah-600 text-xs font-bold bg-torah-100 px-3 py-1 rounded-full">כאן</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
