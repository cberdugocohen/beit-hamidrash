"use client";

import Shell from "@/components/Shell";
import HeroCard from "@/components/HeroCard";
import VideoPlayer from "@/components/VideoPlayer";
import VideoGroup from "@/components/VideoGroup";
import {
  getAllVideos,
  setVideos,
  isLoaded,
  getTopics,
  getVideosByTopic,
  getHebMonthYears,
  getVideosByHebMonth,
  Video,
} from "@/data/content";
import { useGamificationStore } from "@/store/gamification";
import { useLessonMetaStore } from "@/store/lessonMeta";
import { useTopicSettingsStore } from "@/store/topicSettings";
import { useAuth } from "@/lib/supabase/auth-context";
import { useLessonMetaSync } from "@/lib/supabase/use-lesson-meta-sync";
import { useToast } from "@/components/Toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Layers,
  Search,
  Calendar,
  PlayCircle,
  Zap,
  Library,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";

type GroupMode = "topic" | "hebDate";

function fuzzyMatch(text: string, query: string): boolean {
  const words = query.trim().split(/\s+/);
  return words.every((w) => text.includes(w));
}

// Topic color palette for visual distinction
const TOPIC_COLORS: Record<string, string> = {
  "יסודות העבודה מתוך לימוד הדרש": "bg-blue-500",
  "דרש פרשת השבוע": "bg-indigo-500",
  "ספירת העומר": "bg-violet-500",
  "זוהר בראשית ופרשת השבוע": "bg-purple-500",
  "הקדמה לספר הזוהר": "bg-fuchsia-500",
  "פרשת שבוע על פי החסידות": "bg-pink-500",
  "המאור עיניים": "bg-rose-500",
  "הקדמה לספר הזוהר ותלמוד עשר ספירות": "bg-orange-500",
  "עבודת הקורבנות": "bg-amber-500",
  "משמר זוהר ליל שישי": "bg-yellow-600",
  "מסע חודש אלול": "bg-lime-600",
  "מסילת ישרים": "bg-green-500",
  "מסילת ישרים + דרך עץ החיים": "bg-emerald-500",
  "עבודת ימי השובבים": "bg-teal-500",
  "מפגשי קהילה": "bg-cyan-500",
  "חנוכה": "bg-sky-500",
  "פסח": "bg-blue-600",
  "סוכות": "bg-green-600",
  "פורים": "bg-pink-600",
  "ראש השנה": "bg-amber-600",
};

function getTopicDot(topic: string): string {
  return TOPIC_COLORS[topic] || "bg-slate-400";
}

// Greeting based on time of day
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

const DAILY_GOAL = 3;

