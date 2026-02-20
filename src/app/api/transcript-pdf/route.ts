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

// YouTube innertube clients that return working caption URLs
const YT_CLIENTS = [
  {
    name: "IOS",
    body: {
      context: {
        client: {
          clientName: "IOS",
          clientVersion: "19.09.3",
          deviceModel: "iPhone14,3",
          hl: "he",
        },
      },
    },
    apiKey: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    ua: "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 17_4 like Mac OS X)",
  },
  {
    name: "ANDROID_VR",
    body: {
      context: {
        client: {
          clientName: "ANDROID_VR",
          clientVersion: "1.57.29",
          androidSdkVersion: 30,
          hl: "he",
        },
      },
    },
    apiKey: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    ua: "com.google.android.apps.youtube.vr.oculus/1.57.29 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1)",
  },
];

interface TranscriptSegment {
  text: string;
  offset: number;
}

async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptSegment[]> {
  for (const client of YT_CLIENTS) {
    try {
      const playerRes = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${client.apiKey}&prettyPrint=false`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": client.ua,
          },
          body: JSON.stringify({ ...client.body, videoId }),
        }
      );
      const playerData = await playerRes.json();

      if (playerData.error || playerData.playabilityStatus?.status !== "OK") {
        continue;
      }

      const tracks =
        playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks || tracks.length === 0) continue;

      // Pick Hebrew first, then auto-generated Hebrew, then first available
      let track =
        tracks.find(
          (t: { languageCode: string; kind?: string }) =>
            (t.languageCode === "he" || t.languageCode === "iw") &&
            t.kind !== "asr"
        ) ||
        tracks.find(
          (t: { languageCode: string }) =>
            t.languageCode === "he" || t.languageCode === "iw"
        ) ||
        tracks[0];

      // Fetch caption content as json3
      const captionRes = await fetch(track.baseUrl + "&fmt=json3");
      const captionText = await captionRes.text();
      if (!captionText || captionText.length === 0) continue;

      const data = JSON.parse(captionText);
      const events = (data.events || []).filter(
        (e: { segs?: unknown[] }) => e.segs
      );

      const segments: TranscriptSegment[] = events
        .map((e: { tStartMs?: number; segs?: { utf8?: string }[] }) => ({
          text: (e.segs || [])
            .map((s) => s.utf8 || "")
            .join("")
            .trim(),
          offset: (e.tStartMs || 0) / 1000,
        }))
        .filter((s: TranscriptSegment) => s.text.length > 0);

      if (segments.length > 0) return segments;
    } catch {
      continue;
    }
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const { videoId, title } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    // 1. Fetch transcript from YouTube via innertube API
    const segments = await fetchYouTubeTranscript(videoId);

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

    // 6. Upload to Google Drive (if configured)
    let driveUrl = "";
    const driveEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const driveKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (driveEmail && driveKey && driveFolderId) {
      try {
        const { google } = await import("googleapis");
        const auth = new google.auth.JWT({
          email: driveEmail,
          key: driveKey.replace(/\\n/g, "\n"),
          scopes: ["https://www.googleapis.com/auth/drive.file"],
        });
        const drive = google.drive({ version: "v3", auth });

        const pdfName = `${title || videoId} - תמלול.pdf`;

        // Check if file already exists in folder
        const existing = await drive.files.list({
          q: `name='${pdfName.replace(/'/g, "\\'")}' and '${driveFolderId}' in parents and trashed=false`,
          fields: "files(id)",
        });

        const stream = await import("stream");
        const readable = new stream.Readable();
        readable.push(pdfBuffer);
        readable.push(null);

        if (existing.data.files && existing.data.files.length > 0) {
          // Update existing file
          const fileId = existing.data.files[0].id!;
          await drive.files.update({
            fileId,
            media: { mimeType: "application/pdf", body: readable },
          });
          driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
        } else {
          // Create new file
          const created = await drive.files.create({
            requestBody: {
              name: pdfName,
              parents: [driveFolderId],
            },
            media: { mimeType: "application/pdf", body: readable },
            fields: "id",
          });
          const fileId = created.data.id!;

          // Make viewable by anyone with link
          await drive.permissions.create({
            fileId,
            requestBody: { role: "reader", type: "anyone" },
          });

          driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
        }
      } catch (driveErr) {
        console.error("Google Drive upload error:", driveErr);
        // Non-fatal — Supabase URL still works
      }
    }

    return NextResponse.json({
      url: driveUrl || publicUrl,
      supabaseUrl: publicUrl,
      driveUrl: driveUrl || null,
      segments: segments.length,
      message: driveUrl
        ? `תמלול PDF נוצר והועלה ל-Google Drive (${segments.length} קטעים)`
        : `תמלול PDF נוצר בהצלחה (${segments.length} קטעים)`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
