import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "בית המדרש קשר השותפות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Video {
  id: string;
  videoId: string;
  title: string;
  topic: string;
  hebDate: string;
}

type SettingsMap = Record<string, { image_url?: string }>;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadVideos(): Promise<Video[]> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.storage.from("data").download("videos.json");
    if (data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch { /* fall through */ }
  return [];
}

async function loadTopicSettings(): Promise<SettingsMap> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.storage.from("data").download("topic-settings.json");
    if (data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch { /* fall through */ }
  return {};
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videos = await loadVideos();
  const video = videos.find((v) => v.id === id);
  const topic = video?.topic || "";
  const videoId = video?.videoId || "";

  // Try to get topic image from settings
  const settings = await loadTopicSettings();
  const topicImageUrl = topic ? settings[topic]?.image_url : undefined;

  // Use topic image if available, otherwise YouTube thumbnail
  const imageUrl = topicImageUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "");

  if (imageUrl) {
    // Render the image filling the OG canvas
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
          }}
        >
          <img
            src={imageUrl}
            width={1200}
            height={630}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </div>
      ),
      { ...size }
    );
  }

  // Fallback: simple gradient with logo emoji (no Hebrew text to avoid RTL issues)
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #152352 50%, #1a2d4a 100%)",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: "linear-gradient(135deg, #d4a843, #b8860b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 64 }}>📖</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
