"use client";

import Shell from "@/components/Shell";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, ShieldOff, Users, Search, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface UserRow {
  id: string;
  display_name: string;
  is_admin: boolean;
  xp: number;
  created_at: string;
  email?: string;
}

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();

  const isAdmin = profile?.is_admin ?? false;
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setUsers(data as UserRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  const toggleAdmin = async (targetId: string, currentlyAdmin: boolean) => {
    if (targetId === user?.id) return; // Can't remove own admin
    setUpdating(targetId);
    await supabase
      .from("profiles")
      .update({ is_admin: !currentlyAdmin })
      .eq("id", targetId);
    await loadUsers();
    setUpdating(null);
    toast(!currentlyAdmin ? "משתמש הוגדר כאדמין" : "הרשאות אדמין הוסרה");
  };

  // Not admin — show access denied
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

  const filtered = users.filter((u) =>
    (u.display_name || "").includes(search) || (u.email || "").includes(search) || u.id.includes(search)
  );

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">ניהול משתמשים</h1>
              <p className="text-sm text-slate-400">{users.length} משתמשים רשומים</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, אימייל או ID..."
            className="w-full pr-11 pl-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-torah-300 focus:border-torah-300"
          />
        </div>

        {/* Users list */}
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
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">לא נמצאו משתמשים</div>
            ) : (
              filtered.map((u, i) => (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-slate-100" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${u.is_admin ? "bg-emerald-500" : "bg-torah-500"}`}>
                    {(u.display_name || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {u.display_name || "ללא שם"}
                      </span>
                      {u.is_admin && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                          אדמין
                        </span>
                      )}
                      {u.id === user?.id && (
                        <span className="text-[10px] bg-torah-100 text-torah-600 px-2 py-0.5 rounded-full font-medium">
                          את
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{u.id}</div>
                    <div className="text-[11px] text-slate-300">{u.xp || 0} XP</div>
                  </div>

                  {/* Toggle admin */}
                  {u.id !== user?.id && (
                    <button
                      onClick={() => toggleAdmin(u.id, u.is_admin)}
                      disabled={updating === u.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        u.is_admin
                          ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                      } disabled:opacity-50`}
                    >
                      {updating === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : u.is_admin ? (
                        <>
                          <ShieldOff className="w-3.5 h-3.5" /> הסר אדמין
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" /> הפוך לאדמין
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
