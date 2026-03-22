import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "כרטיסיות עבודה — קשר השותפות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Card {
  num: number;
  title: string;
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
  let parshas: Parsha[] = [];

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/data/worksheets.json`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data: WorksheetsData = await res.json();
      parshas = data.parshas.slice(-3).reverse(); // Last 3, newest first
    }
  } catch {
    /* use empty */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
          padding: "50px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#f59e0b",
            }}
          >
            כרטיסיות עבודה
          </div>
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          נקודות עבודה שבועיות מתוך דרש פרשת השבוע
        </div>

        {/* Parshas list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
          }}
        >
          {parshas.map((parsha, idx) => (
            <div
              key={parsha.slug}
              style={{
                display: "flex",
                flexDirection: "column",
                background: idx === 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.05)",
                borderRadius: "16px",
                padding: "20px 30px",
                border: idx === 0 ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: idx === 0 ? "#f59e0b" : "#e2e8f0",
                  }}
                >
                  {parsha.name}
                </div>
                {idx === 0 && (
                  <div
                    style={{
                      background: "#10b981",
                      color: "white",
                      fontSize: "14px",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontWeight: "bold",
                    }}
                  >
                    חדש
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {parsha.cards.slice(0, 3).map((card) => (
                  <div
                    key={card.num}
                    style={{
                      fontSize: "16px",
                      color: "#94a3b8",
                      background: "rgba(255,255,255,0.05)",
                      padding: "6px 14px",
                      borderRadius: "8px",
                    }}
                  >
                    {card.num}. {card.title}
                  </div>
                ))}
                {parsha.cards.length > 3 && (
                  <div
                    style={{
                      fontSize: "16px",
                      color: "#64748b",
                      padding: "6px 14px",
                    }}
                  >
                    +{parsha.cards.length - 3} עוד
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
            fontSize: "20px",
            color: "#64748b",
          }}
        >
          קשר השותפות — בית המדרש
        </div>
      </div>
    ),
    { ...size }
  );
}
