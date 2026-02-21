"use client";

import Shell from "@/components/Shell";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { getAllVideos, setVideos, isLoaded, Video } from "@/data/content";
import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ShieldOff, Users, Search, Loader2, ArrowRight,
  RefreshCw, Video as VideoIcon, Sparkles, BookOpen, Layers, ImageIcon, Save, Trash2, ArrowRightLeft, Check, X,
} from "lucide-react";
import Link from "next/link";
import { useTopicSettingsStore } from "@/store/topicSettings";
import { useTopicSettingsSync } from "@/lib/supabase/use-topic-settings-sync";

interface UserRow {
  id: string;
  display_name: string;
  is_admin: boolean;
  xp: number;
  created_at: string;
  email?: string;
}

type Tab = "users" | "videos";

const supabase = createClient();

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Video state
  const [videos, setLocalVideos] = useState<Video[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ newCount: number; newVideos: { title: string; topic: string; hebDate: string }[] } | null>(null);
  const [videoSearch, setVideoSearch] = useState("");

  const isAdmin = profile?.is_admin ?? false;
  const { toast } = useToast();
  const topicStore = useTopicSettingsStore();
  const { saveTopicImage, removeTopicImage: removeTopicImageDB } = useTopicSettingsSync();
  const [editingTopicImage, setEditingTopicImage] = useState<string | null>(null);
  const [topicImageUrl, setTopicImageUrl] = useState("");
  const [editingVideoTopic, setEditingVideoTopic] = useState<string | null>(null);
  const [videoTopicInput, setVideoTopicInput] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setLoading(false); return; }

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.users) {
        setUsers(json.users as UserRow[]);
        if (json.backfilled > 0) {
          toast(`${json.backfilled} פרופילים חסרים נוצרו אוטומטית`);
        }
      } else if (json.error) {
        toast("שגיאה בטעינת משתמשים: " + json.error);
      }
    } catch {
      toast("שגיאה בטעינת משתמשים");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    if (!isLoaded()) {
      fetch("/api/videos")
        .then((r) => r.json())
        .then((data: Video[]) => {
          setVideos(data);
          setLocalVideos(data);
        });
    } else {
      setLocalVideos(getAllVideos());
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync-videos");
      const data = await res.json();
      if (data.error) {
        toast("שגיאה בסנכרון: " + data.error);
      } else {
        setSyncResult({ newCount: data.newCount, newVideos: data.newVideos });
        if (data.newCount > 0) {
          toast(`נמצאו ${data.newCount} סרטונים חדשים!`);
          const res2 = await fetch("/api/videos?t=" + Date.now());
          const fresh = await res2.json();
          setVideos(fresh);
          setLocalVideos(fresh);
        } else {
          toast("אין סרטונים חדשים");
        }
      }
    } catch {
      toast("שגיאה בסנכרון");
    }
    setSyncing(false);
  };

  const handleSetup = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast("לא מחובר"); return; }
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        toast("הגדרות המערכת עודכנו בהצלחה");
      } else {
        toast("שגיאה: " + (json.error || "Unknown"));
      }
    } catch {
      toast("שגיאה בהגדרת המערכת");
    }
  };

  const handleSaveVideoTopic = async (videoId: string, newTopic: string) => {
    setSavingTopic(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast("לא מחובר"); setSavingTopic(false); return; }
      const res = await fetch("/api/admin/topic-override", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ videoId, topic: newTopic }),
      });
      const json = await res.json();
      if (json.ok) {
        // Update local state
        setLocalVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, topic: newTopic } : v));
        toast("הנושא עודכן בהצלחה");
      } else {
        toast("שגיאה: " + (json.error || "Unknown"));
      }
    } catch {
      toast("שגיאה בשמירת נושא");
    }
    setSavingTopic(false);
    setEditingVideoTopic(null);
  };

  const toggleAdmin = async (targetId: string, currentlyAdmin: boolean) => {
    if (targetId === user?.id) return;
    setUpdating(targetId);
    await supabase
      .from("profiles")
      .update({ is_admin: !currentlyAdmin })
      .eq("id", targetId);
    await loadUsers();
    setUpdating(null);
    toast(!currentlyAdmin ? "משתמש הוגדר כאדמין" : "הרשאות אדמין הוסרה");
  };

  if (!user || !isAdmin) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <ShieldOff className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h1 className="text-2xl font-bold text-slate-700 mb-2">אין גישה</h1>
          <p className="text-slate-400 mb-6">עמוד זה זמין רק למנהלים</p>
          <Link href="/" className="inline-flex items-center gap-2 text-torah-600 hover:text-torah-700 font-medium">
            <ArrowRight className="w-4 h-4" /> חזרה לשיעורים
          </Link>
        </div>
      </Shell>
    );
  }

  // Video stats
  const topicCounts: Record<string, number> = {};
  for (const v of videos) {
    topicCounts[v.topic] = (topicCounts[v.topic] || 0) + 1;
  }
  const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);

  // 7-day new videos
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);
  const recentVideos = videos.filter((v) => v.date > sevenDaysStr);

  // Filter users
  const filteredUsers = users.filter((u) =>
    (u.display_name || "").includes(search) || (u.email || "").includes(search) || u.id.includes(search)
  );

  // Filter videos
  const filteredVideos = videoSearch
    ? videos.filter((v) => v.title.includes(videoSearch) || v.topic.includes(videoSearch))
    : videos;

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">ניהול</h1>
          <p className="text-sm text-slate-400">ניהול משתמשים וסרטונים</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "users" ? "bg-white text-torah-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Users className="w-4 h-4" /> משתמשים ({users.length})
          </button>
          <button
            onClick={() => setTab("videos")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "videos" ? "bg-white text-torah-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            <VideoIcon className="w-4 h-4" /> סרטונים ({videos.length})
          </button>
        </div>

        {/* ═══ USERS TAB ═══ */}
        {tab === "users" && (
          <>
            <div className="relative mb-6">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם, אימייל או ID..."
                className="w-full pr-11 pl-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-torah-300"
              />
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i > 1 ? "border-t border-slate-100" : ""}`}>
                    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded-lg w-32 animate-pulse" />
                      <div className="h-3 bg-slate-100 rounded-lg w-48 animate-pulse" />
                    </div>
                    <div className="h-8 w-24 bg-slate-100 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">לא נמצאו משתמשים</div>
                ) : (
                  filteredUsers.map((u, i) => (
                    <div key={u.id} className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-4 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${u.is_admin ? "bg-emerald-500" : "bg-torah-500"}`}>
                        {(u.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800 truncate">{u.display_name || "ללא שם"}</span>
                          {u.is_admin && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">אדמין</span>}
                          {u.id === user?.id && <span className="text-[10px] bg-torah-100 text-torah-600 px-2 py-0.5 rounded-full font-medium">את</span>}
                        </div>
                        <div className="text-[11px] text-slate-300">{u.xp || 0} XP</div>
                      </div>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => toggleAdmin(u.id, u.is_admin)}
                          disabled={updating === u.id}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${
                            u.is_admin
                              ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                          } disabled:opacity-50`}
                        >
                          {updating === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : u.is_admin ? (
                            <><ShieldOff className="w-3.5 h-3.5" /> <span className="hidden sm:inline">הסר אדמין</span></>
                          ) : (
                            <><ShieldCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">הפוך לאדמין</span></>
                          )}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* ═══ VIDEOS TAB ═══ */}
        {tab === "videos" && (
          <>
            {/* Sync bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-bold text-slate-800 text-sm">סנכרון סרטונים</h2>
                  <p className="text-xs text-slate-400 mt-0.5">בדוק אם יש סרטונים חדשים ביוטיוב</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSetup}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                    title="אתחול הגדרות מערכת"
                  >
                    ⚙ הגדרות
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-torah-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-torah-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "מסנכרן..." : "סנכרן עכשיו"}
                  </button>
                </div>
              </div>
              {syncResult && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {syncResult.newCount === 0 ? (
                    <p className="text-sm text-slate-400">✓ אין סרטונים חדשים — הכל מעודכן</p>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-emerald-600 mb-2">
                        <Sparkles className="w-4 h-4 inline ml-1" />
                        נמצאו {syncResult.newCount} סרטונים חדשים:
                      </p>
                      <div className="space-y-1">
                        {syncResult.newVideos.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-emerald-50 rounded-lg px-3 py-2">
                            <span className="text-emerald-600 font-bold">חדש!</span>
                            <span className="text-slate-700 truncate">{v.title}</span>
                            <span className="text-slate-400 shrink-0">• {v.topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-extrabold text-torah-600">{videos.length}</div>
                <div className="text-[11px] text-slate-400">סה"כ סרטונים</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-extrabold text-gold-500">{sortedTopics.length}</div>
                <div className="text-[11px] text-slate-400">נושאים</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-extrabold text-emerald-500">{recentVideos.length}</div>
                <div className="text-[11px] text-slate-400">חדשים (7 ימים)</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-extrabold text-slate-500">{videos.length > 0 ? videos[videos.length - 1].date : "-"}</div>
                <div className="text-[11px] text-slate-400">סרטון אחרון</div>
              </div>
            </div>

            {/* Topics breakdown with image management */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-torah-400" /> נושאים ותמונות
              </h3>
              <div className="space-y-2">
                {sortedTopics.map(([topic, count]) => {
                  const currentImage = topicStore.getTopicImage(topic);
                  const isEditing = editingTopicImage === topic;
                  return (
                    <div key={topic} className="bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {currentImage ? (
                            <img src={currentImage} alt={topic} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <span className="text-xs text-slate-700 truncate">{topic}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-torah-600">{count}</span>
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingTopicImage(null);
                              } else {
                                setEditingTopicImage(topic);
                                setTopicImageUrl(currentImage || "");
                              }
                            }}
                            className="text-xs text-slate-400 hover:text-torah-600 transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={topicImageUrl}
                            onChange={(e) => setTopicImageUrl(e.target.value)}
                            placeholder="הדבק קישור לתמונה..."
                            className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-torah-300"
                            dir="ltr"
                          />
                          <button
                            onClick={() => {
                              topicStore.setTopicImage(topic, topicImageUrl);
                              saveTopicImage(topic, topicImageUrl);
                              setEditingTopicImage(null);
                              toast("תמונת נושא נשמרה");
                            }}
                            className="bg-torah-600 text-white px-2 py-1.5 rounded-lg hover:bg-torah-700 transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          {currentImage && (
                            <button
                              onClick={() => {
                                topicStore.removeTopicImage(topic);
                                removeTopicImageDB(topic);
                                setEditingTopicImage(null);
                                toast("תמונת נושא הוסרה");
                              }}
                              className="bg-red-50 text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video search + list */}
            <div className="relative mb-4">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                placeholder="חיפוש סרטון לפי שם או נושא..."
                className="w-full pr-11 pl-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-torah-300"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="max-h-[500px] overflow-y-auto">
                {filteredVideos.slice(0).reverse().map((v, i) => {
                  const isNew = v.date > sevenDaysStr;
                  const isEditingTopic = editingVideoTopic === v.id;
                  return (
                    <div key={v.id} className={`px-3 sm:px-5 py-3 text-right ${i > 0 ? "border-t border-slate-50" : ""}`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isNew && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full shrink-0">חדש!</span>}
                            <span className="text-sm text-slate-700 truncate">{v.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{v.date}</span>
                            <span className="text-torah-400 font-medium">{v.topic}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (isEditingTopic) {
                              setEditingVideoTopic(null);
                            } else {
                              setEditingVideoTopic(v.id);
                              setVideoTopicInput(v.topic);
                            }
                          }}
                          className="text-slate-300 hover:text-torah-500 transition-colors shrink-0 p-1"
                          title="שנה נושא"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {isEditingTopic && (
                        <div className="mt-2 mr-10 flex items-center gap-2">
                          <select
                            value={videoTopicInput}
                            onChange={(e) => setVideoTopicInput(e.target.value)}
                            className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-torah-300 bg-white"
                          >
                            {sortedTopics.map(([topic]) => (
                              <option key={topic} value={topic}>{topic}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveVideoTopic(v.id, videoTopicInput)}
                            disabled={savingTopic || videoTopicInput === v.topic}
                            className="bg-torah-600 text-white px-2 py-1.5 rounded-lg hover:bg-torah-700 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingVideoTopic(null)}
                            className="text-slate-400 hover:text-slate-600 px-1 py-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
