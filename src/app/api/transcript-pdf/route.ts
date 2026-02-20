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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaptionTrack = { baseUrl: string; languageCode: string; kind?: string; [k: string]: any };

const diagnostics: string[] = [];

function pickHebrewTrack(tracks: CaptionTrack[]): CaptionTrack {
  return (
    tracks.find((t) => (t.languageCode === "he" || t.languageCode === "iw") && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "he" || t.languageCode === "iw") ||
    tracks[0]
  );
}

function parseJson3(text: string): TranscriptSegment[] {
  try {
    const data = JSON.parse(text);
    const events = (data.events || []).filter(
      (e: { segs?: unknown[] }) => e.segs
    );
    return events
      .map((e: { tStartMs?: number; segs?: { utf8?: string }[] }) => ({
        text: (e.segs || []).map((s) => s.utf8 || "").join("").trim(),
        offset: (e.tStartMs || 0) / 1000,
      }))
      .filter((s: TranscriptSegment) => s.text.length > 0);
  } catch {
    return [];
  }
}

function parseXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const text = m[2]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, "").trim();
    if (text) segments.push({ text, offset: parseFloat(m[1]) });
  }
  return segments;
}

async function tryFetchCaptions(track: CaptionTrack, label: string): Promise<TranscriptSegment[]> {
  // Try json3 format first
  try {
    const res = await fetch(track.baseUrl + "&fmt=json3");
    const text = await res.text();
    diagnostics.push(`${label} json3: status=${res.status} len=${text.length}`);
    if (text.length > 10) {
      const segs = parseJson3(text);
      if (segs.length > 0) return segs;
    }
  } catch (e) {
    diagnostics.push(`${label} json3 error: ${e instanceof Error ? e.message : "unknown"}`);
  }
  // Try XML format
  try {
    const res = await fetch(track.baseUrl);
    const text = await res.text();
    diagnostics.push(`${label} xml: status=${res.status} len=${text.length}`);
    if (text.length > 10) {
      const segs = parseXml(text);
      if (segs.length > 0) return segs;
    }
  } catch (e) {
    diagnostics.push(`${label} xml error: ${e instanceof Error ? e.message : "unknown"}`);
  }
  return [];
}

async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptSegment[]> {
  diagnostics.length = 0;

  // Strategy 1: Innertube player API with mobile clients
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
      const status = playerData.playabilityStatus?.status || "none";
      const tracks: CaptionTrack[] =
        playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

      diagnostics.push(`${client.name}: status=${status} tracks=${tracks.length}`);

      if (status !== "OK" || tracks.length === 0) continue;

      const track = pickHebrewTrack(tracks);
      diagnostics.push(`${client.name}: using ${track.languageCode}`);

      const segs = await tryFetchCaptions(track, client.name);
      if (segs.length > 0) return segs;
    } catch (e) {
      diagnostics.push(`${client.name} error: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  // Strategy 2: Scrape video page for caption tracks + use cookies
  try {
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    const CONSENT = "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgJnSmgY";

    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": UA, "Accept-Language": "he,en;q=0.9", "Cookie": CONSENT },
    });
    const html = await pageRes.text();
    const cookies = pageRes.headers.getSetCookie
      ? [CONSENT, ...pageRes.headers.getSetCookie().map((c: string) => c.split(";")[0])].join("; ")
      : CONSENT;

    const capMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    diagnostics.push(`WebScrape: pageLen=${html.length} hasCaptions=${!!capMatch}`);

    if (capMatch) {
      const tracks: CaptionTrack[] = JSON.parse(capMatch[1]);
      if (tracks.length > 0) {
        const track = pickHebrewTrack(tracks);
        diagnostics.push(`WebScrape: using ${track.languageCode}`);

        // Try with cookies
        for (const fmt of ["&fmt=json3", ""]) {
          try {
            const res = await fetch(track.baseUrl + fmt, {
              headers: {
                "User-Agent": UA,
                "Cookie": cookies,
                "Referer": `https://www.youtube.com/watch?v=${videoId}`,
              },
            });
            const text = await res.text();
            diagnostics.push(`WebScrape${fmt || " xml"}: status=${res.status} len=${text.length}`);
            if (text.length > 10) {
              const segs = fmt ? parseJson3(text) : parseXml(text);
              if (segs.length > 0) return segs;
            }
          } catch (e) {
            diagnostics.push(`WebScrape${fmt} error: ${e instanceof Error ? e.message : "unknown"}`);
          }
        }
      }
    }
  } catch (e) {
    diagnostics.push(`WebScrape error: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // Strategy 3: Direct timedtext API with YouTube Data API key
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      const listRes = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
      );
      const listData = await listRes.json();
      const items = listData.items || [];
      diagnostics.push(`DataAPI: ${items.length} caption tracks`);

      if (items.length > 0) {
        // Find Hebrew or first
        const heItem = items.find((i: { snippet: { language: string } }) =>
          i.snippet.language === "he" || i.snippet.language === "iw"
        ) || items[0];
        const lang = heItem.snippet.language;
        const name = heItem.snippet.name || "";

        // Try timedtext endpoint directly
        const ttUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&name=${encodeURIComponent(name)}&fmt=json3`;
        const ttRes = await fetch(ttUrl);
        const ttText = await ttRes.text();
        diagnostics.push(`TimedText: lang=${lang} status=${ttRes.status} len=${ttText.length}`);
        if (ttText.length > 10) {
          const segs = parseJson3(ttText);
          if (segs.length > 0) return segs;
        }
      }
    }
  } catch (e) {
    diagnostics.push(`DataAPI error: ${e instanceof Error ? e.message : "unknown"}`);
  }

  console.error("Transcript fetch failed for", videoId, "diagnostics:", diagnostics.join(" | "));
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
      return NextResponse.json({
        error: "לא נמצא תמלול לסרטון זה",
        diagnostics: diagnostics.join(" | "),
      }, { status: 404 });
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

    // 7. Auto-save transcript URL to lesson_meta table
    const finalUrl = driveUrl || publicUrl;
    try {
      await supabase
        .from("lesson_meta")
        .upsert(
          {
            video_id: videoId,
            transcript_url: finalUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "video_id", ignoreDuplicates: false }
        );
    } catch (dbErr) {
      console.error("lesson_meta save error:", dbErr);
    }

    return NextResponse.json({
      url: finalUrl,
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
