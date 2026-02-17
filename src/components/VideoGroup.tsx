"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Play, BookOpen, Calendar, ChevronDown, ChevronUp, FileText, Award } from "lucide-react";
import { Video } from "@/data/content";

interface VideoGroupProps {
  groupKey: string;
  videos: Video[];
  groupMode: "topic" | "hebDate";
  isCollapsed: boolean;
  selectedVideoId: string | null;
  showDetail: boolean;
  animationDelay: number;
  isLessonCompleted: (id: string) => boolean;
  getMeta: (id: string) => { summary?: string; transcriptUrl?: string; quizUrl?: string; presentationUrl?: string } | undefined;
  getTopicDot: (topic: string) => string;
  onToggle: (key: string) => void;
  onSelect: (video: Video) => void;
}

function VideoGroup({
  groupKey, videos, groupMode, isCollapsed, selectedVideoId, showDetail,
  animationDelay, isLessonCompleted, getMeta, getTopicDot, onToggle, onSelect,
}: VideoGroupProps) {
  const groupCompleted = videos.filter((v) => isLessonCompleted(v.id)).length;
  const isAllDone = groupCompleted === videos.length && videos.length > 0;
  const pct = videos.length > 0 ? Math.round((groupCompleted / videos.length) * 100) : 0;

  return (
    <motion.div
      key={groupKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(animationDelay, 0.3) }}
      className={`bg-white rounded-2xl border overflow-hidden transition-colors ${isAllDone ? "border-emerald-200" : "border-slate-200"}`}
    >
      <button
        onClick={() => onToggle(groupKey)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
        aria-label={`${isCollapsed ? "פתח" : "סגור"} ${groupKey}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAllDone ? "bg-emerald-100" : "bg-torah-50"}`}>
            {groupMode === "topic" ? (
              <BookOpen className={`w-5 h-5 ${isAllDone ? "text-emerald-600" : "text-torah-400"}`} />
            ) : (
              <Calendar className={`w-5 h-5 ${isAllDone ? "text-emerald-600" : "text-torah-400"}`} />
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              {groupMode === "topic" && <span className={`w-2.5 h-2.5 rounded-full ${getTopicDot(groupKey)}`} />}
              <h2 className="font-bold text-slate-800 text-[15px]">{groupKey}</h2>
            </div>
            <span className="text-xs text-slate-400">{videos.length} שיעורים</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {groupCompleted > 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isAllDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {groupCompleted}/{videos.length}
            </span>
          )}
          <div className="hidden sm:block w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${isAllDone ? "bg-emerald-400" : "bg-torah-400"}`} style={{ width: `${pct}%` }} />
          </div>
          {isCollapsed ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronUp className="w-5 h-5 text-slate-300" />}
        </div>
      </button>

      {!isCollapsed && (
        <div className="border-t border-slate-100">
          {videos.map((video, vi) => {
            const completed = isLessonCompleted(video.id);
            const isPlaying = selectedVideoId === video.id && showDetail;
            const hasMeta = getMeta(video.id);
            const hasRes = hasMeta && (hasMeta.summary || hasMeta.transcriptUrl || hasMeta.quizUrl || hasMeta.presentationUrl);

            return (
              <button
                key={video.id}
                onClick={() => onSelect(video)}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 text-right transition-all border-b border-slate-50 last:border-b-0 ${isPlaying ? "bg-torah-50 border-r-[3px] border-r-torah-500" : "hover:bg-slate-50/70"}`}
              >
                <span className="text-[11px] text-slate-300 w-6 text-center tabular-nums shrink-0">{vi + 1}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${completed ? "bg-emerald-100" : isPlaying ? "bg-torah-100" : "bg-slate-100"}`}>
                  {completed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : isPlaying ? (
                    <Play className="w-4 h-4 text-torah-500 fill-torah-500" />
                  ) : (
                    <Play className="w-4 h-4 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate flex items-center gap-1.5 ${completed ? "text-slate-400" : isPlaying ? "font-semibold text-torah-700" : "text-slate-700"}`}>
                    {video.date > new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full shrink-0">חדש</span>
                    )}
                    <span className="truncate">{video.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2">
                    <span>{video.hebDate}</span>
                    {hasRes && (
                      <>
                        <span className="w-px h-2.5 bg-slate-200" />
                        <span className="text-torah-400 flex items-center gap-0.5">
                          <FileText className="w-3 h-3" /> חומרים
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {completed && (
                  <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">הושלם</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Group completion celebration */}
      {isAllDone && !isCollapsed && (
        <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-3 flex items-center gap-2 text-emerald-700">
          <Award className="w-5 h-5" />
          <span className="text-sm font-bold">כל הכבוד! השלמת את כל השיעורים בקבוצה זו</span>
        </div>
      )}
    </motion.div>
  );
}

export default memo(VideoGroup);
