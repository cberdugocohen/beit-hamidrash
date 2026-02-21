import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export const alt = "בית המדרש קשר השותפות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // Read logo from public folder
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoData = await readFile(logoPath);
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #152352 50%, #1a2d4a 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            right: -60,
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.02)",
          }}
        />

        {/* Logo */}
        <img
          src={logoBase64}
          width={280}
          height={280}
          style={{ borderRadius: 24, marginBottom: 20 }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          בית המדרש קשר השותפות
        </div>
        <div
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
          }}
        >
          שיעורי תורה, דרש, זוהר וחסידות • הרב אסף פלג
        </div>

        {/* Bottom bar */}
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
    { ...size }
  );
}
