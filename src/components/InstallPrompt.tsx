"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if user dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect mobile
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isMobile = isiOS || /Android|webOS|Opera Mini/i.test(ua);
    setIsIOS(isiOS);

    // Listen for beforeinstallprompt (Android Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // On mobile, show banner after 3 seconds regardless
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isMobile) {
      timer = setTimeout(() => setShowBanner(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Show manual guide (iOS or Android without prompt)
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden">
            {!showIOSGuide ? (
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-torah-600 to-torah-800 flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800">שמרי את בית המדרש בטלפון!</h3>
                    <p className="text-xs text-slate-400 mt-0.5">גישה מהירה ללא דפדפן — כמו אפליקציה רגילה</p>
                  </div>
                  <button onClick={handleDismiss} className="text-slate-300 hover:text-slate-500 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-l from-torah-600 to-torah-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {isIOS ? "איך לשמור?" : "התקן עכשיו"}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    אחר כך
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">הוספה למסך הבית</h3>
                  <button onClick={handleDismiss} className="text-slate-300 hover:text-slate-500 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {isIOS ? (
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                      <span className="text-lg">1️⃣</span>
                      <span>לחצי על <strong className="inline-flex items-center gap-1">כפתור השיתוף <svg className="inline w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></strong> בתחתית הדפדפן</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                      <span className="text-lg">2️⃣</span>
                      <span>גללי למטה ובחרי <strong>&quot;הוסף למסך הבית&quot;</strong></span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                      <span className="text-lg">3️⃣</span>
                      <span>לחצי <strong>&quot;הוסף&quot;</strong> — וזהו! 🎉</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                      <span className="text-lg">1️⃣</span>
                      <span>לחצי על <strong>שלוש הנקודות ⋮</strong> בפינה העליונה של הדפדפן</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                      <span className="text-lg">2️⃣</span>
                      <span>בחרי <strong>&quot;הוספה למסך הבית&quot;</strong> או <strong>&quot;התקן אפליקציה&quot;</strong></span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                      <span className="text-lg">3️⃣</span>
                      <span>לחצי <strong>&quot;הוסף&quot;</strong> — וזהו! 🎉</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleDismiss}
                  className="w-full mt-3 bg-torah-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-torah-700 transition-colors"
                >
                  הבנתי, תודה!
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
