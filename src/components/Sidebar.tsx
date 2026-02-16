"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Trophy, User, Flame, ShieldCheck, ChevronLeft, ChevronRight, GraduationCap, LogOut, LogIn, Menu, X, Pencil, Check, Users, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useGamificationStore, LEVELS } from "@/store/gamification";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUIStore } from "@/store/ui";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import AuthModal from "./AuthModal";

const navItems = [
  { href: "/", label: "שיעורים", icon: BookOpen },
  { href: "/achievements", label: "הישגים", icon: Trophy },
  { href: "/profile", label: "פרופיל", icon: User },
];

export default function Sidebar() {
  const { sidebarCollapsed, sidebarOpen, toggleSidebarCollapsed, setSidebarOpen, darkMode, toggleDarkMode } = useUIStore();
  const [showAuth, setShowAuth] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const pathname = usePathname();
  const { xp, currentStreak, getLevel, getLevelProgress } = useGamificationStore();
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const level = getLevel();
  const levelProgress = getLevelProgress();
  const nextLevel = LEVELS.find((l) => l.level === level.level + 1);

  const collapsed = sidebarCollapsed;
  const isAdmin = profile?.is_admin ?? false;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "";

  const { toast } = useToast();

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      await updateProfile({ display_name: nameInput.trim() });
      toast("השם עודכן בהצלחה");
    }
    setEditingName(false);
  };

  const handleNavClick = () => {
    if (sidebarOpen) setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 right-4 z-30 md:hidden w-10 h-10 rounded-xl bg-torah-800 text-white flex items-center justify-center shadow-lg"
        aria-label="פתח תפריט"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        role="navigation"
        aria-label="תפריט ראשי"
        className={cn(
          "fixed top-0 right-0 h-full z-40 transition-all duration-300 flex flex-col border-l border-slate-200/60",
          "bg-gradient-to-b from-torah-800 via-torah-800 to-torah-900",
          "max-md:translate-x-full max-md:w-[280px]",
          sidebarOpen && "max-md:translate-x-0",
          collapsed ? "md:w-[72px]" : "md:w-[260px]"
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 left-4 md:hidden text-white/40 hover:text-white/80 transition-colors"
          aria-label="סגור תפריט"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className={cn("border-b border-white/10", collapsed ? "md:p-3 p-5" : "px-5 py-4")}>
          {!collapsed || sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[14px] font-bold text-white leading-tight tracking-tight">בית המדרש קשר השותפות</h1>
                <p className="text-[11px] text-white/40 font-light">הרב אסף פלג</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* User Card (when logged in) */}
        {user && (!collapsed || sidebarOpen) && (
          <div className="mx-3 mt-4 p-3 rounded-xl bg-white/[0.07] border border-white/[0.06]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-torah-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {displayName.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      className="bg-white/10 text-white text-sm rounded-lg px-2 py-1 w-full border border-white/20 focus:outline-none focus:border-gold-400"
                      autoFocus
                      placeholder="השם שלך..."
                    />
                    <button onClick={handleSaveName} className="text-gold-300 hover:text-gold-200 shrink-0">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group">
                    <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                    <button
                      onClick={() => { setNameInput(displayName); setEditingName(true); }}
                      className="text-white/20 hover:text-gold-300 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="text-[10px] text-white/30 truncate">{user.email}</div>
              </div>
            </div>
            {/* Level */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{level.icon}</span>
              <span className="text-xs text-gold-300 font-semibold">{level.name}</span>
              <span className="text-[10px] text-white/30">רמה {level.level}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-[5px] mb-1 overflow-hidden">
              <div
                className="bg-gradient-to-l from-gold-300 to-gold-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <div className="text-[10px] text-white/30 flex justify-between">
              <span>{xp.toLocaleString()} XP</span>
              {nextLevel && <span>{nextLevel.xpRequired.toLocaleString()} XP</span>}
            </div>
          </div>
        )}

        {/* Streak */}
        {user && (!collapsed || sidebarOpen) && currentStreak > 0 && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/10 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-orange-300 font-medium">{currentStreak} ימים ברצף</span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 mt-5 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-white/[0.12] text-white shadow-sm shadow-white/5"
                    : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-gold-300")} />
                {(!collapsed || sidebarOpen) && (
                  <span className={cn("text-[13px]", isActive ? "font-semibold" : "font-normal")}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth section */}
        <div className="px-2 mb-2 space-y-1">
          {authLoading ? (
            <div className="px-3 py-2 text-[11px] text-white/20">טוען...</div>
          ) : user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all",
                    pathname === "/admin"
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                      : "bg-emerald-500/10 border border-emerald-500/15 text-emerald-300/70 hover:text-emerald-300 hover:bg-emerald-500/15"
                  )}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {(!collapsed || sidebarOpen) && <span className="font-medium">ניהול משתמשים</span>}
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/25 hover:text-red-300 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {(!collapsed || sidebarOpen) && <span>התנתק</span>}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-torah-600/30 text-white/70 hover:bg-torah-600/50 hover:text-white transition-all border border-white/10"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {(!collapsed || sidebarOpen) && <span className="font-medium">כניסה / הרשמה</span>}
            </button>
          )}
        </div>

        {/* Dark mode + Collapse toggle */}
        <div className="border-t border-white/[0.06] flex">
          <button
            onClick={toggleDarkMode}
            className="flex-1 flex items-center justify-center gap-2 p-3 hover:bg-white/[0.04] transition-colors text-white/30 hover:text-white/60"
            aria-label={darkMode ? "מצב בהיר" : "מצב כהה"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {(!collapsed || sidebarOpen) && <span className="text-[11px]">{darkMode ? "בהיר" : "כהה"}</span>}
          </button>
          <button
            onClick={toggleSidebarCollapsed}
            className="hidden md:flex p-3 hover:bg-white/[0.04] transition-colors items-center justify-center text-white/30 hover:text-white/60 border-r border-white/[0.06]"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Auth Modal */}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
