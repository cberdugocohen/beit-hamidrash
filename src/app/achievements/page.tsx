"use client";

import Shell from "@/components/Shell";
import { useGamificationStore, BADGES } from "@/store/gamification";
import { motion } from "framer-motion";
import { Trophy, Lock, Sparkles } from "lucide-react";

export default function AchievementsPage() {
  const { earnedBadges } = useGamificationStore();

  const categories = [
    { key: "behavior" as const, title: "התנהגות", desc: "הרגלי למידה טובים", icon: "🎯" },
    { key: "parsha" as const, title: "פרשיות", desc: "השלמת ספרים שלמים", icon: "📚" },
    { key: "hidden" as const, title: "נסתרים", desc: "הישגים מיוחדים", icon: "✨" },
  ];

  const totalVisible = BADGES.filter(
    (b) => b.category !== "hidden" || earnedBadges.includes(b.id)
  ).length;

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold gradient-text">ההישגים שלי</h1>
          <p className="text-slate-400 text-sm mt-1.5 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold-500" />
            <span>
              {earnedBadges.length} מתוך {totalVisible} הישגים
            </span>
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <div className="text-3xl font-extrabold text-torah-600">{earnedBadges.length}</div>
            <div className="text-xs text-slate-400 mt-1">הישגים שנצברו</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <div className="text-3xl font-extrabold text-gold-500">{totalVisible - earnedBadges.length}</div>
            <div className="text-xs text-slate-400 mt-1">נותרו לפתיחה</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <div className="text-3xl font-extrabold text-emerald-500">
              {totalVisible > 0 ? Math.round((earnedBadges.length / totalVisible) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-400 mt-1">אחוז השלמה</div>
          </div>
        </div>

        {/* Categories */}
        {categories.map((cat) => {
          const badges = BADGES.filter((b) => b.category === cat.key);

          if (cat.key === "hidden") {
            const earnedHidden = badges.filter((b) => earnedBadges.includes(b.id));
            const unearnedCount = badges.length - earnedHidden.length;

            return (
              <div key={cat.key} className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-slate-700">{cat.title}</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4">{cat.desc}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {earnedHidden.map((badge, i) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-gradient-to-br from-gold-50 to-gold-100 border border-gold-200 rounded-2xl p-5 text-center shadow-sm"
                    >
                      <div className="text-4xl mb-3">{badge.icon}</div>
                      <div className="text-sm font-bold text-gold-800">{badge.title}</div>
                      <div className="text-[11px] text-gold-600/70 mt-1">{badge.description}</div>
                    </motion.div>
                  ))}
                  {Array.from({ length: unearnedCount }).map((_, i) => (
                    <div
                      key={`hidden-${i}`}
                      className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 text-center"
                    >
                      <div className="text-4xl mb-3 opacity-30">❓</div>
                      <div className="text-sm font-bold text-slate-300">???</div>
                      <div className="text-[11px] text-slate-200 mt-1">הישג נסתר</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={cat.key} className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{cat.icon}</span>
                <h2 className="text-lg font-bold text-slate-700">{cat.title}</h2>
                <span className="text-xs text-slate-300 mr-1">
                  {badges.filter((b) => earnedBadges.includes(b.id)).length}/{badges.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">{cat.desc}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {badges.map((badge, i) => {
                  const isEarned = earnedBadges.includes(badge.id);
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`rounded-2xl p-5 text-center border transition-all relative overflow-hidden ${
                        isEarned
                          ? "bg-gradient-to-br from-gold-50 to-gold-100 border-gold-200 shadow-sm"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {!isEarned && (
                        <div className="absolute top-2 left-2">
                          <Lock className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      )}
                      <div className={`text-4xl mb-3 ${!isEarned ? "grayscale opacity-30" : ""}`}>
                        {badge.icon}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isEarned ? "text-gold-800" : "text-slate-400"
                        }`}
                      >
                        {badge.title}
                      </div>
                      <div
                        className={`text-[11px] mt-1 ${
                          isEarned ? "text-gold-600/70" : "text-slate-300"
                        }`}
                      >
                        {badge.description}
                      </div>
                      {isEarned && (
                        <div className="mt-2.5">
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            הושג ✓
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
