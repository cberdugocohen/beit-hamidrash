import { describe, it, expect, beforeEach } from "vitest";
import {
  setVideos,
  getAllVideos,
  isLoaded,
  getTopics,
  getVideosByTopic,
  getHebMonthYears,
  getVideosByHebMonth,
  findVideo,
  Video,
} from "@/data/content";

const MOCK_VIDEOS: Video[] = [
  { id: "v1", title: "שיעור א", url: "u1", videoId: "yt1", date: "2024-01-15", topic: "דרש", hebDate: "ה׳ שבט תשפ״ד", hebMonthYear: "שבט תשפ״ד" },
  { id: "v2", title: "שיעור ב", url: "u2", videoId: "yt2", date: "2024-02-10", topic: "דרש", hebDate: "א׳ אדר תשפ״ד", hebMonthYear: "אדר תשפ״ד" },
  { id: "v3", title: "שיעור ג", url: "u3", videoId: "yt3", date: "2024-03-05", topic: "זוהר", hebDate: "כ״ד אדר תשפ״ד", hebMonthYear: "אדר תשפ״ד" },
  { id: "v4", title: "שיעור ד", url: "u4", videoId: "yt4", date: "2024-01-20", topic: "זוהר", hebDate: "י׳ שבט תשפ״ד", hebMonthYear: "שבט תשפ״ד" },
  { id: "v5", title: "שיעור ה", url: "u5", videoId: "yt5", date: "2024-04-01", topic: "חסידות", hebDate: "כ״ב ניסן תשפ״ד", hebMonthYear: "ניסן תשפ״ד" },
];

beforeEach(() => {
  setVideos(MOCK_VIDEOS);
});

describe("Content helpers", () => {
  describe("setVideos / getAllVideos / isLoaded", () => {
    it("should store and return videos", () => {
      expect(getAllVideos()).toHaveLength(5);
    });

    it("should mark as loaded", () => {
      expect(isLoaded()).toBe(true);
    });

    it("should return exact video objects", () => {
      const all = getAllVideos();
      expect(all[0].id).toBe("v1");
      expect(all[4].id).toBe("v5");
    });
  });

  describe("getTopics", () => {
    it("should return unique topics in order of first appearance", () => {
      const topics = getTopics();
      expect(topics).toEqual(["דרש", "זוהר", "חסידות"]);
    });

    it("should not have duplicates", () => {
      const topics = getTopics();
      expect(new Set(topics).size).toBe(topics.length);
    });
  });

  describe("getVideosByTopic", () => {
    it("should group videos by topic", () => {
      const map = getVideosByTopic();
      expect(map.get("דרש")).toHaveLength(2);
      expect(map.get("זוהר")).toHaveLength(2);
      expect(map.get("חסידות")).toHaveLength(1);
    });

    it("should sort videos within each topic by date descending (newest first)", () => {
      const map = getVideosByTopic();
      const drash = map.get("דרש")!;
      expect(drash[0].id).toBe("v2"); // 2024-02-10 (newer)
      expect(drash[1].id).toBe("v1"); // 2024-01-15 (older)
    });

    it("should sort zohar videos newest first", () => {
      const map = getVideosByTopic();
      const zohar = map.get("זוהר")!;
      expect(zohar[0].id).toBe("v3"); // 2024-03-05
      expect(zohar[1].id).toBe("v4"); // 2024-01-20
    });
  });

  describe("getHebMonthYears", () => {
    it("should return unique Hebrew month-year keys", () => {
      const months = getHebMonthYears();
      expect(months).toContain("שבט תשפ״ד");
      expect(months).toContain("אדר תשפ״ד");
      expect(months).toContain("ניסן תשפ״ד");
    });

    it("should not have duplicates", () => {
      const months = getHebMonthYears();
      expect(new Set(months).size).toBe(months.length);
    });
  });

  describe("getVideosByHebMonth", () => {
    it("should group videos by Hebrew month", () => {
      const map = getVideosByHebMonth();
      expect(map.get("שבט תשפ״ד")).toHaveLength(2);
      expect(map.get("אדר תשפ״ד")).toHaveLength(2);
      expect(map.get("ניסן תשפ״ד")).toHaveLength(1);
    });

    it("should sort within each month by date descending", () => {
      const map = getVideosByHebMonth();
      const shvat = map.get("שבט תשפ״ד")!;
      expect(shvat[0].id).toBe("v4"); // 2024-01-20 (newer)
      expect(shvat[1].id).toBe("v1"); // 2024-01-15 (older)
    });
  });

  describe("findVideo", () => {
    it("should find a video by ID", () => {
      const v = findVideo("v3");
      expect(v).toBeDefined();
      expect(v!.title).toBe("שיעור ג");
    });

    it("should return undefined for non-existent ID", () => {
      expect(findVideo("non-existent")).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty videos array", () => {
      setVideos([]);
      expect(getAllVideos()).toHaveLength(0);
      expect(getTopics()).toEqual([]);
      expect(getVideosByTopic().size).toBe(0);
      expect(getHebMonthYears()).toEqual([]);
      expect(findVideo("v1")).toBeUndefined();
    });

    it("should handle single video", () => {
      setVideos([MOCK_VIDEOS[0]]);
      expect(getTopics()).toEqual(["דרש"]);
      expect(getVideosByTopic().get("דרש")).toHaveLength(1);
    });
  });
});
