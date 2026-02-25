import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "בית המדרש קשר השותפות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Video {
  id: string;
  title: string;
  topic: string;
  hebDate: string;
}

async function loadVideos(): Promise<Video[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.storage.from("data").download("videos.json");
    if (data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch { /* fall through */ }
  return [];
}

// Satori doesn't support RTL — reverse Hebrew text so the LTR render produces correct output
function reverseHebrew(text: string): string {
  // Split into segments: Hebrew words vs non-Hebrew (numbers, punctuation, latin)
  const segments = text.split(/(\s+)/);
  // Reverse word order and reverse each Hebrew segment
  return segments
    .reverse()
    .map((seg) => {
      // If segment is Hebrew characters, reverse the characters
      if (/[\u0590-\u05FF]/.test(seg)) {
        return [...seg].reverse().join("");
      }
      return seg;
    })
    .join("");
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videos = await loadVideos();
  const video = videos.find((v) => v.id === id);
  const title = video?.title || "שיעור";
  const topic = video?.topic || "";
  const hebDate = video?.hebDate || "";

  // Load Hebrew font bundled locally (Vercel recommended approach for edge)
  const fontData = await fetch(
    new URL("./Heebo-Bold.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  // Pre-reverse all Hebrew strings for correct Satori rendering
  const rTitle = reverseHebrew(title);
  const rTopic = reverseHebrew(topic);
  const rHebDate = reverseHebrew(hebDate);
  const rSiteName = reverseHebrew("בית המדרש קשר השותפות");
  const rAuthor = reverseHebrew("הרב אסף פלג");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1e3a5f 0%, #152352 50%, #1a2d4a 100%)",
          fontFamily: "Heebo",
          padding: 60,
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, marginBottom: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 20, color: "white", fontWeight: 700 }}>{rSiteName}</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{rAuthor}</span>
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #d4a843, #b8860b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 30 }}>📖</span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: title.length > 60 ? 38 : 48,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.3,
              textAlign: "right",
              maxWidth: 1000,
            }}
          >
            {rTitle}
          </div>
        </div>

        {/* Bottom meta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, marginTop: 30 }}>
          {hebDate && (
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.4)" }}>
              {rHebDate}
            </div>
          )}
          {topic && (
            <div
              style={{
                background: "rgba(212,168,67,0.15)",
                border: "1px solid rgba(212,168,67,0.3)",
                borderRadius: 12,
                padding: "8px 20px",
                fontSize: 18,
                color: "#d4a843",
                fontWeight: 600,
              }}
            >
              {rTopic}
            </div>
          )}
        </div>

        {/* Bottom gold bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #d4a843, #b8860b, #d4a843)",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Heebo",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
