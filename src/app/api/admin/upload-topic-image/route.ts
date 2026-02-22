import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "topic-images";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function ensureBucket(supabase: ReturnType<typeof getAdminSupabase>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const topic = formData.get("topic") as string | null;

    if (!file || !topic) {
      return NextResponse.json({ error: "חסר קובץ או נושא" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "הקובץ חייב להיות תמונה" }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "הקובץ גדול מדי (מקסימום 5MB)" }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    await ensureBucket(supabase);

    // Create a safe ASCII-only filename (Supabase Storage doesn't support Hebrew in keys)
    const ext = file.name.split(".").pop() || "jpg";
    const hash = Array.from(topic).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    const fileName = `topic_${Math.abs(hash)}_${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
