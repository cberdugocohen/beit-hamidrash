import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFDocument from "pdfkit";

const BUCKET = "data";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Reverse Hebrew text lines for RTL rendering in PDF
function reverseRTL(text: string): string {
  return text;
}

async function fetchHebrewFont(): Promise<Buffer> {
  // Fetch Noto Sans Hebrew from Google Fonts CDN
  const res = await fetch(
    "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSansHebrew/hinted/ttf/NotoSansHebrew-Regular.ttf"
  );
  if (!res.ok) {
    // Fallback URL
    const res2 = await fetch(
      "https://fonts.gstatic.com/s/notosanshebrew/v44/or3HQ4v33eiDljA1IufXTtVf7V6RxEe0.ttf"
    );
    const ab = await res2.arrayBuffer();
    return Buffer.from(ab);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function POST(req: Request) {
  try {
    const { videoId, title } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    // 1. Fetch transcript from YouTube
    const { YoutubeTranscript } = await import("youtube-transcript");
    let segments;
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "he" });
    } catch {
      try {
        segments = await YoutubeTranscript.fetchTranscript(videoId);
      } catch {
        return NextResponse.json({ error: "לא נמצא תמלול לסרטון זה" }, { status: 404 });
      }
    }

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "לא נמצא תמלול לסרטון זה" }, { status: 404 });
    }

    // 2. Fetch Hebrew font
    let fontBuffer: Buffer;
    try {
      fontBuffer = await fetchHebrewFont();
    } catch {
      return NextResponse.json({ error: "שגיאה בטעינת גופן עברי" }, { status: 500 });
    }

    // 3. Generate PDF
    const transcriptText = segments.map((s) => s.text).join(" ");
    // Split into paragraphs (every ~5 sentences or ~500 chars)
    const words = transcriptText.split(" ");
    const paragraphs: string[] = [];
    let current = "";
    for (const word of words) {
      current += (current ? " " : "") + word;
      if (current.length > 400) {
        paragraphs.push(current);
        current = "";
      }
    }
    if (current) paragraphs.push(current);

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: title || `תמלול - ${videoId}`,
          Author: "בית המדרש קשר השותפות",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Register Hebrew font
      doc.registerFont("Hebrew", fontBuffer);
      doc.font("Hebrew");

      // Title
      doc.fontSize(18)
        .text(reverseRTL(title || "תמלול שיעור"), {
          align: "right",
          features: ["rtla"],
        });

      doc.moveDown(0.5);

      // Subtitle
      doc.fontSize(10)
        .fillColor("#666666")
        .text(reverseRTL("בית המדרש קשר השותפות • הרב אסף פלג"), {
          align: "right",
          features: ["rtla"],
        });

      doc.moveDown(0.3);
      doc.text(reverseRTL(`סרטון: https://www.youtube.com/watch?v=${videoId}`), {
        align: "right",
        features: ["rtla"],
      });

      doc.moveDown(1);

      // Separator line
      doc.strokeColor("#dddddd")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(1);

      // Transcript body
      doc.fontSize(12).fillColor("#333333");

      for (const para of paragraphs) {
        if (doc.y > 720) {
          doc.addPage();
        }
        doc.text(reverseRTL(para), {
          align: "right",
          features: ["rtla"],
          lineGap: 6,
        });
        doc.moveDown(0.8);
      }

      // Footer on last page
      doc.moveDown(2);
      doc.fontSize(9)
        .fillColor("#999999")
        .text(reverseRTL(`נוצר אוטומטית • ${new Date().toLocaleDateString("he-IL")}`), {
          align: "center",
          features: ["rtla"],
        });

      doc.end();
    });

    // 4. Upload to Supabase Storage
    const supabase = getAdminSupabase();
    const filename = `transcripts/${videoId}.pdf`;

    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
    await supabase.storage.from(BUCKET).upload(filename, blob, {
      contentType: "application/pdf",
      upsert: true,
    });

    // 5. Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json({
      url: publicUrl,
      segments: segments.length,
      message: `תמלול PDF נוצר בהצלחה (${segments.length} קטעים)`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
