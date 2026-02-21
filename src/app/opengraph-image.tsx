import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "בית המדרש קשר השותפות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
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

        {/* Icon */}
        <div
          style={{
            display: "flex",
            width: 100,
            height: 100,
            borderRadius: 24,
            background: "linear-gradient(135deg, #d4a843, #b8860b)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 30,
            boxShadow: "0 8px 32px rgba(212,168,67,0.3)",
          }}
        >
          <span style={{ fontSize: 52 }}>📖</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          בית המדרש
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#d4a843",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          קשר השותפות
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            maxWidth: 700,
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
