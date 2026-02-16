import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "בית המדרש - קשר השותפות",
  description: "מערכת למידה עם גיימיפיקציה - שיעורי תורה, דרש, זוהר וחסידות מפי הרב אסף פלג",
  openGraph: {
    title: "בית המדרש - קשר השותפות",
    description: "מערכת למידה עם גיימיפיקציה - שיעורי תורה, דרש, זוהר וחסידות",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "בית המדרש קשר השותפות" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#1e3a5f" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-torah-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-bold">
          דלג לתוכן הראשי
        </a>
        <Providers>
          <div id="main-content">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
