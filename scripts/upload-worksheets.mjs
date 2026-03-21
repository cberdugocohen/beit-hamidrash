/**
 * Upload worksheet card images + PDFs to Supabase Storage
 * and generate worksheets.json manifest.
 *
 * Usage:  node scripts/upload-worksheets.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Load .env.local ──
const envPath = path.join(ROOT, ".env.local");
const envText = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) env[match[1]] = match[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = "worksheets";
const DATA_BUCKET = "data";

// ── Parsha definitions (Torah order) ──
// Each card can have: summaryUrl, audioUrl (optional)
const PARSHAS = [
  {
    slug: "mishpatim",
    name: "דרש פרשת משפטים",
    folder: "C:\\Users\\w\\Downloads\\דרש משפטים לאורך",
    cards: [
      { num: 1, title: "האוזן הרוחנית" },
      { num: 2, title: "פינוי מקום לשמיעה" },
      { num: 3, title: "אהבה מעבר למשפט" },
      { num: 4, title: "עקירת ההתנשאות" },
      { num: 5, title: "החבל אל הפנימיות" },
    ],
  },
  {
    slug: "teruma",
    name: "דרש פרשת תרומה",
    folder: "C:\\Users\\w\\Downloads\\דרש תרומה",
    cards: [
      { num: 1, title: "גילוי הפנים בתוך הנגלה" },
      { num: 2, title: "\"ושכחתי\" – עזיבת המדרגה" },
      { num: 3, title: "המנורה – המדרגה הראשונה והתפשטות הגשמיות" },
      { num: 4, title: "קדושת השולחן – גילוי פנים בירידה" },
      { num: 5, title: "התורה כתבלין – המתקת היצר" },
    ],
  },
  {
    slug: "tetzaveh",
    name: "דרש פרשת תצוה",
    folder: "C:\\Users\\w\\Downloads\\דרש תצוה",
    cards: [
      { num: 1, title: "ביטול הישות (היעדר שם משה)" },
      { num: 2, title: "נקודת משה שבכל אחד" },
      { num: 3, title: "גאולת הדעת" },
      { num: 4, title: "גילוי וכיסוי" },
      { num: 5, title: "נאמנות לתורה" },
    ],
  },
  {
    slug: "ki-tisa",
    name: "דרש פרשת כי תשא",
    folder: "C:\\Users\\w\\Downloads\\דרש כי תשא",
    cards: [
      { num: 1, title: "שריפת המערכת היצרית" },
      { num: 2, title: "סוד החצי" },
      { num: 3, title: "שקילת הרגש" },
      { num: 4, title: "לוחות ושברי לוחות" },
      { num: 5, title: "קיימו וקיבלו" },
    ],
  },
  {
    slug: "vayakhel-pekudei",
    name: "דרש פרשות ויקהל-פקודי",
    folder: "C:\\Users\\w\\Downloads\\_דרש ויקהל פיקודי",
    cards: [
      { num: 1, title: "ספר הגאולה · סנכרון הלבושים" },
      { num: 2, title: "עם של ניסים" },
      { num: 3, title: "תודעת שבת · בחינת הריח" },
      { num: 4, title: "זיכוך ה\"פרא\" · דרגות האכילה" },
      { num: 5, title: "לא תבערו אש" },
    ],
  },
];

// ── Ensure bucket exists ──
async function ensureBucket(name) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === name)) {
    const { error } = await supabase.storage.createBucket(name, { public: true });
    if (error) console.error(`Error creating bucket ${name}:`, error.message);
    else console.log(`Created bucket: ${name}`);
  }
}

// ── MIME types ──
const MIME_MAP = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

// ── Find file with any extension ──
function findFile(folder, baseName, extensions) {
  for (const ext of extensions) {
    const filePath = path.join(folder, `${baseName}${ext}`);
    if (fs.existsSync(filePath)) return { path: filePath, ext };
  }
  return null;
}

// ── Upload a file ──
async function uploadFile(bucket, storagePath, localPath) {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.error(`  ✗ ${storagePath}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${storagePath}`);
  return true;
}

// ── Main ──
async function main() {
  await ensureBucket(BUCKET);
  await ensureBucket(DATA_BUCKET);

  const manifest = { parshas: [] };

  for (const parsha of PARSHAS) {
    console.log(`\nUploading: ${parsha.name} (${parsha.slug})`);
    const parshaData = {
      slug: parsha.slug,
      name: parsha.name,
      cards: [],
    };

    // Upload card images + optional PDF/audio
    const IMAGE_EXTS = [".png", ".jpg", ".jpeg"];
    const PDF_EXTS = [".pdf"];
    const AUDIO_EXTS = [".mp3", ".m4a", ".wav", ".ogg"];

    for (const card of parsha.cards) {
      // Find and upload card image
      const imgFile = findFile(parsha.folder, String(card.num), IMAGE_EXTS);
      if (!imgFile) {
        console.error(`  ✗ Image not found for card ${card.num}`);
        continue;
      }

      const imgKey = `${parsha.slug}_${card.num}${imgFile.ext}`;
      await uploadFile(BUCKET, imgKey, imgFile.path);
      const { data: imgUrl } = supabase.storage.from(BUCKET).getPublicUrl(imgKey);

      // Find and upload PDF (optional)
      let pdfUrl = null;
      const pdfFile = findFile(parsha.folder, String(card.num), PDF_EXTS);
      if (pdfFile) {
        const pdfKey = `${parsha.slug}_${card.num}.pdf`;
        await uploadFile(BUCKET, pdfKey, pdfFile.path);
        const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(pdfKey);
        pdfUrl = url.publicUrl;
      }

      // Find and upload audio (optional)
      let audioUrl = null;
      const audioFile = findFile(parsha.folder, String(card.num), AUDIO_EXTS);
      if (audioFile) {
        const audioKey = `${parsha.slug}_${card.num}${audioFile.ext}`;
        await uploadFile(BUCKET, audioKey, audioFile.path);
        const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(audioKey);
        audioUrl = url.publicUrl;
      }

      parshaData.cards.push({
        num: card.num,
        title: card.title,
        imageUrl: imgUrl.publicUrl,
        summaryUrl: pdfUrl,
        audioUrl: audioUrl,
      });
    }

    manifest.parshas.push(parshaData);
  }

  // Upload worksheets.json to data bucket
  const json = JSON.stringify(manifest, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const { error } = await supabase.storage.from(DATA_BUCKET).upload("worksheets.json", blob, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) {
    console.error("Error uploading worksheets.json:", error.message);
  } else {
    console.log("\n✓ worksheets.json uploaded to data bucket");
  }

  console.log("\nDone! Total parshas:", manifest.parshas.length);
}

main().catch(console.error);
