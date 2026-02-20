import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify caller is admin
    const token = authHeader.split(" ")[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 });
    }

    const results: string[] = [];

    // 1. Ensure "data" storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === "data")) {
      const { error: bucketErr } = await supabase.storage.createBucket("data", { public: true });
      if (bucketErr) {
        results.push(`Storage bucket error: ${bucketErr.message}`);
      } else {
        results.push("Storage bucket 'data' created");
      }
    } else {
      results.push("Storage bucket 'data' already exists");
    }

    // 2. Seed videos.json to storage if not already there
    const { data: existingFile } = await supabase.storage.from("data").download("videos.json");
    if (!existingFile || (await existingFile.text()).length < 10) {
      // Upload the current static videos.json
      const fs = await import("fs");
      const path = await import("path");
      try {
        const raw = fs.readFileSync(path.join(process.cwd(), "public", "videos.json"), "utf-8");
        const blob = new Blob([raw], { type: "application/json" });
        await supabase.storage.from("data").upload("videos.json", blob, {
          contentType: "application/json",
          upsert: true,
        });
        results.push("videos.json seeded to storage");
      } catch {
        results.push("Could not seed videos.json (file not found locally)");
      }
    } else {
      results.push("videos.json already in storage");
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
