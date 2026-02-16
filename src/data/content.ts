// ==========================================================
// Video data - loads from /videos.json (auto-updated via API)
// ==========================================================

export interface Video {
  id: string;
  title: string;
  url: string;
  videoId: string;
  date: string;
  topic: string;
  hebDate: string;
  hebMonthYear: string;
}

// This will be populated at runtime from the JSON
let _videos: Video[] = [];
let _loaded = false;

// Synchronous access (for SSR or after load)
export function getAllVideos(): Video[] {
  return _videos;
}

// Set videos (called after fetch)
export function setVideos(videos: Video[]) {
  _videos = videos;
  _loaded = true;
}

export function isLoaded(): boolean {
  return _loaded;
}

// Get unique topics in order of first appearance
export function getTopics(): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const v of _videos) {
    if (!seen.has(v.topic)) {
      seen.add(v.topic);
      list.push(v.topic);
    }
  }
  return list;
}

// Group videos by topic (sorted newest first within each group)
export function getVideosByTopic(): Map<string, Video[]> {
  const map = new Map<string, Video[]>();
  for (const v of _videos) {
    if (!map.has(v.topic)) map.set(v.topic, []);
    map.get(v.topic)!.push(v);
  }
  for (const [, vids] of map) vids.sort((a, b) => b.date.localeCompare(a.date));
  return map;
}

// Get unique Hebrew month-year keys in order
export function getHebMonthYears(): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const v of _videos) {
    if (v.hebMonthYear && !seen.has(v.hebMonthYear)) {
      seen.add(v.hebMonthYear);
      list.push(v.hebMonthYear);
    }
  }
  return list;
}

// Group videos by Hebrew month-year (sorted newest first within each group)
export function getVideosByHebMonth(): Map<string, Video[]> {
  const map = new Map<string, Video[]>();
  for (const v of _videos) {
    const key = v.hebMonthYear || "לא ידוע";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  for (const [, vids] of map) vids.sort((a, b) => b.date.localeCompare(a.date));
  return map;
}

// Find a single video by ID
export function findVideo(videoId: string): Video | undefined {
  return _videos.find((v) => v.id === videoId);
}
