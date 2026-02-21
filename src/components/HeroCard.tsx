"use client";

import { Flame, Zap, TrendingUp, Target, RotateCw } from "lucide-react";

interface HeroCardProps {
  displayName: string;
  greeting: string;
  levelIcon: string;
  levelName: string;
  xp: number;
  currentStreak: number;
  lastActivityDate: string | null;
  todayStr: string;
  completedCount: number;
  totalVideos: number;
  overallProgress: number;
  todayCompleted: number;
  dailyGoal: number;
  syncStatus: "idle" | "syncing" | "done" | "error";
  syncMsg: string;
}

export default function HeroCard({
  displayName, greeting, levelIcon, levelName, xp, currentStreak,
  lastActivityDate, todayStr, completedCount, totalVideos, overallProgress,
  todayCompleted, dailyGoal, syncStatus, syncMsg,
}: HeroCardProps) {
  return (
    <div className="mb-6 bg-gradient-to-l from-torah-700 via-torah-800 to-torah-900 rounded-2xl p-6 text-white shadow-xl shadow-torah-900/20 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/[0.03] rounded-full -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/[0.02] rounded-full translate-x-1/4 translate-y-1/4" />

      <div className="relative flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-sm mb-1">{greeting},</p>
          <h1 className="text-2xl font-extrabold text-white mb-3">{displayName}</h1>

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">{levelIcon}</span>
              <span className="text-gold-300 font-semibold text-sm">{levelName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50 text-sm">
              <Zap className="w-3.5 h-3.5 text-gold-400" />
              <span>{xp.toLocaleString()} XP</span>
            </div>
            {currentStreak > 0 && (
              <div className="flex items-center gap-1.5 text-orange-300 text-sm">
                <Flame className="w-3.5 h-3.5" />
                <span className="font-semibold">{currentStreak} ימים</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-white/50 text-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{completedCount}/{totalVideos}</span>
            </div>
          </div>

          {/* Streak warning */}
          {currentStreak > 0 && lastActivityDate && lastActivityDate !== todayStr && (
            <div className="mt-3 flex items-center gap-2 bg-orange-500/20 border border-orange-500/20 rounded-lg px-3 py-1.5 w-fit">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              <span className="text-xs text-orange-200 font-medium">עוד לא למדת היום! יש ללמוד כדי לשמור על רצף של {currentStreak} ימים</span>
            </div>
          )}
        </div>

        {/* Right side: Daily goal + Progress */}
        <div className="hidden sm:flex items-center gap-5">
          {/* Daily goal */}
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-1.5">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={todayCompleted >= dailyGoal ? "#10b981" : "#efc94b"} strokeWidth="3" strokeDasharray={`${Math.min((todayCompleted / dailyGoal) * 100, 100)}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Target className={`w-4 h-4 ${todayCompleted >= dailyGoal ? "text-emerald-400" : "text-gold-300"}`} />
              </div>
            </div>
            <div className="text-[11px] text-white/40">יעד יומי</div>
            <div className="text-xs font-bold text-white/70">{todayCompleted}/{dailyGoal}</div>
          </div>

          {/* Overall progress */}
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-1.5">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b5bdb" strokeWidth="3" strokeDasharray={`${overallProgress}, 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{overallProgress}%</span>
            </div>
            <div className="text-[11px] text-white/40">התקדמות</div>
            <div className="text-xs font-bold text-white/70">כללית</div>
          </div>
        </div>
      </div>

      {/* Sync indicator */}
      {syncStatus === "syncing" && (
        <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] text-white/30">
          <RotateCw className="w-3 h-3 animate-spin" /> מסנכרן
        </div>
      )}
      {syncStatus === "done" && syncMsg && (
        <div className="absolute top-3 left-3 text-[10px] text-emerald-300">{syncMsg}</div>
      )}
    </div>
  );
}
