"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Play, Calendar, X, ExternalLink, Save, Pencil,
  Download, ClipboardList, Presentation, FileText, SkipForward, SkipBack, Award, Share2,
} from "lucide-react";
import { Video } from "@/data/content";

interface LessonMeta {
  summary?: string;
  transcriptUrl?: string;
  quizUrl?: string;
  presentationUrl?: string;
}

interface VideoPlayerProps {
  video: Video;
  isCompleted: boolean;
  prevVideo: Video | null;
  nextVideo: Video | null;
  lessonNum: number;
  lessonTotal: number;
  currentMeta?: LessonMeta;
  isAdmin: boolean;
  editSummary: string;
  editTranscript: string;
  editQuiz: string;
  editPresentation: string;
  onEditSummary: (v: string) => void;
  onEditTranscript: (v: string) => void;
  onEditQuiz: (v: string) => void;
  onEditPresentation: (v: string) => void;
  onSaveMeta: () => void;
  onComplete: (id: string) => void;
  onSelect: (v: Video) => void;
  onClose: () => void;
  getTopicDot: (topic: string) => string;
}

function VideoPlayer({
  video, isCompleted, prevVideo, nextVideo, lessonNum, lessonTotal,
  currentMeta, isAdmin, editSummary, editTranscript, editQuiz, editPresentation,
  onEditSummary, onEditTranscript, onEditQuiz, onEditPresentation,
  onSaveMeta, onComplete, onSelect, onClose, getTopicDot,
}: VideoPlayerProps) {
  const hasAnyResource = currentMeta && (currentMeta.summary || currentMeta.transcriptUrl || currentMeta.quizUrl || currentMeta.presentationUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Video */}
        <div className="lg:col-span-3">
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1&hl=he&autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          {/* Next/Prev bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => prevVideo && onSelect(prevVideo)}
              disabled={!prevVideo}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-torah-600 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <SkipForward className="w-4 h-4" /> הקודם
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              שיעור {lessonNum} מתוך {lessonTotal} • {video.topic}
            </span>
            <button
              onClick={() => nextVideo && onSelect(nextVideo)}
              disabled={!nextVideo}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-torah-600 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              הבא <SkipBack className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 flex flex-col lg:max-h-[540px]">
          {/* Title */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold text-slate-800 leading-snug">{video.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>{video.hebDate}</span>
                  <span className="w-px h-3 bg-slate-200" />
                  <span className={`w-2 h-2 rounded-full ${getTopicDot(video.topic)}`} />
                  <span className="text-torah-400 font-medium">{video.topic}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/lesson/${video.videoId}`;
                    if (navigator.share) {
                      navigator.share({ title: video.title, url });
                    } else {
                      navigator.clipboard.writeText(url);
                      alert("הקישור הועתק!");
                    }
                  }}
                  className="text-slate-300 hover:text-torah-500 transition-colors p-1"
                  title="שתף שיעור"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Complete CTA */}
          <div className="px-5 py-3 border-b border-slate-100">
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.div
                  key="completed"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 300 }}
                  className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
                >
                  <motion.div animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] }} transition={{ duration: 0.6 }}>
                    <Award className="w-5 h-5 text-emerald-500" />
                  </motion.div>
                  <span className="text-emerald-700 font-semibold text-sm">שיעור זה הושלם! 🎉</span>
                </motion.div>
              ) : (
                <motion.button
                  key="complete-btn"
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => onComplete(video.id)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 pulse-glow"
                >
                  <CheckCircle className="w-5 h-5" /> סיימתי את השיעור — קבל XP!
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Resources */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {hasAnyResource && (
              <>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">חומרי שיעור</h3>
                {currentMeta?.transcriptUrl && (
                  <ResourceLink href={currentMeta.transcriptUrl} icon={<Download className="w-4 h-4" />} iconBg="bg-blue-100" iconColor="text-blue-600" title="הורד תמלול" subtitle="תמלול מלא של השיעור" />
                )}
                {currentMeta?.summary && (
                  <div className="p-3 rounded-xl bg-gold-50/50 border border-gold-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="w-4 h-4 text-gold-600" />
                      <span className="text-sm font-semibold text-gold-700">סיכום השיעור</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{currentMeta.summary}</p>
                  </div>
                )}
                {currentMeta?.quizUrl && (
                  <ResourceLink href={currentMeta.quizUrl} icon={<ClipboardList className="w-4 h-4" />} iconBg="bg-purple-100" iconColor="text-purple-600" title="מבחן / בוחן" subtitle="Notebook LM / Google Forms" />
                )}
                {currentMeta?.presentationUrl && (
                  <ResourceLink href={currentMeta.presentationUrl} icon={<Presentation className="w-4 h-4" />} iconBg="bg-green-100" iconColor="text-green-600" title="מצגת" subtitle="חומר עזר ויזואלי" />
                )}
              </>
            )}

            {!hasAnyResource && !isAdmin && (
              <div className="text-center py-6 text-slate-300">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">חומרי שיעור יתווספו בקרוב</p>
              </div>
            )}

            {/* Admin Edit Panel */}
            {isAdmin && (
              <div className="mt-2 p-4 rounded-xl bg-red-50/50 border border-red-200/50 space-y-3">
                <div className="flex items-center gap-2 text-red-600">
                  <Pencil className="w-4 h-4" />
                  <span className="text-sm font-bold">עריכת אדמין</span>
                </div>
                <AdminField label="סיכום השיעור" value={editSummary} onChange={onEditSummary} multiline dir="rtl" placeholder="כתוב סיכום לשיעור..." />
                <AdminField label="קישור לתמלול" value={editTranscript} onChange={onEditTranscript} dir="ltr" placeholder="https://..." />
                <AdminField label="קישור למבחן" value={editQuiz} onChange={onEditQuiz} dir="ltr" placeholder="https://..." />
                <AdminField label="קישור למצגת" value={editPresentation} onChange={onEditPresentation} dir="ltr" placeholder="https://..." />
                <button onClick={onSaveMeta} className="flex items-center gap-2 bg-torah-600 hover:bg-torah-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors w-full justify-center">
                  <Save className="w-4 h-4" /> שמור
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(VideoPlayer);

// ── Sub-components ──

function ResourceLink({ href, icon, iconBg, iconColor, title, subtitle }: {
  href?: string; icon: React.ReactNode; iconBg: string; iconColor: string; title: string; subtitle: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-torah-50 border border-slate-100 hover:border-torah-200 transition-all group">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{title}</div>
        <div className="text-[11px] text-slate-400">{subtitle}</div>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-300" />
    </a>
  );
}

function AdminField({ label, value, onChange, multiline, dir, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; dir: string; placeholder: string;
}) {
  const cls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-torah-400";
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={`${cls} resize-none`} dir={dir} placeholder={placeholder} />
      ) : (
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} className={cls} dir={dir} placeholder={placeholder} />
      )}
    </div>
  );
}
