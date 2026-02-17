"use client";

import Sidebar from "./Sidebar";
import ScrollToTop from "./ScrollToTop";
import { useGamificationStore, BADGES } from "@/store/gamification";
import { useUIStore } from "@/store/ui";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

function ShellInner({ children }: { children: ReactNode }) {
  const { sidebarCollapsed } = useUIStore();
  const { lastLevelUp, newBadge, dismissLevelUp, dismissNewBadge, getLevel } = useGamificationStore();
  const level = getLevel();
  const badge = newBadge ? BADGES.find((b) => b.id === newBadge) : null;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />
      {/* Main content - responsive margin synced with sidebar state */}
      <main
        className="flex-1 max-md:!mr-0 transition-all duration-300 overflow-x-hidden"
        style={{ marginRight: sidebarCollapsed ? 72 : 260 }}
      >
        <div className="p-4 sm:p-6 lg:p-8 pt-16 md:pt-6 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Level Up Modal */}
      <AnimatePresence>
        {lastLevelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={dismissLevelUp}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white rounded-3xl p-10 text-center max-w-sm mx-4 shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8 }}
                className="text-7xl mb-5"
              >
                {level.icon}
              </motion.div>
              <h2 className="text-2xl font-extrabold gradient-text mb-2">עלית רמה!</h2>
              <p className="text-lg text-gold-600 font-bold mb-1">
                רמה {level.level} — {level.name}
              </p>
              <p className="text-slate-400 text-sm mb-8">המשך כך! אתה בדרך הנכונה</p>
              <button
                onClick={dismissLevelUp}
                className="bg-gradient-to-l from-torah-600 to-torah-700 text-white px-8 py-3 rounded-2xl font-semibold hover:shadow-lg hover:shadow-torah-500/20 transition-all"
              >
                יופי!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Badge Modal */}
      <AnimatePresence>
        {badge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={dismissNewBadge}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white rounded-3xl p-10 text-center max-w-sm mx-4 shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-7xl mb-5"
              >
                {badge.icon}
              </motion.div>
              <h2 className="text-2xl font-extrabold gradient-text mb-2">הישג חדש!</h2>
              <p className="text-lg font-bold text-gold-600 mb-1">{badge.title}</p>
              <p className="text-slate-400 text-sm mb-8">{badge.description}</p>
              <button
                onClick={dismissNewBadge}
                className="bg-gradient-to-l from-gold-500 to-gold-600 text-white px-8 py-3 rounded-2xl font-semibold hover:shadow-lg hover:shadow-gold-500/20 transition-all"
              >
                מדהים!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ScrollToTop />
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return <ShellInner>{children}</ShellInner>;
}
