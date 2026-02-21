import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: fetch all topic overrides
export async function GET() {
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("topic_overrides")
      .select("video_id, topic");
    if (error) {
      // Table might not exist yet - create it
      if (error.code === "42P01") {
        return NextResponse.json({ overrides: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ overrides: data || [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: set a topic override for a video
export async function POST(req: Request) {
  try {
    // Verify admin
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSupabase = await createServerSupabase();
    const { data: { user } } = await userSupabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { videoId, topic } = body;
    if (!videoId || !topic) {
      return NextResponse.json({ error: "videoId and topic required" }, { status: 400 });
    }

    // Ensure table exists (ignore errors if rpc not available)
    try {
      await adminSupabase.rpc("exec_sql", {
        sql: `CREATE TABLE IF NOT EXISTS topic_overrides (
          video_id TEXT PRIMARY KEY,
          topic TEXT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`
      });
    } catch { /* table may already exist or rpc not available */ }

    // Upsert override
    const { error } = await adminSupabase
      .from("topic_overrides")
      .upsert({ video_id: videoId, topic, updated_at: new Date().toISOString() }, { onConflict: "video_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE: remove a topic override (revert to auto-classified)
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSupabase = await createServerSupabase();
    const { data: { user } } = await userSupabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    await adminSupabase.from("topic_overrides").delete().eq("video_id", videoId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
