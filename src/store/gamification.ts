import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// LEVELS
// ============================================================
export const LEVELS = [
  { level: 1, name: "תלמיד", icon: "🌱", xpRequired: 0 },
  { level: 2, name: "שוקד", icon: "📗", xpRequired: 500 },
  { level: 3, name: "חרוץ", icon: "📘", xpRequired: 1500 },
  { level: 4, name: "מבין", icon: "📙", xpRequired: 3500 },
  { level: 5, name: "משכיל", icon: "🔮", xpRequired: 7000 },
  { level: 6, name: "יודע", icon: "🏛️", xpRequired: 12000 },
  { level: 7, name: "מעמיק", icon: "🔭", xpRequired: 20000 },
  { level: 8, name: "חכם", icon: "👑", xpRequired: 32000 },
  { level: 9, name: "נבון", icon: "💎", xpRequired: 50000 },
  { level: 10, name: "תלמיד חכם", icon: "🌟", xpRequired: 75000 },
];

// ============================================================
// BADGES
// ============================================================
export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "parsha" | "behavior" | "social" | "hidden";
}

export const BADGES: Badge[] = [
  // Parsha badges
  { id: "grad-bereshit", title: "בוגר בראשית", description: "השלמת כל פרשיות ספר בראשית", icon: "🌍", category: "parsha" },
  { id: "grad-shmot", title: "בוגר שמות", description: "השלמת כל פרשיות ספר שמות", icon: "🔥", category: "parsha" },
  { id: "grad-vayikra", title: "בוגר ויקרא", description: "השלמת כל פרשיות ספר ויקרא", icon: "⛺", category: "parsha" },
  { id: "grad-bamidbar", title: "בוגר במדבר", description: "השלמת כל פרשיות ספר במדבר", icon: "🏜️", category: "parsha" },
  { id: "grad-dvarim", title: "בוגר דברים", description: "השלמת כל פרשיות ספר דברים", icon: "📜", category: "parsha" },
  { id: "grad-torah", title: "בוגר התורה", description: "השלמת כל חמשת חומשי תורה", icon: "🏆", category: "parsha" },
  // Behavior badges
  { id: "first-lesson", title: "ראשון", description: "השלמת השיעור הראשון", icon: "🎯", category: "behavior" },
  { id: "streak-7", title: "שבוע של למידה", description: "7 ימי למידה ברצף", icon: "🔥", category: "behavior" },
  { id: "streak-30", title: "חודש של למידה", description: "30 ימי למידה ברצף", icon: "💪", category: "behavior" },
  { id: "streak-100", title: "מאה ימים", description: "100 ימי למידה ברצף", icon: "🏅", category: "behavior" },
  { id: "marathon", title: "מרתון", description: "5 שיעורים ביום אחד", icon: "🏃", category: "behavior" },
  { id: "night-owl", title: "ינשוף לילה", description: "למידה אחרי 22:00", icon: "🌙", category: "behavior" },
  { id: "early-bird", title: "משכים קום", description: "למידה לפני 06:00", icon: "🌅", category: "behavior" },
  { id: "consistent", title: "מתמיד", description: "למידה 4 שבועות ברציפות", icon: "📚", category: "behavior" },
  { id: "ten-lessons", title: "עשר ומעלה", description: "השלמת 10 שיעורים", icon: "🔟", category: "behavior" },
  { id: "fifty-lessons", title: "חמישים", description: "השלמת 50 שיעורים", icon: "5️⃣", category: "behavior" },
  { id: "hundred-lessons", title: "מאה שיעורים", description: "השלמת 100 שיעורים", icon: "💯", category: "behavior" },
  // Hidden
  { id: "comeback", title: "חוזר בתשובה", description: "חזרה למערכת אחרי 30 יום", icon: "🔄", category: "hidden" },
];

// ============================================================
// XP REWARDS
// ============================================================
export const XP_REWARDS = {
  watchLesson: 100,
  completeUnit: 200,
  completeModule: 500,
  streakDay3: 30,
  streakDay7: 100,
  streakDay30: 500,
  firstOfDay: 25,
};

// ============================================================
// STORE TYPES
// ============================================================
export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  watchedPercent: number;
  completedAt?: string;
}

interface DailyActivity {
  date: string; // YYYY-MM-DD
  lessonsCompleted: number;
}

