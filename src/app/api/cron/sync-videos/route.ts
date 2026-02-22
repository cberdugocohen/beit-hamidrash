import { NextResponse } from "next/server";
import { classifyTopic } from "@/lib/classify";
import { toHebrewDate } from "@/lib/hebrew-date";
import { createClient } from "@supabase/supabase-js";

const API_KEY = process.env.YOUTUBE_API_KEY || "";
const CHANNEL_ID = "UC3vMI0lHQ9UYA3563_AoG7g";
const BUCKET = "data";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

async function loadExistingVideos(): Promise<VideoData[]> {
  try {
    const supabase = getAdminSupabase();
    const { data } = await supabase.storage.from(BUCKET).download("videos.json");
    if (data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fall through
  }
  return [];
}

async function saveVideos(videos: VideoData[]) {
  const supabase = getAdminSupabase();
  const json = JSON.stringify(videos, null, 0);
  const blob = new Blob([json], { type: "application/json" });
  await supabase.storage.from(BUCKET).upload("videos.json", blob, {
    contentType: "application/json",
    upsert: true,
  });
}

export async function GET(req: Request) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
    }

    const existing = await loadExistingVideos();
    const existingIds = new Set(existing.map((v) => v.id));

    // Get uploads playlist ID
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    if (channelData.error) {
      return NextResponse.json({ error: channelData.error.message }, { status: 500 });
    }
    const playlistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch recent 50 videos
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
      const all = [...existing, ...newVideos].sort((a, b) => a.date.localeCompare(b.date));
      await saveVideos(all);
    }

    return NextResponse.json({
      ok: true,
      total: existing.length + newVideos.length,
      newCount: newVideos.length,
      newVideos: newVideos.map((v) => ({ title: v.title, topic: v.topic })),
      syncedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
