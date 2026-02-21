import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BUCKET = "data";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let videos: { id: string; topic: string; [k: string]: unknown }[] = [];

  // Try Supabase Storage first (has latest synced data)
  try {
    const { data } = await supabase.storage.from(BUCKET).download("videos.json");
    if (data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        videos = parsed;
      }
    }
  } catch {
    // Fall through to static file
  }

  // Fallback: read from static file deployed with the app
  if (videos.length === 0) {
    try {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "public", "videos.json"),
        "utf-8"
      );
      videos = JSON.parse(raw);
    } catch {
      return NextResponse.json([]);
    }
  }

  // Apply topic overrides from admin
  try {
    const { data: overrides } = await supabase
      .from("topic_overrides")
      .select("video_id, topic");
    if (overrides && overrides.length > 0) {
      const overrideMap = new Map(overrides.map((o) => [o.video_id, o.topic]));
      for (const v of videos) {
        const override = overrideMap.get(v.id);
        if (override) v.topic = override;
      }
    }
  } catch {
    // Table might not exist yet — no overrides to apply
  }

  return NextResponse.json(videos);
}
