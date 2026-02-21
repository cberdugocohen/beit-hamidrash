import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

interface Video {
  id: string;
  date: string;
}

async function loadVideos(): Promise<Video[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.storage.from("data").download("videos.json");
    if (data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch { /* fall through */ }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://beit-hamidrash.vercel.app";
  const videos = await loadVideos();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/achievements`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/profile`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.3 },
  ];

  const lessonPages: MetadataRoute.Sitemap = videos.map((v) => ({
    url: `${baseUrl}/lesson/${v.id}`,
    lastModified: new Date(v.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...lessonPages];
}