export default function HomePage() {
  const store = useGamificationStore();
  const metaStore = useLessonMetaStore();
  const topicSettingsStore = useTopicSettingsStore();
  const { user, profile } = useAuth();
  const { saveMetaToDB } = useLessonMetaSync();
  const { toast } = useToast();
  const level = store.getLevel();

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [search, setSearch] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("topic");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const [dataVersion, setDataVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const syncRan = useRef(false);

  // XP toast state
  const [xpToast, setXpToast] = useState<{ xp: number; show: boolean }>({ xp: 0, show: false });
  const prevXp = useRef(store.xp);

  // Admin edit state
  const [editSummary, setEditSummary] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editQuiz, setEditQuiz] = useState("");
  const [editPresentation, setEditPresentation] = useState("");

  // ── Load videos + auto-sync ──
  useEffect(() => {
    async function init() {
      if (!isLoaded()) {
        try {
          const r = await fetch("/api/videos");
          const data: Video[] = await r.json();
          setVideos(data);
          setDataVersion((v) => v + 1);
        } catch { /* empty */ }
      }
      setLoading(false);
      if (!syncRan.current) {
        syncRan.current = true;
        setSyncStatus("syncing");
        try {
          const res = await fetch("/api/sync-videos");
          const result = await res.json();
          if (result.error) {
            setSyncStatus("error");
          } else if (result.newCount > 0) {
            const jsonRes = await fetch("/api/videos?t=" + Date.now());
            const videos = await jsonRes.json();
            setVideos(videos);
            setDataVersion((v) => v + 1);
            setSyncMsg(`${result.newCount} חדשים`);
            setSyncStatus("done");
          } else {
            setSyncStatus("done");
          }
        } catch {
          setSyncStatus("error");
        }
        setTimeout(() => { setSyncStatus("idle"); setSyncMsg(""); }, 5000);
      }
    }
    init();
  }, []);

  // XP toast: detect XP gain
  useEffect(() => {
    if (store.xp > prevXp.current) {
      const gained = store.xp - prevXp.current;
      setXpToast({ xp: gained, show: true });
      setTimeout(() => setXpToast((t) => ({ ...t, show: false })), 3000);
    }
    prevXp.current = store.xp;
  }, [store.xp]);

  const allVideos = useMemo(() => getAllVideos(), [dataVersion]);
  const totalVideos = allVideos.length;
  const completedCount = store.getCompletedLessonsCount();
  const overallProgress = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  const topics = useMemo(() => getTopics(), [dataVersion]);
  const videosByTopic = useMemo(() => getVideosByTopic(), [dataVersion]);
  const hebMonths = useMemo(() => getHebMonthYears(), [dataVersion]);
  const videosByHebMonth = useMemo(() => getVideosByHebMonth(), [dataVersion]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayCompleted = useMemo(() => {
    let count = 0;
    for (const p of Object.values(store.lessonProgress)) {
      if (p.completed && p.completedAt?.startsWith(todayStr)) count++;
    }
    return count;
  }, [store.lessonProgress, todayStr]);

  // "Continue where you left off"
  const continueVideo = useMemo(() => {
    const progress = store.lessonProgress;
    let lastDate = "";
    let lastId = "";
    for (const [id, p] of Object.entries(progress)) {
      if (p.completed && p.completedAt && p.completedAt > lastDate) {
        lastDate = p.completedAt;
        lastId = id;
      }
    }
    if (!lastId) return null;
    const idx = allVideos.findIndex((v) => v.id === lastId);
    if (idx < 0) return null;
    const lastVideo = allVideos[idx];
    const topicVideos = allVideos.filter((v) => v.topic === lastVideo.topic);
    const topicIdx = topicVideos.findIndex((v) => v.id === lastId);
    for (let i = topicIdx + 1; i < topicVideos.length; i++) {
      if (!store.isLessonCompleted(topicVideos[i].id)) return topicVideos[i];
    }
    for (let i = idx + 1; i < allVideos.length; i++) {
      if (!store.isLessonCompleted(allVideos[i].id)) return allVideos[i];
    }
    return null;
  }, [allVideos, store.lessonProgress, store]);

  // Next/Prev in current topic
  const { prevVideo, nextVideo, lessonNum, lessonTotal } = useMemo(() => {
    if (!selectedVideo) return { prevVideo: null, nextVideo: null, lessonNum: 0, lessonTotal: 0 };
    const topicVids = allVideos.filter((v) => v.topic === selectedVideo.topic);
    const idx = topicVids.findIndex((v) => v.id === selectedVideo.id);
    return {
      prevVideo: idx > 0 ? topicVids[idx - 1] : null,
      nextVideo: idx < topicVids.length - 1 ? topicVids[idx + 1] : null,
      lessonNum: idx + 1,
      lessonTotal: topicVids.length,
    };
  }, [selectedVideo, allVideos]);

  useEffect(() => {
    if (selectedVideo) {
      const meta = metaStore.getMeta(selectedVideo.id);
      setEditSummary(meta?.summary || "");
      setEditTranscript(meta?.transcriptUrl || "");
      setEditQuiz(meta?.quizUrl || "");
      setEditPresentation(meta?.presentationUrl || "");
    }
  }, [selectedVideo, metaStore]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setShowDetail(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveMeta = () => {
    if (!selectedVideo) return;
    metaStore.setMeta(selectedVideo.id, {
      summary: editSummary || undefined,
      transcriptUrl: editTranscript || undefined,
      quizUrl: editQuiz || undefined,
      presentationUrl: editPresentation || undefined,
    });
    // Also persist to Supabase
    saveMetaToDB(selectedVideo.id);
    toast("חומרי השיעור נשמרו בהצלחה");
  };

  const handleAutoPresentation = () => {
    if (!editPresentation) return;
    // Convert Google Slides/Drive edit URL to public view URL
    let url = editPresentation.trim();
    // Google Slides: .../edit -> .../pub
    if (url.includes("docs.google.com/presentation")) {
      url = url.replace(/\/(edit|present)(\?.*)?$/, "/pub?start=false&loop=false&delayms=3000");
      if (!url.includes("/pub")) {
        url = url.replace(/\/?$/, "/pub?start=false&loop=false&delayms=3000");
      }
    }
    // Google Drive file: convert to direct view
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match) {
        url = `https://drive.google.com/file/d/${match[1]}/view?usp=sharing`;
      }
    }
    // Google Drive open: convert to view
    if (url.includes("drive.google.com/open?id=")) {
      const match = url.match(/id=([^&]+)/);
      if (match) {
        url = `https://drive.google.com/file/d/${match[1]}/view?usp=sharing`;
      }
    }
    setEditPresentation(url);
    toast("הקישור הומר לקישור צפייה ציבורי — לחצי שמור");
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const collapseAll = () => setCollapsedGroups(new Set(groupMode === "topic" ? topics : hebMonths));
  const expandAll = () => setCollapsedGroups(new Set());

  const handleComplete = (videoId: string) => {
    if (!store.isLessonCompleted(videoId)) store.completeLesson(videoId);
  };

  // Build a videoId→topic Map for O(1) lookups
  const videoTopicMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of allVideos) m.set(v.id, v.topic);
    return m;
  }, [allVideos]);

  // Smart view: determine which topics the user has started
  const smartTopics = useMemo(() => {
    const inProgress = new Set<string>();
    for (const [id, p] of Object.entries(store.lessonProgress)) {
      if (p.completed) {
        const topic = videoTopicMap.get(id);
        if (topic) inProgress.add(topic);
      }
    }
    // For new users (no progress): show top 5 biggest topics as "recommended"
    const recommended = new Set<string>();
    if (inProgress.size === 0) {
      const sorted = [...topics].sort((a, b) => {
        const ca = videosByTopic.get(a)?.length || 0;
        const cb = videosByTopic.get(b)?.length || 0;
        return cb - ca;
      });
      for (let i = 0; i < Math.min(5, sorted.length); i++) {
        recommended.add(sorted[i]);
      }
    }
    return { inProgress, recommended };
  }, [allVideos, store.lessonProgress, videoTopicMap, topics, videosByTopic]);

  const { groupKeys, groupedVideos, hiddenCount } = useMemo(() => {
    let keys: string[];
    let grouped: Map<string, Video[]>;
    if (groupMode === "topic") {
      keys = activeFilter ? [activeFilter] : [...topics];
      grouped = videosByTopic;
    } else {
      keys = [...hebMonths].reverse();
      grouped = videosByHebMonth;
    }
    // Filter completed lessons
    if (hideCompleted) {
      const filtered = new Map<string, Video[]>();
      for (const [key, vids] of grouped) {
        const remaining = vids.filter((v) => !store.isLessonCompleted(v.id));
        if (remaining.length > 0) filtered.set(key, remaining);
      }
      keys = keys.filter((k) => filtered.has(k));
      grouped = filtered;
    }
    if (search) {
      const filtered = new Map<string, Video[]>();
      for (const [key, vids] of grouped) {
        const matches = vids.filter((v) => fuzzyMatch(v.title, search));
        if (matches.length > 0) filtered.set(key, matches);
      }
      keys = keys.filter((k) => filtered.has(k));
      grouped = filtered;
    }
    if (activeFilter && groupMode === "topic") {
      keys = keys.filter((k) => k === activeFilter);
    }
    // Smart filtering: reduce initial overwhelm
    let hidden = 0;
    if (!search && !activeFilter && !showAllTopics) {
      if (groupMode === "topic") {
        const hasProgress = smartTopics.inProgress.size > 0;
        const visible = keys.filter((k) =>
          hasProgress ? smartTopics.inProgress.has(k) : smartTopics.recommended.has(k)
        );
        hidden = keys.length - visible.length;
        keys = visible;
      } else if (groupMode === "hebDate") {
        // Show only last 5 months for date view
        if (keys.length > 5) {
          hidden = keys.length - 5;
          keys = keys.slice(0, 5);
        }
      }
    }
    return { groupKeys: keys, groupedVideos: grouped, hiddenCount: hidden };
  }, [groupMode, search, activeFilter, topics, hebMonths, videosByTopic, videosByHebMonth, showAllTopics, smartTopics, hideCompleted, store]);

  const totalFiltered = useMemo(() => {
    let c = 0;
    for (const key of groupKeys) c += groupedVideos.get(key)?.length || 0;
    return c;
  }, [groupKeys, groupedVideos]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Shell>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero skeleton */}
          <div className="h-40 bg-gradient-to-l from-slate-200 to-slate-100 rounded-2xl animate-pulse" />
          {/* Controls skeleton */}
          <div className="h-14 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          {/* Groups skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="h-16 animate-pulse bg-slate-50" />
              <div className="border-t border-slate-100 space-y-0">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-14 border-b border-slate-50 animate-pulse bg-white" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  const currentMeta = selectedVideo ? metaStore.getMeta(selectedVideo.id) : undefined;
  const isAdmin = profile?.is_admin ?? false;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || store.displayName || "לומד/ת";

  return (
    <Shell>
      <div className="max-w-7xl mx-auto">

        {/* ── XP Toast ── */}
        <AnimatePresence>
          {xpToast.show && (
            <motion.div
              initial={{ opacity: 0, y: -30, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -30, x: "-50%" }}
              className="fixed top-6 left-1/2 z-[60] bg-gradient-to-l from-gold-500 to-gold-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-gold-500/30 flex items-center gap-3"
            >
              <Zap className="w-5 h-5" />
              <span className="font-bold text-lg">+{xpToast.xp} XP</span>
              <span className="text-white/70 text-sm">כל הכבוד!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Welcome Hero Card ── */}
        <HeroCard
          displayName={displayName}
          greeting={getGreeting()}
          levelIcon={level.icon}
          levelName={level.name}
          xp={store.xp}
          currentStreak={store.currentStreak}
          lastActivityDate={store.lastActivityDate}
          todayStr={todayStr}
          completedCount={completedCount}
          totalVideos={totalVideos}
          overallProgress={overallProgress}
          todayCompleted={todayCompleted}
          dailyGoal={DAILY_GOAL}
          syncStatus={syncStatus}
          syncMsg={syncMsg}
        />

        {/* ── Continue Where You Left Off ── */}
        {continueVideo && !selectedVideo && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <button
              onClick={() => handleSelectVideo(continueVideo)}
              className="w-full bg-white rounded-2xl border border-slate-200 p-4 text-right hover:shadow-lg hover:border-torah-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-torah-50 flex items-center justify-center group-hover:bg-torah-100 transition-colors">
                  <PlayCircle className="w-6 h-6 text-torah-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-slate-400 mb-0.5 font-medium">המשך מאיפה שהפסקת</div>
                  <div className="text-sm font-bold text-slate-800 truncate">{continueVideo.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getTopicDot(continueVideo.topic)}`} />
                    {continueVideo.topic} • {continueVideo.hebDate}
                  </div>
                </div>
                <Play className="w-5 h-5 text-torah-400 shrink-0 group-hover:text-torah-600 transition-colors" />
              </div>
            </button>
          </motion.div>
        )}

        {/* ── Video Player + Detail Panel ── */}
        <AnimatePresence>
          {selectedVideo && showDetail && (
            <VideoPlayer
              video={selectedVideo}
              isCompleted={store.isLessonCompleted(selectedVideo.id)}
              prevVideo={prevVideo}
              nextVideo={nextVideo}
              lessonNum={lessonNum}
              lessonTotal={lessonTotal}
              currentMeta={currentMeta}
              isAdmin={isAdmin}
              editSummary={editSummary}
              editTranscript={editTranscript}
              editQuiz={editQuiz}
              editPresentation={editPresentation}
              onEditSummary={setEditSummary}
              onEditTranscript={setEditTranscript}
              onEditQuiz={setEditQuiz}
              onEditPresentation={setEditPresentation}
              onSaveMeta={handleSaveMeta}
              onAutoPresentation={handleAutoPresentation}
              onComplete={handleComplete}
              onSelect={handleSelectVideo}
              onClose={() => setShowDetail(false)}
              getTopicDot={getTopicDot}
            />
          )}
        </AnimatePresence>

        {/* ── Controls Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-0 w-full sm:w-auto">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש שיעור..."
                className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-torah-300 focus:border-transparent bg-slate-50 placeholder:text-slate-300"
                dir="rtl"
              />
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => { setGroupMode("topic"); setActiveFilter(null); setCollapsedGroups(new Set()); setSearch(""); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${groupMode === "topic" ? "bg-white text-torah-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Layers className="w-4 h-4" /> נושא
              </button>
              <button
                onClick={() => { setGroupMode("hebDate"); setActiveFilter(null); setCollapsedGroups(new Set()); setSearch(""); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${groupMode === "hebDate" ? "bg-white text-torah-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Calendar className="w-4 h-4" /> תאריך עברי
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {completedCount > 0 && (
                <button
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all ${hideCompleted ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {hideCompleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {hideCompleted ? "הסתר הושלמו" : "הסתר הושלמו"}
                </button>
              )}
              <span className="text-slate-400 font-medium">
                {totalFiltered} שיעורים{hiddenCount > 0 && ` (מתוך ${totalVideos})`}
              </span>
              <span className="text-slate-200">|</span>
              <button onClick={expandAll} className="text-torah-500 hover:text-torah-700 font-medium">פתח</button>
              <button onClick={collapseAll} className="text-torah-500 hover:text-torah-700 font-medium">סגור</button>
            </div>
          </div>

          {/* Topic chips - with color dots */}
          {groupMode === "topic" && (
            <div className="flex gap-2 mt-3 flex-wrap max-h-[120px] overflow-y-auto">
              <button
                onClick={() => { setActiveFilter(null); setShowAllTopics(true); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${!activeFilter && showAllTopics ? "bg-torah-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                כל הנושאים ({totalVideos})
              </button>
              {groupKeys.map((topic) => {
                const count = videosByTopic.get(topic)?.length || 0;
                return (
                  <button
                    key={topic}
                    onClick={() => setActiveFilter(activeFilter === topic ? null : topic)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${activeFilter === topic ? "bg-torah-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${activeFilter === topic ? "bg-white" : getTopicDot(topic)}`} />
                    {topic} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Video Groups ── */}
        <div className="space-y-4">
          {groupKeys.map((groupKey, gi) => (
            <VideoGroup
              key={groupKey}
              groupKey={groupKey}
              videos={groupedVideos.get(groupKey) || []}
              groupMode={groupMode}
              isCollapsed={collapsedGroups.has(groupKey)}
              selectedVideoId={selectedVideo?.id || null}
              showDetail={showDetail}
              animationDelay={gi * 0.03}
              isLessonCompleted={store.isLessonCompleted}
              getMeta={metaStore.getMeta}
              getTopicDot={getTopicDot}
              getTopicImage={topicSettingsStore.getTopicImage}
              onToggle={toggleGroup}
              onSelect={handleSelectVideo}
            />
          ))}
        </div>

        {/* Show all topics button */}
        {hiddenCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <button
              onClick={() => setShowAllTopics(true)}
              className="w-full bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center hover:border-torah-300 hover:bg-torah-50/30 transition-all group"
            >
              <Library className="w-6 h-6 mx-auto mb-2 text-slate-300 group-hover:text-torah-400 transition-colors" />
              <div className="text-sm font-bold text-slate-500 group-hover:text-torah-600 transition-colors">
                הצג את כל {hiddenCount + groupKeys.length} הנושאים ({hiddenCount} נוספים)
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                {smartTopics.inProgress.size > 0
                  ? "כרגע מוצגים רק נושאים שהתחלת ללמוד"
                  : "כרגע מוצגים 5 נושאים מומלצים להתחלה"}
              </div>
            </button>
          </motion.div>
        )}

        {/* When showAll is active, allow collapsing back */}
        {showAllTopics && groupMode === "topic" && !search && !activeFilter && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowAllTopics(false)}
              className="text-xs text-torah-500 hover:text-torah-700 font-medium transition-colors"
            >
              {smartTopics.inProgress.size > 0 ? "← הצג רק נושאים שהתחלתי" : "← הצג נושאים מומלצים בלבד"}
            </button>
          </div>
        )}

        {groupKeys.length === 0 && !loading && !hiddenCount && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-400 text-lg font-medium">לא נמצאו שיעורים</p>
            <p className="text-slate-300 text-sm mt-1">נסה לשנות את החיפוש או הסינון</p>
          </div>
        )}
      </div>
    </Shell>
  );
}