interface GamificationState {
  // User info
  displayName: string;
  // XP & Level
  xp: number;
  torahPoints: number;
  wisdomCoins: number;
  // Progress
  lessonProgress: Record<string, LessonProgress>;
  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  dailyActivities: DailyActivity[];
  // Badges
  earnedBadges: string[];
  // UI state
  lastLevelUp: number | null;
  newBadge: string | null;
  // Actions
  setDisplayName: (name: string) => void;
  completeLesson: (lessonId: string) => void;
  updateWatchProgress: (lessonId: string, percent: number) => void;
  dismissLevelUp: () => void;
  dismissNewBadge: () => void;
  getLevel: () => typeof LEVELS[number];
  getLevelProgress: () => number;
  getCompletedLessonsCount: () => number;
  getUnitProgress: (unitId: string, lessonIds: string[]) => number;
  getModuleProgress: (lessonIds: string[]) => number;
  isLessonCompleted: (lessonId: string) => boolean;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getLevelForXp(xp: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

// ============================================================
// STORE
// ============================================================
export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      displayName: "",
      xp: 0,
      torahPoints: 0,
      wisdomCoins: 0,
      lessonProgress: {},
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      dailyActivities: [],
      earnedBadges: [],
      lastLevelUp: null,
      newBadge: null,

      setDisplayName: (name) => set({ displayName: name }),

      completeLesson: (lessonId) => {
        const state = get();
        if (state.lessonProgress[lessonId]?.completed) return;

        const today = getToday();
        const prevLevel = getLevelForXp(state.xp);
        let xpGain = XP_REWARDS.watchLesson;
        let tpGain = 10;
        let wcGain = 0;

        // First of day bonus
        const todayActivity = state.dailyActivities.find(a => a.date === today);
        if (!todayActivity) {
          xpGain += XP_REWARDS.firstOfDay;
        }

        // Streak calculation
        let newStreak = state.currentStreak;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (state.lastActivityDate === today) {
          // Already active today, streak stays
        } else if (state.lastActivityDate === yesterdayStr) {
          newStreak += 1;
        } else if (state.lastActivityDate === null) {
          newStreak = 1;
        } else {
          newStreak = 1; // Streak broken
        }

        // Streak bonuses
        if (newStreak === 3) { xpGain += XP_REWARDS.streakDay3; wcGain += 1; }
        if (newStreak === 7) { xpGain += XP_REWARDS.streakDay7; wcGain += 5; }
        if (newStreak === 30) { xpGain += XP_REWARDS.streakDay30; wcGain += 25; }

        // Streak multiplier
        let multiplier = 1;
        if (newStreak >= 100) multiplier = 3;
        else if (newStreak >= 60) multiplier = 2.5;
        else if (newStreak >= 30) multiplier = 2;
        else if (newStreak >= 14) multiplier = 1.5;
        else if (newStreak >= 7) multiplier = 1.25;
        else if (newStreak >= 3) multiplier = 1.1;

        xpGain = Math.round(xpGain * multiplier);

        const newXp = state.xp + xpGain;
        const newLevel = getLevelForXp(newXp);

        // Update daily activities
        const newActivities = [...state.dailyActivities];
        const existingIdx = newActivities.findIndex(a => a.date === today);
        if (existingIdx >= 0) {
          newActivities[existingIdx].lessonsCompleted += 1;
        } else {
          newActivities.push({ date: today, lessonsCompleted: 1 });
        }
        // Keep only last 365 days
        if (newActivities.length > 365) newActivities.shift();

        // Check for new badges
        const newBadges = [...state.earnedBadges];
        const completedCount = Object.values(state.lessonProgress).filter(p => p.completed).length + 1;
        let firstNewBadge: string | null = null;

        const checkBadge = (id: string) => {
          if (!newBadges.includes(id)) {
            newBadges.push(id);
            if (!firstNewBadge) firstNewBadge = id;
          }
        };

        if (completedCount === 1) checkBadge("first-lesson");
        if (completedCount >= 10) checkBadge("ten-lessons");
        if (completedCount >= 50) checkBadge("fifty-lessons");
        if (completedCount >= 100) checkBadge("hundred-lessons");
        if (newStreak >= 7) checkBadge("streak-7");
        if (newStreak >= 30) checkBadge("streak-30");
        if (newStreak >= 100) checkBadge("streak-100");
        if (newStreak >= 28) checkBadge("consistent");

        // Time-based badges
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 4) checkBadge("night-owl");
        if (hour >= 4 && hour < 6) checkBadge("early-bird");

        // Marathon badge
        const todayCompleted = (todayActivity?.lessonsCompleted ?? 0) + 1;
        if (todayCompleted >= 5) checkBadge("marathon");

        set({
          xp: newXp,
          torahPoints: state.torahPoints + tpGain,
          wisdomCoins: state.wisdomCoins + wcGain,
          lessonProgress: {
            ...state.lessonProgress,
            [lessonId]: {
              lessonId,
              completed: true,
              watchedPercent: 100,
              completedAt: new Date().toISOString(),
            },
          },
          currentStreak: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          lastActivityDate: today,
          dailyActivities: newActivities,
          earnedBadges: newBadges,
          lastLevelUp: newLevel.level > prevLevel.level ? newLevel.level : null,
          newBadge: firstNewBadge,
        });
      },

      updateWatchProgress: (lessonId, percent) => {
        const state = get();
        const existing = state.lessonProgress[lessonId];
        if (existing?.completed) return;
        set({
          lessonProgress: {
            ...state.lessonProgress,
            [lessonId]: {
              lessonId,
              completed: false,
              watchedPercent: Math.max(existing?.watchedPercent ?? 0, percent),
            },
          },
        });
      },

      dismissLevelUp: () => set({ lastLevelUp: null }),
      dismissNewBadge: () => set({ newBadge: null }),

      getLevel: () => getLevelForXp(get().xp),

      getLevelProgress: () => {
        const xp = get().xp;
        const current = getLevelForXp(xp);
        const currentIdx = LEVELS.findIndex(l => l.level === current.level);
        if (currentIdx >= LEVELS.length - 1) return 100;
        const next = LEVELS[currentIdx + 1];
        const range = next.xpRequired - current.xpRequired;
        const progress = xp - current.xpRequired;
        return Math.round((progress / range) * 100);
      },

      getCompletedLessonsCount: () =>
        Object.values(get().lessonProgress).filter(p => p.completed).length,

      getUnitProgress: (_unitId, lessonIds) => {
        const progress = get().lessonProgress;
        if (lessonIds.length === 0) return 0;
        const completed = lessonIds.filter(id => progress[id]?.completed).length;
        return Math.round((completed / lessonIds.length) * 100);
      },

      getModuleProgress: (lessonIds) => {
        const progress = get().lessonProgress;
        if (lessonIds.length === 0) return 0;
        const completed = lessonIds.filter(id => progress[id]?.completed).length;
        return Math.round((completed / lessonIds.length) * 100);
      },

      isLessonCompleted: (lessonId) =>
        get().lessonProgress[lessonId]?.completed ?? false,
    }),
    {
      name: "lms-gamification",
    }
  )
);
