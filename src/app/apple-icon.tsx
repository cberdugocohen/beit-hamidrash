import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          background: "linear-gradient(135deg, #1e3a5f, #152352)",
        }}
      >
        <span style={{ fontSize: 48, marginBottom: 4 }}>📖</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "white", fontFamily: "Arial" }}>בית המדרש</span>
        <span style={{ fontSize: 11, color: "#d4a843", fontFamily: "Arial" }}>קשר השותפות</span>
      </div>
    ),
    { ...size }
  );
}
