import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public GET endpoint - returns all lesson meta for client display
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("lesson_meta")
      .select("video_id, summary, transcript_url, quiz_url, presentation_url");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
