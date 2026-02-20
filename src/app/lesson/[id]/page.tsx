import { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import LessonShareContent from "./LessonShareContent";

interface Video {
  id: string;
  title: string;
  url: string;
  videoId: string;
  date: string;
  topic: string;
  hebDate: string;
  hebMonthYear: string;
}

interface LessonMeta {
  video_id: string;
  summary: string | null;
  transcript_url: string | null;
  quiz_url: string | null;
  presentation_url: string | null;
}

async function loadVideos(): Promise<Video[]> {
  // Try Supabase Storage first (latest synced data)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.storage.from("data").download("videos.json");
    if (data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  // Fallback: static file
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "public", "videos.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function findVideo(id: string): Promise<Video | null> {
  const videos = await loadVideos();
  return videos.find((v) => v.id === id) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = await findVideo(id);
  if (!video) {
    return { title: "שיעור לא נמצא - בית המדרש קשר השותפות" };
  }

  // Try to get summary from Supabase
  let summary = "";
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("lesson_meta")
      .select("summary")
      .eq("video_id", id)
      .single();
    if (data?.summary) summary = data.summary;
  } catch {
    // No meta available
  }

  const description = summary
    ? summary.slice(0, 200) + (summary.length > 200 ? "..." : "")
    : `${video.topic} • ${video.hebDate} • הרב אסף פלג`;

  return {
    title: `${video.title} - בית המדרש קשר השותפות`,
    description,
    openGraph: {
      title: video.title,
      description,
      type: "article",
      locale: "he_IL",
      siteName: "בית המדרש קשר השותפות",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: video.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await findVideo(id);

  if (!video) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-700 mb-2">שיעור לא נמצא</h1>
          <a href="/" className="text-torah-600 hover:text-torah-700 font-medium">חזרה לבית המדרש</a>
        </div>
      </div>
    );
  }

  // Fetch lesson meta from Supabase
  let meta: LessonMeta | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("lesson_meta")
      .select("*")
      .eq("video_id", id)
      .single();
    if (data) meta = data as LessonMeta;
  } catch {
    // No meta
  }

  return <LessonShareContent video={video} meta={meta} />;
}
