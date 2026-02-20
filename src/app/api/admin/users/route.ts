import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify the caller is an admin
    const token = authHeader.split(" ")[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 });
    }

    // List all auth users (service role can do this)
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Get all existing profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p]));

    // Backfill missing profiles
    const missingUsers = (authUsers || []).filter((u) => !profileMap.has(u.id));
    for (const u of missingUsers) {
      const displayName = u.user_metadata?.display_name || u.email?.split("@")[0] || "";
      await supabase.from("profiles").upsert({
        id: u.id,
        display_name: displayName,
        is_admin: false,
        xp: 0,
      }, { onConflict: "id" });
    }

    // Re-fetch profiles after backfill
    const { data: updatedProfiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Merge with auth user emails
    const authMap = new Map((authUsers || []).map((u) => [u.id, u]));
    const merged = (updatedProfiles || []).map((p: Record<string, unknown>) => {
      const authUser = authMap.get(p.id as string);
      return {
        ...p,
        email: authUser?.email || "",
      };
    });

    return NextResponse.json({ users: merged, backfilled: missingUsers.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
