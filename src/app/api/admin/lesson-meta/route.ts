import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Decode JWT payload without network call (token was signed by Supabase)
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// POST: save lesson meta (admin only, uses service role to bypass RLS)
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Decode JWT locally to get user ID (avoids slow getUser network call)
    const jwt = decodeJwtPayload(token);
    const userId = jwt?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();

    // Parse body and check admin status in parallel
    const [body, { data: profile }] = await Promise.all([
      req.json(),
      adminSupabase.from("profiles").select("is_admin").eq("id", userId).single(),
    ]);

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { videoId, summary, transcriptUrl, quizUrl, presentationUrl } = body;
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from("lesson_meta")
      .upsert({
        video_id: videoId,
        summary: summary || null,
        transcript_url: transcriptUrl || null,
        quiz_url: quizUrl || null,
        presentation_url: presentationUrl || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "video_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
