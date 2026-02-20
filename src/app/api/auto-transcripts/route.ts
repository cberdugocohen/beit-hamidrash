import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  videoId: string;
}

/**
 * GET: Generate transcript PDFs for all videos that don't have one yet.
 * Processes up to `limit` videos per call (default 3) to avoid timeout.
 * Returns the count of generated transcripts and remaining videos.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "3"), 10);

    const supabase = getAdminSupabase();

    // 1. Load all videos
    let videos: VideoData[] = [];
    try {
      const { data } = await supabase.storage.from(BUCKET).download("videos.json");
      if (data) {
        const text = await data.text();
        videos = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ error: "Could not load videos" }, { status: 500 });
    }

    if (videos.length === 0) {
      return NextResponse.json({ generated: 0, remaining: 0, message: "אין סרטונים" });
    }

    // 2. Get all existing transcript URLs from lesson_meta
    const { data: metaRows } = await supabase
      .from("lesson_meta")
      .select("video_id, transcript_url");

    const hasTranscript = new Set<string>();
    if (metaRows) {
      for (const row of metaRows) {
        if (row.transcript_url) {
          hasTranscript.add(row.video_id);
        }
      }
    }

    // 3. Find videos missing transcripts
    const missing = videos.filter((v) => !hasTranscript.has(v.id || v.videoId));

    if (missing.length === 0) {
      return NextResponse.json({
        generated: 0,
        remaining: 0,
        total: videos.length,
        withTranscript: hasTranscript.size,
        message: "כל הסרטונים כבר כוללים תמלול",
      });
    }

    // 4. Generate transcripts for up to `limit` videos
    const batch = missing.slice(0, limit);
    let generated = 0;
    const results: { videoId: string; title: string; status: string }[] = [];

    const baseUrl = req.url.replace(/\/api\/auto-transcripts.*/, "");

    for (const video of batch) {
      try {
        const res = await fetch(`${baseUrl}/api/transcript-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: video.videoId || video.id,
            title: video.title,
          }),
        });
        const data = await res.json();
        if (data.url) {
          generated++;
          results.push({ videoId: video.id, title: video.title, status: "ok" });
        } else {
          results.push({
            videoId: video.id,
            title: video.title,
            status: data.error || "no-transcript",
          });
        }
      } catch (e) {
        results.push({
          videoId: video.id,
          title: video.title,
          status: e instanceof Error ? e.message : "error",
        });
      }
    }

    return NextResponse.json({
      generated,
      remaining: missing.length - batch.length,
      total: videos.length,
      withTranscript: hasTranscript.size + generated,
      results,
      message: `נוצרו ${generated} תמלולים, נותרו ${missing.length - batch.length}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
