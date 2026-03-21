import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "כרטיסיות עבודה — קשר השותפות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Card {
  num: number;
  title: string;
  imageUrl: string;
}

interface Parsha {
  slug: string;
  name: string;
  cards: Card[];
}

interface WorksheetsData {
  parshas: Parsha[];
}

export default async function OGImage() {
  // Fetch worksheets.json to get the latest parsha's first card
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: blob } = await supabase.storage
      .from("data")
      .download("worksheets.json");
    if (blob) {
      const worksheets: WorksheetsData = JSON.parse(await blob.text());
      const latest = worksheets.parshas[worksheets.parshas.length - 1];
      if (latest?.cards?.[0]?.imageUrl) {
        const res = await fetch(latest.cards[0].imageUrl, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const ct = res.headers.get("content-type") || "image/png";
          return new Response(buffer, {
            headers: {
              "Content-Type": ct,
              "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
          });
        }
      }
    }
  } catch {
    /* fall through to fallback */
  }

  // Fallback: 1x1 transparent gif
  const pixel = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00,
    0x3b,
  ]);
  return new Response(pixel, {
    headers: { "Content-Type": "image/gif" },
  });
}
