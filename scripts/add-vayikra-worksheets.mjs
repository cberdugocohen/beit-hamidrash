/**
 * Add only Vayikra worksheets to existing worksheets.json
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env.local
const envPath = path.join(ROOT, ".env.local");
const envText = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) env[match[1]] = match[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const BUCKET = "worksheets";
const DATA_BUCKET = "data";

const VAYIKRA = {
  slug: "vayikra",
  name: "דרש פרשת ויקרא",
  folder: "C:\\Users\\w\\Downloads\\דרש ויקרא",
  cards: [
    { num: 1, title: "ה-א' הזעירה: ענווה כהסתגלות לאמת" },
    { num: 2, title: "חיבור המוח והלב: מהפרט אל הכלל" },
    { num: 3, title: 'הזוהר משנה דנ"א רוחני' },
    { num: 4, title: "מבנה רוחני של מאה ברכות" },
    { num: 5, title: "מעשה בהמה: העלאת החומר לקדושה" },
  ],
};

async function main() {
  console.log("Uploading Vayikra worksheets...\n");

  // 1. Upload images
  const parshaData = { slug: VAYIKRA.slug, name: VAYIKRA.name, cards: [] };

  for (const card of VAYIKRA.cards) {
    const imgPath = path.join(VAYIKRA.folder, `${card.num}.png`);
    if (!fs.existsSync(imgPath)) {
      console.error(`  ✗ Image not found: ${imgPath}`);
      continue;
    }

    const imgKey = `${VAYIKRA.slug}_${card.num}.png`;
    const buffer = fs.readFileSync(imgPath);

    const { error } = await supabase.storage.from(BUCKET).upload(imgKey, buffer, {
      contentType: "image/png",
      upsert: true,
    });

    if (error) {
      console.error(`  ✗ ${imgKey}: ${error.message}`);
    } else {
      console.log(`  ✓ ${imgKey}`);
    }

    const { data: imgUrl } = supabase.storage.from(BUCKET).getPublicUrl(imgKey);
    parshaData.cards.push({
      num: card.num,
      title: card.title,
      imageUrl: imgUrl.publicUrl,
      summaryUrl: null,
      audioUrl: null,
    });
  }

  // 2. Get existing worksheets.json
  console.log("\nFetching existing worksheets.json...");
  const { data: existingData } = await supabase.storage.from(DATA_BUCKET).download("worksheets.json");
  const existingJson = existingData ? JSON.parse(await existingData.text()) : { parshas: [] };

  // 3. Remove old vayikra if exists, add new
  existingJson.parshas = existingJson.parshas.filter((p) => p.slug !== "vayikra");
  existingJson.parshas.push(parshaData);

  // 4. Upload updated worksheets.json
  const json = JSON.stringify(existingJson, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const { error: uploadError } = await supabase.storage.from(DATA_BUCKET).upload("worksheets.json", blob, {
    contentType: "application/json",
    upsert: true,
  });

  if (uploadError) {
    console.error("Error uploading worksheets.json:", uploadError.message);
  } else {
    console.log("✓ worksheets.json updated");
  }

  console.log("\nDone! Vayikra added. Total parshas:", existingJson.parshas.length);
}

main().catch(console.error);
