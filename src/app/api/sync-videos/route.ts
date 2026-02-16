import { NextResponse } from "next/server";
import { classifyTopic } from "@/lib/classify";
import { toHebrewDate } from "@/lib/hebrew-date";
import fs from "fs";
import path from "path";

const API_KEY = process.env.YOUTUBE_API_KEY || "";
const CHANNEL_ID = "UC3vMI0lHQ9UYA3563_AoG7g";
const VIDEOS_PATH = path.join(process.cwd(), "public", "videos.json");

interface VideoData {
  id: string;
  title: string;
  url: string;
  videoId: string;
  date: string;
  topic: string;
  hebDate: string;
  hebMonthYear: string;
}

async function getUploadsPlaylistId(): Promise<string> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function fetchAllVideos(playlistId: string): Promise<VideoData[]> {
  const videos: VideoData[] = [];
  let nextPage: string | undefined;

  do {
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}`;
    if (nextPage) url += `&pageToken=${nextPage}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    for (const item of data.items || []) {
      const snippet = item.snippet;
      const videoId = snippet.resourceId.videoId;
      const title = snippet.title;
      const published = snippet.publishedAt;
      const dateStr = published.substring(0, 10); // YYYY-MM-DD

      const topic = classifyTopic(title);
      const { hebDate, hebMonthYear } = toHebrewDate(dateStr);

      videos.push({
        id: videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        date: dateStr,
        topic,
        hebDate,
        hebMonthYear,
      });
    }

    nextPage = data.nextPageToken;
  } while (nextPage);

  return videos;
}

function loadExistingVideos(): VideoData[] {
  try {
    const raw = fs.readFileSync(VIDEOS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveVideos(videos: VideoData[]) {
  fs.writeFileSync(VIDEOS_PATH, JSON.stringify(videos, null, 0), "utf-8");
}

// GET: Check for new videos only (quick - uses search API for recent uploads)
export async function GET() {
  try {
    const existing = loadExistingVideos();
    const existingIds = new Set(existing.map((v) => v.id));

    // Fetch recent videos (last 50) to check for new ones
    const playlistId = await getUploadsPlaylistId();
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const newVideos: VideoData[] = [];
    for (const item of data.items || []) {
      const videoId = item.snippet.resourceId.videoId;
      if (existingIds.has(videoId)) continue;

      const title = item.snippet.title;
      const dateStr = item.snippet.publishedAt.substring(0, 10);
      const topic = classifyTopic(title);
      const { hebDate, hebMonthYear } = toHebrewDate(dateStr);

      newVideos.push({
        id: videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        date: dateStr,
        topic,
        hebDate,
        hebMonthYear,
      });
    }

    if (newVideos.length > 0) {
      // Add new videos and sort by date
      const all = [...existing, ...newVideos].sort((a, b) => a.date.localeCompare(b.date));
      saveVideos(all);
    }

    return NextResponse.json({
      total: existing.length + newVideos.length,
      newCount: newVideos.length,
      newVideos: newVideos.map((v) => ({ title: v.title, topic: v.topic, hebDate: v.hebDate })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Full resync - fetch ALL videos from channel
export async function POST() {
  try {
    const playlistId = await getUploadsPlaylistId();
    const videos = await fetchAllVideos(playlistId);

    // Sort by date (oldest first)
    videos.sort((a, b) => a.date.localeCompare(b.date));

    saveVideos(videos);

    // Count topics
    const topicCounts: Record<string, number> = {};
    for (const v of videos) {
      topicCounts[v.topic] = (topicCounts[v.topic] || 0) + 1;
    }

    return NextResponse.json({
      total: videos.length,
      topics: topicCounts,
      message: `סונכרנו ${videos.length} סרטונים בהצלחה`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
