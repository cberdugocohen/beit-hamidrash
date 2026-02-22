"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, LogIn, UserPlus, Loader2 } from "lucide-react";

type Mode = "login" | "register";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab" || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus first input after animation
      const t = setTimeout(() => modalRef.current?.querySelector<HTMLElement>("input")?.focus(), 100);
      return () => { document.removeEventListener("keydown", handleKeyDown); clearTimeout(t); };
    }
  }, [open, handleKeyDown]);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "register") {
      if (!displayName.trim()) {
        setError("נא להזין שם");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("סיסמה חייבת להכיל לפחות 6 תווים");
        setLoading(false);
        return;
      }
      const result = await signUp(email, password, displayName);
      if (result.error) {
        setError(translateError(result.error));
      } else {
        // Auto-logged in after signup, close modal
        onClose();
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) {
        setError(translateError(result.error));
      } else {
        onClose();
      }
    }
    setLoading(false);
  };

  const reset = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError("");
    setSuccess("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={mode === "login" ? "כניסה לבית המדרש" : "הרשמה לבית המדרש"}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-l from-torah-700 to-torah-800 px-6 py-5 text-white relative">
              <button onClick={onClose} className="absolute top-4 left-4 text-white/40 hover:text-white/80 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold">
                {mode === "login" ? "כניסה לבית המדרש" : "הרשמה לבית המדרש"}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                {mode === "login" ? "הזן את פרטי הכניסה שלך" : "צור חשבון חדש כדי לשמור את ההתקדמות שלך"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {mode === "register" && (
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">שם מלא</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="הרב ישראל ישראלי"
                      className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-torah-300 bg-slate-50"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">אימייל</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-torah-300 bg-slate-50"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">סיסמה</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "לפחות 6 תווים" : "הסיסמה שלך"}
                    className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-torah-300 bg-slate-50"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-600">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-torah-600 to-torah-700 hover:from-torah-700 hover:to-torah-800 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-torah-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "login" ? (
                  <>
                    <LogIn className="w-4 h-4" /> כניסה
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> הרשמה
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-300">או</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Google login */}
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 py-3 rounded-xl text-sm font-medium text-slate-600 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                המשך עם Google
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); reset(); }}
                  className="text-sm text-torah-500 hover:text-torah-700 font-medium transition-colors"
                >
                  {mode === "login" ? "אין לך חשבון? הירשם כאן" : "יש לך חשבון? התחבר כאן"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function translateError(error: string): string {
  if (error.includes("Invalid login")) return "אימייל או סיסמה שגויים";
  if (error.includes("already registered")) return "אימייל זה כבר רשום";
  if (error.includes("Password should be")) return "סיסמה חייבת להכיל לפחות 6 תווים";
  if (error.includes("valid email")) return "נא להזין כתובת אימייל תקינה";
  if (error.includes("Email not confirmed")) return "נא לאמת את האימייל שלך (בדוק את תיבת הדואר)";
  return error;
}
