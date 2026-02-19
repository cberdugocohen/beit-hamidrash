"use client";

import { BookOpen, Calendar, Play, FileText, Download, ClipboardList, Presentation, Share2, ExternalLink } from "lucide-react";

interface Video {
  id: string;
  title: string;
  url: string;
  videoId: string;
  date: string;
  topic: string;
  hebDate: string;
  hebMonthYear: string;
}

interface LessonMeta {
  video_id: string;
  summary: string | null;
  transcript_url: string | null;
  quiz_url: string | null;
  presentation_url: string | null;
}

export default function LessonShareContent({ video, meta }: { video: Video; meta: LessonMeta | null }) {
  const hasSummary = !!meta?.summary;
  const hasResources = meta && (meta.transcript_url || meta.quiz_url || meta.presentation_url);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShare = async () => {
    const text = `${video.title}\n${meta?.summary ? meta.summary.slice(0, 100) + "..." : video.topic}\n\n`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, text, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text + shareUrl);
      alert("הקישור הועתק!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-torah-600 hover:text-torah-700 transition-colors">
            <BookOpen className="w-5 h-5" />
            <span className="font-bold text-sm">בית המדרש קשר השותפות</span>
          </a>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-torah-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-torah-700 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            שתף
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Video embed */}
        <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1&hl=he`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>

        {/* Title + meta */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 leading-snug mb-3">{video.title}</h1>
          <div className="flex items-center gap-3 flex-wrap text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {video.hebDate}
            </span>
            <span className="w-px h-4 bg-slate-200" />
            <span className="flex items-center gap-1.5 text-torah-500 font-medium">
              <BookOpen className="w-4 h-4" />
              {video.topic}
            </span>
            <span className="w-px h-4 bg-slate-200" />
            <span className="text-slate-300">{video.date}</span>
          </div>
        </div>

        {/* ── Summary (emphasized) ── */}
        {hasSummary && (
          <div className="bg-white rounded-2xl border border-gold-200 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gold-100 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-gold-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">סיכום השיעור</h2>
            </div>
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
              {meta!.summary}
            </div>
          </div>
        )}

        {/* ── Resources ── */}
        {hasResources && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">חומרי לימוד</h2>
            <div className="space-y-3">
              {meta!.transcript_url && (
                <a
                  href={meta!.transcript_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-700">תמלול השיעור</div>
                    <div className="text-xs text-slate-400">הורד את התמלול המלא</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300" />
                </a>
              )}
              {meta!.quiz_url && (
                <a
                  href={meta!.quiz_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-700">מבחן / בוחן</div>
                    <div className="text-xs text-slate-400">בדוק את עצמך</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300" />
                </a>
              )}
              {meta!.presentation_url && (
                <a
                  href={meta!.presentation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-100 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-700">מצגת</div>
                    <div className="text-xs text-slate-400">חומר עזר ויזואלי</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* CTA: Open in app */}
        <div className="bg-gradient-to-l from-torah-600 to-torah-700 rounded-2xl p-6 text-center text-white shadow-lg">
          <Play className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold mb-2">רוצה ללמוד עוד?</h3>
          <p className="text-white/70 text-sm mb-4">הצטרף לבית המדרש וצפה במאות שיעורים</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-white text-torah-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-torah-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            כניסה לבית המדרש
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-300">
          <p>בית המדרש קשר השותפות • הרב אסף פלג</p>
        </div>
      </main>
    </div>
  );
}
