import { describe, it, expect, beforeEach } from "vitest";
import { useGamificationStore, LEVELS, BADGES, XP_REWARDS } from "@/store/gamification";

// Reset store before each test
beforeEach(() => {
  useGamificationStore.setState({
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
    newBadge: null,
    lastLevelUp: null,
  });
});

describe("Gamification Store", () => {
  describe("Initial state", () => {
    it("should start with 0 XP", () => {
      const state = useGamificationStore.getState();
      expect(state.xp).toBe(0);
    });

    it("should start at level 1 (תלמיד)", () => {
      const state = useGamificationStore.getState();
      const level = state.getLevel();
      expect(level.level).toBe(1);
      expect(level.name).toBe("תלמיד");
    });

    it("should have no completed lessons", () => {
      const state = useGamificationStore.getState();
      expect(state.getCompletedLessonsCount()).toBe(0);
    });

    it("should have no earned badges", () => {
      const state = useGamificationStore.getState();
      expect(state.earnedBadges).toEqual([]);
    });

    it("should have 0 streak", () => {
      const state = useGamificationStore.getState();
      expect(state.currentStreak).toBe(0);
    });
  });

  describe("completeLesson", () => {
    it("should mark a lesson as completed", () => {
      const { completeLesson, isLessonCompleted } = useGamificationStore.getState();
      completeLesson("lesson-1");
      expect(useGamificationStore.getState().isLessonCompleted("lesson-1")).toBe(true);
    });

    it("should award XP on completion", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("lesson-1");
      expect(useGamificationStore.getState().xp).toBeGreaterThan(0);
    });

    it("should not double-count completing the same lesson", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("lesson-1");
      const xpAfterFirst = useGamificationStore.getState().xp;
      completeLesson("lesson-1");
      expect(useGamificationStore.getState().xp).toBe(xpAfterFirst);
    });

    it("should increment completed lessons count", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("lesson-1");
      completeLesson("lesson-2");
      completeLesson("lesson-3");
      expect(useGamificationStore.getState().getCompletedLessonsCount()).toBe(3);
    });

    it("should earn 'first-lesson' badge on first completion", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("lesson-1");
      expect(useGamificationStore.getState().earnedBadges).toContain("first-lesson");
    });

    it("should update streak on first activity", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("lesson-1");
      expect(useGamificationStore.getState().currentStreak).toBeGreaterThanOrEqual(1);
    });

    it("should award torah points", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("lesson-1");
      expect(useGamificationStore.getState().torahPoints).toBeGreaterThan(0);
    });

    it("should start with 0 wisdom coins (awarded on streak milestones)", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("lesson-1");
      expect(useGamificationStore.getState().wisdomCoins).toBe(0);
    });
  });

  describe("Levels", () => {
    it("should have 10 levels defined", () => {
      expect(LEVELS).toHaveLength(10);
    });

    it("should level up when XP threshold is reached", () => {
      // Set XP to level 2 threshold
      useGamificationStore.setState({ xp: LEVELS[1].xpRequired });
      const level = useGamificationStore.getState().getLevel();
      expect(level.level).toBe(2);
    });

    it("should return correct level progress percentage", () => {
      useGamificationStore.setState({ xp: 0 });
      const progress = useGamificationStore.getState().getLevelProgress();
      expect(progress).toBe(0);
    });

    it("levels should be in ascending XP order", () => {
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].xpRequired).toBeGreaterThan(LEVELS[i - 1].xpRequired);
      }
    });
  });

  describe("Badges", () => {
    it("should have badges defined", () => {
      expect(BADGES.length).toBeGreaterThan(0);
    });

    it("should have unique badge IDs", () => {
      const ids = BADGES.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should earn ten-lessons badge after 10 completions", () => {
      const { completeLesson } = useGamificationStore.getState();
      for (let i = 1; i <= 10; i++) {
        useGamificationStore.getState().completeLesson(`lesson-${i}`);
      }
      expect(useGamificationStore.getState().earnedBadges).toContain("ten-lessons");
    });
  });

  describe("updateWatchProgress", () => {
    it("should track partial watch progress", () => {
      const { updateWatchProgress } = useGamificationStore.getState();
      updateWatchProgress("lesson-1", 50);
      const progress = useGamificationStore.getState().lessonProgress["lesson-1"];
      expect(progress).toBeDefined();
      expect(progress.watchedPercent).toBe(50);
      expect(progress.completed).toBe(false);
    });

    it("should not overwrite completed status", () => {
      const { completeLesson, updateWatchProgress } = useGamificationStore.getState();
      completeLesson("lesson-1");
      useGamificationStore.getState().updateWatchProgress("lesson-1", 30);
      expect(useGamificationStore.getState().lessonProgress["lesson-1"].completed).toBe(true);
    });
  });

  describe("getModuleProgress", () => {
    it("should return 0 for no lessons", () => {
      const progress = useGamificationStore.getState().getModuleProgress([]);
      expect(progress).toBe(0);
    });

    it("should return correct percentage", () => {
      const { completeLesson } = useGamificationStore.getState();
      completeLesson("a");
      completeLesson("b");
      const progress = useGamificationStore.getState().getModuleProgress(["a", "b", "c", "d"]);
      expect(progress).toBe(50);
    });
  });
});
