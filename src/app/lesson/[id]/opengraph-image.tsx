import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "בית המדרש קשר השותפות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

interface Video {
  id: string;
  videoId: string;
  topic: string;
}

type SettingsMap = Record<string, { image_url?: string }>;

async function loadTopicImage(videoYtId: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load videos to find the topic for this video
    const { data: videosBlob } = await supabase.storage.from("data").download("videos.json");
    if (!videosBlob) return null;
    const videos: Video[] = JSON.parse(await videosBlob.text());
    const video = videos.find((v) => v.id === videoYtId);
    if (!video?.topic) return null;

    // Load topic settings
    const { data: settingsBlob } = await supabase.storage.from("data").download("topic-settings.json");
    if (!settingsBlob) return null;
    const settings: SettingsMap = JSON.parse(await settingsBlob.text());
    return settings[video.topic]?.image_url || null;
  } catch {
    return null;
  }
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Try topic image first
  const topicImageUrl = await loadTopicImage(id);

  // Build ordered list of image URLs to try
  const urls = [
    topicImageUrl,
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  ].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const buffer = await res.arrayBuffer();
        // YouTube returns a tiny placeholder for missing maxresdefault — skip if < 5KB
        if (buffer.byteLength < 5000 && url.includes("maxresdefault")) continue;
        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }
    } catch {
      continue;
    }
  }

  // Final fallback: 1x1 transparent pixel (should never reach here)
  const pixel = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00,
    0x3b,
  ]);
  return new Response(pixel, {
    headers: { "Content-Type": "image/gif" },
  });
}
