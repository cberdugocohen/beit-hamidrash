import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BUCKET = "data";

export async function GET() {
  // Try Supabase Storage first (has latest synced data)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.storage.from(BUCKET).download("videos.json");
    if (data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return NextResponse.json(parsed);
      }
    }
  } catch {
    // Fall through to static file
  }

  // Fallback: read from static file deployed with the app
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "public", "videos.json"),
      "utf-8"
    );
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json([]);
  }
}
