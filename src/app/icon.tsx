import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "linear-gradient(135deg, #1e3a5f, #152352)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "linear-gradient(135deg, #d4a843, #b8860b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
            opacity: 0.2,
            position: "absolute",
            top: 36,
          }}
        />
        <span style={{ fontSize: 52, marginBottom: 4 }}>📖</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "white", fontFamily: "Arial" }}>בית המדרש</span>
        <span style={{ fontSize: 12, color: "#d4a843", fontFamily: "Arial" }}>קשר השותפות</span>
      </div>
    ),
    { ...size }
  );
}
