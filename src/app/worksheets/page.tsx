"use client";

import Shell from "@/components/Shell";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  X,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Card {
  num: number;
  title: string;
  imageUrl: string;
  summaryUrl?: string | null;
  audioUrl?: string | null;
}

interface Parsha {
  slug: string;
  name: string;
  cards: Card[];
}

interface WorksheetsData {
  parshas: Parsha[];
}

const supabase = createClient();

async function loadWorksheets(): Promise<WorksheetsData | null> {
  try {
    const { data } = await supabase.storage.from("data").download("worksheets.json");
    if (data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch {
    /* fall through */
  }
  return null;
}

export default function WorksheetsPage() {
  const [data, setData] = useState<WorksheetsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{
    parshaIdx: number;
    cardIdx: number;
  } | null>(null);

  useEffect(() => {
    loadWorksheets().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const openLightbox = (parshaIdx: number, cardIdx: number) => {
    setLightbox({ parshaIdx, cardIdx });
  };

  const closeLightbox = () => setLightbox(null);

  const navigateLightbox = useCallback(
    (dir: -1 | 1) => {
      if (!lightbox || !data) return;
      const parsha = data.parshas[lightbox.parshaIdx];
      const next = lightbox.cardIdx + dir;
      if (next >= 0 && next < parsha.cards.length) {
        setLightbox({ ...lightbox, cardIdx: next });
      }
    },
    [lightbox, data]
  );

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") navigateLightbox(-1);
      if (e.key === "ArrowLeft") navigateLightbox(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, navigateLightbox]);

  const handleShare = async () => {
    const url = "https://beit-hamidrash.vercel.app/worksheets";
    if (navigator.share) {
      try {
        await navigator.share({
          title: "כרטיסיות עבודה — דרש פרשת השבוע",
          text: "כרטיסיות עבודה לדרש פרשת השבוע — קשר השותפות",
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // Reversed parshas (latest first)
  const parshas = data?.parshas ? [...data.parshas].reverse() : [];

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold gradient-text">
              כרטיסיות עבודה
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              נקודות עבודה שבועיות מתוך דרש פרשת השבוע
            </p>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-torah-600 text-white text-sm font-medium hover:bg-torah-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Share2 className="w-4 h-4" />
            שיתוף
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-torah-500 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && parshas.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>אין כרטיסיות עדיין</p>
          </div>
        )}

        {/* Simple list: Parsha + card titles */}
        <div className="space-y-6">
          {parshas.map((parsha, pIdx) => {
            const realIdx = data!.parshas.indexOf(parsha);
            const isLatest = pIdx === 0;
            return (
              <div key={parsha.slug} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                {/* Parsha header */}
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-torah-700">{parsha.name}</h2>
                  {isLatest && (
                    <span className="text-[10px] font-semibold text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                      חדש
                    </span>
                  )}
                </div>

                {/* Card titles list */}
                <div className="space-y-2">
                  {parsha.cards.map((card, cIdx) => (
                    <div
                      key={card.num}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <button
                        onClick={() => openLightbox(realIdx, cIdx)}
                        className="flex-1 text-right flex items-center gap-3 hover:text-torah-700 transition-colors group"
                      >
                        <span className="w-7 h-7 rounded-lg bg-torah-100 text-torah-600 text-sm font-bold flex items-center justify-center shrink-0 group-hover:bg-torah-200">
                          {card.num}
                        </span>
                        <span className="text-slate-700 font-medium group-hover:text-torah-700">
                          {card.title}
                        </span>
                      </button>
                      {/* Per-card links */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {card.summaryUrl && (
                          <a
                            href={card.summaryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors"
                            title="סיכום"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </a>
                        )}
                        {card.audioUrl && (
                          <a
                            href={card.audioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 hover:bg-purple-100 flex items-center justify-center transition-colors"
                            title="הקלטה"
                          >
                            <Headphones className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightbox && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-w-2xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeLightbox}
                className="absolute -top-12 left-0 text-white/70 hover:text-white transition-colors z-10"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="text-center mb-3">
                <div className="text-white/50 text-xs">
                  {data.parshas[lightbox.parshaIdx].name} · תרגיל{" "}
                  {data.parshas[lightbox.parshaIdx].cards[lightbox.cardIdx].num}
                </div>
                <div className="text-white font-bold text-lg">
                  {data.parshas[lightbox.parshaIdx].cards[lightbox.cardIdx].title}
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-white shadow-2xl">
                <img
                  src={data.parshas[lightbox.parshaIdx].cards[lightbox.cardIdx].imageUrl}
                  alt={data.parshas[lightbox.parshaIdx].cards[lightbox.cardIdx].title}
                  className="w-full h-auto max-h-[75vh] object-contain"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => navigateLightbox(1)}
                  disabled={lightbox.cardIdx >= data.parshas[lightbox.parshaIdx].cards.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                  הבא
                </button>
                <span className="text-white/40 text-sm">
                  {lightbox.cardIdx + 1} / {data.parshas[lightbox.parshaIdx].cards.length}
                </span>
                <button
                  onClick={() => navigateLightbox(-1)}
                  disabled={lightbox.cardIdx <= 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
                >
                  הקודם
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}
