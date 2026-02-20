import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  try {
    // Use the youtube-transcript package
    const { YoutubeTranscript } = await import("youtube-transcript");
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: "he" });

    if (!transcript || transcript.length === 0) {
      // Try without language preference (auto-generated)
      const fallback = await YoutubeTranscript.fetchTranscript(videoId);
      if (!fallback || fallback.length === 0) {
        return NextResponse.json({ error: "לא נמצא תמלול לסרטון זה" }, { status: 404 });
      }
      const text = fallback.map((t) => t.text).join(" ");
      return NextResponse.json({ transcript: text, segments: fallback.length });
    }

    const text = transcript.map((t) => t.text).join(" ");
    return NextResponse.json({ transcript: text, segments: transcript.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    // Common: "Could not get transcripts" means no captions available
    if (msg.includes("Could not get") || msg.includes("Transcript")) {
      return NextResponse.json({ error: "לא נמצא תמלול אוטומטי לסרטון זה" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
